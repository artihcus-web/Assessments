import React, { useState, useEffect, useCallback, useRef } from 'react'
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

const LockIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
)

// Secure document viewer: view-only. Load document via fetch + blob URL.
// Use <object> for PDFs so Chrome doesn't block (Chrome often blocks PDF in sandboxed iframes).
function SecureDocumentViewer({ requestId, employeeId, documentTitle, onClose }) {
  const viewerRef = useRef(null)
  const baseUrl = getApiBaseUrl()
  const viewUrl = `${baseUrl}/api/assessments/knowledge-requests/${requestId}/view?employeeId=${encodeURIComponent(employeeId)}`

  const [blobUrl, setBlobUrl] = useState(null)
  const [mimeType, setMimeType] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let revoked = false
    setLoading(true)
    setLoadError(null)
    setBlobUrl(null)
    setMimeType(null)

    fetch(viewUrl, { credentials: 'include', method: 'GET' })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 403) throw new Error('You do not have access to this document.')
          if (res.status === 404) throw new Error('Document not found.')
          throw new Error(res.statusText || 'Failed to load document')
        }
        const contentType = res.headers.get('Content-Type') || ''
        return res.blob().then((blob) => ({ blob, contentType }))
      })
      .then(({ blob, contentType }) => {
        if (revoked) return
        const url = URL.createObjectURL(blob)
        setBlobUrl(url)
        setMimeType(blob.type || contentType.split(';')[0].trim() || 'application/octet-stream')
        setLoading(false)
      })
      .catch((err) => {
        if (!revoked) {
          setLoadError(err.message || 'Failed to load document')
          setLoading(false)
        }
      })

    return () => {
      revoked = true
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [viewUrl])

  const preventDefault = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    return false
  }, [])

  const handleKeyDown = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      const key = (e.key || '').toLowerCase()
      if (key === 's' || key === 'c' || key === 'p' || key === 'u' || key === 'a') {
        e.preventDefault()
        return false
      }
    }
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))) {
      e.preventDefault()
      return false
    }
  }, [])

  useEffect(() => {
    const ctx = (e) => preventDefault(e)
    const copy = (e) => preventDefault(e)
    const key = (e) => handleKeyDown(e)
    document.addEventListener('contextmenu', ctx)
    document.addEventListener('copy', copy)
    document.addEventListener('cut', copy)
    document.addEventListener('keydown', key)
    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'
    return () => {
      document.removeEventListener('contextmenu', ctx)
      document.removeEventListener('copy', copy)
      document.removeEventListener('cut', copy)
      document.removeEventListener('keydown', key)
      document.body.style.userSelect = ''
      document.body.style.webkitUserSelect = ''
    }
  }, [preventDefault, handleKeyDown])

  return (
    <div
      ref={viewerRef}
      className="fixed inset-0 z-[100] flex flex-col bg-slate-900"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      onContextMenu={preventDefault}
      onCopy={preventDefault}
      onCut={preventDefault}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2 text-white">
          <LockIcon className="w-5 h-5 text-emerald-400" />
          <span className="font-medium text-sm">Secure view only — no copy, download, or print</span>
          {documentTitle && <span className="text-slate-400 text-sm truncate max-w-[200px]"> · {documentTitle}</span>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium"
        >
          Close
        </button>
      </div>
      <div className="flex-1 min-h-0 relative flex flex-col items-center justify-center" onContextMenu={preventDefault}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="w-10 h-10 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
            <p className="ml-3 text-slate-400">Loading document…</p>
          </div>
        )}
        {loadError && !loading && (
          <div className="p-6 text-center max-w-md">
            <p className="text-red-400 font-medium mb-2">Cannot display document</p>
            <p className="text-slate-400 text-sm mb-4">{loadError}</p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm"
            >
              Close
            </button>
          </div>
        )}
        {blobUrl && !loadError && (
          <>
            {mimeType && mimeType.toLowerCase().includes('pdf') ? (
              <object
                data={blobUrl}
                type="application/pdf"
                className="w-full h-full border-0 bg-white"
                title="Document view"
              >
                <div className="p-6 text-center text-slate-400 text-sm">
                  PDF viewer not available. Try Chrome, Edge, or Firefox with default settings.
                </div>
              </object>
            ) : (
              <iframe
                title="Document view"
                src={blobUrl}
                className="w-full h-full border-0 bg-white"
                sandbox="allow-same-origin"
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function KnowledgeBase() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(null)
  const [description, setDescription] = useState('')
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [viewingRequest, setViewingRequest] = useState(null)
  const [employeeId, setEmployeeId] = useState('')

  const baseUrl = getApiBaseUrl()

  useEffect(() => {
    try {
      const session = sessionStorage.getItem('assessments_approved')
      const parsed = JSON.parse(session || '{}')
      if (parsed?.employeeId) setEmployeeId(parsed.employeeId)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!employeeId) {
      setLoading(false)
      setRequests([])
      return
    }
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const data = await apiRequest(`/api/assessments/knowledge-requests/my?employeeId=${encodeURIComponent(employeeId)}`)
        if (!cancelled) setRequests(data.requests || [])
      } catch (e) {
        if (!cancelled) {
          setError(e.response?.data?.message || e.message || 'Failed to load your requests')
          setRequests([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [employeeId])

  const handleSubmitRequest = async (e) => {
    e.preventDefault()
    const desc = (description || '').trim()
    if (!desc) {
      setError('Please describe the document or content you need (e.g. policy, handbook, course material).')
      return
    }
    if (!employeeId) {
      setError('Session missing. Please log in again from the Assessments portal.')
      return
    }
    setSubmitting(true)
    setError(null)
    setSubmitSuccess(null)
    try {
      await apiRequest('/api/assessments/knowledge-requests', {
        method: 'POST',
        body: JSON.stringify({
          employeeId,
          description: desc,
          title: (title || '').trim() || undefined
        })
      })
      setSubmitSuccess('Request submitted. An admin will review and upload the document when ready.')
      setDescription('')
      setTitle('')
      const data = await apiRequest(`/api/assessments/knowledge-requests/my?employeeId=${encodeURIComponent(employeeId)}`)
      setRequests(data.requests || [])
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  if (!employeeId) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Knowledge Base</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Request documents and view approved content.</p>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-200">
          Please use the Assessments portal and request access first. Your session is required to request and view documents.
        </div>
      </div>
    )
  }

  if (viewingRequest) {
    return (
      <SecureDocumentViewer
        requestId={viewingRequest._id || viewingRequest.id}
        employeeId={employeeId}
        documentTitle={viewingRequest.documentTitle || viewingRequest.title}
        onClose={() => setViewingRequest(null)}
      />
    )
  }

  if (loading) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Knowledge Base</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Request documents and view approved content.</p>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-700 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Knowledge Base</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Request any book, document, or content related to the organization (policies, handbooks, course material, etc.). When approved, you can view it securely — no download or copy.
        </p>
      </div>

      {/* Request form */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <BookIcon className="w-5 h-5 text-indigo-500" />
          Request a document
        </h2>
        <form onSubmit={handleSubmitRequest} className="space-y-3">
          <div>
            <label htmlFor="kb-title" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Short title (optional)</label>
            <input
              id="kb-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. HR Policy Handbook"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm placeholder-slate-400"
            />
          </div>
          <div>
            <label htmlFor="kb-desc" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Description *</label>
            <textarea
              id="kb-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Clearly describe what you need: e.g. 'Employee handbook 2024', 'Directors list and roles', 'Safety policy PDF', 'Training course material for Module X'..."
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm placeholder-slate-400"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {submitSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400">{submitSuccess}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
          >
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        </form>
      </div>

      {/* My requests */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <FileIcon className="w-5 h-5 text-indigo-500" />
            My requests
          </h2>
        </div>
        {requests.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">No requests yet.</p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">Submit a request above; when admin approves and uploads, you can view it here (view-only).</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {requests.map(req => {
              const id = req._id || req.id
              const isApproved = req.status === 'approved'
              const isPending = req.status === 'pending'
              const isRejected = req.status === 'rejected'
              return (
                <li key={id} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 dark:text-white text-sm">{req.title || 'Document request'}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">{req.description}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          isPending ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                          isApproved ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {req.status}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                    </div>
                    {isApproved && (
                      <button
                        type="button"
                        onClick={() => setViewingRequest(req)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex-shrink-0"
                      >
                        <LockIcon className="w-4 h-4" />
                        View (secure)
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <p className="text-center text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
        <LockIcon className="w-3 h-3" />
        Approved documents are view-only. Copy, download, and print are disabled.
      </p>
    </div>
  )
}
