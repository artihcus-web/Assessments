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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <p className="text-gray-600 dark:text-gray-400">Loading modules...</p>
      </div>
    )
  }

  if (error && !testData) {
    const is404 = typeof window !== 'undefined' && window.__lastAssessmentsStatus__ === 404
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 max-w-md">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          {is404 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              The assessment API is not available (404). Ensure the backend is deployed with assessment routes and that the server proxies <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">/api/assessments</code> to the Node app.
            </p>
          )}
          <button
            onClick={() => { setError(null); setLoading(true); setTimeout(() => setLoading(false), 500) }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!testData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Assessments</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Select a module to start the test.</p>
          {modules.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No modules available.</p>
          ) : (
            <div className="space-y-3">
              {modules.map(mod => (
                <button
                  key={mod._id || mod.id}
                  onClick={() => startTest(mod._id || mod.id)}
                  className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors"
                >
                  <span className="font-semibold text-gray-900 dark:text-white">{mod.name}</span>
                  {mod.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{mod.description}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (result && testData.settings?.showResults !== false) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Result</h2>
          <p className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">{result.score}%</p>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {result.correctCount} / {result.total} correct
          </p>
          <p className={result.passed ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}>
            {result.passed ? 'Passed' : 'Not passed'}
          </p>
          <button
            onClick={backToModules}
            className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to modules
          </button>
        </div>
      </div>
    )
  }

  if (result && testData.settings?.showResults === false) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-900 dark:text-white mb-4">Your responses have been submitted.</p>
          <button
            onClick={backToModules}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to modules
          </button>
        </div>
      </div>
    )
  }

  const questions = testData.questions || []
  const bySection = questions.reduce((acc, q) => {
    const s = q.section || 'Questions'
    if (!acc[s]) acc[s] = []
    acc[s].push(q)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 pb-24">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{testData.module?.name}</h1>
          <div className="text-right">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Time left</span>
            <p className={`text-lg font-mono ${remainingSeconds < 300 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
              {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, '0')}
            </p>
          </div>
        </div>
        {testData.settings?.rules && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-gray-700 dark:text-gray-300">
            {testData.settings.rules}
          </div>
        )}
        {error && (
          <p className="mb-4 text-red-600 dark:text-red-400 text-sm">{error}</p>
        )}
        <form onSubmit={(e) => { e.preventDefault(); submitTest() }} className="space-y-8">
          {Object.entries(bySection).map(([sectionName, sectionQuestions]) => (
            <div key={sectionName} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <h2 className="font-semibold text-gray-900 dark:text-white">{sectionName}</h2>
              </div>
              <div className="p-4 space-y-6">
                {sectionQuestions.map((q, idx) => (
                  <div key={q._id} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0">
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">{QUESTION_TYPES[q.type] || q.type}</p>
                    <p className="font-medium text-gray-900 dark:text-white mb-3">
                      {idx + 1}. {q.text}
                    </p>
                    {q.type === 'mcq' || q.type === 'yes_no' ? (
                      <div className="space-y-2">
                        {(q.options || []).map(opt => (
                          <label key={opt.label || opt.text} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={q._id}
                              value={opt.label || opt.text}
                              checked={(answers[q._id] || '') === (opt.label || opt.text)}
                              onChange={() => setAnswer(q._id, opt.label || opt.text)}
                              className="text-indigo-600"
                            />
                            <span className="text-gray-700 dark:text-gray-300">{opt.text}</span>
                          </label>
                        ))}
                      </div>
                    ) : q.type === 'long_answer' ? (
                      <textarea
                        value={answers[q._id] || ''}
                        onChange={e => setAnswer(q._id, e.target.value)}
                        placeholder="Your answer"
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                    ) : (
                      <input
                        type="text"
                        value={answers[q._id] || ''}
                        onChange={e => setAnswer(q._id, e.target.value)}
                        placeholder="Your answer"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={backToModules}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || timeUp}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : timeUp ? 'Time up' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Home
