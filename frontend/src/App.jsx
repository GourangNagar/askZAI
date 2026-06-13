import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import Layout from './components/Layout';
import Chat from './components/Chat';
import MoneyDashboard from './components/MoneyDashboard';
import Profile from './components/Profile';

function App() {
  const [token, setToken] = useState(localStorage.getItem('kai_token'));

  const handleLogin = (newToken) => {
    localStorage.setItem('kai_token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('kai_token');
    setToken(null);
  };

  if (!token) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout onLogout={handleLogout} />}>
          <Route index element={<Navigate to="/money" replace />} />
          <Route path="money" element={<MoneyDashboard token={token} />} />
          <Route path="chat" element={<Chat token={token} />} />
          <Route path="profile" element={<Profile token={token} onLogout={handleLogout} />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
