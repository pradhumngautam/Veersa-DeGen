// import { useState, useEffect } from "react";
// import { useAuth } from "../contexts/AuthContext";
// import { useNavigate } from "react-router-dom";
// import { supabase } from "../lib/supabase";
// import toast from "react-hot-toast";
// import "./Dashboard.css";

// export default function DoctorDashboard() {
//   const { user, userProfile, signOut } = useAuth();
//   const navigate = useNavigate();
//   const [appointments, setAppointments] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [filter, setFilter] = useState("upcoming"); // upcoming, past, all

//   useEffect(() => {
//     if (!user || !userProfile) {
//       navigate("/login");
//       return;
//     }

//     if (userProfile.role !== "doctor") {
//       navigate("/dashboard");
//       return;
//     }

//     if (!userProfile.profile) {
//       navigate("/profile-setup?role=doctor");
//       return;
//     }

//     fetchAppointments();
//   }, [user, userProfile, navigate]);

//   const fetchAppointments = async () => {
//     try {
//       const { data, error } = await supabase
//         .from("appointments")
//         .select(
//           `
//           *,
//           patient_profiles (
//             first_name,
//             last_name,
//             age
//           )
//         `
//         )
//         .eq("doctor_id", userProfile.profile.id)
//         .order("appointment_date", { ascending: true })
//         .order("appointment_time", { ascending: true });

//       if (error) throw error;
//       setAppointments(data || []);
//     } catch (error) {
//       console.error("Error fetching appointments:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const updateAppointmentStatus = async (appointmentId, newStatus) => {
//     try {
//       const { error } = await supabase
//         .from("appointments")
//         .update({ status: newStatus })
//         .eq("id", appointmentId);

//       if (error) throw error;
//       toast.success(`Appointment ${newStatus} successfully!`);
//       fetchAppointments();
//     } catch (error) {
//       console.error("Error updating appointment:", error);
//       toast.error("Failed to update appointment status");
//     }
//   };

//   const filteredAppointments = appointments.filter((apt) => {
//     const today = new Date();
//     const aptDate = new Date(apt.appointment_date);
//     const isPast =
//       aptDate < today ||
//       (aptDate.toDateString() === today.toDateString() &&
//         apt.appointment_time < new Date().toTimeString().slice(0, 5));

//     if (filter === "upcoming")
//       return (
//         !isPast && apt.status !== "completed" && apt.status !== "cancelled"
//       );
//     if (filter === "past") return isPast || apt.status === "completed";
//     return true;
//   });

//   const formatDate = (dateString) => {
//     return new Date(dateString).toLocaleDateString("en-US", {
//       weekday: "long",
//       year: "numeric",
//       month: "long",
//       day: "numeric",
//     });
//   };

//   if (loading) {
//     return <div className="dashboard-container">Loading...</div>;
//   }

//   return (
//     <div className="dashboard-container">
//       <div className="dashboard-header">
//         <div>
//           <h1>Doctor Dashboard</h1>
//           <p>
//             Welcome, Dr. {userProfile?.profile?.first_name}{" "}
//             {userProfile?.profile?.last_name}
//           </p>
//         </div>
//         <div className="header-actions">
//           <button
//             onClick={() => navigate("/profile-setup?role=doctor")}
//             className="btn-secondary"
//           >
//             Edit Profile
//           </button>
//           <button onClick={signOut} className="btn-secondary">
//             Sign Out
//           </button>
//         </div>
//       </div>

//       <div className="dashboard-stats">
//         <div className="stat-card">
//           <h3>Upcoming Appointments</h3>
//           <p className="stat-number">
//             {
//               appointments.filter((apt) => {
//                 const today = new Date();
//                 const aptDate = new Date(apt.appointment_date);
//                 return (
//                   !(aptDate < today) &&
//                   apt.status !== "completed" &&
//                   apt.status !== "cancelled"
//                 );
//               }).length
//             }
//           </p>
//         </div>
//         <div className="stat-card">
//           <h3>Total Appointments</h3>
//           <p className="stat-number">{appointments.length}</p>
//         </div>
//         <div className="stat-card">
//           <h3>Consultation Price</h3>
//           <p className="stat-number">
//             ${userProfile?.profile?.consultation_price}
//           </p>
//         </div>
//       </div>

