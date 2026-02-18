import React from 'react'
import Home from '../pages/Home'
import Products from '../pages/Products'
import Contact from '../pages/Contact'
import Cart from '../pages/Cart'
import Login from '../pages/Login'
import { Routes, Route } from 'react-router-dom'
function Routers() {
  return (
    <div>
        <Routes>
            <Route path='/assessments-dashboard' element={<Home />} />
            <Route path='/products' element={<Products />} />
            <Route path='/contact' element={<Contact />} />
            <Route path='/cart' element={<Cart />} />
            <Route path='/' element={<Login />} />
        </Routes>
    </div>
  )
}

export default Routers
