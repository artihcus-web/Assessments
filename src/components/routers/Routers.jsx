import React from 'react'
import Home from '../pages/Home'
import KnowledgeBase from '../pages/KnowledgeBase'
import TestMode from '../pages/TestMode'
import Reports from '../pages/Reports'
import Products from '../pages/Products'
import Contact from '../pages/Contact'
import Cart from '../pages/Cart'
import Login from '../pages/Login'
import AssessmentProtectedRoute from '../AssessmentProtectedRoute'
import AssessmentLayout from '../AssessmentLayout'
import { Routes, Route } from 'react-router-dom'
function Routers() {
  return (
    <div>
        <Routes>
            <Route path="/assessments-dashboard" element={
              <AssessmentProtectedRoute>
                <AssessmentLayout />
              </AssessmentProtectedRoute>
            }>
              <Route index element={<Home />} />
              <Route path="knowledge-base" element={<KnowledgeBase />} />
              <Route path="reports" element={<Reports />} />
            </Route>
            <Route path="/test-mode/:testId" element={
              <AssessmentProtectedRoute>
                <TestMode />
              </AssessmentProtectedRoute>
            } />
            <Route path='/products' element={<Products />} />
            <Route path='/contact' element={<Contact />} />
            <Route path='/cart' element={<Cart />} />
            <Route path='/' element={<Login />} />
        </Routes>
    </div>
  )
}

export default Routers
