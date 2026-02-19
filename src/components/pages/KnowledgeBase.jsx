import React from 'react'

const BookIcon = ({ className = 'w-8 h-8' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
)

export default function KnowledgeBase() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Knowledge Base</h1>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Reference materials and guides for your assessments.</p>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
        <BookIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-600 dark:text-slate-400">Content will be available here.</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Check back later or contact your administrator.</p>
      </div>
    </div>
  )
}
