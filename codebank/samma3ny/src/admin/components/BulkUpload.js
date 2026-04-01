import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import './BulkUpload.css';

const BulkUpload = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const [errors, setErrors] = useState([]);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    const validFiles = acceptedFiles.filter(file => {
      const isValidType = /mp3|wav|ogg|m4a|aac/i.test(file.type) || /mp3|wav|ogg|m4a|aac/i.test(file.name.split('.').pop());
      if (!isValidType) {
        setErrors(prev => [...prev, `${file.name} is not a supported audio format.`]);
        return false;
      }
      return true;
    });

    setFiles(prev => [...prev, ...validFiles]);
    setErrors([]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'audio/ogg': ['.ogg'],
      'audio/mp4': ['.m4a'],
      'audio/aac': ['.aac']
    },
    multiple: true,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setProgress({});
    setErrors([]);

    const uploadPromises = files.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'media-player1');
      formData.append('folder', 'songs/');

      const response = await axios.post(`https://api.cloudinary.com/v1_1/dhpyneqgk/video/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(prev => ({ ...prev, [file.name]: percentCompleted }));
        }
      });

      if (response.data.secure_url) {
        // Save metadata to server via API
        const song = {
          id: response.data.public_id,
          title: response.data.original_filename,
          url: response.data.secure_url,
          duration: response.data.duration || 0,
          artist: '',
          cover: '',
        };

        try {
          const serverResponse = await axios.post('http://localhost:8002/api/songs', song);
          console.log(`✅ Song saved to server: ${song.title}`);
        } catch (error) {
          console.error('Failed to save song to server:', error);
          // Fallback to localStorage if server save fails
          const songs = JSON.parse(localStorage.getItem('songs') || '[]');
          songs.push(song);
          localStorage.setItem('songs', JSON.stringify(songs));
          console.log(`💾 Song saved to localStorage: ${song.title}`);
        }
      }

      return response.data;
    });

    try {
      await Promise.all(uploadPromises);
      setFiles([]);
      console.log(`✅ Upload complete! ${files.length} files uploaded successfully.`);

      // Trigger playlist refresh in the main player instead of full page reload
      if (window.parent && window.parent.refreshPlaylist) {
        // Trigger playlist refresh in the main player
        window.parent.refreshPlaylist();
      } else if (window.parent) {
        // Fallback: trigger a custom event that the main player can listen for
        window.parent.postMessage({
          type: 'playlist-update',
          action: 'refresh'
        }, window.location.origin);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setErrors([error.message]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bulk-upload">
      <h2>Bulk Song Upload</h2>
      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the audio files here...</p>
        ) : (
          <p>Drag & drop audio files here, or click to select files</p>
        )}
      </div>

      {errors.length > 0 && (
        <div className="errors">
          <h3>Errors:</h3>
          <ul>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {files.length > 0 && (
        <div className="file-preview">
          <h3>Selected Files ({files.length})</h3>
          <ul>
            {files.map((file, index) => (
              <li key={index}>
                <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                <button onClick={() => removeFile(index)}>Remove</button>
              </li>
            ))}
          </ul>
          <button onClick={uploadFiles} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload All'}
          </button>
          {files.length > 0 && (
            <button onClick={uploadFiles} disabled={uploading} className="upload-selected-btn">
              {uploading ? 'Uploading...' : 'Upload Selected'}
            </button>
          )}
        </div>
      )}

      {uploading && (
        <div className="progress-container">
          <h3>Upload Progress</h3>
          <div className="progress-bar">
            <div className="progress" style={{ width: `${progress.overall || 0}%` }}>
              {progress.overall || 0}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkUpload;
