// import { useState, useEffect, useCallback } from "react";
// import { useAuth } from "../contexts/AuthContext";
// import { useNavigate } from "react-router-dom";
// import { supabase } from "../lib/supabase";
// import PaymentPage from "./PaymentPage";
// import toast from "react-hot-toast";
// import "./Dashboard.css";

// export default function PatientDashboard() {
//   const { user, userProfile, signOut } = useAuth();
//   const navigate = useNavigate();
//   const [appointments, setAppointments] = useState([]);
//   const [doctors, setDoctors] = useState([]);
//   const [showBooking, setShowBooking] = useState(false);
//   const [showPayment, setShowPayment] = useState(false);
//   const [selectedAppointment, setSelectedAppointment] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [filter, setFilter] = useState("upcoming");

//   const [bookingData, setBookingData] = useState({
//     doctor_id: "",
//     appointment_date: "",
//     appointment_time: "",
//     specialty_needed: "",
//     patient_notes: "",
//   });

//   const fetchAppointments = useCallback(async () => {
//     if (!userProfile?.profile?.id) return;

//     try {
//       const { data, error } = await supabase
//         .from("appointments")
//         .select(
//           `
//           *,
//           doctor_profiles (
//             first_name,
//             last_name,
//             specialization,
//             consultation_price
//           )
//         `
//         )
//         .eq("patient_id", userProfile.profile.id)
//         .order("appointment_date", { ascending: true })
//         .order("appointment_time", { ascending: true });

//       if (error) throw error;
//       setAppointments(data || []);
//     } catch (error) {
//       console.error("Error fetching appointments:", error);
//     } finally {
//       setLoading(false);
//     }
//   }, [userProfile?.profile?.id]);

//   useEffect(() => {
//     if (!user || !userProfile) {
//       navigate("/login");
//       return;
//     }

//     if (userProfile.role !== "patient") {
//       navigate("/dashboard");
//       return;
//     }

//     if (!userProfile.profile) {
//       navigate("/profile-setup?role=patient");
//       return;
//     }

//     fetchAppointments();
//     fetchDoctors();
//   }, [user, userProfile, navigate, fetchAppointments]);

//   const fetchDoctors = async () => {
//     try {
//       const { data, error } = await supabase
//         .from("doctor_profiles")
//         .select("*")
//         .order("first_name");

//       if (error) throw error;
//       setDoctors(data || []);
//     } catch (error) {
//       console.error("Error fetching doctors:", error);
//     }
//   };

//   const fetchAvailableSlots = async (doctorId, date) => {
//     if (!doctorId || !date) return [];

//     try {
//       const { data, error } = await supabase.rpc("get_doctor_available_slots", {
//         p_doctor_id: doctorId,
//         p_appointment_date: date,
//       });

//       if (error) throw error;
//       return data || [];
//     } catch (error) {
//       console.error("Error fetching available slots:", error);
//       return [];
//     }
//   };

//   const handleBookingChange = async (field, value) => {
//     setBookingData((prev) => ({ ...prev, [field]: value }));

//     if (field === "doctor_id" || field === "appointment_date") {
//       const doctorId = field === "doctor_id" ? value : bookingData.doctor_id;
//       const date =
//         field === "appointment_date" ? value : bookingData.appointment_date;

//       if (doctorId && date) {
//         await fetchAvailableSlots(doctorId, date);
//         // Slots fetched but not displayed yet - can be used for dropdown in future
//       }
//     }
//   };

//   const handleBookAppointment = async (e) => {
//     e.preventDefault();
//     setLoading(true);

//     try {
//       // Check availability
//       const { data: available, error: checkError } = await supabase.rpc(
//         "check_appointment_availability",
//         {
//           p_doctor_id: bookingData.doctor_id,
//           p_appointment_date: bookingData.appointment_date,
//           p_appointment_time: bookingData.appointment_time,
//         }
//       );

//       if (checkError) throw checkError;
//       if (!available) {
//         toast.error(
//           "This time slot is no longer available. Please select another time."
//         );
//         setLoading(false);
//         return;
//       }

//       // Get doctor's consultation price
//       const selectedDoctor = doctors.find(
//         (d) => d.id === bookingData.doctor_id
//       );
//       const consultationPrice = selectedDoctor?.consultation_price || 0;

