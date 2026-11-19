import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';

import homeImage from './Home.gif';

import './App.css';

// ==================================================================
// Constants
// ==================================================================
const FPS = 30;
const VIDEO_W = 854;
const VIDEO_H = 480;
const PREVIEW_W = 640;
const PREVIEW_H = 360;

const MAX_OUTPUT_SECONDS = 0;
const CHUNK_SECONDS = 10;
const STAR_COUNT = 70;

// ==================================================================
// Helpers
// ==================================================================
function formatSeconds(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
}

function formatDateTimeDMY(input) {
    if (!input) return '-';
    const d = new Date(input);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hh}:${mm}:${ss}`;
}

function drawVideoContain(ctx, videoEl, canvasW, canvasH) {
    if (!videoEl) return;
    const vw = videoEl.videoWidth;
    const vh = videoEl.videoHeight;
    if (!vw || !vh) return;

    const videoRatio = vw / vh;
    const canvasRatio = canvasW / canvasH;

    let drawW, drawH, dx, dy;
    if (videoRatio > canvasRatio) {
        drawW = canvasW;
        drawH = canvasW / videoRatio;
        dx = 0;
        dy = (canvasH - drawH) / 2;
    } else {
        drawH = canvasH;
        drawW = canvasH * videoRatio;
        dx = (canvasW - drawW) / 2;
        dy = 0;
    }
    ctx.drawImage(videoEl, dx, dy, drawW, drawH);
}

function createStars(canvasW, canvasH) {
    const stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            nx: Math.random(),
            ny: Math.random(),
            r: 1.5 + Math.random() * 3.5,
            phase: Math.random() * Math.PI * 2,
            twinkleSpeed: 1.5 + Math.random() * 3.5,
            driftAmpX: 4 + Math.random() * 12,
            driftAmpY: 4 + Math.random() * 12,
            driftSpeedX: 0.15 + Math.random() * 0.35,
            driftSpeedY: 0.15 + Math.random() * 0.35,
            baseAlpha: 0.55 + Math.random() * 0.45,
            points: Math.random() < 0.5 ? 4 : 5,
        });
    }
    return stars;
}

function drawStars(ctx, stars, t, bass, width, height) {
    for (const s of stars) {
        const px = s.nx * width + Math.sin(t * s.driftSpeedX + s.phase) * s.driftAmpX;
        const py = s.ny * height + Math.cos(t * s.driftSpeedY + s.phase * 1.3) * s.driftAmpY;

        const twinkle = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.phase);
        const alpha = s.baseAlpha * (0.35 + 0.65 * twinkle);

        const sizeBoost = bass * 6;
        const outerR = s.r + sizeBoost;

        ctx.save();
        ctx.shadowColor = `rgba(255, 230, 40, ${alpha * 0.9})`;
        ctx.shadowBlur = 10 + bass * 22;

        const points = s.points;
        const innerR = outerR * 0.42;
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const rad = (i * Math.PI) / points - Math.PI / 2;
            const rr = i % 2 === 0 ? outerR : innerR;
            const sx = px + Math.cos(rad) * rr;
            const sy = py + Math.sin(rad) * rr;
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        ctx.closePath();

        const grad = ctx.createRadialGradient(px, py, 0, px, py, outerR);
        grad.addColorStop(0, `rgba(255, 255, 200, ${alpha})`);
        grad.addColorStop(0.45, `rgba(255, 225, 40, ${alpha})`);
        grad.addColorStop(1, `rgba(255, 175, 0, ${alpha * 0.55})`);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.6, outerR * 0.25), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 240, ${alpha})`;
        ctx.fill();

        ctx.restore();
    }
}

