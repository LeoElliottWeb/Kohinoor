import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

// ==========================================
// 🛠️ CONFIGURATION
// ==========================================
const ADMIN_EMAIL = 'sales@noirsoft.net';
const RESEND_API_KEY = 're_2wyv6n3S_N1Gu8SMcwaSx1Yehzemf4JfT'; // ⚠️ Replace with your actual Resend API Key

// ==========================================
// 📧 EMAIL HELPER
// ==========================================
const sendEmail = async (toEmail, subject, htmlContent) => {
    if (!RESEND_API_KEY || RESEND_API_KEY === 'YOUR_RESEND_API_KEY_HERE') {
        console.warn("Resend API key missing. Email not sent.");
        return;
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                // "onboarding@resend.dev" only allows sending to the email address you signed up with.
                // To send to customers, you must add and verify your own domain in Resend.
                from: 'Kohinoor Restaurant <onboarding@resend.dev>',
                to: [toEmail],
                subject: subject,
                html: htmlContent
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Email failed');
        console.log("✅ Email sent successfully:", data);
    } catch (error) {
        console.error("❌ Error sending email:", error);
    }
};

// ==========================================
// 🎨 STYLES
// ==========================================
const styles = {
    app: {
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        backgroundColor: '#fed7aa',
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        color: '#333',
        display: 'flex',
        flexDirection: 'column'
    },
    header: { backgroundColor: '#c2410c', color: 'white', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
    nav: { display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' },
    navBtn: (isActive) => ({ padding: '10px 15px', backgroundColor: isActive ? '#9a3412' : 'transparent', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }),
    container: { maxWidth: '1200px', margin: '0 auto', padding: '20px', flexGrow: 1, width: '100%', boxSizing: 'border-box' },
    card: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '20px' },
    input: { width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' },
    btnPrimary: { backgroundColor: '#c2410c', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', width: '100%' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' },
    menuImg: { width: '100%', height: '180px', objectFit: 'cover', borderRadius: '4px' },
    heroImage: { width: '100%', height: '350px', objectFit: 'cover', borderRadius: '8px', marginBottom: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '90%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' },
    footer: { backgroundColor: '#c2410c', color: 'white', textAlign: 'center', padding: '15px 15px 50px 15px', marginTop: 'auto' },
    socialLink: { color: 'white', textDecoration: 'underline', fontWeight: 'bold' },
    categorySection: { width: '100%', gridColumn: '1 / -1' },
    categoryTitle: { margin: '30px 0 15px 0', borderBottom: '2px solid #c2410c', paddingBottom: '8px', color: '#c2410c' }
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
        if (error) {
            console.error("❌ Supabase Error:", error.message);
        } else if (data) {
            setMenuItems(data);
        }
    }, []);

    const fetchCategories = useCallback(async () => {
        const { data, error } = await supabase
            .from('menu_categories')
            .select('*')
            .order('display_order', { ascending: true });

        if (error) console.error("❌ Category Fetch Error:", error.message);
        else if (data) setCategories(data);
    }, []);

    useEffect(() => {
        fetchMenu();
        fetchCategories();

        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user || null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });

        return () => subscription.unsubscribe();
    }, [fetchMenu, fetchCategories]);

    const isAdmin = hardcodedAdmin || user?.email === ADMIN_EMAIL;

    const handleLogout = () => {
        if (hardcodedAdmin) {
            setHardcodedAdmin(false);
        } else {
            supabase.auth.signOut();
        }
        setActiveTab('menu');
    };

    return (
        <div style={styles.app}>
            <header style={styles.header}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <h1 style={{ margin: 0 }}>Kohinoor Indian Restaurant</h1>
                    <span style={{ fontSize: '14px', fontStyle: 'italic', color: '#ffedd5', margin: 0 }}>
                        All dishes can be prepared to your taste: Mild, Medium or Spicy
                    </span>
                </div>

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
                {activeTab === 'admin' && isAdmin && (
                    <AdminView
                        menuItems={menuItems}
                        fetchMenu={fetchMenu}
                        categories={categories}
                        fetchCategories={fetchCategories}
                    />
                )}
                {activeTab === 'account' && user && !hardcodedAdmin && <AccountView user={user} setCart={setCart} setActiveTab={setActiveTab} />}
            </main>

            <footer style={styles.footer}>
                <p style={{ margin: '0 0 10px 0' }}>© {new Date().getFullYear()} Kohinoor Indian Restaurant. All rights reserved.</p>
                <p style={{ margin: 0 }}>Follow us on <a href="https://www.facebook.com/IndianRestaurantsTenerife" target="_blank" rel="noopener noreferrer" style={styles.socialLink}>Facebook</a></p>
            </footer>

            {showAuthModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <AuthForm
                            onSuccess={(data) => {
                                if (data?.isHardcodedAdmin) {
                                    setHardcodedAdmin(true);
                                    setActiveTab('admin');
                                }
                                setShowAuthModal(false);
                            }}
                            onCancel={() => setShowAuthModal(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ==========================================
// 👤 ACCOUNT VIEW
// ==========================================
function AccountView({ user, setCart, setActiveTab }) {
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState([]);

    const [formData, setFormData] = useState({
        first_name: user?.user_metadata?.first_name || '',
        last_name: user?.user_metadata?.last_name || '',
        address: user?.user_metadata?.address || '',
        mobile_number: user?.user_metadata?.mobile_number || ''
    });

    useEffect(() => {
        fetchOrderHistory();
    }, [user]);

    const fetchOrderHistory = async () => {
        if (!user?.email) return;
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('email', user.email)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setOrders(data);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.updateUser({
            data: formData
        });
        setLoading(false);

        if (error) {
            alert("Error updating profile: " + error.message);
        } else {
            alert("Profile updated successfully!");
        }
    };

    const handleRepeatOrder = (items) => {
        setCart(items);
        setActiveTab('menu');
        alert("Previous order items have been added to your cart!");
    };

    return (
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '300px' }}>
                <div style={styles.card}>
                    <h2>My Profile</h2>
                    <form onSubmit={handleProfileUpdate}>
                        <label style={{ fontWeight: 'bold', fontSize: '14px' }}>First Name</label>
                        <input style={styles.input} type="text" required value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} />
                        <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Last Name</label>
                        <input style={styles.input} type="text" required value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} />
                        <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Mobile Number</label>
                        <input style={styles.input} type="tel" required value={formData.mobile_number} onChange={e => setFormData({ ...formData, mobile_number: e.target.value })} />
                        <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Full Address</label>
                        <textarea style={{ ...styles.input, resize: 'vertical', minHeight: '80px' }} required value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                        <button type="submit" style={styles.btnPrimary} disabled={loading}>
                            {loading ? 'Saving...' : 'Update Details'}
                        </button>
                    </form>
                </div>
            </div>

            <div style={{ flex: '2', minWidth: '300px' }}>
                <div style={styles.card}>
                    <h2>Order History</h2>
                    {orders.length === 0 ? (
                        <p>You haven't placed any orders yet.</p>
                    ) : (
                        <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '10px' }}>
                            {orders.map(order => (
                                <div key={order.id} style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <strong>Date: {new Date(order.created_at).toLocaleDateString()}</strong>
                                        <span style={{ fontWeight: 'bold', color: '#c2410c' }}>£{order.total_amount.toFixed(2)}</span>
                                    </div>
                                    <ul style={{ margin: '0 0 15px 0', paddingLeft: '20px', color: '#555' }}>
                                        {order.items.map((item, idx) => (
                                            <li key={idx}>{item.qty}x {item.name}</li>
                                        ))}
                                    </ul>
                                    <button
                                        onClick={() => handleRepeatOrder(order.items)}
                                        style={{ ...styles.btnPrimary, width: 'auto', padding: '8px 15px', fontSize: '14px' }}
                                    >
                                        Repeat Order
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
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
            const firstName = user.user_metadata?.first_name || '';
            const lastName = user.user_metadata?.last_name || '';
            setCustomerInfo({
                name: `${firstName} ${lastName}`.trim(),
                email: user.email || ''
            });
        }
    }, [user]);

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

        if (error) {
            alert("Error placing order: " + error.message);
            setLoading(false);
            return;
        }

        // 📧 1. SEND CUSTOMER CONFIRMATION EMAIL
        const customerEmailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #c2410c;">Order Confirmed!</h2>
                <p>Hi ${customerInfo.name},</p>
                <p>Thank you for your order from Kohinoor Indian Restaurant. We are preparing it right now!</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    ${cart.map(item => `
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${item.qty}x</strong> ${item.name}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">£${(item.price * item.qty).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                    <tr>
                        <td style="padding: 10px; font-weight: bold; font-size: 18px;">Total:</td>
                        <td style="padding: 10px; font-weight: bold; font-size: 18px; text-align: right;">£${cartTotal.toFixed(2)}</td>
                    </tr>
                </table>
            </div>
        `;
        await sendEmail(customerInfo.email, "Your Kohinoor Order Confirmation", customerEmailHtml);

        // 📧 2. SEND ADMIN NOTIFICATION EMAIL
        const adminEmailHtml = `
            <h3>New Order Received!</h3>
            <p><strong>Customer:</strong> ${customerInfo.name} (${customerInfo.email})</p>
            <p><strong>Total Amount:</strong> £${cartTotal.toFixed(2)}</p>
            <p>Check the admin dashboard for full details.</p>
        `;
        await sendEmail(ADMIN_EMAIL, "New Kohinoor Order!", adminEmailHtml);

        setLoading(false);
        alert("Order placed successfully! We've sent you a confirmation email.");
        setCart([]);
        if (!user) {
            setCustomerInfo({ name: '', email: '' });
        }
    };

    const availableItems = menuItems.filter(i => i.is_available !== false);

    return (
        <div>
            <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                <div style={{ flex: '2.8', minWidth: '300px' }}>
                    <img
                        src={`${import.meta.env.BASE_URL}home.jpg`}
                        alt="Delicious Indian Food Spread"
                        style={styles.heroImage}
                    />

                    <h2 style={{ marginTop: 0 }}>Our Menu</h2>

                    <div style={styles.grid}>
                        {categories.map(category => {
                            const itemsInCategory = availableItems.filter(item => item.category === category.name);
                            if (itemsInCategory.length === 0) return null;

                            return (
                                <div key={category.id} style={styles.categorySection}>
                                    <h3 style={styles.categoryTitle}>{category.name}</h3>
                                    <div style={styles.grid}>
                                        {itemsInCategory.map(item => (
                                            <div key={item.id} style={styles.card}>
                                                {item.image_url && <img src={item.image_url} alt={item.name} style={styles.menuImg} />}
                                                <div style={{ marginTop: '10px', display: 'inline-block', backgroundColor: '#fed7aa', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', color: '#9a3412' }}>
                                                    {item.category}
                                                </div>
                                                <h3 style={{ marginBottom: '5px', marginTop: '5px' }}>{item.name}</h3>
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
                            <button type="submit" style={styles.btnPrimary} disabled={loading || cart.length === 0}>
                                {loading ? 'Processing...' : 'Place Order'}
                            </button>
                        </form>
                    </div>
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

        if (error) {
            alert("Error booking table: " + error.message);
            setLoading(false);
            return;
        }

        // 📧 1. SEND CUSTOMER BOOKING CONFIRMATION EMAIL
        const bookingHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #c2410c;">Table Reservation Confirmed!</h2>
                <p>Hi ${form.name},</p>
                <p>Your table has been successfully booked at Kohinoor Indian Restaurant.</p>
                <ul>
                    <li><strong>Date:</strong> ${form.date}</li>
                    <li><strong>Time:</strong> ${form.time}</li>
                    <li><strong>Party Size:</strong> ${form.party} guests</li>
                </ul>
                <p>We look forward to serving you soon!</p>
            </div>
        `;
        await sendEmail(form.email, "Kohinoor Reservation Confirmed", bookingHtml);

        // 📧 2. SEND ADMIN NOTIFICATION EMAIL
        const adminHtml = `
            <h3>New Table Reservation</h3>
            <p><strong>Name:</strong> ${form.name}</p>
            <p><strong>Email:</strong> ${form.email}</p>
            <p><strong>Phone:</strong> ${form.phone}</p>
            <p><strong>When:</strong> ${form.date} at ${form.time}</p>
            <p><strong>Guests:</strong> ${form.party}</p>
        `;
        await sendEmail(ADMIN_EMAIL, `New Booking for ${form.date}`, adminHtml);

        setLoading(false);
        alert("Table booked successfully! We've sent you a confirmation email.");
        setForm({ name: '', email: '', phone: '', date: '', time: '', party: 2 });
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
            <p>Calle Trasera San Blas, 38639 Santa Cruz de Tenerife, Spain</p>
            <iframe
                title="Kohinoor Location"
                src="https://maps.google.com/maps?q=Calle%20Trasera%20San%20Blas,%2038639%20Santa%20Cruz%20de%20Tenerife,%20Spain&t=&z=16&ie=UTF8&iwloc=&output=embed"
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
// ⚙️ ADMIN VIEW
// ==========================================
function AdminView({ menuItems, fetchMenu, categories, fetchCategories }) {
    const [editingItemId, setEditingItemId] = useState(null);
    const initialFormState = {
        name: '',
        description: '',
        price: '',
        category: categories.length > 0 ? categories[0].name : 'Main',
        image_url: ''
    };
    const [formItem, setFormItem] = useState(initialFormState);
    const [imageFile, setImageFile] = useState(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [loading, setLoading] = useState({ menu: false, category: false });
    const [allOrders, setAllOrders] = useState([]);

    useEffect(() => {
        if (!formItem.category && categories.length > 0) {
            setFormItem(prev => ({ ...prev, category: categories[0].name }));
        }
    }, [categories]);

    useEffect(() => {
        fetchAllOrders();
    }, []);

    const fetchAllOrders = async () => {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setAllOrders(data);
        } else {
            console.error("Error fetching all orders:", error?.message);
        }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        setLoading(prev => ({ ...prev, category: true }));
        const { error } = await supabase.from('menu_categories').insert([{ name: newCategoryName.trim() }]);
        setLoading(prev => ({ ...prev, category: false }));
        if (error) alert("Error adding category: " + error.message);
        else {
            setNewCategoryName('');
            fetchCategories();
        }
    };

    const handleDeleteCategory = async (id, name) => {
        const inUse = menuItems.some(item => item.category === name);
        if (inUse) {
            alert(`Cannot delete '${name}' because menu items are actively using it.`);
            return;
        }
        if (window.confirm(`Delete category '${name}'?`)) {
            await supabase.from('menu_categories').delete().eq('id', id);
            fetchCategories();
        }
    };

    const startEditItem = (item) => {
        setEditingItemId(item.id);
        setFormItem({
            name: item.name,
            description: item.description,
            price: item.price,
            category: item.category,
            image_url: item.image_url || ''
        });
        setImageFile(null);
        if (document.getElementById('image-upload-input')) {
            document.getElementById('image-upload-input').value = "";
        }
    };

    const cancelEditItem = () => {
        setEditingItemId(null);
        setFormItem(initialFormState);
        setImageFile(null);
        if (document.getElementById('image-upload-input')) {
            document.getElementById('image-upload-input').value = "";
        }
    };

    const handleSaveItem = async (e) => {
        e.preventDefault();
        setLoading(prev => ({ ...prev, menu: true }));

        let finalImageUrl = formItem.image_url;

        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('menu-images')
                .upload(fileName, imageFile);

            if (uploadError) {
                alert("Error uploading image: " + uploadError.message);
                setLoading(prev => ({ ...prev, menu: false }));
                return;
            }

            const { data } = supabase.storage.from('menu-images').getPublicUrl(fileName);
            finalImageUrl = data.publicUrl;
        }

        const itemPayload = {
            name: formItem.name,
            description: formItem.description,
            price: parseFloat(formItem.price),
            category: formItem.category,
            image_url: finalImageUrl
        };

        if (editingItemId) {
            const { error } = await supabase.from('menu_items').update(itemPayload).eq('id', editingItemId);
            if (error) alert("Error updating item: " + error.message);
            else alert("Item updated successfully!");
        } else {
            const { error } = await supabase.from('menu_items').insert([{ ...itemPayload, is_available: true }]);
            if (error) alert("Error adding item: " + error.message);
            else alert("Item added successfully!");
        }

        setLoading(prev => ({ ...prev, menu: false }));
        cancelEditItem();
        fetchMenu();
    };

    const toggleAvailability = async (id, currentStatus) => {
        const isCurrentlyAvailable = currentStatus !== false;
        await supabase.from('menu_items').update({ is_available: !isCurrentlyAvailable }).eq('id', id);
        fetchMenu();
    };

    const deleteItem = async (id) => {
        if (window.confirm("Are you sure you want to delete this menu item?")) {
            await supabase.from('menu_items').delete().eq('id', id);
            fetchMenu();
        }
    };

    return (
        <div>
            <h2>Admin Dashboard</h2>

            <div style={{ ...styles.card, backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
                <h3>Manage Available Categories</h3>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '10px', flex: '1', minWidth: '250px' }}>
                        <input style={{ ...styles.input, marginBottom: 0 }} type="text" placeholder="New Category Name" required value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                        <button type="submit" style={{ ...styles.btnPrimary, width: 'auto' }} disabled={loading.category}>Add</button>
                    </form>
                    <div style={{ flex: '2', minWidth: '300px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {categories.map(cat => (
                            <div key={cat.id} style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', padding: '5px 10px', borderRadius: '20px', border: '1px solid #ccc' }}>
                                <span style={{ marginRight: '10px', fontSize: '14px', fontWeight: 'bold' }}>{cat.name}</span>
                                <button type="button" onClick={() => handleDeleteCategory(cat.id, cat.name)} style={{ border: 'none', background: 'transparent', color: 'red', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ color: editingItemId ? '#c2410c' : '#333' }}>
                        {editingItemId ? `✏️ Editing: ${formItem.name}` : '➕ Add New Menu Item'}
                    </h3>
                    {editingItemId && <button onClick={cancelEditItem} style={{ border: '1px solid #ccc', background: 'transparent', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Cancel Edit</button>}
                </div>

                <form onSubmit={handleSaveItem} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input style={{ ...styles.input, flex: '1', minWidth: '200px' }} type="text" placeholder="Dish Name" required value={formItem.name} onChange={e => setFormItem({ ...formItem, name: e.target.value })} />
                    <input style={{ ...styles.input, flex: '1', minWidth: '100px' }} type="number" step="0.01" placeholder="Price (£)" required value={formItem.price} onChange={e => setFormItem({ ...formItem, price: e.target.value })} />
                    <select style={{ ...styles.input, flex: '1', minWidth: '150px' }} required value={formItem.category} onChange={e => setFormItem({ ...formItem, category: e.target.value })}>
                        {categories.length === 0 && <option value="">No categories...</option>}
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                    </select>
                    <input style={{ ...styles.input, width: '100%' }} type="text" placeholder="Description" required value={formItem.description} onChange={e => setFormItem({ ...formItem, description: e.target.value })} />
                    <div style={{ width: '100%', marginBottom: '15px' }}>
                        <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Image Upload (Optional)</label>
                        <input id="image-upload-input" style={{ ...styles.input, marginBottom: '5px' }} type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} />
                        {editingItemId && formItem.image_url && !imageFile && (
                            <span style={{ fontSize: '12px', color: '#666' }}>Leaving this empty will keep the existing image.</span>
                        )}
                    </div>
                    <button type="submit" style={styles.btnPrimary} disabled={loading.menu || categories.length === 0}>
                        {loading.menu ? 'Saving...' : (editingItemId ? 'Update Menu Item' : 'Add Menu Item')}
                    </button>
                </form>
            </div>

            <div style={styles.card}>
                <h3>Manage Menu Items</h3>
                <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                            <tr style={{ borderBottom: '2px solid #eee' }}>
                                <th style={{ padding: '10px' }}>Category</th>
                                <th>Name</th>
                                <th>Price</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {menuItems.map(item => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #eee', backgroundColor: editingItemId === item.id ? '#fff7ed' : 'transparent' }}>
                                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#c2410c' }}>{item.category}</td>
                                    <td>{item.name}</td>
                                    <td>£{item.price.toFixed(2)}</td>
                                    <td>{item.is_available !== false ? '🟢 Active' : '🔴 Hidden'}</td>
                                    <td>
                                        <button onClick={() => startEditItem(item)} style={{ marginRight: '5px', padding: '5px 10px', cursor: 'pointer', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '3px' }}>Edit</button>
                                        <button onClick={() => toggleAvailability(item.id, item.is_available)} style={{ marginRight: '5px', padding: '5px 10px', cursor: 'pointer' }}>Toggle</button>
                                        <button onClick={() => deleteItem(item.id)} style={{ padding: '5px 10px', color: 'white', backgroundColor: '#dc2626', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={styles.card}>
                <h3>All Customer Orders</h3>
                {allOrders.length === 0 ? (
                    <p>No orders have been placed yet.</p>
                ) : (
                    <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '10px' }}>
                        {allOrders.map(order => (
                            <div key={order.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', marginBottom: '15px', backgroundColor: '#fafafa' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                                    <div>
                                        <strong style={{ fontSize: '16px' }}>Date: {new Date(order.created_at).toLocaleString()}</strong>
                                        <div style={{ color: '#555', marginTop: '4px' }}>
                                            <strong>Customer:</strong> {order.customer_name} ({order.email})
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontWeight: 'bold', color: '#c2410c', fontSize: '20px' }}>
                                            £{order.total_amount?.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ fontSize: '14px', color: '#333' }}>
                                    <strong>Items Ordered:</strong>
                                    <ul style={{ margin: '5px 0 0 20px', padding: 0 }}>
                                        {order.items?.map((item, idx) => (
                                            <li key={idx} style={{ marginBottom: '3px' }}>
                                                <span style={{ fontWeight: 'bold' }}>{item.qty}x</span> {item.name}
                                                <span style={{ color: '#888', marginLeft: '5px' }}>(£{(item.price * item.qty).toFixed(2)})</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ==========================================
// 🔐 AUTHENTICATION FORM
// ==========================================
function AuthForm({ onSuccess, onCancel }) {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [address, setAddress] = useState('');
    const [mobile, setMobile] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (isLogin) {
            if (identifier === 'AdminK' && password === 'dkskoddlks££1') {
                setLoading(false);
                onSuccess({ isHardcodedAdmin: true });
                return;
            }

            const { error } = await supabase.auth.signInWithPassword({ email: identifier, password });
            setLoading(false);
            if (error) alert(error.message);
            else onSuccess({ isHardcodedAdmin: false });
        } else {
            const { error } = await supabase.auth.signUp({
                email: identifier,
                password,
                options: {
                    data: {
                        first_name: firstName,
                        last_name: lastName,
                        address: address,
                        mobile_number: mobile
                    }
                }
            });
            setLoading(false);

            if (error) {
                alert(error.message);
            } else {
                alert("Account created successfully! Please check your email to confirm your account.");
                onSuccess({ isHardcodedAdmin: false });
            }
        }
    };

    return (
        <div>
            <h2 style={{ marginTop: 0 }}>{isLogin ? 'Login' : 'Create an Account'}</h2>
            <form onSubmit={handleSubmit}>
                {!isLogin && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input style={styles.input} type="text" placeholder="First Name" required={!isLogin} value={firstName} onChange={e => setFirstName(e.target.value)} />
                        <input style={styles.input} type="text" placeholder="Last Name" required={!isLogin} value={lastName} onChange={e => setLastName(e.target.value)} />
                    </div>
                )}
                <input style={styles.input} type="text" placeholder={isLogin ? "Email Address or Username" : "Email Address"} required value={identifier} onChange={e => setIdentifier(e.target.value)} />
                <input style={styles.input} type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} />
                {!isLogin && (
                    <>
                        <input style={styles.input} type="tel" placeholder="Mobile Number" required={!isLogin} value={mobile} onChange={e => setMobile(e.target.value)} />
                        <input style={styles.input} type="text" placeholder="Full Address" required={!isLogin} value={address} onChange={e => setAddress(e.target.value)} />
                    </>
                )}
                <button type="submit" style={styles.btnPrimary} disabled={loading}>
                    {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
                </button>
                <button type="button" onClick={() => setIsLogin(!isLogin)} style={{ width: '100%', background: 'none', border: 'none', color: '#c2410c', marginTop: '15px', cursor: 'pointer', fontWeight: 'bold' }}>
                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
                </button>
                <button type="button" onClick={onCancel} style={{ ...styles.btnPrimary, backgroundColor: 'transparent', color: '#666', marginTop: '10px', border: '1px solid #ccc' }}>Cancel</button>
            </form>
        </div>
    );
}