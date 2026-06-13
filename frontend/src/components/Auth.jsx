import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coins, User, Lock, ArrowRight, Wallet, Shield } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8001`;

const Auth = ({ onLogin }) => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [recovery, setRecovery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const payload = { email, password };
    if (mode === 'register') payload.name = name;
    if (mode === 'forgot') payload.recovery_phrase = recovery;

    const endpoint = mode === 'login' ? '/auth/login' : mode === 'register' ? '/auth/register' : '/auth/reset-password';

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || 'Authentication failed');
        return;
      }

      if (mode === 'forgot') {
        setSuccess('Password updated. Please login.');
        setMode('login');
      } else {
        if (data.recovery_phrase) {
          alert(`IMPORTANT! Save this 12-word recovery phrase to reset your password later:\n\n${data.recovery_phrase}`);
        }
        onLogin(data.token);
      }
    } catch (err) {
      setError('Network error. Is the backend running?');
    }
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
      <div className="login-container" style={{ display: 'block' }}>
        <div className="brand-icon" style={{ margin: '0 auto 2rem auto', width: '140px', height: '64px', fontSize: '2rem' }}>askZAI</div>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>"財" means "Wealth" & it is pronounced "Zai"</h1>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <input type="text" placeholder="YOUR NAME" value={name} onChange={(e) => setName(e.target.value)} style={{ marginBottom: '1rem' }} required />
          )}
          <input type="email" placeholder="USER EMAIL" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ marginBottom: '1rem' }} />
          {mode === 'forgot' && (
            <input type="text" placeholder="12-WORD RECOVERY PHRASE" value={recovery} onChange={(e) => setRecovery(e.target.value)} style={{ marginBottom: '1rem' }} required />
          )}
          <input type="password" placeholder={mode === 'forgot' ? 'NEW PASSWORD' : 'PASSWORD'} value={password} onChange={(e) => setPassword(e.target.value)} required style={{ marginBottom: '1rem' }} />

          <button type="submit" className="primary-btn">
            {mode === 'login' ? 'AUTHENTICATE' : mode === 'register' ? 'REGISTER' : 'RESET PASSWORD'}
          </button>
        </form>

        {error && <p style={{ color: 'var(--danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}
        {success && <p style={{ color: 'var(--success)', textAlign: 'center', marginTop: '1rem' }}>{success}</p>}

        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          {mode !== 'register' && <p style={{ color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setMode('register')}>No account? Register here.</p>}
          {mode !== 'login' && <p style={{ color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline', marginTop: '0.5rem' }} onClick={() => setMode('login')}>Back to login</p>}
          {mode === 'login' && <p style={{ color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline', marginTop: '0.5rem' }} onClick={() => setMode('forgot')}>Forgot Password?</p>}
        </div>
      </div>
    </div>
  );
};

export default Auth;