function drawMusicVideoFrame(ctx, canvas, t, opts) {
    const {
        analyser, freqData, title, subtitle,
        duration, particles, videoEl, stars,
    } = opts;

    const { width, height } = canvas;
    const cx = width / 2;
    const cy = height / 2;

    let bass = 0, mid = 0, treble = 0;
    if (analyser && freqData) {
        analyser.getByteFrequencyData(freqData);
        const N = freqData.length;
        const bassEnd = Math.floor(N * 0.08);
        const midEnd = Math.floor(N * 0.35);
        let s1 = 0, s2 = 0, s3 = 0;
        for (let i = 0; i < bassEnd; i++) s1 += freqData[i];
        for (let i = bassEnd; i < midEnd; i++) s2 += freqData[i];
        for (let i = midEnd; i < N; i++) s3 += freqData[i];
        bass = s1 / Math.max(1, bassEnd) / 255;
        mid = s2 / Math.max(1, midEnd - bassEnd) / 255;
        treble = s3 / Math.max(1, N - midEnd) / 255;
    }

    const hueShift = (t * 55) % 360;

    ctx.fillStyle = `hsl(${(hueShift + 260) % 360}, 45%, 5%)`;
    ctx.fillRect(0, 0, width, height);

    const videoReady =
        videoEl &&
        videoEl.readyState >= 2 &&
        videoEl.videoWidth > 0 &&
        videoEl.videoHeight > 0;

    if (videoReady) {
        const zoom = 1.0 + bass * 0.025 + treble * 0.01;
        const shakeX = (Math.sin(t * 3.1) + (Math.random() - 0.5)) * bass * 3;
        const shakeY = (Math.cos(t * 2.7) + (Math.random() - 0.5)) * bass * 3;
        const angle = Math.sin(t * 0.9) * 0.008 + (Math.random() - 0.5) * bass * 0.012;

        ctx.save();
        ctx.translate(cx + shakeX, cy + shakeY);
        ctx.rotate(angle);
        ctx.scale(zoom, zoom);
        ctx.translate(-cx, -cy);

        drawVideoContain(ctx, videoEl, width, height);

        ctx.restore();

        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        const washAlpha = 0.22 + bass * 0.18;
        const washHue = (hueShift + 40) % 360;
        ctx.fillStyle = `hsla(${washHue}, 90%, 55%, ${washAlpha})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

        if (bass > 0.08) {
            ctx.save();
            ctx.globalCompositeOperation = 'saturation';
            ctx.fillStyle = `hsla(${(hueShift + 180) % 360}, 100%, 50%, ${0.18 + bass * 0.35})`;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }

        if (treble > 0.05) {
            ctx.save();
            ctx.globalCompositeOperation = 'soft-light';
            ctx.fillStyle = `hsla(${(50 + hueShift) % 360}, 100%, 60%, ${treble * 0.45})`;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }

        if (bass > 0.05) {
            const glow = ctx.createRadialGradient(
                cx, cy, 0,
                cx, cy, Math.max(width, height) * (0.55 + bass * 0.35)
            );
            glow.addColorStop(0, `hsla(${(150 + hueShift) % 360}, 95%, 60%, ${bass * 0.4})`);
            glow.addColorStop(0.6, `hsla(${(280 + hueShift) % 360}, 95%, 55%, ${bass * 0.18})`);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }

        const rimHue = (hueShift * 1.4) % 360;
        const rim = ctx.createRadialGradient(
            cx, cy, Math.min(width, height) * 0.32,
            cx, cy, Math.max(width, height) * 0.78
        );
        rim.addColorStop(0, 'rgba(0,0,0,0)');
        rim.addColorStop(0.65, `hsla(${rimHue}, 90%, 55%, ${0.12 + bass * 0.22})`);
        rim.addColorStop(1, `hsla(${(rimHue + 120) % 360}, 90%, 45%, ${0.35 + bass * 0.35})`);
        ctx.fillStyle = rim;
        ctx.fillRect(0, 0, width, height);
    } else {
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, `hsl(${(200 + hueShift) % 360}, 65%, 8%)`);
        grad.addColorStop(0.5, `hsl(${(280 + hueShift) % 360}, 70%, 6%)`);
        grad.addColorStop(1, `hsl(${(160 + hueShift) % 360}, 65%, 4%)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    if (bass > 0.6) {
        ctx.fillStyle = `hsla(${(60 + hueShift) % 360}, 100%, 60%, ${(bass - 0.6) * 0.35})`;
        ctx.fillRect(0, 0, width, height);
    }

    if (stars && stars.length) {
        drawStars(ctx, stars, t, bass, width, height);
    }

    if (particles) {
        for (const p of particles) {
            const life = 1 - p.age / p.life;
            if (life <= 0) continue;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * life, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 95%, 65%, ${life * 0.9})`;
            ctx.fill();
        }
    }

    const titleFont = Math.floor(width / 18);
    ctx.font = `bold ${titleFont}px Segoe UI, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = `hsl(${(hueShift + 60) % 360}, 100%, 55%)`;
    ctx.shadowBlur = 24 + bass * 30;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title || 'Untitled', cx, height * 0.82, width * 0.9);

    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = `hsla(${(hueShift + 140) % 360}, 100%, 60%, ${0.35 + bass * 0.5})`;
    ctx.strokeText(title || 'Untitled', cx, height * 0.82, width * 0.9);

    const subFont = Math.floor(width / 46);
    ctx.font = `${subFont}px Segoe UI, sans-serif`;
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(245,240,210,0.9)';
    ctx.fillText(subtitle || '', cx, height * 0.90, width * 0.9);
    ctx.shadowBlur = 0;

    const pct = duration > 0 ? Math.min(1, t / duration) : 0;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, 0, width, 6);
    const barGrad = ctx.createLinearGradient(0, 0, width * Math.max(pct, 0.001), 0);
    barGrad.addColorStop(0, `hsl(${(50 + hueShift) % 360}, 100%, 60%)`);
    barGrad.addColorStop(1, `hsl(${(160 + hueShift) % 360}, 95%, 60%)`);
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, 0, width * pct, 6);

    ctx.font = `${Math.floor(width / 60)}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(`${formatSeconds(t)} / ${formatSeconds(duration)}`, 20, 20);
    ctx.shadowBlur = 0;
}

// ==================================================================
// Main component
// ==================================================================
export default function MusicVideoMaker() {
    const [wavFileName, setWavFileName] = useState('');
    const [audioUrl, setAudioUrl] = useState(null);
    const [audioBuffer, setAudioBuffer] = useState(null);
    const [fullDuration, setFullDuration] = useState(0);

    const [videoFile, setVideoFile] = useState(null);
    const [videoFileName, setVideoFileName] = useState('');
    const [videoUrl, setVideoUrl] = useState(null);
    const [videoReady, setVideoReady] = useState(false);
    const [videoError, setVideoError] = useState(null);

    const [title, setTitle] = useState('My Music Video');
    const [subtitle, setSubtitle] = useState('Created with NormSki Video Maker');

    const [isPreparing, setIsPreparing] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
    const [isTranscoding, setIsTranscoding] = useState(false);
    const [progress, setProgress] = useState(0);
    const [encodeProgress, setEncodeProgress] = useState(0);
    const [chunkInfo, setChunkInfo] = useState('');
    const [outputUrl, setOutputUrl] = useState(null);
    const [outputExt, setOutputExt] = useState('mp4');
    const [error, setError] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [eta, setEta] = useState('');

    const canvasRef = useRef(null);
    const previewCanvasRef = useRef(null);
    const videoElRef = useRef(null);
    const audioCtxRef = useRef(null);
    const analyserRef = useRef(null);
    const streamDestRef = useRef(null);
    const sourceNodeRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const rafRef = useRef(null);
    const cancelFlagRef = useRef(false);
    const particlesRef = useRef([]);
    const starsRef = useRef(createStars(VIDEO_W, VIDEO_H));
    const buffersRef = useRef({ freq: null });
    const ffmpegRef = useRef(null);
    const timerRef = useRef(null);
    const encodeStartRef = useRef(0);
    const audioStartTimeRef = useRef(0);
    const finishTimeoutRef = useRef(null);
    const videoStallCheckRef = useRef(0);

    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
            if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
            if (sourceNodeRef.current) {
                try { sourceNodeRef.current.stop(); } catch (e) { }
            }
            if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
                audioCtxRef.current.close().catch(() => { });
            }
        };
    }, []);

    const ensureAudioContext = useCallback(async () => {
        let ctx = audioCtxRef.current;
        if (!ctx || ctx.state === 'closed') {
            const AC = window.AudioContext || window.webkitAudioContext;
            ctx = new AC();
            audioCtxRef.current = ctx;
        }
        if (ctx.state === 'suspended') {
            try { await ctx.resume(); } catch (e) { }
        }
        return ctx;
    }, []);

    const ensureFFmpegLoaded = useCallback(async () => {
        if (ffmpegLoaded && ffmpegRef.current) return ffmpegRef.current;

        setStatusMessage('Loading FFmpeg (~31 MB, one time)...');
        const ffmpeg = new FFmpeg();
        ffmpegRef.current = ffmpeg;

        ffmpeg.on('log', ({ message }) => {
            if (
                message.includes('Error') ||
                message.includes('error') ||
                message.includes('Invalid') ||
                message.includes('failed')
            ) {
                console.warn('[ffmpeg]', message);
            }
        });

        await ffmpeg.load({ coreURL, wasmURL });

        setFfmpegLoaded(true);
        setStatusMessage('FFmpeg ready.');
        return ffmpeg;
    }, [ffmpegLoaded]);

    const handleWavUpload = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        setError(null);
        setAudioBuffer(null);
        setFullDuration(0);
        setIsPreparing(true);
        setStatusMessage('Decoding audio...');

        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const url = URL.createObjectURL(file);
        setAudioUrl(url);
        setWavFileName(file.name);

        try {
            const ctx = await ensureAudioContext();
            const arrayBuffer = await file.arrayBuffer();
            const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
            setAudioBuffer(buffer);
            setFullDuration(buffer.duration);
            setStatusMessage(
                `Loaded ${file.name} · ${formatSeconds(buffer.duration)} total` +
                (MAX_OUTPUT_SECONDS > 0
                    ? ` (will render first ${MAX_OUTPUT_SECONDS}s)`
                    : '')
            );
        } catch (err) {
            console.error(err);
            setError('Could not decode audio: ' + (err.message || err));
            setStatusMessage('');
        } finally {
            setIsPreparing(false);
        }
    };

    const handleVideoUpload = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        setVideoReady(false);
        setVideoError(null);

        if (videoUrl) URL.revokeObjectURL(videoUrl);
        const url = URL.createObjectURL(file);
        setVideoUrl(url);
        setVideoFile(file);
        setVideoFileName(file.name);

        const el = videoElRef.current;
        if (el) {
            el.loop = true;
            el.muted = true;
            el.playsInline = true;
            el.src = url;
            el.load();

            const onLoaded = () => {
                console.log(
                    'Video loaded: readyState=' + el.readyState,
                    'dims=' + el.videoWidth + 'x' + el.videoHeight,
                    'duration=' + el.duration
                );
                setVideoReady(true);
            };
            const onErr = () => {
                const code = el.error ? el.error.code : 'unknown';
                setVideoError('Video failed to load (code ' + code + ')');
                console.error('Video load error:', el.error);
            };
            el.addEventListener('loadeddata', onLoaded, { once: true });
            el.addEventListener('error', onErr, { once: true });
        }
    };

    const rebuildGraph = useCallback(async () => {
        const ctx = await ensureAudioContext();

        if (sourceNodeRef.current) {
            try { sourceNodeRef.current.stop(); } catch (e) { }
            try { sourceNodeRef.current.disconnect(); } catch (e) { }
            sourceNodeRef.current = null;
        }
        if (analyserRef.current) {
            try { analyserRef.current.disconnect(); } catch (e) { }
        }
        if (streamDestRef.current) {
            try { streamDestRef.current.disconnect(); } catch (e) { }
        }

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.78;
        const dest = ctx.createMediaStreamDestination();

        analyser.connect(dest);
        analyser.connect(ctx.destination);

        analyserRef.current = analyser;
        streamDestRef.current = dest;

        buffersRef.current.freq = new Uint8Array(analyser.frequencyBinCount);

        return { ctx, analyser, dest };
    }, [ensureAudioContext]);

    const startPlayback = useCallback(
        async (startTime, duration) => {
            const ctx = await ensureAudioContext();
            const buffer = audioBuffer;
            if (!ctx || !buffer || !analyserRef.current) return null;

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(analyserRef.current);

            const offset = Math.max(0, Math.min(startTime, buffer.duration - 0.01));
            const playDur = Math.min(duration, buffer.duration - offset);

            source.start(0, offset, playDur);
            sourceNodeRef.current = source;
            return source;
        },
        [audioBuffer, ensureAudioContext]
    );

    const spawnParticlesIfNeeded = (bassEnergy) => {
        if (bassEnergy > 0.42 && Math.random() < 0.6) {
            const cx = VIDEO_W / 2;
            const cy = VIDEO_H / 2;
            const angle = Math.random() * Math.PI * 2;
            const speed = 60 + Math.random() * 240 * bassEnergy;
            particlesRef.current.push({
                x: cx + Math.cos(angle) * 100,
                y: cy + Math.sin(angle) * 100,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                r: 2 + Math.random() * 7 * bassEnergy,
                hue: (160 + Math.random() * 100) % 360,
                age: 0,
                life: 1.0 + Math.random() * 0.9,
            });
            if (particlesRef.current.length > 400) {
                particlesRef.current.splice(0, particlesRef.current.length - 400);
            }
        }
    };

    const updateParticles = (dt) => {
        const ps = particlesRef.current;
        for (let i = ps.length - 1; i >= 0; i--) {
            const p = ps[i];
            p.age += dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.985;
            p.vy *= 0.985;
            if (p.age >= p.life) ps.splice(i, 1);
        }
    };

    const ensureVideoPlaying = useCallback(() => {
        const v = videoElRef.current;
        if (!v) return;
        if (v.ended) {
            try {
                v.currentTime = 0;
                const p = v.play();
                if (p && p.catch) p.catch(() => { });
            } catch (e) { }
        } else if (v.paused) {
            const p = v.play();
            if (p && p.catch) p.catch(() => { });
        }
    }, []);

    const startRenderLoop = useCallback(
        (durationSeconds, onComplete) => {
            const previewCanvas = previewCanvasRef.current;
            const recCanvas = canvasRef.current;
            if (!previewCanvas || !recCanvas) {
                if (onComplete) onComplete();
                return;
            }

            const pCtx = previewCanvas.getContext('2d');
            const rCtx = recCanvas.getContext('2d');

            let finished = false;
            let lastT = 0;
            let stallCounter = 0;

            const finish = () => {
                if (finished) return;
                finished = true;
                if (rafRef.current) {
                    cancelAnimationFrame(rafRef.current);
                    rafRef.current = null;
                }
                if (finishTimeoutRef.current) {
                    clearTimeout(finishTimeoutRef.current);
                    finishTimeoutRef.current = null;
                }
                if (onComplete) onComplete();
            };

            if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
            finishTimeoutRef.current = setTimeout(
                () => {
                    console.warn('Render safety timeout fired.');
                    finish();
                },
                (durationSeconds + 30) * 1000
            );

            const drawOneFrame = () => {
                if (finished || cancelFlagRef.current) {
                    finish();
                    return;
                }

                const ctx = audioCtxRef.current;
                if (!ctx) {
                    rafRef.current = requestAnimationFrame(drawOneFrame);
                    return;
                }

                const t = Math.max(0, ctx.currentTime - audioStartTimeRef.current);
                const dt = Math.min(0.1, t - lastT);
                lastT = t;

                stallCounter++;
                if (stallCounter >= 15) {
                    stallCounter = 0;
                    ensureVideoPlaying();
                }

                let bassEnergy = 0;
                if (analyserRef.current && buffersRef.current.freq) {
                    analyserRef.current.getByteFrequencyData(buffersRef.current.freq);
                    const bins = Math.min(20, buffersRef.current.freq.length);
                    let sum = 0;
                    for (let i = 0; i < bins; i++) sum += buffersRef.current.freq[i];
                    bassEnergy = sum / bins / 255;
                }
                spawnParticlesIfNeeded(bassEnergy);
                updateParticles(dt > 0 ? dt : 1 / FPS);

                const opts = {
                    analyser: analyserRef.current,
                    freqData: buffersRef.current.freq,
                    title,
                    subtitle,
                    duration: durationSeconds,
                    particles: particlesRef.current,
                    videoEl: videoElRef.current,
                    stars: starsRef.current,
                };

                drawMusicVideoFrame(pCtx, previewCanvas, t, opts);
                drawMusicVideoFrame(rCtx, recCanvas, t, opts);

                setProgress(Math.min(1, t / durationSeconds));

                if (t < durationSeconds - 0.05) {
                    rafRef.current = requestAnimationFrame(drawOneFrame);
                } else {
                    finish();
                }
            };

            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(drawOneFrame);
        },
        [title, subtitle, ensureVideoPlaying]
    );

    const handleCancel = useCallback(() => {
        cancelFlagRef.current = true;
        if (sourceNodeRef.current) {
            try { sourceNodeRef.current.stop(); } catch (e) { }
        }
        if (videoElRef.current) {
            try { videoElRef.current.pause(); } catch (e) { }
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try { mediaRecorderRef.current.stop(); } catch (e) { }
        }
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        if (finishTimeoutRef.current) {
            clearTimeout(finishTimeoutRef.current);
            finishTimeoutRef.current = null;
        }
        if (timerRef.current) clearInterval(timerRef.current);
        setIsRendering(false);
        setStatusMessage('Cancelled.');
    }, []);

    const transcodeToMp4Chunked = useCallback(
        async (webmBlob, totalDuration) => {
            setIsTranscoding(true);
            setEncodeProgress(0);
            setStatusMessage('Encoding MP4 (chunked)...');
            encodeStartRef.current = Date.now();

            const ffmpeg = await ensureFFmpegLoaded();

            try {
                setChunkInfo('Writing source file...');
                await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));

                const numChunks = Math.max(
                    1,
                    Math.ceil(totalDuration / CHUNK_SECONDS)
                );
                console.log(`Encoding ${numChunks} chunk(s) of ~${CHUNK_SECONDS}s`);

                const chunkNames = [];

                for (let i = 0; i < numChunks; i++) {
                    if (cancelFlagRef.current) throw new Error('Cancelled.');

                    const start = i * CHUNK_SECONDS;
                    const len = Math.min(CHUNK_SECONDS, totalDuration - start);
                    const outName = `chunk_${String(i).padStart(4, '0')}.mp4`;

                    setChunkInfo(
                        `Encoding chunk ${i + 1} / ${numChunks} ` +
                        `(${formatSeconds(start)}–${formatSeconds(start + len)})`
                    );

                    const progressHandler = ({ progress: p }) => {
                        if (typeof p === 'number' && isFinite(p)) {
                            const clamped = Math.max(0, Math.min(1, p));
                            const overall = (i + clamped) / numChunks;
                            setEncodeProgress(overall);

                            const elapsed = (Date.now() - encodeStartRef.current) / 1000;
                            if (overall > 0.02) {
                                const totalEst = elapsed / overall;
                                const remain = totalEst - elapsed;
                                setEta(
                                    remain > 60
                                        ? `~${Math.round(remain / 60)} min remaining`
                                        : `~${Math.round(remain)}s remaining`
                                );
                            }
                        }
                    };
                    ffmpeg.on('progress', progressHandler);

                    try {
                        await ffmpeg.exec([
                            '-ss', String(start),
                            '-t', String(len),
                            '-i', 'input.webm',
                            '-c:v', 'libx264',
                            '-preset', 'ultrafast',
                            '-crf', '23',
                            '-pix_fmt', 'yuv420p',
                            '-vsync', 'cfr',
                            '-r', String(FPS),
                            '-c:a', 'aac',
                            '-b:a', '128k',
                            '-ar', '44100',
                            '-ac', '2',
                            '-threads', '1',
                            outName,
                        ]);
                    } finally {
                        try { ffmpeg.off('progress', progressHandler); } catch (e) { }
                    }

                    try {
                        const stat = await ffmpeg.readFile(outName);
                        if (!stat || stat.length === 0) {
                            throw new Error(
                                `Chunk ${i + 1} produced an empty file.`
                            );
                        }
                        console.log(
                            `Chunk ${i + 1}/${numChunks} encoded: ${stat.length} bytes`
                        );
                    } catch (e) {
                        throw new Error(
                            `Chunk ${i + 1} failed: ${e.message || e}`
                        );
                    }

                    chunkNames.push(outName);
                }

                setChunkInfo('Concatenating chunks...');
                const concatList = chunkNames
                    .map((n) => `file '${n}'`)
                    .join('\n');
                await ffmpeg.writeFile('concat.txt', concatList);

                await ffmpeg.exec([
                    '-f', 'concat',
                    '-safe', '0',
                    '-i', 'concat.txt',
                    '-c', 'copy',
                    '-movflags', '+faststart',
                    'output.mp4',
                ]);

                const data = await ffmpeg.readFile('output.mp4');
                if (!data || data.length === 0) {
                    throw new Error('Concatenated MP4 is empty.');
                }
                const mp4Blob = new Blob([data.buffer], { type: 'video/mp4' });
                console.log('Final MP4 produced:', mp4Blob.size, 'bytes');

                try { await ffmpeg.deleteFile('input.webm'); } catch (e) { }
                try { await ffmpeg.deleteFile('concat.txt'); } catch (e) { }
                for (const n of chunkNames) {
                    try { await ffmpeg.deleteFile(n); } catch (e) { }
                }
                try { await ffmpeg.deleteFile('output.mp4'); } catch (e) { }

                setChunkInfo('');
                setEta('');
                return mp4Blob;
            } catch (err) {
                try { await ffmpeg.deleteFile('input.webm'); } catch (e) { }
                try { await ffmpeg.deleteFile('concat.txt'); } catch (e) { }
                try { await ffmpeg.deleteFile('output.mp4'); } catch (e) { }
                setChunkInfo('');
                setEta('');
                throw err;
            } finally {
                setIsTranscoding(false);
            }
        },
        [ensureFFmpegLoaded]
    );

    const handleGenerate = async () => {
        if (!audioBuffer) {
            setError('Please upload an audio file first.');
            return;
        }
        if (!videoFile) {
            setError('Please upload a video file (the person / performance).');
            return;
        }

        cancelFlagRef.current = false;
        setError(null);
        setOutputUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
        particlesRef.current = [];
        starsRef.current = createStars(VIDEO_W, VIDEO_H);
        setIsRendering(true);
        setProgress(0);
        setEncodeProgress(0);
        setChunkInfo('');
        setStatusMessage('Preparing...');
        setElapsedTime(0);
        setEta('');

        const startTime = Date.now();
        timerRef.current = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        const duration =
            MAX_OUTPUT_SECONDS > 0
                ? Math.min(MAX_OUTPUT_SECONDS, audioBuffer.duration)
                : audioBuffer.duration;

        const watchdogMs = Math.max(
            60 * 60 * 1000,
            (duration * 60 + 3600) * 1000
        );
        const pipelineWatchdog = setTimeout(() => {
            console.warn('Pipeline watchdog fired.');
            cancelFlagRef.current = true;
            handleCancel();
            setError('Render timed out.');
        }, watchdogMs);

        try {
            const canvas = canvasRef.current;
            canvas.width = VIDEO_W;
            canvas.height = VIDEO_H;
            const previewCanvas = previewCanvasRef.current;
            previewCanvas.width = PREVIEW_W;
            previewCanvas.height = PREVIEW_H;

            const { ctx, dest } = await rebuildGraph();

            const canvasStream = canvas.captureStream(FPS);
            const videoTrack = canvasStream.getVideoTracks()[0];
            const audioTrack = dest.stream.getAudioTracks()[0];
            const combinedStream = audioTrack
                ? new MediaStream([videoTrack, audioTrack])
                : canvasStream;

            const mimeType = 'video/webm;codecs=vp9,opus';

            const recorder = new MediaRecorder(combinedStream, {
                mimeType,
                videoBitsPerSecond: 5_000_000,
                audioBitsPerSecond: 128_000,
            });
            mediaRecorderRef.current = recorder;
            recordedChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    recordedChunksRef.current.push(e.data);
                }
            };

            const recordingDone = new Promise((resolve) => {
                recorder.onstop = () => resolve();
            });

            const videoEl = videoElRef.current;
            if (!videoEl) throw new Error('Video element is missing.');

            if (videoEl.readyState < 2) {
                setStatusMessage('Waiting for video to load...');
                await new Promise((resolve) => {
                    const onReady = () => {
                        videoEl.removeEventListener('loadeddata', onReady);
                        resolve();
                    };
                    videoEl.addEventListener('loadeddata', onReady);
                    setTimeout(resolve, 5000);
                });
            }

            if (!videoEl.videoWidth || !videoEl.videoHeight) {
                throw new Error(
                    'Video has no dimensions — the file may be corrupted or unsupported.'
                );
            }

            videoEl.muted = true;
            videoEl.playsInline = true;
            videoEl.loop = true;
            try { videoEl.currentTime = 0; } catch (e) { }

            setStatusMessage('Starting video playback...');
            try {
                const playPromise = videoEl.play();
                if (playPromise && typeof playPromise.then === 'function') {
                    await playPromise;
                }
                console.log(
                    'Video playing. readyState=' + videoEl.readyState,
                    'paused=' + videoEl.paused,
                    'loop=' + videoEl.loop
                );
            } catch (e) {
                console.warn('video.play() failed:', e);
                throw new Error(
                    'Could not play the video file. Try re-encoding as MP4/H.264.'
                );
            }

            setStatusMessage('Playing audio...');
            if (ctx.state === 'suspended') {
                try { await ctx.resume(); } catch (e) { }
            }
            await startPlayback(0, duration);
            audioStartTimeRef.current = ctx.currentTime;

            const renderComplete = new Promise((resolve) => {
                startRenderLoop(duration, resolve);
            });

            setStatusMessage('Rendering music video...');
            recorder.start(1000);

            await renderComplete;
            await new Promise((r) => setTimeout(r, 800));

            if (sourceNodeRef.current) {
                try { sourceNodeRef.current.stop(); } catch (e) { }
            }
            try { videoEl.pause(); } catch (e) { }

            if (recorder.state !== 'inactive') {
                try { recorder.stop(); } catch (e) { console.warn(e); }
            }

            await Promise.race([
                recordingDone,
                new Promise((_, rej) =>
                    setTimeout(
                        () => rej(new Error('Recorder stop timed out.')),
                        60000
                    )
                ),
            ]);

            if (recordedChunksRef.current.length === 0) {
                throw new Error('No video data was captured.');
            }

            const webmBlob = new Blob(recordedChunksRef.current, {
                type: mimeType,
            });
            console.log('WebM recorded:', webmBlob.size, 'bytes');

            recordedChunksRef.current = [];

            setStatusMessage('Encoding MP4 (chunked)...');
            const mp4Blob = await transcodeToMp4Chunked(webmBlob, duration);

            const url = URL.createObjectURL(mp4Blob);
            setOutputUrl(url);
            setOutputExt('mp4');
            setStatusMessage('Done! Your MP4 music video is ready.');
        } catch (err) {
            console.error(err);
            if (!cancelFlagRef.current) {
                setError(err.message || String(err));
                setStatusMessage('');
            }
        } finally {
            clearTimeout(pipelineWatchdog);
            if (timerRef.current) clearInterval(timerRef.current);
            setIsRendering(false);
            setIsTranscoding(false);
            setEta('');
        }
    };

    const handleDownload = () => {
        if (!outputUrl) return;
        const a = document.createElement('a');
        a.href = outputUrl;
        a.download = `${(title || 'music-video').replace(/[^a-z0-9-_]+/gi, '_')}.${outputExt}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const canGenerate =
        !!audioBuffer && !!videoFile && !isRendering && !isTranscoding;
    const busy = isRendering || isTranscoding;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h1 style={styles.title}>Automate your business workflows</h1>
            </header>

            <div style={styles.layout}>
                {/* Sidebar with links */}
                <aside style={styles.sidebar}>
                    <h2 style={styles.sidebarTitle}>Links</h2>
                    <ul style={styles.linkList}>
                        <li style={styles.linkItem}>
                            <a
                                href="https://splendorous-cupcake-ea4c80.netlify.app/"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={styles.link}
                            >
                                Estate Agents
                            </a>
                        </li>
                        <li style={styles.linkItem}>
                            <a
                                href="https://totalrecall.network/"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={styles.link}
                            >
                                TotalRecall
                            </a>
                        </li>
                    </ul>
                </aside>

                {/* Main content */}
                <main style={styles.mainBody}>
                    <div style={styles.contentWrapper}>
                        <img
                            src={homeImage}
                            alt="Home"
                            style={styles.homeImage}
                        />
                        <p style={styles.descriptionText}>
                            Our LLM can help automate your business, make you more efficient and help you make more money
                        </p>
                    </div>
                </main>
            </div>

            {/* Hidden canvases & video element required by the render pipeline */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <canvas ref={previewCanvasRef} style={{ display: 'none' }} />
            <video
                ref={videoElRef}
                muted
                playsInline
                loop
                preload="auto"
                style={{ display: 'none' }}
            />
        </div>
    );
}

