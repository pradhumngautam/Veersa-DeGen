import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Auth.css";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("patient");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const { data, error } = await signUp(email, password, role);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Show success message - user needs to confirm email
      setSuccess(true);
      setLoading(false);
      // Don't navigate - user needs to confirm email first
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Sign Up</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>I am a</label>
            <div className="role-selector">
              <button
                type="button"
                className={`role-btn ${role === "patient" ? "active" : ""}`}
                onClick={() => setRole("patient")}
              >
                Patient
              </button>
              <button
                type="button"
                className={`role-btn ${role === "doctor" ? "active" : ""}`}
                onClick={() => setRole("doctor")}
              >
                Doctor
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm your password"
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          {success && (
            <div className="success-message">
              <h3>✅ Account Created Successfully!</h3>
              <p>
                We've sent a confirmation email to <strong>{email}</strong>
              </p>
              <p>
                Please check your inbox and click the confirmation link to
                activate your account.
              </p>
              <p>
                After confirming, you can <a href="/login">sign in</a> to
                complete your profile.
              </p>
            </div>
          )}
          {!success && (
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Creating account..." : "Sign Up"}
            </button>
          )}
        </form>
        <p className="auth-link">
          Already have an account? <a href="/login">Sign in</a>
        </p>
      </div>
    </div>
  );
}
