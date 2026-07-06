import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

// ==========================================
// 🛠️ CONFIGURATION
// ==========================================
const ADMIN_EMAIL = 'admin@kohinoor.com'; // Change to your admin email

// ==========================================
// 🎨 STYLES
// ==========================================
const styles = {
    app: { fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', backgroundColor: '#fafafa', minHeight: '100vh', color: '#333' },
    header: { backgroundColor: '#b91c1c', color: 'white', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
    nav: { display: 'flex', gap: '15px' },
    navBtn: (isActive) => ({ padding: '10px 15px', backgroundColor: isActive ? '#991b1b' : 'transparent', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }),
    container: { maxWidth: '1200px', margin: '0 auto', padding: '20px' },
    card: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '20px' },
    input: { width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' },
    btnPrimary: { backgroundColor: '#b91c1c', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', width: '100%' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' },
    menuImg: { width: '100%', height: '180px', objectFit: 'cover', borderRadius: '4px' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '90%', maxWidth: '400px' }
};

// ==========================================
// 🚀 MAIN APPLICATION
// ==========================================
export default function App() {
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('menu');
    const [menuItems, setMenuItems] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);

    // Initial Auth & Data Load
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user || null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });

        fetchMenu();
        return () => subscription.unsubscribe();
    }, []);

    const fetchMenu = async () => {
        const { data, error } = await supabase.from('menu_items').select('*').order('category');
        if (!error && data) setMenuItems(data);
    };

    const isAdmin = user?.email === ADMIN_EMAIL;

    return (
        <div style={styles.app}>
            {/* 🛑 HEADER & NAVIGATION */}
            <header style={styles.header}>
                <h1 style={{ margin: 0 }}>Kohinoor Indian Restaurant</h1>
                <nav style={styles.nav}>
                    <button style={styles.navBtn(activeTab === 'menu')} onClick={() => setActiveTab('menu')}>Menu & Order</button>
                    <button style={styles.navBtn(activeTab === 'reservation')} onClick={() => setActiveTab('reservation')}>Book Table</button>
                    <button style={styles.navBtn(activeTab === 'location')} onClick={() => setActiveTab('location')}>Location</button>
                    {isAdmin && <button style={styles.navBtn(activeTab === 'admin')} onClick={() => setActiveTab('admin')}>Admin Dashboard</button>}
                    {!user ? (
                        <button style={styles.navBtn(false)} onClick={() => setShowLoginModal(true)}>Admin Login</button>
                    ) : (
                        <button style={styles.navBtn(false)} onClick={() => supabase.auth.signOut()}>Logout</button>
                    )}
                </nav>
            </header>

            {/* 🛑 MAIN CONTENT AREA */}
            <main style={styles.container}>
                {activeTab === 'menu' && <MenuAndOrderView menuItems={menuItems} cart={cart} setCart={setCart} />}
                {activeTab === 'reservation' && <ReservationView />}
                {activeTab === 'location' && <LocationView />}
                {activeTab === 'admin' && isAdmin && <AdminView menuItems={menuItems} fetchMenu={fetchMenu} />}
            </main>

            {/* 🛑 AUTH MODAL */}
            {showLoginModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h2 style={{ marginTop: 0 }}>Admin Login</h2>
                        <LoginForm onSuccess={() => setShowLoginModal(false)} onCancel={() => setShowLoginModal(false)} />
                    </div>
                </div>
            )}
        </div>
    );
}

