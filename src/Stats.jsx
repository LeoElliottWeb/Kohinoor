import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, CartesianGrid
} from 'recharts';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CFE', '#FF6B6B', '#4ECDC4'];
const monthsOfYear = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const getCleanCountryName = (rawCountry) => {
    if (!rawCountry) return 'Unknown';

    const pureCode = String(rawCountry).replace(/[^a-zA-Z]/g, '').toUpperCase();

    if (pureCode === 'US' || pureCode === 'USA' || pureCode === 'UNITEDSTATES') return 'United States';
    if (pureCode === 'ES' || pureCode === 'ESP' || pureCode === 'SPAIN') return 'Spain';
    if (pureCode === 'UK' || pureCode === 'GB' || pureCode === 'UNITEDKINGDOM' || pureCode === 'GREATBRITAIN') return 'United Kingdom';
    if (pureCode === 'CA' || pureCode === 'CAN' || pureCode === 'CANADA') return 'Canada';
    if (pureCode === 'DE' || pureCode === 'GER' || pureCode === 'GERMANY') return 'Germany';
    if (pureCode === 'IT' || pureCode === 'ITA' || pureCode === 'ITALY') return 'Italy';
    if (pureCode === 'IN' || pureCode === 'IND' || pureCode === 'INDIA') return 'India';
    if (pureCode === 'IE' || pureCode === 'IRE' || pureCode === 'IRELAND') return 'Ireland';
    if (pureCode === 'NG' || pureCode === 'NGA' || pureCode === 'NIGERIA') return 'Nigeria';

    const readableName = String(rawCountry).replace(/[^a-zA-Z\s]/g, '').trim();
    return readableName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || 'Unknown';
};

