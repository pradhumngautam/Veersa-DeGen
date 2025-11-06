import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";
import "./Dashboard.css";

export default function DoctorDashboard() {
  const { user, userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("upcoming"); // upcoming, past, all

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

  if (loading) {
    return <div className="dashboard-container">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Doctor Dashboard</h1>
          <p>
            Welcome, Dr. {userProfile?.profile?.first_name}{" "}
            {userProfile?.profile?.last_name}
          </p>
        </div>
        <div className="header-actions">
          <button
            onClick={() => navigate("/profile-setup?role=doctor")}
            className="btn-secondary"
          >
            Edit Profile
          </button>
          <button onClick={signOut} className="btn-secondary">
            Sign Out
          </button>
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
          filteredAppointments.map((appointment) => (
            <div key={appointment.id} className="appointment-card">
              <div className="appointment-info">
                <h3>
                  {appointment.patient_profiles?.first_name}{" "}
                  {appointment.patient_profiles?.last_name}
                </h3>
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
                {appointment.patient_notes && (
                  <p>
                    <strong>Notes:</strong> {appointment.patient_notes}
                  </p>
                )}
              </div>
              <div className="appointment-actions">
                {appointment.status === "pending" && (
                  <>
                    <button
                      onClick={() =>
                        updateAppointmentStatus(appointment.id, "confirmed")
                      }
                      className="btn-success"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() =>
                        updateAppointmentStatus(appointment.id, "cancelled")
                      }
                      className="btn-danger"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {appointment.status === "confirmed" && (
                  <button
                    onClick={() =>
                      updateAppointmentStatus(appointment.id, "completed")
                    }
                    className="btn-primary"
                  >
                    Mark Complete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
