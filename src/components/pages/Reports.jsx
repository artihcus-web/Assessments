import React, { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../utils/api'

const ClipboardIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
)

function Reports() {
  const [sessionInfo] = useState(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = sessionStorage.getItem('assessments_approved')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const employeeId = sessionInfo?.employeeId

  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedAttempt, setSelectedAttempt] = useState(null)
  const [selectedAttemptLoading, setSelectedAttemptLoading] = useState(false)

  const [moduleFilter, setModuleFilter] = useState('')
  const [testFilter, setTestFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    if (!employeeId) {
      setLoading(false)
      setError('Employee session not found. Please login again.')
      return
    }
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await apiRequest(`/api/assessments/reports/my-attempts?employeeId=${encodeURIComponent(employeeId)}`)
        if (!cancelled) setAttempts(data.attempts || [])
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || e.message || 'Failed to load reports')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [employeeId])

  const modules = useMemo(() => {
    const map = new Map()
    for (const a of attempts) {
      if (!a.moduleId) continue
      const key = String(a.moduleId)
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: a.moduleName || 'Module'
        })
      }
    }
    return Array.from(map.values())
  }, [attempts])

  const tests = useMemo(() => {
    const map = new Map()
    for (const a of attempts) {
      if (!a.testId) continue
      if (moduleFilter && String(a.moduleId) !== moduleFilter) continue
      const key = String(a.testId)
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: a.testName || 'Assessment'
        })
      }
    }
    return Array.from(map.values())
  }, [attempts, moduleFilter])

  const filteredAttempts = useMemo(() => {
    return attempts.filter(a => {
      if (moduleFilter && String(a.moduleId) !== moduleFilter) return false
      if (testFilter && String(a.testId) !== testFilter) return false
      if (fromDate) {
        const d = new Date(a.startedAt)
        if (d < new Date(fromDate)) return false
      }
      if (toDate) {
        const d = new Date(a.startedAt)
        const end = new Date(toDate)
        end.setHours(23, 59, 59, 999)
        if (d > end) return false
      }
      return true
    })
  }, [attempts, moduleFilter, testFilter, fromDate, toDate])

  const handleOpenAttempt = async (attemptId) => {
    setSelectedAttempt(null)
    setSelectedAttemptLoading(true)
    try {
      const data = await apiRequest(`/api/assessments/reports/attempts/${attemptId}`)
      setSelectedAttempt(data.attempt || null)
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load report details')
    } finally {
      setSelectedAttemptLoading(false)
    }
  }

  if (!employeeId) {
    return (
      <div className="max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <p className="text-sm text-red-600 dark:text-red-400">Employee session not found. Please log out and log in again to view reports.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <h1 className="text-sm font-semibold text-slate-900 dark:text-white">Test reports</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          View analytics for your completed assessments. Use filters to narrow down by module, assessment, and date.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="w-4 h-4 border-2 border-slate-200 dark:border-slate-700 border-t-indigo-600 rounded-full animate-spin" />
          Loading reports...
        </div>
      ) : error ? (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : attempts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
          <ClipboardIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400">No completed assessments yet.</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Your reports will appear here once you finish an assessment.</p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Module</label>
              <select
                value={moduleFilter}
                onChange={e => { setModuleFilter(e.target.value); setTestFilter('') }}
                className="px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200"
              >
                <option value="">All modules</option>
                {modules.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Assessment</label>
              <select
                value={testFilter}
                onChange={e => setTestFilter(e.target.value)}
                className="px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200"
              >
                <option value="">All assessments</option>
                {tests.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">From date</label>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">To date</label>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Attempts list */}
          <div className="mb-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                Attempts ({filteredAttempts.length})
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredAttempts.map(a => (
                <button
                  key={a._id || a.id}
                  type="button"
                  onClick={() => handleOpenAttempt(a._id || a.id)}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-slate-50 truncate">{a.testName}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {[a.departmentName, a.moduleName].filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {a.startedAt ? new Date(a.startedAt).toLocaleString() : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    <span className={`text-[11px] font-semibold ${a.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {a.scorePercent ?? 0}%
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {a.endReasonCode === 'user_submitted' ? 'Submitted' :
                       a.endReasonCode === 'time_up' ? 'Time up' :
                       a.endReasonCode === 'tab_switch' ? 'Tab switch' : 'Ended'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Attempt detail */}
          {selectedAttemptLoading && (
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Loading report details...</div>
          )}
          {selectedAttempt && !selectedAttemptLoading && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{selectedAttempt.testName}</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {[selectedAttempt.departmentName, selectedAttempt.moduleName].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 text-[11px] text-slate-600 dark:text-slate-300">
                <div><span className="font-semibold">Started:</span> {selectedAttempt.startedAt && new Date(selectedAttempt.startedAt).toLocaleString()}</div>
                <div><span className="font-semibold">Ended:</span> {selectedAttempt.endedAt && new Date(selectedAttempt.endedAt).toLocaleString()}</div>
                <div><span className="font-semibold">Duration:</span> {selectedAttempt.durationSeconds}s</div>
                <div><span className="font-semibold">End reason:</span> {selectedAttempt.endReasonText || selectedAttempt.endReasonCode}</div>
                <div><span className="font-semibold">Visited:</span> {selectedAttempt.questionsVisitedCount}</div>
                <div><span className="font-semibold">Answered:</span> {selectedAttempt.questionsAnsweredCount}</div>
                <div><span className="font-semibold">Correct:</span> {selectedAttempt.correctCount}</div>
                <div><span className="font-semibold">Score:</span> {selectedAttempt.scorePercent}%</div>
                <div><span className="font-semibold">Result:</span> {selectedAttempt.passed ? 'Passed' : 'Not passed'}</div>
              </div>
              {selectedAttempt.questions?.length ? (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-3">
                  <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-2">Question-wise breakdown</p>
                  <div className="max-h-64 overflow-auto text-[11px]">
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
                        <tr className="text-left text-[10px] text-slate-500 dark:text-slate-400">
                          <th className="px-2 py-1">#</th>
                          <th className="px-2 py-1">Section</th>
                          <th className="px-2 py-1">Question</th>
                          <th className="px-2 py-1">Visited</th>
                          <th className="px-2 py-1">Answered</th>
                          <th className="px-2 py-1">Correct</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedAttempt.questions.map((q, idx) => (
                          <tr key={idx} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="px-2 py-1 align-top text-slate-500 dark:text-slate-400">{idx + 1}</td>
                            <td className="px-2 py-1 align-top">{q.section || '-'}</td>
                            <td className="px-2 py-1 align-top max-w-xs">
                              <p className="line-clamp-2">{q.text}</p>
                            </td>
                            <td className="px-2 py-1 align-top">{q.visited ? 'Yes' : 'No'}</td>
                            <td className="px-2 py-1 align-top">{q.answered ? 'Yes' : 'No'}</td>
                            <td className="px-2 py-1 align-top">
                              <span className={q.isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                                {q.isCorrect ? 'Correct' : 'Wrong'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Reports

