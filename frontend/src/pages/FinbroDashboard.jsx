import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/FinbroDashboard.css';
import '../styles/plusmenu.css'; // Ensure plusmenu styles are available if we use similar class names
import { useTheme } from '../context/ThemeContext';
import Visualization from '../pages/visuaize.jsx';
import Landing from '../pages/Landing.jsx';
import Charts from '../pages/ChartConfig.jsx';
import SmartDashboardAI from '../components/SmartDashboardAI';
import { motion, AnimatePresence } from 'framer-motion';

import {
  LayoutDashboard,
  BarChart2,
  Rabbit,
  Box,
  Settings,
  LogOut,
  SwitchCamera,
  MessageSquare,
  HelpCircle,
  Moon,
  Sun,
  UploadCloud,
  Sparkles,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  User
}
  from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const TimeCard = ({ style }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateString = time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const location = Intl.DateTimeFormat().resolvedOptions().timeZone.replace("_", " ");

  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours();

  const secondAngle = seconds * 6;
  const minuteAngle = minutes * 6 + seconds * 0.1;
  const hourAngle = (hours % 12) * 30 + minutes * 0.5;

  return (
    <section className="finbro-card time-card-container" style={{
      width: '100%',
      minWidth: '290px',
      background: '#111',
      color: 'white',
      display: 'flex',
      flexDirection: 'row',
      gap: '20px',

      alignItems: 'center',
      borderRadius: '24px',
      border: '1px solid #333',
      marginLeft: '0px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      position: 'relative',
      overflow: 'hidden',
      height: '26vh',
      ...style
    }}>
      {/* Decorative gradient blob */}
      <div style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '100px',
        height: '100px',
        background: 'radial-gradient(circle, rgba(120,23,107,0.3) 0%, rgba(0,0,0,0) 70%)',
        borderRadius: '50%'
      }} />

      {/* Analog Clock */}
      <div style={{ width: '120px', height: '120px', position: 'relative', zIndex: 1 }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
          {/* Clock Face */}
          <circle cx="50" cy="50" r="48" fill="rgba(255,255,255,0.03)" stroke="#333" strokeWidth="1.5" />

          {/* Hour Markers */}
          {[...Array(12)].map((_, i) => (
            <line
              key={i}
              x1="50" y1="6"
              x2="50" y2="10"
              transform={`rotate(${i * 30} 50 50)`}
              stroke="#666"
              strokeWidth="2"
            />
          ))}

          {/* Hour Hand */}
          <motion.line
            x1="50" y1="50"
            x2="50" y2="28"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            animate={{ rotate: hourAngle }}
            style={{ originX: 0.5, originY: 1 }}
          />

          {/* Minute Hand */}
          <motion.line
            x1="50" y1="50"
            x2="50" y2="18"
            stroke="#ccc"
            strokeWidth="2"
            strokeLinecap="round"
            animate={{ rotate: minuteAngle }}
            style={{ originX: 0.5, originY: 1 }}
          />

          {/* Second Hand */}
          <motion.line
            x1="50" y1="50"
            x2="50" y2="12"
            stroke="#fef6feff"
            strokeWidth="1.2"
            strokeLinecap="round"
            animate={{ rotate: secondAngle }}
            style={{ originX: 0.5, originY: 1 }}
          />

          {/* Center Dot - Drawn last to pin the middle */}
          <circle cx="50" cy="50" r="3" fill="#8897bbff" />
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', zIndex: 1, textAlign: 'left', marginLeft: '10px' }}>
        <div style={{ fontSize: '2.2rem', fontWeight: '800', letterSpacing: '1px', lineHeight: '1', color: 'white' }}>
          {timeString.split(' ')[0]}
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#7d6ce8' }}>
          {timeString.split(' ')[1]}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '4px', fontWeight: '500' }}>
          {dateString}
        </div>
        <div style={{
          marginTop: '10px',
          fontSize: '0.8rem',
          color: '#666'
        }}>
          {location}
        </div>
      </div>
    </section>
  );
};

