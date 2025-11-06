import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import DoctorDashboard from "./DoctorDashboard";
import PatientDashboard from "./PatientDashboard";

export default function Dashboard() {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect if loading is complete AND we don't have user/profile
    if (!loading) {
      // Give a small delay to ensure state is stable
      const timer = setTimeout(() => {
        if (!user || !userProfile) {
          console.log("No user or profile, redirecting to login");
          navigate("/login");
        } else if (userProfile && !userProfile.profile) {
          console.log("No profile found, redirecting to profile-setup");
          navigate(`/profile-setup?role=${userProfile.role}`);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [user, userProfile, loading, navigate]);

  if (loading) {
    return (
      <div
        className="dashboard-container"
        style={{ padding: "50px", textAlign: "center" }}
      >
        <p>Loading...</p>
        <p style={{ fontSize: "14px", color: "#666" }}>
          Please wait while we fetch your data
        </p>
      </div>
    );
  }

  if (!user || !userProfile) {
    return null;
  }

  if (!userProfile.profile) {
    return null;
  }

  return userProfile.role === "doctor" ? (
    <DoctorDashboard />
  ) : (
    <PatientDashboard />
  );
}
