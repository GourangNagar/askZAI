import React, { useEffect, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';

const Layout = ({ onLogout }) => {
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
        const res = await fetch(`http://${window.location.hostname}:8001/api/profile`, {
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
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
