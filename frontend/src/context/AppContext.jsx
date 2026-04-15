// src/context/AppContext.jsx
import React, { createContext, useContext, useState } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [parsedResumes,   setParsedResumes]   = useState([])
  const [resumeTexts,     setResumeTexts]     = useState({})   // name → raw text
  const [reviewResults,   setReviewResults]   = useState([])
  const [selectedPool,    setSelectedPool]    = useState(new Set())
  const [spConnected,     setSpConnected]     = useState(false)
  const [activeTab,       setActiveTab]       = useState('upload')

  function addToPool(names) {
    setSelectedPool(prev => new Set([...prev, ...names]))
  }
  function removeFromPool(name) {
    setSelectedPool(prev => { const s = new Set(prev); s.delete(name); return s })
  }
  function clearPool() { setSelectedPool(new Set()) }

  return (
    <AppContext.Provider value={{
      parsedResumes, setParsedResumes,
      resumeTexts, setResumeTexts,
      reviewResults, setReviewResults,
      selectedPool, addToPool, removeFromPool, clearPool,
      spConnected, setSpConnected,
      activeTab, setActiveTab,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
