// src/App.jsx
import React, { useEffect, useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import LoginPage from './pages/LoginPage'
import UploadTab from './pages/UploadTab'
import ReviewTab from './pages/ReviewTab'
import PoolTab from './pages/PoolTab'
import AnalyticsTab from './pages/AnalyticsTab'
import { api } from './utils/api'
import logo from '../../logo.png'

const TABS = [
  { id: 'upload',    label: '📤 Upload / Retrieve Resumes' },
  { id: 'review',    label: '🎯 Candidate Review & Scoring' },
  { id: 'pool',      label: '👥 Candidate Pool' },
  { id: 'analytics', label: '📈 Analytics' },
]

function Header({ user, onSignOut }) {
  return (
    <header style={{
      background: '#fff', borderBottom: '1px solid #E8EAED',
      padding: '0 32px', display: 'flex', alignItems: 'center',
      height: 60, gap: 16,
    }}>
      <img src={logo} alt="NexTurn" style={{ height: 36, objectFit: 'contain' }} />
      <span style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a', flex: 1 }}>
        NexTurn Resume Screening
      </span>
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{user.name}</div>
            <div style={{ fontSize: 11, color: '#888780' }}>{user.email}</div>
          </div>
          <button onClick={onSignOut} style={{
            fontSize: 12, padding: '5px 12px', borderRadius: 6,
            background: '#F3F4F6', border: '1px solid #D1D5DB', cursor: 'pointer',
            color: '#5F5E5A',
          }}>Sign out</button>
        </div>
      )}
    </header>
  )
}

function TabNav({ active, onChange, poolCount }) {
  return (
    <nav style={{
      background: '#fff', borderBottom: '1px solid #E8EAED',
      padding: '0 32px', display: 'flex', gap: 0,
    }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: '14px 20px', fontSize: 14,
          fontWeight: active === t.id ? 600 : 400,
          color: active === t.id ? '#534AB7' : '#5F5E5A',
          background: 'transparent', border: 'none', cursor: 'pointer',
          borderBottom: `2px solid ${active === t.id ? '#534AB7' : 'transparent'}`,
          transition: 'all .15s', whiteSpace: 'nowrap',
        }}>
          {t.label}
          {t.id === 'pool' && poolCount > 0 && (
            <span style={{
              marginLeft: 6, background: '#7986CB', color: '#fff',
              borderRadius: 999, fontSize: 11, padding: '1px 7px',
            }}>{poolCount}</span>
          )}
        </button>
      ))}
    </nav>
  )
}

function AppShell({ user, onSignOut }) {
  const { setSpConnected, selectedPool } = useApp()
  const [activeTab, setActiveTab] = useState('upload')

  useEffect(() => {
    api.sharepointStatus().then(d => setSpConnected(d.connected)).catch(() => {})
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header user={user} onSignOut={onSignOut} />
      <TabNav active={activeTab} onChange={setActiveTab} poolCount={selectedPool.size} />
      <main style={{ flex: 1, padding: '32px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        {activeTab === 'upload'    && <UploadTab />}
        {activeTab === 'review'    && <ReviewTab />}
        {activeTab === 'pool'      && <PoolTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
      </main>
      <footer style={{
        textAlign: 'center', padding: '20px', color: '#B4B2A9', fontSize: 12,
        borderTop: '1px solid #E8EAED',
      }}>
        © 2026 NexTurn. AI Resume Screening System. All rights reserved.
      </footer>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(() => {
    // Persist login across page refreshes using sessionStorage
    const saved = sessionStorage.getItem('nexta_user')
    return saved ? JSON.parse(saved) : null
  })

  function handleLogin(userData) {
    sessionStorage.setItem('nexta_user', JSON.stringify(userData))
    setUser(userData)
  }

  function handleSignOut() {
    sessionStorage.removeItem('nexta_user')
    setUser(null)
  }

  return (
    <AppProvider>
      {user
        ? <AppShell user={user} onSignOut={handleSignOut} />
        : <LoginPage onLogin={handleLogin} />
      }
    </AppProvider>
  )
}
