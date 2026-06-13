import React, { useEffect, useState } from 'react';
import { useLocation, NavLink, Navigate } from 'react-router-dom';
import MoneyDashboard from './MoneyDashboard';
import Chat from './Chat';
import Profile from './Profile';
import { Sun, Moon } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8001`;

const Layout = ({ onLogout, token }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const [userName, setUserName] = useState("Zai");
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('theme') === 'light';
  });

  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLightMode]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('kai_token');
        const res = await fetch(`${API_BASE_URL}/api/profile`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUserName(data.name || "User");
        } else if (res.status === 401) {
          onLogout();
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      }
    };
    fetchProfile();
  }, [onLogout]);

  return (
    <div className="app-container">
      <header>
        <div className="brand">
          <div className="brand-icon">財</div>
          <h1>{userName}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setIsLightMode(!isLightMode)}
            style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Toggle Theme"
          >
            {isLightMode ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <div className="nav-tabs">
            <NavLink to="/money" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
              Money
            </NavLink>
            <NavLink to="/chat" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
              Chat
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
              Profile
            </NavLink>
          </div>
        </div>
      </header>
      <main>
        {currentPath === '/' && <Navigate to="/money" replace />}
        <div style={{ display: currentPath.includes('/money') ? 'block' : 'none', height: '100%' }}>
          <MoneyDashboard token={token} />
        </div>
        <div style={{ display: currentPath.includes('/chat') ? 'block' : 'none', height: '100%' }}>
          <Chat token={token} />
        </div>
        <div style={{ display: currentPath.includes('/profile') ? 'block' : 'none', height: '100%' }}>
          <Profile token={token} onLogout={onLogout} />
        </div>
      </main>
    </div>
  );
};

export default Layout;
