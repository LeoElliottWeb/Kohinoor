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

            if (!this.audioContext || this.audioContext.state === 'closed') {
                this.audioContext = new AudioContext();
            }

            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            this.oscillator = this.audioContext.createOscillator();
            this.gainNode = this.audioContext.createGain();

            this.oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            this.oscillator.frequency.exponentialRampToValueAtTime(1000, this.audioContext.currentTime + 0.1);
            this.oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.3);

            this.oscillator.type = 'sine';

            this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            this.gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.05);
            this.gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);

            this.oscillator.connect(this.gainNode);
            this.gainNode.connect(this.audioContext.destination);

            this.oscillator.start(this.audioContext.currentTime);
            this.oscillator.stop(this.audioContext.currentTime + 0.8);

            const osc2 = this.audioContext.createOscillator();
            const gain2 = this.audioContext.createGain();
            osc2.frequency.setValueAtTime(1200, this.audioContext.currentTime);
            osc2.frequency.exponentialRampToValueAtTime(1500, this.audioContext.currentTime + 0.1);
            osc2.frequency.exponentialRampToValueAtTime(900, this.audioContext.currentTime + 0.3);
            osc2.type = 'sine';
            gain2.gain.setValueAtTime(0, this.audioContext.currentTime);
            gain2.gain.linearRampToValueAtTime(0.15, this.audioContext.currentTime + 0.05);
            gain2.gain.exponentialRampToValueAtTime(0.005, this.audioContext.currentTime + 0.6);
            osc2.connect(gain2);
            gain2.connect(this.audioContext.destination);
            osc2.start(this.audioContext.currentTime);
            osc2.stop(this.audioContext.currentTime + 0.6);

        } catch (e) {
            console.error("Error playing bell:", e);
        }
    }

    start(type, onTimeout) {
        this.stop();
        this.isRinging = true;
        this.timeoutCallback = onTimeout;
        this.playBell();

        let ringCount = 0;
        const maxRings = 20;

        const scheduleNextRing = () => {
            if (!this.isRinging) return;

            ringCount++;
            if (ringCount >= maxRings) {
                this.stop();
                if (this.timeoutCallback) {
                    this.timeoutCallback();
                }
                return;
            }

            this.timeoutId = setTimeout(() => {
                if (this.isRinging) {
                    this.playBell();
                    scheduleNextRing();
                }
            }, 3000);
        };

        scheduleNextRing();
    }

    stop() {
        this.isRinging = false;

        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        if (this.oscillator) {
            try {
                this.oscillator.stop();
                this.oscillator = null;
            } catch (e) { }
        }

        if (this.gainNode) {
            this.gainNode = null;
        }

        this.timeoutCallback = null;
    }

    isActive() {
        return this.isRinging;
    }
}

const ringer = new RingerManager();

if (typeof document !== 'undefined') {
    const unlock = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                const ctx = new AudioContext();
                if (ctx.state === 'suspended') {
                    ctx.resume();
                }
                const buffer = ctx.createBuffer(1, 1, 22050);
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                source.start();
                setTimeout(() => {
                    try { ctx.close(); } catch (e) { }
                }, 100);
            }
        } catch (e) { }
        document.removeEventListener('click', unlock);
        document.removeEventListener('touchstart', unlock);
    };
    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock);
}