const StockMarketSlider = ({ style, className = "" }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const [stocks, setStocks] = useState([
    { name: "Apple", price: "...", change: "+0.0%", data: [{ v: 0 }] },
    { name: "BTC", price: "...", change: "+0.0%", data: [{ v: 0 }] },
    { name: "Tesla", price: "...", change: "+0.0%", data: [{ v: 0 }] },
    { name: "Google", price: "...", change: "+0.0%", data: [{ v: 0 }] }
  ]);

  const fetchLiveStockData = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/stocks?symbols=AAPL,BTC-USD,TSLA,GOOGL");
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map(item => ({
          name: item.symbol === 'BTC-USD' ? 'BTC' : (item.symbol === 'AAPL' ? 'Apple' : (item.symbol === 'TSLA' ? 'Tesla' : 'Google')),
          price: typeof item.price === 'number' ? item.price.toFixed(2) : item.price,
          change: (item.changePercent >= 0 ? "+" : "") + (typeof item.changePercent === 'number' ? item.changePercent.toFixed(2) : 0) + "%",
          data: item.data && item.data.length > 0 ? item.data.map(p => ({ v: p })) : [{ v: item.price }]
        }));
        if (formatted.length > 0) {
          // keep the same order as much as possible, or just replace
          setStocks(formatted);
        }
      }
    } catch (e) {
      console.error("Failed to fetch live stock data", e);
    }
  };

  useEffect(() => {
    fetchLiveStockData();
    const pollInterval = setInterval(fetchLiveStockData, 30000); // 30s
    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % stocks.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [stocks.length]);

  const stock = stocks[currentIndex];
  const isPositive = stock.change.startsWith('+');

  return (
    <div className={`finbro-card ${className}`} style={{
      width: '100%',
      ...style,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stock.name}</div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Live Market</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>${stock.price}</div>
          <div style={{ color: isPositive ? '#4caf50' : '#f44336', fontWeight: 'bold' }}>{stock.change}</div>
        </div>
      </div>

      <div style={{ width: '100%', flex: 1 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
            style={{ width: '100%', height: '100%' }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stock.data}>
                <defs>
                  <linearGradient id={`gradient${currentIndex}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7d6ce8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7d6ce8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="#7d6ce8"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill={`url(#gradient${currentIndex})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginTop: '10px' }}>
        {stocks.map((_, i) => (
          <div key={i} style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: i === currentIndex ? 'white' : '#444',
            transition: 'background 0.3s'
          }} />
        ))}
      </div>
    </div>
  );
};

const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let lat = 40.7128; // Default New York
    let lon = -74.0060;

    const fetchWeather = async (latitude, longitude) => {
      try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
        const data = await response.json();
        setWeather({
          temp: data.current_weather.temperature,
          wind: data.current_weather.windspeed,
          code: data.current_weather.weathercode,
          isDay: data.current_weather.is_day,
        });
      } catch (error) {
        console.error("Failed to fetch weather", error);
      } finally {
        setLoading(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        () => {
          fetchWeather(lat, lon);
        }
      );
    } else {
      fetchWeather(lat, lon);
    }
  }, []);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>Loading Weather...</div>;
  if (!weather) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>Weather unavailable</div>;

  const getWeatherIcon = (code) => {
    if (code === 0) return <Sun size={56} color="#facc15" />;
    if (code <= 3) return <Cloud size={56} color="#94a3b8" />;
    if (code <= 69) return <CloudRain size={56} color="#60a5fa" />;
    if (code <= 79) return <CloudSnow size={56} color="#e2e8f0" />;
    if (code <= 99) return <CloudLightning size={56} color="#fbbf24" />;
    return <Cloud size={56} color="#94a3b8" />;
  };

  const getWeatherDesc = (code) => {
    if (code === 0) return "Clear sky";
    if (code <= 3) return "Partly cloudy";
    if (code <= 49) return "Fog";
    if (code <= 69) return "Rain";
    if (code <= 79) return "Snow";
    if (code <= 99) return "Thunderstorm";
    return "Showers";
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      height: '100%',
      color: 'var(--text-primary)',
    }}>
      {/* Left Column */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '8px' }}>
            Local Weather
          </div>
          <div style={{ fontSize: '3.5rem', fontWeight: 'bold', lineHeight: 1 }}>
            {Math.round(weather.temp)}°
          </div>
        </div>
        <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
          {getWeatherDesc(weather.code)}
        </div>
      </div>

      {/* Right Column */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          {getWeatherIcon(weather.code)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Wind</div>
            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{weather.wind} km/h</div>
          </div>
          <Wind size={20} color="var(--text-secondary)" />
        </div>
      </div>
    </div>
  );
};

