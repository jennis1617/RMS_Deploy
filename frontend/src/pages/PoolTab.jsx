// src/pages/PoolTab.jsx
import React from 'react'
import { useApp } from '../context/AppContext'
import { api } from '../utils/api'
import { Btn, Card, InfoBox, MetricCard } from '../components/UI'

const fmtExp = v => {
  const f = parseFloat(v)
  if (isNaN(f)) return ''
  return f === Math.floor(f) ? String(Math.floor(f)) : f.toFixed(1)
}
const validEmail = v => v && /[^@\s]+@[^@\s]+\.[^@\s]+/.test(v) && !['N/A','None','nan','[EMAIL]'].includes(v)
const validPhone = v => v && (v.replace(/\D/g,'').length >= 7) && !['N/A','None','nan','[PHONE]'].includes(v)

function csvRow(row) {
  return Object.values(row).map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')
}

export default function PoolTab() {
  const { parsedResumes, reviewResults, selectedPool, spConnected } = useApp()

  if (!selectedPool.size) {
    return (
      <div style={{ maxWidth:800, margin:'0 auto' }}>
        <h2 style={{ fontSize:22, fontWeight:700, marginBottom:16 }}>👥 Candidate Pool</h2>
        <InfoBox color="blue">
          <strong>No candidates in the pool yet.</strong><br/>
          Go to <strong>Candidate Review & Scoring</strong>, run AI screening, tick candidates, then click "Move to Candidate Pool".
        </InfoBox>
      </div>
    )
  }

  const scoreMap = Object.fromEntries(
    reviewResults.map(r => [r.metadata?.name, r.final_score])
  )

  const rows = parsedResumes
    .filter(r => selectedPool.has(r.name))
    .map(r => ({
      'Candidate Name':   r.name || '',
      'AI Match Score':   scoreMap[r.name] != null ? `${scoreMap[r.name]}%` : '—',
      'Current Role':     r.current_role || '',
      'Experience (yrs)': fmtExp(r.experience_years),
      'Email':            validEmail(r.email) ? r.email : 'Not Available',
      'Phone':            validPhone(r.phone) ? r.phone : 'Not Available',
      'Key Skills':       String(r.tech_stack || '').slice(0, 80),
      'Education':        r.education || '',
    }))
    .sort((a, b) => {
      const sa = parseFloat(a['AI Match Score']) || 0
      const sb = parseFloat(b['AI Match Score']) || 0
      return sb - sa
    })

  function downloadCsv() {
    const headers = Object.keys(rows[0]).join(',')
    const csv = [headers, ...rows.map(csvRow)].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'candidate_pool.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function exportToSP() {
    try {
      const data = await api.exportPool(rows)
      alert(data.success ? `✅ Saved as ${data.filename}` : 'Export failed')
    } catch(e) { alert(e.message) }
  }

  return (
    <div style={{ maxWidth:900, margin:'0 auto' }}>
      <h2 style={{ fontSize:22, fontWeight:700, marginBottom:6 }}>👥 Candidate Pool</h2>

      <div style={{ background:'#F0FFF4', border:'1px solid #81C784', borderRadius:10, padding:'14px 18px', marginBottom:24 }}>
        <p style={{ fontWeight:700, color:'#1B5E20', margin:0 }}>
          ✅ {rows.length} candidate{rows.length!==1?'s':''} shortlisted
        </p>
        <p style={{ color:'#2E7D32', fontSize:13, marginTop:4, marginBottom:0 }}>
          Download pool data or save to SharePoint below.
        </p>
      </div>

      {/* Table */}
      <Card style={{ marginBottom:20, overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'#F1EFE8' }}>
              {Object.keys(rows[0]).map(h => (
                <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontWeight:600, color:'#3F51B5', borderBottom:'1px solid #E8EAED', whiteSpace:'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom:'1px solid #F1EFE8' }}>
                {Object.entries(row).map(([k, v]) => (
                  <td key={k} style={{
                    padding:'9px 12px',
                    color: v === 'Not Available' ? '#DC2626' : undefined,
                    fontWeight: v === 'Not Available' ? 600 : undefined,
                  }}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Export */}
      <h3 style={{ fontSize:15, fontWeight:600, marginBottom:12 }}>💾 Export Pool Data</h3>
      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        <Btn onClick={downloadCsv}>📥 Download as Spreadsheet</Btn>
        <Btn variant="secondary" onClick={exportToSP} disabled={!spConnected}
          title={!spConnected ? 'Connect SharePoint in .env to enable' : ''}>
          ☁️ Save to SharePoint
        </Btn>
      </div>
    </div>
  )
}
