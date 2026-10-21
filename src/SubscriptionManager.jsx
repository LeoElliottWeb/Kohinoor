import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './Auth';

// ==================================================================
// HELPER: Generate obfuscated 60-char license key with hidden expiry date
// ==================================================================
const generateLicenseKey = (expiryDateString) => {
    const [year, month, day] = expiryDateString.split('-');
    const yy = year.slice(-2);
    const m1 = month[0];
    const m2 = month[1];
    const d1 = day[0];
    const d2 = day[1];

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const getRandomChar = () => chars.charAt(Math.floor(Math.random() * chars.length));

    let keyArray = Array.from({ length: 60 }, getRandomChar);
    keyArray[0] = yy[0];
    keyArray[1] = yy[1];
    keyArray[5] = m1;
    keyArray[9] = m2;
    keyArray[19] = d1;
    keyArray[49] = d2;

    return keyArray.join('');
};

// ==================================================================
// 1. SUBSCRIPTION TYPES COMPONENT (Admin Only)
// ==================================================================
function TypesTab() {
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [form, setForm] = useState({ description: '', period: '', cost: '' });
    const [editingId, setEditingId] = useState(null);
    const [formError, setFormError] = useState('');

    const loadTypes = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('subscription_types').select('*').order('id');
            if (error) throw error;
            setTypes(data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadTypes(); }, [loadTypes]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        const periodNum = parseInt(form.period, 10);
        const costNum = parseFloat(form.cost);

        if (!form.description.trim()) return setFormError('Description required.');
        if (isNaN(periodNum) || periodNum <= 0) return setFormError('Valid period required.');
        if (isNaN(costNum) || costNum < 0) return setFormError('Valid cost required.');

        const data = { description: form.description, period: periodNum, cost: costNum };

        try {
            if (editingId) {
                await supabase.from('subscription_types').update(data).eq('id', editingId);
            } else {
                await supabase.from('subscription_types').insert([data]);
            }
            setForm({ description: '', period: '', cost: '' });
            setEditingId(null);
            loadTypes();
        } catch (err) {
            setFormError(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this type?')) return;
        await supabase.from('subscription_types').delete().eq('id', id);
        loadTypes();
    };

    return (
        <div style={styles.twoColumn}>
            <div style={styles.leftColumn}>
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>{editingId ? 'Edit Type' : 'Add Type'}</h2>
                    <form onSubmit={handleSubmit} style={styles.form}>
                        <div style={styles.field}>
                            <label style={styles.label}>Description *</label>
                            <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={styles.input} placeholder="e.g. Monthly Pro" />
                        </div>
                        <div style={styles.field}>
                            <label style={styles.label}>Period (days) *</label>
                            <input type="number" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} style={styles.input} placeholder="30" />
                        </div>
                        <div style={styles.field}>
                            <label style={styles.label}>Cost *</label>
                            <input type="number" step="0.01" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} style={styles.input} placeholder="19.99" />
                        </div>
                        {formError && <div style={styles.errorText}>{formError}</div>}
                        <div style={styles.buttonRow}>
                            <button type="submit" style={styles.primaryButton}>{editingId ? 'Save' : 'Add'}</button>
                            {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ description: '', period: '', cost: '' }); }} style={styles.secondaryButton}>Cancel</button>}
                        </div>
                    </form>
                </div>
            </div>
            <div style={styles.rightColumn}>
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>Types</h2>
                    {loading ? <p>Loading...</p> : (
                        <table style={styles.table}>
                            <thead><tr><th style={styles.th}>Name</th><th style={styles.th}>Period</th><th style={styles.th}>Cost</th><th style={styles.th}>Actions</th></tr></thead>
                            <tbody>
                                {types.map(t => (
                                    <tr key={t.id}>
                                        <td style={styles.td}>{t.description}</td>
                                        <td style={styles.td}>{t.period} days</td>
                                        <td style={styles.td}>£{t.cost}</td>
                                        <td style={styles.td}>
                                            <button onClick={() => { setEditingId(t.id); setForm(t); }} style={styles.smallButton}>Edit</button>
                                            <button onClick={() => handleDelete(t.id)} style={styles.smallDangerButton}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

// ==================================================================
// 2. ACTIVE SUBSCRIPTIONS COMPONENT (Everyone)
// ==================================================================
function ActiveSubsTab({ isAdmin }) {
    const [subs, setSubs] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [types, setTypes] = useState([]);
    const [form, setForm] = useState({ cust_id: '', subscription_type_id: '', period: '', cost: '' });
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [banner, setBanner] = useState(null); // { type: 'success'|'cancelled'|'processing', message }

    // -------- Load everything --------
    const loadAll = useCallback(async () => {
        setLoading(true);
        const session = (await supabase.auth.getSession()).data.session;
        const myCustomerId = session?.user?.user_metadata?.customer_id;

        let query = supabase
            .from('subscriptions')
            .select('*, customers(company_name), subscription_types(description)')
            .order('id', { ascending: false });

        if (!isAdmin && myCustomerId) {
            query = query.eq('cust_id', myCustomerId);
            setForm(prev => ({ ...prev, cust_id: myCustomerId }));
        }

        const [subsRes, custRes, typeRes] = await Promise.all([
            query,
            supabase.from('customers').select('id, company_name').order('company_name'),
            supabase.from('subscription_types').select('*').order('description')
        ]);

        if (subsRes.data) setSubs(subsRes.data);
        if (custRes.data) setCustomers(custRes.data);
        if (typeRes.data) setTypes(typeRes.data);
        setLoading(false);
    }, [isAdmin]);

    useEffect(() => { loadAll(); }, [loadAll]);

    // -------- Detect return from Stripe + poll for webhook-created row --------
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const paymentStatus = params.get('payment');

        if (paymentStatus === 'success') {
            setBanner({ type: 'success', message: 'Payment received. Your subscription is activated' });

            // The Stripe webhook inserts the row asynchronously. Poll until it appears.
            let attempts = 0;
            const interval = setInterval(async () => {
                attempts += 1;
                await loadAll();
                // If banner was still 'processing' after ~30s, give up politely.
                if (attempts >= 10) {
                    clearInterval(interval);
                    setBanner({ type: 'success', message: 'Payment received. If your subscription does not appear, please contact support.' });
                }
            }, 3000);

            // Clean the query string so a refresh doesn't re-trigger this.
            window.history.replaceState({}, document.title, window.location.pathname);
            return () => clearInterval(interval);
        }

        if (paymentStatus === 'cancelled') {
            setBanner({ type: 'cancelled', message: 'Payment cancelled. No subscription was created.' });
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [loadAll]);

    const handleTypeChange = (e) => {
        const typeId = e.target.value;
        const selectedType = types.find(t => t.id.toString() === typeId);
        setForm({
            ...form,
            subscription_type_id: typeId,
            period: selectedType ? selectedType.period : '',
            cost: selectedType ? selectedType.cost : ''
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.cust_id || !form.subscription_type_id) {
            return alert('Select customer and type');
        }

        setIsProcessing(true);

        try {
            const periodDays = parseInt(form.period, 10);
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + periodDays);
            const formattedExpiryDate = expiryDate.toISOString().split('T')[0];

            // Generate the license key client-side; hand it to the Edge Function
            // so the webhook can insert it after Stripe confirms payment.
            const licenseKey = generateLicenseKey(formattedExpiryDate);

            const sessionData = (await supabase.auth.getSession()).data.session;
            const userEmail = sessionData?.user?.email;

            const origin = window.location.origin;

            // CALL SUPABASE EDGE FUNCTION
            const { data, error } = await supabase.functions.invoke('hyper-worker', {
                body: {
                    cust_id: parseInt(form.cust_id),
                    subscription_type_id: parseInt(form.subscription_type_id),
                    period: periodDays,
                    cost: parseFloat(form.cost),
                    expiryDate: formattedExpiryDate,
                    licensekey: licenseKey,          // NEW: webhook will insert this
                    customer_email: userEmail,
                    success_url: `${origin}/?payment=success`,   // NEW
                    cancel_url: `${origin}/?payment=cancelled`   // NEW
                }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error('No checkout URL returned from server.');
            }

        } catch (err) {
            alert('Error processing payment: ' + err.message);
            setIsProcessing(false);
        }
    };

    const handleDelete = async (id, custId) => {
        if (!window.confirm('Delete this subscription?')) return;
        try {
            await supabase.from('subscriptions').delete().eq('id', id);
            const { data: remainingSubs } = await supabase.from('subscriptions').select('id').eq('cust_id', custId);
            if (!remainingSubs || remainingSubs.length === 0) {
                await supabase.from('customers').update({ active_subscription: false }).eq('id', custId);
            }
            loadAll();
        } catch (err) {
            alert('Error deleting: ' + err.message);
        }
    };

    return (
        <div style={styles.twoColumn}>
            <div style={styles.leftColumn}>
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>Assign Subscription</h2>

                    {banner && (
                        <div style={{
                            ...styles.banner,
                            backgroundColor: banner.type === 'cancelled' ? '#7f1d1d' : '#064e3b',
                            color: banner.type === 'cancelled' ? '#fee2e2' : '#d1fae5'
                        }}>
                            {banner.message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={styles.form}>
                        <div style={styles.field}>
                            <label style={styles.label}>Customer</label>
                            {isAdmin ? (
                                <select value={form.cust_id} onChange={e => setForm({ ...form, cust_id: e.target.value })} style={styles.input}>
                                    <option value="">-- Select --</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                                </select>
                            ) : (
                                <input type="text" value={customers.find(c => c.id.toString() === form.cust_id)?.company_name || 'Loading...'} disabled style={{ ...styles.input, backgroundColor: '#111b21', color: '#8696a0', cursor: 'not-allowed' }} />
                            )}
                        </div>
                        <div style={styles.field}>
                            <label style={styles.label}>Type</label>
                            <select value={form.subscription_type_id} onChange={handleTypeChange} style={styles.input}>
                                <option value="">-- Select --</option>
                                {types.map(t => <option key={t.id} value={t.id}>{t.description}</option>)}
                            </select>
                        </div>
                        <div style={styles.field}>
                            <label style={styles.label}>Period</label>
                            <input type="number" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} style={styles.input} />
                        </div>
                        <div style={styles.field}>
                            <label style={styles.label}>Cost</label>
                            <input type="number" step="0.01" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} style={styles.input} />
                        </div>
                        <button type="submit" style={{ ...styles.primaryButton, opacity: isProcessing ? 0.7 : 1, cursor: isProcessing ? 'not-allowed' : 'pointer' }} disabled={isProcessing}>
                            {isProcessing ? 'Redirecting to Stripe...' : 'Pay & Assign'}
                        </button>
                    </form>
                </div>
            </div>
            <div style={styles.rightColumn}>
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>{isAdmin ? 'All Active Subscriptions' : 'My Subscriptions'}</h2>
                    {loading ? <p>Loading...</p> : (
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Customer</th>
                                    <th style={styles.th}>Type</th>
                                    <th style={styles.th}>Cost</th>
                                    <th style={styles.th}>Expiry Date</th>
                                    <th style={styles.th}>License Key</th>
                                    <th style={styles.th}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subs.map(s => (
                                    <tr key={s.id}>
                                        <td style={styles.td}>{s.customers?.company_name || 'Unknown'}</td>
                                        <td style={styles.td}>{s.subscription_types?.description || 'Unknown'}</td>
                                        <td style={styles.td}>£{s.cost}</td>
                                        <td style={styles.td}>{s.ExpiryDate ? new Date(s.ExpiryDate).toLocaleDateString() : 'N/A'}</td>
                                        <td style={styles.td}><code style={{ backgroundColor: '#202c33', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', wordBreak: 'break-all' }}>{s.licensekey || 'N/A'}</code></td>
                                        <td style={styles.td}><button onClick={() => handleDelete(s.id, s.cust_id)} style={styles.smallDangerButton}>Delete</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

// ==================================================================
// 3. MAIN WRAPPER COMPONENT
// ==================================================================
export default function SubscriptionManager({ isAdmin }) {
    const [activeTab, setActiveTab] = useState(isAdmin ? 'types' : 'active');
    return (
        <div style={styles.container}>
            <header style={styles.header}><h1 style={styles.title}>Subscriptions</h1></header>
            <main style={styles.main}>
                {isAdmin && (
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #222d34', paddingBottom: '10px' }}>
                        <button onClick={() => setActiveTab('types')} style={{ ...styles.navItem, ...(activeTab === 'types' ? styles.navItemActive : {}) }}>Subscription Types</button>
                        <button onClick={() => setActiveTab('active')} style={{ ...styles.navItem, ...(activeTab === 'active' ? styles.navItemActive : {}) }}>Active Subscriptions</button>
                    </div>
                )}
                {activeTab === 'types' && isAdmin && <TypesTab />}
                {activeTab === 'active' && <ActiveSubsTab isAdmin={isAdmin} />}
            </main>
        </div>
    );
}

// ==================================================================
// STYLES
// ==================================================================
const styles = {
    container: { display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#0b141a', color: '#e9edef', fontFamily: 'Segoe UI, sans-serif' },
    header: { padding: '24px 20px', backgroundColor: '#202c33', borderBottom: '1px solid #222d34', textAlign: 'center' },
    title: { margin: 0, color: '#00a884', fontSize: '28px' },
    main: { flex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '24px 20px', boxSizing: 'border-box' },
    twoColumn: { display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' },
    leftColumn: { flex: '1 1 360px', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '20px' },
    rightColumn: { flex: '2 1 620px', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '20px' },
    card: { backgroundColor: '#111b21', border: '1px solid #222d34', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' },
    cardTitle: { margin: 0, color: '#00a884', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' },
    form: { display: 'flex', flexDirection: 'column', gap: '12px' },
    field: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '13px', color: '#8696a0', textTransform: 'uppercase', letterSpacing: '0.5px' },
    input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #33414a', backgroundColor: '#202c33', color: '#e9edef', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
    errorText: { fontSize: '13px', color: '#ef4444' },
    banner: { padding: '12px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '500' },
    buttonRow: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
    primaryButton: { padding: '12px 22px', borderRadius: '8px', backgroundColor: '#00a884', color: '#0b141a', border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' },
    secondaryButton: { padding: '12px 22px', borderRadius: '8px', backgroundColor: '#33414a', color: '#e9edef', border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' },
    smallButton: { padding: '6px 12px', borderRadius: '6px', backgroundColor: '#33414a', color: '#e9edef', border: 'none', fontSize: '13px', cursor: 'pointer', marginRight: '8px' },
    smallDangerButton: { padding: '6px 12px', borderRadius: '6px', backgroundColor: '#7f1d1d', color: '#fee2e2', border: 'none', fontSize: '13px', cursor: 'pointer' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
    th: { textAlign: 'left', padding: '12px 14px', backgroundColor: '#202c33', color: '#8696a0', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #222d34' },
    td: { padding: '12px 14px', borderBottom: '1px solid #1a252b' },
    navItem: { padding: '10px 20px', backgroundColor: 'transparent', color: '#8696a0', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' },
    navItemActive: { backgroundColor: '#202c33', color: '#00a884' },
};