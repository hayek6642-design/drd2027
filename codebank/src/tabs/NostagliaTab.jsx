// NostagliaTab.jsx
import React from 'react';
import Feed from '../nostaglia/components/Feed';
import Upload from '../nostaglia/components/Upload';
import AdminDashboard from '../nostaglia/components/AdminDashboard';

const NostagliaTab = () => {
  return (
    <div>
      <h1>Nostaglia</h1>
      <Feed />
      <Upload />
      <AdminDashboard />
    </div>
  );
};

export default NostagliaTab;