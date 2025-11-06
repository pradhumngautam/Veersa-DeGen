import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import PaymentPage from "./PaymentPage";
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

  const [bookingData, setBookingData] = useState({
    doctor_id: "",
    appointment_date: "",
    appointment_time: "",
    specialty_needed: "",
    patient_notes: "",
  });

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
    if (!doctorId || !date) return [];

    try {
      const { data, error } = await supabase.rpc("get_doctor_available_slots", {
        p_doctor_id: doctorId,
        p_appointment_date: date,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching available slots:", error);
      return [];
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
        // Slots fetched but not displayed yet - can be used for dropdown in future
      }
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check availability
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

      // Get doctor's consultation price
      const selectedDoctor = doctors.find(
        (d) => d.id === bookingData.doctor_id
      );
      const consultationPrice = selectedDoctor?.consultation_price || 0;

      // Create appointment
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
      fetchAppointments();

      // TODO: Redirect to payment page or integrate Square payment here
    } catch (error) {
      console.error("Error booking appointment:", error);
      toast.error("Failed to book appointment: " + error.message);
    } finally {
      setLoading(false);
    }
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

  if (loading && appointments.length === 0) {
    return <div className="dashboard-container">Loading...</div>;
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
        <div className="booking-modal">
          <div className="booking-card">
            <h2>Book Appointment</h2>
            <form onSubmit={handleBookAppointment}>
              <div className="form-group">
                <label>Select Doctor *</label>
                <select
                  value={bookingData.doctor_id}
                  onChange={(e) =>
                    handleBookingChange("doctor_id", e.target.value)
                  }
                  required
                >
                  <option value="">Choose a doctor</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      Dr. {doctor.first_name} {doctor.last_name} -{" "}
                      {doctor.specialization?.join(", ")} - $
                      {doctor.consultation_price}
                    </option>
                  ))}
                </select>
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
                <input
                  type="time"
                  value={bookingData.appointment_time}
                  onChange={(e) =>
                    handleBookingChange("appointment_time", e.target.value)
                  }
                  required
                />
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
                {appointment.status === "confirmed" && (
                  <button className="btn-success">Join Call</button>
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