//       <div className="dashboard-filters">
//         <button
//           className={filter === "upcoming" ? "filter-active" : ""}
//           onClick={() => setFilter("upcoming")}
//         >
//           Upcoming
//         </button>
//         <button
//           className={filter === "past" ? "filter-active" : ""}
//           onClick={() => setFilter("past")}
//         >
//           Past
//         </button>
//         <button
//           className={filter === "all" ? "filter-active" : ""}
//           onClick={() => setFilter("all")}
//         >
//           All
//         </button>
//       </div>

//       <div className="appointments-list">
//         <h2>Appointments</h2>
//         {filteredAppointments.length === 0 ? (
//           <p className="no-data">No appointments found</p>
//         ) : (
//           filteredAppointments.map((appointment) => (
//             <div key={appointment.id} className="appointment-card">
//               <div className="appointment-info">
//                 <h3>
//                   {appointment.patient_profiles?.first_name}{" "}
//                   {appointment.patient_profiles?.last_name}
//                 </h3>
//                 <p>
//                   <strong>Date:</strong>{" "}
//                   {formatDate(appointment.appointment_date)}
//                 </p>
//                 <p>
//                   <strong>Time:</strong> {appointment.appointment_time}
//                 </p>
//                 <p>
//                   <strong>Status:</strong>{" "}
//                   <span className={`status-badge status-${appointment.status}`}>
//                     {appointment.status}
//                   </span>
//                 </p>
//                 <p>
//                   <strong>Payment:</strong>{" "}
//                   <span
//                     className={`status-badge status-${appointment.payment_status}`}
//                   >
//                     {appointment.payment_status}
//                   </span>
//                 </p>
//                 {appointment.patient_notes && (
//                   <p>
//                     <strong>Notes:</strong> {appointment.patient_notes}
//                   </p>
//                 )}
//               </div>
//               <div className="appointment-actions">
//                 {appointment.status === "pending" && (
//                   <>
//                     <button
//                       onClick={() =>
//                         updateAppointmentStatus(appointment.id, "confirmed")
//                       }
//                       className="btn-success"
//                     >
//                       Confirm
//                     </button>
//                     <button
//                       onClick={() =>
//                         updateAppointmentStatus(appointment.id, "cancelled")
//                       }
//                       className="btn-danger"
//                     >
//                       Cancel
//                     </button>
//                   </>
//                 )}
//                 {appointment.status === "confirmed" && (
//                   <button
//                     onClick={() =>
//                       updateAppointmentStatus(appointment.id, "completed")
//                     }
//                     className="btn-primary"
//                   >
//                     Mark Complete
//                   </button>
//                 )}
//               </div>
//             </div>
//           ))
//         )}
//       </div>
//     </div>
//   );
// }

import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import VideoCall from "./VideoCall";
import Layout from "../components/Layout";
import toast from "react-hot-toast";
import "./Dashboard.css";

