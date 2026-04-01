import React, { useState } from 'react';

const PasswordModal = ({ isOpen, onSuccess, onClose }) => {
  const [password, setPassword] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isResetMode) {
      if (newPassword !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (newPassword.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      localStorage.setItem('admin_pass', newPassword);
      setError('');
      setIsResetMode(false);
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      alert('Password reset successfully!');
    } else {
      const storedPassword = localStorage.getItem('admin_pass') || 'doitasap2025';
      if (password === storedPassword) {
        onSuccess();
        setPassword('');
        setError('');
      } else {
        setError('Incorrect password. Try again.');
      }
    }
  };

  const handleReset = () => {
    setIsResetMode(true);
    setError('');
  };

  const handleCancelReset = () => {
    setIsResetMode(false);
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="password-modal-overlay" onClick={onClose}>
      <div className="password-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isResetMode ? 'Reset Admin Password' : 'Enter Admin Password'}</h3>

        <form onSubmit={handleSubmit}>
          {!isResetMode ? (
            <div>
              <input
                type="password"
                placeholder="Admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="password-modal-buttons">
                <button type="submit">Submit</button>
                <button type="button" onClick={handleReset}>Reset Password</button>
              </div>
            </div>
          ) : (
            <div>
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <div className="password-modal-buttons">
                <button type="submit">Set Password</button>
                <button type="button" onClick={handleCancelReset}>Cancel</button>
              </div>
            </div>
          )}
        </form>

        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
};

export default PasswordModal;