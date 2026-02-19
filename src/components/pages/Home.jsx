import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../../utils/api'

function Home() {
  const navigate = useNavigate()
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rulesData, setRulesData] = useState(null) // { module, settings }
  const [rulesAccepted, setRulesAccepted] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        if (typeof window !== 'undefined') window.__lastAssessmentsStatus__ = undefined
        const data = await apiRequest('/api/assessments/modules')
        if (!cancelled) setModules(data.modules || [])
      } catch (e) {
        if (typeof window !== 'undefined' && e.response?.status) window.__lastAssessmentsStatus__ = e.response.status
        if (!cancelled) setError(e.response?.data?.message || e.message || 'Failed to load modules')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleModuleClick = async (moduleId) => {
    setError(null)
    setRulesAccepted(false)
    try {
      // Fetch module info and settings to show rules
      const [moduleRes, settingsRes] = await Promise.all([
        apiRequest(`/api/assessments/modules/${moduleId}`),
        apiRequest(`/api/assessments/modules/${moduleId}/settings`)
      ])
      setRulesData({
        module: moduleRes.module,
        settings: settingsRes.settings
      })
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load module information')
    }
  }

  const handleStartTest = (moduleId) => {
    // Navigate to TestMode page
    navigate(`/test-mode/${moduleId}`, { replace: true })
  }

  // ----- Icons (inline SVG) -----
  const LockIcon = ({ className = 'w-4 h-4' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
  const ShieldIcon = ({ className = 'w-4 h-4' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
  const ClipboardIcon = ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
  const ChevronRightIcon = ({ className = 'w-4 h-4' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )

  // ----- Loading -----
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-700 border-t-indigo-600 rounded-full animate-spin" />
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    )
  }

  // ----- Error (no rulesData) -----
  if (error && !rulesData) {
    const is404 = typeof window !== 'undefined' && window.__lastAssessmentsStatus__ === 404
    return (
      <div className="max-w-md mx-auto py-8">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-center">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-3">
            <ShieldIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Unable to load</h2>
          <p className="text-red-600 dark:text-red-400 text-xs mb-3">{error}</p>
          {is404 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Assessment service may be unavailable.
            </p>
          )}
          <button
            onClick={() => { setError(null); setLoading(true); setTimeout(() => setLoading(false), 500) }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Tile accent colors (cycle per module)
  const TILE_COLORS = [
    { bg: 'bg-blue-500/10 dark:bg-blue-500/20', border: 'border-blue-200 dark:border-blue-800/50', icon: 'text-blue-600 dark:text-blue-400', label: 'text-blue-600 dark:text-blue-400' },
    { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', border: 'border-emerald-200 dark:border-emerald-800/50', icon: 'text-emerald-600 dark:text-emerald-400', label: 'text-emerald-600 dark:text-emerald-400' },
    { bg: 'bg-violet-500/10 dark:bg-violet-500/20', border: 'border-violet-200 dark:border-violet-800/50', icon: 'text-violet-600 dark:text-violet-400', label: 'text-violet-600 dark:text-violet-400' },
    { bg: 'bg-amber-500/10 dark:bg-amber-500/20', border: 'border-amber-200 dark:border-amber-800/50', icon: 'text-amber-600 dark:text-amber-400', label: 'text-amber-600 dark:text-amber-400' }
  ]

  // Default rules/terms if module doesn't have custom rules
  const defaultRules = [
    'You must complete the assessment independently without external assistance.',
    'Do not share your session, questions, or answers with anyone.',
    'The assessment is timed. Ensure you have a stable internet connection.',
    'Do not navigate away from the assessment page or open other tabs during the exam.',
    'All answers are final once submitted. Review your responses before submitting.',
    'Any attempt to cheat, copy, or share content will result in disqualification.',
    'Your session is monitored and recorded for security purposes.',
    'By proceeding, you agree to abide by all assessment rules and regulations.'
  ]

  // ----- Rules Acceptance Page -----
  if (rulesData) {
    const rules = rulesData.settings?.rules
      ? rulesData.settings.rules.split('\n').filter(Boolean)
      : defaultRules
    const duration = rulesData.settings?.durationMinutes || 60
    const totalQuestions = rulesData.settings?.totalQuestions || 20

    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <h1 className="text-sm font-semibold text-slate-900 dark:text-white">Rules & Regulations</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Please read and accept the terms to proceed</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-xs text-red-700 dark:text-red-300">
            {error}
            <button
              onClick={() => {
                setError(null)
                handleModuleClick(rulesData.module._id || rulesData.module.id)
              }}
              className="ml-2 underline"
            >
              Retry
            </button>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Module info header */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{rulesData.module?.name}</span>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>{duration} min</span>
                <span>•</span>
                <span>{totalQuestions} questions</span>
              </div>
            </div>
          </div>

          {/* Rules content */}
          <div className="p-5 max-h-[60vh] overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <ShieldIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-xs font-semibold text-slate-900 dark:text-white mb-2">Assessment Rules & Regulations</h2>
                  <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                    {rules.map((rule, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5">•</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Acceptance checkbox */}
          <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rulesAccepted}
                onChange={(e) => setRulesAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-indigo-600 border-slate-300 dark:border-slate-600 rounded focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-700 dark:text-slate-300">
                I have read and understood all the rules and regulations. I agree to comply with all terms and conditions stated above.
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
            <button
              onClick={() => {
                setRulesData(null)
                setRulesAccepted(false)
                setError(null)
              }}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={() => handleStartTest(rulesData.module._id || rulesData.module.id)}
              disabled={!rulesAccepted}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg"
            >
              Accept & Start Assessment
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
          <LockIcon className="w-3 h-3" />
          Your session is secure and monitored.
        </p>
      </div>
    )
  }

  // ----- Dashboard: Module list (content only; layout provides header + sidebar) -----
  return (
      <div className="max-w-3xl">
        <div className="mb-4">
          <h1 className="text-sm font-semibold text-slate-900 dark:text-white">Select an assessment</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Choose a module to start. Do not share your session.</p>
        </div>

        {modules.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
            <ClipboardIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-600 dark:text-slate-400">No assessments available</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Check back later or contact your administrator.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {modules.map((mod, i) => {
              const color = TILE_COLORS[i % TILE_COLORS.length]
              return (
                <button
                  key={mod._id || mod.id}
                  onClick={() => handleModuleClick(mod._id || mod.id)}
                  className={`group w-full text-left bg-white dark:bg-slate-900 rounded-xl border ${color.border} p-4 shadow-sm hover:shadow-md transition-all duration-200`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg ${color.bg} flex items-center justify-center flex-shrink-0`}>
                      <ClipboardIcon className={`w-4 h-4 ${color.icon}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-slate-900 dark:text-white text-sm block truncate">{mod.name}</span>
                      {mod.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{mod.description}</p>
                      )}
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                  </div>
                  <p className={`mt-2 text-xs font-medium ${color.label}`}>Start →</p>
                </button>
              )
            })}
          </div>
        )}

        <p className="mt-5 text-center text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
          <LockIcon className="w-3 h-3" />
          Authorized use only.
        </p>
      </div>
    )
}

export default Home
