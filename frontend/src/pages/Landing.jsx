import React, { useState } from "react";
import "../styles/Landing.css";
import { motion } from "framer-motion";
import PlusMenu from "../components/Plusmenu";
import Login from "../components/Login";
import SignUp from "../components/SignUp";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { Moon, Sun, Sparkles } from "lucide-react";
import FinbroDashboard from "./FinbroDashboard";
import { API_BASE } from "../api/config";

const Landing = ({ hideNavbar = false }) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginMode, setLoginMode] = useState("login");
  const [selectedFile, setSelectedFile] = useState(null);
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // On default page visit: do NOT auto-login from old stale localStorage.
  // Check active session storage so fresh visitors always see "Log in" and "Sign up".
  const [user, setUser] = useState(() => {
    try {
      const sessionUser = sessionStorage.getItem("user");
      if (sessionUser) {
        return JSON.parse(sessionUser);
      }
    } catch {
      return null;
    }
    return null;
  });

  const handleAuthSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    setUser(null);
  };

  // Re-sync user state on navigation/redirect so logout from any page immediately reflects
  React.useEffect(() => {
    try {
      const sessionUser = sessionStorage.getItem("user");
      if (sessionUser) {
        setUser(JSON.parse(sessionUser));
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, [location]);

  const handleSubmit = async () => {
    if (!selectedFile) {
      alert("Please select a file first");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
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

  const isFirstTimeNotice = Boolean(
    user && (user.is_first_login || location.state?.firstLogin)
  );

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
          <motion.h2 className="logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
            AI-Arithpipe
          </motion.h2>

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
              <div className="user-nav-group">
                <span className="welcome-username">
                  Welcome, {user.name || "User"}!
                </span>
                <button
                  className="login-btn"
                  onClick={() => navigate("/finbro-dashboard")}
                  title="Go to Dashboard"
                >
                  Dashboard
                </button>
                <button
                  className="login-btn signin-btn"
                  onClick={handleLogout}
                  title="Log out"
                >
                  Log out
                </button>
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
          {isFirstTimeNotice && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: '1.25rem',
                padding: '0.75rem 1.25rem',
                borderRadius: '8px',
                background: 'rgba(125, 108, 232, 0.25)',
                border: '1px solid rgba(125, 108, 232, 0.5)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                textAlign: 'center'
              }}
            >
              🎉 Welcome, {user.name || "User"}! Please upload your data file (CSV, Excel, or JSON) to start visualizing.
            </motion.div>
          )}

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Build Your Own Visualization pipelines with AI-Arithpipe
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
          <SignUp
            onClose={() => setShowLogin(false)}
            onSuccess={handleAuthSuccess}
          />
        ) : (
          <Login
            onClose={() => setShowLogin(false)}
            onSuccess={handleAuthSuccess}
          />
        ))}
    </div>
  );
};

export default Landing;
