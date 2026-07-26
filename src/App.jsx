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
// 🔗 LINK PARSER HELPER
// ==========================================
const urlExtractRegex = /((?:https?:\/\/|www\.)[^\s<]+[^<.,:;"')\]\s])/gi;

const renderTextWithLinks = (text) => {
    if (!text) return null;
    const parts = text.split(urlExtractRegex);
    let result = [];
    parts.forEach((part, i) => {
        if (part && part.match(urlExtractRegex)) {
            const href = part.startsWith('http') ? part : `https://${part}`;
            result.push(
                <a key={i} href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline', wordBreak: 'break-all' }}>
                    {part}
                </a>
            );
        } else if (part) {
            const lines = part.split('\n');
            lines.forEach((line, lineIndex) => {
                if (line) result.push(<span key={`${i}-${lineIndex}`}>{line}</span>);
                if (lineIndex < lines.length - 1) result.push(<br key={`${i}-br-${lineIndex}`} />);
            });
        }
    });
    return result;
};

// ==========================================
// 😊 EMOJI PICKER COMPONENT
// ==========================================
function EmojiPicker({ onSelectEmoji, onClose }) {
    const emojiCategories = {
        '😊': ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '😍', '🥰', '😘', '😗', '😙', '😚', '🙂', '🤗', '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁', '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩', '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵', '😡', '😠', '🤬'],
        '👍': ['👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🦾', '🖕', '✍️', '🙇', '💁', '🙋', '🧏', '🙆', '🙅', '🤷', '🤦', '🙎', '🙍', '💇', '💆', '🧖', '💅', '🤳', '💃', '🕺', '👯', '🕴️', '👨‍🦽', '👩‍🦽', '🧑‍🦽', '👨‍🦼', '👩‍🦼', '🧑‍🦼']
    };
    const [selectedCategory, setSelectedCategory] = useState('😊');
    const categories = Object.keys(emojiCategories);
    const emojis = emojiCategories[selectedCategory] || [];

    const handleEmojiClick = (emoji) => { onSelectEmoji(emoji); onClose(); };

    return (
        <div style={{ position: 'absolute', bottom: '70px', left: '10px', backgroundColor: '#1a2639', borderRadius: '12px', padding: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', border: '1px solid #2d3748', zIndex: 1000, width: '320px', maxHeight: '350px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '10px', borderBottom: '1px solid #2d3748', marginBottom: '10px' }}>
                {categories.map(category => (
                    <button key={category} onClick={() => setSelectedCategory(category)} style={{ background: selectedCategory === category ? '#2d3748' : 'transparent', border: 'none', color: '#e2e8f0', fontSize: '20px', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>{category}</button>
                ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '2px', overflowY: 'auto', padding: '4px', maxHeight: '220px' }}>
                {emojis.map((emoji, index) => (
                    <button key={index} onClick={() => handleEmojiClick(emoji)} style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '4px', borderRadius: '4px', transition: 'background 0.2s', color: '#e2e8f0' }} onMouseEnter={(e) => e.currentTarget.style.background = '#2d3748'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>{emoji}</button>
                ))}
            </div>
        </div>
    );
}

// ==========================================
// 🖼️ URL PREVIEW COMPONENT
// ==========================================
function LinkPreview({ url, style = {} }) {
    const [preview, setPreview] = useState(null);
    const [imgError, setImgError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!url) return;
        setImgError(false);
        setIsLoading(true);
        let isMounted = true;
        let cleanUrl = url.trim();
        if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;
        let hostname = '';
        try { hostname = new URL(cleanUrl).hostname; } catch (e) { hostname = 'link'; }
        const cleanHostname = hostname.replace('www.', '');

        if (isMounted) setPreview({ title: 'Loading preview...', description: cleanUrl, image: null, publisher: cleanHostname, isLoading: true });

        const fetchPreview = async () => {
            let ytImage = null;
            if (cleanUrl.includes('youtube.com/watch') || cleanUrl.includes('youtu.be/')) {
                const ytIdMatch = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
                if (ytIdMatch && ytIdMatch[1]) ytImage = `https://img.youtube.com/vi/${ytIdMatch[1]}/hqdefault.jpg`;
            }
            try {
                const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(cleanUrl)}&screenshot=true&meta=true`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'success' && data.data) {
                        if (isMounted) {
                            const finalImage = ytImage || data.data.screenshot?.url || data.data.image?.url || data.data.logo?.url || null;
                            setPreview({ title: data.data.title || cleanHostname.toUpperCase(), description: data.data.description || data.data.og?.description || '', image: finalImage, publisher: data.data.publisher || data.data.og?.site_name || cleanHostname, isLoading: false });
                            setIsLoading(false);
                        }
                        return;
                    }
                }
            } catch (err) { }
            if (ytImage && isMounted) {
                setPreview({ title: 'YouTube Video', description: 'Click to watch', image: ytImage, publisher: 'YouTube', isLoading: false });
                setIsLoading(false);
                return;
            }
            if (isMounted) {
                setPreview({ title: cleanHostname.toUpperCase(), description: cleanUrl, image: `https://www.google.com/s2/favicons?domain=${cleanHostname}&sz=128`, publisher: cleanHostname, isLoading: false, isFallback: true });
                setIsLoading(false);
            }
        };
        fetchPreview();
        return () => { isMounted = false; };
    }, [url]);

    if (!preview) return null;
    if (preview.isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: '12px', marginTop: 8, gap: 12, border: '1px solid rgba(255,255,255,0.05)', ...style }}>
                <div style={{ width: 50, height: 50, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ flex: 1 }}>
                    <div style={{ height: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 8, width: '70%', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    <div style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 4, width: '40%', animation: 'pulse 1.5s ease-in-out infinite' }} />
                </div>
            </div>
        );
    }
    const hasImage = preview.image && !imgError && !preview.isFallback;
    return (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'block', marginTop: 8, ...style }}>
            <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a', borderRadius: 8, overflow: 'hidden', border: '1px solid #334155', cursor: 'pointer' }}>
                {hasImage && (
                    <div style={{ width: '100%', height: 120, backgroundColor: '#000', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <img src={preview.image} alt={preview.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgError(true)} onLoad={() => setIsLoading(false)} />
                    </div>
                )}
                <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: '#e2e8f0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{preview.title}</div>
                    <div style={{ fontSize: 11, color: '#10b981', textTransform: 'uppercase', fontWeight: 600 }}>{preview.publisher}</div>
                </div>
            </div>
        </a>
    );
}

// ==========================================
// 🌐 SHARED LANGUAGE OPTIONS
// ==========================================
const LanguageOptions = () => (
    <>
        <option value="en-US">English</option>
        <option value="es-ES">Spanish</option>
        <option value="fr-FR">French</option>
        <option value="de-DE">German</option>
        <option value="it-IT">Italian</option>
        <option value="zh-CN">Chinese</option>
        <option value="ja-JP">Japanese</option>
        <option value="pt-PT">Portuguese (PT)</option>
        <option value="pt-BR">Portuguese (BR)</option>
        <option value="el-GR">Greek</option>
        <option value="ru-RU">Russian</option>
        <option value="ar-SA">Arabic</option>
        <option value="yo-NG">Yoruba</option>
        <option value="nb-NO">Norwegian</option>
    </>
);

// Helper for strict email normalization
const normalizeEmail = (email) => (email || '').trim().toLowerCase();

// ==========================================
// 📝 SUBTITLE OVERLAY COMPONENT (TRN DESIGN)
// ==========================================
function SubtitleOverlay({ subtitle }) {
    if (!subtitle || !subtitle.original) return null;

    const hasTranslation = subtitle.translated && subtitle.translated !== subtitle.original && subtitle.translated !== '...';

    return (
        <div style={{ position: 'absolute', bottom: '80px', left: '30px', zIndex: 20, pointerEvents: 'none', maxWidth: '60%' }}>
            <div style={{ display: 'inline-block', backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(10px)', padding: '15px 25px', borderRadius: '16px', wordWrap: 'break-word', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                <div style={{ fontSize: '12px', color: '#10b981', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5v14M7 5v14M22 9v6M2 9v6" /></svg>
                    Speaking in {subtitle.lang ? subtitle.lang.split('-')[0].toUpperCase() : 'UNKNOWN'}
                </div>
                <div style={{ fontSize: '20px', fontWeight: '500', color: '#f8fafc', marginBottom: hasTranslation ? '6px' : '0', lineHeight: '1.4' }}>
                    {subtitle.original}
                </div>
                {hasTranslation && (
                    <div style={{ fontSize: '16px', color: '#94a3b8' }}>
                        {subtitle.translated}
                    </div>
                )}
            </div>
        </div>
    );
}

// ==========================================
// 📺 LOCAL VIDEO COMPONENT
// ==========================================
function LocalVideo({ stream, subtitle, isPip }) {
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
        <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000', borderRadius: isPip ? '12px' : '16px', overflow: 'hidden' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

            {/* Tag Styling depends on if it's main or PIP */}
            {isPip ? (
                <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>You</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3"><path d="M12 4v16M17 8v8M7 8v8" /></svg>
                </div>
            ) : (
                <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', gap: '10px' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5v14M7 5v14M22 9v6M2 9v6" /></svg>
                        LIVE
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.6)', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', color: '#fff' }}>
                        You
                    </div>
                </div>
            )}

            {!isPip && <SubtitleOverlay subtitle={subtitle} />}
        </div>
    );
}

// ==========================================
// 📺 REMOTE VIDEO COMPONENT
// ==========================================
function RemoteVideo({ stream, email, allKnownUsers, subtitle, isTTSOn, isPip }) {
    const videoRef = useRef(null);
    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl || !stream) return;
        videoEl.srcObject = stream;
        videoEl.play().catch(() => { });
        return () => { if (videoEl) videoEl.srcObject = null; };
    }, [stream, email]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isTTSOn;
        }
    }, [isTTSOn]);

    const safeEmail = normalizeEmail(email);
    const contactName = allKnownUsers.find(c => normalizeEmail(c.email) === safeEmail)?.name || email?.split('@')?.[0] || 'Unknown';

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000', borderRadius: isPip ? '12px' : '16px', overflow: 'hidden' }}>
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

            {/* Tag Styling depends on if it's main or PIP */}
            {isPip ? (
                <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{contactName}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3"><path d="M12 4v16M17 8v8M7 8v8" /></svg>
                </div>
            ) : (
                <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', gap: '10px' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5v14M7 5v14M22 9v6M2 9v6" /></svg>
                        LIVE
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.6)', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', color: '#fff' }}>
                        {contactName}
                    </div>
                </div>
            )}

            {!isPip && <SubtitleOverlay subtitle={subtitle} />}
        </div>
    );
}

