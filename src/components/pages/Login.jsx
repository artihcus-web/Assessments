import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../../utils/api'

const POLL_INTERVAL_MS = 3000

function Login() {
  const navigate = useNavigate()
  const [employeeId, setEmployeeId] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [pendingEmployeeId, setPendingEmployeeId] = useState(null)

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
        navigate('/assessments-dashboard')
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

  React.useEffect(() => {
    if (!pendingEmployeeId) return
    const interval = setInterval(async () => {
      try {
        const data = await apiRequest(`/api/assessments/access-requests/check/${encodeURIComponent(pendingEmployeeId)}`)
        if (data.status === 'approved') {
          sessionStorage.setItem('assessments_approved', JSON.stringify({ employeeId: pendingEmployeeId, approved: true }))
          navigate('/assessments-dashboard')
        }
      } catch {
        // Ignore
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [pendingEmployeeId, navigate])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
          Assessments Portal
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
          Enter your Employee ID to request access
        </p>

        <form onSubmit={handleRequestAccess} className="space-y-4">
          <div>
            <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enter your Employee ID
            </label>
            <input
              id="employeeId"
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="e.g. EMP001"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={loading}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Submitting...' : 'Request Access'}
          </button>
        </form>

        {message && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              message.type === 'error'
                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}

export default Login
