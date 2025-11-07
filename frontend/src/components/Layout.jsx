import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from './Sidebar'
import './Layout.css'

export default function Layout({ children, showEditProfile = false }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { userProfile } = useAuth()

  return (
    <div className="layout-container">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="layout-main">
        {/* Top Navigation Bar */}
        <header className="top-navbar">
          <div className="navbar-left">
            <button 
              className="menu-toggle-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle menu"
            >
              <span className="menu-icon">☰</span>
            </button>
            <div className="page-title">
              <h1>{getPageTitle(location.pathname)}</h1>
            </div>
          </div>
          
          <div className="navbar-right">
            <div className="navbar-actions">
              {showEditProfile && (
                <button
                  onClick={() => navigate(`/profile-setup?role=${userProfile?.role || 'patient'}`)}
                  className="navbar-edit-btn"
                  aria-label="Edit Profile"
                >
                  <span className="edit-icon">✏️</span>
                  <span className="edit-text">Edit Profile</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="layout-content">
          {children}
        </main>
      </div>
    </div>
  )
}

function getPageTitle(pathname) {
  const titles = {
    '/dashboard': 'Dashboard',
    '/patient-chat': 'AI Chat Assistant',
    '/medical-records': 'Medical Records',
  }
  return titles[pathname] || 'Dashboard'
}

