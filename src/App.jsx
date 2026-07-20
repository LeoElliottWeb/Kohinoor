import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

// ==========================================
// 🎵 SIMPLE BELL RINGER
// ==========================================
class RingerManager {
    constructor() {
        this.audioContext = null;
        this.oscillator = null;
        this.gainNode = null;
        this.isRinging = false;
        this.timeoutId = null;
        this.timeoutCallback = null;
    }

    playBell() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            if (!this.audioContext || this.audioContext.state === 'closed') this.audioContext = new AudioContext();
            if (this.audioContext.state === 'suspended') this.audioContext.resume();
            this.oscillator = this.audioContext.createOscillator();
            this.gainNode = this.audioContext.createGain();
            this.oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            this.oscillator.type = 'sine';
            this.gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            this.gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);
            this.oscillator.connect(this.gainNode);
            this.gainNode.connect(this.audioContext.destination);
            this.oscillator.start(this.audioContext.currentTime);
            this.oscillator.stop(this.audioContext.currentTime + 0.8);
        } catch (e) { }
    }

    start(type, onTimeout) {
        this.stop();
        this.isRinging = true;
        this.timeoutCallback = onTimeout;
        this.playBell();
        let ringCount = 0;
        const scheduleNextRing = () => {
            if (!this.isRinging) return;
            ringCount++;
            if (ringCount >= 20) { this.stop(); if (this.timeoutCallback) this.timeoutCallback(); return; }
            this.timeoutId = setTimeout(() => { if (this.isRinging) { this.playBell(); scheduleNextRing(); } }, 3000);
        };
        scheduleNextRing();
    }

    stop() {
        this.isRinging = false;
        if (this.timeoutId) { clearTimeout(this.timeoutId); this.timeoutId = null; }
        if (this.oscillator) { try { this.oscillator.stop(); } catch (e) { } this.oscillator = null; }
        this.gainNode = null;
        this.timeoutCallback = null;
    }

    isActive() { return this.isRinging; }
}

const ringer = new RingerManager();

// ==========================================
// 📺 LOCAL VIDEO COMPONENT
// ==========================================
function LocalVideo({ stream }) {
    const videoRef = useRef(null);

    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl || !stream) return;
        videoEl.srcObject = stream;
        videoEl.muted = true;
        videoEl.play().catch(() => { });
        return () => { if (videoEl) videoEl.srcObject = null; };
    }, [stream]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#111', borderRadius: '8px', overflow: 'hidden' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#000' }} />
            <span style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '4px', fontSize: 13, color: '#fff' }}>You</span>
        </div>
    );
}

// ==========================================
// 📺 REMOTE VIDEO COMPONENT
// ==========================================
function RemoteVideo({ stream, email, allKnownUsers }) {
    const videoRef = useRef(null);

    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl || !stream) return;
        videoEl.srcObject = stream;
        videoEl.play().catch(() => { });
        return () => { if (videoEl) videoEl.srcObject = null; };
    }, [stream, email]);

    const safeEmail = email?.trim().toLowerCase();
    const contactName = allKnownUsers.find(c => c.email?.trim().toLowerCase() === safeEmail)?.name || email.split('@')[0];

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#111', borderRadius: '8px', overflow: 'hidden' }}>
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#000' }} />
            <span style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '4px', fontSize: 13, color: '#fff' }}>{contactName}</span>
        </div>
    );
}

