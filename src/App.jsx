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
                <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        color: '#38bdf8',
                        textDecoration: 'underline',
                        wordBreak: 'break-all'
                    }}
                >
                    {part}
                </a>
            );
        } else if (part) {
            const lines = part.split('\n');
            lines.forEach((line, lineIndex) => {
                if (line) {
                    result.push(<span key={`${i}-${lineIndex}`}>{line}</span>);
                }
                if (lineIndex < lines.length - 1) {
                    result.push(<br key={`${i}-br-${lineIndex}`} />);
                }
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
        '❤️': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️'],
        '👍': ['👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🦾', '🖕', '✍️', '🙇', '💁', '🙋', '🧏', '🙆', '🙅', '🤷', '🤦', '🙎', '🙍', '💇', '💆', '🧖', '💅', '🤳', '💃', '🕺', '👯', '🕴️', '👨‍🦽', '👩‍🦽', '🧑‍🦽', '👨‍🦼', '👩‍🦼', '🧑‍🦼'],
        '👋': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦵', '🦿', '🦶', '👣', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '🫦'],
        '🐱': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊'],
        '🍕': ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🫒', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫘', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪'],
        '🚗': ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛼', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢'],
        '💡': ['💡', '🔦', '🕯️', '🧯', '🪔', '🧨', '💣', '🧲', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️', '🧱', '⛓️', '🧪', '🧫', '🧬', '🔬', '🔭', '📡', '💉', '🩸', '💊', '🩹', '🩺', '🧹', '🧺', '🧻', '🪣', '🧼', '🫧', '🪥', '🧽', '🧴', '🪞', '🪟', '🚰', '🪠', '🪤', '🪣', '🧯'],
        '📱': ['📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '💽', '💾', '💿', '📀', '🧮', '🎥', '📽️', '📺', '📷', '📸', '📹', '📼', '🔍', '🔎', '🕯️', '💡', '🔦', '🏮', '🪔', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📓', '📒', '📃', '📜', '📄', '📰', '🗞️', '📑', '🔖', '📌', '📍', '✂️', '📐', '📏', '🧷', '📎', '🖇️', '📏', '📐', '✒️', '🖊️', '🖋️', '✏️', '🖍️', '🖌️', '🔏', '🔐', '🔒', '🔓']
    };

    const [selectedCategory, setSelectedCategory] = useState('😊');

    const categories = Object.keys(emojiCategories);
    const emojis = emojiCategories[selectedCategory] || [];

    const handleEmojiClick = (emoji) => {
        onSelectEmoji(emoji);
        onClose();
    };

    return (
        <div style={{
            position: 'absolute',
            bottom: '70px',
            left: '10px',
            backgroundColor: '#202c33',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,255,255,0.1)',
            zIndex: 1000,
            width: '320px',
            maxHeight: '350px',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Category tabs */}
            <div style={{
                display: 'flex',
                gap: '4px',
                overflowX: 'auto',
                paddingBottom: '10px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                marginBottom: '10px'
            }}>
                {categories.map(category => (
                    <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        style={{
                            background: selectedCategory === category ? '#2a3942' : 'transparent',
                            border: 'none',
                            color: '#e9edef',
                            fontSize: '20px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            flexShrink: 0
                        }}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {/* Emojis grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(8, 1fr)',
                gap: '2px',
                overflowY: 'auto',
                padding: '4px',
                maxHeight: '220px'
            }}>
                {emojis.map((emoji, index) => (
                    <button
                        key={index}
                        onClick={() => handleEmojiClick(emoji)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            transition: 'background 0.2s',
                            color: '#e9edef'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#2a3942'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ==========================================
// 🖼️ URL PREVIEW COMPONENT - WhatsApp Style
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
        if (!cleanUrl.startsWith('http')) {
            cleanUrl = 'https://' + cleanUrl;
        }

        let hostname = '';
        try {
            hostname = new URL(cleanUrl).hostname;
        } catch (e) {
            hostname = 'link';
        }

        const cleanHostname = hostname.replace('www.', '');

        // Show loading state
        if (isMounted) {
            setPreview({
                title: 'Loading preview...',
                description: cleanUrl,
                image: null,
                publisher: cleanHostname,
                isLoading: true
            });
        }

        const fetchPreview = async () => {
            let ytImage = null;
            if (cleanUrl.includes('youtube.com/watch') || cleanUrl.includes('youtu.be/')) {
                const ytIdMatch = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
                if (ytIdMatch && ytIdMatch[1]) {
                    ytImage = `https://img.youtube.com/vi/${ytIdMatch[1]}/hqdefault.jpg`;
                }
            }

            try {
                // Using microlink.io with screenshot enabled
                const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(cleanUrl)}&screenshot=true&meta=true`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'success' && data.data) {
                        if (isMounted) {
                            const screenshotUrl = data.data.screenshot?.url;
                            const ogImage = data.data.image?.url;
                            const logoUrl = data.data.logo?.url;

                            // Prefer screenshot for visual preview, then OG image, then logo
                            const finalImage = ytImage || screenshotUrl || ogImage || logoUrl || null;

                            setPreview({
                                title: data.data.title || cleanHostname.toUpperCase(),
                                description: data.data.description || data.data.og?.description || '',
                                image: finalImage,
                                publisher: data.data.publisher || data.data.og?.site_name || cleanHostname,
                                isLoading: false
                            });
                            setIsLoading(false);
                        }
                        return;
                    }
                }
            } catch (err) {
                console.log('Preview fetch error:', err);
            }

            // Fallback for YouTube
            if (ytImage && isMounted) {
                setPreview({
                    title: 'YouTube Video',
                    description: 'Click to watch on YouTube',
                    image: ytImage,
                    publisher: 'YouTube',
                    isLoading: false
                });
                setIsLoading(false);
                return;
            }

            // Final fallback - show just the domain
            if (isMounted) {
                setPreview({
                    title: cleanHostname.toUpperCase(),
                    description: cleanUrl,
                    image: `https://www.google.com/s2/favicons?domain=${cleanHostname}&sz=128`,
                    publisher: cleanHostname,
                    isLoading: false,
                    isFallback: true
                });
                setIsLoading(false);
            }
        };

        fetchPreview();

        return () => { isMounted = false; };
    }, [url]);

    if (!preview) return null;

    // Loading state
    if (preview.isLoading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: 12,
                padding: '12px 16px',
                marginTop: 8,
                gap: 12,
                border: '1px solid rgba(255,255,255,0.05)',
                ...style
            }}>
                <div style={{
                    width: 60,
                    height: 60,
                    borderRadius: 8,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    flexShrink: 0,
                    animation: 'pulse 1.5s ease-in-out infinite'
                }} />
                <div style={{ flex: 1 }}>
                    <div style={{
                        height: 12,
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        borderRadius: 4,
                        marginBottom: 8,
                        width: '70%',
                        animation: 'pulse 1.5s ease-in-out infinite'
                    }} />
                    <div style={{
                        height: 10,
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderRadius: 4,
                        width: '40%',
                        animation: 'pulse 1.5s ease-in-out infinite'
                    }} />
                </div>
            </div>
        );
    }

    const hasImage = preview.image && !imgError && !preview.isFallback;

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
                marginTop: 8,
                ...style
            }}
        >
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.06)',
                transition: 'background-color 0.2s ease',
                cursor: 'pointer',
                maxWidth: '100%'
            }}>
                {/* Image section - WhatsApp style */}
                {hasImage && (
                    <div style={{
                        width: '100%',
                        height: 160,
                        backgroundColor: '#1a1a1a',
                        overflow: 'hidden',
                        position: 'relative',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        <img
                            src={preview.image}
                            alt={preview.title || 'Link preview'}
                            referrerPolicy="no-referrer"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block'
                            }}
                            onError={() => setImgError(true)}
                            onLoad={() => setIsLoading(false)}
                        />
                        {/* Gradient overlay for text readability */}
                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: 60,
                            background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)'
                        }} />
                    </div>
                )}

                {/* Content section - WhatsApp style */}
                <div style={{
                    padding: hasImage ? '12px 14px 14px 14px' : '14px 16px',
                    backgroundColor: 'rgba(255,255,255,0.03)'
                }}>
                    {/* Favicon for no image */}
                    {!hasImage && preview.image && (
                        <div style={{ marginBottom: 6 }}>
                            <img
                                src={preview.image}
                                alt=""
                                style={{ width: 20, height: 20, borderRadius: 4 }}
                                onError={(e) => e.target.style.display = 'none'}
                            />
                        </div>
                    )}

                    {/* Title */}
                    <div style={{
                        fontWeight: 600,
                        fontSize: 14,
                        marginBottom: 4,
                        color: '#e9edef',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.4
                    }}>
                        {preview.title}
                    </div>

                    {/* Description */}
                    {preview.description && preview.description !== preview.title && (
                        <div style={{
                            fontSize: 13,
                            color: 'rgba(255,255,255,0.6)',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.5,
                            marginTop: 2,
                            marginBottom: 6
                        }}>
                            {preview.description}
                        </div>
                    )}

                    {/* Publisher/domain - WhatsApp style */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 4
                    }}>
                        <span style={{
                            fontSize: 11,
                            color: 'rgba(255,255,255,0.4)',
                            textTransform: 'uppercase',
                            fontWeight: 500,
                            letterSpacing: '0.3px'
                        }}>
                            {preview.publisher}
                        </span>
                    </div>
                </div>
            </div>
        </a>
    );
}

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
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [isVonageCalling, setIsVonageCalling] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Voice message state
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const selectedContactRef = useRef(selectedContact);
    const channelRef = useRef(null);

    const [inVoiceCall, setInVoiceCall] = useState(false);
    const [activeCallEmails, setActiveCallEmails] = useState([]);
    const [incomingCall, setIncomingCall] = useState(null);
    const incomingCallRef = useRef(null);
    const [isCallingOut, setIsCallingOut] = useState(false);

    // Media Controls State
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

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

    const METERED_USERNAME = "5e5e334296060e35c8d16fa0";
    const METERED_CREDENTIAL = "QB1S/xQpZ7Bq3llP";

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
        supabase.from('auth').select('email, name').then(({ data }) => { if (data) setMembers(data); });
        const stored = localStorage.getItem('totalRecallContacts');
        if (stored) try { setSavedContacts(JSON.parse(stored)); } catch (e) { }
        const pc = supabase.channel('public:auth')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'auth' }, p => {
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

    useEffect(() => {
        if (chatInput) {
            const match = chatInput.match(urlExtractRegex);
            if (match && match[0]) {
                setPreviewUrl(match[0]);
            } else {
                setPreviewUrl(null);
            }
        } else {
            setPreviewUrl(null);
        }
    }, [chatInput]);

    const generatePrettyEmailHTML = (contactName, inviterName, inviterEmail) => {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Invitation to TotalRecall</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 0; }
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
                    .cta-button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0, 168, 132, 0.4); }
                    .features { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
                    .feature-item { background-color: #f8fafc; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #e2e8f0; }
                    .feature-item .icon { font-size: 28px; display: block; margin-bottom: 8px; }
                    .feature-item .label { font-size: 14px; font-weight: 500; color: #0f172a; }
                    .divider { height: 1px; background: #e2e8f0; margin: 24px 0; }
                    .footer { text-align: center; padding: 0 30px 30px 30px; color: #94a3b8; font-size: 14px; }
                    .footer a { color: #00a884; text-decoration: none; }
                    .footer a:hover { text-decoration: underline; }
                    @media (max-width: 480px) {
                        .container { margin: 16px; border-radius: 12px; }
                        .content { padding: 24px 20px; }
                        .header { padding: 30px 20px; }
                        .features { grid-template-columns: 1fr; }
                        .cta-button { width: 100%; text-align: center; padding: 16px 20px; box-sizing: border-box; }
                    }
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
                            <div class="feature-item">
                                <span class="icon">💬</span>
                                <span class="label">Instant Messaging</span>
                            </div>
                            <div class="feature-item">
                                <span class="icon">📹</span>
                                <span class="label">Video Calls</span>
                            </div>
                            <div class="feature-item">
                                <span class="icon">👥</span>
                                <span class="label">Group Chats</span>
                            </div>
                            <div class="feature-item">
                                <span class="icon">🔒</span>
                                <span class="label">Secure &amp; Private</span>
                            </div>
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
                        <p style="margin: 0 0 8px 0;">
                            © ${new Date().getFullYear()} TotalRecall. All rights reserved.
                        </p>
                        <p style="margin: 0; font-size: 13px;">
                            This invitation was sent by ${inviterName}. 
                            <br>If you didn't expect this email, you can safely ignore it.
                        </p>
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
                    console.error("Contact selection failed", err);
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

            const existingEmails = new Set(savedContacts.map(c => c.email?.trim().toLowerCase()));

            const contactsToAdd = [];
            const contactsAlreadyExist = [];

            contactsToProcess.forEach(contact => {
                const emailLower = contact.email.trim().toLowerCase();
                const contactObj = {
                    name: contact.name || contact.email.split('@')[0],
                    email: contact.email.trim()
                };

                if (existingEmails.has(emailLower)) {
                    contactsAlreadyExist.push(contactObj);
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

            const allContactsToEmail = [...contactsToAdd, ...contactsAlreadyExist];

            if (allContactsToEmail.length > 0) {
                let sentCount = 0;
                let failedCount = 0;

                for (const contact of allContactsToEmail) {
                    try {
                        const prettyHTML = generatePrettyEmailHTML(
                            contact.name,
                            displayName,
                            userEmail
                        );

                        const { data, error } = await supabase.functions.invoke('send-email', {
                            body: {
                                to: contact.email,
                                subject: `📱 ${displayName} wants to connect with you on TotalRecall!`,
                                html: prettyHTML
                            }
                        });

                        if (error) {
                            console.error(`Failed to send invite to ${contact.email} via Edge Function:`, error);
                            failedCount++;
                        } else {
                            sentCount++;
                        }
                    } catch (error) {
                        console.error(`Error invoking edge function for ${contact.email}:`, error);
                        failedCount++;
                    }
                }

                let message = `✅ Added ${contactsToAdd.length} new contact(s)\n`;
                message += `📧 Sent ${sentCount} beautiful invitation email(s)\n`;
                if (failedCount > 0) {
                    message += `❌ Failed to send ${failedCount} email(s)`;
                }
                alert(message);
            } else {
                alert("All contacts are already in your list.");
            }
        } catch (error) {
            console.error("Error importing contacts:", error);
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
            if (selectedContact === emailToRemove) {
                setSelectedContact(null);
            }
        }
    };

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

        pc.ontrack = (event) => {
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
        setIsMuted(false);
        setIsVideoOff(false);
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
            if (!isAuto) alert("Call failed: " + err.message);
            if (Object.keys(peersRef.current).length === 0) {
                endCall(false);
            } else {
                if (!isAuto) setIsCallingOut(false);
                cleanPeer(email);
            }
        }
    };

    const handleVonageMobileCall = async () => {
        const phoneNumber = prompt("Enter the mobile number to call (including country code, e.g., 447...):");
        if (!phoneNumber || !phoneNumber.trim()) return;

        const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');

        if (!cleanNumber) {
            alert("Please enter a valid numeric phone number.");
            return;
        }

        setIsVonageCalling(true);
        try {
            const { data, error } = await supabase.functions.invoke('vonage-call', {
                body: {
                    to: cleanNumber,
                    from: '447418372323',
                    callerEmail: userEmail
                }
            });

            if (error) {
                console.error("Vonage edge function error:", error);
                const errorMsg = error.context?.message || error.message || 'Unknown Edge Function Error';
                throw new Error(errorMsg);
            }

            alert(`Initiating call to ${cleanNumber}... Check your device.`);
        } catch (err) {
            console.error("Mobile call initiation failed:", err);
            alert(`Call failed (Check your Supabase Edge Function logs). Details: ${err.message}`);
        } finally {
            setIsVonageCalling(false);
        }
    };

    const autoAcceptCall = async (call) => {
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
            cleanPeer(call.sender);
        }
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

                if (isVideoOff) {
                    newVideoTrack.enabled = false;
                }

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

        if (isScreenSharing) {
            alert("Please stop screen sharing before toggling the camera.");
            return;
        }

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

    // ==========================================
    // 🎤 VOICE MESSAGE LOGIC
    // ==========================================
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64AudioMessage = reader.result;
                    if (!selectedContact) return;

                    const { data, error } = await supabase.from('messages').insert([
                        { sender_email: userEmail, receiver_email: selectedContact, text: `[VOICE]${base64AudioMessage}` }
                    ]).select();

                    if (!error && data?.length) {
                        setChatMessages(prev => prev.find(m => m.id === data[0].id) ? prev : [...prev, data[0]]);
                    }
                };

                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone", err);
            alert("Could not access microphone for recording.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    // ==========================================
    // 😊 EMOJI HANDLER
    // ==========================================
    const handleEmojiSelect = (emoji) => {
        setChatInput(prev => prev + emoji);
        setShowEmojiPicker(false);
        // Focus the textarea after adding emoji
        const textarea = document.querySelector('textarea');
        if (textarea) {
            textarea.focus();
        }
    };

    // ==========================================
    // 📝 SEND MESSAGE & IMAGE PASTE LOGIC
    // ==========================================
    const sendMsg = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !selectedContact) return;
        const txt = chatInput;
        setChatInput('');
        setShowEmojiPicker(false);
        const { data, error } = await supabase.from('messages').insert([
            { sender_email: userEmail, receiver_email: selectedContact, text: txt }
        ]).select();
        if (!error && data?.length) setChatMessages(prev => prev.find(m => m.id === data[0].id) ? prev : [...prev, data[0]]);
    };

    const handlePaste = async (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        let hasImage = false;
        let imageFile = null;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                hasImage = true;
                imageFile = items[i].getAsFile();
                break;
            }
        }

        if (hasImage && imageFile) {
            e.preventDefault();

            let currentText = chatInput.trim();
            const pastedText = e.clipboardData.getData('text/plain');

            if (pastedText) {
                currentText = currentText ? (currentText + '\n' + pastedText) : pastedText;
            }

            if (currentText && selectedContact) {
                const { data: textDataObj, error: textErr } = await supabase.from('messages').insert([
                    { sender_email: userEmail, receiver_email: selectedContact, text: currentText }
                ]).select();

                if (!textErr && textDataObj?.length) {
                    setChatMessages(prev => prev.find(m => m.id === textDataObj[0].id) ? prev : [...prev, textDataObj[0]]);
                }
                setChatInput('');
            }

            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Image = reader.result;
                if (!selectedContact) return;

                const { data, error } = await supabase.from('messages').insert([
                    { sender_email: userEmail, receiver_email: selectedContact, text: `[IMAGE]${base64Image}` }
                ]).select();

                if (!error && data?.length) {
                    setChatMessages(prev => prev.find(m => m.id === data[0].id) ? prev : [...prev, data[0]]);
                }
            };
            reader.readAsDataURL(imageFile);
        }
    };

    const showSidebar = !isMobile || !selectedContact;
    const showChat = !isMobile || !!selectedContact;
    const handleKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMsg(e);
        }
    };

    const safeEmail = userEmail?.toLowerCase() || '';
    const allKnown = [...members, ...savedContacts];
    const dispMembers = members.filter(m => m.email?.toLowerCase() !== safeEmail);

    const dispContacts = savedContacts.filter(c => {
        if (!c.email) return false;
        const cEmailSafe = c.email.trim().toLowerCase();
        if (cEmailSafe === safeEmail) return false;
        return true;
    });

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
                            {isMembersExpanded && dispMembers.map(c => {
                                const isContact = savedContacts.some(sc => sc.email?.trim().toLowerCase() === c.email?.trim().toLowerCase());
                                return (
                                    <div key={c.email} onClick={() => setSelectedContact(c.email)} style={{ padding: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottom: '1px solid #222d34', backgroundColor: selectedContact === c.email ? '#2a3942' : 'transparent' }}>
                                        <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#00a884', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: 15, color: '#111', fontWeight: 'bold' }}>{(c.name || c.email)[0]?.toUpperCase()}</div>
                                        <div style={{ flexGrow: 1 }}>{c.name?.trim() || c.email.split('@')[0]}</div>
                                        {!isContact && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSavedContacts(prev => {
                                                        const newContact = { name: c.name?.trim() || c.email.split('@')[0], email: c.email };
                                                        const updated = [...prev, newContact];
                                                        localStorage.setItem('totalRecallContacts', JSON.stringify(updated));
                                                        return updated;
                                                    });
                                                }}
                                                style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#00a884', cursor: 'pointer', fontSize: '14px', padding: '5px' }}
                                                title="Add to contacts"
                                            >
                                                ➕
                                            </button>
                                        )}
                                    </div>
                                );
                            })}

                            <div onClick={() => setIsContactsExpanded(!isContactsExpanded)} style={{ padding: '10px 15px', backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid #222d34', marginTop: 10 }}>
                                <span style={{ color: '#8696a0', fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' }}>Contacts ({dispContacts.length})</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleImportContacts();
                                        }}
                                        disabled={isImporting}
                                        style={{
                                            backgroundColor: isImporting ? '#1a2a33' : '#2a3942',
                                            color: isImporting ? '#666' : '#00a884',
                                            border: 'none',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            cursor: isImporting ? 'not-allowed' : 'pointer',
                                            fontSize: '11px',
                                            opacity: isImporting ? 0.6 : 1
                                        }}
                                    >
                                        {isImporting ? '⏳ Importing...' : '+ Add External'}
                                    </button>
                                    <span style={{ color: '#8696a0' }}>{isContactsExpanded ? '▼' : '▶'}</span>
                                </div>
                            </div>
                            {isContactsExpanded && dispContacts.map(c => (
                                <div key={c.email} onClick={() => setSelectedContact(c.email)} style={{ padding: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottom: '1px solid #222d34', backgroundColor: selectedContact === c.email ? '#2a3942' : 'transparent' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#64748b', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: 15, color: '#fff', fontWeight: 'bold' }}>{(c.name || c.email)[0]?.toUpperCase()}</div>
                                    <div style={{ flexGrow: 1 }}><div>{c.name || c.email.split('@')[0]}</div><div style={{ fontSize: 12, color: '#8696a0' }}>{c.email}</div></div>
                                    <button
                                        onClick={(e) => handleRemoveContact(e, c.email)}
                                        style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', fontSize: '14px', padding: '5px' }}
                                        title="Remove contact"
                                    >
                                        ❌
                                    </button>
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
                                        <button
                                            onClick={handleVonageMobileCall}
                                            disabled={isVonageCalling}
                                            style={{ backgroundColor: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', padding: '8px 16px', borderRadius: 20, cursor: isVonageCalling ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                                        >
                                            {isVonageCalling ? '📞 Calling...' : '📞 Call Mobile'}
                                        </button>

                                        {!inVoiceCall ? (
                                            <button onClick={() => initiateCall(selectedContact)} style={{ backgroundColor: 'transparent', border: '1px solid #00a884', color: '#00a884', padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold' }}>📹 Call</button>
                                        ) : (
                                            <>
                                                {!activeCallEmails.includes(selectedContact) && (
                                                    <button onClick={() => initiateCall(selectedContact)} style={{ backgroundColor: '#005c4b', border: '1px solid #00a884', color: 'white', padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold' }}>
                                                        ➕ Add
                                                    </button>
                                                )}

                                                {/* Media Control Buttons */}
                                                <button onClick={toggleMute} style={{ backgroundColor: isMuted ? '#ef4444' : 'transparent', border: '1px solid #00a884', color: isMuted ? 'white' : '#00a884', padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold' }}>
                                                    {isMuted ? '🔇 Unmute' : '🎙️ Mute'}
                                                </button>
                                                <button onClick={toggleCamera} style={{ backgroundColor: isVideoOff ? '#ef4444' : 'transparent', border: '1px solid #00a884', color: isVideoOff ? 'white' : '#00a884', padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold' }}>
                                                    {isVideoOff ? '📷 Camera On' : '📸 Camera Off'}
                                                </button>

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
                                    {chatMessages.map((m, i) => {
                                        const isVoiceMessage = m.text && m.text.startsWith('[VOICE]');
                                        const isImageMessage = m.text && m.text.startsWith('[IMAGE]');

                                        let content = m.text || '';
                                        if (isVoiceMessage) content = m.text.replace('[VOICE]', '');
                                        else if (isImageMessage) content = m.text.replace('[IMAGE]', '');

                                        // Extract URL for preview
                                        const match = !isVoiceMessage && !isImageMessage ? content.match(urlExtractRegex) : null;
                                        let firstUrl = match ? match[0] : null;

                                        return (
                                            <div key={m.id || i} style={{ alignSelf: m.sender_email === userEmail ? 'flex-end' : 'flex-start', backgroundColor: m.sender_email === userEmail ? '#005c4b' : '#202c33', padding: '8px 12px', borderRadius: 8, maxWidth: '65%', wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                                                {isVoiceMessage ? (
                                                    <audio controls src={content} style={{ height: '40px', maxWidth: '100%', outline: 'none' }} />
                                                ) : isImageMessage ? (
                                                    <img src={content} alt="Pasted attachment" style={{ maxWidth: '100%', borderRadius: 8 }} />
                                                ) : (
                                                    <>
                                                        {renderTextWithLinks(content)}
                                                        {firstUrl && <LinkPreview url={firstUrl} />}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <form onSubmit={sendMsg} style={{ padding: 15, backgroundColor: '#202c33', display: 'flex', gap: 10, alignItems: 'flex-end', position: 'relative' }}>
                                    {/* Emoji Picker Button */}
                                    <button
                                        type="button"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        title="Add Emoji"
                                        style={{
                                            backgroundColor: 'transparent',
                                            border: '1px solid #8696a0',
                                            borderRadius: '50%',
                                            width: 40,
                                            height: 40,
                                            cursor: 'pointer',
                                            color: '#8696a0',
                                            fontSize: 18,
                                            flexShrink: 0,
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            marginBottom: 4
                                        }}
                                    >
                                        😊
                                    </button>

                                    {/* Voice Recording Button */}
                                    <button
                                        type="button"
                                        onClick={toggleRecording}
                                        title={isRecording ? "Stop Recording" : "Record Voice Message"}
                                        style={{ backgroundColor: isRecording ? '#ef4444' : 'transparent', border: isRecording ? 'none' : '1px solid #8696a0', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', color: isRecording ? 'white' : '#8696a0', fontSize: 18, flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}
                                    >
                                        {isRecording ? '⏹' : '🎤'}
                                    </button>

                                    {/* Emoji Picker */}
                                    {showEmojiPicker && (
                                        <EmojiPicker
                                            onSelectEmoji={handleEmojiSelect}
                                            onClose={() => setShowEmojiPicker(false)}
                                        />
                                    )}

                                    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#2a3942', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                                        {previewUrl && !isRecording && (
                                            <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,0.2)', backgroundColor: '#1e293b' }}>
                                                <div style={{ fontSize: 12, color: '#8696a0', marginBottom: 6, fontWeight: 'bold', textTransform: 'uppercase' }}>Link Preview</div>
                                                <LinkPreview url={previewUrl} style={{ marginTop: 0 }} />
                                            </div>
                                        )}
                                        <textarea
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            onKeyDown={handleKey}
                                            onPaste={handlePaste}
                                            placeholder={isRecording ? "Recording audio..." : "Message or paste image/link..."}
                                            disabled={isRecording}
                                            rows={1}
                                            style={{ width: '100%', padding: 12, backgroundColor: 'transparent', border: 'none', color: 'white', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'Segoe UI, sans-serif' }}
                                        />
                                    </div>

                                    <button type="submit" disabled={!chatInput.trim() && !isRecording} style={{ backgroundColor: chatInput.trim() ? '#00a884' : '#333', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: chatInput.trim() ? 'pointer' : 'default', color: '#111', fontSize: 18, flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>➤</button>
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

// Add CSS animations
const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.3; }
        100% { opacity: 1; }
    }
`;
document.head.appendChild(styleSheet);

// ==========================================
// 🛡️ AUTHENTICATION WRAPPER
// ==========================================
export default function App() {
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [isSignupMode, setIsSignupMode] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user || null));
        return () => subscription.unsubscribe();
    }, []);

    const auth = async (e, type) => {
        e.preventDefault();
        setError('');
        if (!email || !password) {
            setError("Please fill in all fields");
            return;
        }

        if (type === 'signup' && password.length < 6) {
            setError("Password must be at least 6 characters long");
            return;
        }

        setLoading(true);
        try {
            if (type === 'login') {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password
                });

                if (error) {
                    if (error.status === 429) {
                        throw new Error("Too many attempts. Please wait a moment.");
                    }
                    if (error.message.includes('Invalid login credentials')) {
                        throw new Error("Invalid email or password. Please try again.");
                    }
                    throw error;
                }

                if (data?.user) {
                    setUser(data.user);
                }
            } else {
                // Sign up block
                const { data, error } = await supabase.auth.signUp({
                    email: email.trim(),
                    password,
                    options: {
                        emailRedirectTo: window.location.origin,
                        data: {
                            name: email.split('@')[0]
                        }
                    }
                });

                if (error) {
                    if (error.status === 429) {
                        throw new Error("Too many signup attempts. Please wait a moment.");
                    }
                    if (error.message.includes('User already registered')) {
                        throw new Error("This email is already registered. Please log in instead.");
                    }
                    throw error;
                }

                if (data?.user) {
                    if (data.user.identities && data.user.identities.length === 0) {
                        const { error: resendError } = await supabase.auth.resend({
                            type: 'signup',
                            email: email.trim(),
                            options: {
                                emailRedirectTo: window.location.origin,
                            }
                        });

                        if (resendError && resendError.status !== 429) {
                            console.error("Resend confirmation failed:", resendError);
                        }
                    }

                    if (data.session) {
                        setUser(data.user);
                    } else {
                        setShowConfirm(true);
                        setEmail('');
                        setPassword('');
                    }
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (user) return <ChatApp user={user} onLogout={() => supabase.auth.signOut()} />;

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh', backgroundColor: '#111b21', color: 'white', fontFamily: 'Segoe UI' }}>
            <div style={{ backgroundColor: '#202c33', padding: 40, borderRadius: 8, width: 350, maxWidth: '90%', textAlign: 'center' }}>
                <h2 style={{ color: '#00a884', marginBottom: 30 }}>TotalRecall</h2>
                {error && (
                    <div style={{ backgroundColor: '#dc2626', color: 'white', padding: 10, borderRadius: 4, marginBottom: 15, wordWrap: 'break-word' }}>
                        {error}
                    </div>
                )}
                {showConfirm ? (
                    <div>
                        <h3>✅ Check your email</h3>
                        <p style={{ color: '#8696a0', marginBottom: 20 }}>
                            We've sent you a confirmation link. Please check your inbox and click the link to verify your email address.
                        </p>
                        <p style={{ color: '#8696a0', fontSize: 12, marginBottom: 20 }}>
                            After confirming, you can log in with your credentials.
                        </p>
                        <button
                            onClick={() => {
                                setShowConfirm(false);
                                setEmail('');
                                setPassword('');
                                setError('');
                                setIsSignupMode(false);
                            }}
                            style={{ width: '100%', padding: 12, backgroundColor: '#00a884', color: '#111', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            Back to Login
                        </button>
                    </div>
                ) : (
                    <form onSubmit={e => e.preventDefault()}>
                        {isSignupMode && (
                            <div style={{ backgroundColor: '#182229', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', color: '#aebac1', textAlign: 'left', borderLeft: '4px solid #00a884' }}>
                                Enter your email address and a new password. An email will be sent to you for you to confirm your email. The email might go to your spam folder.
                            </div>
                        )}
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            style={{ width: '100%', padding: 12, marginBottom: 15, borderRadius: 4, border: 'none', backgroundColor: '#2a3942', color: 'white', boxSizing: 'border-box' }}
                            disabled={loading}
                        />
                        <input
                            type="password"
                            placeholder="Password (min 6 characters)"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            style={{ width: '100%', padding: 12, marginBottom: 20, borderRadius: 4, border: 'none', backgroundColor: '#2a3942', color: 'white', boxSizing: 'border-box' }}
                            disabled={loading}
                        />

                        {!isSignupMode ? (
                            <>
                                <button
                                    onClick={e => auth(e, 'login')}
                                    disabled={loading}
                                    style={{ width: '100%', padding: 12, backgroundColor: '#00a884', color: '#111', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', marginBottom: 10, opacity: loading ? 0.5 : 1 }}
                                >
                                    {loading ? 'Loading...' : 'Log In'}
                                </button>
                                <button
                                    onClick={() => { setIsSignupMode(true); setError(''); }}
                                    disabled={loading}
                                    style={{ width: '100%', padding: 12, backgroundColor: 'transparent', color: '#00a884', border: '1px solid #00a884', borderRadius: 4, fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1 }}
                                >
                                    Sign Up
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={e => auth(e, 'signup')}
                                    disabled={loading}
                                    style={{ width: '100%', padding: 12, backgroundColor: '#00a884', color: '#111', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', marginBottom: 10, opacity: loading ? 0.5 : 1 }}
                                >
                                    {loading ? 'Loading...' : 'Create Account'}
                                </button>
                                <button
                                    onClick={() => { setIsSignupMode(false); setError(''); }}
                                    disabled={loading}
                                    style={{ width: '100%', padding: 12, backgroundColor: 'transparent', color: '#8696a0', border: '1px solid #8696a0', borderRadius: 4, fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1 }}
                                >
                                    Back to Login
                                </button>
                            </>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
}