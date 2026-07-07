import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

// ==========================================
// 🛠️ CONFIGURATION
// ==========================================
const ADMIN_EMAIL = 'admin@kohinoor.com';

// ==========================================
// 🎨 STYLES
// ==========================================
const styles = {
    app: { fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', backgroundColor: '#fed7aa', height: '100vh', overflowY: 'auto', overflowX: 'hidden', color: '#333', display: 'flex', flexDirection: 'column' },
    header: { backgroundColor: '#c2410c', color: 'white', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
    nav: { display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' },
    navBtn: (isActive) => ({ padding: '10px 15px', backgroundColor: isActive ? '#9a3412' : 'transparent', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }),
    container: { maxWidth: '1200px', margin: '0 auto', padding: '20px', flexGrow: 1, width: '100%', boxSizing: 'border-box' },
    card: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '20px' },
    input: { width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' },
    btnPrimary: { backgroundColor: '#c2410c', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', width: '100%' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' },
    menuImg: { width: '100%', height: '180px', objectFit: 'cover', borderRadius: '4px' },
    heroImage: { width: '100%', height: '350px', objectFit: 'cover', borderRadius: '8px', marginBottom: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '90%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' },
    footer: { backgroundColor: '#c2410c', color: 'white', textAlign: 'center', padding: '15px 15px 50px 15px', marginTop: 'auto' },
    socialLink: { color: 'white', textDecoration: 'underline', fontWeight: 'bold' }
};

// ==========================================
// 🚀 MAIN APPLICATION
// ==========================================
export default function App() {
    const [user, setUser] = useState(null);
    const [hardcodedAdmin, setHardcodedAdmin] = useState(false);
    const [activeTab, setActiveTab] = useState('menu');
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [cart, setCart] = useState([]);
    const [showAuthModal, setShowAuthModal] = useState(false);

    const fetchMenu = useCallback(async () => {
        const { data, error } = await supabase.from('menu_items').select('*').order('category');
        if (error) console.error("❌ Supabase Error:", error.message);
        else if (data) setMenuItems(data);
    }, []);

    // 🚀 UPDATED: Fetch categories ordered by the new display_order column
    const fetchCategories = useCallback(async () => {
        const { data, error } = await supabase
            .from('menu_categories')
            .select('*')
            .order('display_order', { ascending: true }); // Orders 1, 2, 3, 4...

        if (error) console.error("❌ Category Fetch Error:", error.message);
        else if (data) setCategories(data);
    }, []);


    useEffect(() => {
        fetchMenu();
        fetchCategories();
        supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
        return () => subscription.unsubscribe();
    }, [fetchMenu, fetchCategories]);

    const isAdmin = hardcodedAdmin || user?.email === ADMIN_EMAIL;

    const handleLogout = () => {
        if (hardcodedAdmin) setHardcodedAdmin(false);
        else supabase.auth.signOut();
        setActiveTab('menu');
    };

    return (
        <div style={styles.app}>
            <header style={styles.header}>
                <h1 style={{ margin: 0 }}>Kohinoor Indian Restaurant</h1>
                <nav style={styles.nav}>
                    <button style={styles.navBtn(activeTab === 'menu')} onClick={() => setActiveTab('menu')}>Menu & Order</button>
                    <button style={styles.navBtn(activeTab === 'reservation')} onClick={() => setActiveTab('reservation')}>Book Table</button>
                    <button style={styles.navBtn(activeTab === 'location')} onClick={() => setActiveTab('location')}>Location</button>
                    {isAdmin && <button style={styles.navBtn(activeTab === 'admin')} onClick={() => setActiveTab('admin')}>Admin Dashboard</button>}
                    {user && !hardcodedAdmin && (
                        <>
                            <span style={{ fontWeight: 'bold', marginLeft: '10px' }}>Welcome, {user.user_metadata?.first_name || ''}</span>
                            <button style={styles.navBtn(activeTab === 'account')} onClick={() => setActiveTab('account')}>My Account</button>
                        </>
                    )}
                    {hardcodedAdmin && <span style={{ fontWeight: 'bold', marginLeft: '10px' }}>Welcome, AdminK</span>}
                    {user || hardcodedAdmin ? (
                        <button style={styles.navBtn(false)} onClick={handleLogout}>Logout</button>
                    ) : (
                        <button style={styles.navBtn(false)} onClick={() => setShowAuthModal(true)}>Login / Signup</button>
                    )}
                </nav>
            </header>

            <main style={styles.container}>
                {activeTab === 'menu' && <MenuAndOrderView menuItems={menuItems} categories={categories} cart={cart} setCart={setCart} user={user} />}
                {activeTab === 'reservation' && <ReservationView />}
                {activeTab === 'location' && <LocationView />}
                {activeTab === 'admin' && isAdmin && <AdminView menuItems={menuItems} fetchMenu={fetchMenu} categories={categories} fetchCategories={fetchCategories} />}
                {activeTab === 'account' && user && !hardcodedAdmin && <AccountView user={user} setCart={setCart} setActiveTab={setActiveTab} />}
            </main>

            <footer style={styles.footer}>
                <p style={{ margin: '0 0 10px 0' }}>© {new Date().getFullYear()} Kohinoor Indian Restaurant. All rights reserved.</p>
                <p style={{ margin: 0 }}>Follow us on <a href="https://www.facebook.com/IndianRestaurantsTenerife" target="_blank" rel="noopener noreferrer" style={styles.socialLink}>Facebook</a></p>
            </footer>

            {showAuthModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <AuthForm onSuccess={(data) => { if (data?.isHardcodedAdmin) { setHardcodedAdmin(true); setActiveTab('admin'); } setShowAuthModal(false); }} onCancel={() => setShowAuthModal(false)} />
                    </div>
                </div>
            )}
        </div>
    );
}

// ==========================================
// 🍛 MENU & ORDERING VIEW
// ==========================================
function MenuAndOrderView({ menuItems, categories, cart, setCart, user }) {
    const [customerInfo, setCustomerInfo] = useState({ name: '', email: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setCustomerInfo({
                name: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim(),
                email: user.email || ''
            });
        }
    }, [user]);

    const addToCart = (item) => {
        const existing = cart.find(c => c.id === item.id);
        if (existing) setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
        else setCart([...cart, { ...item, qty: 1 }]);
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    const handleCheckout = async (e) => {
        e.preventDefault();
        if (cart.length === 0) return alert("Your cart is empty!");
        setLoading(true);
        const { error } = await supabase.from('orders').insert([{ customer_name: customerInfo.name, email: customerInfo.email, items: cart, total_amount: cartTotal }]);
        setLoading(false);
        if (error) alert("Error placing order: " + error.message);
        else {
            alert("Order placed successfully!");
            setCart([]);
            if (!user) setCustomerInfo({ name: '', email: '' });
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                <div style={{ flex: '2.8', minWidth: '300px' }}>
                    <img src={`${import.meta.env.BASE_URL}home.jpg`} alt="Delicious Indian Food Spread" style={styles.heroImage} />

                    {/* 🚀 CATEGORY GROUPING LOGIC */}
                    {categories.map(cat => {
                        const itemsInCategory = menuItems.filter(i => i.category === cat.name && i.is_available !== false);
                        if (itemsInCategory.length === 0) return null;

                        return (
                            <div key={cat.id}>
                                <h2>{cat.name}</h2>
                                <div style={styles.grid}>
                                    {itemsInCategory.map(item => (
                                        <div key={item.id} style={styles.card}>
                                            {item.image_url && <img src={item.image_url} alt={item.name} style={styles.menuImg} />}
                                            <h3 style={{ marginBottom: '5px' }}>{item.name}</h3>
                                            <p style={{ color: '#666', fontSize: '14px', marginTop: 0 }}>{item.description}</p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 'bold', fontSize: '18px' }}>£{item.price.toFixed(2)}</span>
                                                <button onClick={() => addToCart(item)} style={{ ...styles.btnPrimary, width: 'auto', padding: '5px 15px' }}>Add</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{ flex: '1', minWidth: '300px' }}>
                    <div style={{ ...styles.card, position: 'sticky', top: '20px' }}>
                        <h2 style={{ marginTop: 0 }}>Your Order</h2>
                        {cart.length === 0 ? <p>Cart is empty</p> : (
                            <div style={{ marginBottom: '20px', maxHeight: '400px', overflowY: 'auto' }}>
                                {cart.map(item => (
                                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <span>{item.qty}x {item.name}</span>
                                        <span>£{(item.price * item.qty).toFixed(2)}</span>
                                    </div>
                                ))}
                                <hr />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px' }}>
                                    <span>Total:</span>
                                    <span>£{cartTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                        <form onSubmit={handleCheckout}>
                            <input style={styles.input} type="text" placeholder="Your Name" required value={customerInfo.name} onChange={e => setCustomerInfo({ ...customerInfo, name: e.target.value })} />
                            <input style={styles.input} type="email" placeholder="Email Address" required value={customerInfo.email} onChange={e => setCustomerInfo({ ...customerInfo, email: e.target.value })} />
                            <button type="submit" style={styles.btnPrimary} disabled={loading || cart.length === 0}>{loading ? 'Processing...' : 'Place Order'}</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ... Keep your existing ReservationView, LocationView, AdminView, AccountView, and AuthForm components as they were in the previous complete code ...