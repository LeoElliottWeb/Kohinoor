import React, { useState, useEffect } from 'react';
import { AuthGate, supabase } from './Auth';
import CustomerManagerSupabase from './CustomerManagerSupabase';
import SubscriptionManager from './SubscriptionManager';

export default function App() {
    return (
        <AuthGate>
            <MainLayout />
        </AuthGate>
    );
}

function MainLayout() {
    const [session, setSession] = useState(null);
    const [userCustomer, setUserCustomer] = useState(null);
    const [activeTab, setActiveTab] = useState('subscriptions');

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            const currentSession = data.session;
            setSession(currentSession);

            if (currentSession?.user?.email !== 'capitalolondra@gmail.com') {
                const customerId = currentSession?.user?.user_metadata?.customer_id;
                if (customerId) {
                    supabase.from('customers').select('*').eq('id', customerId).single()
                        .then(({ data: customer }) => {
                            if (customer) setUserCustomer(customer);
                        });
                }
            } else {
                setActiveTab('customers');
            }
        });
    }, []);

    const isAdmin = session?.user?.email === 'capitalolondra@gmail.com';

    const menuItems = [
        { id: 'customers', label: 'Customers' },
        { id: 'subscriptions', label: 'Subscriptions' },
    ];

    return (
        <div style={styles.appContainer}>
            {isAdmin && (
                <aside style={styles.sidebar}>
                    <div style={styles.sidebarHeader}>
                        <h2 style={styles.logo}>NoirSoft</h2>
                    </div>

                    <nav style={styles.nav}>
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                style={{
                                    ...styles.navItem,
                                    ...(activeTab === item.id ? styles.navItemActive : {})
                                }}
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </aside>
            )}

            <main style={styles.contentArea}>
                {!isAdmin && (
                    <div style={styles.userHeader}>
                        {userCustomer && (
                            <div style={styles.customerDetails}>
                                <div style={styles.customerName}>{userCustomer.company_name}</div>
                                <div style={styles.customerInfo}>{userCustomer.contact_name}</div>
                                <div style={styles.customerInfo}>Tel: {userCustomer.tel || 'N/A'}</div>

                                {/* NEW LINK AND DESCRIPTION */}
                                <div style={{ marginTop: '8px', borderTop: '1px solid #33414a', paddingTop: '8px' }}>
                                    <a
                                        href="https://veratem2026-ne9be53cbc512685b1devaos.axcloud.dynamics.com/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={styles.link}
                                    >
                                        D365RoleSecure click to open our environment
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {isAdmin ? (
                    <>
                        {activeTab === 'customers' && <CustomerManagerSupabase />}
                        {activeTab === 'subscriptions' && <SubscriptionManager isAdmin={isAdmin} />}
                    </>
                ) : (
                    <SubscriptionManager isAdmin={isAdmin} />
                )}
            </main>
        </div>
    );
}

const styles = {
    appContainer: {
        display: 'flex',
        flex: 1,
        backgroundColor: '#0b141a',
        color: '#e9edef',
        fontFamily: 'Segoe UI, sans-serif',
        overflow: 'hidden'
    },
    sidebar: {
        width: '260px',
        backgroundColor: '#111b21',
        borderRight: '1px solid #222d34',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
    },
    sidebarHeader: {
        padding: '24px 20px',
        borderBottom: '1px solid #222d34',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    logo: {
        margin: 0,
        color: '#00a884',
        fontSize: '24px',
        textAlign: 'center',
        letterSpacing: '1px',
    },
    userHeader: {
        padding: '20px 24px 0 24px',
    },
    customerDetails: {
        padding: '16px',
        backgroundColor: '#202c33',
        borderRadius: '8px',
        border: '1px solid #33414a',
        display: 'inline-block',
        minWidth: '250px'
    },
    customerName: {
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#e9edef',
        marginBottom: '6px',
    },
    customerInfo: {
        fontSize: '13px',
        color: '#8696a0',
        marginBottom: '2px',
    },
    link: {
        color: '#34d399',
        textDecoration: 'none',
        fontSize: '13px',
        fontWeight: 'bold',
        display: 'block',
        lineHeight: '1.4'
    },
    nav: {
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 10px',
        gap: '8px',
        flex: 1,
    },
    navItem: {
        padding: '12px 16px',
        backgroundColor: 'transparent',
        color: '#8696a0',
        border: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: 'bold',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'background-color 0.2s, color 0.2s',
    },
    navItemActive: {
        backgroundColor: '#202c33',
        color: '#00a884',
    },
    contentArea: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
    }
};