import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import DoctorDashboard from './DoctorDashboard'
import PatientDashboard from './PatientDashboard'

export default function Dashboard() {
  const { userProfile, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !userProfile) {
      navigate('/login')
    } else if (!loading && userProfile && !userProfile.profile) {
      navigate(`/profile-setup?role=${userProfile.role}`)
    }
  }, [userProfile, loading, navigate])

  if (loading) {
    return <div className="dashboard-container">Loading...</div>
  }

  if (!userProfile) {
    return null
  }

  if (!userProfile.profile) {
    return null
  }

  return userProfile.role === 'doctor' ? <DoctorDashboard /> : <PatientDashboard />
}