export default function DoctorDashboard() {
  const { user, userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("upcoming");
  const [activeCall, setActiveCall] = useState(null);
  const [expandedAppointments, setExpandedAppointments] = useState(new Set());
  const [timeUntilAppointment, setTimeUntilAppointment] = useState({});

  // Calculate time until appointment for each appointment
  useEffect(() => {
    const calculateTimeUntil = () => {
      const times = {};
      appointments.forEach((apt) => {
        const now = new Date();
        const aptDate = new Date(apt.appointment_date);
        const [hours, minutes] = apt.appointment_time.split(':');
        const appointmentDateTime = new Date(aptDate);
        appointmentDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        
        // Calculate when call becomes available (10 minutes before appointment)
        const callAvailableTime = new Date(appointmentDateTime.getTime() - 10 * 60000);
        
        if (apt.status === 'confirmed' && appointmentDateTime > now) {
          // If call is not yet available, show countdown to when call becomes available
          if (now < callAvailableTime) {
            const diff = callAvailableTime - now;
            const hoursUntil = Math.floor(diff / (1000 * 60 * 60));
            const minutesUntil = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secondsUntil = Math.floor((diff % (1000 * 60)) / 1000);
            
            if (hoursUntil > 0) {
              times[apt.id] = `${hoursUntil}h ${minutesUntil}m`;
            } else if (minutesUntil > 0) {
              times[apt.id] = `${minutesUntil}m ${secondsUntil}s`;
            } else {
              times[apt.id] = `${secondsUntil}s`;
            }
          }
          // If call is available (within call window), don't show countdown
        }
      });
      setTimeUntilAppointment(times);
    };

    calculateTimeUntil();
    const interval = setInterval(calculateTimeUntil, 1000);
    return () => clearInterval(interval);
  }, [appointments]);

  useEffect(() => {
    if (!user || !userProfile) {
      navigate("/login");
      return;
    }

    if (userProfile.role !== "doctor") {
      navigate("/dashboard");
      return;
    }

    if (!userProfile.profile) {
      navigate("/profile-setup?role=doctor");
      return;
    }

    fetchAppointments();
  }, [user, userProfile, navigate]);

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          *,
          patient_profiles (
            first_name,
            last_name,
            age
          )
        `
        )
        .eq("doctor_id", userProfile.profile.id)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", appointmentId);

      if (error) throw error;
      toast.success(`Appointment ${newStatus} successfully!`);
      fetchAppointments();
    } catch (error) {
      console.error("Error updating appointment:", error);
      toast.error("Failed to update appointment status");
    }
  };

  const canJoinCall = (appointment) => {
    const now = new Date();
    const appointmentDate = new Date(appointment.appointment_date);
    const [hours, minutes] = appointment.appointment_time.split(':');
    appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0);
    
    // Allow joining 10 minutes before and up to 1 hour after scheduled time
    const tenMinutesBefore = new Date(appointmentDate.getTime() - 10 * 60000);
    const oneHourAfter = new Date(appointmentDate.getTime() + 60 * 60000);
    
    // For doctors, allow joining if appointment is confirmed (payment status doesn't block doctor)
    return now >= tenMinutesBefore && 
           now <= oneHourAfter && 
           appointment.status === 'confirmed';
  };

  const startVideoCall = (appointment) => {
    setActiveCall(appointment);
  };

  const toggleAppointmentDetails = (appointmentId) => {
    setExpandedAppointments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(appointmentId)) {
        newSet.delete(appointmentId);
      } else {
        newSet.add(appointmentId);
      }
      return newSet;
    });
  };

  const filteredAppointments = appointments.filter((apt) => {
    const now = new Date();
    const aptDate = new Date(apt.appointment_date);
    
    // Create a proper date-time object for the appointment
    const [hours, minutes] = apt.appointment_time.split(':');
    const appointmentDateTime = new Date(aptDate);
    appointmentDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    
    // Check if appointment is in the past
    const isPast = appointmentDateTime < now;

    if (filter === "upcoming")
      return (
        !isPast && apt.status !== "completed" && apt.status !== "cancelled"
      );
    if (filter === "past") return isPast || apt.status === "completed";
    return true;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (activeCall) {
    return (
      <VideoCall
        appointmentId={activeCall.id}
        userRole="doctor"
        onEnd={() => {
          setActiveCall(null);
          fetchAppointments();
        }}
      />
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="dashboard-wrapper">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading your dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showEditProfile={true}>
      <div className="dashboard-wrapper">
        <div className="dashboard-header">
          <div className="welcome-section">
            <h1>Welcome back, Dr. {userProfile?.profile?.first_name}!</h1>
            <p>
              Manage your appointments and patients
            </p>
          </div>
        </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Upcoming Appointments</h3>
          <p className="stat-number">
            {
              appointments.filter((apt) => {
                const today = new Date();
                const aptDate = new Date(apt.appointment_date);
                return (
                  !(aptDate < today) &&
                  apt.status !== "completed" &&
                  apt.status !== "cancelled"
                );
              }).length
            }
          </p>
        </div>
        <div className="stat-card">
          <h3>Total Appointments</h3>
          <p className="stat-number">{appointments.length}</p>
        </div>
        <div className="stat-card">
          <h3>Consultation Price</h3>
          <p className="stat-number">
            ${userProfile?.profile?.consultation_price}
          </p>
        </div>
      </div>

      <div className="dashboard-filters">
        <button
          className={filter === "upcoming" ? "filter-active" : ""}
          onClick={() => setFilter("upcoming")}
        >
          Upcoming
        </button>
        <button
          className={filter === "past" ? "filter-active" : ""}
          onClick={() => setFilter("past")}
        >
          Past
        </button>
        <button
          className={filter === "all" ? "filter-active" : ""}
          onClick={() => setFilter("all")}
        >
          All
        </button>
      </div>

      <div className="appointments-list">
        <h2>Appointments</h2>
        {filteredAppointments.length === 0 ? (
          <p className="no-data">No appointments found</p>
        ) : (
          filteredAppointments.map((appointment) => {
            const isExpanded = expandedAppointments.has(appointment.id);
            return (
              <div key={appointment.id} className={`appointment-card ${isExpanded ? 'expanded' : ''}`}>
                <div className="appointment-card-header">
                  <div className="appointment-main-info">
                    <div className="patient-info">
                      <h3>
                        {appointment.patient_profiles?.first_name}{" "}
                        {appointment.patient_profiles?.last_name}
                      </h3>
                      {appointment.patient_profiles?.age && (
                        <p className="patient-age">Age: {appointment.patient_profiles.age}</p>
                      )}
                    </div>
                    <div className="appointment-meta">
                      <div className="meta-item">
                        <span className="meta-label">Date</span>
                        <span className="meta-value">
                          {new Date(appointment.appointment_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Time</span>
                        <span className="meta-value">{appointment.appointment_time}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Status</span>
                        <span className={`status-badge status-${appointment.status}`}>
                          {appointment.status}
                        </span>
                      </div>
                      {appointment.status === 'confirmed' && timeUntilAppointment[appointment.id] && (
                        <div className="meta-item">
                          <span className="meta-label">Call Available In</span>
                          <span className="meta-value countdown">{timeUntilAppointment[appointment.id]}</span>
                        </div>
                      )}
                      {appointment.status === 'confirmed' && canJoinCall(appointment) && (
                        <div className="meta-item">
                          <span className="meta-label">Call Status</span>
                          <span className="meta-value call-ready">Ready Now</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="appointment-header-actions">
                    <button
                      onClick={() => toggleAppointmentDetails(appointment.id)}
                      className="btn-view-details"
                    >
                      {isExpanded ? (
                        <>
                          <span>Hide Details</span>
                          <span className="icon">▲</span>
                        </>
                      ) : (
                        <>
                          <span>View Details</span>
                          <span className="icon">▼</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="appointment-details">
                    <div className="details-grid">
                      <div className="detail-item">
                        <span className="detail-label">Full Date</span>
                        <span className="detail-value">
                          {formatDate(appointment.appointment_date)}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Payment Status</span>
                        <span className={`status-badge status-${appointment.payment_status}`}>
                          {appointment.payment_status}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Amount</span>
                        <span className="detail-value">${appointment.payment_amount}</span>
                      </div>
                      {appointment.patient_notes && (
                        <div className="detail-item full-width">
                          <span className="detail-label">Patient Notes</span>
                          <span className="detail-value">{appointment.patient_notes}</span>
                        </div>
                      )}
                    </div>
                    <div className="appointment-actions">
                      {appointment.status === "pending" && (
                        <>
                          <button
                            onClick={() =>
                              updateAppointmentStatus(appointment.id, "confirmed")
                            }
                            className="btn-confirm"
                          >
                            ✓ Confirm Appointment
                          </button>
                          <button
                            onClick={() =>
                              updateAppointmentStatus(appointment.id, "cancelled")
                            }
                            className="btn-cancel-appointment"
                          >
                            ✕ Cancel Appointment
                          </button>
                        </>
                      )}
                      {canJoinCall(appointment) && (
                        <button
                          onClick={() => startVideoCall(appointment)}
                          className="btn-join-call"
                        >
                          📹 Join Video Call
                        </button>
                      )}
                      {appointment.status === "confirmed" && !canJoinCall(appointment) && (
                        <button
                          onClick={() =>
                            updateAppointmentStatus(appointment.id, "cancelled")
                          }
                          className="btn-cancel-appointment"
                        >
                          ✕ Cancel Appointment
                        </button>
                      )}
                      {appointment.status === "confirmed" && canJoinCall(appointment) && (
                        <div className="appointment-ready-badge">
                          <span className="ready-icon">⏰</span>
                          <span>Call available now</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      </div>
    </Layout>
  );
}