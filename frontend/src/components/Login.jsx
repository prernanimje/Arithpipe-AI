import React, { useState } from "react";
import { motion } from "framer-motion";
import "../styles/Landing.css";
import { API_BASE } from "../api/config";
import { useNavigate } from "react-router-dom";


const Login = ({ onClose }) => {
  const navigate = useNavigate();  // 👈 ADD THIS

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Login failed");
      } else {
        localStorage.setItem("user", JSON.stringify(data));
        onClose();
        navigate("/finbro-dashboard");  // 👈 REDIRECT HERE


      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-overlay">
      <motion.div className="login-modal"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}>
        <button className="close-btn" onClick={onClose}>
          ×
        </button>

        <h3>Log in</h3>

        <form onSubmit={handleSubmit}>
          <label>Email
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
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
            {loading ? "..." : "Log in"}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
