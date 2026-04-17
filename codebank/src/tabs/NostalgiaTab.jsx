// NostalgiaTab.jsx
import React from 'react';
import Feed from '../nostalgia/components/Feed';
import Upload from '../nostalgia/components/Upload';
import AdminDashboard from '../nostalgia/components/AdminDashboard';

const NostalgiaTab = () => {
  return (
    <div>
      <h1>Nostalgia</h1>
      <Feed />
      <Upload />
      <AdminDashboard />
    </div>
  );
};

export default NostalgiaTab;