// ==========================================
// 🍛 MENU & ORDERING VIEW
// ==========================================
function MenuAndOrderView({ menuItems, cart, setCart }) {
    const [customerInfo, setCustomerInfo] = useState({ name: '', email: '' });
    const [loading, setLoading] = useState(false);

    const addToCart = (item) => {
        const existing = cart.find(c => c.id === item.id);
        if (existing) {
            setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
        } else {
            setCart([...cart, { ...item, qty: 1 }]);
        }
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    const handleCheckout = async (e) => {
        e.preventDefault();
        if (cart.length === 0) return alert("Your cart is empty!");
        setLoading(true);
        const { error } = await supabase.from('orders').insert([{
            customer_name: customerInfo.name,
            email: customerInfo.email,
            items: cart,
            total_amount: cartTotal
        }]);
        setLoading(false);
        if (error) {
            alert("Error placing order: " + error.message);
        } else {
            alert("Order placed successfully!");
            setCart([]);
            setCustomerInfo({ name: '', email: '' });
        }
    };

    return (
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
            <div style={{ flex: '2', minWidth: '300px' }}>
                <h2>Our Menu</h2>
                <div style={styles.grid}>
                    {menuItems.filter(i => i.is_available).map(item => (
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

            <div style={{ flex: '1', minWidth: '300px' }}>
                <div style={{ ...styles.card, position: 'sticky', top: '20px' }}>
                    <h2>Your Order</h2>
                    {cart.length === 0 ? <p>Cart is empty</p> : (
                        <div style={{ marginBottom: '20px' }}>
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
                        <button type="submit" style={styles.btnPrimary} disabled={loading || cart.length === 0}>
                            {loading ? 'Processing...' : 'Place Order'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

// ==========================================
// 📅 RESERVATION VIEW
// ==========================================
function ReservationView() {
    const [form, setForm] = useState({ name: '', email: '', phone: '', date: '', time: '', party: 2 });
    const [loading, setLoading] = useState(false);

    const handleBooking = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.from('reservations').insert([{
            customer_name: form.name, email: form.email, phone: form.phone,
            date: form.date, time: form.time, party_size: form.party
        }]);
        setLoading(false);
        if (error) alert("Error booking table: " + error.message);
        else {
            alert("Table booked successfully! We will see you soon.");
            setForm({ name: '', email: '', phone: '', date: '', time: '', party: 2 });
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={styles.card}>
                <h2>Book a Table</h2>
                <form onSubmit={handleBooking}>
                    <input style={styles.input} type="text" placeholder="Full Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    <input style={styles.input} type="email" placeholder="Email Address" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    <input style={styles.input} type="tel" placeholder="Phone Number" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input style={styles.input} type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                        <input style={styles.input} type="time" required value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
                    </div>
                    <input style={styles.input} type="number" min="1" max="20" placeholder="Party Size" required value={form.party} onChange={e => setForm({ ...form, party: e.target.value })} />
                    <button type="submit" style={styles.btnPrimary} disabled={loading}>{loading ? 'Booking...' : 'Confirm Reservation'}</button>
                </form>
            </div>
        </div>
    );
}

// ==========================================
// 📍 LOCATION VIEW
// ==========================================
function LocationView() {
    return (
        <div style={styles.card}>
            <h2>Find Us</h2>
            <p>123 Spice Avenue, Culinary District, City</p>
            {/* Replace the src below with your actual Google Maps embed link for Kohinoor */}
            <iframe
                title="Kohinoor Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d113032.64621389814!2d-16.711818223652874!3d28.283182562479496!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xc6a80b628cb39d3%3A0xcb1bda0eb3e9610b!2sTenerife%2C%20Spain!5e0!3m2!1sen!2sus!4v1688561234567!5m2!1sen!2sus"
                width="100%"
                height="450"
                style={{ border: 0, borderRadius: '8px' }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade">
            </iframe>
        </div>
    );
}

// ==========================================
// ⚙️ ADMIN VIEW (Menu Management)
// ==========================================
function AdminView({ menuItems, fetchMenu }) {
    const [newItem, setNewItem] = useState({ name: '', description: '', price: '', image_url: '', category: 'Main' });
    const [loading, setLoading] = useState(false);

    const handleAddItem = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.from('menu_items').insert([{
            ...newItem,
            price: parseFloat(newItem.price)
        }]);
        setLoading(false);
        if (error) alert("Error adding item: " + error.message);
        else {
            alert("Item added!");
            setNewItem({ name: '', description: '', price: '', image_url: '', category: 'Main' });
            fetchMenu();
        }
    };

    const toggleAvailability = async (id, currentStatus) => {
        await supabase.from('menu_items').update({ is_available: !currentStatus }).eq('id', id);
        fetchMenu();
    };

    const deleteItem = async (id) => {
        if (window.confirm("Are you sure you want to delete this?")) {
            await supabase.from('menu_items').delete().eq('id', id);
            fetchMenu();
        }
    };

    return (
        <div>
            <h2>Admin Dashboard</h2>
            <div style={styles.card}>
                <h3>Add New Menu Item</h3>
                <form onSubmit={handleAddItem} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input style={{ ...styles.input, flex: '1', minWidth: '200px' }} type="text" placeholder="Dish Name" required value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                    <input style={{ ...styles.input, flex: '1', minWidth: '100px' }} type="number" step="0.01" placeholder="Price (£)" required value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
                    <input style={{ ...styles.input, flex: '1', minWidth: '150px' }} type="text" placeholder="Category (e.g. Starter)" required value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} />
                    <input style={{ ...styles.input, width: '100%' }} type="text" placeholder="Description" required value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} />
                    <input style={{ ...styles.input, width: '100%' }} type="url" placeholder="Image URL (optional)" value={newItem.image_url} onChange={e => setNewItem({ ...newItem, image_url: e.target.value })} />
                    <button type="submit" style={styles.btnPrimary} disabled={loading}>{loading ? 'Adding...' : 'Add Menu Item'}</button>
                </form>
            </div>

            <div style={styles.card}>
                <h3>Manage Menu</h3>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #eee' }}>
                            <th style={{ padding: '10px' }}>Name</th>
                            <th>Price</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {menuItems.map(item => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '10px' }}>{item.name}</td>
                                <td>£{item.price.toFixed(2)}</td>
                                <td>{item.is_available ? '🟢 Active' : '🔴 Hidden'}</td>
                                <td>
                                    <button onClick={() => toggleAvailability(item.id, item.is_available)} style={{ marginRight: '10px', padding: '5px', cursor: 'pointer' }}>Toggle</button>
                                    <button onClick={() => deleteItem(item.id)} style={{ padding: '5px', color: 'white', backgroundColor: '#dc2626', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ==========================================
// 🔐 AUTHENTICATION FORM
// ==========================================
function LoginForm({ onSuccess, onCancel }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);
        if (error) alert(error.message);
        else onSuccess();
    };

    return (
        <form onSubmit={handleLogin}>
            <input style={styles.input} type="email" placeholder="Admin Email" required value={email} onChange={e => setEmail(e.target.value)} />
            <input style={styles.input} type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} />
            <button type="submit" style={styles.btnPrimary} disabled={loading}>{loading ? 'Authenticating...' : 'Login'}</button>
            <button type="button" onClick={onCancel} style={{ ...styles.btnPrimary, backgroundColor: 'transparent', color: '#666', marginTop: '10px', border: '1px solid #ccc' }}>Cancel</button>
        </form>
    );
}