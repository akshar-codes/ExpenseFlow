import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ROUTES } from "../constants/routes.js";
import AuthLayout from "../components/auth/AuthLayout";
import AuthCard from "../components/auth/AuthCard";
import AuthInput from "../components/auth/AuthInput";
import RegisterMarketingPanel from "../components/auth/RegisterMarketingPanel";
import PasswordStrengthMeter from "../components/auth/PasswordStrengthMeter";
import SocialLoginButton from "../components/auth/SocialLoginButton";
import DividerWithText from "../components/auth/DividerWithText";
import useAuthForm from "../hooks/useAuthForm";

// ─── Icons ────────────────────────────────────────────────────────────────────
const EyeOpen = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeClosed = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

// ─── Success overlay ──────────────────────────────────────────────────────────
const SuccessOverlay = ({ name }) => (
  <div
    className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl z-20"
    style={{
      background:
        "linear-gradient(160deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.06) 100%)",
      backdropFilter: "blur(4px)",
      animation: "auth-enter 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
    }}
  >
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
      style={{
        background: "linear-gradient(135deg, #10b981, #059669)",
        boxShadow: "0 8px 32px rgba(16,185,129,0.4)",
        animation: "pulse-ring 1.5s ease-out",
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 13l4 4L19 7"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
    <h3
      className="text-lg font-bold text-white mb-1"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      Account created!
    </h3>
    <p
      className="text-sm text-[#71717a]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      Welcome, {name?.split(" ")[0] ?? "there"} 👋
    </p>
    <p
      className="text-[11px] text-[#52525b] mt-2"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      Redirecting to your dashboard…
    </p>
  </div>
);

// ─── Register Page ────────────────────────────────────────────────────────────
const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const {
    values,
    errors,
    handleChange,
    handleBlur,
    validateAll,
    setFieldError,
    clearErrors,
  } = useAuthForm(["name", "email", "password", "confirmPassword"], true);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    clearErrors();

    if (!validateAll()) return;

    setSubmitting(true);
    try {
      await register(values.name.trim(), values.email.trim(), values.password);
      setSuccess(true);
      // Delay navigation for success animation
      setTimeout(() => navigate(ROUTES.DASHBOARD), 1800);
    } catch (err) {
      const data = err?.response?.data;
      const message =
        data?.message ||
        (Array.isArray(data?.errors) ? data.errors[0] : null) ||
        "Registration failed. Please try again.";

      if (
        message.toLowerCase().includes("email") &&
        message.toLowerCase().includes("exist")
      ) {
        setFieldError("email", "An account with this email already exists");
      } else if (message.toLowerCase().includes("email")) {
        setFieldError("email", message);
      } else {
        setApiError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout animKey="register" marketingPanel={<RegisterMarketingPanel />}>
      {/* ── Heading ── */}
      <div className="stagger-1 mb-7">
        <h2
          className="text-2xl font-bold text-white mb-1.5"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: "-0.02em",
          }}
        >
          Create your account
        </h2>
        <p
          className="text-sm text-[#71717a]"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Free forever. No credit card required.
        </p>
      </div>

      <AuthCard className="relative">
        {/* Success overlay */}
        {success && <SuccessOverlay name={values.name} />}

        {/* ── API Error ── */}
        {apiError && !success && (
          <div
            className="flex items-start gap-2.5 px-4 py-3 rounded-xl border mb-5 text-sm"
            style={{
              background: "rgba(248,113,113,0.08)",
              borderColor: "rgba(248,113,113,0.2)",
              color: "#f87171",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <span className="text-base leading-none mt-0.5 shrink-0">⚠</span>
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Full Name */}
          <div className="stagger-2">
            <AuthInput
              label="Full name"
              type="text"
              placeholder="Akshar Gupta"
              value={values.name}
              onChange={handleChange("name")}
              onBlur={handleBlur("name")}
              error={errors.name}
              autoComplete="name"
              disabled={submitting || success}
            />
          </div>

          {/* Email */}
          <div className="stagger-3 mt-4">
            <AuthInput
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={values.email}
              onChange={handleChange("email")}
              onBlur={handleBlur("email")}
              error={errors.email}
              autoComplete="email"
              disabled={submitting || success}
            />
          </div>

          {/* Password */}
          <div className="stagger-4 mt-4">
            <AuthInput
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
              value={values.password}
              onChange={handleChange("password")}
              onBlur={handleBlur("password")}
              error={errors.password}
              autoComplete="new-password"
              disabled={submitting || success}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="text-[#52525b] hover:text-[#a1a1aa] transition-colors focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeClosed /> : <EyeOpen />}
                </button>
              }
            />
            {/* Password strength meter */}
            <PasswordStrengthMeter
              password={values.password}
              show={values.password.length > 0}
            />
          </div>

          {/* Confirm Password */}
          <div className="stagger-5 mt-4">
            <AuthInput
              label="Confirm password"
              type={showConfirm ? "text" : "password"}
              placeholder="Repeat your password"
              value={values.confirmPassword}
              onChange={handleChange("confirmPassword")}
              onBlur={handleBlur("confirmPassword")}
              error={errors.confirmPassword}
              autoComplete="new-password"
              disabled={submitting || success}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowConfirm((p) => !p)}
                  className="text-[#52525b] hover:text-[#a1a1aa] transition-colors focus:outline-none"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeClosed /> : <EyeOpen />}
                </button>
              }
            />
            {/* Match indicator */}
            {values.confirmPassword &&
              values.password &&
              !errors.confirmPassword && (
                <p
                  className="text-[11px] mt-1 flex items-center gap-1.5"
                  style={{
                    color: "#10b981",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <span>✓</span> Passwords match
                </p>
              )}
          </div>

          {/* Terms note */}
          <p
            className="stagger-5 text-[11px] text-[#3f3f46] mt-4 mb-5 leading-relaxed"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            By creating an account, you agree to our{" "}
            <button
              type="button"
              className="underline transition-colors"
              style={{ color: "#52525b" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#71717a")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#52525b")}
            >
              Terms of Service
            </button>{" "}
            and{" "}
            <button
              type="button"
              className="underline transition-colors"
              style={{ color: "#52525b" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#71717a")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#52525b")}
            >
              Privacy Policy
            </button>
            .
          </p>

          {/* Submit */}
          <div className="stagger-6">
            <button
              type="submit"
              disabled={submitting || success}
              className="btn-primary w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              style={{
                background:
                  submitting || success
                    ? "rgba(16,185,129,0.5)"
                    : "linear-gradient(135deg, #10b981, #059669)",
                boxShadow:
                  submitting || success
                    ? "none"
                    : "0 4px 20px rgba(16,185,129,0.35)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="w-4 h-4"
                    style={{ animation: "spin-slow 0.7s linear infinite" }}
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="white"
                      strokeWidth="3"
                    />
                    <path
                      className="opacity-75"
                      fill="white"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Creating account…
                </span>
              ) : success ? (
                <span className="flex items-center justify-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="white"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Account created!
                </span>
              ) : (
                "Create free account"
              )}
            </button>
          </div>

          {/* Social divider */}
          <div className="stagger-7">
            <DividerWithText />
            <SocialLoginButton
              label="Sign up with Google"
              loading={submitting}
              onClick={() =>
                setApiError("Google Sign-Up is not configured yet.")
              }
            />
          </div>
        </form>
      </AuthCard>

      {/* ── Login link ── */}
      <div className="stagger-7 mt-6 text-center">
        <p
          className="text-sm text-[#52525b]"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Already have an account?{" "}
          <button
            onClick={() => navigate(ROUTES.LOGIN)}
            className="font-semibold transition-colors focus:outline-none"
            style={{ color: "#10b981" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#34d399")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#10b981")}
          >
            Sign in instead →
          </button>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Register;