//       // Create appointment
//       const { error } = await supabase
//         .from("appointments")
//         .insert([
//           {
//             doctor_id: bookingData.doctor_id,
//             patient_id: userProfile.profile.id,
//             appointment_date: bookingData.appointment_date,
//             appointment_time: bookingData.appointment_time,
//             specialty_needed: bookingData.specialty_needed,
//             patient_notes: bookingData.patient_notes,
//             payment_amount: consultationPrice,
//             status: "pending",
//             payment_status: "pending",
//           },
//         ])
//         .select()
//         .single();

//       if (error) throw error;

//       toast.success(
//         "Appointment booked successfully! Please proceed to payment."
//       );
//       setShowBooking(false);
//       setBookingData({
//         doctor_id: "",
//         appointment_date: "",
//         appointment_time: "",
//         specialty_needed: "",
//         patient_notes: "",
//       });
//       fetchAppointments();

//       // TODO: Redirect to payment page or integrate Square payment here
//     } catch (error) {
//       console.error("Error booking appointment:", error);
//       toast.error("Failed to book appointment: " + error.message);
//     } finally {
//       setLoading(false);
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

//   if (loading && appointments.length === 0) {
//     return <div className="dashboard-container">Loading...</div>;
//   }

//   return (
//     <div className="dashboard-container">
//       <div className="dashboard-header">
//         <div>
//           <h1>Patient Dashboard</h1>
//           <p>
//             Welcome, {userProfile?.profile?.first_name}{" "}
//             {userProfile?.profile?.last_name}
//           </p>
//         </div>
//         <div className="header-actions">
//           <button onClick={() => setShowBooking(true)} className="btn-primary">
//             Book Appointment
//           </button>
//           <button
//             onClick={() => navigate("/profile-setup?role=patient")}
//             className="btn-secondary"
//           >
//             Edit Profile
//           </button>
//           <button onClick={signOut} className="btn-secondary">
//             Sign Out
//           </button>
//         </div>
//       </div>

//       {showBooking && (
//         <div className="booking-modal">
//           <div className="booking-card">
//             <h2>Book Appointment</h2>
//             <form onSubmit={handleBookAppointment}>
//               <div className="form-group">
//                 <label>Select Doctor *</label>
//                 <select
//                   value={bookingData.doctor_id}
//                   onChange={(e) =>
//                     handleBookingChange("doctor_id", e.target.value)
//                   }
//                   required
//                 >
//                   <option value="">Choose a doctor</option>
//                   {doctors.map((doctor) => (
//                     <option key={doctor.id} value={doctor.id}>
//                       Dr. {doctor.first_name} {doctor.last_name} -{" "}
//                       {doctor.specialization?.join(", ")} - $
//                       {doctor.consultation_price}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div className="form-group">
//                 <label>Specialty Needed</label>
//                 <input
//                   type="text"
//                   value={bookingData.specialty_needed}
//                   onChange={(e) =>
//                     handleBookingChange("specialty_needed", e.target.value)
//                   }
//                   placeholder="e.g., General Consultation"
//                 />
//               </div>

//               <div className="form-group">
//                 <label>Appointment Date *</label>
//                 <input
//                   type="date"
//                   value={bookingData.appointment_date}
//                   onChange={(e) =>
//                     handleBookingChange("appointment_date", e.target.value)
//                   }
//                   required
//                   min={new Date().toISOString().split("T")[0]}
//                 />
//               </div>

//               <div className="form-group">
//                 <label>Appointment Time *</label>
//                 <input
//                   type="time"
//                   value={bookingData.appointment_time}
//                   onChange={(e) =>
//                     handleBookingChange("appointment_time", e.target.value)
//                   }
//                   required
//                 />
//               </div>

//               <div className="form-group">
//                 <label>Notes</label>
//                 <textarea
//                   value={bookingData.patient_notes}
//                   onChange={(e) =>
//                     handleBookingChange("patient_notes", e.target.value)
//                   }
//                   rows="3"
//                   placeholder="Any additional information..."
//                 />
//               </div>

