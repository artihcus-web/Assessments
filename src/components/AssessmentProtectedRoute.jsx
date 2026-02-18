import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'

export default function AssessmentProtectedRoute({ children }) {
  const location = useLocation()
  const session = sessionStorage.getItem('assessments_approved')
  let approved = false
  try {
    const parsed = JSON.parse(session || '{}')
    approved = !!parsed?.approved && !!parsed?.employeeId
  } catch {
    approved = false
  }

  if (!approved) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  return children
}
