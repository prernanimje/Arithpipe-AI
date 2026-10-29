import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  Treemap,
  CartesianGrid,
  Legend
} from "recharts";
import { useTheme } from "../context/ThemeContext";
import { Moon, Sun, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import "../styles/visualize.css";

const CustomXAxisTick = ({ x, y, payload }) => {
  if (!payload || payload.value === undefined || payload.value === null) return null;
  let text = payload.value.toString().trim();
  if (text.length > 3) {
    text = text.substring(0, 3) + "..";
  }
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill="var(--text-secondary, #888)" fontSize={12}>
        {text}
      </text>
    </g>
  );
};

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-primary)',
        padding: '10px 14px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
        color: 'var(--text-primary)',
        fontSize: '12px',
        zIndex: 9999
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px', textTransform: 'capitalize' }}>
          {payload[0].name || payload[0].payload.label}
        </div>
        <div style={{ color: payload[0].fill || payload[0].color || 'var(--text-primary)', fontWeight: 600 }}>
          Value: <span style={{ color: 'var(--text-primary)', fontWeight: 'normal' }}>{payload[0].value}</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomScatterTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload || {};
    return (
      <div style={{
        background: 'var(--bg-primary)',
        padding: '10px 14px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
        color: 'var(--text-primary)',
        fontSize: '12px',
        zIndex: 9999
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px', textTransform: 'capitalize' }}>
          {data.label || payload[0].name || (data.name && typeof data.name === 'string' ? data.name : '')}
        </div>
        {payload.map((entry, idx) => (
          <div key={idx} style={{ color: entry.fill || entry.color || entry.stroke || '#f72585', fontWeight: 600, marginTop: '2px' }}>
            {entry.name || entry.dataKey}: <span style={{ color: 'var(--text-primary)', fontWeight: 'normal' }}>{entry.value !== undefined ? entry.value : data[entry.dataKey]}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const Visuaize = ({ onChartSelect }) => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();

  const [customInput, setCustomInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const fileId = state?.fileId || localStorage.getItem("currentFileId");
  const [data, setData] = useState(state?.chartData || JSON.parse(localStorage.getItem("currentChartData") || "[]"));
  const [filename, setFilename] = useState("");

  const isStandalone = !onChartSelect;
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const xKey = "label";
  const yKey = "value";

  const yColumns = useMemo(() => {
    if (!data.length) return [yKey];
    const columns = Object.keys(data[0]);
    const isNumberColumn = (col) => data.some(row => typeof row[col] === 'number');
    let cols = columns.filter(col => col !== xKey && col !== 'name' && col !== 'id' && isNumberColumn(col));
    if (!cols.length) {
      const backup = columns.filter(isNumberColumn);
      cols = backup.length ? backup : [yKey];
    }
    return cols;
  }, [data, xKey, yKey]);

  const COLORS = ["#78176b", "#ff7a00", "#2ecc71", "#3498db", "#9b59b6", "#e74c3c", "#1abc9c"];

  const [currentIndex, setCurrentIndex] = useState(0);

  const processedData = useMemo(() => {
    if (data.length > 100) {
      const step = Math.ceil(data.length / 100);
      return data.filter((_, i) => i % step === 0);
    }
    return data;
  }, [data]);

  useEffect(() => {
    if (!fileId && data.length === 0) {
      navigate("/");
    }
    if (fileId) {
      fetch(`http://localhost:8000/upload/${fileId}`)
        .then(res => res.json())
        .then(d => setFilename(d.filename))
        .catch(err => console.error("Failed to fetch filename:", err));
    }
  }, [fileId, navigate, data.length]);

  if (!data.length) {
    return <p style={{ padding: 40 }}>No data to visualize</p>;
  }

  // --- CHART DEFINITIONS ---
  const chartItems = useMemo(() => {
    const NEON_PALETTE = ['#4361ee', '#f72585', '#7209b7', '#4cc9f0', '#f8961e', '#3a0ca3'];
    const list = [
      {
        id: "bar",
        title: "Bar Chart",
        content: (
          <div className="viz-chart-container viz-chart-bar">
            <BarChart width={280} height={250} data={processedData} margin={{ top: 10, right: 10, left: 40, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" opacity={0.15} />
              <XAxis dataKey={xKey} tick={<CustomXAxisTick />} height={40} interval={0} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
              <Tooltip content={<CustomScatterTooltip />} cursor={{ fill: 'transparent' }} />
              {yColumns.length > 1 && <Legend wrapperStyle={{ fontSize: '10px' }} />}
              {yColumns.map((col, idx) => (
                <Bar key={col} name={col} dataKey={col} radius={[4, 4, 0, 0]} fill={NEON_PALETTE[idx % NEON_PALETTE.length]}>
                  {yColumns.length === 1 && processedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={NEON_PALETTE[index % NEON_PALETTE.length]} />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </div>
        )
      },
      {
        id: "line",
        title: "Line Chart",
        content: (
          <div className="viz-chart-container viz-chart-line">
            <LineChart width={280} height={250} data={processedData} margin={{ top: 10, right: 10, left: 40, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" opacity={0.15} />
              <XAxis dataKey={xKey} tick={<CustomXAxisTick />} height={40} interval={0} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
              <Tooltip content={<CustomScatterTooltip />} />
              {yColumns.length > 1 && <Legend wrapperStyle={{ fontSize: '10px' }} />}
              {yColumns.map((col, idx) => (
                <Line key={col} name={col} dataKey={col} stroke={NEON_PALETTE[idx % NEON_PALETTE.length]} strokeWidth={3} dot={false} type="monotone" />
              ))}
            </LineChart>
          </div>
        )
      },
      {
        id: "h-bar",
        title: "Horizontal Bar",
        content: (
          <div className="viz-chart-container viz-chart-h-bar">
            <BarChart width={280} height={250} data={processedData} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--chart-grid)" opacity={0.15} />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey={xKey} tick={{ fontSize: 10 }} tickFormatter={(value) => value ? value.toString().trim().split(' ')[0].substring(0, 3) : ""} width={60} />
              <Tooltip content={<CustomScatterTooltip />} cursor={{ fill: 'transparent' }} />
              {yColumns.length > 1 && <Legend wrapperStyle={{ fontSize: '10px' }} />}
              {yColumns.map((col, idx) => (
                <Bar key={col} name={col} dataKey={col} radius={[0, 4, 4, 0]} fill={NEON_PALETTE[idx % NEON_PALETTE.length]}>
                  {yColumns.length === 1 && processedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={NEON_PALETTE[index % NEON_PALETTE.length]} />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </div>
        )
      },
      {
        id: "area",
        title: "Area Chart",
        content: (
          <div className="viz-chart-container viz-chart-area">
            <AreaChart width={280} height={250} data={processedData} margin={{ top: 10, right: 10, left: 40, bottom: 40 }}>
              <defs>
                {yColumns.map((col, idx) => (
                  <linearGradient key={`gradient-${idx}`} id={`neonArea-${idx}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={NEON_PALETTE[idx % NEON_PALETTE.length]} stopOpacity={0.6} />
                    <stop offset="95%" stopColor={NEON_PALETTE[idx % NEON_PALETTE.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" opacity={0.15} />
              <XAxis dataKey={xKey} tick={<CustomXAxisTick />} height={40} interval={0} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
              <Tooltip content={<CustomScatterTooltip />} />
              {yColumns.length > 1 && <Legend wrapperStyle={{ fontSize: '10px' }} />}
              {yColumns.map((col, idx) => (
                <Area key={col} name={col} type="monotone" dataKey={col} stroke={NEON_PALETTE[idx % NEON_PALETTE.length]} strokeWidth={3} fillOpacity={1} fill={`url(#neonArea-${idx})`} />
              ))}
            </AreaChart>
          </div>
        )
      },
      {
        id: "composed",
        title: "Bar + Line",
        content: (
          <div className="viz-chart-container viz-chart-composed">
            <ComposedChart width={280} height={250} data={processedData} margin={{ top: 10, right: 10, left: 40, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" opacity={0.15} />
              <XAxis dataKey={xKey} tick={<CustomXAxisTick />} height={40} minTickGap={5} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
              <Tooltip content={<CustomScatterTooltip />} />
              {yColumns.length > 1 && <Legend wrapperStyle={{ fontSize: '10px' }} />}
              {yColumns.map((col, idx) => idx % 2 === 0 ? (
                <Bar key={col} name={col} dataKey={col} fill={NEON_PALETTE[idx % NEON_PALETTE.length]} radius={[4, 4, 0, 0]} barSize={20} />
              ) : (
                <Line key={col} name={col} type="monotone" dataKey={col} stroke={NEON_PALETTE[idx % NEON_PALETTE.length]} strokeWidth={3} dot={false} />
              ))}
            </ComposedChart>
          </div>
        )
      },
      {
        id: "pie",
        title: "Distribution",
        content: (
          <div className="viz-chart-container viz-chart-pie" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <PieChart width={280} height={230}>
              <Pie data={processedData.slice(0, 8)} dataKey={yColumns[0] || yKey} nameKey={xKey} outerRadius="80%" innerRadius="50%" stroke="none" label={({ name }) => name ? name.toString().trim().split(' ')[0].substring(0, 3) : ""}>
                {processedData.slice(0, 8).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={NEON_PALETTE[index % NEON_PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </div>
        )
      },
      {
        id: "zoomLine",
        title: "Zoom Line (Trends)",
        content: (
          <div className="viz-chart-container viz-chart-zoom">
            <LineChart width={280} height={250} data={processedData} margin={{ top: 10, right: 10, left: 40, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" opacity={0.15} />
              <XAxis dataKey={xKey} tick={<CustomXAxisTick />} height={40} minTickGap={5} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
              <Tooltip content={<CustomScatterTooltip />} />
              {yColumns.length > 1 && <Legend wrapperStyle={{ fontSize: '10px' }} />}
              {yColumns.map((col, idx) => (
                <Line key={col} name={col} type="monotone" dataKey={col} stroke={NEON_PALETTE[(idx + 3) % NEON_PALETTE.length]} dot={false} strokeWidth={3} />
              ))}
            </LineChart>
          </div>
        )
      },
      {
        id: "heatmap",
        title: "Activity Heatmap",
        content: (
          <div className="viz-chart-container viz-chart-heatmap">
            <ScatterChart width={280} height={250} margin={{ top: 20, right: 20, left: 40, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" opacity={0.15} />
              <XAxis dataKey={xKey} tick={<CustomXAxisTick />} height={40} minTickGap={5} />
              <YAxis dataKey={yColumns[0] || yKey} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
              <Tooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              {yColumns.length > 1 && <Legend wrapperStyle={{ fontSize: '10px' }} />}
              {yColumns.map((col, idx) => (
                <Scatter key={col} name={col} data={processedData} dataKey={col} fill={NEON_PALETTE[idx % NEON_PALETTE.length]} />
              ))}
            </ScatterChart>
          </div>
        )
      }
    ];
    return list;
  }, [processedData]);

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % chartItems.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + chartItems.length) % chartItems.length);

  const chartTypesList = [
    { key: "bar", label: "Bar Chart" },
    { key: "line", label: "Line Chart" },
    { key: "area", label: "Area Chart" },
    { key: "horizontalBar", label: "Horizontal Bar Chart" },
    { key: "composed", label: "Bar + Line Chart" },
    { key: "pie", label: "Pie Chart" },
    { key: "scatter", label: "Scatter Chart" },
    { key: "radar", label: "Radar Chart" },
    { key: "treemap", label: "Treemap" },
    { key: "zoomLine", label: "Zoom Line" },
    { key: "heatmap", label: "Heatmap" },
    { key: "timeSeries", label: "Time Series" },
    { key: "sankey", label: "Sankey" },
    { key: "hexbin", label: "Hexbin" },
  ];

  const handleInputChange = (e) => {
    const value = e.target.value;
    setCustomInput(value);
    const filtered = chartTypesList.filter((chart) =>
      chart.label.toLowerCase().includes(value.toLowerCase())
    );
    setSuggestions(value ? filtered : []);
  };

  const handleSubmitChart = () => {
    // 1. Try exact match label or key
    let chart = chartTypesList.find(c =>
      c.label.toLowerCase() === customInput.toLowerCase() ||
      c.key.toLowerCase() === customInput.toLowerCase()
    );

    // 2. Try partial match in chart list
    if (!chart && customInput) {
      chart = chartTypesList.find(c =>
        c.label.toLowerCase().includes(customInput.toLowerCase())
      );
    }

    if (chart) {
      if (!isStandalone && onChartSelect) {
        // Inside Dashboard
        onChartSelect(chart.key, data);
      } else {
        // Standalone
        navigate("/chart-config", { state: { data, chartType: chart.key } });
      }
    } else {
      // Fallback search in carousel items title
      const carouselMatch = chartItems.find(c => c.title.toLowerCase().includes(customInput.toLowerCase()));
      if (carouselMatch) {
        if (!isStandalone && onChartSelect) {
          onChartSelect(carouselMatch.id, data);
        } else {
          navigate("/chart-config", { state: { data, chartType: carouselMatch.id } });
        }
      }
    }
    setCustomInput("");
    setSuggestions([]);
  };

  return (
    <div className={`visualize-page ${isStandalone ? 'standalone' : ''}`}>
      {isStandalone && (
        <header className="standalone-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 40px',
            background: 'transparent',
            borderBottom: '1px solid var(--border-color)',
            margin: '-40px -40px 40px -40px',
            position: 'fixed',
            width: '100%',
            zIndex: 1100
          }}>
          <h2 className="logo" onClick={() => navigate("/")} style={{ cursor: 'pointer', color: '#78176b', fontWeight: 800 }}>Arithpipe</h2>
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button onClick={() => window.dispatchEvent(new CustomEvent('open-smart-ai'))} className="smart-ai-toggle header-variant" title="AI Assistant"><Sparkles /></button>
            <button onClick={toggleTheme} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }} title="Toggle Theme">{isDarkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
            <div className="user-profile-circle" style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#78176b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>{user?.name?.charAt(0)?.toUpperCase() || "U"}</div>
          </div>
        </header>
      )}

      {/* HEADER SECTION */}
      <div className="visualize-heading">
        <div className="heading-title-group" style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
          <h2>Data Visualization</h2>
          {filename && <div className="filename-tag" style={{ padding: '2px 8px', fontSize: '15px', boxShadow: 'none' }}>📄 {filename}</div>}
          {data.length > 100 && (
            <div className="big-data-badge middle-badge">
              <Sparkles size={14} /> Big Data Optimized
            </div>
          )}
        </div>



        <div className="visualize-header">
          <div className="input-wrapper">
            <input type="text" placeholder="Search charts..." value={customInput} onChange={handleInputChange} className="chart-input" />
            {suggestions.length > 0 && (
              <div className="suggestions-box">
                {suggestions.map((s) => (
                  <div
                    key={s.key}
                    className="suggestion-item"
                    onClick={() => {
                      setCustomInput(s.label);
                      setSuggestions([]);
                      // Wait for state update is not reliable, so we find it directly
                      if (!isStandalone && onChartSelect) {
                        onChartSelect(s.key, data);
                      } else {
                        navigate("/chart-config", { state: { data, chartType: s.key } });
                      }
                    }}
                  >
                    {s.label}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="chart-submit-btn" onClick={handleSubmitChart}>Submit</button>
        </div>
      </div>

      {/* 3D CAROUSEL SLIDER */}
      <div className="carousel-main-container">
        <button className="carousel-nav-btn prev-btn" onClick={prevSlide}><ChevronLeft size={32} /></button>

        <div className="carousel-viewport">
          <div className="carousel-track">
            {chartItems.map((item, index) => {
              const position = index - currentIndex;
              const absPosition = Math.abs(position);

              // Only render items close to center for performance and correctly handle wrapping
              // But for simplicity in logic, we'll just use a small window or filter
              // Advanced wrapping logic:
              let displayPosition = position;
              const total = chartItems.length;
              if (position > total / 2) displayPosition -= total;
              if (position < -total / 2) displayPosition += total;

              const isCenter = displayPosition === 0;
              const absDisplayPos = Math.abs(displayPosition);

              if (absDisplayPos > 2) return null; // Hide cards far away

              return (
                <motion.div
                  key={item.id}
                  className={`carousel-item ${isCenter ? 'active' : ''}`}
                  onClick={() => {
                    if (isCenter) {
                      onChartSelect ? onChartSelect(item.id, data) : navigate("/chart-config", { state: { data, chartType: item.id } });
                    }
                  }}
                  initial={false}
                  animate={{
                    x: displayPosition * 250,
                    scale: isCenter ? 1.15 : 0.95,
                    zIndex: 10 - absDisplayPos,
                    opacity: 1 - absDisplayPos * 0.2,
                    rotateY: displayPosition * -20,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20
                  }}
                >
                  <div className="chart-card-slider">
                    <h3 className="chart-title-slider">{item.title}</h3>
                    <div className="chart-content-slider">
                      {item.content}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <button className="carousel-nav-btn next-btn" onClick={nextSlide}><ChevronRight size={32} /></button>

        {/* INDICATORS */}
        <div className="carousel-indicators">
          {chartItems.map((_, i) => (
            <div
              key={i}
              className={`indicator-pill ${i === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Visuaize;
