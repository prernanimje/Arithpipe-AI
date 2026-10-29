import React, { useState } from "react";
import "../styles/Landing.css";
import { motion } from "framer-motion";
import PlusMenu from "../components/Plusmenu";
import Login from "../components/Login";
import SignUp from "../components/SignUp";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { Moon, Sun, Sparkles } from "lucide-react";
import FinbroDashboard from "./FinbroDashboard";

const Landing = ({ hideNavbar = false }) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginMode, setLoginMode] = useState("login");
  const [selectedFile, setSelectedFile] = useState(null);
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!selectedFile) {
      alert("Please select a file first");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Upload failed");
      }

      const result = await res.json();
      console.log("Upload result:", result);

      // Save to localStorage for persistence
      localStorage.setItem("currentFileId", result.file_id);
      localStorage.setItem("currentChartData", JSON.stringify(result.data));

      navigate("/finbro-dashboard", {
        state: {
          fileId: result.file_id,
          chartData: result.data,
          section: "visualize",
        },
      });
    } catch (err) {
      console.error(err);
      alert(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  // Check for user
  const user = localStorage.getItem("user");

  return (
    <div className="landing" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="landing-overlay" style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle at 50% 50%, transparent 0%, var(--bg-primary) 100%)',
        opacity: 0.6,
        zIndex: -1,
        pointerEvents: 'none'
      }}></div>
      {!hideNavbar && (
        <motion.nav className="navbar">
          <motion.h2 className="logo">Arithpipe</motion.h2>

          <div className="auth-buttons">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-smart-ai'))}
              className="smart-ai-toggle header-variant"
              title="AI Assistant"
            >
              <Sparkles />
            </button>

            <button
              onClick={toggleTheme}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                marginRight: '10px'
              }}
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
            </button>

            {!user ? (
              <>
                <button
                  className="login-btn"
                  onClick={() => {
                    setShowLogin(true);
                    setLoginMode("login");
                  }}
                >
                  Log in
                </button>

                <button
                  className="login-btn signin-btn"
                  onClick={() => {
                    setShowLogin(true);
                    setLoginMode("signup");
                  }}
                >
                  Sign up
                </button>
              </>
            ) : (
              <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                Welcome back!
              </div>
            )}
          </div>
        </motion.nav>
      )}

      <section className="hero">
        <motion.div
          className="card"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Build Your Own Visualization pipelines with Arithpipe AI
          </motion.p>

          <motion.div
            className="input-box"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <PlusMenu onFileSelect={setSelectedFile} />

            <input
              type="text"
              placeholder="Upload a file to visualize"
              value={selectedFile ? selectedFile.name : query}
              readOnly
            />

            <motion.button
              whileHover={{ scale: 1.1, backgroundColor: 'rgb(125, 108, 232)' }}
              whileTap={{ scale: 0.9 }}
              className="but"
              onClick={handleSubmit}
            >
              {loading ? "..." : "➤"}
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      {showLogin &&
        (loginMode === "signup" ? (
          <SignUp onClose={() => setShowLogin(false)} />
        ) : (
          <Login onClose={() => setShowLogin(false)} />
        ))}
    </div>
  );
};

export default Landing;
