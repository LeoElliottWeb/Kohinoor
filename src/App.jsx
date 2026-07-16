import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

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

    // WebRTC States
    const [inVoiceCall, setInVoiceCall] = useState(false);
    const [incomingCall, setIncomingCall] = useState(null);
    const [remoteMediaStream, setRemoteMediaStream] = useState(null);
    const [localMediaStream, setLocalMediaStream] = useState(null);

    // Screen Share States
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const screenStreamRef = useRef(null);

    const chatContainerRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const localStreamRef = useRef(null); // Holds the permanent webcam/mic stream
    const remoteVideoRef = useRef(null);
    const localVideoRef = useRef(null);
    const iceCandidateQueueRef = useRef([]);

    useEffect(() => {
        selectedContactRef.current = selectedContact;
    }, [selectedContact]);

    // Load saved contacts
    useEffect(() => {
        const stored = localStorage.getItem('totalRecallContacts');
        if (stored) {
            try { setSavedContacts(JSON.parse(stored)); }
            catch (e) { console.error(e); }
        }
    }, []);

    // Auto-scroll chat
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatMessages]);

    // Attach video streams safely
    useEffect(() => {
        if (remoteVideoRef.current && remoteMediaStream) {
            remoteVideoRef.current.srcObject = remoteMediaStream;
        }
        if (localVideoRef.current && localMediaStream) {
            localVideoRef.current.srcObject = localMediaStream;
        }
    }, [remoteMediaStream, localMediaStream, inVoiceCall]);

    // ==========================================
    // 📨 FETCH MESSAGE HISTORY
    // ==========================================
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

    const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

    // ==========================================
    // 📡 UNIFIED SUPABASE CHANNEL
    // ==========================================
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
            if (payload.targetEmail === userEmail) setIncomingCall(payload);
        });

        channel.on('broadcast', { event: 'webrtc-answer' }, async ({ payload }) => {
            if (payload.targetEmail === userEmail && peerConnectionRef.current) {
                try {
                    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
                    while (iceCandidateQueueRef.current.length > 0) {
                        const candidate = iceCandidateQueueRef.current.shift();
                        try { await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate)); }
                        catch (err) { console.error("ICE error:", err); }
                    }
                } catch (err) { console.error("Failed handling answer:", err); }
            }
        });

        channel.on('broadcast', { event: 'webrtc-ice' }, async ({ payload }) => {
            if (payload.targetEmail === userEmail) {
                if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
                    try { await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate)); }
                    catch (err) { console.error("ICE error:", err); }
                } else {
                    iceCandidateQueueRef.current.push(payload.candidate);
                }
            }
        });

        channel.on('broadcast', { event: 'webrtc-end' }, ({ payload }) => {
            if (payload.targetEmail === userEmail) endVoiceCall(false);
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

    // ==========================================
    // 💬 CHAT LOGIC
    // ==========================================
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
        const updateContactsList = (newContacts) => {
            setSavedContacts(prev => {
                const merged = [...prev, ...newContacts];
                const unique = merged.filter((v, i, a) => a.findIndex(t => (t.email === v.email)) === i);
                localStorage.setItem('totalRecallContacts', JSON.stringify(unique));
                return unique;
            });
        };

        if (supported) {
            try {
                const contacts = await navigator.contacts.select(['name', 'email'], { multiple: true });
                const validContacts = contacts
                    .filter(c => c.email && c.email.length > 0)
                    .map(c => ({ name: c.name?.[0] || c.email[0].split('@')[0], email: c.email[0] }));
                if (validContacts.length > 0) updateContactsList(validContacts);
            } catch (err) { console.error("Contact selection failed", err); }
        } else {
            const emailInput = prompt("Enter an email address to add a contact manually:");
            if (emailInput && emailInput.trim()) {
                updateContactsList([{ name: emailInput.split('@')[0], email: emailInput.trim() }]);
            }
        }
    };

    // ==========================================
    // 📹 WEBRTC HELPERS & SCREEN SHARE
    // ==========================================
    const getMediaStream = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Your browser does not support WebRTC or you are not on a secure HTTPS connection.");
        }
        try {
            return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch (err) {
            console.warn("Could not get both video/audio. Attempting video only.", err);
            try {
                return await navigator.mediaDevices.getUserMedia({ video: true });
            } catch (err2) {
                console.warn("Video only failed. Attempting audio only.", err2);
                return await navigator.mediaDevices.getUserMedia({ audio: true });
            }
        }
    };

    const toggleScreenShare = async () => {
        if (!peerConnectionRef.current) return;

        if (isScreenSharing) {
            // Stop sharing screen and revert to webcam
            stopScreenShare();
        } else {
            // Start screen share
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                screenStreamRef.current = screenStream;
                const screenTrack = screenStream.getVideoTracks()[0];

                // If the user clicks the native browser "Stop sharing" bar/button
                screenTrack.onended = () => {
                    stopScreenShare();
                };

                // Replace the video track being sent to the peer
                const videoSender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
                if (videoSender) {
                    await videoSender.replaceTrack(screenTrack);
                }

                // Create a mixed stream for the local video element (Screen Video + Camera Mic)
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

        // Stop the screen recording tracks
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(track => track.stop());
            screenStreamRef.current = null;
        }

        // Revert peer connection back to the webcam track
        if (peerConnectionRef.current && localStreamRef.current) {
            const webcamTrack = localStreamRef.current.getVideoTracks()[0];
            const videoSender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video' || s.track === null);

            if (videoSender && webcamTrack) {
                try {
                    await videoSender.replaceTrack(webcamTrack);
                } catch (err) {
                    console.error("Error reverting to webcam track:", err);
                }
            }

            // Revert local video element back to the original webcam/mic stream
            setLocalMediaStream(localStreamRef.current);
        }

        setIsScreenSharing(false);
    };

    const startCall = async () => {
        if (!selectedContact || !channelRef.current) return;

        try {
            const stream = await getMediaStream();
            localStreamRef.current = stream;
            setLocalMediaStream(stream);

            const pc = new RTCPeerConnection(rtcConfig);
            peerConnectionRef.current = pc;
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.onicecandidate = (e) => {
                if (e.candidate && channelRef.current) {
                    channelRef.current.send({ type: 'broadcast', event: 'webrtc-ice', payload: { targetEmail: selectedContact, candidate: e.candidate, sender: userEmail } });
                }
            };

            pc.ontrack = (e) => {
                if (e.streams && e.streams.length > 0) {
                    setRemoteMediaStream(e.streams[0]);
                } else {
                    setRemoteMediaStream(new MediaStream([e.track]));
                }
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            channelRef.current.send({ type: 'broadcast', event: 'webrtc-offer', payload: { targetEmail: selectedContact, offer, sender: userEmail } });
            setInVoiceCall(true);

        } catch (err) {
            alert("Call setup failed: " + err.message);
            console.error(err);
            endVoiceCall(false);
        }
    };

    const acceptCall = async () => {
        // Cache the incoming call details
        const currentIncomingCall = incomingCall;

        // IMMEDIATE UI UPDATE: Hide modal immediately so it doesn't get stuck during camera permission prompt
        setIncomingCall(null);

        if (!currentIncomingCall || !channelRef.current) {
            alert("Lost connection to the caller.");
            endVoiceCall(false);
            return;
        }

        try {
            // Get user's camera/mic
            const stream = await getMediaStream();
            localStreamRef.current = stream;
            setLocalMediaStream(stream);

            const pc = new RTCPeerConnection(rtcConfig);
            peerConnectionRef.current = pc;
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.onicecandidate = (e) => {
                if (e.candidate && channelRef.current) {
                    channelRef.current.send({ type: 'broadcast', event: 'webrtc-ice', payload: { targetEmail: currentIncomingCall.sender, candidate: e.candidate, sender: userEmail } });
                }
            };

            pc.ontrack = (e) => {
                if (e.streams && e.streams.length > 0) {
                    setRemoteMediaStream(e.streams[0]);
                } else {
                    setRemoteMediaStream(new MediaStream([e.track]));
                }
            };

            await pc.setRemoteDescription(new RTCSessionDescription(currentIncomingCall.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            channelRef.current.send({ type: 'broadcast', event: 'webrtc-answer', payload: { targetEmail: currentIncomingCall.sender, answer, sender: userEmail } });

            while (iceCandidateQueueRef.current.length > 0) {
                const candidate = iceCandidateQueueRef.current.shift();
                try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
                catch (err) { console.error("ICE error:", err); }
            }

            setInVoiceCall(true);
            setSelectedContact(currentIncomingCall.sender);

        } catch (e) {
            console.error("Setup Error:", e);
            alert("Could not establish call connection: " + e.message);
            endVoiceCall(false);
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
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(track => track.stop());
            screenStreamRef.current = null;
        }

        setIsScreenSharing(false);
        setRemoteMediaStream(null);
        setLocalMediaStream(null);
        setInVoiceCall(false);
        setIncomingCall(null);
        iceCandidateQueueRef.current = [];

        if (broadcast && selectedContact && channelRef.current) {
            channelRef.current.send({ type: 'broadcast', event: 'webrtc-end', payload: { targetEmail: selectedContact } });
        }
    };

    const refreshPresence = async () => {
        if (channelRef.current) {
            try { await channelRef.current.track({ email: userEmail, online: true, timestamp: new Date().toISOString() }); }
            catch (error) { console.error('Error refreshing presence:', error); }
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
                        <button onClick={() => { setIncomingCall(null); endVoiceCall(false); }} style={{ flex: 1, backgroundColor: '#ef4444', border: 'none', padding: '8px', borderRadius: '4px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Decline</button>
                    </div>
                </div>
            )}

            {/* SIDEBAR - CONTACTS */}
            <div style={{ width: '30%', minWidth: '250px', borderRight: '1px solid #222d34', display: 'flex', flexDirection: 'column', backgroundColor: '#111b21' }}>
                <div style={{ padding: '15px', backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

                <div style={{ padding: '10px', backgroundColor: '#111b21', borderBottom: '1px solid #222d34', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#8696a0', fontSize: '14px', fontWeight: 'bold' }}>Contacts</span>
                    <button onClick={handleImportContacts} style={{ backgroundColor: '#2a3942', color: '#00a884', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                        + Add Contact
                    </button>
                </div>

                <div style={{ flexGrow: 1, overflowY: 'auto' }}>
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
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* CHAT AREA */}
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0b141a', position: 'relative' }}>
                {selectedContact ? (
                    <>
                        <div style={{ padding: '10px 20px', backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#00a884', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '15px', color: '#111', fontWeight: 'bold' }}>
                                    {selectedContact.charAt(0).toUpperCase()}
                                </div>
                                <b>{savedContacts.find(c => c.email === selectedContact)?.name || selectedContact.split('@')[0]}</b>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                {!inVoiceCall ? (
                                    <button onClick={startCall} style={{ backgroundColor: 'transparent', border: '1px solid #00a884', color: '#00a884', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>📹 Video Call</button>
                                ) : (
                                    <>
                                        <button
                                            onClick={toggleScreenShare}
                                            style={{ backgroundColor: isScreenSharing ? '#334155' : 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', marginRight: '10px' }}
                                        >
                                            {isScreenSharing ? '⏹️ Stop Share' : '🖥️ Share Screen'}
                                        </button>
                                        <button onClick={() => endVoiceCall(true)} style={{ backgroundColor: '#ef4444', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>🔴 End Call</button>
                                    </>
                                )}
                            </div>
                        </div>

                        {inVoiceCall && (
                            <div style={{ height: '45vh', backgroundColor: '#000', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px', padding: '10px', borderBottom: '1px solid #222d34' }}>
                                <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#111', borderRadius: '8px', overflow: 'hidden' }}>
                                    <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    <span style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '4px', fontSize: '13px' }}>
                                        {isScreenSharing ? "You (Screen)" : "You"}
                                    </span>
                                </div>
                                <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#111', borderRadius: '8px', overflow: 'hidden' }}>
                                    <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    <span style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '4px', fontSize: '13px' }}>
                                        {savedContacts.find(c => c.email === selectedContact)?.name || selectedContact.split('@')[0]}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div ref={chatContainerRef} style={{ flexGrow: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', backgroundImage: 'url(https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png)', backgroundSize: 'contain' }}>
                            {chatMessages.map((m, i) => {
                                const isMine = m.sender_email === userEmail;
                                return (
                                    <div key={m.id || i} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', backgroundColor: isMine ? '#005c4b' : '#202c33', padding: '8px 12px', borderRadius: '8px', maxWidth: '65%', fontSize: '14.5px', boxShadow: '0 1px 0.5px rgba(11,20,26,.13)' }}>
                                        <div>{m.text}</div>
                                    </div>
                                );
                            })}
                        </div>

                        <form onSubmit={sendMessage} style={{ padding: '15px', backgroundColor: '#202c33', display: 'flex', alignItems: 'center', zIndex: 10 }}>
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
                const { data, error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                if (data?.user && !data?.session) {
                    setShowConfirmation(true);
                    setEmail(''); setPassword('');
                }
            }
        } catch (err) { alert(err.message); }
        finally { setLoading(false); }
    };

    if (user) return <ChatApp user={user} onLogout={() => supabase.auth.signOut()} />;

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#111b21', color: 'white', fontFamily: 'Segoe UI' }}>
            <div style={{ backgroundColor: '#202c33', padding: '40px', borderRadius: '8px', width: '350px', textAlign: 'center', boxShadow: '0 17px 50px 0 rgba(11,20,26,.19)' }}>
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