//               <div className="form-actions">
//                 <button
//                   type="submit"
//                   disabled={loading}
//                   className="btn-primary"
//                 >
//                   {loading ? "Booking..." : "Book Appointment"}
//                 </button>
//                 <button
//                   type="button"
//                   onClick={() => setShowBooking(false)}
//                   className="btn-secondary"
//                 >
//                   Cancel
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

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
//         <h2>My Appointments</h2>
//         {filteredAppointments.length === 0 ? (
//           <p className="no-data">No appointments found</p>
//         ) : (
//           filteredAppointments.map((appointment) => (
//             <div key={appointment.id} className="appointment-card">
//               <div className="appointment-info">
//                 <h3>
//                   Dr. {appointment.doctor_profiles?.first_name}{" "}
//                   {appointment.doctor_profiles?.last_name}
//                 </h3>
//                 <p>
//                   <strong>Specialization:</strong>{" "}
//                   {appointment.doctor_profiles?.specialization?.join(", ")}
//                 </p>
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
//                 <p>
//                   <strong>Amount:</strong> ${appointment.payment_amount}
//                 </p>
//                 {appointment.patient_notes && (
//                   <p>
//                     <strong>Notes:</strong> {appointment.patient_notes}
//                   </p>
//                 )}
//               </div>
//               <div className="appointment-actions">
//                 {appointment.payment_status === "pending" &&
//                   appointment.status === "pending" && (
//                     <button
//                       onClick={() => {
//                         setSelectedAppointment(appointment);
//                         setShowPayment(true);
//                       }}
//                       className="btn-primary"
//                     >
//                       Pay Now (${appointment.payment_amount})
//                     </button>
//                   )}
//                 {appointment.status === "confirmed" && (
//                   <button className="btn-success">Join Call</button>
//                 )}
//               </div>
//             </div>
//           ))
//         )}
//       </div>

//       {showPayment && selectedAppointment && (
//         <PaymentPage
//           appointmentId={selectedAppointment.id}
//           amount={selectedAppointment.payment_amount}
//           onSuccess={() => {
//             setShowPayment(false);
//             setSelectedAppointment(null);
//             fetchAppointments();
//           }}
//           onCancel={() => {
//             setShowPayment(false);
//             setSelectedAppointment(null);
//           }}
//         />
//       )}
//     </div>
//   );
// }

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import PaymentPage from "./PaymentPage";
import VideoCall from "./VideoCall";
import toast from "react-hot-toast";
import "./Dashboard.css";

