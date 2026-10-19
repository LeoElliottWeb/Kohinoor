import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// ==================================================================
// Supabase Client Setup
// ==================================================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

// ==================================================================
// Auth Page Component
// ==================================================================
export default function AuthPage() {
    const [mode, setMode] = useState('login');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);

    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState('');

    useEffect(() => {
        async function fetchCustomers() {
            try {
                const { data, error } = await supabase
                    .from('customers')
                    .select('id, company_name')
                    .order('company_name', { ascending: true });

                if (error) throw error;
                setCustomers(data || []);
            } catch (err) {
                console.error('Error fetching customers for signup:', err);
            }
        }
        fetchCustomers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');
        setLoading(true);

        const formData = new FormData(e.target);
        const email = String(formData.get('email') || '').trim().toLowerCase();
        const password = String(formData.get('password') || '');

        try {
            if (mode === 'signup') {
                if (!selectedCustomer) {
                    throw new Error('Please select a company to link to your account.');
                }

                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            customer_id: selectedCustomer
                        }
                    }
                });

                if (signUpError) throw signUpError;

                setInfo('Account created successfully! You can now log in.');
                setMode('login');
                setSelectedCustomer('');
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

                if (signInError) {
                    throw signInError;
                }
            }
        } catch (err) {
            setError(err.message || 'Authentication failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h1 style={styles.title}>NoirSoft</h1>
                <p style={styles.subtitle}>Welcome back</p>
            </header>

            <main style={styles.main}>
                <div style={styles.card}>
                    <div style={styles.tabs}>
                        <button
                            type="button"
                            onClick={() => { setMode('login'); setError(''); setInfo(''); }}
                            style={{ ...styles.tab, ...(mode === 'login' ? styles.tabActive : {}) }}
                        >
                            Log in
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMode('signup'); setError(''); setInfo(''); }}
                            style={{ ...styles.tab, ...(mode === 'signup' ? styles.tabActive : {}) }}
                        >
                            Sign up
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} style={styles.form}>

                        {mode === 'signup' && (
                            <div style={styles.field}>
                                <label style={styles.label}>Select Company *</label>
                                <select
                                    value={selectedCustomer}
                                    onChange={(e) => setSelectedCustomer(e.target.value)}
                                    style={styles.input}
                                    required
                                >
                                    <option value="">-- Choose your company --</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.company_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div style={styles.field}>
                            <label style={styles.label}>Email</label>
                            <input
                                name="email"
                                type="email"
                                style={styles.input}
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>Password</label>
                            <div style={styles.passwordWrap}>
                                <input
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    style={{ ...styles.input, paddingRight: '68px' }}
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    style={styles.showButton}
                                >
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>

                        {error && <div style={styles.errorText}>{error}</div>}
                        {info && <div style={styles.infoText}>{info}</div>}

                        <button type="submit" disabled={loading} style={{ ...styles.primaryButton, opacity: loading ? 0.7 : 1 }}>
                            {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}

// ==================================================================
// Protected Wrapper
// ==================================================================
export function AuthGate({ children }) {
    const [session, setSession] = useState(null);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        let mounted = true;

        supabase.auth.getSession().then(({ data }) => {
            if (mounted) {
                setSession(data.session ?? null);
                setChecking(false);
            }
        });

        const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession ?? null);
        });

        return () => {
            mounted = false;
            sub.subscription.unsubscribe();
        };
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    if (checking) {
        return <div style={{ ...styles.container, padding: '50px', textAlign: 'center' }}>Checking authentication…</div>;
    }

    if (!session) {
        return <AuthPage />;
    }

    const isAdmin = session.user?.email === 'capitalolondra@gmail.com';
    const userRole = isAdmin ? 'Administrator' : 'User';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <div style={styles.topBar}>
                <div style={styles.userInfo}>
                    <span style={styles.userEmail}>{session.user?.email}</span>
                    <span style={styles.userRole}>{userRole}</span>

                    {/* LINK SHOWN HERE IN TOP BAR */}
                    {!isAdmin && (
                        <a
                            href="https://veratem2026-ne9be53cbc512685b1devaos.axcloud.dynamics.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.topBarLink}
                        >
                            D365RoleSecure click to open our environment
                        </a>
                    )}
                </div>
                <button onClick={handleLogout} style={styles.logoutButton}>
                    Log out
                </button>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {children}
            </div>
        </div>
    );
}

const styles = {
    container: { display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#0b141a', color: '#e9edef', fontFamily: 'Segoe UI, sans-serif' },
    header: { padding: '24px 20px', backgroundColor: '#202c33', borderBottom: '1px solid #222d34', textAlign: 'center' },
    title: { margin: 0, color: '#00a884', fontSize: '28px' },
    subtitle: { margin: '6px 0 0', color: '#8696a0', fontSize: '14px' },
    main: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', boxSizing: 'border-box' },
    card: { backgroundColor: '#111b21', border: '1px solid #222d34', borderRadius: '12px', padding: '22px', width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' },
    tabs: { display: 'flex', backgroundColor: '#0b141a', borderRadius: '10px', padding: '4px', border: '1px solid #222d34' },
    tab: { flex: 1, padding: '10px 12px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#8696a0', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' },
    tabActive: { backgroundColor: '#00a884', color: '#0b141a' },
    form: { display: 'flex', flexDirection: 'column', gap: '14px' },
    field: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '13px', color: '#8696a0', textTransform: 'uppercase', letterSpacing: '0.5px' },
    input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #33414a', backgroundColor: '#202c33', color: '#e9edef', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
    passwordWrap: { position: 'relative', width: '100%' },
    showButton: { position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', padding: '6px 10px', borderRadius: '6px', backgroundColor: '#33414a', color: '#e9edef', border: 'none', fontSize: '12px', cursor: 'pointer' },
    errorText: { fontSize: '13px', color: '#ef4444' },
    infoText: { fontSize: '13px', color: '#34d399' },
    primaryButton: { padding: '12px 22px', borderRadius: '8px', backgroundColor: '#00a884', color: '#0b141a', border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' },
    topBar: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px', padding: '10px 20px', backgroundColor: '#202c33', borderBottom: '1px solid #222d34' },
    userInfo: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
    userEmail: { fontSize: '13px', color: '#e9edef', fontWeight: 'bold' },
    userRole: { fontSize: '11px', color: '#00a884', textTransform: 'uppercase', letterSpacing: '0.5px' },
    topBarLink: { fontSize: '12px', color: '#34d399', textDecoration: 'none', marginTop: '4px' },
    logoutButton: { padding: '6px 12px', borderRadius: '6px', backgroundColor: '#33414a', color: '#e9edef', border: 'none', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }
};