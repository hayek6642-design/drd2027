import React, { useState } from 'react';
import axios from 'axios';
import ShareModal from './ShareModal';
import './SongList.css';

const SongList = ({ songs }) => {
  const [editing, setEditing] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [rearranging, setRearranging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);

  const deleteSong = async (id) => {
    if (window.confirm('Are you sure you want to delete this song?')) {
      try {
        await axios.delete(`http://localhost:8002/api/songs/${id}`);
      } catch (error) {
        alert('Failed to delete song');
      }
    }
  };

  const startEdit = (song) => {
    setEditing(song.id);
    setEditTitle(song.title);
  };

  const saveEdit = async () => {
    try {
      await axios.put(`http://localhost:8002/api/songs/${editing}`, { title: editTitle });
      setEditing(null);
    } catch (error) {
      alert('Failed to update song');
    }
  };

  const moveSong = async (fromIndex, toIndex) => {
    const newSongs = [...songs];
    const [movedSong] = newSongs.splice(fromIndex, 1);
    newSongs.splice(toIndex, 0, movedSong);

    // Update order on server
    try {
      await axios.put('http://localhost:8002/api/songs/reorder', {
        songs: newSongs.map((song, index) => ({ id: song.id, order: index }))
      });
    } catch (error) {
      alert('Failed to reorder songs');
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      moveSong(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const openShareModal = (song) => {
    setSelectedSong(song);
    setShareModalOpen(true);
  };

  const closeShareModal = () => {
    setShareModalOpen(false);
    setSelectedSong(null);
  };

  return (
    <div className="song-list">
      <h2>Song Management</h2>
      <div className="song-controls">
        <button onClick={() => setRearranging(!rearranging)}>
          {rearranging ? 'Done Rearranging' : 'Rearrange'}
        </button>
      </div>
      <ul className={rearranging ? 'rearranging' : ''}>
        {songs.map((song, index) => (
          <li
            key={song.id}
            draggable={rearranging}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={draggedIndex === index ? 'dragging' : ''}
          >
            {editing === song.id ? (
              <>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                <button onClick={saveEdit}>Save</button>
                <button onClick={() => setEditing(null)}>Cancel</button>
              </>
            ) : (
              <>
                {rearranging && <span className="drag-handle">⋮⋮</span>}
                <span>{song.title}</span>
                <button onClick={() => startEdit(song)}>Rename</button>
                <button onClick={() => openShareModal(song)}>Share</button>
                <button onClick={() => deleteSong(song.id)}>Delete</button>
              </>
            )}
          </li>
        ))}
      </ul>
      <ShareModal
        isOpen={shareModalOpen}
        onClose={closeShareModal}
        song={selectedSong}
      />
    </div>
  );
};

export default SongList;