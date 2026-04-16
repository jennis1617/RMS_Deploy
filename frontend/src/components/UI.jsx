// src/components/UI.jsx  — shared primitive components
import React from 'react'

// Badge 
export function Badge({ children, color = 'blue' }) {
  const colors = {
    blue:   { bg: '#E6F1FB', text: '#0C447C' },
    green:  { bg: '#EAF3DE', text: '#27500A' },
    amber:  { bg: '#FAEEDA', text: '#633806' },
    red:    { bg: '#FCEBEB', text: '#791F1F' },
    purple: { bg: '#EEEDFE', text: '#3C3489' },
    gray:   { bg: '#F1EFE8', text: '#2C2C2A' },
  }
  const c = colors[color] || colors.blue
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 999,
      fontSize: 12, fontWeight: 500,
      background: c.bg, color: c.text,
    }}>{children}</span>
  )
}

// Button
export function Btn({ children, onClick, variant = 'primary', disabled, fullWidth, small, style }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: small ? '6px 14px' : '9px 20px',
    borderRadius: 8, fontWeight: 500, fontSize: small ? 13 : 14,
    transition: 'all .15s', cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    width: fullWidth ? '100%' : undefined,
    border: 'none',
    ...style,
  }
  const variants = {
    primary:   { background: 'linear-gradient(90deg,#7986CB,#9FA8DA)', color: '#fff' },
    secondary: { background: '#F3F4F6', color: '#1F2937', border: '1px solid #D1D5DB' },
    danger:    { background: '#FCEBEB', color: '#A32D2D', border: '1px solid #F7C1C1' },
    ghost:     { background: 'transparent', color: '#185FA5', border: '1px solid #B5D4F4' },
  }
  return (
    <button style={{ ...base, ...variants[variant] }} onClick={disabled ? undefined : onClick} disabled={disabled}>
      {children}
    </button>
  )
}

// Card 
export function Card({ children, style }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #E8EAED',
      padding: '20px 24px', ...style,
    }}>{children}</div>
  )
}

// InfoBox
export function InfoBox({ children, color = 'blue' }) {
  const c = {
    blue:   { bg: '#E6F1FB', border: '#B5D4F4', text: '#0C447C' },
    green:  { bg: '#EAF3DE', border: '#C0DD97', text: '#27500A' },
    amber:  { bg: '#FAEEDA', border: '#FAC775', text: '#633806' },
    red:    { bg: '#FCEBEB', border: '#F7C1C1', text: '#791F1F' },
  }[color]
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      borderRadius: 8, padding: '10px 14px', fontSize: 14, lineHeight: 1.6,
    }}>{children}</div>
  )
}

// ProgressBar 
export function ProgressBar({ value, max = 100, color }) {
  const pct = Math.round((value / max) * 100)
  const barColor = color || (pct >= 70 ? '#4CAF50' : pct >= 45 ? '#FF9800' : '#F44336')
  return (
    <div style={{ background: '#E5E7EB', borderRadius: 999, height: 10, width: '100%', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 999, transition: 'width .4s' }} />
    </div>
  )
}

// Spinner 
export function Spinner({ size = 20 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid #E8EAED`,
      borderTopColor: '#7986CB',
      animation: 'spin .7s linear infinite',
      display: 'inline-block',
    }} />
  )
}

// Tab Bar
export function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #E8EAED', marginBottom: 24 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: '10px 20px', fontSize: 14, fontWeight: active === t.id ? 600 : 400,
          color: active === t.id ? '#534AB7' : '#5F5E5A',
          background: 'transparent', border: 'none', cursor: 'pointer',
          borderBottom: active === t.id ? '2px solid #534AB7' : '2px solid transparent',
          marginBottom: -1, transition: 'all .15s',
        }}>{t.label}</button>
      ))}
    </div>
  )
}

// Metric Card
export function MetricCard({ label, value }) {
  return (
    <div style={{
      background: '#F8F9FA', borderRadius: 8, padding: '14px 18px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 12, color: '#888780', marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color: '#1a1a1a' }}>{value}</div>
    </div>
  )
}

// Global spinner keyframe
const style = document.createElement('style')
style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`
document.head.appendChild(style)
