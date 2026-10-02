import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

// ------------------------------------------------------------------
// Configuration: YouTube
// ------------------------------------------------------------------
const YOUTUBE_API_KEY = 'AIzaSyCXOb1T_QdDLFV56BsTnSYnMoxC_O4P0Us';
const YOUTUBE_CHANNEL_ID = 'UC280rpUaBWwlkSOYnSutxtA';
const YOUTUBE_CHANNEL_URL =
    'https://www.youtube.com/channel/UC280rpUaBWwlkSOYnSutxtA';

// The "uploads" playlist for a channel is the channel ID with UC → UU.
const YOUTUBE_UPLOADS_PLAYLIST_ID =
    'UU' + YOUTUBE_CHANNEL_ID.slice(2);

// ------------------------------------------------------------------
// Configuration: Supabase
// ------------------------------------------------------------------
const SUPABASE_URL = 'https://xptlootjhzsunvsqqkro.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_oGXmxWNXvypN8XyjM71sBA_b_DINXJo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ------------------------------------------------------------------
// Helper: format a date string as dd/mm/yyyy
// ------------------------------------------------------------------
function formatDateDMY(input) {
    if (!input) return '-';
    const d = new Date(input);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

// ------------------------------------------------------------------
// Helper: format a date string as dd/mm/yyyy HH:MM:SS
// ------------------------------------------------------------------
function formatDateTimeDMY(input) {
    if (!input) return '-';
    const d = new Date(input);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// ------------------------------------------------------------------
// Helper: turn a 2-letter ISO code into a full country name
// ------------------------------------------------------------------
function codeToCountryName(code) {
    if (!code) return 'Unknown';
    const upper = String(code).toUpperCase();
    if (!/^[A-Z]{2}$/.test(upper)) return upper;

    try {
        if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
            const dn = new Intl.DisplayNames(['en'], { type: 'region' });
            const name = dn.of(upper);
            if (name && name !== upper) return name;
        }
    } catch (e) {
        // fall through
    }
    return upper;
}

// ------------------------------------------------------------------
// Helper: map a language code to a country name
// ------------------------------------------------------------------
function languageToCountryName(lang) {
    const map = {
        af: 'South Africa',
        ar: 'Saudi Arabia',
        bg: 'Bulgaria',
        ca: 'Spain',
        cs: 'Czechia',
        cy: 'United Kingdom',
        da: 'Denmark',
        de: 'Germany',
        el: 'Greece',
        en: 'United States',
        es: 'Spain',
        et: 'Estonia',
        eu: 'Spain',
        fa: 'Iran',
        fi: 'Finland',
        fr: 'France',
        ga: 'Ireland',
        gl: 'Spain',
        he: 'Israel',
        hi: 'India',
        hr: 'Croatia',
        hu: 'Hungary',
        id: 'Indonesia',
        is: 'Iceland',
        it: 'Italy',
        ja: 'Japan',
        ko: 'South Korea',
        lt: 'Lithuania',
        lv: 'Latvia',
        ms: 'Malaysia',
        mt: 'Malta',
        nl: 'Netherlands',
        no: 'Norway',
        pl: 'Poland',
        pt: 'Portugal',
        ro: 'Romania',
        ru: 'Russia',
        sk: 'Slovakia',
        sl: 'Slovenia',
        sq: 'Albania',
        sr: 'Serbia',
        sv: 'Sweden',
        th: 'Thailand',
        tr: 'Turkey',
        uk: 'Ukraine',
        vi: 'Vietnam',
        zh: 'China',
    };
    const key = String(lang).toLowerCase().slice(0, 2);
    return map[key] || null;
}

// ------------------------------------------------------------------
// Helper: detect the visitor's country as a full name
// ------------------------------------------------------------------
function detectCountryName() {
    try {
        const locales = navigator.languages || [navigator.language || 'en-US'];

        for (const loc of locales) {
            if (typeof loc !== 'string') continue;
            const parts = loc.split('-');
            if (parts.length >= 2) {
                const region = parts[parts.length - 1].toUpperCase();
                if (/^[A-Z]{2}$/.test(region)) {
                    return codeToCountryName(region);
                }
            }
        }

        for (const loc of locales) {
            const mapped = languageToCountryName(loc);
            if (mapped) return mapped;
        }
    } catch (e) {
        // ignore
    }
    return 'Unknown';
}

export default function RadioStation() {
    const [tracks, setTracks] = useState([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const playerRef = useRef(null);
    const playerReadyRef = useRef(false);
    const lastLoadedIndexRef = useRef(null);

    const [shoutOutInput, setShoutOutInput] = useState('');
    const [shouts, setShouts] = useState([]);
    const [activeShoutOut, setActiveShoutOut] = useState(null);
    const [isSendingShout, setIsSendingShout] = useState(false);
    const [shoutError, setShoutError] = useState(null);
    const [userCountry, setUserCountry] = useState('Unknown');
    const shoutOutTimeoutRef = useRef(null);

    // Refs so YT event callbacks always see the latest values.
    const tracksRef = useRef(tracks);
    const currentTrackIndexRef = useRef(currentTrackIndex);

    useEffect(() => {
        tracksRef.current = tracks;
    }, [tracks]);

    useEffect(() => {
        currentTrackIndexRef.current = currentTrackIndex;
    }, [currentTrackIndex]);

    useEffect(() => {
        setUserCountry(detectCountryName());
    }, []);

    // ----------------------------------------------------------------
    // Shout overlay helper
    // ----------------------------------------------------------------
    const showShoutOverlay = (message) => {
        if (!message) return;
        if (shoutOutTimeoutRef.current) clearTimeout(shoutOutTimeoutRef.current);
        setActiveShoutOut(message);
        shoutOutTimeoutRef.current = setTimeout(() => {
            setActiveShoutOut(null);
            shoutOutTimeoutRef.current = null;
        }, 5000);
    };

    const loadShoutsFromTable = async () => {
        const { data, error } = await supabase
            .from('shouts')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(500);

        if (error) {
            console.warn('Could not load Shouts table:', error);
            return [];
        }
        setShouts(data || []);
        return data || [];
    };

    useEffect(() => {
        loadShoutsFromTable();
    }, []);

    // ----------------------------------------------------------------
    // Realtime shouts
    // ----------------------------------------------------------------
    useEffect(() => {
        const channel = supabase
            .channel('shouts-realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'shouts' },
                (payload) => {
                    const newShout = payload.new;
                    setShouts((prev) => {
                        if (prev.some((s) => s.id === newShout.id)) return prev;
                        return [newShout, ...prev];
                    });
                    showShoutOverlay(newShout.message);
                }
            )
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    console.warn('Realtime channel error for shouts.');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ----------------------------------------------------------------
    // Fetch ALL YouTube tracks using pagination on the uploads playlist
    // ----------------------------------------------------------------
    useEffect(() => {
        let cancelled = false;

        const fetchChannelTracks = async () => {
            setIsLoading(true);
            try {
                const allTracks = [];
                let nextPageToken = '';
                let pageCount = 0;
                const MAX_PAGES = 40; // safety cap: 40 * 50 = 2000 videos

                do {
                    const url =
                        `https://www.googleapis.com/youtube/v3/playlistItems` +
                        `?key=${YOUTUBE_API_KEY}` +
                        `&playlistId=${YOUTUBE_UPLOADS_PLAYLIST_ID}` +
                        `&part=snippet,contentDetails` +
                        `&maxResults=50` +
                        (nextPageToken
                            ? `&pageToken=${encodeURIComponent(nextPageToken)}`
                            : '');

                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(
                            'Failed to fetch tracks from YouTube.'
                        );
                    }

                    const data = await response.json();
                    if (cancelled) return;

                    const items = data.items || [];
                    for (const item of items) {
                        const videoId =
                            item.contentDetails?.videoId ||
                            item.snippet?.resourceId?.videoId;
                        if (!videoId) continue;

                        const thumbs = item.snippet?.thumbnails || {};
                        const thumb =
                            thumbs.high?.url ||
                            thumbs.medium?.url ||
                            thumbs.default?.url ||
                            '';

                        allTracks.push({
                            id: videoId,
                            title: item.snippet?.title || '(untitled)',
                            thumbnail: thumb,
                            description: item.snippet?.description || '',
                        });
                    }

                    nextPageToken = data.nextPageToken || '';
                    pageCount++;
                } while (nextPageToken && pageCount < MAX_PAGES);

                if (cancelled) return;
                setTracks(allTracks);
            } catch (err) {
                if (!cancelled) setError(err.message);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        if (YOUTUBE_API_KEY !== 'YOUR_YOUTUBE_API_KEY') {
            fetchChannelTracks();
        } else {
            setError('Please configure your YouTube API Key and Channel ID.');
            setIsLoading(false);
        }

        return () => {
            cancelled = true;
        };
    }, []);

    // ----------------------------------------------------------------
    // Create the YT.Player exactly once, once the iframe is in the DOM
    // with a valid src and the YT API is loaded.
    // ----------------------------------------------------------------
    useEffect(() => {
        if (tracks.length === 0) return;
        if (playerRef.current) return;

        let cancelled = false;

        const createPlayer = () => {
            if (cancelled) return;
            if (playerRef.current) return;

            const el = document.getElementById('youtube-player');
            if (!el) return;

            playerRef.current = new window.YT.Player('youtube-player', {
                events: {
                    onReady: () => {
                        playerReadyRef.current = true;
                        lastLoadedIndexRef.current =
                            currentTrackIndexRef.current;
                    },
                    onStateChange: (event) => {
                        if (event.data === window.YT.PlayerState.ENDED) {
                            const len = tracksRef.current.length;
                            if (len === 0) return;
                            setCurrentTrackIndex((prev) =>
                                prev === len - 1 ? 0 : prev + 1
                            );
                        }
                    },
                    onError: (e) => {
                        console.warn('YouTube player error code:', e.data);
                    },
                },
            });
        };

        if (window.YT && window.YT.Player) {
            createPlayer();
        } else {
            const prevCallback = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                if (typeof prevCallback === 'function') prevCallback();
                createPlayer();
            };

            if (
                !document.querySelector('script[src*="youtube.com/iframe_api"]')
            ) {
                const tag = document.createElement('script');
                tag.src = 'https://www.youtube.com/iframe_api';
                const firstScriptTag =
                    document.getElementsByTagName('script')[0];
                if (firstScriptTag && firstScriptTag.parentNode) {
                    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
                } else {
                    document.head.appendChild(tag);
                }
            }
        }

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tracks]);

    // ----------------------------------------------------------------
    // When the user picks a different track, tell the player to load it.
    // ----------------------------------------------------------------
    useEffect(() => {
        if (!playerReadyRef.current) return;
        if (!playerRef.current) return;
        if (tracks.length === 0) return;
        if (lastLoadedIndexRef.current === currentTrackIndex) return;

        const videoId = tracks[currentTrackIndex]?.id;
        if (!videoId) return;

        try {
            playerRef.current.loadVideoById(videoId);
            lastLoadedIndexRef.current = currentTrackIndex;
        } catch (e) {
            console.warn('loadVideoById failed:', e);
        }
    }, [currentTrackIndex, tracks]);

    // ----------------------------------------------------------------
    // Cleanup on unmount
    // ----------------------------------------------------------------
    useEffect(() => {
        return () => {
            if (playerRef.current) {
                try {
                    playerRef.current.destroy();
                } catch (e) {
                    // ignore
                }
                playerRef.current = null;
            }
            playerReadyRef.current = false;
            if (shoutOutTimeoutRef.current) {
                clearTimeout(shoutOutTimeoutRef.current);
            }
        };
    }, []);

    const playNextTrack = () => {
        setCurrentTrackIndex((prevIndex) =>
            prevIndex === tracks.length - 1 ? 0 : prevIndex + 1
        );
    };

    const playPreviousTrack = () => {
        setCurrentTrackIndex((prevIndex) =>
            prevIndex === 0 ? tracks.length - 1 : prevIndex - 1
        );
    };

    const handleShoutOutSubmit = async (e) => {
        e.preventDefault();
        const message = shoutOutInput.trim();
        if (!message || isSendingShout) return;

        setIsSendingShout(true);
        setShoutError(null);

        const country =
            userCountry && userCountry !== 'Unknown'
                ? userCountry
                : detectCountryName();

        const { error: insertError } = await supabase
            .from('shouts')
            .insert([{ message, country }])
            .select()
            .single();

        setIsSendingShout(false);

        if (insertError) {
            console.error('Supabase insert error:', insertError);
            setShoutError(`Could not send shout: ${insertError.message}`);
            return;
        }

        setShoutOutInput('');
    };

    if (isLoading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingText}>Tuning the frequency...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.errorText}>Broadcast Error: {error}</div>
            </div>
        );
    }

    if (tracks.length === 0) {
        return (
            <div style={styles.container}>
                <div style={styles.errorText}>No tracks found on this station.</div>
            </div>
        );
    }

    const currentTrack = tracks[currentTrackIndex];
    const firstVideoId = tracks[0].id;

    const embedSrc =
        `https://www.youtube.com/embed/${firstVideoId}` +
        `?enablejsapi=1&autoplay=1&playsinline=1&rel=0` +
        `&origin=${encodeURIComponent(window.location.origin)}`;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h1 style={styles.title}>NormSki Radio Station</h1>

                <div style={styles.headerRight}>
                    <a
                        href={YOUTUBE_CHANNEL_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.subscribeButton}
                        title="Subscribe on YouTube"
                    >
                        Subscribe on YouTube
                    </a>
                    <div style={styles.nowPlayingInfo}>
                        Now Playing: {currentTrackIndex + 1} of {tracks.length}
                    </div>
                </div>
            </header>

            <main style={styles.mainContent}>
                <div style={styles.threeColumnLayout}>
                    {/* LEFT: Up Next playlist */}
                    <div style={styles.leftColumn}>
                        <div style={styles.playlistContainer}>
                            <h3 style={styles.playlistHeader}>Up Next Track</h3>
                            <div style={styles.playlist}>
                                {tracks.map((track, index) => (
                                    <div
                                        key={track.id}
                                        onClick={() => setCurrentTrackIndex(index)}
                                        style={{
                                            ...styles.playlistItem,
                                            backgroundColor:
                                                index === currentTrackIndex
                                                    ? '#2a3942'
                                                    : 'transparent',
                                            borderLeft:
                                                index === currentTrackIndex
                                                    ? '4px solid #00a884'
                                                    : '4px solid transparent',
                                        }}
                                    >
                                        <img
                                            src={track.thumbnail}
                                            alt=""
                                            style={styles.thumbnail}
                                        />
                                        <span style={styles.playlistItemTitle}>
                                            {track.title}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* CENTER: Player + track details + shout form */}
                    <div style={styles.centerColumn}>
                        <div style={styles.playerWrapper}>
                            {activeShoutOut && (
                                <div style={styles.shoutOutOverlay}>
                                    Shout: "{activeShoutOut}"
                                </div>
                            )}

                            <iframe
                                id="youtube-player"
                                style={styles.iframe}
                                src={embedSrc}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                            ></iframe>
                        </div>

                        <div style={styles.trackDetails}>
                            <h2 style={styles.trackTitle}>{currentTrack.title}</h2>

                            <div style={styles.controls}>
                                <button
                                    onClick={playPreviousTrack}
                                    style={styles.controlButton}
                                >
                                    Prev
                                </button>
                                <button
                                    onClick={playNextTrack}
                                    style={styles.controlButton}
                                >
                                    Next
                                </button>
                            </div>

                            <form
                                onSubmit={handleShoutOutSubmit}
                                style={styles.shoutOutForm}
                            >
                                <input
                                    type="text"
                                    value={shoutOutInput}
                                    onChange={(e) =>
                                        setShoutOutInput(e.target.value)
                                    }
                                    placeholder="Send a shout out..."
                                    style={styles.shoutOutInput}
                                    maxLength={280}
                                    disabled={isSendingShout}
                                />
                                <button
                                    type="submit"
                                    style={{
                                        ...styles.shoutOutButton,
                                        opacity: isSendingShout ? 0.6 : 1,
                                        cursor: isSendingShout
                                            ? 'not-allowed'
                                            : 'pointer',
                                    }}
                                    disabled={isSendingShout}
                                >
                                    {isSendingShout ? 'Sending...' : 'Send'}
                                </button>
                            </form>

                            {shoutError && (
                                <div style={styles.shoutErrorText}>
                                    {shoutError}
                                </div>
                            )}

                            <div style={styles.detectedCountryText}>
                                Your country (detected):{' '}
                                <strong>{userCountry}</strong>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Shouts table */}
                    <div style={styles.rightColumn}>
                        <div style={styles.shoutsContainer}>
                            <h3 style={styles.shoutsHeader}>
                                Shouts({shouts.length})
                            </h3>
                            {shouts.length === 0 ? (
                                <div style={styles.noShoutsText}>
                                    No shouts yet. Be the first to send one!
                                </div>
                            ) : (
                                <div style={styles.shoutsTableWrapper}>
                                    <table style={styles.shoutsTable}>
                                        <thead>
                                            <tr>
                                                <th style={styles.th}>Shout</th>
                                                <th style={styles.th}>
                                                    Country
                                                </th>
                                                <th style={styles.th}>Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {shouts.map((shout) => (
                                                <tr
                                                    key={shout.id}
                                                    style={styles.tr}
                                                >
                                                    <td style={styles.td}>
                                                        {shout.message}
                                                    </td>
                                                    <td style={styles.td}>
                                                        {shout.country || '-'}
                                                    </td>
                                                    <td style={styles.td}>
                                                        {formatDateTimeDMY(
                                                            shout.created_at
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

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
        padding: '20px',
        backgroundColor: '#202c33',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #222d34',
        gap: '16px',
        flexWrap: 'wrap',
    },
    title: {
        margin: 0,
        color: '#00a884',
        fontSize: '24px',
    },
    headerRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginLeft: 'auto',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
    },
    subscribeButton: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 18px',
        borderRadius: '24px',
        backgroundColor: '#ff0000',
        color: '#ffffff',
        fontSize: '14px',
        fontWeight: 'bold',
        textDecoration: 'none',
        boxShadow: '0 4px 12px rgba(255,0,0,0.35)',
        whiteSpace: 'nowrap',
    },
    nowPlayingInfo: {
        color: '#8696a0',
        fontSize: '14px',
        whiteSpace: 'nowrap',
    },
    mainContent: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '1400px',
        margin: '0 auto',
        width: '100%',
        padding: '20px',
        boxSizing: 'border-box',
    },
    threeColumnLayout: {
        display: 'flex',
        gap: '20px',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
    },
    leftColumn: {
        flex: '1 1 260px',
        minWidth: '240px',
        maxWidth: '340px',
        display: 'flex',
        flexDirection: 'column',
    },
    centerColumn: {
        flex: '2 1 420px',
        minWidth: '320px',
        display: 'flex',
        flexDirection: 'column',
    },
    rightColumn: {
        flex: '1 1 300px',
        minWidth: '260px',
        maxWidth: '420px',
        display: 'flex',
        flexDirection: 'column',
    },
    playerWrapper: {
        position: 'relative',
        width: '100%',
        aspectRatio: '16/9',
        backgroundColor: '#000',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    },
    iframe: {
        width: '100%',
        height: '100%',
        border: 'none',
    },
    shoutOutOverlay: {
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0, 168, 132, 0.9)',
        color: '#fff',
        padding: '12px 24px',
        borderRadius: '24px',
        fontSize: '18px',
        fontWeight: 'bold',
        zIndex: 10,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        maxWidth: '90%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    trackDetails: {
        marginTop: '20px',
        textAlign: 'center',
    },
    trackTitle: {
        margin: '0 0 20px 0',
        fontSize: '20px',
        color: '#e9edef',
    },
    controls: {
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        marginBottom: '20px',
    },
    controlButton: {
        padding: '12px 24px',
        borderRadius: '24px',
        backgroundColor: '#00a884',
        color: '#111',
        border: 'none',
        fontWeight: 'bold',
        fontSize: '16px',
        cursor: 'pointer',
    },
    shoutOutForm: {
        display: 'flex',
        justifyContent: 'center',
        gap: '10px',
        maxWidth: '400px',
        margin: '0 auto',
    },
    shoutOutInput: {
        flex: 1,
        padding: '10px 15px',
        borderRadius: '20px',
        border: '1px solid #33414a',
        backgroundColor: '#202c33',
        color: '#e9edef',
        fontSize: '14px',
        outline: 'none',
    },
    shoutOutButton: {
        padding: '10px 20px',
        borderRadius: '20px',
        backgroundColor: '#33414a',
        color: '#e9edef',
        border: 'none',
        fontWeight: 'bold',
        cursor: 'pointer',
    },
    shoutErrorText: {
        color: '#ef4444',
        fontSize: '13px',
        marginTop: '8px',
    },
    detectedCountryText: {
        color: '#8696a0',
        fontSize: '12px',
        marginTop: '10px',
    },
    playlistContainer: {
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#111b21',
        border: '1px solid #222d34',
        borderRadius: '12px',
        padding: '12px',
        height: '100%',
        boxSizing: 'border-box',
    },
    playlistHeader: {
        color: '#8696a0',
        fontSize: '16px',
        textTransform: 'uppercase',
        marginBottom: '10px',
        marginTop: 0,
    },
    playlist: {
        overflowY: 'auto',
        maxHeight: '600px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    playlistItem: {
        display: 'flex',
        alignItems: 'center',
        padding: '10px',
        borderRadius: '8px',
        cursor: 'pointer',
    },
    thumbnail: {
        width: '80px',
        height: '45px',
        objectFit: 'cover',
        borderRadius: '4px',
        marginRight: '15px',
        flexShrink: 0,
    },
    playlistItemTitle: {
        fontSize: '14px',
        color: '#e9edef',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
    },
    shoutsContainer: {
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#111b21',
        border: '1px solid #222d34',
        borderRadius: '12px',
        padding: '12px',
        height: '100%',
        boxSizing: 'border-box',
    },
    shoutsHeader: {
        color: '#8696a0',
        fontSize: '16px',
        textTransform: 'uppercase',
        marginBottom: '10px',
        marginTop: 0,
    },
    noShoutsText: {
        color: '#5c6b73',
        fontSize: '14px',
        fontStyle: 'italic',
        padding: '10px 0',
    },
    shoutsTableWrapper: {
        overflowX: 'auto',
        overflowY: 'auto',
        maxHeight: '600px',
        borderRadius: '8px',
        border: '1px solid #222d34',
    },
    shoutsTable: {
        width: '100%',
        borderCollapse: 'collapse',
        backgroundColor: '#111b21',
    },
    th: {
        textAlign: 'left',
        padding: '10px 12px',
        backgroundColor: '#202c33',
        color: '#00a884',
        fontSize: '13px',
        textTransform: 'uppercase',
        borderBottom: '1px solid #222d34',
        position: 'sticky',
        top: 0,
    },
    tr: {
        borderBottom: '1px solid #1c262c',
    },
    td: {
        padding: '10px 12px',
        fontSize: '14px',
        color: '#e9edef',
        verticalAlign: 'top',
        wordBreak: 'break-word',
    },
    loadingText: {
        margin: 'auto',
        fontSize: '20px',
        color: '#00a884',
    },
    errorText: {
        margin: 'auto',
        color: '#ef4444',
        fontSize: '18px',
        padding: '20px',
        textAlign: 'center',
    },
};