// ==================================================================
// Styles
// ==================================================================
const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#0b141a',
        color: '#e9edef',
        fontFamily: 'Segoe UI, sans-serif',
    },
    header: {
        padding: '24px 20px',
        backgroundColor: '#202c33',
        borderBottom: '1px solid #222d34',
        textAlign: 'center',
    },
    title: { margin: 0, color: '#00a884', fontSize: '28px' },

    // New two-column layout
    layout: {
        flex: 1,
        display: 'flex',
        alignItems: 'flex-start',
        minHeight: 0,
    },

    // Left sidebar
    sidebar: {
        width: '220px',
        flexShrink: 0,
        padding: '24px 16px',
        backgroundColor: '#111b21',
        borderRight: '1px solid #222d34',
        minHeight: '100%',
    },
    sidebarTitle: {
        margin: '0 0 16px 0',
        fontSize: '14px',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#8696a0',
        fontWeight: '600',
    },
    linkList: {
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    linkItem: {
        margin: 0,
        padding: 0,
    },
    link: {
        display: 'block',
        padding: '10px 12px',
        borderRadius: '8px',
        color: '#e9edef',
        textDecoration: 'none',
        fontSize: '15px',
        fontWeight: '500',
        backgroundColor: '#202c33',
        border: '1px solid transparent',
        transition: 'background-color 0.15s ease, border-color 0.15s ease',
    },

    // Main body (now sits right of sidebar)
    mainBody: {
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '40px 20px',
        minWidth: 0,
    },
    contentWrapper: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: '800px',
        width: '100%',
    },
    homeImage: {
        display: 'block',
        maxWidth: '100%',
        width: '800px',
        height: 'auto',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    },
    descriptionText: {
        marginTop: '24px',
        fontSize: '18px',
        lineHeight: '1.6',
        color: '#e9edef',
        textAlign: 'center',
        fontWeight: '500',
    },
};