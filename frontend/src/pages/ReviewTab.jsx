// src/pages/ReviewTab.jsx
import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { api, downloadBlob } from '../utils/api'
import { Btn, Card, InfoBox, ProgressBar, Spinner, MetricCard } from '../components/UI'

// ── helpers ───────────────────────────────────────────────────────────────────
const validEmail = v => v && /[^@\s]+@[^@\s]+\.[^@\s]+/.test(v) &&
  !['N/A','None','nan','[EMAIL]'].includes(v)
const validPhone = v => v && (v.replace(/\D/g, '').length >= 7) &&
  !['N/A','None','nan','[PHONE]'].includes(v)

// ── Score badge ───────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  const [bg, fg] = score >= 75 ? ['#E8F5E9','#2E7D32'] : score >= 50 ? ['#E3F2FD','#1565C0'] : ['#FFFDE7','#E65100']
  return (
    <div style={{ textAlign:'center', background:bg, borderRadius:12, padding:'16px 12px', minWidth:110 }}>
      <div style={{ fontSize:11, color:'#666', marginBottom:4, fontWeight:500 }}>AI Match</div>
      <div style={{ fontSize:32, fontWeight:700, color:fg }}>{score}%</div>
    </div>
  )
}

// ── Breakdown bar ─────────────────────────────────────────────────────────────
function BreakdownBar({ dim, score, weight }) {
  const color = score >= 70 ? '#4CAF50' : score >= 45 ? '#FF9800' : '#F44336'
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:14, fontWeight:500 }}>{dim}</span>
        <span style={{ fontSize:12, color:'#888780' }}>{weight} · <strong>{score}%</strong></span>
      </div>
      <ProgressBar value={score} color={color} />
    </div>
  )
}

// ── Quality section — FIX: use ternary not && for array checks ────────────────
function QualitySection({ analysis }) {
  const green = (label, msg) => (
    <div key={label} style={{ background:'#F0FFF4', border:'1px solid #86EFAC', borderRadius:8, padding:'8px 14px', marginBottom:6, fontSize:13 }}>
      <strong style={{ color:'#166534' }}>✅ {label}:</strong> <span style={{ color:'#166534' }}>{msg}</span>
    </div>
  )
  const yellow = (label, items) => (
    <div key={label} style={{ background:'#FFFDE7', border:'1px solid #FDD835', borderRadius:8, padding:'8px 14px', marginBottom:6, fontSize:13 }}>
      <strong style={{ color:'#856404' }}>⚠️ {label}:</strong>
      <ul style={{ marginTop:4, paddingLeft:18, color:'#5D4037' }}>
        {items.map((t,i) => <li key={i} style={{ marginBottom:2 }}>{t}</li>)}
      </ul>
    </div>
  )

  const PRESENT = ['present','found','available','provided','exists','included']
  const missing = (analysis.missing_contact_info || []).filter(m =>
    !PRESENT.some(w => m.toLowerCase().includes(w))
  )

  const gaps     = analysis.career_gaps || []
  const tech     = analysis.technical_anomalies || []
  const concerns = analysis.fake_indicators || []

  return (
    <div style={{ marginTop:16 }}>
      <h4 style={{ fontSize:14, fontWeight:600, marginBottom:10 }}>📋 Resume Quality</h4>
      {gaps.length     ? yellow('Gaps in work history', gaps)           : green('Work history','No major gaps found')}
      {tech.length     ? yellow('Things to double-check', tech)         : green('Experience details','Everything looks consistent')}
      {concerns.length ? yellow('Points needing closer look', concerns) : null}
      {missing.length  ? yellow('Missing contact info', missing)        : green('Contact info','Phone and email present')}
    </div>
  )
}

