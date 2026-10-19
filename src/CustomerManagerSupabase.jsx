import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './Auth';

// ==================================================================
// Helpers
// ==================================================================
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const emptyForm = {
    company_name: '',
    contact_name: '',
    email: '',
    tel: '',
    expiry_date: ''
};

// ==================================================================
// Main component
// ==================================================================
export default function CustomerManagerSupabase() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [formError, setFormError] = useState('');
    const [search, setSearch] = useState('');

    // ------------------------------------------------------------------
    // READ: Fetch customers
    // ------------------------------------------------------------------
    const loadCustomers = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('company_name', { ascending: true });

            if (error) throw error;
            setCustomers(data || []);
        } catch (err) {
            console.error('Error loading customers:', err);
            setError('Could not load customers: ' + (err.message || err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCustomers();
    }, [loadCustomers]);

    // ------------------------------------------------------------------
    // Form Handlers
    // ------------------------------------------------------------------
    const resetForm = () => {
        setForm(emptyForm);
        setEditingId(null);
        setFormError('');
    };

    const handleChange = (field) => (e) => {
        setForm((f) => ({ ...f, [field]: e.target.value }));
    };

    // ------------------------------------------------------------------
    // CREATE / UPDATE
    // ------------------------------------------------------------------
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');

        const trimmed = {
            company_name: form.company_name.trim(),
            contact_name: form.contact_name.trim(),
            email: form.email.trim(),
            tel: form.tel.trim(),
            expiry_date: form.expiry_date || null, // Pass null if empty
        };

        if (!trimmed.company_name) return setFormError('Company name is required.');
        if (!trimmed.contact_name) return setFormError('Contact name is required.');
        if (!trimmed.email) return setFormError('Email is required.');
        if (!isValidEmail(trimmed.email)) return setFormError('Email is not valid.');

        try {
            if (editingId != null) {
                const { error } = await supabase
                    .from('customers')
                    .update(trimmed)
                    .eq('id', editingId);
                if (error) throw error;

                setCustomers(prev => prev.map(c => c.id === editingId ? { ...c, ...trimmed } : c));
            } else {
                const { data, error } = await supabase
                    .from('customers')
                    .insert([trimmed])
                    .select();

                if (error) throw error;

                if (data && data.length > 0) {
                    setCustomers(prev => [...prev, data[0]].sort((a, b) =>
                        a.company_name.localeCompare(b.company_name)
                    ));
                }
            }
            resetForm();
        } catch (err) {
            console.error('Save failed:', err);
            setFormError('Save failed: ' + (err.message || err));
        }
    };

    const handleEdit = (c) => {
        setEditingId(c.id);
        setForm({
            company_name: c.company_name || '',
            contact_name: c.contact_name || '',
            email: c.email || '',
            tel: c.tel || '',
            expiry_date: c.expiry_date || '',
        });
        setFormError('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ------------------------------------------------------------------
    // DELETE
    // ------------------------------------------------------------------
    const handleDelete = async (id, companyName) => {
        const ok = window.confirm(`Delete customer "${companyName}"?`);
        if (!ok) return;

        try {
            const { error } = await supabase.from('customers').delete().eq('id', id);
            if (error) throw error;

            setCustomers(prev => prev.filter(c => c.id !== id));
            if (editingId === id) resetForm();
        } catch (err) {
            console.error('Delete failed:', err);
            setError('Delete failed: ' + (err.message || err));
        }
    };

    // ------------------------------------------------------------------
    // Filtering
    // ------------------------------------------------------------------
    const filtered = customers.filter((c) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            (c.company_name || '').toLowerCase().includes(q) ||
            (c.contact_name || '').toLowerCase().includes(q) ||
            (c.email || '').toLowerCase().includes(q) ||
            (c.tel || '').toLowerCase().includes(q)
        );
    });

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h1 style={styles.title}>NoirSoft Customers</h1>
            </header>

            <main style={styles.main}>
                <div style={styles.twoColumn}>
                    {/* -------- Form -------- */}
                    <div style={styles.leftColumn}>
                        <div style={styles.card}>
                            <h2 style={styles.cardTitle}>
                                {editingId != null ? 'Edit customer' : 'Add customer'}
                            </h2>
                            <form onSubmit={handleSubmit} style={styles.form}>
                                <div style={styles.field}>
                                    <label style={styles.label}>Company name *</label>
                                    <input
                                        type="text"
                                        value={form.company_name}
                                        onChange={handleChange('company_name')}
                                        style={styles.input}
                                        maxLength={120}
                                        placeholder="Acme Corp"
                                    />
                                </div>
                                <div style={styles.field}>
                                    <label style={styles.label}>Contact name *</label>
                                    <input
                                        type="text"
                                        value={form.contact_name}
                                        onChange={handleChange('contact_name')}
                                        style={styles.input}
                                        maxLength={120}
                                        placeholder="Jane Smith"
                                    />
                                </div>
                                <div style={styles.field}>
                                    <label style={styles.label}>Email *</label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={handleChange('email')}
                                        style={styles.input}
                                        maxLength={160}
                                        placeholder="jane@acme.com"
                                    />
                                </div>
                                <div style={styles.field}>
                                    <label style={styles.label}>Telephone</label>
                                    <input
                                        type="tel"
                                        value={form.tel}
                                        onChange={handleChange('tel')}
                                        style={styles.input}
                                        maxLength={40}
                                        placeholder="+1 555 0100"
                                    />
                                </div>

                                <div style={styles.field}>
                                    <label style={styles.label}>Expiry Date</label>
                                    <input
                                        type="date"
                                        value={form.expiry_date}
                                        onChange={handleChange('expiry_date')}
                                        style={styles.input}
                                    />
                                </div>

                                {formError && <div style={styles.errorText}>{formError}</div>}

                                <div style={styles.buttonRow}>
                                    <button type="submit" style={styles.primaryButton}>
                                        {editingId != null ? 'Save changes' : 'Add customer'}
                                    </button>
                                    {editingId != null && (
                                        <button
                                            type="button"
                                            onClick={resetForm}
                                            style={styles.secondaryButton}
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* -------- List -------- */}
                    <div style={styles.rightColumn}>
                        <div style={styles.card}>
                            <div style={styles.listHeader}>
                                <h2 style={styles.cardTitle}>Clients</h2>
                                <span style={styles.count}>
                                    {filtered.length} of {customers.length}
                                </span>
                            </div>

                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={styles.input}
                                placeholder="Search company, contact, email, tel…"
                            />

                            {loading && <div style={styles.hint}>Loading…</div>}
                            {error && <div style={styles.errorText}>{error}</div>}

                            {!loading && !error && filtered.length === 0 && (
                                <div style={styles.hint}>
                                    No customers{customers.length > 0 ? ' match your search' : ' yet — add one on the left'}.
                                </div>
                            )}

                            {!loading && filtered.length > 0 && (
                                <div style={styles.tableWrap}>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <th style={styles.th}>Company</th>
                                                <th style={styles.th}>Contact</th>
                                                <th style={styles.th}>Expiry Date</th>
                                                <th style={styles.th}>Active</th>
                                                <th style={styles.th}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filtered.map((c) => (
                                                <tr key={c.id} style={styles.tr}>
                                                    <td style={styles.td}>
                                                        <strong>{c.company_name}</strong>
                                                        <br />
                                                        <span style={{ fontSize: '12px', color: '#8696a0' }}>{c.email}</span>
                                                    </td>
                                                    <td style={styles.td}>{c.contact_name}</td>
                                                    <td style={styles.td}>
                                                        {c.expiry_date ? new Date(c.expiry_date).toLocaleDateString() : <span style={styles.muted}>—</span>}
                                                    </td>
                                                    <td style={styles.td}>
                                                        <span style={{
                                                            color: c.active_subscription ? '#34d399' : '#ef4444',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            {c.active_subscription ? 'Yes' : 'No'}
                                                        </span>
                                                    </td>
                                                    <td style={styles.td}>
                                                        <div style={styles.actionRow}>
                                                            <button
                                                                onClick={() => handleEdit(c)}
                                                                style={styles.smallButton}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(c.id, c.company_name)}
                                                                style={styles.smallDangerButton}
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
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

// ==================================================================
// Styles
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
    listHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' },
    count: { fontSize: '13px', color: '#8696a0' },
    form: { display: 'flex', flexDirection: 'column', gap: '12px' },
    field: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '13px', color: '#8696a0', textTransform: 'uppercase', letterSpacing: '0.5px' },
    input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #33414a', backgroundColor: '#202c33', color: '#e9edef', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
    hint: { fontSize: '13px', color: '#8696a0', lineHeight: 1.4 },
    errorText: { fontSize: '13px', color: '#ef4444' },
    buttonRow: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
    primaryButton: { padding: '12px 22px', borderRadius: '8px', backgroundColor: '#00a884', color: '#0b141a', border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' },
    secondaryButton: { padding: '12px 22px', borderRadius: '8px', backgroundColor: '#33414a', color: '#e9edef', border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' },
    smallButton: { padding: '6px 12px', borderRadius: '6px', backgroundColor: '#33414a', color: '#e9edef', border: 'none', fontSize: '13px', cursor: 'pointer' },
    smallDangerButton: { padding: '6px 12px', borderRadius: '6px', backgroundColor: '#7f1d1d', color: '#fee2e2', border: 'none', fontSize: '13px', cursor: 'pointer' },
    tableWrap: { width: '100%', overflowX: 'auto', border: '1px solid #222d34', borderRadius: '8px' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
    th: { textAlign: 'left', padding: '12px 14px', backgroundColor: '#202c33', color: '#8696a0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #222d34', whiteSpace: 'nowrap' },
    tr: { borderBottom: '1px solid #1a252b' },
    td: { padding: '12px 14px', verticalAlign: 'middle', borderBottom: '1px solid #1a252b' },
    actionRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    link: { color: '#34d399', textDecoration: 'none' },
    muted: { color: '#5c6b73' },
};