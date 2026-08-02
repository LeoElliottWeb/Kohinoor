import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import Stats from './Stats.jsx' // Import your Stats component

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* The main route loads your chat app */}
        <Route path="/" element={<App />} />
        
        {/* The /stats route loads your Stats page */}
        <Route path="/stats" element={<Stats />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)