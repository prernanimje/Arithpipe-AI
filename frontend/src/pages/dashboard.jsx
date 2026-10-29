import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Settings,
  HelpCircle,
  LogOut,
  SwitchCamera,
  MessageSquare,
  Moon,
  Sun,
  Sparkles
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";



const Dashboard = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const user = localStorage.getItem("user");

    if (!user) {
      navigate("/");
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <div className="flex min-h-screen bg-gray-100 relative">


      {/* ===== Sidebar ===== */}
      <div
        className={`bg-white shadow-lg p-6 flex flex-col transition-all duration-300 ${isSidebarOpen ? "w-64" : "w-0 overflow-hidden"
          }`}
      >

        {/* Logo + Name (Clickable) */}
        <div
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="flex items-center gap-3 mb-10 cursor-pointer"
        >
          <div className="w-10 h-10 bg-purple-600 text-white rounded-lg flex items-center justify-center font-bold">
            M
          </div>
          {isSidebarOpen && (
            <h1 className="text-xl font-bold text-purple-600">
              MyDashboard
            </h1>
          )}
        </div>

        {/* Menu Items */}
        {isSidebarOpen && (
          <div className="flex flex-col gap-4 text-gray-700 font-medium">

            <Link
              onClick={() => navigate("/")}
              className="text-left px-3 py-2 rounded-lg hover:bg-purple-100 hover:text-purple-600 transition"
            >
              Home
            </Link>

            <Link
              onClick={() => navigate("/visualize")}
              className="text-left px-3 py-2 rounded-lg hover:bg-purple-100 hover:text-purple-600 transition"
            >
              Visualization
            </Link>

            <Link
              onClick={() => navigate("/chart-config")}
              className="text-left px-3 py-2 rounded-lg hover:bg-purple-100 hover:text-purple-600 transition"
            >
              Chart Edit
            </Link>

          </div>
        )}
      </div>


      {/* ===== Main Content Area ===== */}
      <div className="flex-1">
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-5 left-5 bg-purple-600 text-white px-3 py-2 rounded-md shadow"
          >
            ☰
          </button>
        )}

        {/* Top Navbar */}
        <nav className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Welcome, {user?.name || user?.email}
          </h2>

          {/* Header Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-smart-ai'))}
              className="smart-ai-toggle header-variant"
              title="AI Assistant"
            >
              <Sparkles />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <div
                onClick={() => setOpen(!open)}
                className="cursor-pointer flex items-center gap-2"
              >
                <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              </div>

              {open && (
                <div className="absolute right-0 mt-3 w-72 bg-white rounded-xl shadow-lg border p-4 z-50">
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center text-lg font-bold">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <p className="font-semibold">{user?.name || "User"}</p>
                      <p className="text-sm text-gray-500">{user?.email}</p>
                    </div>
                  </div>
                  <button className="flex items-center gap-2 w-full hover:bg-gray-100 px-3 py-2 rounded-lg">
                    <SwitchCamera size={18} />
                    Switch Account
                  </button>

                  <button className="flex items-center gap-2 w-full hover:bg-gray-100 px-3 py-2 rounded-lg"><Settings size={18} />
                    Settings
                  </button>

                  <button className="flex items-center gap-2 w-full hover:bg-gray-100 px-3 py-2 rounded-lg"><HelpCircle size={18} />
                    Help
                  </button>

                  <button className="flex items-center gap-2 w-full hover:bg-gray-100 px-3 py-2 rounded-lg"><MessageSquare size={18} />
                    Send Feedback
                  </button>
                  <button className="flex items-center gap-2 w-full hover:bg-gray-100 px-3 py-2 rounded-lg"><LogOut size={18} />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Dashboard Cards */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="text-lg font-semibold">Total Projects</h3>
              <p className="text-gray-500 mt-2">12</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="text-lg font-semibold">Active Tasks</h3>
              <p className="text-gray-500 mt-2">5</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="text-lg font-semibold">Messages</h3>
              <p className="text-gray-500 mt-2">3</p>
            </div>

          </div>
        </div>

      </div>

    </div>
  );

};

export default Dashboard;
