import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../../utils/api'

const QUESTION_TYPES = {
  mcq: 'Multiple Choice',
  yes_no: 'Yes or No',
  fill_blanks: 'Fill in the Blanks',
  short_answer: 'Short Answer',
  long_answer: 'Long Answer'
}

function TestMode() {
  const { moduleId } = useParams()
  const navigate = useNavigate()
  const [testData, setTestData] = useState(null)
  const [answers, setAnswers] = useState({})
  const [startedAt, setStartedAt] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cameraActive, setCameraActive] = useState(false)
  const [micActive, setMicActive] = useState(false)
  const [inactivityWarning, setInactivityWarning] = useState(false)
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const [examEnded, setExamEnded] = useState(false)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [showTabSwitchWarning, setShowTabSwitchWarning] = useState(false)
  
  const autoSubmitDone = useRef(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const inactivityTimerRef = useRef(null)
  const lastActivityRef = useRef(Date.now())
  const visibilityChangeRef = useRef(null)
  const testDataRef = useRef(null)
  const answersRef = useRef({})

  // Prevent back navigation and disable context menu
  useEffect(() => {
    // Push a new state to prevent back navigation
    window.history.pushState(null, '', window.location.href)
    
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href)
      setShowTabSwitchWarning(true)
    }

    // Disable right-click context menu
    const handleContextMenu = (e) => {
      e.preventDefault()
      return false
    }

    // Disable common keyboard shortcuts
    const handleKeyDownShortcuts = (e) => {
      // Disable F5 (refresh), Ctrl+R, Ctrl+Shift+R
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r') || (e.ctrlKey && e.shiftKey && e.key === 'R')) {
        e.preventDefault()
        setShowTabSwitchWarning(true)
        return false
      }
      // Disable Ctrl+W (close tab), Ctrl+T (new tab)
      if (e.ctrlKey && (e.key === 'w' || e.key === 't')) {
        e.preventDefault()
        setShowTabSwitchWarning(true)
        return false
      }
    }
    
    window.addEventListener('popstate', handlePopState)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDownShortcuts)
    
    return () => {
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDownShortcuts)
    }
  }, [])

  // Full-screen mode
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen()
        } else if (document.documentElement.webkitRequestFullscreen) {
          await document.documentElement.webkitRequestFullscreen()
        } else if (document.documentElement.msRequestFullscreen) {
          await document.documentElement.msRequestFullscreen()
        }
      } catch (err) {
        console.warn('Fullscreen not available:', err)
      }
    }
    
    if (testData && !result) {
      enterFullscreen()
    }
    
    return () => {
      // Exit fullscreen when component unmounts
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen().catch(() => {})
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen().catch(() => {})
      }
    }
  }, [testData, result])

  // Initialize camera and microphone
  useEffect(() => {
    if (!testData || result || examEnded) return

    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: true
        })
        
        streamRef.current = stream
        setCameraActive(true)
        setMicActive(true)
        
        // Set video source and ensure it plays
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(err => {
              console.error('Error playing video:', err)
            })
          }
        }
      } catch (err) {
        console.error('Error accessing media devices:', err)
        setError('Camera/microphone access is required for this exam. Please grant permissions and refresh.')
      }
    }

    initMedia()

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [testData, result, examEnded])

  // Update video element when stream changes
  useEffect(() => {
    if (videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(err => {
        console.error('Error playing video:', err)
      })
    }
  }, [cameraActive])

  // Inactivity detection (30 seconds)
  useEffect(() => {
    if (!testData || result || examEnded) return

    const updateActivity = () => {
      lastActivityRef.current = Date.now()
      setInactivityWarning(false)
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, updateActivity)
    })

    const checkInactivity = () => {
      const now = Date.now()
      const inactiveTime = now - lastActivityRef.current
      
      if (inactiveTime >= 30000) {
        setInactivityWarning(true)
      }
    }

    inactivityTimerRef.current = setInterval(checkInactivity, 1000)

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity)
      })
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current)
      }
    }
  }, [testData, result, examEnded])

  // Strict tab switching, ESC key, and tab close detection
  useEffect(() => {
    if (!testData || result || examEnded) return

    // Handle ESC key press
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !showTabSwitchWarning) {
        e.preventDefault()
        e.stopPropagation()
        setShowTabSwitchWarning(true)
      }
    }

    // Handle tab/window visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setShowTabSwitchWarning(true)
      }
    }

    // Handle tab close attempt
    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = 'You are trying to leave the exam. If you continue, your test will be automatically submitted and you cannot retake it.'
      return e.returnValue
    }

    // Handle window blur (focus loss)
    const handleBlur = () => {
      if (document.hasFocus() === false) {
        setShowTabSwitchWarning(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('blur', handleBlur)
    visibilityChangeRef.current = handleVisibilityChange

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (visibilityChangeRef.current) {
        document.removeEventListener('visibilitychange', visibilityChangeRef.current)
      }
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('blur', handleBlur)
    }
  }, [testData, result, examEnded, showTabSwitchWarning])

  // Handle tab switch warning confirmation
  const handleTabSwitchConfirm = () => {
    setShowTabSwitchWarning(false)
    endExamAutomatically('Your test has been automatically submitted due to tab switching or leaving the exam. You cannot retake this test.')
  }

  const handleTabSwitchCancel = () => {
    setShowTabSwitchWarning(false)
    // Focus back to the window and bring it to front
    window.focus()
    if (document.hasFocus()) {
      // User stayed on the page
      setTabSwitchCount(prev => prev + 1)
    }
  }

  // Load test data
  useEffect(() => {
    if (!moduleId) {
      setError('Module ID is required')
      setLoading(false)
      return
    }

    const loadTest = async () => {
      try {
        const data = await apiRequest(`/api/assessments/modules/${moduleId}/test`)
        setTestData(data)
        testDataRef.current = data
        setStartedAt(Date.now())
      } catch (e) {
        setError(e.response?.data?.message || e.message || 'Failed to load test')
      } finally {
        setLoading(false)
      }
    }

    loadTest()
  }, [moduleId])

  // Update refs when state changes
  useEffect(() => {
    testDataRef.current = testData
  }, [testData])

  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  // Define endExamAutomatically function that uses refs to avoid circular dependencies
  const endExamAutomatically = async (reason) => {
    if (examEnded || autoSubmitDone.current) return
    setExamEnded(true)
    autoSubmitDone.current = true
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }

    const currentTestData = testDataRef.current
    const currentAnswers = answersRef.current

    if (currentTestData?.module?._id && currentAnswers) {
      try {
        const answerList = (currentTestData.questions || []).map(q => ({
          questionId: q._id,
          value: currentAnswers[q._id] ?? ''
        }))
        await apiRequest(`/api/assessments/modules/${currentTestData.module._id}/submit`, {
          method: 'POST',
          body: JSON.stringify({ answers: answerList })
        })
      } catch (e) {
        console.error('Auto-submit failed:', e)
      }
    }

    alert(reason)
    navigate('/assessments-dashboard', { replace: true })
  }

  const setAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
    lastActivityRef.current = Date.now()
    setInactivityWarning(false)
  }

  const submitTest = async () => {
    if (!testData?.module?._id || examEnded) return
    setSubmitting(true)
    setExamEnded(true)
    setError(null)
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }

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

  // Dynamic timer - update every second
  useEffect(() => {
    if (!startedAt || result || examEnded) return

    const timerInterval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)

    return () => clearInterval(timerInterval)
  }, [startedAt, result, examEnded])

  const durationMinutes = testData?.settings?.durationMinutes ?? 60
  const elapsedMs = startedAt ? currentTime - startedAt : 0
  const remainingSeconds = Math.max(0, durationMinutes * 60 - Math.floor(elapsedMs / 1000))
  const timeUp = remainingSeconds === 0 && startedAt

  // Auto-submit on time up
  useEffect(() => {
    if (!testData || result || !startedAt || remainingSeconds > 0 || examEnded) return
    if (autoSubmitDone.current) return
    autoSubmitDone.current = true
    setExamEnded(true)
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }

    const currentTestData = testDataRef.current
    const currentAnswers = answersRef.current

    if (currentTestData?.module?._id) {
      const answerList = (currentTestData.questions || []).map(q => ({ questionId: q._id, value: currentAnswers[q._id] ?? '' }))
      apiRequest(`/api/assessments/modules/${currentTestData.module._id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: answerList })
      }).then(setResult).catch(() => setError('Auto-submit failed'))
    }
  }, [remainingSeconds, startedAt, testData, result, examEnded])

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-sm">Loading exam...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !testData) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Error</h2>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/assessments-dashboard', { replace: true })}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Result screen
  if (result && testData.settings?.showResults !== false) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden max-w-md w-full">
          <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
          <div className="p-6 text-center">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Assessment Complete</h2>
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-slate-200 dark:border-slate-700 mb-4">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">{result.score}%</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{result.correctCount} / {result.total} correct</p>
            <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-6 ${result.passed ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
              {result.passed ? 'Passed' : 'Not passed'}
            </span>
            <button
              onClick={() => navigate('/assessments-dashboard', { replace: true })}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Result: submitted (no score shown)
  if (result && testData.settings?.showResults === false) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden max-w-md w-full">
          <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
          <div className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Submitted</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Your responses have been recorded.</p>
            <button
              onClick={() => navigate('/assessments-dashboard', { replace: true })}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Exam in progress
  const questions = testData.questions || []
  const bySection = questions.reduce((acc, q) => {
    const s = q.section || 'Questions'
    if (!acc[s]) acc[s] = []
    acc[s].push(q)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 overflow-y-auto z-40">
      {/* Top bar - Timer and module name */}
      <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-semibold text-slate-900 dark:text-white">SECURE MODE</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">|</span>
            <span className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-xs">{testData.module?.name}</span>
          </div>
          <div className={`flex-shrink-0 px-3 py-1.5 rounded-lg font-mono text-base font-bold ${remainingSeconds < 300 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
            {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* Camera preview (below header, top-right) */}
      {cameraActive && (
        <div className="fixed top-[57px] right-4 z-50 w-32 h-24 bg-slate-900 rounded-lg border-2 border-indigo-500 overflow-hidden shadow-lg">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover bg-black"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${cameraActive ? 'bg-green-400' : 'bg-red-400'}`} />
              Camera
            </span>
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${micActive ? 'bg-green-400' : 'bg-red-400'}`} />
              Mic
            </span>
          </div>
        </div>
      )}

      {/* Tab switch warning modal */}
      {showTabSwitchWarning && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
          onClick={(e) => {
            // Prevent closing by clicking outside
            e.stopPropagation()
          }}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full border-2 border-red-500"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Warning: Tab Switch Detected</h2>
              </div>
              
              <div className="mb-6 space-y-3">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  You are trying to switch tabs, close the window, or press ESC during the exam.
                </p>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">Important Notice:</p>
                  <ul className="text-xs text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
                    <li>If you continue, your test will be <strong>automatically submitted</strong></li>
                    <li>You <strong>cannot retake</strong> this test</li>
                    <li>Your current progress will be saved</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleTabSwitchCancel}
                  className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Stay on Exam
                </button>
                <button
                  onClick={handleTabSwitchConfirm}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Continue & Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inactivity warning */}
      {inactivityWarning && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-amber-500 text-white px-6 py-3 rounded-lg shadow-xl animate-pulse">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-semibold">Warning: No activity detected. Please continue with the exam.</span>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {testData.settings?.rules && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 text-xs text-slate-700 dark:text-slate-300">
            <strong className="text-amber-800 dark:text-amber-200">Instructions:</strong> {testData.settings.rules}
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); submitTest() }} className="space-y-5">
          {Object.entries(bySection).map(([sectionName, sectionQuestions]) => (
            <div key={sectionName} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{sectionName}</h2>
              </div>
              <div className="p-4 space-y-4">
                {sectionQuestions.map((q, idx) => (
                  <div key={q._id} className="border-b border-slate-100 dark:border-slate-800 pb-4 last:border-0 last:pb-0">
                    <p className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1.5">
                      {QUESTION_TYPES[q.type] || q.type}
                    </p>
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
                        rows={4}
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

          <div className="flex gap-2 pt-2 pb-8">
            <button
              type="submit"
              disabled={submitting || timeUp || examEnded}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-md"
            >
              {submitting ? 'Submitting...' : timeUp ? 'Time Up' : examEnded ? 'Exam Ended' : 'Submit Assessment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TestMode
