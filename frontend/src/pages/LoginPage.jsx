// src/pages/LoginPage.jsx
import React, { useState } from 'react'
import logo from '../../../logo.png'

// Simple credential check — change these to whatever you want
const VALID_USERS = [
  { username: 'admin',   password: 'nexta123', name: 'Admin',          email: 'admin@nexturn.com' },
  { username: 'demo',    password: 'demo123',  name: 'Demo User',       email: 'demo@nexturn.com' },
  { username: 'nexta',   password: 'nexta@2026', name: 'NexTurn User', email: 'user@nexturn.com' },
]

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPwd,  setShowPwd]  = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    setTimeout(() => {
      const match = VALID_USERS.find(
        u => u.username === username.trim() && u.password === password
      )
      if (match) {
        onLogin({ name: match.name, email: match.email })
      } else {
        setError('Incorrect username or password.')
        setLoading(false)
      }
    }, 400)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #F8F9FA 0%, #E8EAF6 100%)',
      padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '48px 52px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 420, width: '100%',
        textAlign: 'center',
      }}>
        <img src={logo} alt="NexTurn" style={{ width: 200, margin: '0 auto 24px', display: 'block' }} />

        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', marginBottom: 6 }}>
          Resume Screening System
        </h1>
        <p style={{ fontSize: 14, color: '#888780', marginBottom: 32 }}>
          Powered by OpenAI · Automated Intelligent Recruitment
        </p>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          {/* Username */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              autoFocus
              style={{
                width: '100%', padding: '10px 14px', fontSize: 14,
                border: '1px solid #D3D1C7', borderRadius: 8,
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color .15s',
              }}
              onFocus={e => e.target.style.borderColor = '#7986CB'}
              onBlur={e => e.target.style.borderColor = '#D3D1C7'}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                style={{
                  width: '100%', padding: '10px 40px 10px 14px', fontSize: 14,
                  border: '1px solid #D3D1C7', borderRadius: 8,
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color .15s',
                }}
                onFocus={e => e.target.style.borderColor = '#7986CB'}
                onBlur={e => e.target.style.borderColor = '#D3D1C7'}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 16, color: '#888780', padding: 0,
                }}
              >
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#FCEBEB', border: '1px solid #F7C1C1', borderRadius: 8,
              padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#A32D2D',
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px 20px',
              background: loading ? '#9FA8DA' : 'linear-gradient(90deg,#7986CB,#9FA8DA)',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity .15s',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ fontSize: 12, color: '#B4B2A9', marginTop: 24 }}>
          Contact your administrator if you need access.
        </p>
      </div>

      <p style={{ fontSize: 13, color: '#B4B2A9', marginTop: 32 }}>
        © 2026 NexTurn. All rights reserved.
      </p>
    </div>
  )
}
