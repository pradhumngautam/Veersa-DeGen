import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './ProfileSetup.css'

export default function ProfileSetup() {
  const [searchParams] = useSearchParams()
  const role = searchParams.get('role') || 'patient'
  const { user, userProfile, fetchUserProfile } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    age: '',
    ...(role === 'doctor' ? {
      experience_years: '',
      degree: '',
      specialization: '',
      bio: '',
      consultation_price: '',
      available_slots: [],
    } : {
      weight: '',
      height: '',
      blood_group: '',
      medical_history: '',
      allergies: [],
    }),
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [timeSlot, setTimeSlot] = useState('')

  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
    if (userProfile?.profile) {
      navigate('/dashboard')
    }
  }, [user, userProfile, navigate])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleArrayInput = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value.split(',').map((item) => item.trim()).filter(Boolean),
    }))
  }

  const addTimeSlot = () => {
    if (timeSlot && role === 'doctor') {
      setFormData((prev) => ({
        ...prev,
        available_slots: [...prev.available_slots, timeSlot],
      }))
      setTimeSlot('')
    }
  }

  const removeTimeSlot = (index) => {
    setFormData((prev) => ({
      ...prev,
      available_slots: prev.available_slots.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // Validate required fields
    if (!formData.first_name || !formData.last_name || !formData.age) {
      setError('Please fill in all required fields')
      return
    }

    if (role === 'doctor') {
      if (!formData.experience_years || !formData.degree || !formData.specialization || !formData.consultation_price) {
        setError('Please fill in all required fields')
        return
      }
      if (!formData.available_slots || formData.available_slots.length === 0) {
        setError('Please add at least one available time slot')
        return
      }
    }

    if (!user || !user.id) {
      setError('You must be logged in to create a profile')
      return
    }

    setLoading(true)

    try {
      const profileData = {
        user_id: user.id,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        age: parseInt(formData.age),
        ...(role === 'doctor' ? {
          experience_years: parseInt(formData.experience_years),
          consultation_price: parseFloat(formData.consultation_price),
          available_slots: formData.available_slots.length > 0 ? formData.available_slots : [],
          degree: typeof formData.degree === 'string' 
            ? formData.degree.split(',').map((d) => d.trim()).filter(Boolean)
            : formData.degree,
          specialization: typeof formData.specialization === 'string'
            ? formData.specialization.split(',').map((s) => s.trim()).filter(Boolean)
            : formData.specialization,
          bio: formData.bio || null,
        } : {
          weight: formData.weight ? parseFloat(formData.weight) : null,
          height: formData.height ? parseFloat(formData.height) : null,
          blood_group: formData.blood_group || null,
          medical_history: formData.medical_history || null,
          allergies: typeof formData.allergies === 'string'
            ? formData.allergies.split(',').map((a) => a.trim()).filter(Boolean)
            : (formData.allergies || []),
        }),
      }

      const tableName = role === 'doctor' ? 'doctor_profiles' : 'patient_profiles'
      
      console.log('Submitting profile data:', { tableName, profileData })
      
      const { data, error: insertError } = await supabase
        .from(tableName)
        .insert([profileData])
        .select()

      if (insertError) {
        console.error('Insert error:', insertError)
        throw insertError
      }

      console.log('Profile created successfully:', data)

      // Refresh user profile
      await fetchUserProfile(user.id)
      
      // Navigate to dashboard
      navigate('/dashboard')
    } catch (err) {
      console.error('Error creating profile:', err)
      setError(err.message || 'Failed to create profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="profile-setup-container">
      <div className="profile-setup-card">
        <h2>Complete Your {role === 'doctor' ? 'Doctor' : 'Patient'} Profile</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Last Name *</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Age *</label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              required
              min="1"
            />
          </div>

          {role === 'doctor' ? (
            <>
              <div className="form-group">
                <label>Years of Experience *</label>
                <input
                  type="number"
                  name="experience_years"
                  value={formData.experience_years}
                  onChange={handleInputChange}
                  required
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>Degrees (comma-separated) *</label>
                <input
                  type="text"
                  name="degree"
                  value={typeof formData.degree === 'string' ? formData.degree : formData.degree.join(', ')}
                  onChange={(e) => handleArrayInput('degree', e.target.value)}
                  placeholder="e.g., MBBS, MD, PhD"
                  required
                />
              </div>

              <div className="form-group">
                <label>Specialization (comma-separated) *</label>
                <input
                  type="text"
                  name="specialization"
                  value={typeof formData.specialization === 'string' ? formData.specialization : formData.specialization.join(', ')}
                  onChange={(e) => handleArrayInput('specialization', e.target.value)}
                  placeholder="e.g., Cardiology, General Medicine"
                  required
                />
              </div>

              <div className="form-group">
                <label>Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="form-group">
                <label>Consultation Price (USD) *</label>
                <input
                  type="number"
                  name="consultation_price"
                  value={formData.consultation_price}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>Available Time Slots *</label>
                <div className="time-slot-input">
                  <input
                    type="time"
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                  />
                  <button type="button" onClick={addTimeSlot} className="btn-secondary">
                    Add Slot
                  </button>
                </div>
                <div className="time-slots-list">
                  {formData.available_slots.map((slot, index) => (
                    <div key={index} className="time-slot-item">
                      <span>{slot}</span>
                      <button
                        type="button"
                        onClick={() => removeTimeSlot(index)}
                        className="btn-remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Weight (kg)</label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleInputChange}
                    min="0"
                    step="0.1"
                  />
                </div>
                <div className="form-group">
                  <label>Height (cm)</label>
                  <input
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleInputChange}
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Blood Group</label>
                <select
                  name="blood_group"
                  value={formData.blood_group}
                  onChange={handleInputChange}
                >
                  <option value="">Select</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div className="form-group">
                <label>Medical History</label>
                <textarea
                  name="medical_history"
                  value={formData.medical_history}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Any previous medical conditions..."
                />
              </div>

              <div className="form-group">
                <label>Allergies (comma-separated)</label>
                <input
                  type="text"
                  name="allergies"
                  value={typeof formData.allergies === 'string' ? formData.allergies : formData.allergies.join(', ')}
                  onChange={(e) => handleArrayInput('allergies', e.target.value)}
                  placeholder="e.g., Peanuts, Penicillin"
                />
              </div>
            </>
          )}

          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : 'Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}

