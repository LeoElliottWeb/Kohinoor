import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

// ==========================================
// 🚀 TRANSLATION CACHE & GLOBALS
// ==========================================
const translationCache = new Map();
const lastTranslationTime = {};

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
                    style={{ color: '#38bdf8', textDecoration: 'underline', wordBreak: 'break-all' }}
                >
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
        '❤️': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '️', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️'],
        '👍': ['👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🦾', '🖕', '✍️', '🙇', '💁', '🙋', '🧏', '🙆', '🙅', '🤷', '🤦', '🙎', '🙍', '💇', '💆', '🧖', '💅', '🤳', '💃', '🕺', '👯', '🕴️', '👨‍🦽', '👩‍🦽', '🧑‍🦽', '👨‍🦼', '👩‍🦼', '🧑‍🦼'],
        '👋': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦵', '🦿', '🦶', '👣', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '舌', '👄', '🫦'],
        '🐱': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', 'crab', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊'],
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
        <div style={{ position: 'absolute', bottom: '70px', left: '10px', backgroundColor: '#202c33', borderRadius: '12px', padding: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', zIndex: 1000, width: '320px', maxHeight: '350px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '10px' }}>
                {categories.map(category => (
                    <button key={category} onClick={() => setSelectedCategory(category)} style={{ background: selectedCategory === category ? '#2a3942' : 'transparent', border: 'none', color: '#e9edef', fontSize: '20px', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                        {category}
                    </button>
                ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '2px', overflowY: 'auto', padding: '4px', maxHeight: '220px' }}>
                {emojis.map((emoji, index) => (
                    <button key={index} onClick={() => handleEmojiClick(emoji)} style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '4px', borderRadius: '4px', transition: 'background 0.2s', color: '#e9edef' }} onMouseEnter={(e) => e.currentTarget.style.background = '#2a3942'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        {emoji}
                    </button>
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

        if (isMounted) {
            setPreview({ title: 'Loading preview...', description: cleanUrl, image: null, publisher: cleanHostname, isLoading: true });
        }

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
                            const screenshotUrl = data.data.screenshot?.url;
                            const ogImage = data.data.image?.url;
                            const logoUrl = data.data.logo?.url;
                            const finalImage = ytImage || screenshotUrl || ogImage || logoUrl || null;
                            setPreview({ title: data.data.title || cleanHostname.toUpperCase(), description: data.data.description || data.data.og?.description || '', image: finalImage, publisher: data.data.publisher || data.data.og?.site_name || cleanHostname, isLoading: false });
                            setIsLoading(false);
                        }
                        return;
                    }
                }
            } catch (err) { console.log('Preview fetch error:', err); }

            if (ytImage && isMounted) {
                setPreview({ title: 'YouTube Video', description: 'Click to watch on YouTube', image: ytImage, publisher: 'YouTube', isLoading: false });
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
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: '12px 16px', marginTop: 8, gap: 12, border: '1px solid rgba(255,255,255,0.05)', ...style }}>
                <div style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ flex: 1 }}>
                    <div style={{ height: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 8, width: '70%', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    <div style={{ height: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 4, width: '40%', animation: 'pulse 1.5s ease-in-out infinite' }} />
                </div>
            </div>
        );
    }

    const hasImage = preview.image && !imgError && !preview.isFallback;

    return (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'block', marginTop: 8, ...style }}>
            <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', transition: 'background-color 0.2s ease', cursor: 'pointer', maxWidth: '100%' }}>
                {hasImage && (
                    <div style={{ width: '100%', height: 160, backgroundColor: '#1a1a1a', overflow: 'hidden', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <img src={preview.image} alt={preview.title || 'Link preview'} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={() => setImgError(true)} onLoad={() => setIsLoading(false)} />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }} />
                    </div>
                )}
                <div style={{ padding: hasImage ? '12px 14px 14px 14px' : '14px 16px', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    {!hasImage && preview.image && <div style={{ marginBottom: 6 }}><img src={preview.image} alt="" style={{ width: 20, height: 20, borderRadius: 4 }} onError={(e) => e.target.style.display = 'none'} /></div>}
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: '#e9edef', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>{preview.title}</div>
                    {preview.description && preview.description !== preview.title && (
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5, marginTop: 2, marginBottom: 6 }}>{preview.description}</div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 500, letterSpacing: '0.3px' }}>{preview.publisher}</span>
                    </div>
                </div>
            </div>
        </a>
    );
}

// ==========================================
// 📝 SUBTITLE OVERLAY COMPONENT
// ==========================================
function SubtitleOverlay({ subtitle }) {
    if (!subtitle || !subtitle.original) return null;

    const hasTranslation = subtitle.translated && subtitle.translated !== subtitle.original && subtitle.translated !== '...';

    return (
        <div style={{ position: 'absolute', bottom: '20px', left: '0', right: '0', display: 'flex', justifyContent: 'center', zIndex: 20, pointerEvents: 'none', padding: '0 5%' }}>
            <div style={{ display: 'inline-block', backgroundColor: 'rgba(0,0,0,0.75)', padding: '8px 16px', borderRadius: '8px', maxWidth: '100%', wordWrap: 'break-word', textShadow: '1px 1px 2px black', textAlign: 'center' }}>
                {hasTranslation && (
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#38bdf8', marginBottom: '4px' }}>
                        {subtitle.translated}
                    </div>
                )}
                <div style={{
                    fontSize: hasTranslation ? '13px' : '18px',
                    fontWeight: hasTranslation ? 'normal' : 'bold',
                    color: hasTranslation ? '#aebac1' : 'white',
                    fontStyle: hasTranslation ? 'italic' : 'normal'
                }}>
                    {subtitle.original}
                </div>
            </div>
        </div>
    );
}

// ==========================================
// 📺 LOCAL VIDEO COMPONENT
// ==========================================
function LocalVideo({ stream, subtitle }) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl || !stream) return;
        videoEl.srcObject = stream;
        videoEl.muted = true;
        videoEl.play().catch(() => { });
        return () => { if (videoEl) videoEl.srcObject = null; };
    }, [stream]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullScreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    const toggleFullScreen = () => {
        const elem = containerRef.current;
        if (!isFullScreen) {
            if (elem.requestFullscreen) elem.requestFullscreen().catch(e => console.log(e));
            else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        }
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#111', borderRadius: isFullScreen ? '0' : '8px', overflow: 'hidden' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: isFullScreen ? 'contain' : 'cover', backgroundColor: '#000' }} />
            <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '4px', fontSize: 13, color: '#fff', zIndex: 10 }}>You</span>
            <button onClick={toggleFullScreen} title="Toggle Full Screen" style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: 16, color: '#fff', zIndex: 10, cursor: 'pointer' }}>
                {isFullScreen ? '⤡' : '⤢'}
            </button>
            <SubtitleOverlay subtitle={subtitle} />
        </div>
    );
}

// ==========================================
// 📺 REMOTE VIDEO COMPONENT
// ==========================================
function RemoteVideo({ stream, email, allKnownUsers, subtitle, isTTSOn }) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

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

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullScreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    const toggleFullScreen = () => {
        const elem = containerRef.current;
        if (!isFullScreen) {
            if (elem.requestFullscreen) elem.requestFullscreen().catch(e => console.log(e));
            else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        }
    };

    const safeEmail = email?.trim().toLowerCase();
    const contactName = allKnownUsers.find(c => c.email?.trim().toLowerCase() === safeEmail)?.name || email.split('@')[0];

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#111', borderRadius: isFullScreen ? '0' : '8px', overflow: 'hidden' }}>
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: isFullScreen ? 'contain' : 'cover', backgroundColor: '#000' }} />
            <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '4px', fontSize: 13, color: '#fff', zIndex: 10 }}>{contactName}</span>
            <button onClick={toggleFullScreen} title="Toggle Full Screen" style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: 16, color: '#fff', zIndex: 10, cursor: 'pointer' }}>
                {isFullScreen ? '⤡' : '⤢'}
            </button>
            <SubtitleOverlay subtitle={subtitle} />
        </div>
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
        <option value="yo-NG">Yoruba</option>
    </>
);