export default function PatientDashboard() {
  const { user, userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [showBooking, setShowBooking] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("upcoming");
  const [activeCall, setActiveCall] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [bookingData, setBookingData] = useState({
    doctor_id: "",
    appointment_date: "",
    appointment_time: "",
    specialty_needed: "",
    patient_notes: "",
  });
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const fetchAppointments = useCallback(async () => {
    if (!userProfile?.profile?.id) return;

    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          *,
          doctor_profiles (
            first_name,
            last_name,
            specialization,
            consultation_price
          )
        `
        )
        .eq("patient_id", userProfile.profile.id)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.profile?.id]);

  useEffect(() => {
    if (!user || !userProfile) {
      navigate("/login");
      return;
    }

    if (userProfile.role !== "patient") {
      navigate("/dashboard");
      return;
    }

    if (!userProfile.profile) {
      navigate("/profile-setup?role=patient");
      return;
    }

    fetchAppointments();
    fetchDoctors();
  }, [user, userProfile, navigate, fetchAppointments]);

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from("doctor_profiles")
        .select("*")
        .order("first_name");

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error("Error fetching doctors:", error);
    }
  };

  const fetchAvailableSlots = async (doctorId, date) => {
    if (!doctorId || !date) {
      setAvailableTimeSlots([]);
      return;
    }

    setLoadingSlots(true);
    try {
      // Get doctor's profile with available slots
      const { data: doctorData, error: doctorError } = await supabase
        .from("doctor_profiles")
        .select("available_slots")
        .eq("id", doctorId)
        .single();

      if (doctorError) throw doctorError;

      // Get already booked appointments for this doctor on this date
      const { data: bookedAppointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select("appointment_time")
        .eq("doctor_id", doctorId)
        .eq("appointment_date", date)
        .in("status", ["pending", "confirmed"]);

      if (appointmentsError) throw appointmentsError;

      // Get booked time slots
      const bookedSlots = bookedAppointments?.map(apt => apt.appointment_time) || [];

      // Filter available slots - only show slots that doctor has defined and are not booked
      const doctorSlots = doctorData?.available_slots || [];
      const availableSlots = doctorSlots.filter(slot => !bookedSlots.includes(slot));

      setAvailableTimeSlots(availableSlots.sort());
      
      // Clear selected time if it's no longer available
      if (bookingData.appointment_time && !availableSlots.includes(bookingData.appointment_time)) {
        setBookingData((prev) => ({ ...prev, appointment_time: "" }));
      }
    } catch (error) {
      console.error("Error fetching available slots:", error);
      toast.error("Failed to load available slots");
      setAvailableTimeSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBookingChange = async (field, value) => {
    setBookingData((prev) => ({ ...prev, [field]: value }));

    if (field === "doctor_id" || field === "appointment_date") {
      const doctorId = field === "doctor_id" ? value : bookingData.doctor_id;
      const date =
        field === "appointment_date" ? value : bookingData.appointment_date;

      if (doctorId && date) {
        await fetchAvailableSlots(doctorId, date);
      } else {
        setAvailableTimeSlots([]);
      }
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: available, error: checkError } = await supabase.rpc(
        "check_appointment_availability",
        {
          p_doctor_id: bookingData.doctor_id,
          p_appointment_date: bookingData.appointment_date,
          p_appointment_time: bookingData.appointment_time,
        }
      );

      if (checkError) throw checkError;
      if (!available) {
        toast.error(
          "This time slot is no longer available. Please select another time."
        );
        setLoading(false);
        return;
      }

      const selectedDoctor = doctors.find(
        (d) => d.id === bookingData.doctor_id
      );
      const consultationPrice = selectedDoctor?.consultation_price || 0;

      const { error } = await supabase
        .from("appointments")
        .insert([
          {
            doctor_id: bookingData.doctor_id,
            patient_id: userProfile.profile.id,
            appointment_date: bookingData.appointment_date,
            appointment_time: bookingData.appointment_time,
            specialty_needed: bookingData.specialty_needed,
            patient_notes: bookingData.patient_notes,
            payment_amount: consultationPrice,
            status: "pending",
            payment_status: "pending",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast.success(
        "Appointment booked successfully! Please proceed to payment."
      );
      setShowBooking(false);
      setBookingData({
        doctor_id: "",
        appointment_date: "",
        appointment_time: "",
        specialty_needed: "",
        patient_notes: "",
      });
      setAvailableTimeSlots([]);
      fetchAppointments();
    } catch (error) {
      console.error("Error booking appointment:", error);
      toast.error("Failed to book appointment: " + error.message);
    } finally {
      setLoading(false);
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
    
    return now >= tenMinutesBefore && 
           now <= oneHourAfter && 
           appointment.status === 'confirmed' &&
           appointment.payment_status === 'paid';
  };

  const startVideoCall = (appointment) => {
    setActiveCall(appointment);
  };

  const filteredAppointments = appointments.filter((apt) => {
    const today = new Date();
    const aptDate = new Date(apt.appointment_date);
    const isPast =
      aptDate < today ||
      (aptDate.toDateString() === today.toDateString() &&
        apt.appointment_time < new Date().toTimeString().slice(0, 5));

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
        userRole="patient"
        onEnd={() => {
          setActiveCall(null);
          fetchAppointments();
        }}
      />
    );
  }

  if (loading && appointments.length === 0) {
    return (
      <div className="dashboard-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Patient Dashboard</h1>
          <p>
            Welcome, {userProfile?.profile?.first_name}{" "}
            {userProfile?.profile?.last_name}
          </p>
        </div>
        <div className="header-actions">
          <button onClick={() => setShowBooking(true)} className="btn-primary">
            Book Appointment
          </button>
          <button
            onClick={() => navigate("/profile-setup?role=patient")}
            className="btn-secondary"
          >
            Edit Profile
          </button>
          <button onClick={signOut} className="btn-secondary">
            Sign Out
          </button>
        </div>
      </div>

      {showBooking && (
        <div className="booking-modal" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowBooking(false);
            setAvailableTimeSlots([]);
            setSearchQuery("");
          }
        }}>
          <div className="booking-card">
            <h2>Book Appointment</h2>
            <button
              type="button"
              onClick={() => {
                setShowBooking(false);
                setAvailableTimeSlots([]);
                setSearchQuery("");
              }}
              className="close-modal-btn"
              aria-label="Close"
            >
              ×
            </button>
            <form onSubmit={handleBookAppointment}>
              <div className="form-group">
                <label>Select Doctor *</label>
                <div className="doctor-select-wrapper">
                  <input
                    type="text"
                    placeholder="Search doctors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="doctor-search-input"
                  />
                  <select
                    value={bookingData.doctor_id}
                    onChange={(e) =>
                      handleBookingChange("doctor_id", e.target.value)
                    }
                    required
                    className="doctor-select"
                  >
                    <option value="">Choose a doctor</option>
                    {doctors
                      .filter((doctor) => {
                        if (!searchQuery) return true;
                        const searchLower = searchQuery.toLowerCase();
                        const fullName = `${doctor.first_name} ${doctor.last_name}`.toLowerCase();
                        const specialization = doctor.specialization?.join(", ").toLowerCase() || "";
                        return fullName.includes(searchLower) || specialization.includes(searchLower);
                      })
                      .map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          Dr. {doctor.first_name} {doctor.last_name} -{" "}
                          {doctor.specialization?.join(", ")} - $
                          {doctor.consultation_price}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Specialty Needed</label>
                <input
                  type="text"
                  value={bookingData.specialty_needed}
                  onChange={(e) =>
                    handleBookingChange("specialty_needed", e.target.value)
                  }
                  placeholder="e.g., General Consultation"
                />
              </div>

              <div className="form-group">
                <label>Appointment Date *</label>
                <input
                  type="date"
                  value={bookingData.appointment_date}
                  onChange={(e) =>
                    handleBookingChange("appointment_date", e.target.value)
                  }
                  required
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="form-group">
                <label>Appointment Time *</label>
                {availableTimeSlots.length === 0 && bookingData.doctor_id && bookingData.appointment_date ? (
                  <div className="slots-message">
                    {loadingSlots ? (
                      <span className="loading-text">Loading available slots...</span>
                    ) : (
                      <span className="no-slots-text">
                        No available slots for this doctor on the selected date. Please choose another date.
                      </span>
                    )}
                  </div>
                ) : (
                  <select
                    value={bookingData.appointment_time}
                    onChange={(e) =>
                      handleBookingChange("appointment_time", e.target.value)
                    }
                    required
                    disabled={!bookingData.doctor_id || !bookingData.appointment_date || loadingSlots}
                    className="time-select"
                  >
                    <option value="">
                      {!bookingData.doctor_id || !bookingData.appointment_date
                        ? "Select doctor and date first"
                        : loadingSlots
                        ? "Loading slots..."
                        : "Choose a time slot"}
                    </option>
                    {availableTimeSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={bookingData.patient_notes}
                  onChange={(e) =>
                    handleBookingChange("patient_notes", e.target.value)
                  }
                  rows="3"
                  placeholder="Any additional information..."
                />
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? "Booking..." : "Book Appointment"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBooking(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
        <h2>My Appointments</h2>
        {filteredAppointments.length === 0 ? (
          <p className="no-data">No appointments found</p>
        ) : (
          filteredAppointments.map((appointment) => (
            <div key={appointment.id} className="appointment-card">
              <div className="appointment-info">
                <h3>
                  Dr. {appointment.doctor_profiles?.first_name}{" "}
                  {appointment.doctor_profiles?.last_name}
                </h3>
                <p>
                  <strong>Specialization:</strong>{" "}
                  {appointment.doctor_profiles?.specialization?.join(", ")}
                </p>
                <p>
                  <strong>Date:</strong>{" "}
                  {formatDate(appointment.appointment_date)}
                </p>
                <p>
                  <strong>Time:</strong> {appointment.appointment_time}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span className={`status-badge status-${appointment.status}`}>
                    {appointment.status}
                  </span>
                </p>
                <p>
                  <strong>Payment:</strong>{" "}
                  <span
                    className={`status-badge status-${appointment.payment_status}`}
                  >
                    {appointment.payment_status}
                  </span>
                </p>
                <p>
                  <strong>Amount:</strong> ${appointment.payment_amount}
                </p>
                {appointment.patient_notes && (
                  <p>
                    <strong>Notes:</strong> {appointment.patient_notes}
                  </p>
                )}
              </div>
              <div className="appointment-actions">
                {appointment.payment_status === "pending" &&
                  appointment.status === "pending" && (
                    <button
                      onClick={() => {
                        setSelectedAppointment(appointment);
                        setShowPayment(true);
                      }}
                      className="btn-primary"
                    >
                      Pay Now (${appointment.payment_amount})
                    </button>
                  )}
                {canJoinCall(appointment) && (
                  <button
                    onClick={() => startVideoCall(appointment)}
                    className="btn-success"
                    style={{ background: '#28a745' }}
                  >
                    📹 Join Video Call
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showPayment && selectedAppointment && (
        <PaymentPage
          appointmentId={selectedAppointment.id}
          amount={selectedAppointment.payment_amount}
          onSuccess={() => {
            setShowPayment(false);
            setSelectedAppointment(null);
            fetchAppointments();
          }}
          onCancel={() => {
            setShowPayment(false);
            setSelectedAppointment(null);
          }}
        />
      )}
    </div>
  );
}