// ── Doc download buttons ──────────────────────────────────────────────────────
function DocButtons({ candidate, resumeText }) {
  const [loadingWord, setLoadingWord] = useState(false)
  const [loadingPpt,  setLoadingPpt]  = useState(false)

  async function dl(type) {
    const setter = type === 'word' ? setLoadingWord : setLoadingPpt
    setter(true)
    try {
      const fn  = type === 'word' ? api.generateWord : api.generatePpt
      const ext = type === 'word' ? 'docx' : 'pptx'
      const blob = await fn(candidate, resumeText)
      downloadBlob(blob, `${candidate.name.replace(/ /g,'_')}_${type}.${ext}`)
    } catch(e) { alert(e.message) }
    finally { setter(false) }
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:16 }}>
      <Btn onClick={() => dl('word')} variant="secondary" disabled={loadingWord}>
        {loadingWord ? <><Spinner size={14}/> Generating…</> : '⬇️ Download Word Doc'}
      </Btn>
      <Btn onClick={() => dl('ppt')} variant="secondary" disabled={loadingPpt}>
        {loadingPpt ? <><Spinner size={14}/> Generating…</> : '⬇️ Download PPT Profile'}
      </Btn>
    </div>
  )
}

// ── Candidate card ────────────────────────────────────────────────────────────
function CandidateCard({ item, idx, checked, onCheck, resumeText }) {
  const [open, setOpen] = useState(idx === 0)
  const { metadata: meta, analysis, final_score, breakdown, reason } = item

  return (
    <div style={{ border:'1px solid #E8EAED', borderRadius:12, marginBottom:12, overflow:'hidden', background:'#fff' }}>
      {/* Header row */}
      <div
        style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', cursor:'pointer', background: open ? '#FAFAFA' : '#fff' }}
        onClick={() => setOpen(o => !o)}
      >
        <input
          type="checkbox" checked={checked}
          onClick={e => e.stopPropagation()}
          onChange={e => onCheck(e.target.checked)}
          style={{ width:16, height:16, cursor:'pointer' }}
        />
        <div style={{ flex:1 }}>
          <span style={{ fontSize:15, fontWeight:600 }}>#{idx+1} {meta.name}</span>
          <span style={{ marginLeft:10, fontSize:13, color:'#888780' }}>{meta.current_role}</span>
        </div>
        <div style={{
          background: final_score>=75?'#E8F5E9':final_score>=50?'#E3F2FD':'#FFFDE7',
          color: final_score>=75?'#2E7D32':final_score>=50?'#1565C0':'#E65100',
          fontWeight:700, padding:'3px 12px', borderRadius:999, fontSize:13,
        }}>
          {final_score}% match
        </div>
        <span style={{ color:'#888780', fontSize:18 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ padding:'16px 18px', borderTop:'1px solid #E8EAED' }}>
          {/* Score + details */}
          <div style={{ display:'flex', gap:20, marginBottom:16, flexWrap:'wrap' }}>
            <div style={{ flex:2, minWidth:220 }}>
              {[
                ['📧 Email',      validEmail(meta.email) ? meta.email : null],
                ['📱 Phone',      validPhone(meta.phone) ? meta.phone : null],
                ['💼 Experience', `${meta.experience_years} years`],
                ['💻 Key skills', String(meta.tech_stack||'').slice(0,130)],
              ].map(([label, val]) => (
                <div key={label} style={{ fontSize:14, marginBottom:5 }}>
                  <strong>{label}:</strong>{' '}
                  {val
                    ? <span>{val}</span>
                    : <span style={{ color:'#DC2626', fontWeight:600 }}>Not available</span>
                  }
                </div>
              ))}
            </div>
            <ScoreBadge score={final_score} />
          </div>

          {/* Score breakdown */}
          {breakdown && Object.keys(breakdown).length > 0 && (
            <div style={{ background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:10, padding:'16px 18px', marginBottom:16 }}>
              <h4 style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>📊 Score Breakdown</h4>
              {[
                ['Skills Match',       '40% weight'],
                ['Experience Match',   '30% weight'],
                ['Projects Match',     '20% weight'],
                ['Domain & Education', '10% weight'],
              ].map(([dim, wt]) =>
                breakdown[dim] != null
                  ? <BreakdownBar key={dim} dim={dim} score={breakdown[dim]} weight={wt} />
                  : null
              )}
              {reason && (
                <div style={{ background:'#F0F9FF', borderLeft:'4px solid #3B82F6', borderRadius:6, padding:'8px 12px', fontSize:13, color:'#1E40AF' }}>
                  💡 <strong>Why this score?</strong> {reason}
                </div>
              )}
            </div>
          )}

          <QualitySection analysis={analysis} />
          <DocButtons candidate={meta} resumeText={resumeText} />
        </div>
      )}
    </div>
  )
}

