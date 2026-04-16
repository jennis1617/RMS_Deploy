// src/pages/UploadTab.jsx
import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useApp } from '../context/AppContext'
import { api } from '../utils/api'
import { Btn, Card, InfoBox, Spinner, MetricCard } from '../components/UI'

export default function UploadTab() {
  const { setParsedResumes, setResumeTexts, spConnected } = useApp()
  const [mode, setMode]       = useState('manual')  // 'manual' | 'sharepoint'
  const [files, setFiles]     = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus]   = useState('')
  const [done, setDone]       = useState(null)    // { parsed, errors }

  // Date filter for SharePoint
  const [useDate, setUseDate]   = useState(false)
  const [startDate, setStart]   = useState('')
  const [endDate, setEnd]       = useState('')

  const onDrop = useCallback(accepted => {
    setFiles(prev => [...prev, ...accepted.filter(f =>
      !prev.find(p => p.name === f.name)
    )])
  }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    multiple: true,
  })

  async function processManual() {
    if (!files.length) return
    setLoading(true); setStatus('Uploading and parsing resumes…'); setDone(null)
    try {
      const fd = new FormData()
      files.forEach(f => fd.append('files', f))
      const data = await api.parseResumes(fd)
      _storeResults(data)
    } catch (e) {
      setStatus(`Error: ${e.message}`)
    } finally { setLoading(false) }
  }

  async function processSharePoint() {
    setLoading(true); setStatus('Fetching from SharePoint…'); setDone(null)
    try {
      const params = {}
      if (useDate && startDate) params.start_date = startDate
      if (useDate && endDate)   params.end_date   = endDate
      const data = await api.getSharepointResumes(params)
      _storeResults(data)
    } catch (e) {
      setStatus(`Error: ${e.message}`)
    } finally { setLoading(false) }
  }

  function _storeResults(data) {
    const texts = {}
    data.parsed.forEach(r => { texts[r.name] = r._resume_text || '' })
    setParsedResumes(data.parsed)
    setResumeTexts(texts)
    setDone(data)
    setStatus('')
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>📤 Upload / Retrieve Resumes</h2>
      <p style={{ color: '#5F5E5A', marginBottom: 24, fontSize: 14 }}>
        Upload PDF or Word resumes manually, or pull them directly from SharePoint.
      </p>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[['manual', '📁 Upload manually'], ['sharepoint', '☁️ Retrieve from SharePoint']].map(([id, label]) => (
          <Btn key={id} variant={mode === id ? 'primary' : 'secondary'}
            onClick={() => { setMode(id); setDone(null); setFiles([]) }}>
            {label}
          </Btn>
        ))}
      </div>

      {mode === 'manual' && (
        <Card>
          {/* Dropzone */}
          <div {...getRootProps()} style={{
            border: `2px dashed ${isDragActive ? '#7986CB' : '#D3D1C7'}`,
            borderRadius: 10, padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
            background: isDragActive ? '#F0EFFD' : '#FAFAFA', transition: 'all .15s',
            marginBottom: 20,
          }}>
            <input {...getInputProps()} />
            <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
            <p style={{ fontWeight: 500, color: '#1a1a1a' }}>
              {isDragActive ? 'Drop files here' : 'Drag & drop resumes, or click to browse'}
            </p>
            <p style={{ fontSize: 13, color: '#888780', marginTop: 4 }}>PDF and DOCX only</p>
          </div>

          {files.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#5F5E5A', marginBottom: 8 }}>
                {files.length} file{files.length > 1 ? 's' : ''} selected:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {files.map((f, i) => (
                  <div key={i} style={{
                    background: '#E6F1FB', color: '#0C447C', borderRadius: 6,
                    padding: '3px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {f.name}
                    <span style={{ cursor: 'pointer', fontWeight: 700 }}
                      onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}>×</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Btn onClick={processManual} disabled={!files.length || loading} fullWidth>
            {loading ? <><Spinner size={16} /> Parsing resumes…</> : `🚀 Parse ${files.length || 0} Resume${files.length !== 1 ? 's' : ''}`}
          </Btn>
        </Card>
      )}

      {mode === 'sharepoint' && (
        <Card>
          {!spConnected
            ? <InfoBox color="amber">⚠️ SharePoint is not connected. Check your .env credentials (TENANT_ID, CLIENT_ID, etc.).</InfoBox>
            : <InfoBox color="green">✅ SharePoint connected</InfoBox>
          }

          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="useDate" checked={useDate}
              onChange={e => setUseDate(e.target.checked)} />
            <label htmlFor="useDate" style={{ fontSize: 14, cursor: 'pointer' }}>
              Filter by upload date
            </label>
          </div>

          {useDate && (
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#888780', display: 'block', marginBottom: 3 }}>From</label>
                <input type="date" value={startDate} onChange={e => setStart(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #D3D1C7', fontSize: 14 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888780', display: 'block', marginBottom: 3 }}>To</label>
                <input type="date" value={endDate} onChange={e => setEnd(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #D3D1C7', fontSize: 14 }} />
              </div>
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <Btn onClick={processSharePoint} disabled={!spConnected || loading} fullWidth>
              {loading ? <><Spinner size={16} /> Fetching & parsing…</> : '📥 Get All Resumes from SharePoint'}
            </Btn>
          </div>
        </Card>
      )}

      {/* Status */}
      {status && (
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, color: '#5F5E5A' }}>
          <Spinner /> {status}
        </div>
      )}

      {/* Results summary */}
      {done && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            <MetricCard label="Total Files"     value={done.total_files ?? done.parsed.length + done.errors.length} />
            <MetricCard label="Parsed OK"       value={done.parsed.length} />
            <MetricCard label="Failed / Skipped" value={done.errors.length} />
          </div>

          {done.errors.length > 0 && (
            <details style={{ marginBottom: 16 }}>
              <summary style={{ cursor: 'pointer', fontSize: 14, color: '#A32D2D', fontWeight: 500 }}>
                ⚠️ {done.errors.length} file(s) could not be processed
              </summary>
              <div style={{ paddingTop: 8 }}>
                {done.errors.map((e, i) => (
                  <div key={i} style={{ fontSize: 13, color: '#5F5E5A', padding: '3px 0' }}>
                    • <strong>{e.name}</strong> — {e.reason}
                  </div>
                ))}
              </div>
            </details>
          )}

          {done.parsed.length > 0 && (
            <>
              <InfoBox color="green">
                ✅ {done.parsed.length} resume{done.parsed.length > 1 ? 's' : ''} ready — go to <strong>Candidate Review & Scoring</strong> to continue.
              </InfoBox>
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#5F5E5A', marginBottom: 10 }}>
                  Quick preview (first 3):
                </p>
                {done.parsed.slice(0, 3).map((r, i) => (
                  <div key={i} style={{
                    background: '#FAFAFA', border: '1px solid #E8EAED', borderRadius: 8,
                    padding: '12px 16px', marginBottom: 8, fontSize: 13,
                  }}>
                    <strong style={{ fontSize: 15 }}>{r.name || 'Unknown'}</strong>
                    <div style={{ color: '#5F5E5A', marginTop: 4 }}>
                      {r.current_role} · {r.experience_years} yrs · {String(r.tech_stack || '').slice(0, 80)}…
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
