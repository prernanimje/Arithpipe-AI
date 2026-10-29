import React, { useState } from "react";
import { motion } from "framer-motion";
import "../styles/Landing.css";
import { API_BASE } from "../api/config";
import { useNavigate } from "react-router-dom";


const SignUp = ({ onClose }) => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Signup failed");
      } else {
        localStorage.setItem("user", JSON.stringify(data));
        onClose();
        navigate("/finbro-dashboard");

      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-overlay">
      <motion.div className="login-modal" initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <button className="close-btn" onClick={onClose}>
          ×
        </button>

        <h3>Sign up</h3>

        <form onSubmit={handleSubmit}>
          <label>Name
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label>
            Email

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label >
            Password
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <div className="error-msg">{error}</div>}

          <button type="submit" className="but" disabled={loading}>
            {loading ? "..." : "Sign up"}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default SignUp;