// ==========================================
// 🛡️ MAIN CHAT COMPONENT
// ==========================================
function ChatApp({ user, onLogout }) {
    const userEmail = user?.email || '';
    const displayName = userEmail.split('@')[0];

    const [onlineUsers, setOnlineUsers] = useState([]);
    const [members, setMembers] = useState([]);
    const [savedContacts, setSavedContacts] = useState([]);
    const [isOnlineExpanded, setIsOnlineExpanded] = useState(true);
    const [isMembersExpanded, setIsMembersExpanded] = useState(true);
    const [isContactsExpanded, setIsContactsExpanded] = useState(true);
    const [selectedContact, setSelectedContact] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const selectedContactRef = useRef(selectedContact);
    const channelRef = useRef(null);

    // Call States
    const [inVoiceCall, setInVoiceCall] = useState(false);
    const [activeCallEmails, setActiveCallEmails] = useState([]);
    const [incomingCall, setIncomingCall] = useState(null);
    const incomingCallRef = useRef(null);
    const [isCallingOut, setIsCallingOut] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    // Media States
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});
    const peersRef = useRef({});
    const pendingCandidatesRef = useRef({});
    const localStreamRef = useRef(null);

    const chatContainerRef = useRef(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const inCallRef = useRef(false);
    const isEndingRef = useRef(false);
    const lastActionRef = useRef(0);

    useEffect(() => { selectedContactRef.current = selectedContact; }, [selectedContact]);
    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);

    const METERED_USERNAME = "b7cf8da6379b050323098734";
    const METERED_CREDENTIAL = "AMGwLNr1/IaRrZGQ";

    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            {
                urls: [
                    'turn:standard.relay.metered.ca:80',
                    'turn:standard.relay.metered.ca:443',
                    'turn:standard.relay.metered.ca:80?transport=tcp',
                    'turn:standard.relay.metered.ca:443?transport=tcp'
                ],
                username: METERED_USERNAME,
                credential: METERED_CREDENTIAL
            }
        ],
        iceCandidatePoolSize: 10
    };

    useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);

    useEffect(() => {
        if ((incomingCall || isCallingOut) && !ringer.isActive()) {
            ringer.start('incoming', () => {
                if (incomingCallRef.current) {
                    channelRef.current?.send({ type: 'broadcast', event: 'webrtc-decline', payload: { targetEmail: incomingCallRef.current.sender, sender: userEmail } });
                    setIncomingCall(null);
                }
            });
        } else if (!incomingCall && !isCallingOut && ringer.isActive()) {
            ringer.stop();
        }
    }, [incomingCall, isCallingOut]);

    useEffect(() => {
        supabase.from('profiles').select('email, name').then(({ data }) => { if (data) setMembers(data); });
        const stored = localStorage.getItem('totalRecallContacts');
        if (stored) try { setSavedContacts(JSON.parse(stored)); } catch (e) { }
        const pc = supabase.channel('public:profiles')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, p => {
                setMembers(prev => prev.find(m => m.email === p.new.email) ? prev : [...prev, { name: p.new.name || p.new.email.split('@')[0], email: p.new.email }]);
            }).subscribe();
        return () => { supabase.removeChannel(pc); };
    }, []);

    useEffect(() => { if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight; }, [chatMessages]);
    useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

    useEffect(() => {
        if (!selectedContact || !userEmail) return;
        Promise.all([
            supabase.from('messages').select('*').eq('sender_email', userEmail).eq('receiver_email', selectedContact).limit(50),
            supabase.from('messages').select('*').eq('sender_email', selectedContact).eq('receiver_email', userEmail).limit(50)
        ]).then(([s, r]) => setChatMessages([...(s.data || []), ...(r.data || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))));
    }, [selectedContact, userEmail]);

    const getMedia = async () => {
        const s = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
            audio: { echoCancellation: true, noiseSuppression: true }
        });
        return s;
    };

    const broadcastMeshState = () => {
        if (!inCallRef.current || !channelRef.current) return;
        const connectedPeers = Object.keys(peersRef.current).filter(e => peersRef.current[e].connectionState === 'connected');

        connectedPeers.forEach(target => {
            channelRef.current.send({
                type: 'broadcast',
                event: 'webrtc-mesh-sync',
                payload: { targetEmail: target, peers: connectedPeers, sender: userEmail }
            });
        });
    };

    const createPC = (email) => {
        if (peersRef.current[email]) {
            peersRef.current[email].close();
        }

        console.log("[WebRTC] Creating PC for:", email);
        const pc = new RTCPeerConnection(rtcConfig);
        peersRef.current[email] = pc;
        setActiveCallEmails(prev => [...new Set([...prev, email])]);

        if (!pendingCandidatesRef.current[email]) {
            pendingCandidatesRef.current[email] = [];
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => {
                pc.addTrack(t, localStreamRef.current);
            });
        }

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                const serialized = {
                    candidate: e.candidate.candidate,
                    sdpMid: e.candidate.sdpMid,
                    sdpMLineIndex: e.candidate.sdpMLineIndex,
                    usernameFragment: e.candidate.usernameFragment
                };
                channelRef.current?.send({
                    type: 'broadcast',
                    event: 'webrtc-ice',
                    payload: { targetEmail: email, candidate: serialized, sender: userEmail }
                });
            }
        };

        pc.onconnectionstatechange = () => {
            console.log("[WebRTC] Connection:", pc.connectionState, "for:", email);
            if (pc.connectionState === 'connected') {
                setIsCallingOut(false);
                broadcastMeshState();
            } else if (pc.connectionState === 'failed') {
                cleanPeer(email);
            } else if (pc.connectionState === 'disconnected') {
                setTimeout(() => {
                    if (peersRef.current[email]?.connectionState === 'disconnected') cleanPeer(email);
                }, 5000);
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log("[WebRTC] ICE:", pc.iceConnectionState, "for:", email);
        };

        pc.ontrack = (event) => {
            console.log("[WebRTC] Track:", event.track.kind, "from:", email);
            if (event.streams && event.streams.length > 0) {
                setRemoteStreams(prev => ({ ...prev, [email]: event.streams[0] }));
            }
        };

        return pc;
    };

    const cleanPeer = (email) => {
        peersRef.current[email]?.close();
        delete peersRef.current[email];
        setRemoteStreams(prev => { const n = { ...prev }; delete n[email]; return n; });
        setActiveCallEmails(prev => prev.filter(e => e !== email));
        delete pendingCandidatesRef.current[email];

        if (!Object.keys(peersRef.current).length && inCallRef.current && !isEndingRef.current) {
            endCall(false);
        } else if (inCallRef.current) {
            broadcastMeshState();
        }
    };

    const endCall = (broadcast = true) => {
        if (isEndingRef.current) return;
        isEndingRef.current = true;
        inCallRef.current = false;
        if (ringer.isActive()) ringer.stop();
        setIsCallingOut(false);
        setIsScreenSharing(false);
        setIncomingCall(null);

        if (broadcast) {
            Object.keys(peersRef.current).forEach(email => {
                channelRef.current?.send({ type: 'broadcast', event: 'webrtc-end', payload: { targetEmail: email, sender: userEmail } });
            });
        }

        Object.values(peersRef.current).forEach(pc => { try { pc.close(); } catch (e) { } });
        peersRef.current = {};
        pendingCandidatesRef.current = {};
        setRemoteStreams({});
        setActiveCallEmails([]);

        setTimeout(() => {
            if (!inCallRef.current && localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
                localStreamRef.current = null;
                setLocalStream(null);
            }
        }, 2000);

        setInVoiceCall(false);
        setTimeout(() => { isEndingRef.current = false; }, 1000);
    };

    const initiateCall = async (email, isAuto = false) => {
        if (!isAuto) {
            if (Date.now() - lastActionRef.current < 2000) return;
            lastActionRef.current = Date.now();
        }
        if (!channelRef.current) return;

        console.log("[WebRTC] Calling:", email, isAuto ? "(Auto-Mesh)" : "");
        inCallRef.current = true;
        if (!isAuto) setIsCallingOut(true);

        try {
            if (!localStreamRef.current) {
                const s = await getMedia();
                localStreamRef.current = s;
                setLocalStream(s);
            }

            const pc = createPC(email);
            const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await pc.setLocalDescription(offer);

            channelRef.current.send({
                type: 'broadcast',
                event: 'webrtc-offer',
                payload: { targetEmail: email, offer: pc.localDescription, sender: userEmail, isAuto }
            });

            setInVoiceCall(true);
        } catch (err) {
            console.error("[WebRTC] Call error:", err);
            if (!isAuto) alert("Call failed: " + err.message);

            if (Object.keys(peersRef.current).length === 0) {
                endCall(false);
            } else {
                if (!isAuto) setIsCallingOut(false);
                cleanPeer(email);
            }
        }
    };

    const autoAcceptCall = async (call) => {
        console.log("[WebRTC] Auto-accepting mesh call from:", call.sender);
        try {
            if (!localStreamRef.current) {
                const s = await getMedia();
                localStreamRef.current = s;
                setLocalStream(s);
            }

            const pc = createPC(call.sender);
            await pc.setRemoteDescription(new RTCSessionDescription(call.offer));
            const answer = await pc.createAnswer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await pc.setLocalDescription(answer);

            channelRef.current?.send({
                type: 'broadcast',
                event: 'webrtc-answer',
                payload: { targetEmail: call.sender, answer: pc.localDescription, sender: userEmail }
            });

            const pending = pendingCandidatesRef.current[call.sender] || [];
            for (const c of pending) {
                try { await pc.addIceCandidate(c); } catch (e) { }
            }
            pendingCandidatesRef.current[call.sender] = [];
        } catch (err) {
            console.error("[WebRTC] Auto-Accept error:", err);
            cleanPeer(call.sender);
        }
    };

    const acceptIncoming = async () => {
        const call = incomingCallRef.current;
        if (!call) return;
        if (Date.now() - lastActionRef.current < 2000) return;
        lastActionRef.current = Date.now();

        console.log("[WebRTC] Accepting:", call.sender);
        inCallRef.current = true;
        if (ringer.isActive()) ringer.stop();
        setIncomingCall(null);

        try {
            if (!localStreamRef.current) {
                const s = await getMedia();
                localStreamRef.current = s;
                setLocalStream(s);
            }

            const pc = createPC(call.sender);
            await pc.setRemoteDescription(new RTCSessionDescription(call.offer));
            const answer = await pc.createAnswer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await pc.setLocalDescription(answer);

            channelRef.current.send({
                type: 'broadcast',
                event: 'webrtc-answer',
                payload: { targetEmail: call.sender, answer: pc.localDescription, sender: userEmail }
            });

            const pending = pendingCandidatesRef.current[call.sender] || [];
            for (const c of pending) {
                try { await pc.addIceCandidate(c); } catch (e) { }
            }
            pendingCandidatesRef.current[call.sender] = [];

            setInVoiceCall(true);
            setSelectedContact(call.sender);
        } catch (err) {
            console.error("[WebRTC] Accept error:", err);
            alert("Accept failed: " + err.message);
            if (Object.keys(peersRef.current).length === 0) {
                endCall(false);
            } else {
                cleanPeer(call.sender);
            }
        }
    };

    const toggleScreenShare = async () => {
        if (!localStreamRef.current || !inCallRef.current) return;

        try {
            if (isScreenSharing) {
                const newCameraStream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
                });
                const newVideoTrack = newCameraStream.getVideoTracks()[0];

                Object.values(peersRef.current).forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender) sender.replaceTrack(newVideoTrack);
                });

                const currentAudioTrack = localStreamRef.current.getAudioTracks()[0];
                const newStream = new MediaStream([newVideoTrack]);
                if (currentAudioTrack) newStream.addTrack(currentAudioTrack);

                localStreamRef.current.getVideoTracks().forEach(t => t.stop());
                localStreamRef.current = newStream;
                setLocalStream(newStream);
                setIsScreenSharing(false);

            } else {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenVideoTrack = screenStream.getVideoTracks()[0];

                screenVideoTrack.onended = () => {
                    if (inCallRef.current) toggleScreenShare();
                };

                Object.values(peersRef.current).forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender) sender.replaceTrack(screenVideoTrack);
                });

                const currentAudioTrack = localStreamRef.current.getAudioTracks()[0];
                const newStream = new MediaStream([screenVideoTrack]);
                if (currentAudioTrack) newStream.addTrack(currentAudioTrack);

                localStreamRef.current.getVideoTracks().forEach(t => t.stop());
                localStreamRef.current = newStream;
                setLocalStream(newStream);
                setIsScreenSharing(true);
            }
        } catch (err) {
            console.error("[WebRTC] Screen share error/cancelled:", err);
        }
    };

    const decline = () => {
        if (ringer.isActive()) ringer.stop();
        const call = incomingCallRef.current;
        if (call) channelRef.current?.send({ type: 'broadcast', event: 'webrtc-decline', payload: { targetEmail: call.sender, sender: userEmail } });
        setIncomingCall(null);
    };

    useEffect(() => {
        if (!userEmail) return;
        const ch = supabase.channel('totalrecall-global', { config: { presence: { key: `u_${userEmail}` } } });
        channelRef.current = ch;

        ch.on('presence', { event: 'sync' }, () => {
            const st = ch.presenceState();
            const users = [];
            for (const k in st) {
                const p = st[k]?.[0];
                if (p?.email && p.email !== userEmail && !users.find(u => u.email === p.email)) users.push({ email: p.email });
            }
            setOnlineUsers(users);
        });

        ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, p => {
            if ((p.new.sender_email === selectedContactRef.current && p.new.receiver_email === userEmail) ||
                (p.new.sender_email === userEmail && p.new.receiver_email === selectedContactRef.current)) {
                setChatMessages(prev => prev.find(m => m.id === p.new.id) ? prev : [...prev, p.new]);
            }
        });

        ch.on('broadcast', { event: 'webrtc-offer' }, async ({ payload }) => {
            if (payload.targetEmail !== userEmail) return;

            if (peersRef.current[payload.sender]) {
                try {
                    await peersRef.current[payload.sender].setRemoteDescription(new RTCSessionDescription(payload.offer));
                    const ans = await peersRef.current[payload.sender].createAnswer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
                    await peersRef.current[payload.sender].setLocalDescription(ans);
                    ch.send({ type: 'broadcast', event: 'webrtc-answer', payload: { targetEmail: payload.sender, answer: ans, sender: userEmail } });
                } catch (e) { }
                return;
            }

            if (inCallRef.current) {
                autoAcceptCall(payload);
            } else {
                setIncomingCall(payload);
            }
        });

        ch.on('broadcast', { event: 'webrtc-answer' }, async ({ payload }) => {
            if (payload.targetEmail !== userEmail) return;
            setIsCallingOut(false);
            const pc = peersRef.current[payload.sender];
            if (pc && pc.signalingState === 'have-local-offer') {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
                    const pending = pendingCandidatesRef.current[payload.sender] || [];
                    for (const c of pending) {
                        try { await pc.addIceCandidate(c); } catch (e) { }
                    }
                    pendingCandidatesRef.current[payload.sender] = [];
                } catch (e) { }
            }
        });

        ch.on('broadcast', { event: 'webrtc-ice' }, async ({ payload }) => {
            if (payload.targetEmail !== userEmail) return;
            const candidateData = payload.candidate;
            const pc = peersRef.current[payload.sender];
            const candidate = new RTCIceCandidate({
                candidate: candidateData.candidate,
                sdpMid: candidateData.sdpMid,
                sdpMLineIndex: candidateData.sdpMLineIndex,
                usernameFragment: candidateData.usernameFragment
            });

            if (pc?.remoteDescription) {
                try { await pc.addIceCandidate(candidate); } catch (e) { }
            } else {
                if (!pendingCandidatesRef.current[payload.sender]) pendingCandidatesRef.current[payload.sender] = [];
                pendingCandidatesRef.current[payload.sender].push(candidate);
            }
        });

        ch.on('broadcast', { event: 'webrtc-mesh-sync' }, ({ payload }) => {
            if (payload.targetEmail !== userEmail) return;
            if (!inCallRef.current) return;

            payload.peers.forEach(peer => {
                if (peer !== userEmail && !peersRef.current[peer]) {
                    if (userEmail.toLowerCase() < peer.toLowerCase()) {
                        console.log(`[WebRTC Mesh] Discovered ${peer}, initiating auto-call`);
                        initiateCall(peer, true);
                    }
                }
            });
        });

        ch.on('broadcast', { event: 'webrtc-decline' }, ({ payload }) => {
            if (payload.targetEmail === userEmail) { setIsCallingOut(false); cleanPeer(payload.sender); }
        });

        ch.on('broadcast', { event: 'webrtc-end' }, ({ payload }) => {
            if (payload.targetEmail === userEmail) {
                if (incomingCallRef.current?.sender === payload.sender) setIncomingCall(null);
                cleanPeer(payload.sender);
            }
        });

        ch.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                try { await ch.track({ email: userEmail, online: true }); } catch (e) { }
            }
        });

        return () => {
            try { ch.untrack(); supabase.removeChannel(ch); } catch (e) { }
            channelRef.current = null;
        };
    }, [userEmail]);

    const sendMsg = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !selectedContact) return;
        const txt = chatInput;
        setChatInput('');
        const { data, error } = await supabase.from('messages').insert([
            { sender_email: userEmail, receiver_email: selectedContact, text: txt }
        ]).select();
        if (!error && data?.length) setChatMessages(prev => prev.find(m => m.id === data[0].id) ? prev : [...prev, data[0]]);
    };

    const showSidebar = !isMobile || !selectedContact;
    const showChat = !isMobile || !!selectedContact;
    const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(e); } };

    const safeEmail = userEmail?.toLowerCase() || '';
    const allKnown = [...members, ...savedContacts];
    const dispMembers = members.filter(m => m.email?.toLowerCase() !== safeEmail);
    const dispContacts = savedContacts.filter(c => c.email?.toLowerCase() !== safeEmail);
    const activeContact = allKnown.find(c => c.email?.toLowerCase() === selectedContact?.toLowerCase());
    const activeName = activeContact?.name || selectedContact?.split('@')[0] || '';

    const memberCount = members.filter(m => m.email?.toLowerCase() !== safeEmail).length;
    const totalOnlineCount = onlineUsers.length + 1;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', backgroundColor: '#111b21', color: '#e9edef', fontFamily: 'Segoe UI, sans-serif', overflow: 'hidden' }}>
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {incomingCall && (
                    <div style={{ position: 'fixed', top: 20, right: 20, backgroundColor: '#202c33', padding: 20, borderRadius: 8, zIndex: 1000, border: '1px solid #00a884', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                        <h4 style={{ margin: '0 0 10px' }}>📹 Incoming Call</h4>
                        <p style={{ margin: '0 0 15px' }}>From: <b>{incomingCall.sender.split('@')[0]}</b></p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={acceptIncoming} style={{ flex: 1, backgroundColor: '#00a884', border: 'none', padding: 8, borderRadius: 4, color: '#111', fontWeight: 'bold', cursor: 'pointer' }}>Accept</button>
                            <button onClick={decline} style={{ flex: 1, backgroundColor: '#ef4444', border: 'none', padding: 8, borderRadius: 4, color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Decline</button>
                        </div>
                    </div>
                )}

                {showSidebar && (
                    <div style={{ width: isMobile ? '100%' : '30%', minWidth: 250, borderRight: '1px solid #222d34', display: 'flex', flexDirection: 'column', backgroundColor: '#111b21', height: '100%', overflow: 'hidden' }}>
                        <div style={{ padding: 15, backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#00a884', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#111', fontWeight: 'bold' }}>{displayName[0]?.toUpperCase()}</div>
                                <b style={{ color: '#00a884' }}>{displayName}</b>
                            </div>
                            <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#aebac1', cursor: 'pointer' }}>Logout</button>
                        </div>
                        <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                            <div onClick={() => setIsOnlineExpanded(!isOnlineExpanded)} style={{ padding: '10px 15px', backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', borderBottom: '1px solid #222d34' }}>
                                <span style={{ color: '#8696a0', fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' }}>Online ({onlineUsers.length})</span>
                                <span style={{ color: '#8696a0' }}>{isOnlineExpanded ? '▼' : '▶'}</span>
                            </div>
                            {isOnlineExpanded && onlineUsers.map(u => (
                                <div key={u.email} onClick={() => setSelectedContact(u.email)} style={{ padding: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottom: '1px solid #222d34', backgroundColor: selectedContact === u.email ? '#2a3942' : 'transparent' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#38bdf8', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: 15, color: '#111', fontWeight: 'bold' }}>{u.email[0]?.toUpperCase()}</div>
                                    <span>{allKnown.find(k => k.email?.toLowerCase() === u.email?.toLowerCase())?.name || u.email.split('@')[0]}</span>
                                </div>
                            ))}
                            <div onClick={() => setIsMembersExpanded(!isMembersExpanded)} style={{ padding: '10px 15px', backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', borderBottom: '1px solid #222d34', marginTop: 10 }}>
                                <span style={{ color: '#8696a0', fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' }}>Members ({dispMembers.length})</span>
                                <span style={{ color: '#8696a0' }}>{isMembersExpanded ? '▼' : '▶'}</span>
                            </div>
                            {isMembersExpanded && dispMembers.map(c => (
                                <div key={c.email} onClick={() => setSelectedContact(c.email)} style={{ padding: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottom: '1px solid #222d34', backgroundColor: selectedContact === c.email ? '#2a3942' : 'transparent' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#00a884', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: 15, color: '#111', fontWeight: 'bold' }}>{(c.name || c.email)[0]?.toUpperCase()}</div>
                                    <span>{c.name?.trim() || c.email.split('@')[0]}</span>
                                </div>
                            ))}
                            <div onClick={() => setIsContactsExpanded(!isContactsExpanded)} style={{ padding: '10px 15px', backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', borderBottom: '1px solid #222d34', marginTop: 10 }}>
                                <span style={{ color: '#8696a0', fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' }}>Contacts ({dispContacts.length})</span>
                                <span style={{ color: '#8696a0' }}>{isContactsExpanded ? '▼' : '▶'}</span>
                            </div>
                            {isContactsExpanded && dispContacts.map(c => (
                                <div key={c.email} onClick={() => setSelectedContact(c.email)} style={{ padding: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottom: '1px solid #222d34', backgroundColor: selectedContact === c.email ? '#2a3942' : 'transparent' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#64748b', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: 15, color: '#fff', fontWeight: 'bold' }}>{(c.name || c.email)[0]?.toUpperCase()}</div>
                                    <div style={{ flexGrow: 1 }}><div>{c.name || c.email.split('@')[0]}</div><div style={{ fontSize: 12, color: '#8696a0' }}>{c.email}</div></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {showChat && (
                    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0b141a', height: '100%', overflow: 'hidden' }}>
                        {selectedContact ? (
                            <>
                                <div style={{ padding: '10px 20px', backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        {isMobile && <button onClick={() => setSelectedContact(null)} style={{ background: 'none', border: 'none', color: '#00a884', fontSize: 20, marginRight: 15, cursor: 'pointer' }}>🔙</button>}
                                        <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#00a884', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: 15, color: '#111', fontWeight: 'bold' }}>{activeName[0]?.toUpperCase()}</div>
                                        <b>{activeName}</b>
                                    </div>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        {!inVoiceCall ? (
                                            <button onClick={() => initiateCall(selectedContact)} style={{ backgroundColor: 'transparent', border: '1px solid #00a884', color: '#00a884', padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold' }}>📹 Call</button>
                                        ) : (
                                            <>
                                                {!activeCallEmails.includes(selectedContact) && (
                                                    <button onClick={() => initiateCall(selectedContact)} style={{ backgroundColor: '#005c4b', border: '1px solid #00a884', color: 'white', padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold' }}>
                                                        ➕ Add to Call
                                                    </button>
                                                )}
                                                <button onClick={toggleScreenShare} style={{ backgroundColor: isScreenSharing ? '#005c4b' : 'transparent', border: '1px solid #00a884', color: isScreenSharing ? 'white' : '#00a884', padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold' }}>
                                                    {isScreenSharing ? '💻 Stop Share' : '💻 Share'}
                                                </button>
                                                <button onClick={() => endCall(true)} style={{ backgroundColor: '#ef4444', border: 'none', color: 'white', padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold' }}>🔴 End</button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {inVoiceCall && (
                                    <div style={{ height: '45vh', backgroundColor: '#000', display: 'grid', gridTemplateColumns: `repeat(${Math.max(Object.keys(remoteStreams).length + 1, 2)}, 1fr)`, gap: 10, padding: 10 }}>
                                        <LocalVideo stream={localStream} />
                                        {Object.entries(remoteStreams).map(([email, stream]) => (
                                            <RemoteVideo key={email} stream={stream} email={email} allKnownUsers={allKnown} />
                                        ))}
                                    </div>
                                )}

                                <div ref={chatContainerRef} style={{ flexGrow: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, backgroundImage: 'url(https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png)' }}>
                                    {chatMessages.map((m, i) => (
                                        <div key={m.id || i} style={{ alignSelf: m.sender_email === userEmail ? 'flex-end' : 'flex-start', backgroundColor: m.sender_email === userEmail ? '#005c4b' : '#202c33', padding: '8px 12px', borderRadius: 8, maxWidth: '65%', wordWrap: 'break-word' }}>{m.text}</div>
                                    ))}
                                </div>

                                <form onSubmit={sendMsg} style={{ padding: 15, backgroundColor: '#202c33', display: 'flex', gap: 10 }}>
                                    <textarea value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={handleKey} placeholder="Message" rows={1} style={{ flexGrow: 1, padding: 12, backgroundColor: '#2a3942', border: 'none', borderRadius: 8, color: 'white', outline: 'none', resize: 'none' }} />
                                    <button type="submit" disabled={!chatInput.trim()} style={{ backgroundColor: chatInput.trim() ? '#00a884' : '#333', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: chatInput.trim() ? 'pointer' : 'default', color: '#111', fontSize: 18, flexShrink: 0 }}>➤</button>
                                </form>
                            </>
                        ) : (
                            <div style={{ display: 'flex', flexGrow: 1, justifyContent: 'center', alignItems: 'center', color: '#8696a0', textAlign: 'center' }}>
                                <div><h2>TotalRecall</h2><p>Select a contact to start</p></div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            {/* FOOTER */}
            <div style={{
                backgroundColor: '#202c33',
                padding: '10px 20px',
                borderTop: '1px solid #222d34',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                fontSize: '13px',
                color: '#8696a0'
            }}>
                <span>© NoirSoft Creation 2026</span>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <span>👥 Members: {memberCount}</span>
                    <span>🟢 Online: {totalOnlineCount}</span>
                </div>
            </div>
        </div>
    );
}

// ==========================================
// 🛡️ AUTHENTICATION WRAPPER
// ==========================================
export default function App() {
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user || null));
        return () => subscription.unsubscribe();
    }, []);

    const auth = async (e, type) => {
        e.preventDefault();
        if (!email || !password) return alert("Fill all fields");
        setLoading(true);
        try {
            if (type === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });

                if (error) {
                    if (error.status === 429) {
                        throw new Error("Rate limit exceeded. Please wait a moment before trying again.");
                    }
                    throw error;
                }
            } else {
                const { data, error } = await supabase.auth.signUp({ email, password });

                if (error) {
                    if (error.status === 429) {
                        throw new Error("Supabase signup limit reached. Please use a new test email (e.g., name+1@email.com) or temporarily raise the rate limits in your Supabase Dashboard.");
                    }
                    throw error;
                }

                if (data?.user) {

                    // RE-ADDED: Call the edge function manually
                    try {
                        await supabase.functions.invoke('confirm-email', {
                            body: { email: email }
                        });
                    } catch (edgeError) {
                        console.error("Failed to invoke edge function:", edgeError);
                    }

                    if (data.session) {
                        await supabase.from('profiles').upsert([{ email, name: email.split('@')[0] }]);
                    } else {
                        setShowConfirm(true);
                        setEmail('');
                        setPassword('');
                    }
                }
            }
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (user) return <ChatApp user={user} onLogout={() => supabase.auth.signOut()} />;

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh', backgroundColor: '#111b21', color: 'white', fontFamily: 'Segoe UI' }}>
            <div style={{ backgroundColor: '#202c33', padding: 40, borderRadius: 8, width: 350, maxWidth: '90%', textAlign: 'center' }}>
                <h2 style={{ color: '#00a884', marginBottom: 30 }}>TotalRecall</h2>
                {showConfirm ? (
                    <div><h3>Check your email</h3><p style={{ color: '#8696a0' }}>Confirmation sent!</p><button onClick={() => setShowConfirm(false)} style={{ width: '100%', padding: 12, backgroundColor: '#00a884', color: '#111', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer' }}>Back</button></div>
                ) : (
                    <form onSubmit={e => e.preventDefault()}>
                        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: 12, marginBottom: 15, borderRadius: 4, border: 'none', backgroundColor: '#2a3942', color: 'white', boxSizing: 'border-box' }} />
                        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: 12, marginBottom: 20, borderRadius: 4, border: 'none', backgroundColor: '#2a3942', color: 'white', boxSizing: 'border-box' }} />
                        <button onClick={e => auth(e, 'login')} disabled={loading} style={{ width: '100%', padding: 12, backgroundColor: '#00a884', color: '#111', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer', marginBottom: 10 }}>{loading ? '...' : 'Log In'}</button>
                        <button onClick={e => auth(e, 'signup')} disabled={loading} style={{ width: '100%', padding: 12, backgroundColor: 'transparent', color: '#00a884', border: '1px solid #00a884', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer' }}>{loading ? '...' : 'Sign Up'}</button>
                    </form>
                )}
            </div>
        </div>
    );
}