// ── SharePoint JD panel ───────────────────────────────────────────────────────
function SharePointJDPanel({ onLoad }) {
  const [jds,        setJds]        = useState([])
  const [loading,    setLoading]    = useState(true)
  const [selected,   setSelected]   = useState('')
  const [fetching,   setFetching]   = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [previewText, setPreviewText] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    api.listJds()
      .then(d => setJds(d.jds || []))
      .catch(() => setJds([]))
      .finally(() => setLoading(false))
  }, [])

  const selectedJd = jds.find(j => j.name === selected)

  async function handleLoad() {
    if (!selectedJd) return
    setFetching(true)
    try {
      const data = await api.downloadJd(selectedJd.download_url, selectedJd.file_type || 'txt')
      onLoad(data.text, selectedJd.display_name || selectedJd.name)
    } catch(e) { alert(e.message) }
    finally { setFetching(false) }
  }

  async function handlePreview() {
    if (!selectedJd) return
    setFetching(true)
    try {
      const data = await api.downloadJd(selectedJd.download_url, selectedJd.file_type || 'txt')
      setPreviewText(data.text)
      setShowPreview(true)
    } catch(e) { alert(e.message) }
    finally { setFetching(false) }
  }

  async function handleDelete() {
    if (!selectedJd) return
    setDeleting(true)
    try {
      await api.deleteJd(selectedJd.item_id)
      setJds(prev => prev.filter(j => j.name !== selected))
      setSelected('')
      setConfirmDel(false)
    } catch(e) { alert(e.message) }
    finally { setDeleting(false) }
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', gap:8, color:'#888780', fontSize:13, padding:'8px 0' }}>
      <Spinner size={14}/> Loading JDs from SharePoint…
    </div>
  )

  if (!jds.length) return (
    <InfoBox color="amber">No job descriptions found in SharePoint yet.</InfoBox>
  )

  return (
    <div>
      <label style={{ fontSize:13, fontWeight:500, color:'#374151', display:'block', marginBottom:6 }}>
        Select a JD from SharePoint
      </label>
      <select
        value={selected}
        onChange={e => { setSelected(e.target.value); setConfirmDel(false); setShowPreview(false) }}
        style={{
          width:'100%', padding:'9px 12px', fontSize:14,
          border:'1px solid #D3D1C7', borderRadius:8, marginBottom:12,
          background:'#fff', cursor:'pointer',
        }}
      >
        <option value="">— select a JD —</option>
        {jds.map(j => (
          <option key={j.name} value={j.name}>
            {j.display_name || j.name}{j.owner_name ? ` · ${j.owner_name}` : ''}
          </option>
        ))}
      </select>

      {selected && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
          <Btn small onClick={handleLoad} disabled={fetching}>
            {fetching ? <><Spinner size={12}/> Loading…</> : '📥 Load this JD'}
          </Btn>
          <Btn small variant="ghost" onClick={handlePreview} disabled={fetching}>
            👁️ Preview
          </Btn>
          <Btn small variant="danger" onClick={() => setConfirmDel(true)}>
            🗑️ Delete
          </Btn>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDel && (
        <div style={{ background:'#FCEBEB', border:'1px solid #F7C1C1', borderRadius:8, padding:'12px 14px', marginBottom:12 }}>
          <p style={{ fontSize:13, color:'#A32D2D', marginBottom:10 }}>
            ⚠️ Permanently delete <strong>{selectedJd?.display_name || selected}</strong> from SharePoint?
          </p>
          <div style={{ display:'flex', gap:8 }}>
            <Btn small variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </Btn>
            <Btn small variant="secondary" onClick={() => setConfirmDel(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      {/* Inline preview */}
      {showPreview && previewText && (
        <div style={{
          border:'1px solid #D3D1C7', borderRadius:8, overflow:'hidden', marginTop:4,
        }}>
          <div style={{
            background:'#F8F9FA', padding:'8px 14px',
            display:'flex', justifyContent:'space-between', alignItems:'center',
            borderBottom:'1px solid #E8EAED',
          }}>
            <span style={{ fontSize:13, fontWeight:500, color:'#374151' }}>
              📄 {selectedJd?.display_name || selected}
            </span>
            <button
              onClick={() => setShowPreview(false)}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#888780', lineHeight:1 }}
            >×</button>
          </div>
          <pre style={{
            margin:0, padding:'14px', fontSize:12, lineHeight:1.7,
            color:'#374151', whiteSpace:'pre-wrap', wordBreak:'break-word',
            maxHeight:300, overflowY:'auto', background:'#fff',
            fontFamily:'inherit',
          }}>
            {previewText.slice(0, 2000)}{previewText.length > 2000 ? '\n\n… (truncated)' : ''}
          </pre>
        </div>
      )}
    </div>
  )
}

// ── JD Preview box (for loaded JD) ────────────────────────────────────────────
function JDPreview({ text, filename, onClear }) {
  const [expanded, setExpanded] = useState(false)
  const preview = expanded ? text : text.slice(0, 400)

  return (
    <div style={{ border:'1px solid #C0DD97', borderRadius:8, overflow:'hidden', marginTop:12 }}>
      <div style={{
        background:'#EAF3DE', padding:'8px 14px',
        display:'flex', justifyContent:'space-between', alignItems:'center',
      }}>
        <span style={{ fontSize:13, fontWeight:500, color:'#27500A' }}>
          ✅ Loaded: {filename}
        </span>
        <div style={{ display:'flex', gap:8 }}>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'#3B6D11', fontWeight:500 }}
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
          <button
            onClick={onClear}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#888780', lineHeight:1 }}
          >×</button>
        </div>
      </div>
      <pre style={{
        margin:0, padding:'12px 14px', fontSize:12, lineHeight:1.7,
        color:'#374151', whiteSpace:'pre-wrap', wordBreak:'break-word',
        maxHeight: expanded ? 500 : 160, overflowY:'auto', background:'#fff',
        fontFamily:'inherit', transition:'max-height .2s',
      }}>
        {preview}{!expanded && text.length > 400 ? '\n…' : ''}
      </pre>
    </div>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────
export default function ReviewTab() {
  const { parsedResumes, resumeTexts, reviewResults, setReviewResults, addToPool, spConnected } = useApp()

  const [jobDesc,      setJobDesc]      = useState('')
  const [jdFilename,   setJdFilename]   = useState('')
  const [jdMode,       setJdMode]       = useState('upload')  // 'upload' | 'sharepoint' | 'paste'
  const [loading,      setLoading]      = useState(false)
  const [checked,      setChecked]      = useState({})
  const [savingJd,     setSavingJd]     = useState(false)
  const [savedJdName,  setSavedJdName]  = useState(`JD_${new Date().toISOString().slice(0,10)}.txt`)

  const checkedNames = reviewResults
    .filter((_, i) => checked[i])
    .map(r => r.metadata?.name)

  async function runScreening() {
    if (!jobDesc.trim() || !parsedResumes.length) return
    setLoading(true); setChecked({})
    try {
      const data = await api.scoreCandidates(parsedResumes, jobDesc)
      setReviewResults(data.results)
    } catch(e) { alert(e.message) }
    finally { setLoading(false) }
  }

  function handleMoveToPool() {
    addToPool(checkedNames)
    alert(`✅ ${checkedNames.length} candidate(s) moved to pool!`)
  }

  async function loadJdFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setJdFilename(file.name)
    const text = await file.text()
    setJobDesc(text)
  }

  function handleSpLoad(text, name) {
    setJobDesc(text)
    setJdFilename(name)
  }

  async function saveJdToSp() {
    if (!jobDesc.trim()) return
    setSavingJd(true)
    try {
      const data = await api.uploadJd(jobDesc, savedJdName)
      if (data.success) alert(`✅ JD saved to SharePoint as "${savedJdName}"`)
      else alert('Failed to save JD')
    } catch(e) { alert(e.message) }
    finally { setSavingJd(false) }
  }

  const jdModes = [
    { id:'upload',     label:'📎 Upload file' },
    { id:'paste',      label:'✏️ Paste text' },
    ...(spConnected ? [{ id:'sharepoint', label:'☁️ From SharePoint' }] : []),
  ]

  return (
    <div style={{ maxWidth:900, margin:'0 auto' }}>
      <h2 style={{ fontSize:22, fontWeight:700, marginBottom:6 }}>🎯 Candidate Review & Scoring</h2>
      <InfoBox color="blue" style={{ marginBottom:24 }}>
        <strong>How this works:</strong> Paste a job description → Run AI Screening → results rank highest first → select candidates → move to pool.
      </InfoBox>

      {!parsedResumes.length && (
        <InfoBox color="amber">⚠️ No resumes loaded. Go to the Upload tab first.</InfoBox>
      )}

      {parsedResumes.length > 0 && (
        <>
          {/* ── Step 1: JD input ── */}
          <Card style={{ marginBottom:20 }}>
            <h3 style={{ fontSize:16, fontWeight:600, marginBottom:14 }}>📄 Step 1 — Job Description</h3>

            {/* Mode tabs */}
            <div style={{ display:'flex', gap:6, marginBottom:16 }}>
              {jdModes.map(m => (
                <button key={m.id} onClick={() => setJdMode(m.id)} style={{
                  padding:'6px 14px', fontSize:13, borderRadius:6, cursor:'pointer',
                  fontWeight: jdMode === m.id ? 600 : 400,
                  background: jdMode === m.id ? '#EEEDFE' : '#F3F4F6',
                  color: jdMode === m.id ? '#534AB7' : '#5F5E5A',
                  border: jdMode === m.id ? '1px solid #CECBF6' : '1px solid #E8EAED',
                }}>{m.label}</button>
              ))}
            </div>

            {/* Upload mode */}
            {jdMode === 'upload' && (
              <div>
                <label style={{ cursor:'pointer', display:'inline-block' }}>
                  <input type="file" accept=".pdf,.docx,.txt" style={{ display:'none' }} onChange={loadJdFile} />
                  <span style={{
                    display:'inline-block', padding:'8px 16px',
                    background:'#F3F4F6', border:'1px solid #D1D5DB',
                    borderRadius:7, fontSize:13, fontWeight:500, cursor:'pointer',
                  }}>
                    📎 Choose JD file (PDF, Word, or TXT)
                  </span>
                </label>
                {jdFilename && (
                  <span style={{ marginLeft:10, fontSize:13, color:'#3B6D11', fontWeight:500 }}>
                    ✅ {jdFilename}
                  </span>
                )}
                {jobDesc && jdMode === 'upload' && (
                  <JDPreview text={jobDesc} filename={jdFilename} onClear={() => { setJobDesc(''); setJdFilename('') }} />
                )}
              </div>
            )}

            {/* Paste mode */}
            {jdMode === 'paste' && (
              <textarea
                value={jobDesc}
                onChange={e => setJobDesc(e.target.value)}
                placeholder="Paste the full job description here…"
                style={{
                  width:'100%', minHeight:180, padding:'10px 14px', fontSize:14,
                  border:'1px solid #D3D1C7', borderRadius:8, resize:'vertical',
                  fontFamily:'inherit', lineHeight:1.6, boxSizing:'border-box',
                }}
              />
            )}

            {/* SharePoint mode */}
            {jdMode === 'sharepoint' && (
              <div>
                <SharePointJDPanel onLoad={handleSpLoad} />
                {jobDesc && jdFilename && (
                  <JDPreview text={jobDesc} filename={jdFilename} onClear={() => { setJobDesc(''); setJdFilename('') }} />
                )}
              </div>
            )}

            {/* Save to SharePoint (shown when JD is loaded and SP is connected) */}
            {jobDesc && spConnected && jdMode !== 'sharepoint' && (
              <div style={{
                marginTop:14, padding:'12px 14px',
                background:'#F8F9FA', border:'1px solid #E8EAED', borderRadius:8,
              }}>
                <p style={{ fontSize:13, fontWeight:500, marginBottom:8, color:'#374151' }}>
                  ☁️ Save this JD to SharePoint
                </p>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <input
                    value={savedJdName}
                    onChange={e => setSavedJdName(e.target.value)}
                    style={{
                      flex:1, padding:'7px 10px', fontSize:13,
                      border:'1px solid #D3D1C7', borderRadius:6,
                    }}
                  />
                  <Btn small onClick={saveJdToSp} disabled={savingJd} variant="secondary">
                    {savingJd ? <><Spinner size={12}/> Saving…</> : '💾 Save'}
                  </Btn>
                </div>
              </div>
            )}
          </Card>

          {/* ── Step 2: Run screening ── */}
          <Card style={{ marginBottom:20 }}>
            <h3 style={{ fontSize:16, fontWeight:600, marginBottom:12 }}>Step 2 — Run AI Screening</h3>
            <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
              <Btn onClick={runScreening} disabled={!jobDesc.trim() || loading}>
                {loading
                  ? <><Spinner size={16}/> Screening {parsedResumes.length} candidates…</>
                  : '🚀 Run AI Screening'
                }
              </Btn>
              <span style={{ fontSize:14, color:'#5F5E5A' }}>
                Will screen <strong>{parsedResumes.length}</strong> candidate{parsedResumes.length !== 1 ? 's' : ''}
              </span>
            </div>
          </Card>
        </>
      )}

      {/* ── Results ── */}
      {reviewResults.length > 0 && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
            <MetricCard label="Total Candidates" value={reviewResults.length} />
            <MetricCard label="Selected"         value={Object.values(checked).filter(Boolean).length} />
            <MetricCard label="Yet to Review"    value={reviewResults.length - Object.values(checked).filter(Boolean).length} />
          </div>

          <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
            <Btn variant="secondary" small onClick={() => {
              const all = {}; reviewResults.forEach((_,i) => all[i] = true); setChecked(all)
            }}>✅ Select All</Btn>
            <Btn variant="secondary" small onClick={() => setChecked({})}>❌ Clear All</Btn>
            <Btn small disabled={!checkedNames.length} onClick={handleMoveToPool}>
              Move to Candidate Pool ({checkedNames.length})
            </Btn>
          </div>

          <h3 style={{ fontSize:16, fontWeight:600, marginBottom:12 }}>
            📋 All {reviewResults.length} Candidates — ranked by score
          </h3>
          {reviewResults.map((item, i) => (
            <CandidateCard
              key={i} item={item} idx={i}
              checked={!!checked[i]}
              onCheck={v => setChecked(prev => ({ ...prev, [i]: v }))}
              resumeText={resumeTexts[item.metadata?.name] || ''}
            />
          ))}
        </>
      )}
    </div>
  )
}