// ==========================================
// 📺 REMOTE VIDEO COMPONENT
// ==========================================
function RemoteVideo({ stream, email, allKnownUsers }) {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl || !stream) return;

        console.log("[RemoteVideo] Setting up video for:", email);

        // Always set the srcObject when stream changes
        if (videoEl.srcObject !== stream) {
            videoEl.srcObject = stream;
        }

        const handleCanPlay = () => {
            console.log("[RemoteVideo] Can play for:", email);
            setIsPlaying(true);
            videoEl.play().catch(err => {
                console.warn("[RemoteVideo] Play error:", err.message);
            });
        };

        const handlePlaying = () => {
            console.log("[RemoteVideo] Now playing for:", email);
            setIsPlaying(true);
        };

        const handleError = (e) => {
            console.error("[RemoteVideo] Video error for:", email, e);
            setIsPlaying(false);
        };

        videoEl.addEventListener('canplay', handleCanPlay);
        videoEl.addEventListener('playing', handlePlaying);
        videoEl.addEventListener('error', handleError);

        // Try to play immediately
        videoEl.play().catch(err => {
            console.warn("[RemoteVideo] Initial play attempt failed:", err.message);
        });

        return () => {
            videoEl.removeEventListener('canplay', handleCanPlay);
            videoEl.removeEventListener('playing', handlePlaying);
            videoEl.removeEventListener('error', handleError);
            videoEl.srcObject = null;
        };
    }, [stream, email]);

    const safeEmail = email?.trim().toLowerCase();
    const contactName = allKnownUsers.find(c => c.email?.trim().toLowerCase() === safeEmail)?.name || email.split('@')[0];

    return (
        <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            backgroundColor: '#111',
            borderRadius: '8px',
            overflow: 'hidden'
        }}>
            {!isPlaying && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#8696a0',
                    zIndex: 1,
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '8px' }}>📹</div>
                    <div style={{ fontSize: '14px' }}>Connecting...</div>
                </div>
            )}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    backgroundColor: '#000'
                }}
            />
            <span style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                background: 'rgba(0,0,0,0.7)',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '13px',
                color: '#fff',
                zIndex: 2
            }}>
                {contactName}
            </span>
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

    const [inVoiceCall, setInVoiceCall] = useState(false);
    const [incomingCall, setIncomingCall] = useState(null);
    const incomingCallRef = useRef(null);
    const [isCallingOut, setIsCallingOut] = useState(false);

    const [localMediaStream, setLocalMediaStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});

    const peersRef = useRef({});
    const pendingCandidatesRef = useRef({});

    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const screenStreamRef = useRef(null);
    const localStreamRef = useRef(null);

    const chatContainerRef = useRef(null);
    const localVideoRef = useRef(null);

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [isImporting, setIsImporting] = useState(false);

    const inCallRef = useRef(false);

    useEffect(() => {
        selectedContactRef.current = selectedContact;
    }, [selectedContact]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // IMPORTANT: Replace with your Metered credentials
    // Sign up at https://metered.ca/stun-turn for free credentials
    const METERED_USERNAME = "b7cf8da6379b050323098734";
    const METERED_CREDENTIAL = "AMGwLNr1/IaRrZGQ";

    const rtcConfig = {
        iceServers: [
            {
                urls: [
                    "stun:stun.relay.metered.ca:80",
                    "turn:standard.relay.metered.ca:80",
                    "turn:standard.relay.metered.ca:80?transport=tcp",
                    "turn:standard.relay.metered.ca:443",
                    "turn:standard.relay.metered.ca:443?transport=tcp"
                ],
                username: METERED_USERNAME,
                credential: METERED_CREDENTIAL
            }
        ],
        iceCandidatePoolSize: 10,
        iceTransportPolicy: "all",
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require"
    };

    useEffect(() => {
        incomingCallRef.current = incomingCall;
    }, [incomingCall]);

    useEffect(() => {
        const shouldRing = !!incomingCall || isCallingOut;

        if (shouldRing && !ringer.isActive()) {
            const timeoutAction = () => {
                if (incomingCallRef.current) {
                    const callToDecline = incomingCallRef.current;
                    if (channelRef.current) {
                        channelRef.current.send({
                            type: 'broadcast', event: 'webrtc-decline',
                            payload: { targetEmail: callToDecline.sender, sender: userEmail }
                        });
                    }
                    setIncomingCall(null);
                } else if (isCallingOut) {
                    endVoiceCall(true);
                    alert("No answer. The call timed out after 60 seconds.");
                }
            };
            ringer.start(incomingCall ? 'incoming' : 'outgoing', timeoutAction);
        } else if (!shouldRing && ringer.isActive()) {
            ringer.stop();
        }

        return () => {
            if (ringer.isActive()) {
                ringer.stop();
            }
        };
    }, [incomingCall, isCallingOut]);

    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const { data, error } = await supabase.from('profiles').select('email, name');
                if (!error && data) {
                    setMembers(data);
                }
            } catch (err) {
                console.error("Exception fetching profiles:", err);
            }

            const stored = localStorage.getItem('totalRecallContacts');
            if (stored) {
                try {
                    const parsedContacts = JSON.parse(stored);
                    setSavedContacts(parsedContacts);
                } catch (e) { }
            }
        };

        fetchMembers();

        const profilesChannel = supabase.channel('public:profiles')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, payload => {
                const newProfile = payload.new;
                setMembers(prev => {
                    const newEmailSafe = newProfile.email?.trim().toLowerCase();
                    if (prev.find(m => m.email?.trim().toLowerCase() === newEmailSafe)) return prev;
                    return [...prev, { name: newProfile.name || newProfile.email.split('@')[0], email: newProfile.email }];
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(profilesChannel);
        };
    }, []);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatMessages]);

    useEffect(() => {
        if (localVideoRef.current && localMediaStream) {
            localVideoRef.current.srcObject = localMediaStream;
            localVideoRef.current.play().catch(e => {
                if (e.name !== 'AbortError') console.error("Local video play error:", e);
            });
        }
    }, [localMediaStream]);

    useEffect(() => {
        if (!selectedContact || !userEmail) return;

        const fetchHistory = async () => {
            const [sent, received] = await Promise.all([
                supabase.from('messages').select('*').eq('sender_email', userEmail).eq('receiver_email', selectedContact).limit(50),
                supabase.from('messages').select('*').eq('sender_email', selectedContact).eq('receiver_email', userEmail).limit(50)
            ]);

            const allMessages = [...(sent.data || []), ...(received.data || [])]
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

            setChatMessages(allMessages);
        };
        fetchHistory();
    }, [selectedContact, userEmail]);

    const getMediaStream = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "user",
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 24 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            console.log("[Media] Got stream with tracks:", stream.getTracks().map(t => t.kind));
            return stream;
        } catch (err) {
            console.error("[Media] Error getting media:", err);
            throw err;
        }
    };

    const createPeerConnection = (targetEmail) => {
        // Close existing connection
        if (peersRef.current[targetEmail]) {
            console.log("[WebRTC] Closing existing PC for:", targetEmail);
            peersRef.current[targetEmail].close();
        }

        console.log("[WebRTC] Creating PC for:", targetEmail);
        const pc = new RTCPeerConnection(rtcConfig);
        peersRef.current[targetEmail] = pc;

        // Initialize pending candidates queue
        if (!pendingCandidatesRef.current[targetEmail]) {
            pendingCandidatesRef.current[targetEmail] = [];
        }

        // Add local tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                console.log("[WebRTC] Adding track:", track.kind);
                pc.addTrack(track, localStreamRef.current);
            });
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("[WebRTC] Generated ICE candidate for:", targetEmail);
                if (channelRef.current) {
                    channelRef.current.send({
                        type: 'broadcast',
                        event: 'webrtc-ice-candidate',
                        payload: {
                            targetEmail,
                            candidate: event.candidate,
                            sender: userEmail
                        }
                    });
                }
            } else {
                console.log("[WebRTC] ICE gathering complete for:", targetEmail);
            }
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
            console.log("[WebRTC] Connection state:", pc.connectionState, "for:", targetEmail);

            if (pc.connectionState === 'connected') {
                console.log("[WebRTC] ✅ Connected to:", targetEmail);
            } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                console.log("[WebRTC] ❌ Connection failed/closed for:", targetEmail);
                cleanupPeer(targetEmail);
            }
        };

        // Handle ICE connection state
        pc.oniceconnectionstatechange = () => {
            console.log("[WebRTC] ICE state:", pc.iceConnectionState, "for:", targetEmail);
        };

        // Handle incoming tracks
        pc.ontrack = (event) => {
            console.log("[WebRTC] 📹 Received track:", event.track.kind, "from:", targetEmail);

            if (event.streams && event.streams[0]) {
                const remoteStream = event.streams[0];
                console.log("[WebRTC] Got remote stream with", remoteStream.getTracks().length, "tracks");

                setRemoteStreams(prev => ({
                    ...prev,
                    [targetEmail]: remoteStream
                }));
            }
        };

        return pc;
    };

    const cleanupPeer = (email) => {
        console.log("[WebRTC] Cleaning up peer:", email);

        if (peersRef.current[email]) {
            peersRef.current[email].close();
            delete peersRef.current[email];
        }

        setRemoteStreams(prev => {
            const newStreams = { ...prev };
            delete newStreams[email];
            return newStreams;
        });

        delete pendingCandidatesRef.current[email];

        // Check if call should end
        if (Object.keys(peersRef.current).length === 0 && inCallRef.current) {
            console.log("[WebRTC] No more peers, ending call");
            endVoiceCall(false);
        }
    };

    const endVoiceCall = (broadcast = true) => {
        console.log("[WebRTC] Ending call");
        inCallRef.current = false;

        if (ringer.isActive()) {
            ringer.stop();
        }

        setIsCallingOut(false);
        setIncomingCall(null);

        // Close all connections
        Object.entries(peersRef.current).forEach(([email, pc]) => {
            pc.close();
            if (broadcast && channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'webrtc-end',
                    payload: { targetEmail: email, sender: userEmail }
                });
            }
        });

        peersRef.current = {};
        pendingCandidatesRef.current = {};
        setRemoteStreams({});

        // Stop local stream
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        // Stop screen share
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(track => track.stop());
            screenStreamRef.current = null;
        }

        setIsScreenSharing(false);
        setLocalMediaStream(null);
        setInVoiceCall(false);
    };

    const startCall = async (targetEmail) => {
        if (!channelRef.current) {
            console.error("[WebRTC] No channel available");
            return;
        }

        console.log("[WebRTC] 📞 Starting call to:", targetEmail);
        inCallRef.current = true;
        setIsCallingOut(true);

        try {
            // Get local media
            if (!localStreamRef.current) {
                console.log("[WebRTC] Getting local media...");
                const stream = await getMediaStream();
                localStreamRef.current = stream;
                setLocalMediaStream(stream);
            }

            // Create peer connection
            const pc = createPeerConnection(targetEmail);

            // Create and send offer
            console.log("[WebRTC] Creating offer...");
            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await pc.setLocalDescription(offer);

            console.log("[WebRTC] Sending offer to:", targetEmail);
            channelRef.current.send({
                type: 'broadcast',
                event: 'webrtc-offer',
                payload: {
                    targetEmail,
                    offer: pc.localDescription,
                    sender: userEmail
                }
            });

            setInVoiceCall(true);
        } catch (err) {
            console.error("[WebRTC] Start call error:", err);
            alert("Failed to start call: " + err.message);
            endVoiceCall(false);
        }
    };

    const acceptCall = async () => {
        const currentIncomingCall = incomingCallRef.current;
        if (!currentIncomingCall) {
            console.warn("[WebRTC] No incoming call to accept");
            return;
        }

        console.log("[WebRTC] ✅ Accepting call from:", currentIncomingCall.sender);
        inCallRef.current = true;

        if (ringer.isActive()) {
            ringer.stop();
        }

        setIncomingCall(null);

        try {
            // Get local media
            if (!localStreamRef.current) {
                console.log("[WebRTC] Getting local media...");
                const stream = await getMediaStream();
                localStreamRef.current = stream;
                setLocalMediaStream(stream);
            }

            const senderEmail = currentIncomingCall.sender;
            const pc = createPeerConnection(senderEmail);

            // Set remote description (the offer)
            console.log("[WebRTC] Setting remote description...");
            await pc.setRemoteDescription(new RTCSessionDescription(currentIncomingCall.offer));

            // Create and send answer
            console.log("[WebRTC] Creating answer...");
            const answer = await pc.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await pc.setLocalDescription(answer);

            console.log("[WebRTC] Sending answer to:", senderEmail);
            channelRef.current.send({
                type: 'broadcast',
                event: 'webrtc-answer',
                payload: {
                    targetEmail: senderEmail,
                    answer: pc.localDescription,
                    sender: userEmail
                }
            });

            // Process pending candidates
            const pending = pendingCandidatesRef.current[senderEmail] || [];
            console.log("[WebRTC] Processing", pending.length, "pending candidates");
            for (const candidate of pending) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    console.error("[WebRTC] Error adding pending candidate:", err);
                }
            }
            pendingCandidatesRef.current[senderEmail] = [];

            setInVoiceCall(true);
            setSelectedContact(senderEmail);

        } catch (err) {
            console.error("[WebRTC] Accept call error:", err);
            alert("Failed to accept call: " + err.message);
            endVoiceCall(false);
        }
    };

    const handleDeclineCall = () => {
        if (ringer.isActive()) {
            ringer.stop();
        }

        const callToDecline = incomingCallRef.current;
        if (callToDecline && channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'webrtc-decline',
                payload: { targetEmail: callToDecline.sender, sender: userEmail }
            });
        }
        setIncomingCall(null);
    };

    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            stopScreenShare();
            return;
        }

        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            screenStreamRef.current = screenStream;
            const screenTrack = screenStream.getVideoTracks()[0];

            screenTrack.onended = () => stopScreenShare();

            Object.values(peersRef.current).forEach(pc => {
                const senders = pc.getSenders();
                const videoSender = senders.find(s => s.track && s.track.kind === 'video');
                if (videoSender) {
                    videoSender.replaceTrack(screenTrack);
                }
            });

            setIsScreenSharing(true);
        } catch (err) {
            console.error("[WebRTC] Screen share error:", err);
        }
    };

    const stopScreenShare = () => {
        if (!isScreenSharing) return;

        setIsScreenSharing(false);

        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(track => track.stop());
            screenStreamRef.current = null;
        }
    };

    useEffect(() => {
        if (!userEmail) return;

        const presenceKey = `user_${userEmail}`;
        const channel = supabase.channel('totalrecall-global', {
            config: { presence: { key: presenceKey } },
        });

        channelRef.current = channel;

        channel.on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const activeUsers = [];

            for (const key in state) {
                const presences = state[key];
                if (presences && presences.length > 0) {
                    const presence = presences[0];
                    if (presence && presence.email && presence.email !== userEmail) {
                        if (!activeUsers.some(u => u.email === presence.email)) {
                            activeUsers.push({ email: presence.email, presenceKey: key });
                        }
                    }
                }
            }
            setOnlineUsers(activeUsers);
        });

        channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            const newMsg = payload.new;
            const currentContact = selectedContactRef.current;

            if (
                (newMsg.sender_email === currentContact && newMsg.receiver_email === userEmail) ||
                (newMsg.sender_email === userEmail && newMsg.receiver_email === currentContact)
            ) {
                setChatMessages(prev => {
                    if (prev.find(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
            }
        });

        // Handle incoming offer
        channel.on('broadcast', { event: 'webrtc-offer' }, async ({ payload }) => {
            if (payload.targetEmail !== userEmail) return;

            console.log("[WebRTC] 📩 Received offer from:", payload.sender);

            // Auto-accept if already in a call
            if (inCallRef.current && localStreamRef.current) {
                console.log("[WebRTC] Auto-accepting (already in call)");
                try {
                    const pc = createPeerConnection(payload.sender);
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
                    const answer = await pc.createAnswer({
                        offerToReceiveAudio: true,
                        offerToReceiveVideo: true
                    });
                    await pc.setLocalDescription(answer);

                    channelRef.current.send({
                        type: 'broadcast',
                        event: 'webrtc-answer',
                        payload: { targetEmail: payload.sender, answer: pc.localDescription, sender: userEmail }
                    });

                    // Process pending candidates
                    const pending = pendingCandidatesRef.current[payload.sender] || [];
                    for (const candidate of pending) {
                        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (err) { }
                    }
                    pendingCandidatesRef.current[payload.sender] = [];
                } catch (err) {
                    console.error("[WebRTC] Auto-accept error:", err);
                }
            } else {
                setIncomingCall(payload);
            }
        });

        // Handle answer
        channel.on('broadcast', { event: 'webrtc-answer' }, async ({ payload }) => {
            if (payload.targetEmail !== userEmail) return;

            console.log("[WebRTC] 📩 Received answer from:", payload.sender);
            setIsCallingOut(false);

            const pc = peersRef.current[payload.sender];
            if (pc) {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
                    console.log("[WebRTC] Remote description set");

                    // Process pending candidates
                    const pending = pendingCandidatesRef.current[payload.sender] || [];
                    console.log("[WebRTC] Processing", pending.length, "pending candidates");
                    for (const candidate of pending) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(candidate));
                        } catch (err) {
                            console.error("[WebRTC] Error adding pending candidate:", err);
                        }
                    }
                    pendingCandidatesRef.current[payload.sender] = [];
                } catch (err) {
                    console.error("[WebRTC] Error setting remote description:", err);
                }
            }
        });

        // Handle ICE candidates
        channel.on('broadcast', { event: 'webrtc-ice-candidate' }, async ({ payload }) => {
            if (payload.targetEmail !== userEmail) return;

            const pc = peersRef.current[payload.sender];

            if (pc && pc.remoteDescription) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                    console.log("[WebRTC] Added ICE candidate from:", payload.sender);
                } catch (err) {
                    console.error("[WebRTC] Error adding ICE candidate:", err);
                }
            } else {
                console.log("[WebRTC] Queuing ICE candidate (no remote description yet)");
                if (!pendingCandidatesRef.current[payload.sender]) {
                    pendingCandidatesRef.current[payload.sender] = [];
                }
                pendingCandidatesRef.current[payload.sender].push(payload.candidate);
            }
        });

        channel.on('broadcast', { event: 'webrtc-decline' }, ({ payload }) => {
            if (payload.targetEmail === userEmail) {
                setIsCallingOut(false);
                endVoiceCall(false);
                alert(`${payload.sender.split('@')[0]} declined the call.`);
            }
        });

        channel.on('broadcast', { event: 'webrtc-end' }, ({ payload }) => {
            if (payload.targetEmail === userEmail) {
                console.log("[WebRTC] Remote peer ended call:", payload.sender);
                setIncomingCall(null);
                cleanupPeer(payload.sender);
            }
        });

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                try {
                    await channel.track({ email: userEmail, online: true, timestamp: new Date().toISOString() });
                } catch (error) {
                    console.error("Error tracking presence:", error);
                }
            }
        });

        return () => {
            if (channelRef.current) {
                try {
                    channelRef.current.untrack();
                    supabase.removeChannel(channelRef.current);
                } catch (error) {
                    console.error("Error cleaning up channel:", error);
                }
                channelRef.current = null;
            }
        };
    }, [userEmail]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !selectedContact) return;

        const textToSend = chatInput;
        setChatInput('');

        const { data, error } = await supabase.from('messages').insert([
            { sender_email: userEmail, receiver_email: selectedContact, text: textToSend }
        ]).select();

        if (error) {
            alert(`Error sending message: ${error.message}`);
            return;
        }

        if (data && data.length > 0) {
            setChatMessages(prev => {
                if (prev.find(m => m.id === data[0].id)) return prev;
                return [...prev, data[0]];
            });
        }
    };

    const generatePrettyEmailHTML = (contactName, inviterName, inviterEmail) => {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: -apple-system, sans-serif; background-color: #f4f6f8; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); overflow: hidden; }
                    .header { background: linear-gradient(135deg, #00a884 0%, #008f72 100%); padding: 40px 30px; text-align: center; }
                    .header h1 { color: #ffffff; font-size: 32px; font-weight: 700; margin: 0; }
                    .header p { color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 8px 0 0 0; }
                    .content { padding: 40px 30px; color: #1e293b; }
                    .cta-button { display: inline-block; background: linear-gradient(135deg, #00a884 0%, #008f72 100%); color: #ffffff !important; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: 600; font-size: 18px; margin: 8px 0 0 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header"><h1>📱 TotalRecall</h1><p>Connect, Chat &amp; Video Call</p></div>
                    <div class="content">
                        <p>Hello ${contactName || 'there'}! 👋</p>
                        <p><strong>${inviterName}</strong> (${inviterEmail}) has invited you to connect!</p>
                        <div style="text-align: center;"><a href="${window.location.origin}" class="cta-button">🚀 Join Now</a></div>
                    </div>
                </div>
            </body>
            </html>
        `;
    };

    const handleImportContacts = async () => {
        if (isImporting) return;
        setIsImporting(true);

        try {
            const supported = ('contacts' in navigator && 'ContactsManager' in window);
            let contactsToProcess = [];

            if (supported) {
                try {
                    const contacts = await navigator.contacts.select(['name', 'email'], { multiple: true });
                    contactsToProcess = contacts.filter(c => c.email && c.email.length > 0).map(c => ({
                        name: c.name?.[0] || c.email[0].split('@')[0],
                        email: c.email[0]
                    }));
                } catch (err) {
                    alert("Contact selection failed.");
                    setIsImporting(false);
                    return;
                }
            } else {
                const emailInput = prompt("Enter an email address to send an invite manually:");
                if (emailInput && emailInput.trim()) {
                    const targetEmail = emailInput.trim();
                    if (!targetEmail.includes('@') || !targetEmail.includes('.')) {
                        alert("Invalid email.");
                        setIsImporting(false);
                        return;
                    }
                    contactsToProcess = [{ name: targetEmail.split('@')[0], email: targetEmail }];
                } else {
                    setIsImporting(false);
                    return;
                }
            }

            if (contactsToProcess.length === 0) {
                setIsImporting(false);
                return;
            }

            const existingLocalEmails = new Set(savedContacts.map(c => c.email?.trim().toLowerCase()));
            const contactsToAdd = [];

            contactsToProcess.forEach(contact => {
                const emailLower = contact.email.trim().toLowerCase();
                if (!existingLocalEmails.has(emailLower)) {
                    contactsToAdd.push({ name: contact.name || contact.email.split('@')[0], email: contact.email.trim() });
                }
            });

            if (contactsToAdd.length > 0) {
                setSavedContacts(prev => {
                    const merged = [...prev, ...contactsToAdd];
                    localStorage.setItem('totalRecallContacts', JSON.stringify(merged));
                    return merged;
                });
            }

            for (const contact of contactsToProcess) {
                try {
                    const prettyHTML = generatePrettyEmailHTML(contact.name, displayName, userEmail);
                    await supabase.functions.invoke('send-email', {
                        body: { to: contact.email, subject: `📱 ${displayName} wants to connect on TotalRecall!`, html: prettyHTML }
                    });
                } catch (error) {
                    console.error("Error sending email:", error);
                }
            }
            alert(`Processed ${contactsToProcess.length} contacts successfully.`);
        } catch (error) {
            alert("Error importing contacts.");
        } finally {
            setIsImporting(false);
        }
    };

    const handleRemoveContact = (e, emailToRemove) => {
        e.stopPropagation();
        if (window.confirm('Remove this contact?')) {
            setSavedContacts(prev => {
                const updatedContacts = prev.filter(c => c.email !== emailToRemove);
                localStorage.setItem('totalRecallContacts', JSON.stringify(updatedContacts));
                return updatedContacts;
            });
            if (selectedContact === emailToRemove) setSelectedContact(null);
        }
    };

    const refreshPresence = async () => {
        if (channelRef.current) {
            try {
                await channelRef.current.track({ email: userEmail, online: true, timestamp: new Date().toISOString() });
            } catch (error) {
                console.error("Error refreshing presence:", error);
            }
        }
    };

    const isSelectedContactInCall = Object.keys(remoteStreams).includes(selectedContact);
    const showSidebar = !isMobile || !selectedContact;
    const showChat = !isMobile || !!selectedContact;

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(e);
        }
    };

    const safeUserEmail = userEmail ? userEmail.trim().toLowerCase() : '';
    const allKnownUsers = [...members, ...savedContacts];

    const displayMembers = members.filter(m => m.email && m.email.trim().toLowerCase() !== safeUserEmail);
    const displayLocalContacts = savedContacts.filter(c => c.email && c.email.trim().toLowerCase() !== safeUserEmail);

    const activeContactObj = allKnownUsers.find(c => c.email?.trim().toLowerCase() === selectedContact?.trim().toLowerCase());
    const activeContactName = activeContactObj ? activeContactObj.name : (selectedContact ? selectedContact.split('@')[0] : '');
    const getMemberDisplayName = (member) => (member.name && member.name.trim()) ? member.name : member.email.split('@')[0];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', backgroundColor: '#111b21', color: '#e9edef', fontFamily: 'Segoe UI, sans-serif', overflow: 'hidden' }}>
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {incomingCall && (
                    <div style={{ position: 'fixed', top: 20, right: 20, backgroundColor: '#202c33', padding: '20px', borderRadius: '8px', zIndex: 1000, border: '1px solid #00a884', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                        <h4 style={{ margin: '0 0 10px 0' }}>📹 Incoming Call</h4>
                        <p style={{ margin: '0 0 15px 0', fontSize: '14px' }}>From: <b>{incomingCall.sender.split('@')[0]}</b></p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={acceptCall} style={{ flex: 1, backgroundColor: '#00a884', border: 'none', padding: '8px', borderRadius: '4px', color: '#111', fontWeight: 'bold', cursor: 'pointer' }}>Accept</button>
                            <button onClick={handleDeclineCall} style={{ flex: 1, backgroundColor: '#ef4444', border: 'none', padding: '8px', borderRadius: '4px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Decline</button>
                        </div>
                    </div>
                )}

                {showSidebar && (
                    <div style={{ width: isMobile ? '100%' : '30%', minWidth: isMobile ? '100%' : '250px', borderRight: isMobile ? 'none' : '1px solid #222d34', display: 'flex', flexDirection: 'column', backgroundColor: '#111b21', height: '100%', overflow: 'hidden' }}>
                        <div style={{ padding: '15px', backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#00a884', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#111', fontWeight: 'bold' }}>
                                    {displayName.charAt(0).toUpperCase()}
                                </div>
                                <b style={{ color: '#00a884', fontSize: '15px' }}>{displayName}</b>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={refreshPresence} style={{ background: 'none', border: 'none', color: '#aebac1', cursor: 'pointer', fontSize: '14px' }}>🔄</button>
                                <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#aebac1', cursor: 'pointer', fontSize: '14px' }}>Logout</button>
                            </div>
                        </div>

                        <div style={{ flexGrow: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            <div onClick={() => setIsOnlineExpanded(!isOnlineExpanded)} style={{ padding: '10px', backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid #222d34', userSelect: 'none' }}>
                                <span style={{ color: '#8696a0', fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold' }}>Online Now ({onlineUsers.length})</span>
                                <span style={{ color: '#8696a0', fontSize: '10px' }}>{isOnlineExpanded ? '▼' : '▶'}</span>
                            </div>
                            {isOnlineExpanded && (
                                onlineUsers.length === 0 ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#8696a0', fontSize: '14px' }}>No users online.</div>
                                ) : (
                                    onlineUsers.map(u => {
                                        const matchedMember = allKnownUsers.find(k => k.email?.trim().toLowerCase() === u.email?.trim().toLowerCase());
                                        const finalName = matchedMember ? matchedMember.name : u.email.split('@')[0];

                                        return (
                                            <div key={u.email} onClick={() => setSelectedContact(u.email)} style={{ padding: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottom: '1px solid #222d34', backgroundColor: selectedContact === u.email ? '#2a3942' : 'transparent', transition: 'background 0.2s' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#38bdf8', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '15px', color: '#111', fontWeight: 'bold' }}>
                                                    {u.email.charAt(0).toUpperCase()}
                                                </div>
                                                <span style={{ fontSize: '16px' }}>{finalName}</span>
                                                {Object.keys(remoteStreams).includes(u.email) && <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#00a884' }}>📞 In Call</span>}
                                            </div>
                                        )
                                    })
                                )
                            )}

                            <div onClick={() => setIsMembersExpanded(!isMembersExpanded)} style={{ padding: '10px', backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid #222d34', marginTop: '10px', userSelect: 'none' }}>
                                <span style={{ color: '#8696a0', fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold' }}>Members ({displayMembers.length})</span>
                                <span style={{ color: '#8696a0', fontSize: '10px' }}>{isMembersExpanded ? '▼' : '▶'}</span>
                            </div>
                            {isMembersExpanded && (
                                displayMembers.length === 0 ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#8696a0', fontSize: '14px' }}>No members found.</div>
                                ) : (
                                    displayMembers.map(c => (
                                        <div key={c.email} onClick={() => setSelectedContact(c.email)} style={{ padding: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottom: '1px solid #222d34', backgroundColor: selectedContact === c.email ? '#2a3942' : 'transparent', transition: 'background 0.2s' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#00a884', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '15px', color: '#111', fontWeight: 'bold', flexShrink: 0 }}>
                                                {c.name ? c.name.charAt(0).toUpperCase() : c.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
                                                <span style={{ fontSize: '16px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{getMemberDisplayName(c)}</span>
                                                <span style={{ fontSize: '11px', color: '#2a3942', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>••••••</span>
                                            </div>
                                            {Object.keys(remoteStreams).includes(c.email) && <span style={{ marginLeft: '10px', fontSize: '12px', color: '#00a884' }}>📞 In Call</span>}
                                        </div>
                                    ))
                                )
                            )}

                            <div onClick={() => setIsContactsExpanded(!isContactsExpanded)} style={{ padding: '10px', backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginTop: '10px', borderBottom: '1px solid #222d34', userSelect: 'none' }}>
                                <span style={{ color: '#8696a0', fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold' }}>Contacts ({displayLocalContacts.length})</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button onClick={(e) => { e.stopPropagation(); handleImportContacts(); }} disabled={isImporting} style={{ backgroundColor: isImporting ? '#1a2a33' : '#2a3942', color: isImporting ? '#666' : '#00a884', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: isImporting ? 'not-allowed' : 'pointer', fontSize: '11px', opacity: isImporting ? 0.6 : 1 }}>
                                        {isImporting ? '⏳ Importing...' : '+ Add'}
                                    </button>
                                    <span style={{ color: '#8696a0', fontSize: '10px' }}>{isContactsExpanded ? '▼' : '▶'}</span>
                                </div>
                            </div>
                            {isContactsExpanded && (
                                displayLocalContacts.length === 0 ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#8696a0', fontSize: '14px' }}>No contacts added yet.</div>
                                ) : (
                                    displayLocalContacts.map(c => (
                                        <div key={c.email} onClick={() => setSelectedContact(c.email)} style={{ padding: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottom: '1px solid #222d34', backgroundColor: selectedContact === c.email ? '#2a3942' : 'transparent', transition: 'background 0.2s' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#64748b', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '15px', color: '#fff', fontWeight: 'bold', flexShrink: 0 }}>
                                                {c.name ? c.name.charAt(0).toUpperCase() : c.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
                                                <span style={{ fontSize: '16px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{c.name || c.email.split('@')[0]}</span>
                                                <span style={{ fontSize: '12px', color: '#8696a0', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{c.email}</span>
                                            </div>
                                            <button onClick={(e) => handleRemoveContact(e, c.email)} style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', fontSize: '14px', padding: '5px' }}>❌</button>
                                        </div>
                                    ))
                                )
                            )}
                        </div>
                    </div>
                )}

                {showChat && (
                    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0b141a', position: 'relative', width: isMobile ? '100%' : 'auto', height: '100%', overflow: 'hidden' }}>
                        {selectedContact ? (
                            <>
                                <div style={{ padding: '10px 20px', backgroundColor: '#202c33', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', zIndex: 10, flexShrink: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        {isMobile && <button onClick={() => setSelectedContact(null)} style={{ background: 'none', border: 'none', color: '#00a884', fontSize: '20px', marginRight: '15px', cursor: 'pointer', padding: 0 }}>🔙</button>}
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#00a884', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '15px', color: '#111', fontWeight: 'bold' }}>
                                            {activeContactName ? activeContactName.charAt(0).toUpperCase() : selectedContact.charAt(0).toUpperCase()}
                                        </div>
                                        <b>{activeContactName}</b>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                        {!inVoiceCall ? (
                                            <button onClick={() => startCall(selectedContact)} style={{ backgroundColor: 'transparent', border: '1px solid #00a884', color: '#00a884', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>📹 Video Call</button>
                                        ) : (
                                            <>
                                                {!isSelectedContactInCall && <button onClick={() => startCall(selectedContact)} style={{ backgroundColor: '#00a884', color: '#111', border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>➕ Add</button>}
                                                <button onClick={toggleScreenShare} style={{ backgroundColor: isScreenSharing ? '#334155' : 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>
                                                    {isScreenSharing ? '⏹️ Stop Share' : '🖥️ Share'}
                                                </button>
                                                <button onClick={() => endVoiceCall(true)} style={{ backgroundColor: '#ef4444', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>🔴 End Call</button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {inVoiceCall && (
                                    <div style={{ height: '45vh', backgroundColor: '#000', display: 'grid', gridTemplateColumns: `repeat(${Object.keys(remoteStreams).length + 1}, 1fr)`, gap: '10px', padding: '10px', borderBottom: '1px solid #222d34', flexShrink: 0 }}>
                                        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#111', borderRadius: '8px', overflow: 'hidden' }}>
                                            <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            <span style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '4px', fontSize: '13px' }}>
                                                {isScreenSharing ? "You (Screen)" : "You"}
                                            </span>
                                        </div>
                                        {Object.entries(remoteStreams).map(([email, stream]) => (
                                            <RemoteVideo key={email} stream={stream} email={email} allKnownUsers={allKnownUsers} />
                                        ))}
                                    </div>
                                )}

                                <div ref={chatContainerRef} style={{ flexGrow: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', backgroundImage: 'url(https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png)', backgroundSize: 'contain', WebkitOverflowScrolling: 'touch' }}>
                                    {chatMessages.map((m, i) => {
                                        const isMine = m.sender_email === userEmail;
                                        return (
                                            <div key={m.id || i} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', backgroundColor: isMine ? '#005c4b' : '#202c33', padding: '8px 12px', borderRadius: '8px', maxWidth: '65%', fontSize: '14.5px', boxShadow: '0 1px 0.5px rgba(11,20,26,.13)', wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                                                <div style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>{m.text}</div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <form onSubmit={sendMessage} style={{ padding: '15px', paddingBottom: 'calc(15px + env(safe-area-inset-bottom, 0px))', backgroundColor: '#202c33', display: 'flex', alignItems: 'center', zIndex: 10, flexShrink: 0 }}>
                                    <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message" rows={1} style={{ flexGrow: 1, padding: '12px', backgroundColor: '#2a3942', border: 'none', borderRadius: '8px', color: 'white', outline: 'none', fontSize: '15px', resize: 'none', fontFamily: 'Segoe UI, sans-serif', minHeight: '44px', maxHeight: '120px', overflowY: 'auto' }} />
                                    <button type="submit" disabled={!chatInput.trim()} style={{ marginLeft: '10px', backgroundColor: chatInput.trim() ? '#00a884' : '#333', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: chatInput.trim() ? 'pointer' : 'default', flexShrink: 0 }}>➢</button>
                                </form>
                            </>
                        ) : (
                            <div style={{ display: 'flex', flexGrow: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: '#8696a0', padding: '20px', textAlign: 'center' }}>
                                <h2>TotalRecall</h2>
                                <p>Select a member or contact from the sidebar to start messaging.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div style={{ backgroundColor: '#0b141a', borderTop: '1px solid #1a2a33', padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', gap: '8px', color: '#8696a0', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span>© NoirSoft Creation 2026</span>
                    <span style={{ color: '#2a3942' }}>|</span>
                    <span>👥 Members: <strong style={{ color: '#e9edef' }}>{displayMembers.length}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '10px', color: '#2a3942' }}>{new Date().getFullYear()} • v1.0.0</span>
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
    const [showConfirmation, setShowConfirmation] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
        return () => subscription.unsubscribe();
    }, []);

    const handleAuth = async (e, type) => {
        e.preventDefault();
        if (!email || !password) return alert("Please fill in both fields.");

        setLoading(true);
        try {
            if (type === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
                if (error) throw error;

                if (data?.user) {
                    await supabase.from('profiles').upsert([{ email: email, name: email.split('@')[0] }]);
                }

                if (data?.user && !data?.session) {
                    try {
                        await supabase.functions.invoke('confirm-email', {
                            body: { to: email, name: email.split('@')[0], confirmLink: `${window.location.origin}/verify` }
                        });
                    } catch (invokeErr) {
                        console.error("Error sending confirmation email:", invokeErr);
                    }
                    setShowConfirmation(true);
                    setEmail('');
                    setPassword('');
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
            <div style={{ backgroundColor: '#202c33', padding: '40px', borderRadius: '8px', width: '350px', maxWidth: '90%', textAlign: 'center', boxShadow: '0 17px 50px 0 rgba(11,20,26,.19)' }}>
                <h2 style={{ color: '#00a884', marginBottom: '30px' }}>TotalRecall</h2>
                {showConfirmation ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
                        <h3 style={{ margin: '0 0 12px 0', color: 'white' }}>Confirm Your Email</h3>
                        <p style={{ color: '#8696a0', lineHeight: '1.5', marginBottom: '25px', fontSize: '14px' }}>We've sent a confirmation link to your email address.</p>
                        <button onClick={() => setShowConfirmation(false)} style={{ width: '100%', padding: '12px', backgroundColor: '#00a884', color: '#111', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Back to Login</button>
                    </div>
                ) : (
                    <form onSubmit={(e) => e.preventDefault()}>
                        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '4px', border: 'none', backgroundColor: '#2a3942', color: 'white', boxSizing: 'border-box' }} />
                        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '4px', border: 'none', backgroundColor: '#2a3942', color: 'white', boxSizing: 'border-box' }} />
                        <button type="button" onClick={(e) => handleAuth(e, 'login')} disabled={loading} style={{ width: '100%', padding: '12px', backgroundColor: '#00a884', color: '#111', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginBottom: '10px' }}>{loading ? 'Processing...' : 'Log In'}</button>
                        <button type="button" onClick={(e) => handleAuth(e, 'signup')} disabled={loading} style={{ width: '100%', padding: '12px', backgroundColor: 'transparent', color: '#00a884', border: '1px solid #00a884', borderRadius: '4px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>{loading ? 'Processing...' : 'Sign Up'}</button>
                    </form>
                )}
            </div>
        </div>
    );
}