export default function Stats() {
    const [visitors, setVisitors] = useState([]);
    const [signups, setSignups] = useState([]);
    const [selectedDay, setSelectedDay] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedSignupMonth, setSelectedSignupMonth] = useState(null);

    useEffect(() => {
        async function fetchAllData(tableName, selectQuery = '*') {
            let allData = [];
            let from = 0;
            const pageSize = 1000;
            let keepFetching = true;

            while (keepFetching) {
                const { data, error } = await supabase
                    .from(tableName)
                    .select(selectQuery)
                    .order('created_at', { ascending: false })
                    .range(from, from + pageSize - 1);

                if (error) {
                    console.error(`Error fetching ${tableName}:`, error);
                    break;
                }

                if (data && data.length > 0) {
                    allData = [...allData, ...data];
                    from += data.length;

                    if (data.length < pageSize) {
                        keepFetching = false;
                    }
                } else {
                    keepFetching = false;
                }
            }

            const uniqueData = [];
            const seenKeys = new Set();

            allData.forEach(item => {
                if (item.id) {
                    if (!seenKeys.has(item.id)) {
                        seenKeys.add(item.id);
                        uniqueData.push(item);
                    }
                } else {
                    uniqueData.push(item);
                }
            });

            return uniqueData;
        }

        async function fetchStats() {
            const [visitorsRes, signupsRes] = await Promise.all([
                fetchAllData('visitors', '*'),
                fetchAllData('signup_stats', '*')
            ]);

            const cleanVisitors = (visitorsRes || []).map(v => ({
                ...v,
                country: getCleanCountryName(v.country)
            }));

            setVisitors(cleanVisitors);
            setSignups(signupsRes || []);
        }

        fetchStats();
    }, []);

    // ==========================================
    // UTC DATE REFERENCE PROFILE
    // ==========================================
    const now = new Date();
    const currentUTCMonth = now.getUTCMonth();
    const currentUTCYear = now.getUTCFullYear();
    const currentUTCDate = now.getUTCDate();
    const currentUTCDayOfWeek = now.getUTCDay(); // 0 = Sunday, 6 = Saturday

    // Calculate the precise UTC start time of the current week (Sunday at 00:00:00)
    const startOfCurrentWeek = new Date(Date.UTC(currentUTCYear, currentUTCMonth, currentUTCDate));
    startOfCurrentWeek.setUTCDate(startOfCurrentWeek.getUTCDate() - currentUTCDayOfWeek);

    let totalSignups = signups.length;
    let signupsToday = 0;
    let signupsThisMonth = 0;
    let signupsThisYear = 0;

    const signupsByMonthMap = {};
    const dailySignupsByMonthMap = {};

    signups.forEach(user => {
        const d = new Date(user.created_at);
        const year = d.getUTCFullYear();
        const monthIndex = d.getUTCMonth();
        const dayDate = d.getUTCDate();
        const monthName = monthsOfYear[monthIndex];
        const monthKey = `${monthName} ${year}`;

        if (year === currentUTCYear) {
            signupsThisYear++;
            if (monthIndex === currentUTCMonth) {
                signupsThisMonth++;
                if (dayDate === currentUTCDate) {
                    signupsToday++;
                }
            }
        }

        if (!signupsByMonthMap[monthKey]) {
            signupsByMonthMap[monthKey] = { name: monthKey, value: 0 };
        }
        signupsByMonthMap[monthKey].value++;

        const sortableDateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayDate).padStart(2, '0')}`;

        if (!dailySignupsByMonthMap[monthKey]) {
            dailySignupsByMonthMap[monthKey] = {};
        }
        if (!dailySignupsByMonthMap[monthKey][sortableDateKey]) {
            dailySignupsByMonthMap[monthKey][sortableDateKey] = { count: 0 };
        }
        dailySignupsByMonthMap[monthKey][sortableDateKey].count++;
    });

    const signupsPieData = Object.values(signupsByMonthMap);

    let selectedMonthBarData = [];
    if (selectedSignupMonth) {
        const [monthStr, yearStr] = selectedSignupMonth.split(' ');
        const monthIndex = monthsOfYear.indexOf(monthStr);
        const selectedYear = parseInt(yearStr, 10);

        const daysInMonth = new Date(Date.UTC(selectedYear, monthIndex + 1, 0)).getUTCDate();

        selectedMonthBarData = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const sortableDateKey = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            return {
                date: `${monthStr} ${day}`,
                count: dailySignupsByMonthMap[selectedSignupMonth]?.[sortableDateKey]?.count || 0
            };
        });
    }

    // ==========================================
    // 1. WEEKLY DATA PROCESSING (USING UTC + FILTER)
    // ==========================================
    const weeklyData = daysOfWeek.map(day => ({ name: day, count: 0 }));

    // NEW: Filter the master array to ONLY include hits from this Sunday onwards
    const visitorsThisWeek = visitors.filter(v => {
        const d = new Date(v.created_at);
        return d.getTime() >= startOfCurrentWeek.getTime();
    });

    visitorsThisWeek.forEach(v => {
        const date = new Date(v.created_at);
        weeklyData[date.getUTCDay()].count += 1;
    });

    let weeklyFiltered = visitorsThisWeek;
    if (selectedDay) {
        weeklyFiltered = visitorsThisWeek.filter(v => daysOfWeek[new Date(v.created_at).getUTCDay()] === selectedDay);
    }

    // ==========================================
    // 2. MONTHLY DATA PROCESSING (USING UTC)
    // ==========================================
    const monthlyData = monthsOfYear.map(month => ({ name: month, count: 0 }));

    visitors.forEach(v => {
        const date = new Date(v.created_at);
        if (date.getUTCFullYear() === currentUTCYear) {
            monthlyData[date.getUTCMonth()].count += 1;
        }
    });

    let monthlyFiltered = visitors;
    if (selectedMonth) {
        monthlyFiltered = visitors.filter(v => {
            const d = new Date(v.created_at);
            return monthsOfYear[d.getUTCMonth()] === selectedMonth && d.getUTCFullYear() === currentUTCYear;
        });
    }

    // ==========================================
    // 3. OVER TIME DATA PROCESSING (USING UTC)
    // ==========================================
    const timeSeriesMap = {};
    const uniqueCountries = new Set();
    const uniqueDevices = new Set();

    visitors.forEach(v => {
        const d = new Date(v.created_at);
        const day = d.getUTCDate();
        const monthStr = monthsOfYear[d.getUTCMonth()];
        const year = d.getUTCFullYear();
        const dateStr = `${monthStr} ${day}, ${year}`;

        if (!timeSeriesMap[dateStr]) {
            timeSeriesMap[dateStr] = { date: dateStr, rawDate: d };
        }

        const device = v.device_type;
        if (device) {
            uniqueDevices.add(device);
            timeSeriesMap[dateStr][device] = (timeSeriesMap[dateStr][device] || 0) + 1;
        }

        const country = v.country;
        if (country) {
            uniqueCountries.add(country);
            timeSeriesMap[dateStr][country] = (timeSeriesMap[dateStr][country] || 0) + 1;
        }
    });

    const timeSeriesData = Object.values(timeSeriesMap).sort((a, b) => a.rawDate - b.rawDate);
    const countriesArray = Array.from(uniqueCountries);
    const devicesArray = Array.from(uniqueDevices);

    const getPieData = (dataArray, key) => {
        const counts = {};
        dataArray.forEach(v => {
            const val = v[key] || 'Unknown';
            counts[val] = (counts[val] || 0) + 1;
        });
        return Object.keys(counts).map(k => ({ name: k, value: counts[k] })).sort((a, b) => b.value - a.value);
    };

    const cardStyle = {
        flex: '1',
        minWidth: '200px',
        backgroundColor: '#2a2a2a',
        padding: '20px',
        borderRadius: '8px',
        textAlign: 'center',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
    };

    const metricStyle = {
        fontSize: '2.5rem',
        fontWeight: 'bold',
        margin: '10px 0 0 0',
        color: '#4ade80'
    };

    return (
        <div style={{
            padding: '20px',
            color: 'white',
            backgroundColor: '#1e1e1e',
            height: '100vh',
            overflowY: 'auto',
            boxSizing: 'border-box',
            fontFamily: 'sans-serif'
        }}>

            {/* --- SECTION 0: SIGNUPS SUMMARY --- */}
            <div style={{ marginBottom: '60px' }}>
                <h2>Signup Overview</h2>

                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '40px' }}>
                    <div style={cardStyle}>
                        <h4 style={{ margin: 0, color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Signups</h4>
                        <p style={metricStyle}>{totalSignups}</p>
                    </div>
                    <div style={cardStyle}>
                        <h4 style={{ margin: 0, color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px' }}>Today (UTC)</h4>
                        <p style={metricStyle}>{signupsToday}</p>
                    </div>
                    <div style={cardStyle}>
                        <h4 style={{ margin: 0, color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px' }}>This Month</h4>
                        <p style={metricStyle}>{signupsThisMonth}</p>
                    </div>
                    <div style={cardStyle}>
                        <h4 style={{ margin: 0, color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px' }}>This Year</h4>
                        <p style={metricStyle}>{signupsThisYear}</p>
                    </div>
                </div>

                <div style={{ width: '100%', height: 350, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h4 style={{ textAlign: 'center', color: '#ccc', margin: '0 0 10px 0' }}>Signups by Month</h4>
                    <p style={{ color: '#aaa', fontSize: '0.9rem', margin: '0 0 20px 0' }}>Click a slice to see daily breakdown!</p>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={signupsPieData}
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                dataKey="value"
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                onClick={(data) => setSelectedSignupMonth(data.name)}
                                style={{ cursor: 'pointer' }}
                            >
                                {signupsPieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#222', border: 'none' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {selectedSignupMonth && (
                    <div style={{ width: '100%', height: 350, marginTop: '40px' }}>
                        <h4 style={{ textAlign: 'center', color: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
                            Daily Signups for {selectedSignupMonth}
                            <button
                                onClick={() => setSelectedSignupMonth(null)}
                                style={{ padding: '6px 12px', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                                Clear Selection
                            </button>
                        </h4>
                        <ResponsiveContainer>
                            <BarChart data={selectedMonthBarData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="date" stroke="#ccc" />
                                <YAxis stroke="#ccc" allowDecimals={false} />
                                <Tooltip cursor={{ fill: '#333' }} contentStyle={{ backgroundColor: '#222', border: 'none' }} />
                                <Bar dataKey="count" fill="#A28CFE" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            <hr style={{ borderColor: '#333', margin: '40px 0' }} />

            {/* --- SECTION 1: WEEKLY --- */}
            <div style={{ marginBottom: '60px' }}>
                <h2>Current Weekly Visitor Stats</h2>
                <p style={{ color: '#aaa' }}>Click a bar to drill down into a specific day this week!</p>
                <div style={{ width: '100%', height: 250, marginBottom: '20px' }}>
                    <ResponsiveContainer>
                        <BarChart data={weeklyData}>
                            <XAxis dataKey="name" stroke="#ccc" />
                            <YAxis stroke="#ccc" />
                            <Tooltip cursor={{ fill: '#333' }} contentStyle={{ backgroundColor: '#222', border: 'none' }} />
                            <Bar dataKey="count" fill="#4ade80" onClick={(data) => setSelectedDay(data.name)} style={{ cursor: 'pointer' }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', height: 250 }}>
                    <div style={{ width: '45%' }}>
                        <h4 style={{ textAlign: 'center' }}>{selectedDay ? `${selectedDay}'s` : "This Week's"} Countries</h4>
                        <ResponsiveContainer><PieChart><Pie data={getPieData(weeklyFiltered, 'country')} cx="50%" cy="50%" outerRadius={60} dataKey="value" label>{getPieData(weeklyFiltered, 'country').map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
                    </div>
                    <div style={{ width: '45%' }}>
                        <h4 style={{ textAlign: 'center' }}>{selectedDay ? `${selectedDay}'s` : "This Week's"} Devices</h4>
                        <ResponsiveContainer><PieChart><Pie data={getPieData(weeklyFiltered, 'device_type')} cx="50%" cy="50%" outerRadius={60} dataKey="value" label>{getPieData(weeklyFiltered, 'device_type').map((e, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
                    </div>
                </div>

                {/* --- NEW DATA GRID FOR SELECTED DAY DETAILS --- */}
                {selectedDay && (
                    <div style={{ marginTop: '40px', backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px', clear: 'both' }}>
                        <h3 style={{ marginTop: 0 }}>Visitor Details for {selectedDay}</h3>
                        <div style={{ overflowX: 'auto', maxHeight: '300px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#2a2a2a', zIndex: 1 }}>
                                    <tr style={{ borderBottom: '2px solid #444' }}>
                                        <th style={{ padding: '12px 10px', color: '#ccc' }}>Date / Time (UTC)</th>
                                        <th style={{ padding: '12px 10px', color: '#ccc' }}>Country</th>
                                        <th style={{ padding: '12px 10px', color: '#ccc' }}>Device Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {weeklyFiltered.map((v, idx) => (
                                        <tr key={v.id || idx} style={{ borderBottom: '1px solid #3a3a3a' }}>
                                            <td style={{ padding: '10px' }}>
                                                {new Date(v.created_at).toLocaleString('en-US', { timeZone: 'UTC' })}
                                            </td>
                                            <td style={{ padding: '10px' }}>{v.country || 'Unknown'}</td>
                                            <td style={{ padding: '10px' }}>{v.device_type || 'Unknown'}</td>
                                        </tr>
                                    ))}
                                    {weeklyFiltered.length === 0 && (
                                        <tr>
                                            <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                                                No visitor details found for this day.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {selectedDay && (
                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                        <button
                            onClick={() => setSelectedDay(null)}
                            style={{ padding: '8px 16px', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', transition: 'background 0.2s' }}
                            onMouseOver={(e) => e.target.style.background = '#444'}
                            onMouseOut={(e) => e.target.style.background = '#333'}
                        >
                            Clear Day Filter
                        </button>
                    </div>
                )}
            </div>

            <hr style={{ borderColor: '#333', margin: '40px 0' }} />

            {/* --- SECTION 2: MONTHLY --- */}
            <div style={{ marginBottom: '60px' }}>
                <h2>Monthly Visitor Stats ({currentUTCYear})</h2>
                <p style={{ color: '#aaa' }}>Click a bar to drill down into a specific month!</p>
                <div style={{ width: '100%', height: 250, marginBottom: '20px' }}>
                    <ResponsiveContainer>
                        <BarChart data={monthlyData}>
                            <XAxis dataKey="name" stroke="#ccc" />
                            <YAxis stroke="#ccc" />
                            <Tooltip cursor={{ fill: '#333' }} contentStyle={{ backgroundColor: '#222', border: 'none' }} />
                            <Bar dataKey="count" fill="#60a5fa" onClick={(data) => setSelectedMonth(data.name)} style={{ cursor: 'pointer' }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', height: 250 }}>
                    <div style={{ width: '45%' }}>
                        <h4 style={{ textAlign: 'center' }}>{selectedMonth ? `${selectedMonth}'s` : "All-Time"} by Country</h4>
                        <ResponsiveContainer><PieChart><Pie data={getPieData(monthlyFiltered, 'country')} cx="50%" cy="50%" outerRadius={60} dataKey="value" label>{getPieData(monthlyFiltered, 'country').map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
                    </div>
                    <div style={{ width: '45%' }}>
                        <h4 style={{ textAlign: 'center' }}>{selectedMonth ? `${selectedMonth}'s` : "All-Time"} by Device</h4>
                        <ResponsiveContainer><PieChart><Pie data={getPieData(monthlyFiltered, 'device_type')} cx="50%" cy="50%" outerRadius={60} dataKey="value" label>{getPieData(monthlyFiltered, 'device_type').map((e, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
                    </div>
                </div>
                {selectedMonth && <div style={{ textAlign: 'center', marginTop: '10px' }}><button onClick={() => setSelectedMonth(null)} style={{ padding: '8px 16px', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Clear Month Filter</button></div>}
            </div>

            <hr style={{ borderColor: '#333', margin: '40px 0' }} />

            {/* --- SECTION 3: TOTAL OVER TIME --- */}
            <div>
                <h2>Total Stats Over Time</h2>
                <p style={{ color: '#aaa' }}>Daily traffic breakdown.</p>

                <div style={{ width: '100%', height: 300, marginBottom: '40px' }}>
                    <h4 style={{ textAlign: 'center', color: '#ccc' }}>Traffic by Device (Daily)</h4>
                    <ResponsiveContainer>
                        <BarChart data={timeSeriesData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="date" stroke="#ccc" />
                            <YAxis stroke="#ccc" />
                            <Tooltip contentStyle={{ backgroundColor: '#222', border: 'none' }} />
                            <Legend />
                            {devicesArray.map((device, index) => (
                                <Bar key={device} dataKey={device} stackId="a" fill={COLORS[(index + 2) % COLORS.length]} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div style={{ width: '100%', height: 300 }}>
                    <h4 style={{ textAlign: 'center', color: '#ccc' }}>Traffic by Country (Daily)</h4>
                    <ResponsiveContainer>
                        <BarChart data={timeSeriesData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="date" stroke="#ccc" />
                            <YAxis stroke="#ccc" />
                            <Tooltip contentStyle={{ backgroundColor: '#222', border: 'none' }} />
                            <Legend />
                            {countriesArray.map((country, index) => (
                                <Bar key={country} dataKey={country} stackId="a" fill={COLORS[index % COLORS.length]} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}