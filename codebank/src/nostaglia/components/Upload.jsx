// Upload.jsx
import React, { useState } from 'react';
import './Upload.css';

const Upload = () => {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [memoryNote, setMemoryNote] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('artist', artist);
      formData.append('memoryNote', memoryNote);
      formData.append('file', file);
      
      const response = await fetch('/api/nostaglia/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      const data = await response.json();
      alert('Upload successful!');
      setTitle('');
      setArtist('');
      setMemoryNote('');
      setFile(null);
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Error uploading');
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="upload">
      <h2>Upload</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title:</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Artist:</label>
          <input type="text" value={artist} onChange={(e) => setArtist(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Memory Note:</label>
          <textarea value={memoryNote} onChange={(e) => setMemoryNote(e.target.value)} />
        </div>
        <div className="form-group">
          <label>File:</label>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} required />
        </div>
        <button type="submit" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
    </div>
  );
};

export default Upload;