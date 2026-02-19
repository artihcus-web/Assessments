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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-700 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading secure dashboard...</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">Please wait</p>
        </div>
      </div>
    )
  }

  // ----- Error (no testData) -----
  if (error && !testData) {
    const is404 = typeof window !== 'undefined' && window.__lastAssessmentsStatus__ === 404
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <ShieldIcon className="w-7 h-7 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Unable to load dashboard</h2>
          <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>
          {is404 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              The assessment service may be unavailable. Contact your administrator.
            </p>
          )}
          <button
            onClick={() => { setError(null); setLoading(true); setTimeout(() => setLoading(false), 500) }}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // ----- Dashboard: Module list -----
  if (!testData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <ClipboardIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white">Assessment Portal</h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Secure exam dashboard</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50">
                <LockIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Secure session</span>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Select an assessment</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Choose a module to start your exam. Do not share your session.</p>
          </div>

          {modules.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
              <ClipboardIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400 font-medium">No assessments available</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Check back later or contact your administrator.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {modules.map(mod => (
                <button
                  key={mod._id || mod.id}
                  onClick={() => startTest(mod._id || mod.id)}
                  className="group w-full text-left bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{mod.name}</span>
                        <ChevronRightIcon className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 flex-shrink-0" />
                      </div>
                      {mod.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{mod.description}</p>
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors">
                      <ClipboardIcon className="w-5 h-5 text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-medium text-indigo-600 dark:text-indigo-400">Start assessment →</p>
                </button>
              ))}
            </div>
          )}

          <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5">
            <LockIcon className="w-3.5 h-3.5" />
            Authorized use only. Do not share your access.
          </p>
        </main>
      </div>
    )
  }

  // ----- Result: show score -----
  if (result && testData.settings?.showResults !== false) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
          <div className="p-8 text-center">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Assessment result</h2>
            <div className="inline-flex flex-col items-center justify-center w-28 h-28 rounded-full border-4 border-slate-200 dark:border-slate-700 mb-4">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">{result.score}%</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-2">{result.correctCount} / {result.total} correct</p>
            <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold ${result.passed ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
              {result.passed ? 'Passed' : 'Not passed'}
            </span>
            <button
              onClick={backToModules}
              className="mt-8 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <ShieldIcon className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Submitted</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Your responses have been recorded.</p>
            <button
              onClick={backToModules}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      {/* Sticky exam header */}
      <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                <ClipboardIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="font-semibold text-slate-900 dark:text-white truncate">{testData.module?.name}</span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs font-medium">In progress</span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className={`text-right px-3 py-1.5 rounded-lg font-mono text-lg font-bold ${remainingSeconds < 300 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, '0')}
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800">
                <LockIcon className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Secured</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {testData.settings?.rules && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 text-sm text-slate-700 dark:text-slate-300">
            <strong className="text-amber-800 dark:text-amber-200">Instructions:</strong> {testData.settings.rules}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); submitTest() }} className="space-y-8">
          {Object.entries(bySection).map(([sectionName, sectionQuestions]) => (
            <div key={sectionName} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <h2 className="font-semibold text-slate-900 dark:text-white">{sectionName}</h2>
              </div>
              <div className="p-5 space-y-6">
                {sectionQuestions.map((q, idx) => (
                  <div key={q._id} className="border-b border-slate-100 dark:border-slate-800 pb-6 last:border-0 last:pb-0">
                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-2">{QUESTION_TYPES[q.type] || q.type}</p>
                    <p className="font-medium text-slate-900 dark:text-white mb-3">
                      {idx + 1}. {q.text}
                    </p>
                    {q.type === 'mcq' || q.type === 'yes_no' ? (
                      <div className="space-y-2">
                        {(q.options || []).map(opt => (
                          <label key={opt.label || opt.text} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 dark:has-[:checked]:bg-indigo-900/20 transition-colors">
                            <input
                              type="radio"
                              name={q._id}
                              value={opt.label || opt.text}
                              checked={(answers[q._id] || '') === (opt.label || opt.text)}
                              onChange={() => setAnswer(q._id, opt.label || opt.text)}
                              className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-slate-700 dark:text-slate-300">{opt.text}</span>
                          </label>
                        ))}
                      </div>
                    ) : q.type === 'long_answer' ? (
                      <textarea
                        value={answers[q._id] || ''}
                        onChange={e => setAnswer(q._id, e.target.value)}
                        placeholder="Type your answer here..."
                        rows={4}
                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={answers[q._id] || ''}
                        onChange={e => setAnswer(q._id, e.target.value)}
                        placeholder="Type your answer here..."
                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={backToModules}
              className="px-5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || timeUp}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-colors"
            >
              {submitting ? 'Submitting...' : timeUp ? 'Time up' : 'Submit assessment'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

export default Home
