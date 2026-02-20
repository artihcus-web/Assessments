import React, { useState, useEffect } from 'react'
import { apiRequest } from '../../utils/api'
import { getApiBaseUrl } from '../../config/apiConfig'

const BookIcon = ({ className = 'w-8 h-8' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
)

const FileIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const DownloadIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
)

export default function KnowledgeBase() {
  const [modules, setModules] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedModuleId, setSelectedModuleId] = useState('')

  const baseUrl = getApiBaseUrl()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const [modulesRes, notesRes] = await Promise.all([
          apiRequest('/api/assessments/modules'),
          apiRequest('/api/assessments/knowledge-base')
        ])
        if (!cancelled) {
          setModules(modulesRes.modules || [])
          setNotes(Array.isArray(notesRes?.items) ? notesRes.items : (notesRes?.data || []))
        }
      } catch (e) {
        if (!cancelled) {
          const status = e.response?.status
          const msg = e.response?.data?.message || e.message || 'Failed to load knowledge base'
          setError(status === 404
            ? 'Knowledge base not available (404). Ensure the API has been deployed with the latest backend.'
            : msg)
          setNotes([])
          setModules([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filteredNotes = selectedModuleId
    ? notes.filter(n => String(n.moduleId) === String(selectedModuleId))
    : notes

  const notesByModule = filteredNotes.reduce((acc, note) => {
    const key = note.moduleName || 'Other'
    if (!acc[key]) acc[key] = []
    acc[key].push(note)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Knowledge Base</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Reference materials and guides for your assessments.</p>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-700 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Knowledge Base</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Reference materials and guides for your assessments.</p>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Knowledge Base</h1>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Reference materials and notes by module. View or download to study.</p>

      {notes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
          <BookIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-600 dark:text-slate-400">No notes available yet.</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Check back later or contact your administrator.</p>
        </div>
      ) : (
        <>
          {modules.length > 1 && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Filter by module</label>
              <select
                value={selectedModuleId}
                onChange={e => setSelectedModuleId(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
              >
                <option value="">All modules</option>
                {modules.map(mod => (
                  <option key={mod._id || mod.id} value={mod._id || mod.id}>{mod.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-6">
            {Object.entries(notesByModule).map(([moduleName, items]) => (
              <div key={moduleName} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{moduleName}</h2>
                </div>
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                  {items.map(note => {
                    const downloadUrl = `${baseUrl}/api/assessments/knowledge-base/${note._id || note.id}/download`
                    return (
                      <li key={note._id || note.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileIcon className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white truncate">{note.title || note.fileName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{note.fileName}</p>
                          </div>
                        </div>
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex-shrink-0"
                        >
                          <DownloadIcon />
                          View / Download
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
