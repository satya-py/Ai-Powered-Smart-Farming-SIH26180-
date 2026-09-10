import React, { useState } from 'react';
import { AlertCircle, Leaf, Lock, LogIn, User } from 'lucide-react';

/**
 * Demo sign-in screen. The prototype backend has no auth yet, so this only
 * gates the UI locally — do not treat it as a security boundary.
 */
export default function Login({ onSignIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const submit = (event) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError('Enter both a username and a password to continue.');
      return;
    }
    setError(null);
    onSignIn(username.trim());
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-hero">
          <Leaf size={30} />
          <div style={{ fontSize: 17, fontWeight: 700 }}>Smart Farm AI</div>
          <div style={{ fontSize: 11, opacity: 0.9 }}>
            AI-Powered Smart Farming Assistant
          </div>
        </div>

        <form className="login-body" onSubmit={submit}>
          <div className="center">
            <h2 style={{ fontSize: 17 }}>Welcome Back</h2>
            <p className="small muted" style={{ margin: '4px 0 0' }}>
              Sign in to continue to your account
            </p>
          </div>

          <div className="login-input-wrap">
            <User size={15} />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Email or Username"
              autoComplete="username"
              aria-label="Email or username"
            />
          </div>

          <div className="login-input-wrap">
            <Lock size={15} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              aria-label="Password"
            />
          </div>

          {error && (
            <div className="callout danger">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <button className="btn btn-primary block" type="submit">
            <LogIn size={15} /> Sign In
          </button>

          <div className="center small muted">
            Demo build — any username and password will sign you in.
          </div>
        </form>
      </div>
    </div>
  );
}
