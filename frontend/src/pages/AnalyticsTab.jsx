// src/pages/AnalyticsTab.jsx
import React, { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { InfoBox, MetricCard, Card } from '../components/UI'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Cell,
} from 'recharts'

function expBin(yrs) {
  const y = parseFloat(yrs) || 0
  if (y <= 2) return '0–2 yrs'
  if (y <= 5) return '2–5 yrs'
  if (y <= 10) return '5–10 yrs'
  return '10+ yrs'
}

export default function AnalyticsTab() {
  const { parsedResumes, reviewResults, selectedPool } = useApp()

  const expData = useMemo(() => {
    const bins = { '0–2 yrs': 0, '2–5 yrs': 0, '5–10 yrs': 0, '10+ yrs': 0 }
    parsedResumes.forEach(r => { bins[expBin(r.experience_years)]++ })
    return Object.entries(bins).map(([name, count]) => ({ name, count }))
  }, [parsedResumes])

  const scoreData = useMemo(() =>
    reviewResults.map(r => ({
      name:  (r.metadata?.name || '?').split(' ')[0],
      score: r.final_score,
    })).sort((a,b) => b.score - a.score)
  , [reviewResults])

  const skillData = useMemo(() => {
    const counts = {}
    parsedResumes.forEach(r => {
      String(r.tech_stack || '').split(',').forEach(s => {
        const k = s.trim().toLowerCase()
        if (k && k !== 'nan') counts[k] = (counts[k] || 0) + 1
      })
    })
    return Object.entries(counts)
      .sort((a,b) => b[1]-a[1])
      .slice(0,12)
      .map(([name, count]) => ({ name: name.slice(0,20), count }))
  }, [parsedResumes])

  if (!parsedResumes.length) {
    return (
      <div style={{ maxWidth:800, margin:'0 auto' }}>
        <h2 style={{ fontSize:22, fontWeight:700, marginBottom:16 }}>📈 Analytics</h2>
        <InfoBox color="blue">Upload and process resumes first to see analytics.</InfoBox>
      </div>
    )
  }

  const uniqueSkills = new Set(
    parsedResumes.flatMap(r => String(r.tech_stack||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean))
  ).size

  return (
    <div style={{ maxWidth:960, margin:'0 auto' }}>
      <h2 style={{ fontSize:22, fontWeight:700, marginBottom:20 }}>📈 Analytics Dashboard</h2>

      {/* Metrics */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:28 }}>
        <MetricCard label="Total Resumes" value={parsedResumes.length} />
        <MetricCard label="In Candidate Pool" value={selectedPool.size} />
        <MetricCard label="Different Skills Seen" value={uniqueSkills} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        {/* Experience distribution */}
        <Card>
          <h3 style={{ fontSize:15, fontWeight:600, marginBottom:16 }}>Experience Levels</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={expData} margin={{ top:0, right:0, left:-20, bottom:0 }}>
              <XAxis dataKey="name" tick={{ fontSize:12 }} />
              <YAxis tick={{ fontSize:12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Candidates" radius={[4,4,0,0]}>
                {expData.map((_, i) => <Cell key={i} fill={['#378ADD','#7986CB','#9FA8DA','#C5CAE9'][i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Match scores */}
        <Card>
          <h3 style={{ fontSize:15, fontWeight:600, marginBottom:16 }}>
            {scoreData.length ? 'AI Match Scores' : 'Match Scores'}
          </h3>
          {scoreData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scoreData} layout="vertical" margin={{ top:0, right:30, left:0, bottom:0 }}>
                <XAxis type="number" domain={[0,100]} tick={{ fontSize:12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize:11 }} width={70} />
                <Tooltip formatter={v => [`${v}%`,'Score']} />
                <Bar dataKey="score" radius={[0,4,4,0]}>
                  {scoreData.map((d,i) => (
                    <Cell key={i} fill={d.score>=75?'#4CAF50':d.score>=50?'#FF9800':'#F44336'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center', color:'#888780', fontSize:13 }}>
              Run AI Screening to see match scores
            </div>
          )}
        </Card>
      </div>

      {/* Top skills */}
      <Card>
        <h3 style={{ fontSize:15, fontWeight:600, marginBottom:16 }}>Most Common Skills</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={skillData} layout="vertical" margin={{ top:0, right:40, left:10, bottom:0 }}>
            <XAxis type="number" tick={{ fontSize:12 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize:11 }} width={110} />
            <Tooltip formatter={v => [v, 'Candidates']} />
            <Bar dataKey="count" fill="#7986CB" radius={[0,4,4,0]}
              label={{ position:'right', fontSize:11, fill:'#5F5E5A' }} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
