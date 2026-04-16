// src/utils/api.js
const BASE = '/api'

async function req(method, path, body, isFile = false) {
  const opts = { method, headers: {} }
  if (body && !isFile) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  } else if (body && isFile) {
    opts.body = body  // FormData
  }
  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res
}

const get  = (path)        => req('GET',    path).then(r => r.json())
const post = (path, body)  => req('POST',   path, body).then(r => r.json())
const del  = (path)        => req('DELETE', path).then(r => r.json())

export const api = {
  health:              ()          => get('/health'),
  sharepointStatus:    ()          => get('/sharepoint/status'),

  // Resumes
  parseResumes:        (formData)  => req('POST', '/parse-resumes', formData, true).then(r => r.json()),
  getSharepointResumes: (params)   => {
    const qs = new URLSearchParams(params).toString()
    return get(`/sharepoint/resumes${qs ? '?' + qs : ''}`)
  },

  // Screening
  scoreCandidates:     (candidates, jobDescription) =>
    post('/score-candidates', { candidates, job_description: jobDescription }),

  // Docs — return blob for download
  generateWord: async (candidate, resumeText) => {
    const res = await req('POST', '/generate-word', { candidate, resume_text: resumeText })
    return res.blob()
  },
  generatePpt: async (candidate, resumeText) => {
    const res = await req('POST', '/generate-ppt', { candidate, resume_text: resumeText })
    return res.blob()
  },

  // SharePoint JDs
  listJds:     ()                        => get('/sharepoint/jds'),
  uploadJd:    (text, filename)          => post('/sharepoint/jds', { text, filename }),
  downloadJd:  (download_url, file_type) => post('/sharepoint/jds/download', { download_url, file_type }),
  deleteJd:    (itemId)                  => del(`/sharepoint/jds/${itemId}`),

  // Pool export
  exportPool:  (candidates)             => post('/sharepoint/export-pool', { candidates }),
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
