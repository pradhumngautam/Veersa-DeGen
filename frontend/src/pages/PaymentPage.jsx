import { useState } from "react";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";
import "./Payment.css";

export default function PaymentPage({
  appointmentId,
  amount,
  onSuccess,
  onCancel,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [zipCode, setZipCode] = useState("");

  const handlePayment = async (e) => {
    e.preventDefault();
    setError("");

    // Basic validation
    if (!cardNumber || !expiry || !cvv || !zipCode) {
      setError("Please fill in all card details");
      return;
    }

    // Simple card number validation (remove spaces)
    const cleanCardNumber = cardNumber.replace(/\s/g, "");
    if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
      setError("Invalid card number");
      return;
    }

    setLoading(true);

    try {
      // Simulate payment processing delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // For test mode: Accept any card starting with 4 (Visa test cards)
      // In production, this would call Square API
      if (!cleanCardNumber.startsWith("4")) {
        throw new Error(
          "Test mode: Please use a test card starting with 4 (e.g., 4111 1111 1111 1111)"
        );
      }

      // Generate a mock payment ID
      const paymentId = `sq_test_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Update appointment payment status
      const { error: updateError } = await supabase
        .from("appointments")
        .update({
          payment_status: "paid",
          payment_id: paymentId,
        })
        .eq("id", appointmentId);

      if (updateError) throw updateError;

      toast.success("Payment successful! Your appointment is confirmed.");
      onSuccess();
    } catch (err) {
      console.error("Payment error:", err);
      setError(err.message || "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (value) => {
    // Remove all non-digits
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    // Add spaces every 4 digits
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  return (
    <div className="payment-modal" onClick={(e) => {
      if (e.target === e.currentTarget) {
        onCancel();
      }
    }}>
      <div className="payment-card">
        <div className="payment-header">
          <h2>Complete Payment</h2>
          <button
            type="button"
            onClick={onCancel}
            className="payment-close-btn"
            aria-label="Close"
            disabled={loading}
          >
            ×
          </button>
        </div>
        
        <div className="payment-amount-section">
          <span className="amount-label">Total Amount</span>
          <span className="amount-value">${amount.toFixed(2)}</span>
        </div>

        <form onSubmit={handlePayment}>
          <div className="form-group">
            <label>Card Number *</label>
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="4111 1111 1111 1111"
              maxLength="19"
              required
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Expiry Date (MM/YY) *</label>
              <input
                type="text"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="12/25"
                maxLength="5"
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>CVV *</label>
              <input
                type="text"
                value={cvv}
                onChange={(e) =>
                  setCvv(e.target.value.replace(/\D/g, "").substring(0, 4))
                }
                placeholder="123"
                maxLength="4"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label>ZIP Code *</label>
            <input
              type="text"
              value={zipCode}
              onChange={(e) =>
                setZipCode(e.target.value.replace(/\D/g, "").substring(0, 5))
              }
              placeholder="12345"
              maxLength="5"
              required
              disabled={loading}
            />
          </div>

          <div className="test-card-info">
            <div className="test-info-icon">ℹ️</div>
            <div className="test-info-content">
              <strong>Test Mode</strong>
              <p>Use card number starting with 4 (e.g., 4111 1111 1111 1111). Any expiry date, CVV, and ZIP code will work.</p>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button
              type="button"
              onClick={onCancel}
              className="btn-cancel"
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-pay">
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Processing...
                </>
              ) : (
                `Pay $${amount.toFixed(2)}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
