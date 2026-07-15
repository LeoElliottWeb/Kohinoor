import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

// ==========================================
// 🛡️ MAIN CHAT COMPONENT
// ==========================================
function ChatApp({ user, onLogout }) {
    const userEmail = user?.email || '';
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [savedContacts, setSavedContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [lobbyChannel, setLobbyChannel] = useState(null);

    // WebRTC States
    const [inVoiceCall, setInVoiceCall] = useState(false);
    const [incomingCall, setIncomingCall] = useState(null);
    const [remoteMediaStream, setRemoteMediaStream] = useState(null);
    const [localMediaStream, setLocalMediaStream] = useState(null);

    const chatContainerRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const localStreamRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const localVideoRef = useRef(null);
    const iceCandidateQueueRef = useRef([]);
    const mySocketId = useRef(Math.random().toString(36).substring(7));

    // Load saved contacts from LocalStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('totalRecallContacts');
        if (stored) {
            try {
                setSavedContacts(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse saved contacts", e);
            }
        }
    }, []);

    // Auto-scroll chat
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatMessages]);

    // Attach video streams
    useEffect(() => {
        if (remoteVideoRef.current && remoteMediaStream) remoteVideoRef.current.srcObject = remoteMediaStream;
    }, [remoteMediaStream, inVoiceCall]);

    useEffect(() => {
        if (localVideoRef.current && localMediaStream) localVideoRef.current.srcObject = localMediaStream;
    }, [localMediaStream, inVoiceCall]);

    // Fetch message history when contact changes
    useEffect(() => {
        if (!selectedContact || !userEmail) return;
        const fetchHistory = async () => {
            const { data } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_email.eq.${userEmail},receiver_email.eq.${selectedContact}),and(sender_email.eq.${selectedContact},receiver_email.eq.${userEmail})`)
                .order('created_at', { ascending: true })
                .limit(50);

            if (data) setChatMessages(data);
        };
        fetchHistory();
    }, [selectedContact, userEmail]);

    const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

    // ==========================================
    // 📡 SUPABASE PRESENCE & WEBRTC SIGNALING
    // ==========================================
    useEffect(() => {
        if (!userEmail) return;
        const channel = supabase.channel('whatsapp-lobby');
        setLobbyChannel(channel);

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const userMap = new Map();
                for (const key in state) {
                    state[key].forEach(p => {
                        if (p.email && p.email !== userEmail) userMap.set(p.email, p);
                    });
                }
                setOnlineUsers(Array.from(userMap.values()));
            })
            // Receive Real-Time Messages
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
                const newMsg = payload.new;
                if (
                    (newMsg.sender_email === selectedContact && newMsg.receiver_email === userEmail) ||
                    (newMsg.sender_email === userEmail && newMsg.receiver_email === selectedContact)
                ) {
                    setChatMessages(prev => [...prev, newMsg]);
                }
            })
            // WebRTC Signaling
            .on('broadcast', { event: 'webrtc-offer' }, async ({ payload }) => {
                if (payload.targetEmail === userEmail) {
                    setIncomingCall(payload);
                }
            })
            .on('broadcast', { event: 'webrtc-answer' }, async ({ payload }) => {
                if (payload.targetEmail === userEmail && peerConnectionRef.current) {
                    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
                    while (iceCandidateQueueRef.current.length > 0) {
                        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(iceCandidateQueueRef.current.shift()));
                    }
                }
            })
            .on('broadcast', { event: 'webrtc-ice' }, async ({ payload }) => {
                if (payload.targetEmail === userEmail) {
                    if (peerConnectionRef.current?.remoteDescription) {
                        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
                    } else {
                        iceCandidateQueueRef.current.push(payload.candidate);
                    }
                }
            })
            .on('broadcast', { event: 'webrtc-end' }, ({ payload }) => {
                if (payload.targetEmail === userEmail) endVoiceCall(false);
            })
            .subscribe(async (s) => {
                if (s === 'SUBSCRIBED') {
                    await channel.track({ email: userEmail, socketId: mySocketId.current, online: true });
                }
            });

        return () => {
            channel.untrack();
            supabase.removeChannel(channel);
        };
    }, [userEmail, selectedContact]);

    // ==========================================
    // 📇 CONTACT IMPORT LOGIC
    // ==========================================
    const handleImportContacts = async () => {
        const supported = ('contacts' in navigator && 'ContactsManager' in window);

        const updateContactsList = (newContacts) => {
            setSavedContacts(prev => {
                const merged = [...prev, ...newContacts];
                // Deduplicate by email
                const unique = merged.filter((v, i, a) => a.findIndex(t => (t.email === v.email)) === i);
                localStorage.setItem('totalRecallContacts', JSON.stringify(unique));
                return unique;
            });
        };

        if (supported) {
            try {
                const props = ['name', 'email'];
                const contacts = await navigator.contacts.select(props, { multiple: true });

                // Filter out contacts without emails, since the app routes via email
                const validContacts = contacts
                    .filter(c => c.email && c.email.length > 0)
                    .map(c => ({ name: c.name?.[0] || c.email[0].split('@')[0], email: c.email[0] }));

                if (validContacts.length === 0) {
                    alert('No contacts with email addresses were found.');
                    return;
                }
                updateContactsList(validContacts);
            } catch (err) {
                console.error("Contact selection failed", err);
            }
        } else {
            // Fallback for desktop / unsupported browsers
            const emailInput = prompt("Your browser doesn't support the native Contact Picker. Enter an email address to add a contact manually:");
            if (emailInput && emailInput.trim()) {
                const newContact = { name: emailInput.split('@')[0], email: emailInput.trim() };
                updateContactsList([newContact]);
            }
        }
    };

    // ==========================================
    // 💬 CHAT LOGIC
    // ==========================================
    const sendMessage = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !selectedContact) return;

        const textToSend = chatInput;
        setChatInput('');

        // Optimistic UI update
        const tempMsg = { sender_email: userEmail, receiver_email: selectedContact, text: textToSend, created_at: new Date().toISOString() };
        setChatMessages(prev => [...prev, tempMsg]);

        await supabase.from('messages').insert([
            { sender_email: userEmail, receiver_email: selectedContact, text: textToSend }
        ]);
    };

    // ==========================================
    // 📹 WEBRTC VIDEO LOGIC
    // ==========================================
    const startCall = async () => {
        if (!selectedContact) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            setLocalMediaStream(stream);

            const pc = new RTCPeerConnection(rtcConfig);
            peerConnectionRef.current = pc;
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.onicecandidate = (e) => {
                if (e.candidate && lobbyChannel) {
                    lobbyChannel.send({ type: 'broadcast', event: 'webrtc-ice', payload: { targetEmail: selectedContact, candidate: e.candidate, sender: userEmail } });
                }
            };

            pc.ontrack = (e) => {
                setRemoteMediaStream(e.streams[0] || new MediaStream([e.track]));
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            lobbyChannel.send({ type: 'broadcast', event: 'webrtc-offer', payload: { targetEmail: selectedContact, offer, sender: userEmail } });
            setInVoiceCall(true);
        } catch (err) {
            alert("Camera/Mic access required.");
        }
    };

    const acceptCall = async () => {
        if (!incomingCall) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            setLocalMediaStream(stream);

            const pc = new RTCPeerConnection(rtcConfig);
            peerConnectionRef.current = pc;
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.onicecandidate = (e) => {
                if (e.candidate && lobbyChannel) {
                    lobbyChannel.send({ type: 'broadcast', event: 'webrtc-ice', payload: { targetEmail: incomingCall.sender, candidate: e.candidate, sender: userEmail } });
                }
            };

            pc.ontrack = (e) => setRemoteMediaStream(e.streams[0] || new MediaStream([e.track]));

            await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            lobbyChannel.send({ type: 'broadcast', event: 'webrtc-answer', payload: { targetEmail: incomingCall.sender, answer, sender: userEmail } });

            setInVoiceCall(true);
            setSelectedContact(incomingCall.sender);
            setIncomingCall(null);
        } catch (e) {
            console.error(e);
        }
    };

    const endVoiceCall = (broadcast = true) => {
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        setRemoteMediaStream(null);
        setLocalMediaStream(null);
        setInVoiceCall(false);
        setIncomingCall(null);

        if (broadcast && selectedContact && lobbyChannel) {
            lobbyChannel.send({ type: 'broadcast', event: 'webrtc-end', payload: { targetEmail: selectedContact } });
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', backgroundColor: '#111b21', color: '#e9edef', fontFamily: 'Segoe UI, sans-serif' }}>

            {/* INCOMING CALL MODAL */}
            {incomingCall && !inVoiceCall && (
                <div style={{ position: 'fixed', top: 20, right: 20, backgroundColor: '#202c33', padding: '20px', borderRadius: '8px', zIndex: 1000, border: '1px solid #00a884', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>📹 Incoming Call</h4>
                    <p style={{ margin: '0 0 15px 0', fontSize: '14px' }}>From: <b>{incomingCall.sender.split('@')[0]}</b></p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={acceptCall} style={{ flex: 1, backgroundColor: '#00a884', border: 'none', padding: '8px', borderRadius: '4px', color: '#111', fontWeight: 'bold', cursor: 'pointer' }}>Accept</button>
                        <button onClick={() => setIncomingCall(null)} style={{ flex: 1, backgroundColor: '#ef4444', border: 'none', padding: '8px', borderRadius: '4px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Decline</button>
                    </div>
                </div>
            )}

            {/* SIDEBAR - CONTACTS */}
            <div style={{ width: '30%', minWidth: '250px', borderRight: '1px solid #222d34', display: 'flex', flexDirection: 'column', backgroundColor: '#111b21' }}>
                <div style={{ padding: '15px', backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b style={{ color: '#00a884' }}>TotalRecall</b>
                    <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#aebac1', cursor: 'pointer', fontSize: '14px' }}>Logout</button>
                </div>

                <div style={{ padding: '10px', backgroundColor: '#111b21', borderBottom: '1px solid #222d34', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#8696a0', fontSize: '14px', fontWeight: 'bold' }}>Contacts</span>
                    <button onClick={handleImportContacts} style={{ backgroundColor: '#2a3942', color: '#00a884', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                        + Add Contact                     </button>
                </div>

                <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                    {/* Render Saved Contacts First */}
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
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#00a884', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '15px', color: '#111', fontWeight: 'bold' }}>
                                {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '16px' }}>{c.name}</span>
                                <span style={{ fontSize: '12px', color: '#8696a0' }}>{c.email}</span>
                            </div>
                        </div>
                    ))}

                    <div style={{ padding: '10px', backgroundColor: '#202c33', color: '#8696a0', fontSize: '12px', textTransform: 'uppercase' }}>
                        Online Now
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
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* CHAT AREA */}
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0b141a', position: 'relative' }}>
                {selectedContact ? (
                    <>
                        {/* Chat Header */}
                        <div style={{ padding: '10px 20px', backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#00a884', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '15px', color: '#111', fontWeight: 'bold' }}>
                                    {selectedContact.charAt(0).toUpperCase()}
                                </div>
                                <b>{savedContacts.find(c => c.email === selectedContact)?.name || selectedContact.split('@')[0]}</b>
                            </div>
                            <div>
                                {!inVoiceCall ? (
                                    <button onClick={startCall} style={{ backgroundColor: 'transparent', border: '1px solid #00a884', color: '#00a884', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>📹 Video Call</button>
                                ) : (
                                    <button onClick={() => endVoiceCall(true)} style={{ backgroundColor: '#ef4444', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>🔴 End Call</button>
                                )}
                            </div>
                        </div>

                        {/* Video Overlay */}
                        {inVoiceCall && (
                            <div style={{ position: 'absolute', top: 60, left: 0, right: 0, bottom: 60, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 20, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '80%', maxHeight: '80%', borderRadius: '8px', border: '2px solid #00a884' }} />
                                <video ref={localVideoRef} autoPlay playsInline muted style={{ position: 'absolute', bottom: '20px', right: '20px', width: '150px', borderRadius: '8px', border: '2px solid #fff' }} />
                            </div>
                        )}

                        {/* Message History */}
                        <div ref={chatContainerRef} style={{ flexGrow: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', backgroundImage: 'url(https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png)', backgroundSize: 'contain' }}>
                            {chatMessages.map((m, i) => {
                                const isMine = m.sender_email === userEmail;
                                return (
                                    <div key={i} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', backgroundColor: isMine ? '#005c4b' : '#202c33', padding: '8px 12px', borderRadius: '8px', maxWidth: '65%', fontSize: '14.5px', boxShadow: '0 1px 0.5px rgba(11,20,26,.13)' }}>
                                        <div>{m.text}</div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Input Area */}
                        <form onSubmit={sendMessage} style={{ padding: '15px', backgroundColor: '#202c33', display: 'flex', alignItems: 'center' }}>
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Type a message"
                                style={{ flexGrow: 1, padding: '12px', backgroundColor: '#2a3942', border: 'none', borderRadius: '8px', color: 'white', outline: 'none', fontSize: '15px' }}
                            />
                            <button type="submit" disabled={!chatInput.trim()} style={{ marginLeft: '10px', backgroundColor: chatInput.trim() ? '#00a884' : '#333', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: chatInput.trim() ? 'pointer' : 'default' }}>
                                ➢
                            </button>
                        </form>
                    </>
                ) : (
                    <div style={{ display: 'flex', flexGrow: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: '#8696a0' }}>
                        <h2>TotalRecall</h2>
                        <p>Select a contact from the sidebar to start messaging.</p>
                    </div>
                )}
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
    const [showConfirmation, setShowConfirmation] = useState(false); // Track email confirmation state

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
        return () => subscription.unsubscribe();
    }, []);

    const handleAuth = async (e, type) => {
        e.preventDefault();

        // Manual Validation check so the user understands why it's not proceeding
        if (!email || !password) {
            alert("Please fill in both the Email and Password fields before proceeding.");
            return;
        }

        setLoading(true);
        try {
            if (type === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { data, error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;

                // Supabase returns a user but NO session if email confirmation is turned on
                if (data?.user && !data?.session) {
                    setShowConfirmation(true);
                    setEmail('');
                    setPassword('');
                } else if (data?.session) {
                    // Fallback in case Email Confirmations are disabled in your Supabase project settings
                    alert("Account created! Logging you in.");
                }
            }
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (user) {
        return <ChatApp user={user} onLogout={() => supabase.auth.signOut()} />;
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#111b21', color: 'white', fontFamily: 'Segoe UI' }}>
            <div style={{ backgroundColor: '#202c33', padding: '40px', borderRadius: '8px', width: '350px', textAlign: 'center', boxShadow: '0 17px 50px 0 rgba(11,20,26,.19)' }}>
                <h2 style={{ color: '#00a884', marginBottom: '30px' }}>TotalRecall</h2>

                {showConfirmation ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
                        <h3 style={{ margin: '0 0 12px 0', color: 'white' }}>Confirm Your Email</h3>
                        <p style={{ color: '#8696a0', lineHeight: '1.5', marginBottom: '25px', fontSize: '14px' }}>
                            We've sent a confirmation link to your email address. Please check your inbox (and spam folder) to verify your account before logging in.
                        </p>
                        <button onClick={() => setShowConfirmation(false)} style={{ width: '100%', padding: '12px', backgroundColor: '#00a884', color: '#111', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                            Back to Login
                        </button>
                    </div>
                ) : (
                    <form onSubmit={(e) => e.preventDefault()}>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '4px', border: 'none', backgroundColor: '#2a3942', color: 'white', boxSizing: 'border-box' }}
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '4px', border: 'none', backgroundColor: '#2a3942', color: 'white', boxSizing: 'border-box' }}
                        />
                        <button
                            type="button"
                            onClick={(e) => handleAuth(e, 'login')}
                            disabled={loading}
                            style={{ width: '100%', padding: '12px', backgroundColor: '#00a884', color: '#111', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginBottom: '10px' }}
                        >
                            {loading ? 'Processing...' : 'Log In'}
                        </button>
                        <button
                            type="button"
                            onClick={(e) => handleAuth(e, 'signup')}
                            disabled={loading}
                            style={{ width: '100%', padding: '12px', backgroundColor: 'transparent', color: '#00a884', border: '1px solid #00a884', borderRadius: '4px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
                        >
                            {loading ? 'Processing...' : 'Sign Up'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}