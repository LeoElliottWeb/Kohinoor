import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './Auth';

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

    const loadAll = useCallback(async () => {
        setLoading(true);

        const session = (await supabase.auth.getSession()).data.session;
        const myCustomerId = session?.user?.user_metadata?.customer_id;

        let query = supabase.from('subscriptions').select('*, customers(company_name), subscription_types(description)').order('id', { ascending: false });

        if (!isAdmin && myCustomerId) {
            query = query.eq('cust_id', myCustomerId);
            // Pre-select the customer in the form
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
        if (!form.cust_id || !form.subscription_type_id) return alert("Select customer and type");

        try {
            const { error: subError } = await supabase.from('subscriptions').insert([{
                cust_id: parseInt(form.cust_id),
                subscription_type_id: parseInt(form.subscription_type_id),
                period: parseInt(form.period),
                cost: parseFloat(form.cost)
            }]);

            if (subError) throw subError;

            await supabase.from('customers').update({ active_subscription: true }).eq('id', parseInt(form.cust_id));

            // Reset the form but keep the customer ID selected if they are a standard user
            setForm({
                cust_id: isAdmin ? '' : form.cust_id,
                subscription_type_id: '',
                period: '',
                cost: ''
            });
            loadAll();
        } catch (err) {
            alert("Error assigning subscription: " + err.message);
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
            alert("Error deleting: " + err.message);
        }
    };

    return (
        <div style={styles.twoColumn}>
            <div style={styles.leftColumn}>
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>Assign Subscription</h2>
                    <form onSubmit={handleSubmit} style={styles.form}>

                        {/* Customer Selection: Dropdown for Admin, Read-only text for User */}
                        <div style={styles.field}>
                            <label style={styles.label}>Customer</label>
                            {isAdmin ? (
                                <select
                                    value={form.cust_id}
                                    onChange={e => setForm({ ...form, cust_id: e.target.value })}
                                    style={styles.input}
                                >
                                    <option value="">-- Select --</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    value={customers.find(c => c.id.toString() === form.cust_id)?.company_name || 'Loading...'}
                                    disabled
                                    style={{ ...styles.input, backgroundColor: '#111b21', color: '#8696a0', cursor: 'not-allowed' }}
                                />
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
                        <button type="submit" style={styles.primaryButton}>Assign</button>
                    </form>
                </div>
            </div>
            <div style={styles.rightColumn}>
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>{isAdmin ? 'All Active Subscriptions' : 'My Subscriptions'}</h2>
                    {loading ? <p>Loading...</p> : (
                        <table style={styles.table}>
                            <thead><tr><th style={styles.th}>Customer</th><th style={styles.th}>Type</th><th style={styles.th}>Cost</th><th style={styles.th}>Actions</th></tr></thead>
                            <tbody>
                                {subs.map(s => (
                                    <tr key={s.id}>
                                        <td style={styles.td}>{s.customers?.company_name || 'Unknown'}</td>
                                        <td style={styles.td}>{s.subscription_types?.description || 'Unknown'}</td>
                                        <td style={styles.td}>£{s.cost}</td>
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
            <header style={styles.header}>
                <h1 style={styles.title}>Subscriptions</h1>
            </header>
            <main style={styles.main}>
                {isAdmin && (
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #222d34', paddingBottom: '10px' }}>
                        <button
                            onClick={() => setActiveTab('types')}
                            style={{ ...styles.navItem, ...(activeTab === 'types' ? styles.navItemActive : {}) }}
                        >
                            Subscription Types
                        </button>
                        <button
                            onClick={() => setActiveTab('active')}
                            style={{ ...styles.navItem, ...(activeTab === 'active' ? styles.navItemActive : {}) }}
                        >
                            Active Subscriptions
                        </button>
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