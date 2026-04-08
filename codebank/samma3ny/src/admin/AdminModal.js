import React, { useState, useEffect } from 'react';
import BulkUpload from './components/BulkUpload';
import SongList from './components/SongList';
import './App.css';

const AdminModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('upload');
  const [songs, setSongs] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadSongs();
    }
  }, [isOpen]);

  const loadSongs = async () => {
    try {
      const response = await fetch('/api/songs');
      const data = await response.json();
      setSongs(data);
    } catch (error) {
      console.error('Failed to load songs:', error);
      // Fallback to localStorage
      const localSongs = JSON.parse(localStorage.getItem('songs') || '[]');
      setSongs(localSongs);
    }
  };

  const handleSongUpdate = () => {
    loadSongs();
  };

  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2>Samma3ny Admin Dashboard</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="admin-modal-tabs">
          <button
            className={activeTab === 'upload' ? 'active' : ''}
            onClick={() => setActiveTab('upload')}
          >
            Bulk Upload
          </button>
          <button
            className={activeTab === 'manage' ? 'active' : ''}
            onClick={() => setActiveTab('manage')}
          >
            Manage Songs
          </button>
        </div>

        <div className="admin-modal-content">
          {activeTab === 'upload' && <BulkUpload onUploadComplete={handleSongUpdate} />}
          {activeTab === 'manage' && <SongList songs={songs} onSongUpdate={handleSongUpdate} />}
        </div>
      </div>
    </div>
  );
};

export default AdminModal;