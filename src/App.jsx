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
            if (!AudioContext) {
                console.error("Web Audio not supported");
                return;
            }

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
        console.log("🔔 Starting bell ring...");
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
                console.log("⏰ Ring timeout reached!");
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
        console.log("🛑 Stopping bell ring...");
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
function RemoteVideo({ stream, email, savedContacts }) {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    const contactName = savedContacts.find(c => c.email === email)?.name || email.split('@')[0];

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#111', borderRadius: '8px', overflow: 'hidden' }}>
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            <span style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', color: '#fff' }}>
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
    const [savedContacts, setSavedContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');

    const selectedContactRef = useRef(selectedContact);
    const channelRef = useRef(null);
    const presenceKeyRef = useRef(null);

    const [inVoiceCall, setInVoiceCall] = useState(false);
    const [incomingCall, setIncomingCall] = useState(null);
    const incomingCallRef = useRef(null);
    const [isCallingOut, setIsCallingOut] = useState(false);

    const [localMediaStream, setLocalMediaStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});

    const peersRef = useRef({});
    const iceCandidateQueues = useRef({});

    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const screenStreamRef = useRef(null);
    const localStreamRef = useRef(null);
    const isScreenSharingRef = useRef(false);

    const chatContainerRef = useRef(null);
    const localVideoRef = useRef(null);

    // Responsive Mobile State
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            }
        ]
    };

    const autoAcceptOfferRef = useRef(null);
    const initiateCallRef = useRef(null);

    const ringerActiveRef = useRef(false);

    useEffect(() => {
        incomingCallRef.current = incomingCall;
    }, [incomingCall]);

    useEffect(() => {
        const shouldRing = !!incomingCall || isCallingOut;

        if (shouldRing && !ringerActiveRef.current) {
            console.log("🔔 Starting ringer for:", incomingCall ? 'incoming' : 'outgoing');
            ringerActiveRef.current = true;

            const timeoutAction = () => {
                console.log("⏰ Ring timeout reached!");
                ringerActiveRef.current = false;
                if (incomingCallRef.current) {
                    const callToDecline = incomingCallRef.current;
                    if (callToDecline && channelRef.current) {
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

            const ringType = incomingCall ? 'incoming' : 'outgoing';
            ringer.start(ringType, timeoutAction);
        } else if (!shouldRing && ringerActiveRef.current) {
            console.log("🔇 Stopping ringer (call state changed)");
            ringerActiveRef.current = false;
            ringer.stop();
        }

        return () => {
            if (ringerActiveRef.current) {
                console.log("🧹 Cleanup: Stopping ringer");
                ringerActiveRef.current = false;
                ringer.stop();
            }
        };
    }, [incomingCall, isCallingOut]);

    useEffect(() => {
        const stored = localStorage.getItem('totalRecallContacts');
        if (stored) {
            try { setSavedContacts(JSON.parse(stored)); }
            catch (e) { console.error(e); }
        }
    }, []);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatMessages]);

    useEffect(() => {
        if (localVideoRef.current && localMediaStream) {
            localVideoRef.current.srcObject = localMediaStream;
        }
    }, [localMediaStream, inVoiceCall]);

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

    useEffect(() => {
        if (!userEmail) return;

        const presenceKey = `user_${userEmail}`;
        presenceKeyRef.current = presenceKey;

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

        channel.on('broadcast', { event: 'webrtc-offer' }, async ({ payload }) => {
            if (payload.targetEmail === userEmail) {
                console.log("📞 Incoming call from:", payload.sender);
                if (payload.isAutoJoin && localStreamRef.current && autoAcceptOfferRef.current) {
                    autoAcceptOfferRef.current(payload);
                } else {
                    setIncomingCall(payload);
                }
            }
        });

        channel.on('broadcast', { event: 'webrtc-answer' }, async ({ payload }) => {
            if (payload.targetEmail === userEmail) {
                console.log("✅ Call answered");
                setIsCallingOut(false);
                const pc = peersRef.current[payload.sender];
                if (pc) {
                    try {
                        await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
                        const queue = iceCandidateQueues.current[payload.sender] || [];
                        while (queue.length > 0) {
                            const candidate = queue.shift();
                            try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
                            catch (err) { console.error("ICE error:", err); }
                        }
                    } catch (err) { console.error("Failed handling answer:", err); }
                }
            }
        });

        channel.on('broadcast', { event: 'webrtc-ice' }, async ({ payload }) => {
            if (payload.targetEmail === userEmail) {
                const pc = peersRef.current[payload.sender];
                if (pc && pc.remoteDescription) {
                    try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); }
                    catch (err) { console.error("ICE error:", err); }
                } else {
                    if (!iceCandidateQueues.current[payload.sender]) iceCandidateQueues.current[payload.sender] = [];
                    iceCandidateQueues.current[payload.sender].push(payload.candidate);
                }
            }
        });

        channel.on('broadcast', { event: 'webrtc-decline' }, ({ payload }) => {
            if (payload.targetEmail === userEmail) {
                console.log("❌ Call declined");
                setIsCallingOut(false);
                endVoiceCall(false);
                alert(`${payload.sender.split('@')[0]} declined the call.`);
            }
        });

        channel.on('broadcast', { event: 'webrtc-end' }, ({ payload }) => {
            if (payload.targetEmail === userEmail) {
                console.log("🔴 Call ended");
                setIncomingCall(prev => {
                    if (prev && prev.sender === payload.sender) return null;
                    return prev;
                });
                handlePeerDisconnect(payload.sender);
            }
        });

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                try { await channel.track({ email: userEmail, online: true, timestamp: new Date().toISOString() }); }
                catch (error) { console.error('Error tracking presence:', error); }
            }
        });

        return () => {
            if (channelRef.current) {
                try {
                    channelRef.current.untrack();
                    supabase.removeChannel(channelRef.current);
                } catch (error) { console.error('Error cleanup:', error); }
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

    const handleImportContacts = async () => {
        const supported = ('contacts' in navigator && 'ContactsManager' in window);

        const processNewContacts = async (newContacts) => {
            const existingEmails = new Set(savedContacts.map(c => c.email));
            const trulyNewContacts = newContacts.filter(c => !existingEmails.has(c.email));

            if (trulyNewContacts.length > 0) {
                setSavedContacts(prev => {
                    const merged = [...prev, ...trulyNewContacts];
                    localStorage.setItem('totalRecallContacts', JSON.stringify(merged));
                    return merged;
                });

                for (const contact of trulyNewContacts) {
                    try {
                        const { data, error } = await supabase.functions.invoke('send-email', {
                            body: {
                                to: contact.email,
                                subject: "Let's connect on TotalRecall!",
                                html: `<p>Hi ${contact.name},</p><p>I just added you to my contacts on TotalRecall. Join me here to start chatting and video calling: <a href="${window.location.origin}">${window.location.origin}</a></p><p>Best,<br/>${displayName}</p>`
                            }
                        });

                        if (error) {
                            console.error(`Failed to send invite to ${contact.email}:`, error);
                        } else {
                            console.log(`Invite successfully sent to ${contact.email}`);
                        }
                    } catch (error) {
                        console.error(`Error invoking edge function for ${contact.email}:`, error);
                    }
                }
            } else {
                alert("Contact(s) already exist in your list.");
            }
        };

        if (supported) {
            try {
                const contacts = await navigator.contacts.select(['name', 'email'], { multiple: true });
                const validContacts = contacts
                    .filter(c => c.email && c.email.length > 0)
                    .map(c => ({ name: c.name?.[0] || c.email[0].split('@')[0], email: c.email[0] }));

                if (validContacts.length > 0) await processNewContacts(validContacts);
            } catch (err) { console.error("Contact selection failed", err); }
        } else {
            const emailInput = prompt("Enter an email address to add a contact manually:");
            if (emailInput && emailInput.trim()) {
                const targetEmail = emailInput.trim();
                await processNewContacts([{ name: targetEmail.split('@')[0], email: targetEmail }]);
            }
        }
    };

    const handleRemoveContact = (e, emailToRemove) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to remove this contact?')) {
            setSavedContacts(prev => {
                const updatedContacts = prev.filter(c => c.email !== emailToRemove);
                localStorage.setItem('totalRecallContacts', JSON.stringify(updatedContacts));
                return updatedContacts;
            });
            if (selectedContact === emailToRemove) {
                setSelectedContact(null);
            }
        }
    };

    const getMediaStream = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Your browser does not support WebRTC or you are not on a secure connection.");
        }
        try {
            return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch (err) {
            console.warn("Could not get both video/audio. Attempting video only.");
            try {
                return await navigator.mediaDevices.getUserMedia({ video: true });
            } catch (err2) {
                return await navigator.mediaDevices.getUserMedia({ audio: true });
            }
        }
    };

    const createPeerConnection = (targetEmail) => {
        const pc = new RTCPeerConnection(rtcConfig);
        peersRef.current[targetEmail] = pc;
        iceCandidateQueues.current[targetEmail] = [];

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                if (track.kind === 'video' && isScreenSharingRef.current && screenStreamRef.current) {
                    pc.addTrack(screenStreamRef.current.getVideoTracks()[0], localStreamRef.current);
                } else {
                    pc.addTrack(track, localStreamRef.current);
                }
            });
        }

        pc.onicecandidate = (e) => {
            if (e.candidate && channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast', event: 'webrtc-ice',
                    payload: { targetEmail, candidate: e.candidate, sender: userEmail }
                });
            }
        };

        pc.ontrack = (e) => {
            setRemoteStreams(prev => {
                if (prev[targetEmail]) {
                    prev[targetEmail].addTrack(e.track);
                    return { ...prev };
                } else {
                    const stream = e.streams[0] || new MediaStream([e.track]);
                    return { ...prev, [targetEmail]: stream };
                }
            });
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                handlePeerDisconnect(targetEmail);
            }
        };

        return pc;
    };

    const handlePeerDisconnect = (email) => {
        if (peersRef.current[email]) {
            peersRef.current[email].close();
            delete peersRef.current[email];
        }
        setRemoteStreams(prev => {
            const newStreams = { ...prev };
            delete newStreams[email];
            return newStreams;
        });
        delete iceCandidateQueues.current[email];

        if (Object.keys(peersRef.current).length === 0) {
            endVoiceCall(false);
        }
    };

    const endVoiceCall = (broadcast = true) => {
        console.log("🔴 Ending call");

        if (ringerActiveRef.current) {
            console.log("🔇 Stopping ringer from endVoiceCall");
            ringerActiveRef.current = false;
            ringer.stop();
        }

        setIsCallingOut(false);
        setIncomingCall(null);

        Object.keys(peersRef.current).forEach(email => {
            if (peersRef.current[email]) peersRef.current[email].close();
            if (broadcast && channelRef.current) {
                channelRef.current.send({ type: 'broadcast', event: 'webrtc-end', payload: { targetEmail: email, sender: userEmail } });
            }
        });

        peersRef.current = {};

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(track => track.stop());
            screenStreamRef.current = null;
        }

        setIsScreenSharing(false);
        setRemoteStreams({});
        setLocalMediaStream(null);
        setInVoiceCall(false);
        iceCandidateQueues.current = {};
    };

    useEffect(() => {
        initiateCallRef.current = async (targetEmail, isAutoJoin = false, peersToShare = []) => {
            if (!channelRef.current) return;
            try {
                if (!localStreamRef.current) {
                    const stream = await getMediaStream();
                    localStreamRef.current = stream;
                    setLocalMediaStream(stream);
                }

                const pc = createPeerConnection(targetEmail);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                channelRef.current.send({
                    type: 'broadcast', event: 'webrtc-offer',
                    payload: { targetEmail, offer, sender: userEmail, existingPeers: peersToShare, isAutoJoin }
                });
                setInVoiceCall(true);

            } catch (err) {
                if (!isAutoJoin) alert("Call setup failed: " + err.message);
                setIsCallingOut(false);
                console.error(err);
            }
        };
    }, [userEmail]);

    useEffect(() => {
        autoAcceptOfferRef.current = async (payload) => {
            if (!channelRef.current || !localStreamRef.current) return;
            try {
                const senderEmail = payload.sender;
                const pc = createPeerConnection(senderEmail);

                await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                channelRef.current.send({
                    type: 'broadcast', event: 'webrtc-answer',
                    payload: { targetEmail: senderEmail, answer, sender: userEmail }
                });

                const queue = iceCandidateQueues.current[senderEmail] || [];
                while (queue.length > 0) {
                    const candidate = queue.shift();
                    try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
                    catch (err) { console.error("ICE error:", err); }
                }
            } catch (err) {
                console.error("Auto accept failed", err);
            }
        };
    }, [userEmail]);

    const acceptCall = async () => {
        console.log("✅ Accepting call");
        const currentIncomingCall = incomingCall;

        if (ringerActiveRef.current) {
            console.log("🔇 Stopping ringer from acceptCall");
            ringerActiveRef.current = false;
            ringer.stop();
        }

        setIncomingCall(null);

        if (!currentIncomingCall || !channelRef.current) return;

        try {
            if (!localStreamRef.current) {
                const stream = await getMediaStream();
                localStreamRef.current = stream;
                setLocalMediaStream(stream);
            }

            const senderEmail = currentIncomingCall.sender;
            const pc = createPeerConnection(senderEmail);

            await pc.setRemoteDescription(new RTCSessionDescription(currentIncomingCall.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            channelRef.current.send({
                type: 'broadcast', event: 'webrtc-answer',
                payload: { targetEmail: senderEmail, answer, sender: userEmail }
            });

            const queue = iceCandidateQueues.current[senderEmail] || [];
            while (queue.length > 0) {
                const candidate = queue.shift();
                try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
                catch (err) { console.error("ICE error:", err); }
            }

            setInVoiceCall(true);
            setSelectedContact(senderEmail);

            if (currentIncomingCall.existingPeers && currentIncomingCall.existingPeers.length > 0) {
                currentIncomingCall.existingPeers.forEach(peerEmail => {
                    if (peerEmail !== userEmail && initiateCallRef.current) {
                        setTimeout(() => {
                            initiateCallRef.current(peerEmail, true, []);
                        }, 500);
                    }
                });
            }

        } catch (e) {
            console.error("Setup Error:", e);
            alert("Could not establish call connection: " + e.message);
            if (Object.keys(peersRef.current).length === 0) endVoiceCall(false);
        }
    };

    const handleDeclineCall = () => {
        console.log("❌ Declining call");

        if (ringerActiveRef.current) {
            console.log("🔇 Stopping ringer from handleDeclineCall");
            ringerActiveRef.current = false;
            ringer.stop();
        }

        const callToDecline = incomingCallRef.current;
        if (callToDecline && channelRef.current) {
            channelRef.current.send({
                type: 'broadcast', event: 'webrtc-decline',
                payload: { targetEmail: callToDecline.sender, sender: userEmail }
            });
        }
        setIncomingCall(null);
    };

    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            stopScreenShare();
        } else {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                screenStreamRef.current = screenStream;
                const screenTrack = screenStream.getVideoTracks()[0];

                screenTrack.onended = () => stopScreenShare();

                Object.values(peersRef.current).forEach(pc => {
                    const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (videoSender) videoSender.replaceTrack(screenTrack);
                });

                const localAudioTrack = localStreamRef.current?.getAudioTracks()[0];
                const displayStream = new MediaStream([screenTrack]);
                if (localAudioTrack) displayStream.addTrack(localAudioTrack);

                setLocalMediaStream(displayStream);
                setIsScreenSharing(true);
            } catch (err) {
                console.error("Error sharing screen:", err);
            }
        }
    };

    const stopScreenShare = async () => {
        if (!isScreenSharing) return;

        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(track => track.stop());
            screenStreamRef.current = null;
        }

        if (localStreamRef.current) {
            const webcamTrack = localStreamRef.current.getVideoTracks()[0];

            Object.values(peersRef.current).forEach(pc => {
                const videoSender = pc.getSenders().find(s => s.track?.kind === 'video' || s.track === null);
                if (videoSender && webcamTrack) {
                    videoSender.replaceTrack(webcamTrack);
                }
            });

            setLocalMediaStream(localStreamRef.current);
        }

        setIsScreenSharing(false);
    };

    const refreshPresence = async () => {
        if (channelRef.current) {
            try { await channelRef.current.track({ email: userEmail, online: true, timestamp: new Date().toISOString() }); }
            catch (error) { console.error('Error refreshing presence:', error); }
        }
    };

    const handleStartCall = () => {
        console.log("📞 Starting call to:", selectedContact);
        if (ringerActiveRef.current) {
            console.log("🔇 Stopping ringer from handleStartCall");
            ringerActiveRef.current = false;
            ringer.stop();
        }
        setIsCallingOut(true);
        initiateCallRef.current(selectedContact, false, []);
    };

    const handleAddToCall = () => {
        const currentPeers = Object.keys(peersRef.current);
        initiateCallRef.current(selectedContact, false, currentPeers);
    };

    const isSelectedContactInCall = Object.keys(remoteStreams).includes(selectedContact);

    // Responsive toggle conditions
    const showSidebar = !isMobile || !selectedContact;
    const showChat = !isMobile || !!selectedContact;

    // Handle Enter key for new lines
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(e);
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', backgroundColor: '#111b21', color: '#e9edef', fontFamily: 'Segoe UI, sans-serif', overflow: 'hidden' }}>

            {/* INCOMING CALL MODAL */}
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

            {/* SIDEBAR - CONTACTS */}
            {showSidebar && (
                <div style={{
                    width: isMobile ? '100%' : '30%',
                    minWidth: isMobile ? '100%' : '250px',
                    borderRight: isMobile ? 'none' : '1px solid #222d34',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#111b21',
                    height: '100%',
                    overflow: 'hidden'
                }}>
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

                    <div style={{ padding: '10px', backgroundColor: '#111b21', borderBottom: '1px solid #222d34', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ color: '#8696a0', fontSize: '14px', fontWeight: 'bold' }}>Contacts</span>
                        <button onClick={handleImportContacts} style={{ backgroundColor: '#2a3942', color: '#00a884', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                            + Add Contact
                        </button>
                    </div>

                    <div style={{ flexGrow: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        {savedContacts.length > 0 && (
                            <div style={{ padding: '10px', backgroundColor: '#202c33', color: '#8696a0', fontSize: '12px', textTransform: 'uppercase' }}>
                                Saved Contacts
                            </div>
                        )}
                        {savedContacts.map(c => (
                            <div
                                key={c.email}
                                onClick={() => setSelectedContact(c.email)}
                                style={{ padding: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottom: '1px solid #222d34', backgroundColor: selectedContact === c.email ? '#2a3942' : 'transparent', transition: 'background 0.2s' }}
                            >
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#00a884', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '15px', color: '#111', fontWeight: 'bold', flexShrink: 0 }}>
                                    {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
                                    <span style={{ fontSize: '16px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{c.name}</span>
                                    <span style={{ fontSize: '12px', color: '#8696a0', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{c.email}</span>
                                </div>
                                {Object.keys(remoteStreams).includes(c.email) && (
                                    <span style={{ marginLeft: '10px', fontSize: '12px', color: '#00a884' }}>📞 In Call</span>
                                )}
                                <button
                                    onClick={(e) => handleRemoveContact(e, c.email)}
                                    style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', fontSize: '14px', padding: '5px' }}
                                    title="Remove contact"
                                >
                                    ❌
                                </button>
                            </div>
                        ))}

                        <div style={{ padding: '10px', backgroundColor: '#202c33', color: '#8696a0', fontSize: '12px', textTransform: 'uppercase' }}>
                            Online Now ({onlineUsers.length})
                        </div>
                        {onlineUsers.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#8696a0', fontSize: '14px' }}>No users online.</div>
                        ) : (
                            onlineUsers.map(u => (
                                <div
                                    key={u.email}
                                    onClick={() => setSelectedContact(u.email)}
                                    style={{ padding: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottom: '1px solid #222d34', backgroundColor: selectedContact === u.email ? '#2a3942' : 'transparent', transition: 'background 0.2s' }}
                                >
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#38bdf8', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '15px', color: '#111', fontWeight: 'bold' }}>
                                        {u.email.charAt(0).toUpperCase()}
                                    </div>
                                    <span style={{ fontSize: '16px' }}>{u.email.split('@')[0]}</span>
                                    {Object.keys(remoteStreams).includes(u.email) && (
                                        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#00a884' }}>📞 In Call</span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* CHAT AREA */}
            {showChat && (
                <div style={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#0b141a',
                    position: 'relative',
                    width: isMobile ? '100%' : 'auto',
                    height: '100%',
                    overflow: 'hidden'
                }}>
                    {selectedContact ? (
                        <>
                            <div style={{ padding: '10px 20px', backgroundColor: '#202c33', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', zIndex: 10, flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    {isMobile && (
                                        <button
                                            onClick={() => setSelectedContact(null)}
                                            style={{ background: 'none', border: 'none', color: '#00a884', fontSize: '20px', marginRight: '15px', cursor: 'pointer', padding: 0 }}
                                        >
                                            🔙
                                        </button>
                                    )}
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#00a884', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '15px', color: '#111', fontWeight: 'bold' }}>
                                        {selectedContact.charAt(0).toUpperCase()}
                                    </div>
                                    <b>{savedContacts.find(c => c.email === selectedContact)?.name || selectedContact.split('@')[0]}</b>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                    {!inVoiceCall ? (
                                        <button onClick={handleStartCall} style={{ backgroundColor: 'transparent', border: '1px solid #00a884', color: '#00a884', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>📹 Video Call</button>
                                    ) : (
                                        <>
                                            {!isSelectedContactInCall && (
                                                <button onClick={handleAddToCall} style={{ backgroundColor: '#00a884', color: '#111', border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>
                                                    ➕ Add to Call
                                                </button>
                                            )}

                                            <button
                                                onClick={toggleScreenShare}
                                                style={{ backgroundColor: isScreenSharing ? '#334155' : 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
                                            >
                                                {isScreenSharing ? '⏹️ Stop Share' : '🖥️ Share Screen'}
                                            </button>

                                            <button onClick={() => endVoiceCall(true)} style={{ backgroundColor: '#ef4444', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>🔴 End Call</button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* VIDEO GRID */}
                            {inVoiceCall && (
                                <div style={{ height: '45vh', backgroundColor: '#000', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '10px', padding: '10px', borderBottom: '1px solid #222d34', flexShrink: 0 }}>
                                    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#111', borderRadius: '8px', overflow: 'hidden' }}>
                                        <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        <span style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '4px', fontSize: '13px' }}>
                                            {isScreenSharing ? "You (Screen)" : "You"}
                                        </span>
                                    </div>
                                    {Object.entries(remoteStreams).map(([email, stream]) => (
                                        <RemoteVideo key={email} stream={stream} email={email} savedContacts={savedContacts} />
                                    ))}
                                </div>
                            )}

                            <div ref={chatContainerRef} style={{
                                flexGrow: 1,
                                padding: '20px',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                backgroundImage: 'url(https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png)',
                                backgroundSize: 'contain',
                                WebkitOverflowScrolling: 'touch'
                            }}>
                                {chatMessages.map((m, i) => {
                                    const isMine = m.sender_email === userEmail;
                                    return (
                                        <div key={m.id || i} style={{
                                            alignSelf: isMine ? 'flex-end' : 'flex-start',
                                            backgroundColor: isMine ? '#005c4b' : '#202c33',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            maxWidth: '65%',
                                            fontSize: '14.5px',
                                            boxShadow: '0 1px 0.5px rgba(11,20,26,.13)',
                                            wordWrap: 'break-word',
                                            whiteSpace: 'pre-wrap'
                                        }}>
                                            <div style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>{m.text}</div>
                                        </div>
                                    );
                                })}
                            </div>

                            <form onSubmit={sendMessage} style={{ padding: '15px', backgroundColor: '#202c33', display: 'flex', alignItems: 'center', zIndex: 10, flexShrink: 0 }}>
                                <textarea
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type a message"
                                    rows={1}
                                    style={{
                                        flexGrow: 1,
                                        padding: '12px',
                                        backgroundColor: '#2a3942',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: 'white',
                                        outline: 'none',
                                        fontSize: '15px',
                                        resize: 'none',
                                        fontFamily: 'Segoe UI, sans-serif',
                                        minHeight: '44px',
                                        maxHeight: '120px',
                                        overflowY: 'auto'
                                    }}
                                />
                                <button type="submit" disabled={!chatInput.trim()} style={{ marginLeft: '10px', backgroundColor: chatInput.trim() ? '#00a884' : '#333', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: chatInput.trim() ? 'pointer' : 'default', flexShrink: 0 }}>
                                    ➢
                                </button>
                            </form>
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexGrow: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: '#8696a0', padding: '20px', textAlign: 'center' }}>
                            <h2>TotalRecall</h2>
                            <p>Select a contact from the sidebar to start messaging.</p>
                        </div>
                    )}
                </div>
            )}
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
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: window.location.origin
                    }
                });

                if (error) throw error;

                if (data?.user && !data?.session) {
                    try {
                        const { error: edgeError } = await supabase.functions.invoke('confirm-email', {
                            body: {
                                to: email,
                                name: email.split('@')[0],
                                confirmLink: `${window.location.origin}/verify`
                            }
                        });

                        if (edgeError) {
                            console.error("Edge function failed to send email:", edgeError);
                        } else {
                            console.log("Custom confirm-email Edge Function invoked successfully.");
                        }
                    } catch (invokeErr) {
                        console.error("Failed to connect to the edge function:", invokeErr);
                    }

                    setShowConfirmation(true);
                    setEmail('');
                    setPassword('');
                }
            }
        } catch (err) { alert(err.message); }
        finally { setLoading(false); }
    };

    if (user) return <ChatApp user={user} onLogout={() => supabase.auth.signOut()} />;

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#111b21', color: 'white', fontFamily: 'Segoe UI' }}>
            <div style={{ backgroundColor: '#202c33', padding: '40px', borderRadius: '8px', width: '350px', maxWidth: '90%', textAlign: 'center', boxShadow: '0 17px 50px 0 rgba(11,20,26,.19)' }}>
                <h2 style={{ color: '#00a884', marginBottom: '30px' }}>TotalRecall</h2>
                {showConfirmation ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
                        <h3 style={{ margin: '0 0 12px 0', color: 'white' }}>Confirm Your Email</h3>
                        <p style={{ color: '#8696a0', lineHeight: '1.5', marginBottom: '25px', fontSize: '14px' }}>
                            We've sent a confirmation link to your email address.
                        </p>
                        <button onClick={() => setShowConfirmation(false)} style={{ width: '100%', padding: '12px', backgroundColor: '#00a884', color: '#111', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                            Back to Login
                        </button>
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