const LiveStockTable = () => {
  const initialStocks = [
    { symbol: "AAPL", name: "Apple Inc.", oldPrice: 0, newPrice: 0, change: "+0.00%" },
    { symbol: "TSLA", name: "Tesla Inc.", oldPrice: 0, newPrice: 0, change: "+0.00%" },
    { symbol: "GOOGL", name: "Alphabet Inc.", oldPrice: 0, newPrice: 0, change: "+0.00%" },
    { symbol: "MSFT", name: "Microsoft", oldPrice: 0, newPrice: 0, change: "+0.00%" },
    { symbol: "AMZN", name: "Amazon", oldPrice: 0, newPrice: 0, change: "+0.00%" },
  ];

  const [stocks, setStocks] = useState(initialStocks);

  const fetchLiveStockTableData = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/stocks?symbols=AAPL,TSLA,GOOGL,MSFT,AMZN");
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map(item => {
          const nameMap = { AAPL: "Apple Inc.", TSLA: "Tesla Inc.", GOOGL: "Alphabet Inc.", MSFT: "Microsoft", AMZN: "Amazon" };
          return {
            symbol: item.symbol,
            name: nameMap[item.symbol] || item.symbol,
            oldPrice: item.price - item.change,
            newPrice: item.price,
            change: (item.changePercent >= 0 ? "+" : "") + (typeof item.changePercent === 'number' ? item.changePercent.toFixed(2) : 0) + "%"
          };
        });
        if (formatted.length > 0) setStocks(formatted);
      }
    } catch (e) {
      console.error("Failed to fetch live stock table data", e);
    }
  };

  useEffect(() => {
    fetchLiveStockTableData();
    const pollInterval = setInterval(fetchLiveStockTableData, 30000); // 30s live tick
    return () => clearInterval(pollInterval);
  }, []);

  return (
    <section className="finbro-card item-product-sales" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <div className="card-title">Live Stock Market</div>
        <div style={{ fontSize: '0.8rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.5s infinite' }}></span>
          Live Updates
        </div>
      </div>
      <div style={{ overflowX: 'auto', flex: 1 }}>
        <table className="sales-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Company</th>
              <th>Old Price</th>
              <th>Live Price</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((item, i) => {
              const isPositive = item.change.startsWith('+');
              return (
                <tr key={i}>
                  <td>
                    <div className="item-badge">
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.symbol}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 500 }}>{item.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>${item.oldPrice.toFixed(2)}</td>
                  <td style={{ fontWeight: 700 }}>${item.newPrice.toFixed(2)}</td>
                  <td style={{ color: isPositive ? '#4ade80' : '#ef4444', fontWeight: 600 }}>
                    {item.change}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const CustomXAxisTick = ({ x, y, payload }) => {
  if (!payload || payload.value === undefined || payload.value === null) return null;
  let text = payload.value.toString().trim();
  if (text.length > 3) {
    text = text.substring(0, 3) + "..";
  }
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill="#888" fontSize={12}>
        {text}
      </text>
    </g>
  );
};

const FinbroDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleTheme } = useTheme();

  // State
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [user, setUser] = useState(null);
  const [userHistory, setUserHistory] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [selectedChartData, setSelectedChartData] = useState(null);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const fetchHistory = async (userId) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/chat/history?user_id=${userId}`);
      if (res.ok) {
        const history = await res.json();
        setUserHistory(history);
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };
  const [isSidebarHidden, setIsSidebarHidden] = useState(true);
  const [activeSection, setActiveSection] = useState("dashboard"); // dashboard, visualize, charts, ai

  // Chart Config State when navigating within SPA
  const [selectedChartType, setSelectedChartType] = useState("bar");

  // Upload State
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Smart AI Control Listener
  useEffect(() => {
    const handleAICommand = (e) => {
      // Expecting detail: { chartType: 'bar' }
      if (e.detail && e.detail.chartType) {
        setSelectedChartType(e.detail.chartType);
        setActiveSection("charts"); // Switch view
      }
    };

    const handleSectionChange = (e) => {
      if (e.detail && e.detail.section) {
        setActiveSection(e.detail.section);
      }
    };

    const handleSidebarControl = (e) => {
      if (e.detail && e.detail.action === 'close') {
        setIsSidebarHidden(true);
      }
    };

    window.addEventListener('dashboard-chart-change', handleAICommand);
    window.addEventListener('active-section-change', handleSectionChange);
    window.addEventListener('dashboard-sidebar-control', handleSidebarControl);

    return () => {
      window.removeEventListener('dashboard-chart-change', handleAICommand);
      window.removeEventListener('active-section-change', handleSectionChange);
      window.removeEventListener('dashboard-sidebar-control', handleSidebarControl);
    };
  }, []);

  useEffect(() => {
    // User logic
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchHistory(parsedUser.id);
    }

    // Chart Data logic - Prioritize location state from Landing navigation
    if (location.state && location.state.chartData) {
      setChartData(location.state.chartData);
      // Persist for refresh
      localStorage.setItem("currentChartData", JSON.stringify(location.state.chartData));
      if (location.state.fileId) {
        localStorage.setItem("currentFileId", location.state.fileId);
      }

      // If redirection section is specified
      if (location.state.section) {
        setActiveSection(location.state.section);
      }
    } else {
      const storedChartData = localStorage.getItem("currentChartData");
      if (storedChartData) {
        try {
          const parsedData = JSON.parse(storedChartData);
          setChartData(parsedData);
        } catch (e) {
          console.error("Failed to parse chart data", e);
        }
      }
    }
  }, [location.state]);

  // Close dropdown and sidebar on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }

      // Close sidebar if clicking anywhere other than the logo
      if (!isSidebarHidden && !event.target.closest('.finbro-logo')) {
        setIsSidebarHidden(true);
      }

      // Handle closing of custom chart data sidebar
      const isChartShapeClick = event.target.closest && (event.target.closest('.recharts-bar-rectangle') || event.target.closest('.recharts-rectangle') || event.target.closest('.recharts-layer') || event.target.closest('.recharts-wrapper') || event.target.closest('.recharts-surface'));
      const dataSidebar = document.getElementById('chart-data-sidebar');
      if (dataSidebar && !dataSidebar.contains(event.target) && !isChartShapeClick) {
        setSelectedChartData(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSidebarHidden]);

  useEffect(() => {
    setAiQuery("");
    setAiResponse("");
  }, [selectedChartData]);

  const handleAskAI = async () => {
    if (!aiQuery.trim() || !selectedChartData) return;
    setIsAiLoading(true);
    setAiResponse("");

    const contextData = JSON.stringify(selectedChartData);
    const fullMessage = `Context regarding the metric point data clicked by the user: ${contextData}\n\nUser Question: ${aiQuery}`;
    setAiQuery("");

    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: fullMessage })
      });
      const data = await response.json();
      setAiResponse(data.reply || "No response received.");
    } catch (error) {
      setAiResponse("Sorry, I couldn't reach the AI service right now.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleSwitchAccount = () => {
    localStorage.removeItem("user");
    navigate("/");
  }

  // PRERNA click handler
  const handlePrernaClick = () => {
    setIsSidebarHidden(false);
  };

  // Upload Logic
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) handleUpload(file);
  };

  const handleUpload = async (file) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const result = await res.json();

      // Save data
      localStorage.setItem("currentFileId", result.file_id);
      localStorage.setItem("currentChartData", JSON.stringify(result.data));
      setChartData(result.data);

      // Stay on dashboard to show charts
      setActiveSection("dashboard");
    } catch (err) {
      console.error(err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Navigation Logic
  const handleChartSelectFromVisualize = (type, data) => {
    setSelectedChartType(type);
    setActiveSection("charts");
  };

  // Render Content based on activeSection
  const renderContent = () => {
    switch (activeSection) {
      case "home":
        return (
          <div className="finbro-landing-wrapper" style={{ height: '100%', overflowY: 'auto' }}>
            <Landing hideNavbar={true} />
          </div>
        );

      case "dashboard":
        // Mock Data for "Empty Cards" state
        const mockDonutData = [
          { name: 'USA', value: 40, fill: '#1a1a1a' },
          { name: 'Australia', value: 21, fill: '#d1c6f9' },
          { name: 'Korea', value: 19, fill: '#f8f9fa' },
        ];

        const mockActivity = [
          { name: 'Alia Bonner', action: 'Paid', amount: '$311.00', time: '#513 003' },
          { name: 'Kobi Potts', action: 'Refund', amount: '$311.00', time: '#152 004' },
          { name: 'Austin Camacho', action: 'Paid', amount: '$311.00', time: '#486 005' },
        ];

        const mockProductSales = chartData.length > 0 ? chartData.slice(0, 3).map(d => ({
          name: d.label,
          stock: Math.floor(Math.random() * 500) + 50,
          price: `$${(Math.random() * 100).toFixed(2)}`,
          sale: `${Math.floor(Math.random() * 20)}%`,
          sold: d.value
        })) : [
          { name: 'Sleeved cardigan', stock: 118, price: '$55.00', sale: '5%', sold: 294 },
          { name: 'Linen shorts', stock: 328, price: '$130.00', sale: '8%', sold: 2 },
          { name: 'Sweatshirt', stock: 118, price: '$311.00', sale: '15%', sold: 294 },
        ];

        const totalRevenue = chartData.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0) || 12000;
        const totalOrders = chartData.length || 15210;

        const containerVariants = {
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.1 }
          }
        };

        const leftVariants = {
          hidden: { opacity: 0, x: -70, filter: 'blur(10px)' },
          show: {
            opacity: 1,
            x: 0,
            filter: 'blur(0px)',
            transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
          }
        };

        const rightVariants = {
          hidden: { opacity: 0, x: 70, filter: 'blur(10px)' },
          show: {
            opacity: 1,
            x: 0,
            filter: 'blur(0px)',
            transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
          }
        };
        const yColumns = (() => {
          if (!chartData.length) return ["value"];
          const cols = Object.keys(chartData[0]);
          const isNum = (col) => chartData.some(r => typeof r[col] === 'number');
          let validCols = cols.filter(col => col !== 'label' && col !== 'name' && col !== 'id' && isNum(col));
          return validCols.length ? validCols : ["value"];
        })();
        const NEON_PALETTE = ['#4361ee', '#f72585', '#7209b7', '#4cc9f0', '#f8961e', '#3a0ca3'];

        return (
          <motion.div
            className="finbro-dashboard-grid"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {/* 1. Sales Analytics (Main Chart - Left Side) */}
            <motion.section variants={leftVariants} className="finbro-card item-sales-analytics">
              <div className="card-header">
                <div style={{ maxWidth: '70%' }}>
                  <div className="card-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {userHistory.length > 0 ? userHistory[0].title : "Sales Analytics"}
                  </div>
                  <div className="card-subtitle">Detailed information about your data</div>
                </div>
                <div className="finbro-chart-controls">
                  <div className="finbro-timeframe">
                    <button className="finbro-tf-btn active">This year</button>
                  </div>
                </div>
              </div>
              <div className="dashboard-chart-wrapper dashboard-sales-chart" style={{ width: '100%', height: 'calc(100% - 40px)', minHeight: 0, flex: 1 }}>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.slice(0, 12)} barSize={yColumns.length === 1 ? 45 : undefined}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={<CustomXAxisTick />} dy={10} height={60} interval={0} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                      {yColumns.length > 1 && <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />}
                      <Tooltip
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        contentStyle={{ background: 'var(--tooltip-bg)', border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      {yColumns.length > 1 && <Legend wrapperStyle={{ paddingTop: '10px' }} />}
                      {yColumns.map((col, idx) => (
                        <Bar
                          key={col}
                          name={col}
                          dataKey={col}
                          yAxisId={idx === 1 ? "right" : "left"}
                          fill={yColumns.length === 1 ? "#d1c6f9" : NEON_PALETTE[idx % NEON_PALETTE.length]}
                          radius={[4, 4, 4, 4]}
                          activeBar={{ fill: '#7d6ce8' }}
                          style={{ cursor: 'pointer' }}
                          onClick={(data) => setSelectedChartData({ label: data.payload?.label || data.name, value: data.value !== undefined ? data.value : data.payload?.[col], ...data.payload })}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  // Upload Placeholder if no data, but styled to fit
                  <div
                    className="upload-placeholder"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      border: '2px dashed var(--border-color)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      background: 'rgba(0,0,0,0.02)'
                    }}
                    onClick={() => fileInputRef.current.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.json,.xlsx,.xml"
                      style={{ display: "none" }}
                      onChange={handleFileSelect}
                    />
                    {uploading ? (
                      <div>Loading...</div>
                    ) : (
                      <>
                        <UploadCloud size={32} color="#7d6ce8" />
                        <p style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Upload Data to Visualize</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.section>

            {/* 2. Live Stock Chart (Replaced Total Customers - Right Side) */}
            <motion.div variants={rightVariants} className="item-total-customers" style={{ height: '100%', minHeight: 0 }}>
              <StockMarketSlider
                className="finbro-card"
                style={{
                  marginTop: '0',
                  height: '100%',
                  width: '100%',
                  padding: '24px'
                }}
              />
            </motion.div>

            {/* 3. Welcome & User History (Replaced Top Sales - Left Side) */}
            <motion.section variants={leftVariants} className="finbro-card item-top-sales" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-header" style={{ marginBottom: '15px' }}>
                <div className="card-title" style={{ fontSize: '1.2rem' }}>
                  Welcome back, <span style={{ color: 'var(--accent-color, #7d6ce8)', textTransform: 'capitalize' }}>
                    {user?.name || 'User'}
                  </span>! 👋
                </div>
              </div>

              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>Your recent activity</div>
                <div className="activity-list">
                  {userHistory.length > 0 ? userHistory.slice(0, 5).map((act, i) => (
                    <div key={i} className="activity-item">
                      <div className="activity-left">
                        <div className="activity-avatar" style={{ background: 'var(--bg-active)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <MessageSquare size={16} color="var(--text-secondary)" />
                        </div>
                        <div className="activity-info">
                          <h4 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                            {act.title}
                          </h4>
                          <p style={{ color: 'var(--text-secondary)' }}>AI Analysis</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          {act.timestamp}
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px 0' }}>It's quiet here. Start an AI context to populate your history!</div>
                  )}
                </div>
              </div>
            </motion.section>

            {/* 4. AI Assistant Filter History (Replaced Last Activity - Left Side) */}
            <motion.section variants={leftVariants} className="finbro-card item-last-activity">
              <div className="card-header">
                <div>
                  <div className="card-title">AI Filter History</div>
                  <div className="card-subtitle">Queries applying AI filters</div>
                </div>
                <div style={{ fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>Last 7 Days ↗</div>
              </div>
              <div style={{ flex: 1, minHeight: 0, marginTop: '15px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { day: 'Mon', queries: 12 },
                    { day: 'Tue', queries: 25 },
                    { day: 'Wed', queries: 18 },
                    { day: 'Thu', queries: 32 },
                    { day: 'Fri', queries: 24 },
                    { day: 'Sat', queries: 40 },
                    { day: 'Sun', queries: 35 }
                  ]}>
                    <defs>
                      <linearGradient id="colorFilter" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" opacity={0.5} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} dy={5} />
                    <Tooltip
                      cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                      contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                      itemStyle={{ color: '#f43f5e', fontWeight: 600 }}
                    />
                    <Area type="monotone" name="Filters Applied" dataKey="queries" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorFilter)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.section>

            {/* 5. Time Watch (Replaced Total Revenue - Right side) */}
            <motion.div variants={rightVariants} style={{ gridColumn: 'span 1', height: '100%', minHeight: 0 }}>
              <TimeCard style={{ height: '100%', background: '#1a1a1a', minWidth: '0' }} />
            </motion.div>

            {/* 6. Live Stock Market (Replaced Product Sales - Left side span) */}
            <motion.div variants={leftVariants} className="item-product-sales" style={{ height: '100%', minHeight: 0 }}>
              <LiveStockTable />
            </motion.div>

            {/* 7. Weather (Replaced Total Orders - Right side) */}
            <motion.section variants={rightVariants} className="finbro-card item-total-orders" style={{ padding: '1.5rem' }}>
              <div style={{ flex: 1, minHeight: 0 }}>
                <WeatherWidget />
              </div>
            </motion.section>
          </motion.div>
        );

      case "visualize":
        return (
          <Visualization onChartSelect={handleChartSelectFromVisualize} />
        );

      case "charts":
        return (
          <Charts
            data={chartData}
            chartType={selectedChartType}
            onBack={() => setActiveSection("visualize")}
          />
        );

      case "ai":
        return <div className="ai-chat-section-container" style={{ height: 'calc(105vh - 150px)' }}>
          <SmartDashboardAI isFullPage={true} isMainSidebarOpen={!isSidebarHidden} />
        </div>;

      case "settings":
        return <div style={{ padding: '2rem', color: 'var(--text-primary)' }}>Settings Placeholder</div>;

      default:
        return null;
    }
  };

  return (
    <div className="finbro-dashboard-container">
      {/* Sidebar */}
      <aside className={`finbro-sidebar ${isSidebarHidden ? "collapsed" : ""}`}>
        <div
          className="finbro-logo"
          onClick={handlePrernaClick}
          onDoubleClick={() => navigate("/")}
          style={{ cursor: "pointer", transition: 'all 0.3s' }}
        >
          {isSidebarHidden ? "P" : "PRERNA"}
        </div>

        <nav className="finbro-nav-menu">
          <button
            className={`finbro-nav-item ${activeSection === "home" ? "active" : ""}`}
            onClick={() => setActiveSection("home")}
            title="Home"
          >
            <span className="sidebar-icon-wrapper">
              <LayoutDashboard />
            </span>
            {!isSidebarHidden && <span>HOME</span>}
          </button>

          <button
            className={`finbro-nav-item ${activeSection === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveSection("dashboard")}
            title="Dashboard"
          >
            <span className="sidebar-icon-wrapper">
              <BarChart2 />
            </span>
            {!isSidebarHidden && <span>DASHBOARD</span>}
          </button>

          <button
            className={`finbro-nav-item ${activeSection === "visualize" ? "active" : ""}`}
            onClick={() => setActiveSection("visualize")}
            title="Visualization"
          >
            <span className="sidebar-icon-wrapper">
              <Rabbit />
            </span>
            {!isSidebarHidden && <span>VISUALIZATION</span>}
          </button>

          <button
            className={`finbro-nav-item ${activeSection === "charts" ? "active" : ""}`}
            onClick={() => setActiveSection("charts")}
            title="Charts"
          >
            <span className="sidebar-icon-wrapper">
              <Box />
            </span>
            {!isSidebarHidden && <span>CHARTS</span>}
          </button>

          <button
            className={`finbro-nav-item ${activeSection === "ai" ? "active" : ""}`}
            onClick={() => setActiveSection("ai")}
            title="AI Assistant"
          >
            <span className="sidebar-icon-wrapper">
              <Sparkles className={activeSection === "ai" ? "" : "ai-pulse-icon"} />
            </span>
            {!isSidebarHidden && <span>AI ASSISTANT</span>}
          </button>

          <button
            className="finbro-nav-item"
            onClick={toggleTheme}
            title="Toggle Theme"
          >
            <span className="sidebar-icon-wrapper">
              {isDarkMode ? <Sun /> : <Moon />}
            </span>
            {!isSidebarHidden && <span>{isDarkMode ? "LIGHT MODE" : "DARK MODE"}</span>}
          </button>

          <div className="finbro-nav-group-bottom">
            <div className="relative" ref={dropdownRef} style={{ width: '100%' }}>
              <button
                className={`finbro-nav-item ${dropdownOpen ? "active" : ""}`}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                title="User Profile"
              >
                <span className="sidebar-icon-wrapper">
                  <User />
                </span>
                {!isSidebarHidden && <span>MY PROFILE</span>}
              </button>

              {dropdownOpen && (
                <div className="finbro-dropdown-menu sidebar-dropdown">
                  <div className="finbro-dropdown-header">
                    <div className="finbro-dropdown-avatar">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div className="finbro-user-info">
                      <p className="finbro-user-name">{user?.name || "User"}</p>
                      <p className="finbro-user-email">{user?.email}</p>
                    </div>
                  </div>

                  <button className="finbro-dropdown-item" onClick={handleSwitchAccount}>
                    <SwitchCamera size={18} /> Switch Account
                  </button>
                  <button className="finbro-dropdown-item" onClick={() => setActiveSection("settings")}>
                    <Settings size={18} /> Settings
                  </button>
                  <button className="finbro-dropdown-item">
                    <HelpCircle size={18} /> Help
                  </button>
                  <button className="finbro-dropdown-item">
                    <MessageSquare size={18} /> Feedback
                  </button>
                  <button className="finbro-dropdown-item" onClick={handleLogout}>
                    <LogOut size={18} /> Log Out
                  </button>
                </div>
              )}
            </div>
            <button className="finbro-nav-item" onClick={handleLogout} title="Logout">
              <span className="sidebar-icon-wrapper">
                <LogOut />
              </span>
              {!isSidebarHidden && <span>LOGOUT</span>}
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="finbro-main">
        {/* <header className="finbro-header">

          <button
            className="smart-ai-toggle header-variant"
            onClick={() => window.dispatchEvent(new CustomEvent('open-smart-ai'))}
            title="AI Assistant"
          >
            <Sparkles />
          </button>

          <button className="finbro-theme-btn" onClick={toggleTheme} title="Toggle Theme">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              className="finbro-avatar-btn"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </button>

            {dropdownOpen && (
              <div className="finbro-dropdown-menu">
                <div className="finbro-dropdown-header">
                  <div className="finbro-dropdown-avatar">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="finbro-user-info">
                    <p className="finbro-user-name">{user?.name || "User"}</p>
                    <p className="finbro-user-email">{user?.email}</p>
                  </div>
                </div>

                <button className="finbro-dropdown-item" onClick={handleSwitchAccount}>
                  <SwitchCamera size={18} /> Switch Account
                </button>
                <button className="finbro-dropdown-item">
                  <Settings size={18} /> Settings
                </button>
                <button className="finbro-dropdown-item">
                  <HelpCircle size={18} /> Help
                </button>
                <button className="finbro-dropdown-item">
                  <MessageSquare size={18} /> Send Feedback
                </button>
                <button className="finbro-dropdown-item" onClick={handleLogout}>
                  <LogOut size={18} /> Log Out
                </button>
              </div>
            )}
          </div>
        </header> */}

        <AnimatePresence>
          {selectedChartData && (
            <motion.div
              id="chart-data-sidebar"
              initial={{ x: 350, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 350, opacity: 0 }}
              style={{
                position: 'fixed',
                top: '0',
                right: '0',
                left: 'auto',
                height: '100vh',
                width: '320px',
                background: 'rgba(20,20,20,0.95)',
                backdropFilter: 'blur(10px)',
                borderLeft: '1px solid var(--border-color)',
                zIndex: 1100, // keep on top
                padding: '24px',
                boxShadow: '-15px 0 40px rgba(0,0,0,0.3)',
                overflowY: 'auto',
                color: 'white',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexShrink: 0 }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>Data Details</h3>
                <button
                  onClick={() => setSelectedChartData(null)}
                  style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1.5rem', padding: 0, lineHeight: 1 }}
                >
                  &times;
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '15px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Metrics</h4>
                  {Object.keys(selectedChartData).map(key => {
                    if (['payload', 'background', 'tooltipPayload', 'tooltipPosition', 'stroke', 'fill', 'x', 'y', 'width', 'height', 'cx', 'cy', 'name'].includes(key)) return null;
                    const val = selectedChartData[key];
                    if (val === undefined || val === null || typeof val === 'object') return null;
                    return (
                      <div key={key} style={{ marginBottom: '15px', background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '0.8rem', color: '#aaa', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>{key}</div>
                        <div style={{ fontWeight: 600, fontSize: '1.1rem', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{String(val)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Section at the bottom */}
              <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', flexShrink: 0 }}>
                <h4 style={{ color: 'white', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                  <Sparkles size={18} color="#7d6ce8" /> AI Assistant
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '15px', lineHeight: '1.4' }}>Ask a question or request an analysis about this specific data point.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {aiResponse && (
                    <div style={{ marginBottom: '5px', padding: '12px 14px', background: 'rgba(125, 108, 232, 0.15)', borderRadius: '8px', border: '1px solid rgba(125, 108, 232, 0.3)', fontSize: '0.85rem', color: 'white', lineHeight: '1.4' }}>
                      {aiResponse}
                    </div>
                  )}
                  <input type="text" value={aiQuery} onChange={(e) => setAiQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAskAI()} placeholder="E.g., Why is this value high?" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: 'white', fontSize: '0.9rem', width: '100%', outline: 'none' }} />
                  <button disabled={isAiLoading || !aiQuery.trim()} style={{ background: isAiLoading || !aiQuery.trim() ? '#555' : 'var(--accent-color, #7d6ce8)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: isAiLoading || !aiQuery.trim() ? 'not-allowed' : 'pointer', fontWeight: 600, transition: 'background 0.2s' }} onClick={(e) => {
                    if (!isAiLoading && aiQuery.trim()) {
                      e.target.style.background = '#6554c0';
                      setTimeout(() => e.target.style.background = 'var(--accent-color, #7d6ce8)', 200);
                      handleAskAI();
                    }
                  }}>
                    {isAiLoading ? 'Thinking...' : 'Ask AI'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>

      </main>
    </div >
  );
};

export default FinbroDashboard;
