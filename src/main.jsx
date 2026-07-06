import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom'; // Added Router imports
import App from './App.jsx';
import Stats from './Stats.jsx'; // Added Stats import
import './index.css';

// ✅ CORRECTED IMPORT HERE
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <Routes>
                {/* The main path ("/") loads your chess game */}
                <Route path="/" element={<App />} />

                {/* The stats path ("/stats") loads your new dashboard */}
                <Route path="/stats" element={<Stats />} />
            </Routes>
        </BrowserRouter>
    </React.StrictMode>
);
