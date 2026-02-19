import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../../utils/api'

const POLL_INTERVAL_MS = 3000

function Login() {
  const navigate = useNavigate()
  const [employeeId, setEmployeeId] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [pendingEmployeeId, setPendingEmployeeId] = useState(null)

  // If already approved, go to dashboard and replace history so Back doesn't return to Login
  useEffect(() => {
    try {
      const session = sessionStorage.getItem('assessments_approved')
      const parsed = JSON.parse(session || '{}')
      if (parsed?.approved && parsed?.employeeId) {
        navigate('/assessments-dashboard', { replace: true })
      }
    } catch {
      // ignore
    }
  }, [navigate])

  const handleRequestAccess = async (e) => {
    e.preventDefault()
    if (!employeeId.trim()) {
      setMessage({ type: 'error', text: 'Please enter your Employee ID' })
      return
    }

    setLoading(true)
    setMessage(null)
    try {
      const data = await apiRequest('/api/assessments/access-requests', {
        method: 'POST',
        body: JSON.stringify({ employeeId: employeeId.trim() })
      })

      if (data.status === 'approved') {
        sessionStorage.setItem('assessments_approved', JSON.stringify({ employeeId: employeeId.trim(), approved: true }))
        navigate('/assessments-dashboard', { replace: true })
        return
      }

      setMessage({ type: 'success', text: data.message || 'Request submitted. Waiting for admin approval...' })
      setPendingEmployeeId(employeeId.trim())
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to submit request'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!pendingEmployeeId) return
    const interval = setInterval(async () => {
      try {
        const data = await apiRequest(`/api/assessments/access-requests/check/${encodeURIComponent(pendingEmployeeId)}`)
        if (data.status === 'approved') {
          sessionStorage.setItem('assessments_approved', JSON.stringify({ employeeId: pendingEmployeeId, approved: true }))
          navigate('/assessments-dashboard', { replace: true })
        }
      } catch {
        // Ignore
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [pendingEmployeeId, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background: gradient + subtle pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}
      />
      {/* Accent glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[480px] h-64 bg-indigo-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-0 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />

          <div className="p-8 md:p-10">
            {/* Icon */}
            <div className="mx-auto w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-6">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-1">
              Assessments Portal
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-8">
              Enter your Employee ID to request access
            </p>

            <form onSubmit={handleRequestAccess} className="space-y-5">
              <div>
                <label htmlFor="employeeId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Employee ID
                </label>
                <input
                  id="employeeId"
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="e.g. EMP001"
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 transition-shadow"
                  disabled={loading}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 transition-all duration-200"
              >
                {loading ? 'Submitting...' : 'Request Access'}
              </button>
            </form>

            {message && (
              <div
                className={`mt-5 p-4 rounded-xl text-sm ${
                  message.type === 'error'
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50'
                    : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                }`}
              >
                {message.text}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-slate-400 dark:text-slate-500 text-xs mt-6">
          Access is subject to admin approval
        </p>
      </div>
    </div>
  )
}

export default Login
