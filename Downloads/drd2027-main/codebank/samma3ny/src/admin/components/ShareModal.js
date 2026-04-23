import React, { useState } from 'react';
import './ShareModal.css';

const ShareModal = ({ isOpen, onClose, song }) => {
  const [selectedContact, setSelectedContact] = useState('');
  const [contacts, setContacts] = useState(['Alice', 'Bob', 'Charlie']); // Mock contacts
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !song) return null;

  const handleShare = async () => {
    if (!selectedContact) {
      setError('Please select a contact');
      return;
    }

    setSharing(true);
    setError('');

    try {
      // Generate share message
      const shareMessage = `🎵 Check out this song: "${song.title}" by ${song.artist || 'Unknown Artist'}\n\nListen to it and more on the Dr. D App! 🎧\n\nSong URL: ${song.url}`;

      // Mock E7ki! API integration
      // In a real implementation, this would call the E7ki! API
      const response = await mockE7kiSendMessage(selectedContact, shareMessage);

      if (response.success) {
        alert('Song shared successfully!');
        onClose();
      } else {
        throw new Error('Failed to send message');
      }
    } catch (err) {
      setError('Failed to share song. Please try again.');
      console.error('Share error:', err);
    } finally {
      setSharing(false);
    }
  };

  // Mock E7ki! API function
  const mockE7kiSendMessage = async (contact, message) => {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 1000);
    });
  };

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h3>Share Song</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="share-modal-body">
          <div className="song-preview">
            <h4>{song.title}</h4>
            <p className="song-artist">{song.artist || 'Unknown Artist'}</p>
            <audio controls src={song.url} className="song-audio">
              Your browser does not support the audio element.
            </audio>
          </div>

          <div className="share-section">
            <label htmlFor="contact-select">Select Contact:</label>
            <select
              id="contact-select"
              value={selectedContact}
              onChange={(e) => setSelectedContact(e.target.value)}
            >
              <option value="">Choose a contact...</option>
              {contacts.map((contact, index) => (
                <option key={index} value={contact}>{contact}</option>
              ))}
            </select>

            {error && <p className="error-message">{error}</p>}

            <button
              className="share-btn"
              onClick={handleShare}
              disabled={sharing || !selectedContact}
            >
              {sharing ? 'Sharing...' : 'Share Song'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;