// Feed.jsx
import React, { useState, useEffect } from 'react';
import './Feed.css';
import { setupSSE, closeSSE } from '../sse';

const Feed = () => {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const response = await fetch('/api/nostalgia/feed', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        setUploads(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching feed:', error);
        setLoading(false);
      }
    };
    
    fetchFeed();
    
    // Set up SSE for real-time updates
    const userId = localStorage.getItem('userId');
    setupSSE(userId, (event) => {
      console.log('Received SSE event:', event);
      // Handle the event and update the UI accordingly
      setUploads(prevUploads => {
        switch (event.type) {
          case 'reaction':
            // Update the reaction count for the upload
            return prevUploads.map(upload => {
              if (upload.id === event.uploadId) {
                return { ...upload, reactions: [...(upload.reactions || []), event] };
              }
              return upload;
            });
          case 'comment':
            // Update the comment count for the upload
            return prevUploads.map(upload => {
              if (upload.id === event.uploadId) {
                return { ...upload, comments: [...(upload.comments || []), event] };
              }
              return upload;
            });
          case 'share':
            // Update the share count for the upload
            return prevUploads.map(upload => {
              if (upload.id === event.uploadId) {
                return { ...upload, shares: [...(upload.shares || []), event] };
              }
              return upload;
            });
          default:
            return prevUploads;
        }
      });
    });
    
    return () => {
      closeSSE();
    };
  }, []);
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="feed">
      <h2>Nostalgia Feed</h2>
      {uploads.length === 0 ? (
        <p>No uploads yet.</p>
      ) : (
        <div className="feed-grid">
          {uploads.map(upload => (
            <div key={upload.id} className="upload-card">
              <h3>{upload.title}</h3>
              <p>By: {upload.username}</p>
              <p>Date: {upload.admin_assigned_date}</p>
              <video controls src={upload.url} />
              <div className="actions">
                <button onClick={() => handleLike(upload.id)}>❤️ Like</button>
                <button onClick={() => handleSuperLike(upload.id)}>💙 Super Like</button>
                <button onClick={() => handleMegaLike(upload.id)}>💜 Mega Like</button>
                <button onClick={() => handleComment(upload.id)}>💬 Comment</button>
                <button onClick={() => handleShare(upload.id)}>🔁 Share</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  
  const handleLike = async (uploadId) => {
    try {
      await fetch('/api/nostalgia/react', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ uploadId, reactionType: 'like' })
      });
    } catch (error) {
      console.error('Error liking upload:', error);
    }
  };
  
  const handleSuperLike = async (uploadId) => {
    try {
      await fetch('/api/nostalgia/react', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ uploadId, reactionType: 'super_like' })
      });
    } catch (error) {
      console.error('Error super liking upload:', error);
    }
  };
  
  const handleMegaLike = async (uploadId) => {
    try {
      await fetch('/api/nostalgia/react', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ uploadId, reactionType: 'mega_like' })
      });
    } catch (error) {
      console.error('Error mega liking upload:', error);
    }
  };
  
  const handleComment = async (uploadId) => {
    const comment = prompt('Enter your comment:');
    if (comment) {
      try {
        await fetch('/api/nostalgia/comment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ uploadId, content: comment })
        });
      } catch (error) {
        console.error('Error commenting on upload:', error);
      }
    }
  };
  
  const handleShare = async (uploadId) => {
    try {
      await fetch('/api/nostalgia/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ uploadId })
      });
      alert('Upload shared successfully!');
    } catch (error) {
      console.error('Error sharing upload:', error);
    }
  };
};

export default Feed;