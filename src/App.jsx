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
function RemoteVideo({ stream, email, allKnownUsers }) {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            // BUG FIX: Prevent iOS Safari black screens by avoiding redundant re-assignments
            if (videoRef.current.srcObject !== stream) {
                videoRef.current.srcObject = stream;
            }
        }
    }, [stream]);

    const safeEmail = email?.trim().toLowerCase();
    const contactName = allKnownUsers.find(c => c.email?.trim().toLowerCase() === safeEmail)?.name || email.split('@')[0];

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
    const presenceKeyRef = useRef(null);

    const [inVoiceCall, setInVoiceCall] = useState(false);
    const [incomingCall, setIncomingCall] = useState(null);
    const incomingCallRef = useRef(null);
    const [isCallingOut, setIsCallingOut] = useState(false);

    const [localMediaStream, setLocalMediaStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});

    const peersRef = useRef({});
    const iceCandidateQueues = useRef({});
    // BUG FIX: Batching state for outgoing ICE Candidates to bypass Supabase limits
    const iceBatchersRef = useRef({});

    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const screenStreamRef = useRef(null);
    const localStreamRef = useRef(null);
    const isScreenSharingRef = useRef(false);

    const chatContainerRef = useRef(null);
    const localVideoRef = useRef(null);

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [isImporting, setIsImporting] = useState(false);

    const [isVonageCalling, setIsVonageCalling] = useState(false);
    const [vonageStatus, setVonageStatus] = useState('');

    useEffect(() => {
        selectedContactRef.current = selectedContact;
    }, [selectedContact]);

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
            { urls: 'stun:global.stun.twilio.com:3478' },
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
            ringerActiveRef.current = true;
            const timeoutAction = () => {
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
            ringerActiveRef.current = false;
            ringer.stop();
        }

        return () => {
            if (ringerActiveRef.current) {
                ringerActiveRef.current = false;
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
                } catch (e) { console.error(e); }
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
            if (localVideoRef.current.srcObject !== localMediaStream) {
                localVideoRef.current.srcObject = localMediaStream;
            }
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
                if (payload.isAutoJoin && localStreamRef.current && autoAcceptOfferRef.current) {
                    autoAcceptOfferRef.current(payload);
                } else {
                    setIncomingCall(payload);
                }
            }
        });

        channel.on('broadcast', { event: 'webrtc-answer' }, async ({ payload }) => {
            if (payload.targetEmail === userEmail) {
                setIsCallingOut(false);
                const pc = peersRef.current[payload.sender];
                if (pc) {
                    try {
                        await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
                        const queue = iceCandidateQueues.current[payload.sender] || [];
                        while (queue.length > 0) {
                            const candidate = queue.shift();
                            try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
                            catch (err) { }
                        }
                    } catch (err) { console.error("Failed handling answer:", err); }
                }
            }
        });

        // BUG FIX: Handle batched candidates to bypass Supabase real-time rate limits
        channel.on('broadcast', { event: 'webrtc-ice-batch' }, ({ payload }) => {
            if (payload.targetEmail === userEmail) {
                const pc = peersRef.current[payload.sender];
                const queue = iceCandidateQueues.current[payload.sender] || [];

                payload.candidates.forEach(async (candidate) => {
                    if (pc && pc.remoteDescription) {
                        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
                        catch (err) { }
                    } else {
                        queue.push(candidate);
                    }
                });
                iceCandidateQueues.current[payload.sender] = queue;
            }
        });

        // Keep standard ice listener just in case for backward compatibility
        channel.on('broadcast', { event: 'webrtc-ice' }, async ({ payload }) => {
            if (payload.targetEmail === userEmail) {
                const pc = peersRef.current[payload.sender];
                if (pc && pc.remoteDescription) {
                    try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); }
                    catch (err) { }
                } else {
                    if (!iceCandidateQueues.current[payload.sender]) iceCandidateQueues.current[payload.sender] = [];
                    iceCandidateQueues.current[payload.sender].push(payload.candidate);
                }
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
                catch (error) { }
            }
        });

        return () => {
            if (channelRef.current) {
                try {
                    channelRef.current.untrack();
                    supabase.removeChannel(channelRef.current);
                } catch (error) { }
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
                <title>Invitation to TotalRecall</title>
                <style>
                    body { font-family: -apple-system, sans-serif; background-color: #f4f6f8; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); overflow: hidden; }
                    .header { background: linear-gradient(135deg, #00a884 0%, #008f72 100%); padding: 40px 30px; text-align: center; }
                    .header h1 { color: #ffffff; font-size: 32px; font-weight: 700; margin: 0; letter-spacing: -0.5px; }
                    .header p { color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 8px 0 0 0; }
                    .content { padding: 40px 30px; color: #1e293b; }
                    .greeting { font-size: 20px; font-weight: 600; margin: 0 0 12px 0; color: #0f172a; }
                    .message { font-size: 16px; line-height: 1.7; color: #334155; margin: 0 0 24px 0; }
                    .inviter-badge { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 24px 0; }
                    .inviter-badge strong { color: #00a884; font-size: 18px; }
                    .inviter-badge .email { color: #64748b; font-size: 14px; margin-top: 4px; }
                    .cta-button { display: inline-block; background: linear-gradient(135deg, #00a884 0%, #008f72 100%); color: #ffffff !important; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: 600; font-size: 18px; margin: 8px 0 0 0; box-shadow: 0 4px 12px rgba(0, 168, 132, 0.3); transition: transform 0.2s ease, box-shadow 0.2s ease; }
                    .features { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
                    .feature-item { background-color: #f8fafc; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #e2e8f0; }
                    .feature-item .icon { font-size: 28px; display: block; margin-bottom: 8px; }
                    .feature-item .label { font-size: 14px; font-weight: 500; color: #0f172a; }
                    .divider { height: 1px; background: #e2e8f0; margin: 24px 0; }
                    .footer { text-align: center; padding: 0 30px 30px 30px; color: #94a3b8; font-size: 14px; }
                    .footer a { color: #00a884; text-decoration: none; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📱 TotalRecall</h1>
                        <p>Connect, Chat &amp; Video Call</p>
                    </div>
                    <div class="content">
                        <p class="greeting">Hello ${contactName || 'there'}! 👋</p>
                        <p class="message">
                            <strong style="color: #00a884;">${inviterName}</strong> has added you as a contact on 
                            <strong>TotalRecall</strong> and would love to connect with you!
                        </p>
                        <div class="inviter-badge">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #00a884 0%, #008f72 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 20px; flex-shrink: 0;">
                                    ${inviterName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div><strong>${inviterName}</strong></div>
                                    <div class="email">${inviterEmail}</div>
                                </div>
                            </div>
                        </div>
                        <p class="message" style="margin-top: 24px;">
                            TotalRecall is a secure messaging and video calling platform where you can stay connected with friends, family, and colleagues.
                        </p>
                        <div class="features">
                            <div class="feature-item"><span class="icon">💬</span><span class="label">Instant Messaging</span></div>
                            <div class="feature-item"><span class="icon">📹</span><span class="label">Video Calls</span></div>
                            <div class="feature-item"><span class="icon">👥</span><span class="label">Group Chats</span></div>
                            <div class="feature-item"><span class="icon">🔒</span><span class="label">Secure &amp; Private</span></div>
                        </div>
                        <div style="text-align: center;">
                            <a href="${window.location.origin}" class="cta-button">🚀 Join Now</a>
                        </div>
                        <div class="divider"></div>
                        <p style="text-align: center; color: #64748b; font-size: 15px; margin: 0;">
                            Already have an account? 
                            <a href="${window.location.origin}" style="color: #00a884; font-weight: 500; text-decoration: none;">Log in here</a>
                        </p>
                    </div>
                    <div class="footer">
                        <p style="margin: 0 0 8px 0;">© ${new Date().getFullYear()} TotalRecall. All rights reserved.</p>
                        <p style="margin: 0; font-size: 13px;">This invitation was sent by ${inviterName}. <br>If you didn't expect this email, you can safely ignore it.</p>
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
                    contactsToProcess = contacts
                        .filter(c => c.email && c.email.length > 0)
                        .map(c => ({
                            name: c.name?.[0] || c.email[0].split('@')[0],
                            email: c.email[0]
                        }));
                } catch (err) {
                    alert("Contact selection was cancelled or failed.");
                    setIsImporting(false);
                    return;
                }
            } else {
                const emailInput = prompt("Enter an email address to send an invite manually:");
                if (emailInput && emailInput.trim()) {
                    const targetEmail = emailInput.trim();
                    if (!targetEmail.includes('@') || !targetEmail.includes('.')) {
                        alert("Please enter a valid email address.");
                        setIsImporting(false);
                        return;
                    }
                    contactsToProcess = [{
                        name: targetEmail.split('@')[0],
                        email: targetEmail
                    }];
                } else {
                    setIsImporting(false);
                    return;
                }
            }

            if (contactsToProcess.length === 0) {
                alert("No valid contacts to add.");
                setIsImporting(false);
                return;
            }

            const existingLocalEmails = new Set(savedContacts.map(c => c.email?.trim().toLowerCase()));
            const contactsToAdd = [];
            let existingCount = 0;

            contactsToProcess.forEach(contact => {
                const emailLower = contact.email.trim().toLowerCase();
                const contactObj = {
                    name: contact.name || contact.email.split('@')[0],
                    email: contact.email.trim()
                };

                if (existingLocalEmails.has(emailLower)) {
                    existingCount++;
                } else {
                    contactsToAdd.push(contactObj);
                }
            });

            if (contactsToAdd.length > 0) {
                setSavedContacts(prev => {
                    const merged = [...prev, ...contactsToAdd];
                    localStorage.setItem('totalRecallContacts', JSON.stringify(merged));
                    return merged;
                });
            }

            if (contactsToProcess.length > 0) {
                let sentCount = 0;
                let failedCount = 0;

                for (const contact of contactsToProcess) {
                    try {
                        const prettyHTML = generatePrettyEmailHTML(contact.name, displayName, userEmail);
                        const { error } = await supabase.functions.invoke('send-email', {
                            body: {
                                to: contact.email,
                                subject: `📱 ${displayName} wants to connect with you on TotalRecall!`,
                                html: prettyHTML
                            }
                        });
                        if (error) failedCount++;
                        else sentCount++;
                    } catch (error) {
                        failedCount++;
                    }
                }

                let message = `✅ Added ${contactsToAdd.length} new contact(s)\n`;
                if (existingCount > 0) message += `ℹ️ ${existingCount} contact(s) were already in your list\n`;
                message += `📧 Sent ${sentCount} invitation email(s)\n`;
                if (failedCount > 0) message += `❌ Failed to send ${failedCount} email(s)`;
                alert(message);
            }
        } catch (error) {
            alert("An error occurred while importing contacts.");
        } finally {
            setIsImporting(false);
        }
    };

    const handleRemoveContact = (e, emailToRemove) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to remove this contact from your view?')) {
            setSavedContacts(prev => {
                const updatedContacts = prev.filter(c => c.email !== emailToRemove);
                localStorage.setItem('totalRecallContacts', JSON.stringify(updatedContacts));
                return updatedContacts;
            });
            if (selectedContact === emailToRemove) setSelectedContact(null);
        }
    };

    const handleVonageTestCall = async () => {
        if (isVonageCalling) return;

        try {
            setVonageStatus('🔍 Checking Vonage service...');

            const phoneNumber = prompt("Enter the phone number to call (include country code):", "34642376712");
            if (!phoneNumber || !phoneNumber.trim()) {
                setVonageStatus('❌ Call cancelled');
                setTimeout(() => setVonageStatus(''), 3000);
                return;
            }

            const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
            if (!/^\d{10,15}$/.test(cleanNumber)) {
                alert('Please enter a valid phone number with 10-15 digits (include country code)');
                setVonageStatus('❌ Invalid phone number');
                setTimeout(() => setVonageStatus(''), 3000);
                return;
            }

            setIsVonageCalling(true);
            setVonageStatus('📞 Initiating Vonage test call...');

            const fromNumber = prompt("Enter your Vonage phone number:", "447418372323");
            if (!fromNumber || !fromNumber.trim()) {
                setVonageStatus('❌ Call cancelled');
                setIsVonageCalling(false);
                setTimeout(() => setVonageStatus(''), 3000);
                return;
            }

            const cleanFromNumber = fromNumber.replace(/[\s\-\(\)]/g, '');
            if (!/^\d{10,15}$/.test(cleanFromNumber)) {
                alert('Please enter a valid Vonage phone number with 10-15 digits');
                setVonageStatus('❌ Invalid Vonage number');
                setIsVonageCalling(false);
                setTimeout(() => setVonageStatus(''), 3000);
                return;
            }

            const customText = prompt("Enter the text you want the AI to say:", "Hi, this is a test call from TotalRecall. Can you hear me clearly?") || "Hi, this is a test call from TotalRecall.";

            const vonagePayload = {
                from: { type: "phone", number: cleanFromNumber },
                to: [{ type: "phone", number: cleanNumber }],
                ncco: [{
                    action: "talk",
                    text: customText,
                    provider: "google",
                    providerOptions: { name: "en-US-Chirp3-HD-Achernar", language_code: "en-US" }
                }]
            };

            const { data, error } = await supabase.functions.invoke('vonage-call', { body: vonagePayload });

            if (error) {
                let errorMessage = `❌ Vonage call failed:\n\n${error.message || 'Unknown error'}`;
                setVonageStatus(`❌ ${error.message || 'Error'}`);
                alert(errorMessage);
                setIsVonageCalling(false);
                return;
            }

            if (data && data.error) {
                setVonageStatus(`❌ ${data.error}`);
                alert(`❌ Vonage API error:\n\n${data.error}`);
                setIsVonageCalling(false);
                return;
            }

            setVonageStatus(`✅ Call initiated! Call ID: ${data?.uuid || 'Success'}`);
            alert(`✅ Vonage call initiated successfully!\n\nTo: ${cleanNumber}\nFrom: ${cleanFromNumber}\nCall ID: ${data?.uuid || 'N/A'}`);

        } catch (error) {
            setVonageStatus(`❌ Failed: ${error.message || 'Unknown error'}`);
            alert(`❌ Vonage call failed:\n\n${error.message}`);
        } finally {
            setIsVonageCalling(false);
            setTimeout(() => {
                if (vonageStatus.includes('✅') || vonageStatus.includes('❌')) {
                    setVonageStatus('');
                }
            }, 8000);
        }
    };

    const getMediaStream = async () => {
        try {
            return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch (err) {
            console.warn("Could not get both video/audio. Attempting audio only.");
            try {
                return await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (err2) {
                try {
                    return await navigator.mediaDevices.getUserMedia({ video: true });
                } catch (err3) {
                    throw new Error("No media devices available or permissions denied.");
                }
            }
        }
    };

    const createPeerConnection = (targetEmail) => {
        const pc = new RTCPeerConnection(rtcConfig);
        peersRef.current[targetEmail] = pc;

        if (!iceCandidateQueues.current[targetEmail]) {
            iceCandidateQueues.current[targetEmail] = [];
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                if (track.kind === 'video' && isScreenSharingRef.current && screenStreamRef.current) {
                    pc.addTrack(screenStreamRef.current.getVideoTracks()[0], localStreamRef.current);
                } else {
                    pc.addTrack(track, localStreamRef.current);
                }
            });
        }

        // BUG FIX: Batching ICE Candidates to avoid hitting Supabase Realtime broadcast rate limits
        pc.onicecandidate = (e) => {
            if (e.candidate && channelRef.current) {
                if (!iceBatchersRef.current[targetEmail]) {
                    iceBatchersRef.current[targetEmail] = { candidates: [], timer: null };
                }

                const batcher = iceBatchersRef.current[targetEmail];
                batcher.candidates.push(e.candidate);

                if (!batcher.timer) {
                    batcher.timer = setTimeout(() => {
                        if (channelRef.current) {
                            channelRef.current.send({
                                type: 'broadcast', event: 'webrtc-ice-batch',
                                payload: { targetEmail, candidates: batcher.candidates, sender: userEmail }
                            });
                        }
                        batcher.candidates = [];
                        batcher.timer = null;
                    }, 300); // 300ms collection window for ICE candidates
                }
            }
        };

        pc.ontrack = (e) => {
            // BUG FIX: Pass the stable stream reference directly to prevent iOS from breaking playback
            const stream = e.streams && e.streams[0];
            if (stream) {
                setRemoteStreams(prev => ({ ...prev, [targetEmail]: stream }));
            }
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
        delete iceBatchersRef.current[email];

        if (Object.keys(peersRef.current).length === 0) {
            endVoiceCall(false);
        }
    };

    const endVoiceCall = (broadcast = true) => {
        if (ringerActiveRef.current) {
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
        isScreenSharingRef.current = false;
        setRemoteStreams({});
        setLocalMediaStream(null);
        setInVoiceCall(false);
        iceCandidateQueues.current = {};
        iceBatchersRef.current = {};
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
                    catch (err) { }
                }
            } catch (err) {
                console.error("Auto accept failed", err);
            }
        };
    }, [userEmail]);

    const acceptCall = async () => {
        const currentIncomingCall = incomingCall;

        if (ringerActiveRef.current) {
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
                catch (err) { }
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
            alert("Could not establish call connection: " + e.message);
            if (Object.keys(peersRef.current).length === 0) endVoiceCall(false);
        }
    };

    const handleDeclineCall = () => {
        if (ringerActiveRef.current) {
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
            return;
        }

        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            screenStreamRef.current = screenStream;
            const screenTrack = screenStream.getVideoTracks()[0];

            screenTrack.onended = () => stopScreenShare();

            Object.values(peersRef.current).forEach(pc => {
                const senders = pc.getSenders();
                const videoSender = senders.find(s => s.track?.kind === 'video');

                if (videoSender) {
                    videoSender.replaceTrack(screenTrack).catch(err => console.error("Replace Track error:", err));
                }
            });

            const localAudioTrack = localStreamRef.current?.getAudioTracks()[0];
            const displayStream = new MediaStream([screenTrack]);
            if (localAudioTrack) displayStream.addTrack(localAudioTrack);

            setLocalMediaStream(displayStream);
            setIsScreenSharing(true);
            isScreenSharingRef.current = true;
        } catch (err) {
            console.error("Error sharing screen:", err);
        }
    };

    const stopScreenShare = async () => {
        if (!isScreenSharingRef.current) return;

        setIsScreenSharing(false);
        isScreenSharingRef.current = false;

        const screenTrack = screenStreamRef.current?.getVideoTracks()[0];
        if (screenTrack) {
            screenTrack.stop();
        }

        if (localStreamRef.current) {
            const webcamTrack = localStreamRef.current.getVideoTracks()[0];

            Object.values(peersRef.current).forEach(pc => {
                const senders = pc.getSenders();
                const videoSender = senders.find(s => s.track?.kind === 'video');

                if (videoSender) {
                    videoSender.replaceTrack(webcamTrack || null).catch(err => console.error("Revert track error:", err));
                }
            });

            setLocalMediaStream(localStreamRef.current);
        }
        screenStreamRef.current = null;
    };

    const refreshPresence = async () => {
        if (channelRef.current) {
            try { await channelRef.current.track({ email: userEmail, online: true, timestamp: new Date().toISOString() }); }
            catch (error) { }
        }
    };

    const handleStartCall = () => {
        if (ringerActiveRef.current) {
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

    const displayMembers = members.filter(m => {
        if (!m.email) return false;
        return m.email.trim().toLowerCase() !== safeUserEmail;
    });

    const displayLocalContacts = savedContacts.filter(c => {
        if (!c.email) return false;
        return c.email.trim().toLowerCase() !== safeUserEmail;
    });

    const activeContactObj = allKnownUsers.find(c => c.email?.trim().toLowerCase() === selectedContact?.trim().toLowerCase());
    const activeContactName = activeContactObj ? activeContactObj.name : (selectedContact ? selectedContact.split('@')[0] : '');

    const getMemberDisplayName = (member) => {
        if (member.name && member.name.trim()) return member.name;
        return member.email.split('@')[0];
    };

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

                        <div style={{ flexGrow: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            <div
                                onClick={() => setIsOnlineExpanded(!isOnlineExpanded)}
                                style={{ padding: '10px', backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid #222d34', userSelect: 'none' }}
                            >
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
                                            <div
                                                key={u.email}
                                                onClick={() => setSelectedContact(u.email)}
                                                style={{ padding: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottom: '1px solid #222d34', backgroundColor: selectedContact === u.email ? '#2a3942' : 'transparent', transition: 'background 0.2s' }}
                                            >
                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#38bdf8', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '15px', color: '#111', fontWeight: 'bold' }}>
                                                    {u.email.charAt(0).toUpperCase()}
                                                </div>
                                                <span style={{ fontSize: '16px' }}>{finalName}</span>
                                                {Object.keys(remoteStreams).includes(u.email) && (
                                                    <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#00a884' }}>📞 In Call</span>
                                                )}
                                            </div>
                                        )
                                    })
                                )
                            )}

                            <div
                                onClick={() => setIsMembersExpanded(!isMembersExpanded)}
                                style={{ padding: '10px', backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid #222d34', marginTop: '10px', userSelect: 'none' }}
                            >
                                <span style={{ color: '#8696a0', fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold' }}>Members Group ({displayMembers.length})</span>
                                <span style={{ color: '#8696a0', fontSize: '10px' }}>{isMembersExpanded ? '▼' : '▶'}</span>
                            </div>
                            {isMembersExpanded && (
                                displayMembers.length === 0 ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#8696a0', fontSize: '14px' }}>No members found.</div>
                                ) : (
                                    displayMembers.map(c => (
                                        <div
                                            key={c.email}
                                            onClick={() => setSelectedContact(c.email)}
                                            style={{ padding: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottom: '1px solid #222d34', backgroundColor: selectedContact === c.email ? '#2a3942' : 'transparent', transition: 'background 0.2s' }}
                                        >
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#00a884', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '15px', color: '#111', fontWeight: 'bold', flexShrink: 0 }}>
                                                {c.name ? c.name.charAt(0).toUpperCase() : c.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
                                                <span style={{ fontSize: '16px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                    {getMemberDisplayName(c)}
                                                </span>
                                                <span style={{ fontSize: '11px', color: '#2a3942', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                    ••••••
                                                </span>
                                            </div>
                                            {Object.keys(remoteStreams).includes(c.email) && (
                                                <span style={{ marginLeft: '10px', fontSize: '12px', color: '#00a884' }}>📞 In Call</span>
                                            )}
                                        </div>
                                    ))
                                )
                            )}

                            <div
                                onClick={() => setIsContactsExpanded(!isContactsExpanded)}
                                style={{ padding: '10px', backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginTop: '10px', borderBottom: '1px solid #222d34', userSelect: 'none' }}
                            >
                                <span style={{ color: '#8696a0', fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold' }}>My Contacts ({displayLocalContacts.length})</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleImportContacts(); }}
                                        disabled={isImporting}
                                        style={{ backgroundColor: isImporting ? '#1a2a33' : '#2a3942', color: isImporting ? '#666' : '#00a884', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: isImporting ? 'not-allowed' : 'pointer', fontSize: '11px', opacity: isImporting ? 0.6 : 1 }}
                                    >
                                        {isImporting ? '⏳ Importing...' : '+ Add External'}
                                    </button>
                                    <span style={{ color: '#8696a0', fontSize: '10px' }}>{isContactsExpanded ? '▼' : '▶'}</span>
                                </div>
                            </div>
                            {isContactsExpanded && (
                                displayLocalContacts.length === 0 ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#8696a0', fontSize: '14px' }}>No contacts added yet.</div>
                                ) : (
                                    displayLocalContacts.map(c => (
                                        <div
                                            key={c.email}
                                            onClick={() => setSelectedContact(c.email)}
                                            style={{ padding: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottom: '1px solid #222d34', backgroundColor: selectedContact === c.email ? '#2a3942' : 'transparent', transition: 'background 0.2s' }}
                                        >
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#64748b', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '15px', color: '#fff', fontWeight: 'bold', flexShrink: 0 }}>
                                                {c.name ? c.name.charAt(0).toUpperCase() : c.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
                                                <span style={{ fontSize: '16px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{c.name || c.email.split('@')[0]}</span>
                                                <span style={{ fontSize: '12px', color: '#8696a0', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{c.email}</span>
                                            </div>
                                            {members.some(m => m.email?.trim().toLowerCase() === c.email.trim().toLowerCase()) && (
                                                <span style={{ marginLeft: '8px', fontSize: '10px', color: '#00a884', background: '#1a2a33', padding: '2px 8px', borderRadius: '10px' }}>Member</span>
                                            )}
                                            {Object.keys(remoteStreams).includes(c.email) && (
                                                <span style={{ marginLeft: '8px', fontSize: '12px', color: '#00a884' }}>📞 In Call</span>
                                            )}
                                            <button
                                                onClick={(e) => handleRemoveContact(e, c.email)}
                                                style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', fontSize: '14px', padding: '5px' }}
                                                title="Remove contact"
                                            >
                                                ❌
                                            </button>
                                        </div>
                                    ))
                                )
                            )}
                        </div>
                    </div>
                )}

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
                                            <button onClick={() => setSelectedContact(null)} style={{ background: 'none', border: 'none', color: '#00a884', fontSize: '20px', marginRight: '15px', cursor: 'pointer', padding: 0 }}>🔙</button>
                                        )}
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#00a884', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '15px', color: '#111', fontWeight: 'bold' }}>
                                            {activeContactName ? activeContactName.charAt(0).toUpperCase() : selectedContact.charAt(0).toUpperCase()}
                                        </div>
                                        <b>{activeContactName}</b>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                        <button
                                            onClick={handleVonageTestCall}
                                            disabled={isVonageCalling}
                                            style={{ backgroundColor: isVonageCalling ? '#1a2a33' : '#7c3aed', color: isVonageCalling ? '#666' : 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: isVonageCalling ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '12px', opacity: isVonageCalling ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            {isVonageCalling ? '⏳' : '📞'} Vonage Test
                                        </button>

                                        {!inVoiceCall ? (
                                            <button onClick={handleStartCall} style={{ backgroundColor: 'transparent', border: '1px solid #00a884', color: '#00a884', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>📹 Video Call</button>
                                        ) : (
                                            <>
                                                {!isSelectedContactInCall && (
                                                    <button onClick={handleAddToCall} style={{ backgroundColor: '#00a884', color: '#111', border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>➕ Add to Call</button>
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

                                {vonageStatus && (
                                    <div style={{ padding: '8px 16px', backgroundColor: vonageStatus.includes('✅') ? '#064e3b' : vonageStatus.includes('❌') ? '#7f1d1d' : '#1e293b', color: 'white', fontSize: '13px', textAlign: 'center', borderBottom: '1px solid #1a2a33' }}>
                                        {vonageStatus}
                                    </div>
                                )}

                                {inVoiceCall && (
                                    <div style={{ height: '45vh', backgroundColor: '#000', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '10px', padding: '10px', borderBottom: '1px solid #222d34', flexShrink: 0 }}>
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

                                <div ref={chatContainerRef} style={{
                                    flexGrow: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px',
                                    backgroundImage: 'url(https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png)', backgroundSize: 'contain', WebkitOverflowScrolling: 'touch'
                                }}>
                                    {chatMessages.map((m, i) => {
                                        const isMine = m.sender_email === userEmail;
                                        return (
                                            <div key={m.id || i} style={{
                                                alignSelf: isMine ? 'flex-end' : 'flex-start', backgroundColor: isMine ? '#005c4b' : '#202c33', padding: '8px 12px', borderRadius: '8px',
                                                maxWidth: '65%', fontSize: '14.5px', boxShadow: '0 1px 0.5px rgba(11,20,26,.13)', wordWrap: 'break-word', whiteSpace: 'pre-wrap'
                                            }}>
                                                <div style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>{m.text}</div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <form onSubmit={sendMessage} style={{ padding: '15px', paddingBottom: 'calc(15px + env(safe-area-inset-bottom, 0px))', backgroundColor: '#202c33', display: 'flex', alignItems: 'center', zIndex: 10, flexShrink: 0 }}>
                                    <textarea
                                        value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message" rows={1}
                                        style={{ flexGrow: 1, padding: '12px', backgroundColor: '#2a3942', border: 'none', borderRadius: '8px', color: 'white', outline: 'none', fontSize: '15px', resize: 'none', fontFamily: 'Segoe UI, sans-serif', minHeight: '44px', maxHeight: '120px', overflowY: 'auto' }}
                                    />
                                    <button type="submit" disabled={!chatInput.trim()} style={{ marginLeft: '10px', backgroundColor: chatInput.trim() ? '#00a884' : '#333', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: chatInput.trim() ? 'pointer' : 'default', flexShrink: 0 }}>
                                        ➢
                                    </button>
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

            {/* ========================================== */}
            {/* 🦶 FOOTER - NoirSoft Creation 2026 */}
            {/* ========================================== */}
            <div style={{ backgroundColor: '#0b141a', borderTop: '1px solid #1a2a33', padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', gap: '8px', color: '#8696a0', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span>© NoirSoft Creation 2026</span>
                    <span style={{ color: '#2a3942' }}>|</span>
                    <span>👥 Members: <strong style={{ color: '#e9edef' }}>{displayMembers.length}</strong></span>
                    <span style={{ color: '#2a3942' }}>|</span>
                    <span>🟢 Online: <strong style={{ color: '#00a884' }}>{onlineUsers.length}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '10px', color: '#2a3942' }}>{new Date().getFullYear()} • v1.0.0</span>
                    {inVoiceCall && <span style={{ color: '#ef4444', fontSize: '10px', animation: 'pulse 1.5s infinite' }}>📞 In Call</span>}
                </div>
            </div>

            <style>{`
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
            `}</style>
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
                    } catch (invokeErr) { }
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