// ==========================================
// 🛡️ MAIN CHAT COMPONENT (TRN Redesign)
// ==========================================
function ChatApp({ user, onLogout }) {
    const userEmail = user?.email || '';
    const safeEmail = normalizeEmail(userEmail);
    const displayName = userEmail?.split('@')?.[0] || 'Unknown';

    // ------------------------------------------
    // STATE DECLARATIONS
    // ------------------------------------------
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [members, setMembers] = useState([]);
    const [savedContacts, setSavedContacts] = useState([]);

    const [showContactsPanel, setShowContactsPanel] = useState(true);

    const [isOnlineExpanded, setIsOnlineExpanded] = useState(true);
    const [isMembersExpanded, setIsMembersExpanded] = useState(true);
    const [isContactsExpanded, setIsContactsExpanded] = useState(true);

    const [selectedContact, setSelectedContact] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [transcriptHistory, setTranscriptHistory] = useState([]);
    const [rightPanelTab, setRightPanelTab] = useState('Conversation');

    const [chatInput, setChatInput] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [isVonageCalling, setIsVonageCalling] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const [currentUserMobile, setCurrentUserMobile] = useState(user?.user_metadata?.mobile || '');
    const [showMobileModal, setShowMobileModal] = useState(false);
    const [newMobile, setNewMobile] = useState('');
    const [isUpdatingMobile, setIsUpdatingMobile] = useState(false);

    const [isTranscribing, setIsTranscribing] = useState(false);
    const [spokenLang, setSpokenLang] = useState('en-US');
    const [targetLang, setTargetLang] = useState('es-ES');
    const [subtitles, setSubtitles] = useState({});

    const [showLocalTranslator, setShowLocalTranslator] = useState(false);
    const isLocalTranslateModeRef = useRef(false);
    useEffect(() => { isLocalTranslateModeRef.current = showLocalTranslator; }, [showLocalTranslator]);

    const [hasSavedSettings, setHasSavedSettings] = useState(false);
    const autoStartedRef = useRef(false);

    const [isTTSOn, setIsTTSOn] = useState(false);
    const isTTSOnRef = useRef(false);
    useEffect(() => { isTTSOnRef.current = isTTSOn; }, [isTTSOn]);

    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const selectedContactRef = useRef(selectedContact);
    const channelRef = useRef(null);
    const autoJoinCallerRef = useRef(null);

    const [inVoiceCall, setInVoiceCall] = useState(false);
    const [activeCallEmails, setActiveCallEmails] = useState([]);
    const [incomingCall, setIncomingCall] = useState(null);
    const incomingCallRef = useRef(null);
    const [isCallingOut, setIsCallingOut] = useState(false);
    const [callDuration, setCallDuration] = useState(0);

    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});

    // ------------------------------------------
    // REFS
    // ------------------------------------------
    const onlineUsersRef = useRef([]);
    const membersRef = useRef([]);
    const peersRef = useRef({});
    const pendingCandidatesRef = useRef({});
    const localStreamRef = useRef(null);
    const deepgramSocketRef = useRef(null);
    const ccMediaRecorderRef = useRef(null);
    const isTranscribingRef = useRef(false);
    const spokenLangRef = useRef('en-US');
    const targetLangRef = useRef('es-ES');
    const processSubtitleRef = useRef(null);
    const debounceTimers = useRef({});
    const chatContainerRef = useRef(null);
    const transcriptContainerRef = useRef(null);
    const inCallRef = useRef(false);
    const isEndingRef = useRef(false);
    const lastActionRef = useRef(0);

    // ------------------------------------------
    // EFFECTS
    // ------------------------------------------
    useEffect(() => { onlineUsersRef.current = onlineUsers; }, [onlineUsers]);
    useEffect(() => { membersRef.current = members; }, [members]);
    useEffect(() => { isTranscribingRef.current = isTranscribing; }, [isTranscribing]);
    useEffect(() => { spokenLangRef.current = spokenLang; }, [spokenLang]);
    useEffect(() => { targetLangRef.current = targetLang; }, [targetLang]);
    useEffect(() => { selectedContactRef.current = selectedContact; }, [selectedContact]);
    useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);
    useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);

    useEffect(() => {
        let interval = null;
        if (inVoiceCall) {
            interval = setInterval(() => setCallDuration(prev => prev + 1), 1000);
        } else {
            setCallDuration(0);
        }
        return () => clearInterval(interval);
    }, [inVoiceCall]);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    useEffect(() => {
        const loadSettingsAndProfile = async () => {
            if (!userEmail) return;
            const { data: settingsData } = await supabase
                .from('user_settings')
                .select('spoken_lang, target_lang')
                .eq('user_email', userEmail)
                .maybeSingle();

            if (settingsData) {
                if (settingsData.spoken_lang) setSpokenLang(settingsData.spoken_lang);
                if (settingsData.target_lang) setTargetLang(settingsData.target_lang);
                setHasSavedSettings(true);
            }

            try {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('mobile')
                    .eq('email', userEmail)
                    .maybeSingle();

                if (profileData?.mobile) {
                    setCurrentUserMobile(profileData.mobile);
                }
            } catch (e) { }
        };
        loadSettingsAndProfile();
    }, [userEmail]);

    const saveUserSettings = async (newSpoken, newTarget) => {
        if (!userEmail) return;
        const { error } = await supabase.from('user_settings').upsert({
            user_email: userEmail, spoken_lang: newSpoken, target_lang: newTarget
        }, { onConflict: 'user_email' });

        if (error) {
            alert(`⚠️ Supabase Error: Could not save settings!\n\nDetails: ${error.message}`);
        } else {
            setHasSavedSettings(true);
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const caller = params.get('call_from');
        if (caller && userEmail) {
            setSelectedContact(caller);
            autoJoinCallerRef.current = caller;
            window.history.replaceState({}, document.title, "/");
        }
    }, [userEmail]);

    const METERED_USERNAME = "5e5e334296060e35c8d16fa0";
    const METERED_CREDENTIAL = "QB1S/xQpZ7Bq3llP";
    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: ['turn:standard.relay.metered.ca:80', 'turn:standard.relay.metered.ca:443', 'turn:standard.relay.metered.ca:80?transport=tcp', 'turn:standard.relay.metered.ca:443?transport=tcp'], username: METERED_USERNAME, credential: METERED_CREDENTIAL }
        ],
        iceCandidatePoolSize: 10
    };

    useEffect(() => {
        if ((incomingCall || isCallingOut) && !ringer.isActive()) {
            ringer.start('incoming', () => {
                if (incomingCallRef.current) {
                    if (channelRef.current) {
                        channelRef.current.send({
                            type: 'broadcast',
                            event: 'webrtc-decline',
                            payload: { targetEmail: incomingCallRef.current.sender, sender: safeEmail }
                        });
                    }
                    setIncomingCall(null);
                }
            });
        } else if (!incomingCall && !isCallingOut && ringer.isActive()) {
            ringer.stop();
        }
    }, [incomingCall, isCallingOut]);

    useEffect(() => {
        supabase.from('auth').select('email, name').then(({ data }) => { if (data) setMembers(data); });
        const stored = localStorage.getItem('totalRecallContacts');
        if (stored) try { setSavedContacts(JSON.parse(stored)); } catch (e) { }

        const pc = supabase.channel('public:auth').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'auth' }, p => {
            setMembers(prev => prev.find(m => m.email === p.new.email) ? prev : [...prev, { name: p.new.name || p.new.email.split('@')[0], email: p.new.email }]);
        }).subscribe();

        return () => { supabase.removeChannel(pc); };
    }, []);

    useEffect(() => { if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight; }, [chatMessages, rightPanelTab]);
    useEffect(() => { if (transcriptContainerRef.current) transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight; }, [transcriptHistory, rightPanelTab]);

    useEffect(() => {
        if (!selectedContact || !userEmail) return;
        Promise.all([
            supabase.from('messages').select('*').eq('sender_email', userEmail).eq('receiver_email', selectedContact).limit(50),
            supabase.from('messages').select('*').eq('sender_email', selectedContact).eq('receiver_email', userEmail).limit(50)
        ]).then(([s, r]) => setChatMessages([...(s.data || []), ...(r.data || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))));
    }, [selectedContact, userEmail]);

    const handleImportContacts = async () => {
        if (isImporting) return;
        setIsImporting(true);
        try {
            const supported = ('contacts' in navigator && 'ContactsManager' in window);
            let contactsToProcess = [];

            if (supported) {
                try {
                    const contacts = await navigator.contacts.select(['name', 'email'], { multiple: true });
                    contactsToProcess = contacts.filter(c => c.email && c.email.length > 0).map(c => ({ name: c.name?.[0] || c.email[0].split('@')[0], email: c.email[0] }));
                } catch (err) { alert("Contact selection was cancelled."); setIsImporting(false); return; }
            } else {
                const emailInput = prompt("Enter an email address to send an invite manually:");
                if (emailInput && emailInput.trim().includes('@')) {
                    contactsToProcess = [{ name: emailInput.split('@')[0], email: emailInput.trim() }];
                } else { setIsImporting(false); return; }
            }

            if (contactsToProcess.length === 0) { setIsImporting(false); return; }
            const existingEmails = new Set(savedContacts.map(c => normalizeEmail(c.email)));
            const contactsToAdd = [], contactsAlreadyExist = [];

            contactsToProcess.forEach(contact => {
                if (existingEmails.has(normalizeEmail(contact.email))) contactsAlreadyExist.push(contact);
                else contactsToAdd.push(contact);
            });

            if (contactsToAdd.length > 0) {
                setSavedContacts(prev => {
                    const merged = [...prev, ...contactsToAdd];
                    localStorage.setItem('totalRecallContacts', JSON.stringify(merged));
                    return merged;
                });
            }

            const allContactsToEmail = [...contactsToAdd, ...contactsAlreadyExist];
            if (allContactsToEmail.length > 0) {
                let sentCount = 0;
                for (const contact of allContactsToEmail) {
                    try {
                        const { error } = await supabase.functions.invoke('send-email', {
                            body: { to: contact.email, subject: `📱 ${displayName} wants to connect on TotalRecall!` }
                        });
                        if (!error) sentCount++;
                    } catch (error) { console.error(error); }
                }
                alert(`Added ${contactsToAdd.length} contact(s). Sent ${sentCount} invite(s).`);
            } else alert("All contacts already in list.");
        } finally { setIsImporting(false); }
    };

    const handleRemoveContact = (e, emailToRemove) => {
        e.stopPropagation();
        if (window.confirm('Remove this contact?')) {
            setSavedContacts(prev => {
                const updated = prev.filter(c => c.email !== emailToRemove);
                localStorage.setItem('totalRecallContacts', JSON.stringify(updated));
                return updated;
            });
            if (selectedContact === emailToRemove) setSelectedContact(null);
        }
    };

    const handleUpdateMobile = async () => {
        if (!newMobile.trim()) {
            alert("Please enter a valid mobile number.");
            return;
        }
        setIsUpdatingMobile(true);
        try {
            const { error } = await supabase.from('profiles').update({ mobile: newMobile.trim() }).eq('email', userEmail);
            if (error) throw error;
            alert("Mobile number updated successfully!");
            setCurrentUserMobile(newMobile.trim());
            setShowMobileModal(false);
            setNewMobile('');
        } catch (err) {
            alert("Failed to update mobile number: " + err.message);
        } finally {
            setIsUpdatingMobile(false);
        }
    };

    const getMedia = async () => navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: { echoCancellation: true, noiseSuppression: true } });

    const broadcastMeshState = () => {
        if (!inCallRef.current || !channelRef.current) return;
        const connectedPeers = Object.keys(peersRef.current).filter(e => peersRef.current[e].connectionState === 'connected');
        connectedPeers.forEach(target => {
            channelRef.current.send({
                type: 'broadcast',
                event: 'webrtc-mesh-sync',
                payload: { targetEmail: target, peers: connectedPeers, sender: safeEmail }
            });
        });
    };

    const createPC = (email) => {
        const safeTarget = normalizeEmail(email);

        if (peersRef.current[safeTarget]) peersRef.current[safeTarget].close();
        const pc = new RTCPeerConnection(rtcConfig);
        peersRef.current[safeTarget] = pc;
        setActiveCallEmails(prev => [...new Set([...prev, safeTarget])]);
        if (!pendingCandidatesRef.current[safeTarget]) pendingCandidatesRef.current[safeTarget] = [];

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
        }

        pc.onicecandidate = (e) => {
            if (e.candidate && channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'webrtc-ice',
                    payload: { targetEmail: safeTarget, candidate: { candidate: e.candidate.candidate, sdpMid: e.candidate.sdpMid, sdpMLineIndex: e.candidate.sdpMLineIndex, usernameFragment: e.candidate.usernameFragment }, sender: safeEmail }
                });
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') { setIsCallingOut(false); broadcastMeshState(); }
            else if (pc.connectionState === 'failed') cleanPeer(safeTarget);
            else if (pc.connectionState === 'disconnected') setTimeout(() => { if (peersRef.current[safeTarget]?.connectionState === 'disconnected') cleanPeer(safeTarget); }, 5000);
        };

        pc.ontrack = (event) => {
            if (event.streams && event.streams.length > 0) setRemoteStreams(prev => ({ ...prev, [safeTarget]: event.streams[0] }));
        };
        return pc;
    };

    const cleanPeer = (email) => {
        const safeTarget = normalizeEmail(email);
        if (peersRef.current[safeTarget]) {
            peersRef.current[safeTarget].close();
            delete peersRef.current[safeTarget];
        }
        setRemoteStreams(prev => { const n = { ...prev }; delete n[safeTarget]; return n; });
        setActiveCallEmails(prev => prev.filter(e => normalizeEmail(e) !== safeTarget));
        delete pendingCandidatesRef.current[safeTarget];

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
        setIsMuted(false);
        setIsVideoOff(false);
        setIncomingCall(null);

        stopCC();

        if (broadcast && channelRef.current) {
            Object.keys(peersRef.current).forEach(email => {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'webrtc-end',
                    payload: { targetEmail: normalizeEmail(email), sender: safeEmail }
                });
            });
        }

        Object.values(peersRef.current).forEach(pc => {
            try { pc.close(); } catch (e) { }
        });

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

    const startWebRTCCall = async (email, isAuto = false) => {
        if (!channelRef.current) return;
        inCallRef.current = true;
        if (!isAuto) setIsCallingOut(true);

        try {
            if (!localStreamRef.current) { const s = await getMedia(); localStreamRef.current = s; setLocalStream(s); }
            const pc = createPC(email);
            const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await pc.setLocalDescription(offer);

            const isT = isTranscribingRef.current || hasSavedSettings;

            channelRef.current.send({
                type: 'broadcast',
                event: 'webrtc-offer',
                payload: {
                    targetEmail: normalizeEmail(email),
                    offer: pc.localDescription,
                    sender: safeEmail,
                    isAuto,
                    isTranscribing: isT
                }
            });
            setInVoiceCall(true);
        } catch (err) {
            if (!isAuto) alert("Call failed: " + err.message);
            if (Object.keys(peersRef.current).length === 0) endCall(false);
            else { if (!isAuto) setIsCallingOut(false); cleanPeer(email); }
        }
    };

    const triggerVonageCall = async (emailToCall) => {
        let targetMobile = null;
        const normalizedEmailToCall = normalizeEmail(emailToCall);
        const member = membersRef.current.find(m => normalizeEmail(m.email) === normalizedEmailToCall);
        if (member && member.mobile) {
            targetMobile = member.mobile;
        }

        if (!targetMobile) {
            try {
                const { data: profileData } = await supabase.from('profiles').select('mobile').eq('email', emailToCall).maybeSingle();
                if (profileData?.mobile) targetMobile = profileData.mobile;
            } catch (e) { }
        }

        if (!targetMobile) {
            try {
                const { data: authData } = await supabase.from('auth').select('mobile').eq('email', emailToCall).maybeSingle();
                if (authData?.mobile) targetMobile = authData.mobile;
            } catch (e) { }
        }

        if (!targetMobile) {
            targetMobile = prompt(`Could not automatically find a mobile number for ${emailToCall}.\n\nEnter their mobile number to call (including country code, e.g., 447...):`);
            if (!targetMobile || !targetMobile.trim()) return;
        }

        const cleanNumber = targetMobile.replace(/[^0-9]/g, '');
        if (!cleanNumber || cleanNumber.length < 5) {
            alert("Please provide a valid phone number.");
            return;
        }

        setIsVonageCalling(true);
        try {
            const joinLink = `${window.location.origin}/?call_from=${encodeURIComponent(userEmail)}`;
            const { data, error } = await supabase.functions.invoke('vonage-call', {
                body: { to: cleanNumber, callerEmail: userEmail, joinLink: joinLink }
            });

            if (error) throw new Error(error.message);

            alert(`Call alerting and SMS invite sent to ${cleanNumber}. They will join this chat window shortly.`);

            if (!inCallRef.current) {
                startWebRTCCall(emailToCall, true);
            }
        } catch (err) {
            console.error("Mobile call initiation failed:", err);
            alert(`Call failed. Details: ${err.message}`);
        } finally {
            setIsVonageCalling(false);
        }
    };

    const handleVonageMobileCallUI = () => {
        if (selectedContact) triggerVonageCall(selectedContact);
    };

    const initiateCall = async (email, isAuto = false) => {
        if (!isAuto) {
            if (Date.now() - lastActionRef.current < 2000) return;
            lastActionRef.current = Date.now();

            const normalizedTarget = normalizeEmail(email);
            const isOnline = onlineUsersRef.current.some(u => normalizeEmail(u.email) === normalizedTarget);

            if (!isOnline) {
                await triggerVonageCall(email);
                return;
            }
        }
        startWebRTCCall(email, isAuto);
    };

    const autoAcceptCall = async (call) => {
        try {
            if (!localStreamRef.current) { const s = await getMedia(); localStreamRef.current = s; setLocalStream(s); }
            const pc = createPC(call.sender);
            await pc.setRemoteDescription(new RTCSessionDescription(call.offer));
            const answer = await pc.createAnswer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await pc.setLocalDescription(answer);
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'webrtc-answer',
                    payload: { targetEmail: normalizeEmail(call.sender), answer: pc.localDescription, sender: safeEmail }
                });
            }
            const pending = pendingCandidatesRef.current[normalizeEmail(call.sender)] || [];
            for (const c of pending) { try { await pc.addIceCandidate(c); } catch (e) { } }
            pendingCandidatesRef.current[normalizeEmail(call.sender)] = [];

            if (call.isTranscribing && !isTranscribingRef.current) {
                setIsTranscribing(true);
                startCC();
            }
        } catch (err) { cleanPeer(call.sender); }
    };

    const acceptIncoming = async () => {
        const call = incomingCallRef.current;
        if (!call) return;
        if (Date.now() - lastActionRef.current < 2000) return;
        lastActionRef.current = Date.now();
        inCallRef.current = true;
        if (ringer.isActive()) ringer.stop();
        setIncomingCall(null);

        try {
            if (!localStreamRef.current) { const s = await getMedia(); localStreamRef.current = s; setLocalStream(s); }
            const pc = createPC(call.sender);
            await pc.setRemoteDescription(new RTCSessionDescription(call.offer));
            const answer = await pc.createAnswer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await pc.setLocalDescription(answer);
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'webrtc-answer',
                    payload: { targetEmail: normalizeEmail(call.sender), answer: pc.localDescription, sender: safeEmail }
                });
            }
            const pending = pendingCandidatesRef.current[normalizeEmail(call.sender)] || [];
            for (const c of pending) { try { await pc.addIceCandidate(c); } catch (e) { } }
            pendingCandidatesRef.current[normalizeEmail(call.sender)] = [];
            setInVoiceCall(true);
            setSelectedContact(call.sender);

            if (call.isTranscribing && !isTranscribingRef.current) {
                setIsTranscribing(true);
                startCC();
            }
        } catch (err) {
            alert("Accept failed: " + err.message);
            if (Object.keys(peersRef.current).length === 0) endCall(false);
            else cleanPeer(call.sender);
        }
    };

    const toggleScreenShare = async () => {
        if (!localStreamRef.current || !inCallRef.current) return;
        try {
            if (isScreenSharing) {
                const newCameraStream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } });
                const newVideoTrack = newCameraStream.getVideoTracks()[0];
                if (isVideoOff) newVideoTrack.enabled = false;
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
                screenVideoTrack.onended = () => { if (inCallRef.current) toggleScreenShare(); };
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
        } catch (err) { console.error("Screen share error:", err); }
    };

    const toggleMute = () => {
        if (!localStreamRef.current) return;
        const audioTracks = localStreamRef.current.getAudioTracks();
        if (audioTracks.length > 0) {
            const isCurrentlyEnabled = audioTracks[0].enabled;
            audioTracks.forEach(track => { track.enabled = !isCurrentlyEnabled; });
            setIsMuted(isCurrentlyEnabled);
        }
    };

    const toggleCamera = () => {
        if (!localStreamRef.current) return;
        if (isScreenSharing) { alert("Stop screen sharing first."); return; }
        const videoTracks = localStreamRef.current.getVideoTracks();
        if (videoTracks.length > 0) {
            const isCurrentlyEnabled = videoTracks[0].enabled;
            videoTracks.forEach(track => { track.enabled = !isCurrentlyEnabled; });
            setIsVideoOff(isCurrentlyEnabled);
        }
    };

    const decline = () => {
        if (ringer.isActive()) ringer.stop();
        const call = incomingCallRef.current;
        if (call && channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'webrtc-decline',
                payload: { targetEmail: normalizeEmail(call.sender), sender: safeEmail }
            });
        }
        setIncomingCall(null);
    };

    // ✨ TRANSLATION UTILITY ✨
    const translateText = async (text, sourceLang, targetLang) => {
        if (!text || !text.trim()) return text;
        const sourceBase = sourceLang.startsWith('zh') ? sourceLang : sourceLang.split('-')[0];
        const targetBase = targetLang.startsWith('zh') ? targetLang : targetLang.split('-')[0];
        if (sourceBase === targetBase) return text;

        try {
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceBase}&tl=${targetBase}&dt=t&q=${encodeURIComponent(text)}`);
            if (!res.ok) throw new Error('Google Translation API failed');
            const data = await res.json();
            return data[0].map(item => item[0]).join('');
        } catch (e) {
            console.error("Google Translation API error, attempting fallback:", e);
            try {
                const res2 = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceBase}|${targetBase}`);
                const data2 = await res2.json();
                if (data2.responseData?.translatedText) {
                    return data2.responseData.translatedText;
                }
            } catch (fallbackErr) {
                console.error("Fallback Translation API failed:", fallbackErr);
            }
            return text;
        }
    };

    // ✨ DEEPGRAM LIVE AUDIO STREAMING ✨
    const startCC = async () => {
        if (isTranscribingRef.current) return;
        const DEEPGRAM_API_KEY = '6fad18b20b8cb263a38d87b7e4d4045d71acad96';

        if (DEEPGRAM_API_KEY === 'YOUR_DEEPGRAM_API_KEY') {
            alert("Please insert your Deepgram API Key into the code to use transcription.");
            return;
        }

        setIsTranscribing(true);
        isTranscribingRef.current = true;
        const dgLang = spokenLangRef.current.split('-')[0] || 'en';

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            ccMediaRecorderRef.current = new MediaRecorder(stream);
            const socket = new WebSocket(`wss://api.deepgram.com/v1/listen?model=nova-3&language=${dgLang}&interim_results=true`, ['token', DEEPGRAM_API_KEY]);
            deepgramSocketRef.current = socket;

            socket.onopen = () => {
                ccMediaRecorderRef.current.addEventListener('dataavailable', event => {
                    if (event.data.size > 0 && socket.readyState === 1) {
                        socket.send(event.data);
                    }
                });
                ccMediaRecorderRef.current.start(250);
            };

            socket.onmessage = (message) => {
                const received = JSON.parse(message.data);
                const transcript = received.channel?.alternatives[0]?.transcript;

                if (transcript) {
                    const payload = { sender: safeEmail, text: transcript, lang: spokenLangRef.current, isFinal: received.is_final };

                    if (processSubtitleRef.current) processSubtitleRef.current(payload);

                    if (channelRef.current && inCallRef.current) {
                        channelRef.current.send({
                            type: 'broadcast',
                            event: 'webrtc-subtitle',
                            payload
                        });
                    }
                }
            };

            socket.onerror = (error) => { console.error("Deepgram WebSocket Error:", error); };
            socket.onclose = () => {
                if (isTranscribingRef.current) {
                    setIsTranscribing(false);
                    isTranscribingRef.current = false;
                }
            };
        } catch (err) {
            console.error("Microphone access denied or error:", err);
            setIsTranscribing(false);
            isTranscribingRef.current = false;
        }
    };

    const stopCC = () => {
        setIsTranscribing(false);
        isTranscribingRef.current = false;

        if (ccMediaRecorderRef.current && ccMediaRecorderRef.current.state !== 'inactive') {
            ccMediaRecorderRef.current.stop();
            ccMediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }

        if (deepgramSocketRef.current) {
            deepgramSocketRef.current.close();
            deepgramSocketRef.current = null;
        }

        setSubtitles({});
        if (channelRef.current && inCallRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'webrtc-subtitle',
                payload: { sender: safeEmail, text: '', lang: spokenLangRef.current, isFinal: true, clear: true }
            });
        }
    };

    const toggleTranscription = () => {
        if (isTranscribingRef.current) {
            stopCC();
            if (inCallRef.current && channelRef.current) {
                Object.keys(peersRef.current).forEach(peer => {
                    channelRef.current.send({
                        type: 'broadcast',
                        event: 'webrtc-transcribe-off',
                        payload: { targetEmail: normalizeEmail(peer), sender: safeEmail }
                    });
                });
            }
        } else {
            startCC();
            if (inCallRef.current && channelRef.current) {
                Object.keys(peersRef.current).forEach(peer => {
                    channelRef.current.send({
                        type: 'broadcast',
                        event: 'webrtc-transcribe-on',
                        payload: { targetEmail: normalizeEmail(peer), sender: safeEmail }
                    });
                });
            }
        }
    };

    const swapLanguages = () => {
        const newSpoken = targetLang;
        const newTarget = spokenLang;
        setSpokenLang(newSpoken);
        setTargetLang(newTarget);
        spokenLangRef.current = newSpoken;
        targetLangRef.current = newTarget;
        saveUserSettings(newSpoken, newTarget);

        if (isTranscribingRef.current) {
            stopCC();
            setTimeout(() => { startCC(); }, 300);
        }
    };

    useEffect(() => {
        if (inVoiceCall && hasSavedSettings && !autoStartedRef.current) {
            setIsTTSOn(true);
            if (!isTranscribingRef.current) {
                setIsTranscribing(true);
                startCC();
            }
            autoStartedRef.current = true;
        } else if (!inVoiceCall) {
            autoStartedRef.current = false;
        }
    }, [inVoiceCall, hasSavedSettings]);

    useEffect(() => {
        processSubtitleRef.current = async (payload) => {
            const { sender, text, lang, isFinal, clear } = payload;
            if (!inCallRef.current && !isLocalTranslateModeRef.current) return;

            if (clear) {
                setSubtitles(prev => { const n = { ...prev }; delete n[sender]; return n; });
                return;
            }

            const sourceBase = lang.startsWith('zh') ? lang : lang.split('-')[0];
            const targetBase = targetLangRef.current.startsWith('zh') ? targetLangRef.current : targetLangRef.current.split('-')[0];
            const needsTranslation = (sourceBase !== targetBase);

            setSubtitles(prev => ({
                ...prev,
                [sender]: {
                    original: text,
                    translated: needsTranslation ? (prev[sender]?.translated || '...') : text,
                    isFinal,
                    lang
                }
            }));

            if (needsTranslation && text.trim().length > 0) {
                const doTranslate = () => {
                    translateText(text, lang, targetLangRef.current).then(translated => {
                        setSubtitles(prev => {
                            if (prev[sender]) return { ...prev, [sender]: { ...prev[sender], translated, isFinal } };
                            return prev;
                        });

                        if (isFinal) {
                            setTranscriptHistory(prev => [...prev, { id: Date.now() + Math.random(), sender, original: text, translated, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);

                            const shouldSpeak = (sender !== safeEmail) || isLocalTranslateModeRef.current;
                            if (shouldSpeak && isTTSOnRef.current && 'speechSynthesis' in window) {
                                const utterance = new SpeechSynthesisUtterance(translated || text);
                                utterance.lang = targetLangRef.current;
                                window.speechSynthesis.speak(utterance);
                            }
                        }
                    });
                };

                if (isFinal) {
                    clearTimeout(debounceTimers.current[sender]);
                    doTranslate();
                } else {
                    clearTimeout(debounceTimers.current[sender]);
                    debounceTimers.current[sender] = setTimeout(doTranslate, 800);
                }
            } else if (!needsTranslation && isFinal) {
                setTranscriptHistory(prev => [...prev, { id: Date.now() + Math.random(), sender, original: text, translated: text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);

                if (isTTSOnRef.current && text.trim().length > 0 && 'speechSynthesis' in window) {
                    const shouldSpeak = (sender !== safeEmail) || isLocalTranslateModeRef.current;
                    if (shouldSpeak) {
                        const utterance = new SpeechSynthesisUtterance(text);
                        utterance.lang = targetLangRef.current;
                        window.speechSynthesis.speak(utterance);
                    }
                }
            }

            if (isFinal) {
                setTimeout(() => {
                    setSubtitles(curr => curr[sender]?.original === text ? { ...curr, [sender]: null } : curr);
                }, 6000);
            }
        };
    }, [safeEmail]);

    useEffect(() => {
        if (!safeEmail) return;
        const ch = supabase.channel('totalrecall-global', {
            config: {
                presence: { key: `u_${safeEmail}` },
                broadcast: { ack: true }
            }
        });
        channelRef.current = ch;

        ch.on('presence', { event: 'sync' }, () => {
            const st = ch.presenceState();
            const users = [];
            for (const k in st) {
                const p = st[k]?.[0];
                if (p?.email && normalizeEmail(p.email) !== safeEmail && !users.find(u => normalizeEmail(u.email) === normalizeEmail(p.email))) {
                    users.push({ email: p.email });
                }
            }
            setOnlineUsers(users);
        });

        ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, p => {
            const newSender = normalizeEmail(p.new.sender_email);
            const newReceiver = normalizeEmail(p.new.receiver_email);
            const selected = normalizeEmail(selectedContactRef.current);

            if ((newSender === selected && newReceiver === safeEmail) ||
                (newSender === safeEmail && newReceiver === selected)) {
                setChatMessages(prev => prev.find(m => m.id === p.new.id) ? prev : [...prev, p.new]);
            }
        });

        ch.on('broadcast', { event: 'webrtc-subtitle' }, ({ payload }) => {
            if (normalizeEmail(payload.sender) !== safeEmail && processSubtitleRef.current) {
                processSubtitleRef.current(payload);
            }
        });

        ch.on('broadcast', { event: 'webrtc-transcribe-on' }, ({ payload }) => {
            if (normalizeEmail(payload.targetEmail) === safeEmail && inCallRef.current && !isTranscribingRef.current) {
                setIsTranscribing(true);
                startCC();
            }
        });

        ch.on('broadcast', { event: 'webrtc-transcribe-off' }, ({ payload }) => {
            if (normalizeEmail(payload.targetEmail) === safeEmail && inCallRef.current && isTranscribingRef.current) {
                stopCC();
            }
        });

        ch.on('broadcast', { event: 'webrtc-offer' }, async ({ payload }) => {
            if (normalizeEmail(payload.targetEmail) !== safeEmail) return;
            const senderNormalized = normalizeEmail(payload.sender);

            if (peersRef.current[senderNormalized]) {
                try {
                    await peersRef.current[senderNormalized].setRemoteDescription(new RTCSessionDescription(payload.offer));
                    const ans = await peersRef.current[senderNormalized].createAnswer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
                    await peersRef.current[senderNormalized].setLocalDescription(ans);
                    ch.send({ type: 'broadcast', event: 'webrtc-answer', payload: { targetEmail: senderNormalized, answer: ans, sender: safeEmail } });
                } catch (e) { }
                return;
            }
            if (inCallRef.current) autoAcceptCall(payload);
            else setIncomingCall(payload);
        });

        ch.on('broadcast', { event: 'webrtc-answer' }, async ({ payload }) => {
            if (normalizeEmail(payload.targetEmail) !== safeEmail) return;
            setIsCallingOut(false);
            const senderNormalized = normalizeEmail(payload.sender);
            const pc = peersRef.current[senderNormalized];

            if (pc && pc.signalingState === 'have-local-offer') {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
                    const pending = pendingCandidatesRef.current[senderNormalized] || [];
                    for (const c of pending) { try { await pc.addIceCandidate(c); } catch (e) { } }
                    pendingCandidatesRef.current[senderNormalized] = [];
                } catch (e) { }
            }
        });

        ch.on('broadcast', { event: 'webrtc-ice' }, async ({ payload }) => {
            if (normalizeEmail(payload.targetEmail) !== safeEmail) return;
            const senderNormalized = normalizeEmail(payload.sender);
            const pc = peersRef.current[senderNormalized];
            const candidate = new RTCIceCandidate({ candidate: payload.candidate.candidate, sdpMid: payload.candidate.sdpMid, sdpMLineIndex: payload.candidate.sdpMLineIndex, usernameFragment: payload.candidate.usernameFragment });

            if (pc?.remoteDescription) { try { await pc.addIceCandidate(candidate); } catch (e) { } }
            else {
                if (!pendingCandidatesRef.current[senderNormalized]) pendingCandidatesRef.current[senderNormalized] = [];
                pendingCandidatesRef.current[senderNormalized].push(candidate);
            }
        });

        ch.on('broadcast', { event: 'webrtc-mesh-sync' }, ({ payload }) => {
            if (normalizeEmail(payload.targetEmail) !== safeEmail || !inCallRef.current) return;
            payload.peers.forEach(peer => {
                const peerNorm = normalizeEmail(peer);
                if (peerNorm !== safeEmail && !peersRef.current[peerNorm]) {
                    if (safeEmail < peerNorm) startWebRTCCall(peerNorm, true);
                }
            });
        });

        ch.on('broadcast', { event: 'webrtc-decline' }, ({ payload }) => {
            if (normalizeEmail(payload.targetEmail) === safeEmail) {
                setIsCallingOut(false);
                cleanPeer(normalizeEmail(payload.sender));
            }
        });

        ch.on('broadcast', { event: 'webrtc-end' }, ({ payload }) => {
            if (normalizeEmail(payload.targetEmail) === safeEmail) {
                if (normalizeEmail(incomingCallRef.current?.sender) === normalizeEmail(payload.sender)) setIncomingCall(null);
                cleanPeer(normalizeEmail(payload.sender));
            }
        });

        ch.on('broadcast', { event: 'webrtc-request-offer' }, ({ payload }) => {
            if (normalizeEmail(payload.targetEmail) === safeEmail && inCallRef.current) {
                startWebRTCCall(normalizeEmail(payload.sender), true);
            }
        });

        ch.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                try { await ch.track({ email: safeEmail, online: true }); } catch (e) { }

                if (autoJoinCallerRef.current) {
                    const callerToJoin = normalizeEmail(autoJoinCallerRef.current);
                    autoJoinCallerRef.current = null;
                    setTimeout(() => {
                        ch.send({ type: 'broadcast', event: 'webrtc-request-offer', payload: { targetEmail: callerToJoin, sender: safeEmail } });
                    }, 1500);
                }
            }
        });

        return () => { try { ch.untrack(); supabase.removeChannel(ch); } catch (e) { } channelRef.current = null; };
    }, [safeEmail]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];
            mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64AudioMessage = reader.result;
                    if (!selectedContact) return;
                    const { data, error } = await supabase.from('messages').insert([{ sender_email: userEmail, receiver_email: selectedContact, text: `[VOICE]${base64AudioMessage}` }]).select();
                    if (!error && data?.length) setChatMessages(prev => prev.find(m => m.id === data[0].id) ? prev : [...prev, data[0]]);
                };
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) { alert("Could not access microphone."); }
    };

    const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); } };
    const toggleRecording = () => isRecording ? stopRecording() : startRecording();

    const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(e); } };

    const sendMsg = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !selectedContact) return;
        const txt = chatInput; setChatInput(''); setShowEmojiPicker(false);
        const { data, error } = await supabase.from('messages').insert([{ sender_email: userEmail, receiver_email: selectedContact, text: txt }]).select();
        if (!error && data?.length) setChatMessages(prev => prev.find(m => m.id === data[0].id) ? prev : [...prev, data[0]]);
    };

    const handlePaste = async (e) => {
        const items = e.clipboardData?.items; if (!items) return;
        let hasImage = false, imageFile = null;
        for (let i = 0; i < items.length; i++) { if (items[i].type.indexOf("image") !== -1) { hasImage = true; imageFile = items[i].getAsFile(); break; } }
        if (hasImage && imageFile) {
            e.preventDefault();
            let currentText = chatInput.trim(); const pastedText = e.clipboardData.getData('text/plain');
            if (pastedText) currentText = currentText ? (currentText + '\n' + pastedText) : pastedText;
            if (currentText && selectedContact) {
                const { data } = await supabase.from('messages').insert([{ sender_email: userEmail, receiver_email: selectedContact, text: currentText }]).select();
                if (data?.length) setChatMessages(prev => prev.find(m => m.id === data[0].id) ? prev : [...prev, data[0]]);
                setChatInput('');
            }
            const reader = new FileReader();
            reader.onloadend = async () => {
                if (!selectedContact) return;
                const { data } = await supabase.from('messages').insert([{ sender_email: userEmail, receiver_email: selectedContact, text: `[IMAGE]${reader.result}` }]).select();
                if (data?.length) setChatMessages(prev => prev.find(m => m.id === data[0].id) ? prev : [...prev, data[0]]);
            };
            reader.readAsDataURL(imageFile);
        }
    };

    const dispMembers = members.filter(m => normalizeEmail(m.email) !== safeEmail);
    const dispContacts = savedContacts.filter(c => c.email && normalizeEmail(c.email) !== safeEmail);
    const allKnown = [...members, ...savedContacts];

    const activeRemoteEmail = Object.keys(remoteStreams)[0];
    const activeRemoteStream = remoteStreams[activeRemoteEmail];
    const activeContact = selectedContact ? allKnown.find(c => normalizeEmail(c.email) === normalizeEmail(selectedContact)) : null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'Segoe UI, system-ui, sans-serif', overflow: 'hidden' }}>

            <header style={{ height: '60px', backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '1px' }}>
                        <span style={{ color: '#10b981' }}>TRN</span> TOTAL RECALL NETWORK
                    </div>
                    {selectedContact && (
                        <div style={{ borderLeft: '1px solid #334155', paddingLeft: '20px', color: '#e2e8f0', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            Client Sync – Product Roadmap <span style={{ fontSize: '10px' }}>▼</span>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select value={spokenLang} onChange={(e) => { setSpokenLang(e.target.value); saveUserSettings(e.target.value, targetLang); }} style={{ background: 'transparent', color: '#f8fafc', border: 'none', outline: 'none', cursor: 'pointer', appearance: 'none', fontWeight: 'bold' }}>
                            <LanguageOptions />
                        </select>
                        <button onClick={swapLanguages} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0 5px' }}>➔</button>
                        <select value={targetLang} onChange={(e) => { setTargetLang(e.target.value); saveUserSettings(spokenLang, e.target.value); }} style={{ background: 'transparent', color: '#f8fafc', border: 'none', outline: 'none', cursor: 'pointer', appearance: 'none', fontWeight: 'bold' }}>
                            <LanguageOptions />
                        </select>
                    </div>
                    <div style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <span style={{ fontSize: '8px' }}>●</span> Original audio + translated captions <span style={{ color: '#64748b' }}>▼</span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        Secure connection
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#1e293b', padding: '6px 12px', borderRadius: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ef4444', fontWeight: 'bold' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></div> REC
                        </div>
                        <span style={{ fontFamily: 'monospace', color: '#e2e8f0', fontSize: '14px' }}>{formatTime(callDuration)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94a3b8' }}>👥 {activeCallEmails.length + 1}</span>
                        <button style={{ background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}>⊞</button>
                    </div>
                </div>
            </header>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* NARROW LEFT SIDEBAR */}
                <nav style={{ width: '70px', backgroundColor: '#0f172a', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', zIndex: 10 }}>
                    <button style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '24px', cursor: 'pointer', marginBottom: '30px' }}>≡</button>

                    <button onClick={() => setShowContactsPanel(!showContactsPanel)} style={{ background: showContactsPanel ? '#1e293b' : 'transparent', border: showContactsPanel ? '1px solid #334155' : 'none', color: '#38bdf8', borderRadius: '12px', width: '45px', height: '45px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', position: 'relative', marginBottom: '20px' }}>
                        👥
                        {onlineUsers.length > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#10b981', color: '#000', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{onlineUsers.length}</span>}
                    </button>

                    {/* Show avatars for active call participants in sidebar */}
                    {activeCallEmails.map(email => (
                        <div key={email} style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#00a884', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#111', fontWeight: 'bold', marginBottom: '10px', position: 'relative' }}>
                            {email?.charAt(0)?.toUpperCase() || '?'}
                            <span style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', background: '#10b981', borderRadius: '50%', border: '2px solid #0f172a' }}></span>
                        </div>
                    ))}

                    <div style={{ flex: 1 }}></div>

                    {/* Local Translator Button */}
                    <button onClick={() => setShowLocalTranslator(true)} title="Local Translator" style={{ background: 'transparent', border: '1px solid #334155', color: '#f8fafc', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', marginBottom: '15px' }}>
                        🗣️
                    </button>

                    {/* Mobile Number Modal Trigger */}
                    <button onClick={() => setShowMobileModal(true)} title="Change Mobile Number" style={{ background: 'transparent', border: '1px solid #334155', color: '#f8fafc', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', marginBottom: '15px' }}>
                        📱
                    </button>

                    <button onClick={onLogout} title="Logout" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontSize: '18px' }}>⎋</span> Logout
                    </button>
                </nav>

                {/* EXPANDABLE CONTACTS PANEL OVERLAY */}
                {showContactsPanel && (
                    <div style={{ width: '280px', backgroundColor: '#111827', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', position: 'absolute', left: '70px', top: '60px', bottom: 0, zIndex: 9, boxShadow: '4px 0 15px rgba(0,0,0,0.5)' }}>
                        <div style={{ padding: '15px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#10b981', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#000', fontWeight: 'bold' }}>{displayName?.charAt(0)?.toUpperCase() || '?'}</div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{displayName}</span>
                                    {currentUserMobile && <span style={{ fontSize: '11px', color: '#94a3b8' }}>{currentUserMobile}</span>}
                                </div>
                            </div>
                            <button onClick={onLogout} title="Logout" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Logout</button>
                            <button onClick={() => setShowContactsPanel(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginLeft: '10px' }}>✖</button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {/* Online section */}
                            <div onClick={() => setIsOnlineExpanded(!isOnlineExpanded)} style={{ padding: '10px 15px', color: '#64748b', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Online ({onlineUsers.length})</span>
                                <span>{isOnlineExpanded ? '▼' : '▶'}</span>
                            </div>
                            {isOnlineExpanded && onlineUsers.map(u => (
                                <div key={u.email} onClick={() => { setSelectedContact(u.email); setShowContactsPanel(false); }} style={{ padding: '12px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottom: '1px solid #1e293b', background: normalizeEmail(selectedContact) === normalizeEmail(u.email) ? '#1e293b' : 'transparent' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#38bdf8', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '12px', color: '#000', fontWeight: 'bold' }}>{u.email?.charAt(0)?.toUpperCase() || '?'}</div>
                                    <div style={{ fontSize: '14px' }}>{allKnown.find(k => normalizeEmail(k.email) === normalizeEmail(u.email))?.name || u.email?.split('@')?.[0] || 'Unknown'}</div>
                                </div>
                            ))}

                            {/* Members section */}
                            <div onClick={() => setIsMembersExpanded(!isMembersExpanded)} style={{ padding: '10px 15px', color: '#64748b', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Members ({dispMembers.length})</span>
                                <span>{isMembersExpanded ? '▼' : '▶'}</span>
                            </div>
                            {isMembersExpanded && dispMembers.map(c => (
                                <div key={c.email} onClick={() => { setSelectedContact(c.email); setShowContactsPanel(false); }} style={{ padding: '12px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottom: '1px solid #1e293b', background: normalizeEmail(selectedContact) === normalizeEmail(c.email) ? '#1e293b' : 'transparent' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#64748b', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '12px', color: '#fff', fontWeight: 'bold' }}>{(c.name || c.email)?.charAt(0)?.toUpperCase() || '?'}</div>
                                    <div style={{ fontSize: '14px' }}>{c.name?.trim() || c.email?.split('@')?.[0] || 'Unknown'}</div>
                                </div>
                            ))}

                            {/* External Contacts section */}
                            <div onClick={() => setIsContactsExpanded(!isContactsExpanded)} style={{ padding: '10px 15px', color: '#64748b', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                                <span>Contacts ({dispContacts.length})</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button onClick={(e) => { e.stopPropagation(); handleImportContacts(); }} disabled={isImporting} style={{ background: '#1e293b', border: '1px solid #334155', color: '#10b981', borderRadius: '4px', cursor: isImporting ? 'not-allowed' : 'pointer', padding: '2px 6px', fontSize: '10px' }}>
                                        {isImporting ? '...' : '+ Add'}
                                    </button>
                                    <span>{isContactsExpanded ? '▼' : '▶'}</span>
                                </div>
                            </div>
                            {isContactsExpanded && dispContacts.map(c => (
                                <div key={c.email} onClick={() => { setSelectedContact(c.email); setShowContactsPanel(false); }} style={{ padding: '12px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottom: '1px solid #1e293b', background: normalizeEmail(selectedContact) === normalizeEmail(c.email) ? '#1e293b' : 'transparent' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#64748b', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '12px', color: '#fff', fontWeight: 'bold' }}>{(c.name || c.email)?.charAt(0)?.toUpperCase() || '?'}</div>
                                    <div style={{ flexGrow: 1 }}>
                                        <div style={{ fontSize: '14px' }}>{c.name || c.email?.split('@')?.[0] || 'Unknown'}</div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>{c.email}</div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); handleRemoveContact(e, c.email); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✖</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* MAIN VIDEO AREA */}
                <main style={{ flex: 1, backgroundColor: '#0f172a', position: 'relative', display: 'flex', flexDirection: 'column', padding: '20px' }}>

                    {!selectedContact ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#64748b' }}>
                            <div style={{ fontSize: '60px', marginBottom: '20px' }}>👋</div>
                            <h2 style={{ color: '#f8fafc', marginBottom: '10px' }}>Welcome to TotalRecall</h2>
                            <p>Select a contact from the left menu to start a call or chat.</p>
                        </div>
                    ) : (
                        <div style={{ flex: 1, backgroundColor: '#000', borderRadius: '16px', position: 'relative', overflow: 'hidden', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column' }}>

                            {/* Call Prompt if not in call */}
                            {!inVoiceCall && (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 15, background: 'rgba(15, 23, 42, 0.8)' }}>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#10b981', color: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '32px', fontWeight: 'bold', marginBottom: '20px' }}>
                                        {activeContact?.name?.charAt(0)?.toUpperCase() || selectedContact?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <h2 style={{ margin: '0 0 10px 0' }}>{activeContact?.name || selectedContact?.split('@')?.[0] || 'Unknown'}</h2>
                                    <p style={{ color: '#94a3b8', marginBottom: '30px' }}>{selectedContact}</p>
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <button onClick={() => initiateCall(selectedContact)} style={{ padding: '12px 30px', background: '#10b981', color: '#000', border: 'none', borderRadius: '30px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
                                            Start Video Call
                                        </button>
                                        <button onClick={handleVonageMobileCallUI} disabled={isVonageCalling} style={{ padding: '12px 30px', background: 'transparent', color: '#38bdf8', border: '2px solid #38bdf8', borderRadius: '30px', fontSize: '16px', fontWeight: 'bold', cursor: isVonageCalling ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            📞 {isVonageCalling ? 'Calling...' : 'Call Mobile'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* MAIN VIDEO (Remote preferred, fallback to Local) */}
                            {activeRemoteStream ? (
                                <RemoteVideo stream={activeRemoteStream} email={activeRemoteEmail} allKnownUsers={allKnown} subtitle={subtitles[activeRemoteEmail]} isTTSOn={isTTSOn} />
                            ) : (
                                <LocalVideo stream={localStream} subtitle={subtitles[userEmail]} />
                            )}

                            {/* PIP VIDEO (Local if remote is active) */}
                            {activeRemoteStream && localStream && (
                                <div style={{ position: 'absolute', top: '20px', right: '20px', width: '220px', height: '150px', borderRadius: '12px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)', background: '#111', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 10 }}>
                                    <LocalVideo stream={localStream} subtitle={null} isPip={true} />
                                </div>
                            )}

                            {/* Main Video Label (Only show if waiting) */}
                            {inVoiceCall && !activeRemoteStream && (
                                <div style={{ position: 'absolute', top: '20px', left: '20px', background: 'rgba(0,0,0,0.6)', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
                                    <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%' }}></div> LIVE</span>
                                    <span>Waiting for others...</span>
                                </div>
                            )}

                            {/* BOTTOM CONTROL PILL */}
                            {inVoiceCall && (
                                <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '10px', background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)', padding: '10px', borderRadius: '40px', border: '1px solid rgba(255,255,255,0.05)', alignItems: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 30 }}>

                                    {/* Captions Toggle */}
                                    <button onClick={toggleTranscription} style={{ background: isTranscribing ? '#065f46' : 'transparent', border: isTranscribing ? '1px solid #10b981' : '1px solid transparent', color: isTranscribing ? '#10b981' : '#94a3b8', borderRadius: '30px', padding: '6px 16px', display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                                        <div style={{ background: isTranscribing ? '#10b981' : '#334155', color: isTranscribing ? '#065f46' : '#94a3b8', padding: '2px 6px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold' }}>CC</div>
                                        <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                                            <div style={{ fontSize: '12px', fontWeight: '600' }}>Captions</div>
                                            <div style={{ fontSize: '10px' }}>{isTranscribing ? 'ON' : 'OFF'}</div>
                                        </div>
                                    </button>

                                    {/* Mic Toggle */}
                                    <button onClick={toggleMute} style={{ background: 'transparent', border: 'none', color: isMuted ? '#ef4444' : '#f8fafc', padding: '6px 12px', display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                                        <div style={{ fontSize: '18px' }}>{isMuted ? '🔇' : '🎙️'}</div>
                                        <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#f8fafc' }}>Mic</div>
                                            <div style={{ fontSize: '10px', color: isMuted ? '#ef4444' : '#10b981' }}>{isMuted ? 'OFF' : 'ON'} <span style={{ color: '#64748b' }}>▼</span></div>
                                        </div>
                                    </button>

                                    {/* Camera Toggle */}
                                    <button onClick={toggleCamera} style={{ background: 'transparent', border: 'none', color: isVideoOff ? '#ef4444' : '#f8fafc', padding: '6px 12px', display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                                        <div style={{ fontSize: '18px' }}>{isVideoOff ? '📷' : '📸'}</div>
                                        <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#f8fafc' }}>Camera</div>
                                            <div style={{ fontSize: '10px', color: isVideoOff ? '#ef4444' : '#10b981' }}>{isVideoOff ? 'OFF' : 'ON'} <span style={{ color: '#64748b' }}>▼</span></div>
                                        </div>
                                    </button>

                                    {/* Participants */}
                                    <button style={{ background: 'transparent', border: 'none', color: '#f8fafc', padding: '6px 12px', display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', borderLeft: '1px solid #334155', borderRadius: 0 }}>
                                        <div style={{ fontSize: '18px' }}>👥</div>
                                        <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                                            <div style={{ fontSize: '12px', fontWeight: '600' }}>Participants</div>
                                            <div style={{ fontSize: '10px', color: '#10b981' }}>{activeCallEmails.length + 1}</div>
                                        </div>
                                    </button>

                                    {/* Share Screen */}
                                    <button onClick={toggleScreenShare} style={{ background: 'transparent', border: 'none', color: '#f8fafc', padding: '6px 12px', display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                                        <div style={{ fontSize: '18px' }}>{isScreenSharing ? '⏹' : '⏏'}</div>
                                        <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                                            <div style={{ fontSize: '12px', fontWeight: '600' }}>Share screen</div>
                                        </div>
                                    </button>

                                    {/* More */}
                                    <button style={{ background: 'transparent', border: 'none', color: '#f8fafc', padding: '6px 12px', display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                                        <div style={{ fontSize: '18px' }}>⋮</div>
                                        <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                                            <div style={{ fontSize: '12px', fontWeight: '600' }}>More</div>
                                        </div>
                                    </button>

                                    {/* End Call */}
                                    <button onClick={() => endCall(true)} style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: '30px', display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', marginLeft: '10px' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                        End call
                                    </button>

                                </div>
                            )}
                        </div>
                    )}
                </main>

                {/* RIGHT SIDEBAR (Chat & Transcript) */}
                <aside style={{ width: isMobile ? '100%' : '380px', backgroundColor: '#0f172a', borderLeft: '1px solid #1e293b', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

                    {/* Tabs */}
                    <div style={{ display: 'flex', padding: '0 20px', borderBottom: '1px solid #1e293b', gap: '20px', marginTop: '15px' }}>
                        <button onClick={() => setRightPanelTab('Conversation')} style={{ background: 'none', border: 'none', color: rightPanelTab === 'Conversation' ? '#10b981' : '#94a3b8', padding: '10px 0', borderBottom: rightPanelTab === 'Conversation' ? '2px solid #10b981' : '2px solid transparent', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            💬 Conversation
                        </button>
                        <button onClick={() => setRightPanelTab('Transcript')} style={{ background: 'none', border: 'none', color: rightPanelTab === 'Transcript' ? '#10b981' : '#94a3b8', padding: '10px 0', borderBottom: rightPanelTab === 'Transcript' ? '2px solid #10b981' : '2px solid transparent', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            ☷ Transcript
                        </button>
                    </div>

                    <div style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600' }}>Live conversation</span>
                        <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 6, height: 6, background: '#10b981', borderRadius: '50%' }}></div> Live</span>
                    </div>

                    {/* Feed Area */}
                    <div ref={rightPanelTab === 'Conversation' ? chatContainerRef : transcriptContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>

                        {rightPanelTab === 'Conversation' && chatMessages.map((m, i) => {
                            const isVoiceMessage = m.text && m.text.startsWith('[VOICE]');
                            const isImageMessage = m.text && m.text.startsWith('[IMAGE]');
                            let content = m.text || '';
                            if (isVoiceMessage) content = m.text.replace('[VOICE]', '');
                            else if (isImageMessage) content = m.text.replace('[IMAGE]', '');
                            const match = !isVoiceMessage && !isImageMessage ? content.match(urlExtractRegex) : null;
                            const firstUrl = match ? match[0] : null;
                            const isMine = normalizeEmail(m.sender_email) === safeEmail;

                            return (
                                <div key={m.id || i} style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '11px', color: '#94a3b8' }}>
                                        <span style={{ fontWeight: 'bold', color: isMine ? '#38bdf8' : '#e2e8f0', fontSize: '13px' }}>{isMine ? 'You' : m.sender_email?.split('@')?.[0] || 'Unknown'}</span>
                                        <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div style={{ color: '#f8fafc', fontSize: '14px', lineHeight: '1.5', wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                                        {isVoiceMessage ? <audio controls src={content} style={{ height: '40px', width: '100%', outline: 'none' }} />
                                            : isImageMessage ? <img src={content} alt="Attachment" style={{ maxWidth: '100%', borderRadius: 8 }} />
                                                : <>{renderTextWithLinks(content)}{firstUrl && <LinkPreview url={firstUrl} />}</>}
                                    </div>
                                </div>
                            );
                        })}

                        {rightPanelTab === 'Transcript' && transcriptHistory.map((t) => {
                            const isMine = normalizeEmail(t.sender) === safeEmail;
                            const senderName = isMine ? 'You' : t.sender?.split('@')?.[0] || 'Unknown';
                            const sourceL = t.lang ? t.lang : (isMine ? spokenLang : 'Remote');
                            const targetL = isMine ? targetLang : spokenLang;

                            return (
                                <div key={t.id} style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '11px', color: '#94a3b8' }}>
                                        <span style={{ fontWeight: 'bold', color: isMine ? '#38bdf8' : '#e2e8f0', fontSize: '13px' }}>{senderName}</span>
                                        <span>{t.time}</span>
                                        <span>• {sourceL.split('-')[0].toUpperCase()}</span>
                                    </div>
                                    <div style={{ color: '#f8fafc', fontSize: '14px', lineHeight: '1.5', marginBottom: '12px' }}>{t.original}</div>

                                    {(t.translated && t.translated !== t.original) && (
                                        <>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '11px', color: '#94a3b8' }}>
                                                <span style={{ fontWeight: 'bold', color: '#10b981', fontSize: '13px' }}>TRN Translation</span>
                                                <span>{t.time}</span>
                                                <span>• {targetL.split('-')[0].toUpperCase()}</span>
                                            </div>
                                            <div style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: '1.5' }}>{t.translated}</div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Chat Input Area (Only visible on Conversation Tab) */}
                    {rightPanelTab === 'Conversation' && selectedContact && (
                        <div style={{ padding: '20px', borderTop: '1px solid #1e293b', background: '#0f172a' }}>
                            <form onSubmit={sendMsg} style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative' }}>
                                <div style={{ display: 'flex', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', padding: '4px', alignItems: 'center' }}>
                                    <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ background: 'none', border: 'none', color: '#94a3b8', padding: '8px', cursor: 'pointer', fontSize: '18px' }}>😊</button>
                                    <button type="button" onClick={toggleRecording} style={{ background: 'none', border: 'none', color: isRecording ? '#ef4444' : '#94a3b8', padding: '8px', cursor: 'pointer', fontSize: '18px' }}>{isRecording ? '⏹' : '🎤'}</button>
                                    <textarea value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={handleKey} onPaste={handlePaste} placeholder={isRecording ? "Recording..." : "Type a message..."} disabled={isRecording} rows={1} style={{ flex: 1, background: 'transparent', border: 'none', color: '#f8fafc', padding: '10px', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
                                    <button type="submit" disabled={!chatInput.trim() && !isRecording} style={{ background: chatInput.trim() ? '#10b981' : 'transparent', color: chatInput.trim() ? '#000' : '#64748b', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: chatInput.trim() ? 'pointer' : 'default', fontWeight: 'bold' }}>Send</button>
                                </div>
                                {showEmojiPicker && <EmojiPicker onSelectEmoji={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />}
                            </form>
                        </div>
                    )}

                    {/* AI Summary Banner (Placeholder for UI accuracy) */}
                    {rightPanelTab === 'Transcript' && (
                        <div style={{ margin: '20px', padding: '15px', background: 'linear-gradient(to right, rgba(16, 185, 129, 0.1), rgba(56, 189, 248, 0.1))', borderRadius: '12px', border: '1px solid #1e293b' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '16px' }}>✨</span>
                                <span style={{ fontWeight: 'bold', fontSize: '14px' }}>AI Summary (Beta) <span style={{ background: '#3b82f6', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', marginLeft: '5px' }}>New</span></span>
                            </div>
                            <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '15px' }}>Get an AI summary and action items from this conversation.</p>
                            <button style={{ width: '100%', background: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                ✨ Generate summary
                            </button>
                        </div>
                    )}

                </aside>
            </div>

            {/* ✨ INCOMING CALL MODAL ✨ */}
            {incomingCall && (
                <div style={{ position: 'fixed', top: '20px', right: '20px', backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', zIndex: 10000, border: '1px solid #10b981', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', width: '300px' }}>
                    <h4 style={{ margin: '0 0 10px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>📹</span> Incoming Call
                    </h4>
                    <p style={{ margin: '0 0 20px', color: '#f8fafc', fontSize: '14px' }}>From: <b style={{ color: '#38bdf8' }}>{incomingCall?.sender?.split('@')?.[0] || 'Unknown'}</b></p>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={acceptIncoming} style={{ flex: 1, backgroundColor: '#10b981', border: 'none', padding: '10px', borderRadius: '6px', color: '#000', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}>Accept</button>
                        <button onClick={decline} style={{ flex: 1, backgroundColor: '#ef4444', border: 'none', padding: '10px', borderRadius: '6px', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}>Decline</button>
                    </div>
                </div>
            )}

            {/* ✨ LOCAL TRANSLATOR OVERLAY ✨ */}
            {showLocalTranslator && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0f172a', zIndex: 10000, display: 'flex', flexDirection: 'column' }}>

                    <div style={{ padding: '15px 20px', backgroundColor: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
                        <h3 style={{ margin: 0, color: '#10b981', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            🗣️ Offline Local Translator
                        </h3>
                        <button onClick={() => { setShowLocalTranslator(false); if (!inCallRef.current) stopCC(); }} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '24px', cursor: 'pointer' }}>✖</button>
                    </div>

                    <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
                        <div style={{ flex: 1, backgroundColor: '#0f172a', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '1px solid #334155' }}>
                            <span style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>They hear ({targetLang})</span>
                            <div style={{ fontSize: '32px', color: '#38bdf8', fontWeight: 'bold', textAlign: 'center' }}>
                                {subtitles[userEmail]?.translated || "..."}
                            </div>
                        </div>

                        <div style={{ flex: 1, backgroundColor: '#0f172a', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '1px solid #334155' }}>
                            <span style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>You say ({spokenLang})</span>
                            <div style={{ fontSize: '24px', color: '#cbd5e1', textAlign: 'center', fontStyle: 'italic' }}>
                                {subtitles[userEmail]?.original || "Listening..."}
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: '20px', backgroundColor: '#1e293b', borderTop: '1px solid #334155' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            <select value={spokenLang} onChange={(e) => { setSpokenLang(e.target.value); spokenLangRef.current = e.target.value; saveUserSettings(e.target.value, targetLang); if (isTranscribingRef.current) { stopCC(); setTimeout(startCC, 300); } }} style={{ padding: '10px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #38bdf8', flex: 1, maxWidth: '150px' }}>
                                <LanguageOptions />
                            </select>

                            <button onClick={swapLanguages} title="Swap Languages" style={{ background: '#10b981', color: '#000', border: 'none', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', fontSize: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>⇄</button>

                            <select value={targetLang} onChange={(e) => { setTargetLang(e.target.value); targetLangRef.current = e.target.value; saveUserSettings(spokenLang, e.target.value); }} style={{ padding: '10px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #10b981', flex: 1, maxWidth: '150px' }}>
                                <LanguageOptions />
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                            <button onClick={toggleTranscription} style={{ flex: 1, maxWidth: '200px', padding: '12px', borderRadius: '24px', backgroundColor: isTranscribing ? '#ef4444' : '#10b981', color: isTranscribing ? 'white' : '#000', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                                {isTranscribing ? '⏹ Stop Listening' : '🎤 Start Listening'}
                            </button>
                            <button onClick={() => setIsTTSOn(!isTTSOn)} style={{ flex: 1, maxWidth: '200px', padding: '12px', borderRadius: '24px', backgroundColor: isTTSOn ? '#065f46' : 'transparent', color: isTTSOn ? 'white' : '#10b981', border: '1px solid #10b981', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                                {isTTSOn ? '🔊 Speaker: ON' : '🔇 Speaker: OFF'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ✨ CHANGE MOBILE NUMBER MODAL ✨ */}
            {showMobileModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', width: '300px', maxWidth: '90%', border: '1px solid #334155', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                        <h3 style={{ color: '#10b981', marginTop: 0, marginBottom: '15px' }}>📱 Change Mobile Number</h3>
                        <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>Enter your new mobile number below to update your profile.</p>
                        <input
                            type="tel"
                            value={newMobile}
                            onChange={(e) => setNewMobile(e.target.value)}
                            placeholder="e.g., +447..."
                            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white', boxSizing: 'border-box', marginBottom: '20px' }}
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => { setShowMobileModal(false); setNewMobile(''); }} style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid #94a3b8', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                            <button onClick={handleUpdateMobile} disabled={isUpdatingMobile} style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#10b981', color: '#000', border: 'none', cursor: isUpdatingMobile ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                                {isUpdatingMobile ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const styleSheet = document.createElement("style");
styleSheet.textContent = `@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }`;
document.head.appendChild(styleSheet);

// ==========================================
// 🛡️ AUTHENTICATION WRAPPER
// ==========================================
export default function App() {
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mobile, setMobile] = useState('');
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [error, setError] = useState('');
    const [isSignupMode, setIsSignupMode] = useState(false);
    const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null));

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user || null);

            // Intercept password recovery flow when they click the email link
            if (event === 'PASSWORD_RECOVERY') {
                const newPassword = prompt("Please enter your new password (minimum 6 characters):");
                if (newPassword && newPassword.length >= 6) {
                    supabase.auth.updateUser({ password: newPassword }).then(({ error }) => {
                        if (error) {
                            alert("Failed to update password: " + error.message);
                        } else {
                            alert("Password updated successfully!");
                        }
                    });
                } else {
                    alert("Password update cancelled or invalid. Please try resetting again if needed.");
                }
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const auth = async (e, type) => {
        e.preventDefault();
        setError('');

        if (type === 'reset') {
            if (!email.trim()) {
                setError("Please enter your email address");
                return;
            }
            setLoading(true);
            try {
                const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                    redirectTo: window.location.origin,
                });
                if (error) throw new Error(error.message);
                setConfirmMessage("We've sent you a password reset link.");
                setShowConfirm(true);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
            return;
        }

        if (type === 'login' && (!email || !password)) {
            setError("Please fill in all fields");
            return;
        }

        if (type === 'signup' && (!email || !password || !mobile.trim())) {
            setError("Please fill in all fields, including your mobile number");
            return;
        }

        if (type === 'signup' && password.length < 6) {
            setError("Password must be at least 6 characters long");
            return;
        }

        setLoading(true);
        try {
            if (type === 'login') {
                const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
                if (error) throw new Error(error.message.includes('Invalid login credentials') ? "Invalid email or password. Please try again." : error.message);
                if (data?.user) setUser(data.user);
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email: email.trim(),
                    password,
                    options: {
                        emailRedirectTo: window.location.origin,
                        data: {
                            name: email.split('@')[0],
                            mobile: mobile.trim()
                        }
                    }
                });

                const isExistingUser = (error && error.message.includes('User already registered')) ||
                    (data?.user && data.user.identities && data.user.identities.length === 0);

                if (isExistingUser) {
                    throw new Error("This email is already registered. Please log in instead.");
                } else if (error) {
                    throw new Error(error.message);
                }

                if (data?.user) {
                    if (data.session) setUser(data.user);
                    else {
                        setConfirmMessage("We've sent you a confirmation link.");
                        setShowConfirm(true);
                        setEmail(''); setPassword(''); setMobile('');
                    }
                }
            }
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    if (user) return <ChatApp user={user} onLogout={() => supabase.auth.signOut()} />;

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'Segoe UI, sans-serif' }}>
            <div style={{ backgroundColor: '#1e293b', padding: 40, borderRadius: 12, width: 350, maxWidth: '90%', textAlign: 'center', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                <h2 style={{ color: '#10b981', marginBottom: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: '900', letterSpacing: '2px' }}>TRN</span> TotalRecall
                </h2>
                {error && <div style={{ backgroundColor: '#ef4444', color: 'white', padding: 10, borderRadius: 6, marginBottom: 15, fontSize: '14px' }}>{error}</div>}

                {showConfirm ? (
                    <div>
                        <h3>✅ Check your email</h3>
                        <p style={{ color: '#94a3b8', marginBottom: 20, fontSize: '14px' }}>{confirmMessage}</p>
                        <button onClick={() => { setShowConfirm(false); setEmail(''); setPassword(''); setMobile(''); setError(''); setIsSignupMode(false); setIsForgotPasswordMode(false); }} style={{ width: '100%', padding: '12px', backgroundColor: '#10b981', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Back to Login</button>
                    </div>
                ) : isForgotPasswordMode ? (
                    <form onSubmit={e => e.preventDefault()}>
                        <p style={{ color: '#94a3b8', marginBottom: 20, fontSize: '14px' }}>Enter your email address to reset your password.</p>
                        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: 15, borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white', boxSizing: 'border-box' }} disabled={loading} />
                        <button onClick={e => auth(e, 'reset')} disabled={loading} style={{ width: '100%', padding: '12px', backgroundColor: '#10b981', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', marginBottom: 10, opacity: loading ? 0.5 : 1 }}>
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                        <button onClick={() => { setIsForgotPasswordMode(false); setError(''); }} disabled={loading} style={{ width: '100%', padding: '12px', backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '6px', fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1 }}>
                            Back to Login
                        </button>
                    </form>
                ) : (
                    <form onSubmit={e => e.preventDefault()}>
                        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: 15, borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white', boxSizing: 'border-box' }} disabled={loading} />

                        {isSignupMode && (
                            <input type="tel" placeholder="Mobile Number (Mandatory)" value={mobile} onChange={e => setMobile(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: 15, borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white', boxSizing: 'border-box' }} disabled={loading} required />
                        )}

                        <input type="password" placeholder="Password (min 6 characters)" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: 20, borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white', boxSizing: 'border-box' }} disabled={loading} />

                        {!isSignupMode ? (
                            <>
                                <button onClick={e => auth(e, 'login')} disabled={loading} style={{ width: '100%', padding: '12px', backgroundColor: '#10b981', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', marginBottom: 10, opacity: loading ? 0.5 : 1 }}>{loading ? 'Loading...' : 'Log In'}</button>
                                <button onClick={() => { setIsSignupMode(true); setError(''); }} disabled={loading} style={{ width: '100%', padding: '12px', backgroundColor: 'transparent', color: '#10b981', border: '1px solid #10b981', borderRadius: '6px', fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1 }}>Sign Up</button>
                                <button onClick={() => { setIsForgotPasswordMode(true); setError(''); setIsSignupMode(false); }} style={{ width: '100%', padding: '10px', backgroundColor: 'transparent', color: '#94a3b8', border: 'none', fontSize: '13px', cursor: 'pointer', marginTop: '10px' }} disabled={loading}>
                                    Forgot Password?
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={e => auth(e, 'signup')} disabled={loading} style={{ width: '100%', padding: '12px', backgroundColor: '#10b981', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', marginBottom: 10, opacity: loading ? 0.5 : 1 }}>{loading ? 'Loading...' : 'Create Account'}</button>
                                <button onClick={() => { setIsSignupMode(false); setError(''); }} disabled={loading} style={{ width: '100%', padding: '12px', backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '6px', fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1 }}>Back to Login</button>
                            </>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
}