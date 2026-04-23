import React, { useState, useEffect } from 'react';
import BulkUpload from './components/BulkUpload';
import SongList from './components/SongList';
import './App.css';

function App() {
  const [songs, setSongs] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchSongs();
    }
  }, [isAuthenticated]);

  const handleLogin = () => {
    const storedPassword = localStorage.getItem('adminPassword') || btoa('doitasap2025');
    if (btoa(password) === storedPassword) {
      setIsAuthenticated(true);
    } else {
      alert('Incorrect password');
    }
  };

  const fetchSongs = async () => {
    try {
      const response = await fetch('http://localhost:8002/api/songs');
      const data = await response.json();
      setSongs(data);
    } catch (error) {
      console.error('Failed to fetch songs:', error);
      // Fallback to localStorage if server is unavailable
      const localSongs = JSON.parse(localStorage.getItem('songs') || '[]');
      setSongs(localSongs);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <h2>Admin Access</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={(e) => { if (e.key === 'Enter') handleLogin(); }}
          placeholder="Enter admin password"
        />
        <button onClick={handleLogin}>Login</button>
        <p><a href="#" onClick={() => {
          const newPassword = prompt('Enter new admin password:');
          if (newPassword) {
            localStorage.setItem('adminPassword', btoa(newPassword));
            alert('Password reset successfully');
          }
        }}>Reset Password</a></p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header>
        <h1>Samma3ny Admin Panel</h1>
        <button onClick={() => setIsAuthenticated(false)}>Logout</button>
      </header>
      <main>
        <BulkUpload />
        <SongList songs={songs} />
      </main>
    </div>
  );
}

export default App;