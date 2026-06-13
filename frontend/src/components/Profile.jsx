import React, { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8001`;

const Profile = ({ token, onLogout }) => {
  const [profile, setProfile] = useState({
    name: '',
    profession: 'General',
    custom_categories: [],
    instructions: ''
  });
  const [categoryInput, setCategoryInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/profile`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      });
      if (res.ok) {
        setMsg('Profile updated perfectly.');
      } else {
        setMsg('Failed to update.');
      }
    } catch (err) {
      setMsg('Network error.');
    } finally {
      setLoading(false);
    }
  };

  const addCategory = () => {
    if (categoryInput.trim() && !profile.custom_categories.includes(categoryInput.trim())) {
      setProfile(prev => ({
        ...prev,
        custom_categories: [...prev.custom_categories, categoryInput.trim()]
      }));
      setCategoryInput('');
    }
  };

  const removeCategory = (cat) => {
    setProfile(prev => ({
      ...prev,
      custom_categories: prev.custom_categories.filter(c => c !== cat)
    }));
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
      <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>YOUR PROFILE</h2>
      <form onSubmit={saveProfile}>
        <div className="form-group">
          <label>Name</label>
          <input 
            type="text" 
            value={profile.name} 
            onChange={e => setProfile({...profile, name: e.target.value})} 
            required 
          />
        </div>
        
        <div className="form-group">
          <label>Profession (Doctor, Engineer, Student, etc.)</label>
          <input 
            type="text" 
            value={profile.profession} 
            onChange={e => setProfile({...profile, profession: e.target.value})} 
            placeholder="e.g. Doctor" 
          />
        </div>

        <div className="form-group">
          <label>Custom Financial Categories</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {profile.custom_categories.map((cat, i) => (
              <span key={i} style={{ background: 'var(--bg-glass)', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-glass)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {cat}
                <button type="button" onClick={() => removeCategory(cat)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 'bold' }}>&times;</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              value={categoryInput} 
              onChange={e => setCategoryInput(e.target.value)} 
              placeholder="e.g. Malpractice Insurance" 
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCategory())}
            />
            <button type="button" onClick={addCategory} className="primary-btn" style={{ width: 'auto' }}>Add</button>
          </div>
          <small style={{ color: 'var(--text-muted)' }}>The AI will map your expenses only to these categories.</small>
        </div>

        <div className="form-group">
          <label>AI Instructions</label>
          <textarea 
            value={profile.instructions} 
            onChange={e => setProfile({...profile, instructions: e.target.value})} 
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? 'SAVING...' : 'SAVE PROFILE'}
          </button>
          <button type="button" onClick={onLogout} className="primary-btn" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
            LOGOUT
          </button>
        </div>
        {msg && <p style={{ marginTop: '1rem', color: msg.includes('Failed') ? 'var(--danger)' : 'var(--success)' }}>{msg}</p>}
      </form>
    </div>
  );
};

export default Profile;
