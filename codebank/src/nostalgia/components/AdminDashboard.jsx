// AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [pendingUploads, setPendingUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchPendingUploads = async () => {
      try {
        const response = await fetch('/api/nostalgia/admin/pending', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        setPendingUploads(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching pending uploads:', error);
        setLoading(false);
      }
    };
    
    fetchPendingUploads();
  }, []);
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  const handleApprove = async (uploadId) => {
    const adminAssignedDate = prompt('Enter the admin-assigned date (YYYY-MM-DD):');
    if (adminAssignedDate) {
      try {
        await fetch('/api/nostalgia/admin/approve', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ uploadId, adminAssignedDate })
        });
        alert('Upload approved successfully!');
        setPendingUploads(pendingUploads.filter(upload => upload.id !== uploadId));
      } catch (error) {
        console.error('Error approving upload:', error);
      }
    }
  };
  
  const handleReject = async (uploadId) => {
    try {
      await fetch('/api/nostalgia/admin/reject', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ uploadId })
      });
      alert('Upload rejected successfully!');
      setPendingUploads(pendingUploads.filter(upload => upload.id !== uploadId));
    } catch (error) {
      console.error('Error rejecting upload:', error);
    }
  };
  
  const handleDelete = async (uploadId) => {
    try {
      await fetch('/api/nostalgia/admin/upload', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ uploadId })
      });
      alert('Upload deleted successfully!');
      setPendingUploads(pendingUploads.filter(upload => upload.id !== uploadId));
    } catch (error) {
      console.error('Error deleting upload:', error);
    }
  };
  
  const handleFeature = async (uploadId) => {
    try {
      await fetch('/api/nostalgia/admin/feature', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ uploadId })
      });
      alert('Upload featured successfully!');
    } catch (error) {
      console.error('Error featuring upload:', error);
    }
  };
  
  const handleStartCycle = async () => {
    try {
      await fetch('/api/nostalgia/admin/cycle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      alert('Cycle started successfully!');
    } catch (error) {
      console.error('Error starting cycle:', error);
    }
  };
  
  const handleEndCycle = async () => {
    const cycleId = prompt('Enter the cycle ID to end:');
    if (cycleId) {
      try {
        await fetch('/api/nostalgia/admin/cycle/end', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ cycleId })
        });
        alert('Cycle ended successfully!');
      } catch (error) {
        console.error('Error ending cycle:', error);
      }
    }
  };
  
  return (
    <div className="admin-dashboard">
      <h2>Admin Dashboard</h2>
      <div className="admin-actions">
        <button onClick={handleStartCycle}>Start Cycle</button>
        <button onClick={handleEndCycle}>End Cycle</button>
      </div>
      <h3>Pending Uploads</h3>
      {pendingUploads.length === 0 ? (
        <p>No pending uploads.</p>
      ) : (
        <div className="pending-uploads">
          {pendingUploads.map(upload => (
            <div key={upload.id} className="pending-upload">
              <h4>{upload.title}</h4>
              <p>By: {upload.username}</p>
              <video controls src={upload.url} />
              <div className="admin-actions">
                <button onClick={() => handleApprove(upload.id)}>Approve</button>
                <button onClick={() => handleReject(upload.id)}>Reject</button>
                <button onClick={() => handleDelete(upload.id)}>Delete</button>
                <button onClick={() => handleFeature(upload.id)}>Feature</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;