// ==========================================
// 🛡️ MAIN CHAT COMPONENT
// ==========================================
function ChatApp({ user, onLogout }) {
    const userEmail = user?.email || '';
    const displayName = userEmail.split('@')[0];

    const [onlineUsers, setOnlineUsers] = useState([]);
    const [members, setMembers] = useState([]);
    const [savedContacts, setSavedContacts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const onlineUsersRef = useRef([]);
    useEffect(() => { onlineUsersRef.current = onlineUsers; }, [onlineUsers]);

    const membersRef = useRef([]);
    useEffect(() => { membersRef.current = members; }, [members]);

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

    // Modal & Current Mobile States
    const [currentUserMobile, setCurrentUserMobile] = useState(user?.user_metadata?.mobile || '');
    const [showMobileModal, setShowMobileModal] = useState(false);
    const [newMobile, setNewMobile] = useState('');
    const [isUpdatingMobile, setIsUpdatingMobile] = useState(false);

    // CC, Translation & TTS States
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [spokenLang, setSpokenLang] = useState('en-US');
    const [targetLang, setTargetLang] = useState('es-ES');
    const [subtitles, setSubtitles] = useState({});

    // ✨ Local Translate Mode State
    const [showLocalTranslator, setShowLocalTranslator] = useState(false);
    const isLocalTranslateModeRef = useRef(false);
    useEffect(() => { isLocalTranslateModeRef.current = showLocalTranslator; }, [showLocalTranslator]);

    // Auto-enable state
    const [hasSavedSettings, setHasSavedSettings] = useState(false);

    // Text To Speech Toggle
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

    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});
    const peersRef = useRef({});
    const pendingCandidatesRef = useRef({});
    const localStreamRef = useRef(null);

    // Translation & Deepgram Refs
    const deepgramSocketRef = useRef(null);
    const ccMediaRecorderRef = useRef(null);
    const isTranscribingRef = useRef(false);
    const spokenLangRef = useRef('en-US');
    const targetLangRef = useRef('es-ES');
    const processSubtitleRef = useRef(null);
    const debounceTimers = useRef({});

    useEffect(() => { isTranscribingRef.current = isTranscribing; }, [isTranscribing]);
    useEffect(() => { spokenLangRef.current = spokenLang; }, [spokenLang]);
    useEffect(() => { targetLangRef.current = targetLang; }, [targetLang]);

    const chatContainerRef = useRef(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const inCallRef = useRef(false);
    const isEndingRef = useRef(false);
    const lastActionRef = useRef(0);

    // ==========================================
    // 💾 USER SETTINGS & PROFILE: LOAD & SAVE
    // ==========================================
    useEffect(() => {
        const loadSettingsAndProfile = async () => {
            if (!userEmail) return;

            // Load language settings
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

            // Load current mobile number
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

        const { data, error } = await supabase.from('user_settings').upsert({
            user_email: userEmail,
            spoken_lang: newSpoken,
            target_lang: newTarget
        }, {
            onConflict: 'user_email'
        }).select();

        if (error) {
            console.error('Supabase Save Error:', error);
            alert(`⚠️ Supabase Error: Could not save settings!\n\nDetails: ${error.message}`);
        } else {
            setHasSavedSettings(true);
        }
    };
    // ==========================================

    useEffect(() => { selectedContactRef.current = selectedContact; }, [selectedContact]);
    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);

    // ✨ URL INTERCEPTOR
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

    useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);

    useEffect(() => {
        if ((incomingCall || isCallingOut) && !ringer.isActive()) {
            ringer.start('incoming', () => {
                if (incomingCallRef.current) {
                    if (channelRef.current) {
                        channelRef.current.send({
                            type: 'broadcast',
                            event: 'webrtc-decline',
                            payload: { targetEmail: incomingCallRef.current.sender, sender: userEmail }
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

    useEffect(() => { if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight; }, [chatMessages]);
    useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

    useEffect(() => {
        if (!selectedContact || !userEmail) return;
        Promise.all([
            supabase.from('messages').select('*').eq('sender_email', userEmail).eq('receiver_email', selectedContact).limit(50),
            supabase.from('messages').select('*').eq('sender_email', selectedContact).eq('receiver_email', userEmail).limit(50)
        ]).then(([s, r]) => setChatMessages([...(s.data || []), ...(r.data || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))));
    }, [selectedContact, userEmail]);

    // ✨ BROADCAST LANGUAGE CHANGES TO REMOTE PEER ✨
    const broadcastLanguageChange = (newSpoken, newTarget) => {
        if (inCallRef.current && channelRef.current) {
            Object.keys(peersRef.current).forEach(peer => {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'webrtc-language-update',
                    payload: {
                        targetEmail: peer,
                        sender: userEmail,
                        spokenLang: newSpoken,
                        targetLang: newTarget
                    }
                });
            });
        }
    };

    // ✨ BROADCAST TTS TOGGLE TO REMOTE PEER ✨
    const toggleTTS = () => {
        const nextState = !isTTSOn;
        setIsTTSOn(nextState);
        if (inCallRef.current && channelRef.current) {
            Object.keys(peersRef.current).forEach(peer => {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'webrtc-tts-sync',
                    payload: { targetEmail: peer, sender: userEmail, isTTSOn: nextState }
                });
            });
        }
    };

    const handleImportContacts = async () => {
        if (isImporting) return;
        setIsImporting(true);
        try {
            const supported = ('contacts' in navigator && 'ContactsManager' in window);
            let contactsToProcess = [];

            if (supported) {
                try {
                    const contacts = await navigator.contacts.select(['name', 'email', 'tel'], { multiple: true });
                    contacts.forEach(c => {
                        if (c.email && c.email.length > 0) {
                            contactsToProcess.push({ name: c.name?.[0] || c.email[0].split('@')[0], email: c.email[0].trim(), type: 'email' });
                        } else if (c.tel && c.tel.length > 0) {
                            const cleanNum = c.tel[0].replace(/[^0-9]/g, '');
                            if (cleanNum.length >= 5) {
                                contactsToProcess.push({ name: c.name?.[0] || cleanNum, email: cleanNum, type: 'tel' });
                            }
                        }
                    });
                } catch (err) { alert("Contact selection was cancelled."); setIsImporting(false); return; }
            } else {
                const input = prompt("Enter an email address OR a mobile number (include country code, e.g. 44 for UK) to send an invite:");
                if (!input || !input.trim()) { setIsImporting(false); return; }
                const trimmed = input.trim();

                let contactName = "";
                if (trimmed.includes('@')) {
                    contactName = prompt("Enter a name for this contact:") || trimmed.split('@')[0];
                    contactsToProcess = [{ name: contactName.trim(), email: trimmed, type: 'email' }];
                } else {
                    const cleanNum = trimmed.replace(/[^0-9]/g, '');
                    if (cleanNum.length >= 5) {
                        contactName = prompt("Enter a name for this contact (Required):");
                        if (!contactName || !contactName.trim()) {
                            alert("A name is required when adding a mobile number.");
                            setIsImporting(false);
                            return;
                        }
                        contactsToProcess = [{ name: contactName.trim(), email: cleanNum, type: 'tel' }];
                    } else {
                        alert("Please enter a valid email address or mobile number.");
                        setIsImporting(false); return;
                    }
                }
            }

            if (contactsToProcess.length === 0) { setIsImporting(false); return; }
            const existingEmails = new Set(savedContacts.map(c => c.email?.trim().toLowerCase()));
            const contactsToAdd = [], contactsAlreadyExist = [];

            contactsToProcess.forEach(contact => {
                if (existingEmails.has(contact.email.toLowerCase())) contactsAlreadyExist.push(contact);
                else contactsToAdd.push(contact);
            });

            if (contactsToAdd.length > 0) {
                setSavedContacts(prev => {
                    const mapped = contactsToAdd.map(c => ({ name: c.name, email: c.email }));
                    const merged = [...prev, ...mapped];
                    localStorage.setItem('totalRecallContacts', JSON.stringify(merged));
                    return merged;
                });
            }

            const allContactsToEmail = [...contactsToAdd, ...contactsAlreadyExist];
            if (allContactsToEmail.length > 0) {
                let sentCount = 0;
                for (const contact of allContactsToEmail) {
                    try {
                        if (contact.type === 'email' || contact.email.includes('@')) {
                            const { error } = await supabase.functions.invoke('send-email', {
                                body: { to: contact.email, subject: `📱 ${displayName} wants to connect on TotalRecall!` }
                            });
                            if (!error) sentCount++;
                        } else {
                            const joinLink = `${window.location.origin}`;
                            const { error } = await supabase.functions.invoke('vonage-invite', {
                                body: {
                                    to: contact.email,
                                    inviterEmail: userEmail,
                                    inviterName: displayName,
                                    joinLink: joinLink
                                }
                            });
                            if (!error) sentCount++;
                        }
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
            const { error } = await supabase
                .from('profiles')
                .update({ mobile: newMobile.trim() })
                .eq('email', userEmail);

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
                payload: { targetEmail: target, peers: connectedPeers, sender: userEmail }
            });
        });
    };

    const createPC = (email) => {
        if (peersRef.current[email]) peersRef.current[email].close();
        const pc = new RTCPeerConnection(rtcConfig);
        peersRef.current[email] = pc;
        setActiveCallEmails(prev => [...new Set([...prev, email])]);
        if (!pendingCandidatesRef.current[email]) pendingCandidatesRef.current[email] = [];

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
        }

        pc.onicecandidate = (e) => {
            if (e.candidate && channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'webrtc-ice',
                    payload: { targetEmail: email, candidate: { candidate: e.candidate.candidate, sdpMid: e.candidate.sdpMid, sdpMLineIndex: e.candidate.sdpMLineIndex, usernameFragment: e.candidate.usernameFragment }, sender: userEmail }
                });
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') { setIsCallingOut(false); broadcastMeshState(); }
            else if (pc.connectionState === 'failed') cleanPeer(email);
            else if (pc.connectionState === 'disconnected') setTimeout(() => { if (peersRef.current[email]?.connectionState === 'disconnected') cleanPeer(email); }, 5000);
        };

        pc.ontrack = (event) => {
            if (event.streams && event.streams.length > 0) {
                setRemoteStreams(prev => ({ ...prev, [email]: event.streams[0] }));
            } else {
                // Safely handle audio-only tracks where streams array might be empty
                const stream = new MediaStream([event.track]);
                setRemoteStreams(prev => ({ ...prev, [email]: stream }));
            }
        };
        return pc;
    };

    const cleanPeer = (email) => {
        if (peersRef.current[email]) {
            peersRef.current[email].close();
            delete peersRef.current[email];
        }
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

        stopCC();

        if (broadcast) {
            Object.keys(peersRef.current).forEach(email => {
                if (channelRef.current) {
                    channelRef.current.send({
                        type: 'broadcast',
                        event: 'webrtc-end',
                        payload: { targetEmail: email, sender: userEmail }
                    });
                }
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
                    targetEmail: email,
                    offer: pc.localDescription,
                    sender: userEmail,
                    isAuto,
                    isTranscribing: isT,
                    spokenLang: spokenLangRef.current, // Sync language on call initiation
                    targetLang: targetLangRef.current, // Sync language on call initiation
                    isTTSOn: isTTSOnRef.current // Sync TTS state on call initiation
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

        if (emailToCall && !emailToCall.includes('@') && /^\d+$/.test(emailToCall.replace(/[^0-9]/g, ''))) {
            targetMobile = emailToCall.replace(/[^0-9]/g, '');
        }

        if (!targetMobile) {
            const member = membersRef.current.find(m => m.email?.toLowerCase() === emailToCall.toLowerCase());
            if (member && member.mobile) {
                targetMobile = member.mobile;
            }
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
            targetMobile = prompt(`Could not automatically find a mobile number for ${emailToCall}.\n\nEnter their mobile number to call (including country code, e.g., for a UK number 44 then your number):`);
            if (!targetMobile || !targetMobile.trim()) {
                return;
            }
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

    const initiateCall = async (email, isAuto = false) => {
        if (!isAuto) {
            if (Date.now() - lastActionRef.current < 2000) return;
            lastActionRef.current = Date.now();

            const isOnline = onlineUsersRef.current.some(u => u.email?.toLowerCase() === email.toLowerCase());

            if (!isOnline) {
                await triggerVonageCall(email);
                return;
            }
        }
        startWebRTCCall(email, isAuto);
    };

    const handleVonageMobileCallUI = () => {
        if (selectedContact) triggerVonageCall(selectedContact);
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
                    payload: { targetEmail: call.sender, answer: pc.localDescription, sender: userEmail }
                });
            }
            const pending = pendingCandidatesRef.current[call.sender] || [];
            for (const c of pending) { try { await pc.addIceCandidate(c); } catch (e) { } }
            pendingCandidatesRef.current[call.sender] = [];

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
                    payload: { targetEmail: call.sender, answer: pc.localDescription, sender: userEmail }
                });
            }
            const pending = pendingCandidatesRef.current[call.sender] || [];
            for (const c of pending) { try { await pc.addIceCandidate(c); } catch (e) { } }
            pendingCandidatesRef.current[call.sender] = [];
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
                payload: { targetEmail: call.sender, sender: userEmail }
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

        const cacheKey = `${sourceBase}-${targetBase}-${text.trim()}`;
        if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);

        try {
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceBase}&tl=${targetBase}&dt=t&q=${encodeURIComponent(text.trim())}`);
            if (!res.ok) throw new Error('Google Translation API failed');
            const data = await res.json();
            const translated = data[0].map(item => item[0]).join('');
            translationCache.set(cacheKey, translated);
            return translated;
        } catch (e) {
            console.error("Google Translation API error, attempting fallback:", e);
            try {
                const res2 = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.trim())}&langpair=${sourceBase}|${targetBase}`);
                const data2 = await res2.json();
                if (data2.responseData?.translatedText) {
                    const t = data2.responseData.translatedText;
                    // Prevent Mymemory limit warnings from appearing as translations
                    if (!t.includes("MYMEMORY WARNING") && !t.includes("PLEASE SELECT TWO DISTINCT LANGUAGES")) {
                        translationCache.set(cacheKey, t);
                        return t;
                    }
                }
            } catch (fallbackErr) {
                console.error("Fallback Translation API failed:", fallbackErr);
            }
            return text;
        }
    };

    // ✨ DEEPGRAM LIVE AUDIO STREAMING ✨
    const startCC = async (isReconnect = false) => {
        if (isTranscribingRef.current && !isReconnect) return;

        const DEEPGRAM_API_KEY = '6fad18b20b8cb263a38d87b7e4d4045d71acad96';

        if (DEEPGRAM_API_KEY === 'YOUR_DEEPGRAM_API_KEY') {
            alert("Please insert your Deepgram API Key into the code to use transcription.");
            return;
        }

        if (!isReconnect) {
            setIsTranscribing(true);
            isTranscribingRef.current = true;
        }

        const langMap = {
            'en-US': 'en', 'es-ES': 'es', 'fr-FR': 'fr', 'de-DE': 'de', 'it-IT': 'it',
            'zh-CN': 'zh', 'ja-JP': 'ja', 'pt-PT': 'pt', 'pt-BR': 'pt', 'el-GR': 'el',
            'ru-RU': 'ru', 'yo-NG': 'yo'
        };
        const dgLang = langMap[spokenLangRef.current] || 'en';

        try {
            let stream;
            if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
                stream = new MediaStream([localStreamRef.current.getAudioTracks()[0]]);
            } else {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }

            // Clean up old recorder if this is a reconnect
            if (ccMediaRecorderRef.current && ccMediaRecorderRef.current.state !== 'inactive') {
                try { ccMediaRecorderRef.current.stop(); } catch (e) { }
            }

            ccMediaRecorderRef.current = new MediaRecorder(stream);

            let keepAliveInterval;
            const socket = new WebSocket(`wss://api.deepgram.com/v1/listen?model=nova-3&language=${dgLang}&interim_results=true`, ['token', DEEPGRAM_API_KEY]);
            deepgramSocketRef.current = socket;

            socket.onopen = () => {
                ccMediaRecorderRef.current.addEventListener('dataavailable', event => {
                    if (event.data.size > 0 && socket.readyState === 1) {
                        socket.send(event.data);
                    }
                });
                ccMediaRecorderRef.current.start(250);

                // 🛠️ FIX: Deepgram KeepAlive to stop it dropping when recipient is silent
                keepAliveInterval = setInterval(() => {
                    if (socket.readyState === 1) {
                        socket.send(JSON.stringify({ type: 'KeepAlive' }));
                    }
                }, 5000);
            };

            socket.onmessage = (message) => {
                const received = JSON.parse(message.data);
                const transcript = received.channel?.alternatives[0]?.transcript;

                if (transcript) {
                    const payload = { sender: userEmail, text: transcript, lang: spokenLangRef.current, isFinal: received.is_final };

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

            socket.onerror = (error) => {
                console.error("Deepgram WebSocket Error:", error);
            };

            socket.onclose = () => {
                if (keepAliveInterval) clearInterval(keepAliveInterval);
                // 🛠️ FIX: Auto-reconnect if it dropped unexpectedly
                if (isTranscribingRef.current) {
                    setTimeout(() => {
                        if (isTranscribingRef.current) startCC(true);
                    }, 1000);
                }
            };

        } catch (err) {
            console.error("Microphone access denied or error:", err);
            if (!isReconnect) {
                setIsTranscribing(false);
                isTranscribingRef.current = false;
            }
        }
    };

    const stopCC = () => {
        setIsTranscribing(false);
        isTranscribingRef.current = false;

        if (ccMediaRecorderRef.current && ccMediaRecorderRef.current.state !== 'inactive') {
            try { ccMediaRecorderRef.current.stop(); } catch (e) { }
            // Stop tracks only if they were newly created (not the main call track)
            ccMediaRecorderRef.current.stream.getTracks().forEach(track => {
                const isMainTrack = localStreamRef.current?.getTracks().includes(track);
                if (!isMainTrack) {
                    track.stop();
                }
            });
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
                payload: { sender: userEmail, text: '', lang: spokenLangRef.current, isFinal: true, clear: true }
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
                        payload: { targetEmail: peer, sender: userEmail }
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
                        payload: { targetEmail: peer, sender: userEmail }
                    });
                });
            }
        }
    };

    // ✨ LANGUAGE SWAP UTILITY FOR LOCAL TRANSLATOR ✨
    const swapLanguages = () => {
        const newSpoken = targetLang;
        const newTarget = spokenLang;
        setSpokenLang(newSpoken);
        setTargetLang(newTarget);
        spokenLangRef.current = newSpoken;
        targetLangRef.current = newTarget;
        saveUserSettings(newSpoken, newTarget);
        broadcastLanguageChange(newSpoken, newTarget);

        if (isTranscribingRef.current) {
            stopCC();
            setTimeout(() => {
                startCC();
            }, 300);
        }
    };

    const autoStartedRef = useRef(false);
    useEffect(() => {
        if (inVoiceCall && hasSavedSettings && !autoStartedRef.current) {
            if (!isTranscribingRef.current) {
                setIsTranscribing(true);
                startCC();
            }
            autoStartedRef.current = true;
        } else if (!inVoiceCall) {
            autoStartedRef.current = false;
        }
    }, [inVoiceCall, hasSavedSettings]);

    // ✨ CRITICAL FIX FOR TARGET TRANSLATION & DISPLAY ✨
    useEffect(() => {
        processSubtitleRef.current = async (payload) => {
            const { sender, text, lang, isFinal, clear } = payload;

            if (!inCallRef.current && !isLocalTranslateModeRef.current) return;

            if (clear) {
                setSubtitles(prev => { const n = { ...prev }; delete n[sender]; return n; });
                return;
            }

            // 🛠️ FIX: ALWAYS translate text to the opposite person's language.
            // When YOU speak, you translate it to their language so you can see what they receive.
            // When THEY speak, you translate it to your language so you understand them.
            const translateToLang = sender === userEmail ? targetLangRef.current : spokenLangRef.current;
            const sourceBase = lang.startsWith('zh') ? lang : lang.split('-')[0];
            const targetBase = translateToLang.startsWith('zh') ? translateToLang : translateToLang.split('-')[0];
            const needsTranslation = (sourceBase !== targetBase);

            setSubtitles(prev => ({
                ...prev,
                [sender]: {
                    original: text,
                    translated: needsTranslation ? (prev[sender]?.translated || '...') : text,
                    isFinal
                }
            }));

            if (needsTranslation && text.trim().length > 0) {
                const doTranslate = () => {
                    translateText(text, lang, translateToLang).then(translated => {
                        setSubtitles(prev => {
                            if (prev[sender]) {
                                return { ...prev, [sender]: { ...prev[sender], translated, isFinal } };
                            }
                            return prev;
                        });

                        const shouldSpeak = (sender !== userEmail) || isLocalTranslateModeRef.current;
                        if (isFinal && shouldSpeak && isTTSOnRef.current && 'speechSynthesis' in window) {
                            const utterance = new SpeechSynthesisUtterance(translated || text);
                            utterance.lang = translateToLang;
                            window.speechSynthesis.speak(utterance);
                        }
                    });
                };

                const now = Date.now();
                const lastTime = lastTranslationTime[sender] || 0;

                // 🛠️ FIX: Smarter throttling logic
                if (isFinal) {
                    clearTimeout(debounceTimers.current[sender]);
                    doTranslate();
                    lastTranslationTime[sender] = now;
                } else {
                    // Update interim translations at most every 1.5 seconds to prevent rate limits
                    if (now - lastTime > 1500) {
                        doTranslate();
                        lastTranslationTime[sender] = now;
                    }
                    clearTimeout(debounceTimers.current[sender]);
                    debounceTimers.current[sender] = setTimeout(() => {
                        doTranslate();
                        lastTranslationTime[sender] = Date.now();
                    }, 800);
                }
            } else if (!needsTranslation && isFinal && isTTSOnRef.current && text.trim().length > 0 && 'speechSynthesis' in window) {
                const shouldSpeak = (sender !== userEmail) || isLocalTranslateModeRef.current;
                if (shouldSpeak) {
                    const utterance = new SpeechSynthesisUtterance(text);
                    utterance.lang = translateToLang;
                    window.speechSynthesis.speak(utterance);
                }
            }

            if (isFinal) {
                setTimeout(() => {
                    setSubtitles(curr => curr[sender]?.original === text ? { ...curr, [sender]: null } : curr);
                }, 6000);
            }
        };
    }, [userEmail]);

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

        ch.on('broadcast', { event: 'webrtc-subtitle' }, ({ payload }) => {
            if (payload.sender !== userEmail && processSubtitleRef.current) {
                processSubtitleRef.current(payload);
            }
        });

        ch.on('broadcast', { event: 'webrtc-transcribe-on' }, ({ payload }) => {
            if (payload.targetEmail === userEmail && inCallRef.current && !isTranscribingRef.current) {
                setIsTranscribing(true);
                startCC();
            }
        });

        ch.on('broadcast', { event: 'webrtc-transcribe-off' }, ({ payload }) => {
            if (payload.targetEmail === userEmail && inCallRef.current && isTranscribingRef.current) {
                stopCC();
            }
        });

        ch.on('broadcast', { event: 'webrtc-language-update' }, ({ payload }) => {
            if (payload.targetEmail === userEmail && inCallRef.current) {
                const newSpoken = payload.targetLang;
                const newTarget = payload.spokenLang;

                setSpokenLang(newSpoken);
                setTargetLang(newTarget);
                spokenLangRef.current = newSpoken;
                targetLangRef.current = newTarget;
                saveUserSettings(newSpoken, newTarget);

                if (isTranscribingRef.current) {
                    stopCC();
                    setTimeout(() => {
                        startCC();
                    }, 300);
                }
            }
        });

        // ✨ HANDLE REAL-TIME TTS SYNC FROM REMOTE PEER ✨
        ch.on('broadcast', { event: 'webrtc-tts-sync' }, ({ payload }) => {
            if (payload.targetEmail === userEmail && inCallRef.current) {
                setIsTTSOn(payload.isTTSOn);
            }
        });

        ch.on('broadcast', { event: 'webrtc-offer' }, async ({ payload }) => {
            if (payload.targetEmail !== userEmail) return;

            if (payload.spokenLang && payload.targetLang) {
                const newSpoken = payload.targetLang;
                const newTarget = payload.spokenLang;
                setSpokenLang(newSpoken);
                setTargetLang(newTarget);
                spokenLangRef.current = newSpoken;
                targetLangRef.current = newTarget;
                saveUserSettings(newSpoken, newTarget);
            }

            // ✨ INITIALIZE TTS SYNC FROM CALLER ✨
            if (payload.isTTSOn !== undefined) {
                setIsTTSOn(payload.isTTSOn);
            }

            if (peersRef.current[payload.sender]) {
                try {
                    await peersRef.current[payload.sender].setRemoteDescription(new RTCSessionDescription(payload.offer));
                    const ans = await peersRef.current[payload.sender].createAnswer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
                    await peersRef.current[payload.sender].setLocalDescription(ans);
                    ch.send({ type: 'broadcast', event: 'webrtc-answer', payload: { targetEmail: payload.sender, answer: ans, sender: userEmail } });
                } catch (e) { }
                return;
            }
            if (inCallRef.current) autoAcceptCall(payload);
            else setIncomingCall(payload);
        });

        ch.on('broadcast', { event: 'webrtc-answer' }, async ({ payload }) => {
            if (payload.targetEmail !== userEmail) return;
            setIsCallingOut(false);
            const pc = peersRef.current[payload.sender];
            if (pc && pc.signalingState === 'have-local-offer') {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
                    const pending = pendingCandidatesRef.current[payload.sender] || [];
                    for (const c of pending) { try { await pc.addIceCandidate(c); } catch (e) { } }
                    pendingCandidatesRef.current[payload.sender] = [];
                } catch (e) { }
            }
        });

        ch.on('broadcast', { event: 'webrtc-ice' }, async ({ payload }) => {
            if (payload.targetEmail !== userEmail) return;
            const candidateData = payload.candidate;
            const pc = peersRef.current[payload.sender];
            const candidate = new RTCIceCandidate({ candidate: candidateData.candidate, sdpMid: candidateData.sdpMid, sdpMLineIndex: candidateData.sdpMLineIndex, usernameFragment: candidateData.usernameFragment });
            if (pc?.remoteDescription) { try { await pc.addIceCandidate(candidate); } catch (e) { } }
            else {
                if (!pendingCandidatesRef.current[payload.sender]) pendingCandidatesRef.current[payload.sender] = [];
                pendingCandidatesRef.current[payload.sender].push(candidate);
            }
        });

        ch.on('broadcast', { event: 'webrtc-mesh-sync' }, ({ payload }) => {
            if (payload.targetEmail !== userEmail || !inCallRef.current) return;
            payload.peers.forEach(peer => {
                if (peer !== userEmail && !peersRef.current[peer]) {
                    if (userEmail.toLowerCase() < peer.toLowerCase()) startWebRTCCall(peer, true);
                }
            });
        });

        ch.on('broadcast', { event: 'webrtc-decline' }, ({ payload }) => {
            if (payload.targetEmail === userEmail) {
                setIsCallingOut(false);
                cleanPeer(payload.sender);
            }
        });

        ch.on('broadcast', { event: 'webrtc-end' }, ({ payload }) => {
            if (payload.targetEmail === userEmail) {
                if (incomingCallRef.current?.sender === payload.sender) setIncomingCall(null);
                cleanPeer(payload.sender);
            }
        });

        ch.on('broadcast', { event: 'webrtc-request-offer' }, ({ payload }) => {
            if (payload.targetEmail === userEmail && inCallRef.current) {
                startWebRTCCall(payload.sender, true);
            }
        });

        ch.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                try { await ch.track({ email: userEmail, online: true }); } catch (e) { }

                if (autoJoinCallerRef.current) {
                    const callerToJoin = autoJoinCallerRef.current;
                    autoJoinCallerRef.current = null;
                    setTimeout(() => {
                        ch.send({ type: 'broadcast', event: 'webrtc-request-offer', payload: { targetEmail: callerToJoin, sender: userEmail } });
                    }, 1500);
                }
            }
        });

        return () => { try { ch.untrack(); supabase.removeChannel(ch); } catch (e) { } channelRef.current = null; };
    }, [userEmail]);

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

    const handleEmojiSelect = (emoji) => {
        setChatInput(prev => prev + emoji);
        setShowEmojiPicker(false);
        const textarea = document.querySelector('textarea');
        if (textarea) textarea.focus();
    };

    const sendMsg = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !selectedContact) return;
        const txt = chatInput;
        setChatInput('');
        setShowEmojiPicker(false);
        const { data, error } = await supabase.from('messages').insert([{ sender_email: userEmail, receiver_email: selectedContact, text: txt }]).select();
        if (!error && data?.length) setChatMessages(prev => prev.find(m => m.id === data[0].id) ? prev : [...prev, data[0]]);
    };

    const handlePaste = async (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        let hasImage = false, imageFile = null;

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
            if (pastedText) currentText = currentText ? (currentText + '\n' + pastedText) : pastedText;

            if (currentText && selectedContact) {
                const { data: textDataObj, error: textErr } = await supabase.from('messages').insert([{ sender_email: userEmail, receiver_email: selectedContact, text: currentText }]).select();
                if (!textErr && textDataObj?.length) setChatMessages(prev => prev.find(m => m.id === textDataObj[0].id) ? prev : [...prev, textDataObj[0]]);
                setChatInput('');
            }

            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Image = reader.result;
                if (!selectedContact) return;
                const { data, error } = await supabase.from('messages').insert([{ sender_email: userEmail, receiver_email: selectedContact, text: `[IMAGE]${base64Image}` }]).select();
                if (!error && data?.length) setChatMessages(prev => prev.find(m => m.id === data[0].id) ? prev : [...prev, data[0]]);
            };
            reader.readAsDataURL(imageFile);
        }
    };

    const showSidebar = !isMobile || !selectedContact;
    const showChat = !isMobile || !!selectedContact;
    const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(e); } };

    const safeEmail = userEmail?.toLowerCase() || '';
    const allKnown = [...members, ...savedContacts];
    const dispMembers = members.filter(m => m.email?.toLowerCase() !== safeEmail);
    const dispContacts = savedContacts.filter(c => c.email && c.email.trim().toLowerCase() !== safeEmail);

    const sortedOnlineUsers = [...onlineUsers].sort((a, b) => {
        const nameA = allKnown.find(k => k.email?.toLowerCase() === a.email?.toLowerCase())?.name || a.email.split('@')[0];
        const nameB = allKnown.find(k => k.email?.toLowerCase() === b.email?.toLowerCase())?.name || b.email.split('@')[0];
        return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    });

    const sortedMembers = [...dispMembers].sort((a, b) => {
        const nameA = a.name?.trim() || a.email.split('@')[0];
        const nameB = b.name?.trim() || b.email.split('@')[0];
        return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    });

    const sortedContacts = [...dispContacts].sort((a, b) => {
        const nameA = a.name?.trim() || (a.email.includes('@') ? a.email.split('@')[0] : a.email);
        const nameB = b.name?.trim() || (b.email.includes('@') ? b.email.split('@')[0] : b.email);
        return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    });

    const query = searchQuery.toLowerCase();

    const filteredOnlineUsers = sortedOnlineUsers.filter(u => {
        const name = allKnown.find(k => k.email?.toLowerCase() === u.email?.toLowerCase())?.name || u.email.split('@')[0];
        return name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
    });

    const filteredMembers = sortedMembers.filter(c => {
        const name = c.name?.trim() || c.email.split('@')[0];
        return name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query);
    });

    const filteredContacts = sortedContacts.filter(c => {
        const name = c.name?.trim() || (c.email.includes('@') ? c.email.split('@')[0] : c.email);
        return name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query);
    });

    const activeContact = allKnown.find(c => c.email?.toLowerCase() === selectedContact?.toLowerCase());
    const activeName = activeContact?.name || selectedContact?.split('@')[0] || '';
    const memberCount = members.filter(m => m.email?.toLowerCase() !== safeEmail).length;
    const totalOnlineCount = onlineUsers.length + 1;

    const getFlagUrl = (mobileStr) => {
        if (!mobileStr) return '';
        const clean = mobileStr.replace(/[^0-9]/g, '');
        if (clean.startsWith('44')) return 'https://flagcdn.com/w20/gb.png';
        if (clean.startsWith('34')) return 'https://flagcdn.com/w20/es.png';
        if (clean.startsWith('1')) return 'https://flagcdn.com/w20/us.png';
        return 'https://flagcdn.com/w20/un.png';
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', backgroundColor: '#111b21', color: '#e9edef', fontFamily: 'Segoe UI, sans-serif', overflow: 'hidden', position: 'relative' }}>

            {showLocalTranslator && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0b141a', zIndex: 3000, display: 'flex', flexDirection: 'column' }}>

                    <div style={{ padding: '15px 20px', backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222d34' }}>
                        <h3 style={{ margin: 0, color: '#00a884', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            🗣️ Offline Local Translator
                        </h3>
                        <button onClick={() => { setShowLocalTranslator(false); if (!inCallRef.current) stopCC(); }} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '24px', cursor: 'pointer' }}>✖</button>
                    </div>

                    <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
                        <div style={{ flex: 1, backgroundColor: '#111b21', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '1px solid #222d34' }}>
                            <span style={{ color: '#8696a0', fontSize: '14px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>They hear ({targetLang})</span>
                            <div style={{ fontSize: '32px', color: '#38bdf8', fontWeight: 'bold', textAlign: 'center' }}>
                                {subtitles[userEmail]?.translated || "..."}
                            </div>
                        </div>

                        <div style={{ flex: 1, backgroundColor: '#111b21', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '1px solid #222d34' }}>
                            <span style={{ color: '#8696a0', fontSize: '14px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>You say ({spokenLang})</span>
                            <div style={{ fontSize: '24px', color: '#aebac1', textAlign: 'center', fontStyle: 'italic' }}>
                                {subtitles[userEmail]?.original || "Listening..."}
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: '20px', backgroundColor: '#202c33', borderTop: '1px solid #222d34' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            <select value={spokenLang} onChange={(e) => {
                                const newVal = e.target.value;
                                setSpokenLang(newVal);
                                spokenLangRef.current = newVal;
                                saveUserSettings(newVal, targetLang);
                                broadcastLanguageChange(newVal, targetLang);
                                if (isTranscribingRef.current) {
                                    stopCC();
                                    setTimeout(startCC, 300);
                                }
                            }} style={{ padding: '10px', borderRadius: '8px', background: '#2a3942', color: 'white', border: '1px solid #38bdf8', flex: 1, maxWidth: '150px' }}>
                                <LanguageOptions />
                            </select>

                            <button onClick={swapLanguages} title="Swap Languages" style={{ background: '#00a884', color: '#111', border: 'none', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', fontSize: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>⇄</button>

                            <select value={targetLang} onChange={(e) => {
                                const newVal = e.target.value;
                                setTargetLang(newVal);
                                targetLangRef.current = newVal;
                                saveUserSettings(spokenLang, newVal);
                                broadcastLanguageChange(spokenLang, newVal);
                            }} style={{ padding: '10px', borderRadius: '8px', background: '#2a3942', color: 'white', border: '1px solid #00a884', flex: 1, maxWidth: '150px' }}>
                                <LanguageOptions />
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                            <button onClick={toggleTranscription} style={{ flex: 1, maxWidth: '200px', padding: '12px', borderRadius: '24px', backgroundColor: isTranscribing ? '#ef4444' : '#00a884', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                                {isTranscribing ? '⏹ Stop Listening' : '🎤 Start Listening'}
                            </button>
                            {/* ✨ SYNCHRONIZED TTS TOGGLE ✨ */}
                            <button onClick={toggleTTS} style={{ flex: 1, maxWidth: '200px', padding: '12px', borderRadius: '24px', backgroundColor: isTTSOn ? '#005c4b' : 'transparent', color: isTTSOn ? 'white' : '#00a884', border: '1px solid #00a884', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                                {isTTSOn ? '🔊 Speaker: ON' : '🔇 Speaker: OFF'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showMobileModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 4000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ backgroundColor: '#202c33', padding: '25px', borderRadius: '12px', width: '300px', maxWidth: '90%', border: '1px solid #222d34', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                        <h3 style={{ color: '#00a884', marginTop: 0, marginBottom: '15px' }}>📱 Change Mobile Number</h3>
                        <p style={{ color: '#8696a0', fontSize: '13px', marginBottom: '20px' }}>Enter your new mobile number below to update your profile.</p>
                        <input
                            type="tel"
                            value={newMobile}
                            onChange={(e) => setNewMobile(e.target.value)}
                            placeholder="For a UK number 44 then your number"
                            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #2a3942', backgroundColor: '#111b21', color: 'white', boxSizing: 'border-box', marginBottom: '20px' }}
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => { setShowMobileModal(false); setNewMobile(''); }} style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: 'transparent', color: '#8696a0', border: '1px solid #8696a0', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                            <button onClick={handleUpdateMobile} disabled={isUpdatingMobile} style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#00a884', color: '#111', border: 'none', cursor: isUpdatingMobile ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                                {isUpdatingMobile ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#00a884', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#111', fontWeight: 'bold' }}>
                                    {displayName[0]?.toUpperCase()}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <b style={{ color: '#00a884', fontSize: '16px' }}>{displayName}</b>
                                    {currentUserMobile ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <img
                                                src={getFlagUrl(currentUserMobile)}
                                                alt="Country"
                                                style={{ width: '16px', height: '12px', borderRadius: '2px' }}
                                            />
                                            <span style={{ color: '#8696a0', fontSize: '13px' }}>{currentUserMobile}</span>
                                        </div>
                                    ) : (
                                        <span style={{ color: '#ef4444', fontSize: '12px' }}>
                                            You need to add your mobile number. See change mobile number.
                                        </span>
                                    )}
                                </div>
                            </div>

                            <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#aebac1', cursor: 'pointer' }}>Logout</button>
                        </div>

                        {isMobile && inVoiceCall && (
                            <div
                                onClick={() => {
                                    if (activeCallEmails.length > 0) {
                                        setSelectedContact(activeCallEmails[0]);
                                    }
                                }}
                                style={{ padding: 15, backgroundColor: '#005c4b', color: 'white', textAlign: 'center', cursor: 'pointer', fontWeight: 'bold', borderBottom: '1px solid #222d34' }}
                            >
                                📞 Active Call - Tap to Return
                            </div>
                        )}

                        <div style={{ padding: '15px', borderBottom: '1px solid #222d34', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                onClick={() => setShowLocalTranslator(true)}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#00a884', color: '#111', border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
                            >
                                🗣️ Open Local Translator
                            </button>
                            <button
                                onClick={() => setShowMobileModal(true)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#2a3942', color: '#00a884', border: '1px solid #00a884', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                📱 Change Mobile Number
                            </button>
                        </div>

                        <div style={{ padding: '10px 15px', borderBottom: '1px solid #222d34', backgroundColor: '#111b21' }}>
                            <input
                                type="text"
                                placeholder="🔍 Search users and contacts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #2a3942', backgroundColor: '#202c33', color: 'white', boxSizing: 'border-box', outline: 'none' }}
                            />
                        </div>

                        <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                            <div onClick={() => setIsOnlineExpanded(!isOnlineExpanded)} style={{ padding: '10px 15px', backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', borderBottom: '1px solid #222d34' }}>
                                <span style={{ color: '#8696a0', fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' }}>Online ({filteredOnlineUsers.length})</span>
                                <span style={{ color: '#8696a0' }}>{isOnlineExpanded ? '▼' : '▶'}</span>
                            </div>
                            {isOnlineExpanded && filteredOnlineUsers.map(u => (
                                <div key={u.email} onClick={() => setSelectedContact(u.email)} style={{ padding: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottom: '1px solid #222d34', backgroundColor: selectedContact === u.email ? '#2a3942' : 'transparent' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#38bdf8', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: 15, color: '#111', fontWeight: 'bold' }}>{u.email[0]?.toUpperCase()}</div>
                                    <span>{allKnown.find(k => k.email?.toLowerCase() === u.email?.toLowerCase())?.name || u.email.split('@')[0]}</span>
                                </div>
                            ))}
                            <div onClick={() => setIsMembersExpanded(!isMembersExpanded)} style={{ padding: '10px 15px', backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', borderBottom: '1px solid #222d34', marginTop: 10 }}>
                                <span style={{ color: '#8696a0', fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' }}>Members ({filteredMembers.length})</span>
                                <span style={{ color: '#8696a0' }}>{isMembersExpanded ? '▼' : '▶'}</span>
                            </div>
                            {isMembersExpanded && filteredMembers.map(c => {
                                const isContact = savedContacts.some(sc => sc.email?.trim().toLowerCase() === c.email?.trim().toLowerCase());
                                return (
                                    <div key={c.email} onClick={() => setSelectedContact(c.email)} style={{ padding: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottom: '1px solid #222d34', backgroundColor: selectedContact === c.email ? '#2a3942' : 'transparent' }}>
                                        <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#00a884', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: 15, color: '#111', fontWeight: 'bold' }}>{(c.name || c.email)[0]?.toUpperCase()}</div>
                                        <div style={{ flexGrow: 1 }}>{c.name?.trim() || c.email.split('@')[0]}</div>
                                        {!isContact && <button onClick={(e) => { e.stopPropagation(); setSavedContacts(prev => { const updated = [...prev, { name: c.name?.trim() || c.email.split('@')[0], email: c.email }]; localStorage.setItem('totalRecallContacts', JSON.stringify(updated)); return updated; }); }} style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#00a884', cursor: 'pointer', fontSize: '14px', padding: '5px' }} title="Add to contacts">➕</button>}
                                    </div>
                                );
                            })}
                            <div onClick={() => setIsContactsExpanded(!isContactsExpanded)} style={{ padding: '10px 15px', backgroundColor: '#202c33', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid #222d34', marginTop: 10 }}>
                                <span style={{ color: '#8696a0', fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' }}>Contacts ({filteredContacts.length})</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button onClick={(e) => { e.stopPropagation(); handleImportContacts(); }} disabled={isImporting} style={{ backgroundColor: isImporting ? '#1a2a33' : '#2a3942', color: isImporting ? '#666' : '#00a884', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: isImporting ? 'not-allowed' : 'pointer', fontSize: '11px' }}>{isImporting ? '⏳ Importing...' : '+ Add External'}</button>
                                    <span style={{ color: '#8696a0' }}>{isContactsExpanded ? '▼' : '▶'}</span>
                                </div>
                            </div>
                            {isContactsExpanded && filteredContacts.map(c => (
                                <div key={c.email} onClick={() => setSelectedContact(c.email)} style={{ padding: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', borderBottom: '1px solid #222d34', backgroundColor: selectedContact === c.email ? '#2a3942' : 'transparent' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#64748b', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: 15, color: '#fff', fontWeight: 'bold' }}>{(c.name || c.email)[0]?.toUpperCase()}</div>
                                    <div style={{ flexGrow: 1 }}><div>{c.name || (c.email.includes('@') ? c.email.split('@')[0] : c.email)}</div><div style={{ fontSize: 12, color: '#8696a0' }}>{c.email}</div></div>
                                    <button onClick={(e) => handleRemoveContact(e, c.email)} style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', fontSize: '14px', padding: '5px' }}>❌</button>
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

                                    <div style={{ display: 'flex', gap: isMobile ? 5 : 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                        <button onClick={handleVonageMobileCallUI} disabled={isVonageCalling} style={{ backgroundColor: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', padding: isMobile ? '8px 12px' : '8px 16px', borderRadius: 20, cursor: isVonageCalling ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: isMobile ? '16px' : '14px' }}>
                                            {isMobile ? (isVonageCalling ? '📞...' : '📞') : (isVonageCalling ? '📞 Calling...' : '📞 Call Mobile')}
                                        </button>

                                        {!inVoiceCall ? (
                                            <button onClick={() => initiateCall(selectedContact)} style={{ backgroundColor: 'transparent', border: '1px solid #00a884', color: '#00a884', padding: isMobile ? '8px 12px' : '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold', fontSize: isMobile ? '16px' : '14px' }}>
                                                {isMobile ? '📹' : '📹 Call'}
                                            </button>
                                        ) : (
                                            <>
                                                {!activeCallEmails.includes(selectedContact) && (
                                                    <button onClick={() => initiateCall(selectedContact)} style={{ backgroundColor: '#005c4b', border: '1px solid #00a884', color: 'white', padding: isMobile ? '8px 12px' : '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold', fontSize: isMobile ? '16px' : '14px' }}>
                                                        {isMobile ? '➕' : '➕ Add'}
                                                    </button>
                                                )}
                                                <button onClick={toggleTranscription} style={{ backgroundColor: isTranscribing ? '#005c4b' : 'transparent', border: '1px solid #00a884', color: isTranscribing ? 'white' : '#00a884', padding: isMobile ? '8px 12px' : '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold', fontSize: isMobile ? '16px' : '14px' }}>
                                                    {isMobile ? (isTranscribing ? '💬 On' : '💬 Off') : (isTranscribing ? '💬 Transcribe On' : '💬 Transcribe Off')}
                                                </button>
                                                {/* ✨ SYNCHRONIZED TTS TOGGLE ✨ */}
                                                <button onClick={toggleTTS} style={{ backgroundColor: isTTSOn ? '#005c4b' : 'transparent', border: '1px solid #00a884', color: isTTSOn ? 'white' : '#00a884', padding: isMobile ? '8px 12px' : '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold', fontSize: isMobile ? '16px' : '14px' }}>
                                                    {isMobile ? (isTTSOn ? '🔊 On' : '🔇 Off') : (isTTSOn ? '🔊 Speak On' : '🔇 Speak Off')}
                                                </button>
                                                <button onClick={toggleMute} style={{ backgroundColor: isMuted ? '#ef4444' : 'transparent', border: '1px solid #00a884', color: isMuted ? 'white' : '#00a884', padding: isMobile ? '8px 12px' : '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold', fontSize: isMobile ? '16px' : '14px' }}>
                                                    {isMobile ? (isMuted ? '🔇' : '🎙️') : (isMuted ? '🔇 Unmute' : '🎙️ Mute')}
                                                </button>
                                                <button onClick={toggleCamera} style={{ backgroundColor: isVideoOff ? '#ef4444' : 'transparent', border: '1px solid #00a884', color: isVideoOff ? 'white' : '#00a884', padding: isMobile ? '8px 12px' : '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold', fontSize: isMobile ? '16px' : '14px' }}>
                                                    {isMobile ? (isVideoOff ? '📷' : '📸') : (isVideoOff ? '📷 Camera On' : '📸 Camera Off')}
                                                </button>
                                                <button onClick={toggleScreenShare} style={{ backgroundColor: isScreenSharing ? '#005c4b' : 'transparent', border: '1px solid #00a884', color: isScreenSharing ? 'white' : '#00a884', padding: isMobile ? '8px 12px' : '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold', fontSize: isMobile ? '16px' : '14px' }}>
                                                    {isMobile ? (isScreenSharing ? '💻 Stop' : '💻 Share') : (isScreenSharing ? '💻 Stop Share' : '💻 Share')}
                                                </button>
                                                <button onClick={() => endCall(true)} style={{ backgroundColor: '#ef4444', border: 'none', color: 'white', padding: isMobile ? '8px 12px' : '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 'bold', fontSize: isMobile ? '16px' : '14px' }}>
                                                    {isMobile ? '🔴' : '🔴 End'}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {inVoiceCall && isTranscribing && (
                                    <div style={{ backgroundColor: '#1e293b', padding: '8px 16px', display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center', alignItems: 'center', fontSize: '13px', borderBottom: '1px solid #334155' }}>
                                        <label>🗣️ My Language:
                                            <select value={spokenLang} onChange={e => {
                                                const newVal = e.target.value;
                                                setSpokenLang(newVal);
                                                spokenLangRef.current = newVal;
                                                saveUserSettings(newVal, targetLang);
                                                broadcastLanguageChange(newVal, targetLang);
                                                if (isTranscribingRef.current) {
                                                    stopCC();
                                                    setTimeout(startCC, 300);
                                                }
                                            }} style={{ marginLeft: '8px', padding: '4px', borderRadius: '4px', background: '#2a3942', color: 'white', border: '1px solid #38bdf8', cursor: 'pointer' }}>
                                                <LanguageOptions />
                                            </select>
                                        </label>
                                        <label>🌐 Their Language:
                                            <select value={targetLang} onChange={e => {
                                                const newVal = e.target.value;
                                                setTargetLang(newVal);
                                                targetLangRef.current = newVal;
                                                saveUserSettings(spokenLang, newVal);
                                                broadcastLanguageChange(spokenLang, newVal);
                                            }} style={{ marginLeft: '8px', padding: '4px', borderRadius: '4px', background: '#2a3942', color: 'white', border: '1px solid #00a884', cursor: 'pointer' }}>
                                                <LanguageOptions />
                                            </select>
                                        </label>
                                    </div>
                                )}

                                {inVoiceCall && (
                                    <div style={{ height: '45vh', backgroundColor: '#000', display: 'grid', gridTemplateColumns: `repeat(${Math.max(Object.keys(remoteStreams).length + 1, 2)}, 1fr)`, gap: 10, padding: 10 }}>
                                        <LocalVideo stream={localStream} subtitle={subtitles[userEmail]} />
                                        {Object.entries(remoteStreams).map(([email, stream]) => (
                                            <RemoteVideo key={email} stream={stream} email={email} allKnownUsers={allKnown} subtitle={subtitles[email]} isTTSOn={isTTSOn} />
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
                                        const match = !isVoiceMessage && !isImageMessage ? content.match(urlExtractRegex) : null;
                                        let firstUrl = match ? match[0] : null;

                                        return (
                                            <div key={m.id || i} style={{ alignSelf: m.sender_email === userEmail ? 'flex-end' : 'flex-start', backgroundColor: m.sender_email === userEmail ? '#005c4b' : '#202c33', padding: '8px 12px', borderRadius: 8, maxWidth: '65%', wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                                                {isVoiceMessage ? (
                                                    <audio controls src={content} style={{ height: '40px', maxWidth: '100%', outline: 'none' }} />
                                                ) : isImageMessage ? (
                                                    <img src={content} alt="Pasted attachment" style={{ maxWidth: '100%', borderRadius: 8 }} />
                                                ) : (
                                                    <>{renderTextWithLinks(content)}{firstUrl && <LinkPreview url={firstUrl} />}</>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <form onSubmit={sendMsg} style={{ padding: 15, backgroundColor: '#202c33', display: 'flex', gap: 10, alignItems: 'flex-end', position: 'relative' }}>
                                    <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Add Emoji" style={{ backgroundColor: 'transparent', border: '1px solid #8696a0', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', color: '#8696a0', fontSize: 18, flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>😊</button>
                                    <button type="button" onClick={toggleRecording} title={isRecording ? "Stop Recording" : "Record Voice Message"} style={{ backgroundColor: isRecording ? '#ef4444' : 'transparent', border: isRecording ? 'none' : '1px solid #8696a0', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', color: isRecording ? 'white' : '#8696a0', fontSize: 18, flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>{isRecording ? '⏹' : '🎤'}</button>
                                    {showEmojiPicker && <EmojiPicker onSelectEmoji={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />}
                                    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#2a3942', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                                        {previewUrl && !isRecording && (
                                            <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,0.2)', backgroundColor: '#1e293b' }}>
                                                <div style={{ fontSize: 12, color: '#8696a0', marginBottom: 6, fontWeight: 'bold', textTransform: 'uppercase' }}>Link Preview</div>
                                                <LinkPreview url={previewUrl} style={{ marginTop: 0 }} />
                                            </div>
                                        )}
                                        <textarea value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={handleKey} onPaste={handlePaste} placeholder={isRecording ? "Recording audio..." : "Message or paste image/link..."} disabled={isRecording} rows={1} style={{ width: '100%', padding: 12, backgroundColor: 'transparent', border: 'none', color: 'white', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'Segoe UI, sans-serif' }} />
                                    </div>
                                    <button type="submit" disabled={!chatInput.trim() && !isRecording} style={{ backgroundColor: chatInput.trim() ? '#00a884' : '#333', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: chatInput.trim() ? 'pointer' : 'default', color: '#111', fontSize: 18, flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>➤</button>
                                </form>
                            </>
                        ) : (
                            <div style={{ display: 'flex', flexGrow: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#8696a0', textAlign: 'center' }}>
                                <div>
                                    <h2 style={{ color: 'white', marginBottom: '10px' }}>TotalRecall</h2>
                                    <p>Select a contact to start chatting</p>
                                </div>
                                <div style={{ margin: '30px 0', width: '40px', height: '1px', backgroundColor: '#222d34' }}></div>
                                <div>
                                    <p style={{ fontSize: '13px', marginBottom: '15px' }}>Talking face-to-face with someone?</p>
                                    <button onClick={() => setShowLocalTranslator(true)} style={{ padding: '12px 24px', borderRadius: '24px', backgroundColor: '#00a884', color: '#111', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 168, 132, 0.3)' }}>
                                        🗣️ Open Local Translator
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            {/* FOOTER */}
            <div style={{ backgroundColor: '#202c33', padding: '10px 20px', borderTop: '1px solid #222d34', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', fontSize: '13px', color: '#8696a0' }}>
                <span>© NoirSoft Ltd</span>
                <div style={{ display: 'flex', gap: '20px' }}><span>👥 Members: {memberCount}</span><span>🟢 Online: {totalOnlineCount}</span></div>
            </div>
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

    const syncProfile = async (currentUser) => {
        if (!currentUser || !currentUser.email) return;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('email, name, mobile')
                .eq('email', currentUser.email)
                .maybeSingle();

            const metaName = currentUser.user_metadata?.name || currentUser.email.split('@')[0];
            const metaMobile = currentUser.user_metadata?.mobile || '';

            if (!data && !error) {
                await supabase.from('profiles').insert([{
                    email: currentUser.email,
                    name: metaName,
                    mobile: metaMobile
                }]);
            } else if (data && (!data.name || !data.mobile)) {
                await supabase.from('profiles')
                    .update({
                        name: data.name || metaName,
                        mobile: data.mobile || metaMobile
                    })
                    .eq('email', currentUser.email);
            }
        } catch (err) {
            console.error("Error syncing profile:", err);
        }
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user || null);
            if (session?.user) syncProfile(session.user);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user || null);

            if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
                syncProfile(session.user);
            }

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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh', backgroundColor: '#111b21', color: 'white', fontFamily: 'Segoe UI' }}>
            <div style={{ backgroundColor: '#202c33', padding: 40, borderRadius: 8, width: 350, maxWidth: '90%', textAlign: 'center' }}>
                <h2 style={{ color: '#00a884', marginBottom: 30 }}>TotalRecall</h2>
                {error && <div style={{ backgroundColor: '#dc2626', color: 'white', padding: 10, borderRadius: 4, marginBottom: 15, wordWrap: 'break-word' }}>{error}</div>}

                {showConfirm ? (
                    <div>
                        <h3>✅ Check your email</h3>
                        <p style={{ color: '#8696a0', marginBottom: 20 }}>{confirmMessage}</p>
                        <button onClick={() => { setShowConfirm(false); setEmail(''); setPassword(''); setMobile(''); setError(''); setIsSignupMode(false); setIsForgotPasswordMode(false); }} style={{ width: '100%', padding: 12, backgroundColor: '#00a884', color: '#111', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer' }}>Back to Login</button>
                    </div>
                ) : isForgotPasswordMode ? (
                    <form onSubmit={e => e.preventDefault()}>
                        <p style={{ color: '#8696a0', marginBottom: 15, fontSize: '14px' }}>Enter your email address and we'll send you a link to reset your password.</p>
                        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: 12, marginBottom: 15, borderRadius: 4, border: 'none', backgroundColor: '#2a3942', color: 'white', boxSizing: 'border-box' }} disabled={loading} />

                        <button onClick={e => auth(e, 'reset')} disabled={loading} style={{ width: '100%', padding: 12, backgroundColor: '#00a884', color: '#111', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', marginBottom: 10, opacity: loading ? 0.5 : 1 }}>
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                        <button onClick={() => { setIsForgotPasswordMode(false); setError(''); }} disabled={loading} style={{ width: '100%', padding: 12, backgroundColor: 'transparent', color: '#8696a0', border: '1px solid #8696a0', borderRadius: 4, fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1 }}>
                            Back to Login
                        </button>
                    </form>
                ) : (
                    <form onSubmit={e => e.preventDefault()}>
                        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: 12, marginBottom: 15, borderRadius: 4, border: 'none', backgroundColor: '#2a3942', color: 'white', boxSizing: 'border-box' }} disabled={loading} />

                        {isSignupMode && (
                            <input type="tel" placeholder="Mobile Number (Mandatory)" value={mobile} onChange={e => setMobile(e.target.value)} style={{ width: '100%', padding: 12, marginBottom: 15, borderRadius: 4, border: 'none', backgroundColor: '#2a3942', color: 'white', boxSizing: 'border-box' }} disabled={loading} required />
                        )}

                        <input type="password" placeholder="Password (min 6 characters)" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: 12, marginBottom: 20, borderRadius: 4, border: 'none', backgroundColor: '#2a3942', color: 'white', boxSizing: 'border-box' }} disabled={loading} />

                        {!isSignupMode ? (
                            <>
                                <button onClick={e => auth(e, 'login')} disabled={loading} style={{ width: '100%', padding: 12, backgroundColor: '#00a884', color: '#111', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', marginBottom: 10, opacity: loading ? 0.5 : 1 }}>{loading ? 'Loading...' : 'Log In'}</button>
                                <button onClick={() => { setIsSignupMode(true); setError(''); }} disabled={loading} style={{ width: '100%', padding: 12, backgroundColor: 'transparent', color: '#00a884', border: '1px solid #00a884', borderRadius: 4, fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1 }}>Sign Up</button>
                                <button onClick={() => { setIsForgotPasswordMode(true); setError(''); setIsSignupMode(false); }} style={{ width: '100%', padding: 12, backgroundColor: 'transparent', color: '#8696a0', border: 'none', fontSize: '13px', cursor: 'pointer', marginTop: '10px', textDecoration: 'underline' }} disabled={loading}>
                                    Forgot Password?
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={e => auth(e, 'signup')} disabled={loading} style={{ width: '100%', padding: 12, backgroundColor: '#00a884', color: '#111', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', marginBottom: 10, opacity: loading ? 0.5 : 1 }}>{loading ? 'Loading...' : 'Create Account'}</button>
                                <button onClick={() => { setIsSignupMode(false); setError(''); }} disabled={loading} style={{ width: '100%', padding: 12, backgroundColor: 'transparent', color: '#8696a0', border: '1px solid #8696a0', borderRadius: 4, fontWeight: 'bold', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1 }}>Back to Login</button>
                            </>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
}