// src/pages/ReviewTab.jsx
import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { api, downloadBlob } from '../utils/api'
import { Btn, Card, InfoBox, ProgressBar, Spinner, MetricCard } from '../components/UI'

// helpers 
const validEmail = v => v && /[^@\s]+@[^@\s]+\.[^@\s]+/.test(v) &&
  !['N/A','None','nan','[EMAIL]'].includes(v)
const validPhone = v => v && (v.replace(/\D/g, '').length >= 7) &&
  !['N/A','None','nan','[PHONE]'].includes(v)

function ScoreBadge({ score }) {
  const [bg, fg] = score >= 75 ? ['#E8F5E9','#2E7D32'] : score >= 50 ? ['#E3F2FD','#1565C0'] : ['#FFFDE7','#E65100']
  return (
    <div style={{ textAlign:'center', background:bg, borderRadius:12, padding:'16px 12px', minWidth:110 }}>
      <div style={{ fontSize:11, color:'#666', marginBottom:4, fontWeight:500 }}>AI Match</div>
      <div style={{ fontSize:32, fontWeight:700, color:fg }}>{score}%</div>
    </div>
  )
}

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

function QualitySection({ analysis }) {
  const green = (label, msg) => (
    <div key={label} style={{ background:'#F0FFF4', border:'1px solid #86EFAC', borderRadius:8, padding:'8px 14px', marginBottom:6, fontSize:13 }}>
      <strong style={{ color:'#166534' }}>✅ {label}:</strong> <span style={{ color:'#166534' }}>{msg}</span>
    </div>
  )
  const yellow = (label, items) => items.length === 0 ? null : (
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

  return (
    <div style={{ marginTop:16 }}>
      <h4 style={{ fontSize:14, fontWeight:600, marginBottom:10 }}>📋 Resume Quality</h4>
      {analysis.career_gaps?.length ? yellow('Gaps in work history', analysis.career_gaps) : green('Work history','No major gaps found')}
      {analysis.technical_anomalies?.length ? yellow('Things to double-check', analysis.technical_anomalies) : green('Experience details','Everything looks consistent')}
      {analysis.fake_indicators?.length && yellow('Points needing closer look', analysis.fake_indicators)}
      {missing.length ? yellow('Missing contact info', missing) : green('Contact info','Phone and email present')}
    </div>
  )
}

function DocButtons({ candidate, resumeText, idx }) {
  const [loadingWord, setLoadingWord] = useState(false)
  const [loadingPpt,  setLoadingPpt]  = useState(false)

  async function dl(type) {
    const setter = type === 'word' ? setLoadingWord : setLoadingPpt
    setter(true)
    try {
      const fn = type === 'word' ? api.generateWord : api.generatePpt
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

function CandidateCard({ item, idx, checked, onCheck, resumeText }) {
  const [open, setOpen] = useState(idx === 0)
  const { metadata: meta, analysis, final_score, breakdown, reason } = item
  const inPool = false

  return (
    <div style={{ border:'1px solid #E8EAED', borderRadius:12, marginBottom:12, overflow:'hidden', background:'#fff' }}>
      {/* Header row */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', cursor:'pointer', background: open ? '#FAFAFA' : '#fff' }}
        onClick={() => setOpen(o => !o)}>
        <input type="checkbox" checked={checked} onClick={e => e.stopPropagation()}
          onChange={e => onCheck(e.target.checked)} style={{ width:16, height:16, cursor:'pointer' }} />
        <div style={{ flex:1 }}>
          <span style={{ fontSize:15, fontWeight:600 }}>#{idx+1} {meta.name}</span>
          <span style={{ marginLeft:10, fontSize:13, color:'#888780' }}>{meta.current_role}</span>
        </div>
        <div style={{ background: final_score>=75?'#E8F5E9':final_score>=50?'#E3F2FD':'#FFFDE7',
          color: final_score>=75?'#2E7D32':final_score>=50?'#1565C0':'#E65100',
          fontWeight:700, padding:'3px 12px', borderRadius:999, fontSize:13 }}>
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
                ['📧 Email', validEmail(meta.email) ? meta.email : null],
                ['📱 Phone', validPhone(meta.phone) ? meta.phone : null],
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

          {/* Breakdown */}
          {breakdown && Object.keys(breakdown).length > 0 && (
            <div style={{ background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:10, padding:'16px 18px', marginBottom:16 }}>
              <h4 style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>📊 Score Breakdown</h4>
              {[
                ['Skills Match','40% weight'],
                ['Experience Match','30% weight'],
                ['Projects Match','20% weight'],
                ['Domain & Education','10% weight'],
              ].map(([dim, wt]) => breakdown[dim] != null && (
                <BreakdownBar key={dim} dim={dim} score={breakdown[dim]} weight={wt} />
              ))}
              {reason && (
                <div style={{ background:'#F0F9FF', borderLeft:'4px solid #3B82F6', borderRadius:6, padding:'8px 12px', fontSize:13, color:'#1E40AF' }}>
                  💡 <strong>Why this score?</strong> {reason}
                </div>
              )}
            </div>
          )}

          <QualitySection analysis={analysis} />
          <DocButtons candidate={meta} resumeText={resumeText} idx={idx} />
        </div>
      )}
    </div>
  )
}

// Main tab 
export default function ReviewTab() {
  const { parsedResumes, resumeTexts, reviewResults, setReviewResults, addToPool } = useApp()

  const [jobDesc,   setJobDesc]   = useState('')
  const [jdFile,    setJdFile]    = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [checked,   setChecked]   = useState({}) 

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
    setJdFile(file.name)
    const text = await file.text()
    setJobDesc(text)
  }

  return (
    <div style={{ maxWidth:900, margin:'0 auto' }}>
      <h2 style={{ fontSize:22, fontWeight:700, marginBottom:6 }}>🎯 Candidate Review & Scoring</h2>
      <InfoBox color="blue" style={{ marginBottom:24 }}>
        <strong>How this works:</strong> Paste a job description below → Run AI Screening → results rank highest first → select candidates → move to pool.
      </InfoBox>

      {!parsedResumes.length && (
        <InfoBox color="amber">⚠️ No resumes loaded. Go to the Upload tab first.</InfoBox>
      )}

      {parsedResumes.length > 0 && (
        <>
          <Card style={{ marginBottom:20 }}>
            <h3 style={{ fontSize:16, fontWeight:600, marginBottom:12 }}>📄 Step 1 — Job Description</h3>
            <div style={{ display:'flex', gap:10, marginBottom:12 }}>
              <label style={{ cursor:'pointer' }}>
                <input type="file" accept=".pdf,.docx,.txt" style={{ display:'none' }} onChange={loadJdFile} />
                <span style={{
                  display:'inline-block', padding:'7px 14px', background:'#F3F4F6',
                  border:'1px solid #D1D5DB', borderRadius:6, fontSize:13, fontWeight:500,
                  cursor:'pointer',
                }}>📎 Upload JD file {jdFile ? `(${jdFile})` : ''}</span>
              </label>
              <span style={{ fontSize:13, color:'#888780', alignSelf:'center' }}>or paste below</span>
            </div>
            <textarea
              value={jobDesc}
              onChange={e => setJobDesc(e.target.value)}
              placeholder="Paste the job description here…"
              style={{
                width:'100%', minHeight:160, padding:'10px 14px', fontSize:14,
                border:'1px solid #D3D1C7', borderRadius:8, resize:'vertical',
                fontFamily:'inherit', lineHeight:1.6,
              }}
            />
          </Card>

          <Card style={{ marginBottom:20 }}>
            <h3 style={{ fontSize:16, fontWeight:600, marginBottom:12 }}>Step 2 — Run Screening</h3>
            <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
              <Btn onClick={runScreening} disabled={!jobDesc.trim() || loading}>
                {loading ? <><Spinner size={16}/> Screening {parsedResumes.length} candidates…</> : '🚀 Run AI Screening'}
              </Btn>
              <span style={{ fontSize:14, color:'#5F5E5A' }}>
                Will screen <strong>{parsedResumes.length}</strong> candidate{parsedResumes.length!==1?'s':''}
              </span>
            </div>
          </Card>
        </>
      )}

      {reviewResults.length > 0 && (
        <>
          {/* Summary metrics */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
            <MetricCard label="Total Candidates" value={reviewResults.length} />
            <MetricCard label="Selected" value={Object.values(checked).filter(Boolean).length} />
            <MetricCard label="Yet to Review" value={reviewResults.length - Object.values(checked).filter(Boolean).length} />
          </div>

          {/* Bulk actions */}
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
