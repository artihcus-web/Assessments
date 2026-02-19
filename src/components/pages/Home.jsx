import React, { useState, useEffect, useRef } from 'react'
import { apiRequest } from '../../utils/api'

const QUESTION_TYPES = {
  mcq: 'Multiple Choice',
  yes_no: 'Yes or No',
  fill_blanks: 'Fill in the Blanks',
  short_answer: 'Short Answer',
  long_answer: 'Long Answer'
}

function Home() {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [testData, setTestData] = useState(null)
  const [answers, setAnswers] = useState({})
  const [startedAt, setStartedAt] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const autoSubmitDone = useRef(false)

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

  const startTest = async (moduleId) => {
    setError(null)
    setResult(null)
    setAnswers({})
    autoSubmitDone.current = false
    try {
      const data = await apiRequest(`/api/assessments/modules/${moduleId}/test`)
      setTestData(data)
      setStartedAt(Date.now())
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load test')
    }
  }

  const setAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const submitTest = async () => {
    if (!testData?.module?._id) return
    setSubmitting(true)
    setError(null)
    try {
      const answerList = (testData.questions || []).map(q => ({
        questionId: q._id,
        value: answers[q._id] ?? ''
      }))
      const data = await apiRequest(`/api/assessments/modules/${testData.module._id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: answerList })
      })
      setResult(data)
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  const backToModules = () => {
    setTestData(null)
    setStartedAt(null)
    setAnswers({})
    setResult(null)
  }

  const durationMinutes = testData?.settings?.durationMinutes ?? 60
  const elapsedMs = startedAt ? Date.now() - startedAt : 0
  const remainingSeconds = Math.max(0, durationMinutes * 60 - Math.floor(elapsedMs / 1000))
  const timeUp = remainingSeconds === 0 && startedAt

  useEffect(() => {
    if (!testData || result || !startedAt || remainingSeconds > 0) return
    if (autoSubmitDone.current) return
    autoSubmitDone.current = true
    const answerList = (testData.questions || []).map(q => ({ questionId: q._id, value: answers[q._id] ?? '' }))
    apiRequest(`/api/assessments/modules/${testData.module._id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers: answerList })
    }).then(setResult).catch(() => setError('Auto-submit failed'))
  }, [remainingSeconds, startedAt, testData, result, answers])

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

  // ----- Error (no testData) -----
  if (error && !testData) {
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

  // ----- Dashboard: Module list (content only; layout provides header + sidebar) -----
  if (!testData) {
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
                  onClick={() => startTest(mod._id || mod.id)}
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

  // ----- Result: show score -----
  if (result && testData.settings?.showResults !== false) {
    return (
      <div className="max-w-sm mx-auto py-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500" />
          <div className="p-6 text-center">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Result</h2>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-slate-200 dark:border-slate-700 mb-3">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{result.score}%</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{result.correctCount} / {result.total} correct</p>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${result.passed ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
              {result.passed ? 'Passed' : 'Not passed'}
            </span>
            <button
              onClick={backToModules}
              className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ----- Result: submitted (no score shown) -----
  if (result && testData.settings?.showResults === false) {
    return (
      <div className="max-w-sm mx-auto py-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500" />
          <div className="p-6 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
              <ShieldIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Submitted</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Your responses have been recorded.</p>
            <button
              onClick={backToModules}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ----- Test in progress -----
  const questions = testData.questions || []
  const bySection = questions.reduce((acc, q) => {
    const s = q.section || 'Questions'
    if (!acc[s]) acc[s] = []
    acc[s].push(q)
    return acc
  }, {})

  return (
    <div className="pb-16">
      {/* Exam bar (compact) */}
      <div className="flex items-center justify-between gap-3 mb-4 py-2 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
        <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{testData.module?.name}</span>
        <div className={`flex-shrink-0 px-2.5 py-1 rounded font-mono text-sm font-semibold ${remainingSeconds < 300 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
          {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, '0')}
        </div>
      </div>

      {testData.settings?.rules && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 text-xs text-slate-700 dark:text-slate-300">
          <strong className="text-amber-800 dark:text-amber-200">Instructions:</strong> {testData.settings.rules}
        </div>
      )}
      {error && (
        <div className="mb-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); submitTest() }} className="space-y-5">
        {Object.entries(bySection).map(([sectionName, sectionQuestions]) => (
          <div key={sectionName} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{sectionName}</h2>
            </div>
            <div className="p-4 space-y-4">
              {sectionQuestions.map((q, idx) => (
                <div key={q._id} className="border-b border-slate-100 dark:border-slate-800 pb-4 last:border-0 last:pb-0">
                  <p className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1.5">{QUESTION_TYPES[q.type] || q.type}</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                    {idx + 1}. {q.text}
                  </p>
                  {q.type === 'mcq' || q.type === 'yes_no' ? (
                    <div className="space-y-1.5">
                      {(q.options || []).map(opt => (
                        <label key={opt.label || opt.text} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 dark:has-[:checked]:bg-indigo-900/20 transition-colors">
                          <input
                            type="radio"
                            name={q._id}
                            value={opt.label || opt.text}
                            checked={(answers[q._id] || '') === (opt.label || opt.text)}
                            onChange={() => setAnswer(q._id, opt.label || opt.text)}
                            className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300">{opt.text}</span>
                        </label>
                      ))}
                    </div>
                  ) : q.type === 'long_answer' ? (
                    <textarea
                      value={answers[q._id] || ''}
                      onChange={e => setAnswer(q._id, e.target.value)}
                      placeholder="Your answer..."
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  ) : (
                    <input
                      type="text"
                      value={answers[q._id] || ''}
                      onChange={e => setAnswer(q._id, e.target.value)}
                      placeholder="Your answer..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={backToModules}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || timeUp}
            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg"
          >
            {submitting ? 'Submitting...' : timeUp ? 'Time up' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default Home
