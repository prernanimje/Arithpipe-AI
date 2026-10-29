import React, { useState, useEffect } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
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
  CartesianGrid,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap,
  Sankey,
  Cell,
  ReferenceLine,
  Legend
} from "recharts";
import { Download, FileText, FileSpreadsheet, Check, ChevronLeft, Moon, Sun, Sparkles, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import "../styles/chartConfig.css";

const NEON_PALETTE = ['#4361ee', '#f72585', '#7209b7', '#4cc9f0', '#f8961e', '#3a0ca3'];

const CustomXAxisTick = ({ x, y, payload }) => {
  if (!payload || payload.value === undefined || payload.value === null) return null;
  const value = payload.value;
  let text = String(value).trim();

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="middle"
        fill="var(--text-secondary, #888)"
        fontSize={11}
        style={{ fontWeight: 500 }}
      >
        {text.length > 15 ? text.substring(0, 12) + "..." : text}
      </text>
    </g>
  );
};

const CustomMultiDropdown = ({ options, value = [], onChange, width = "160px" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (optValue) => {
    if (value.includes(optValue)) {
      onChange(value.filter(v => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  const displayLabel = value.length === 0 ? "Select Y Axis" : (value.length === 1 ? value[0] : `${value.length} selected`);

  return (
    <div className="custom-dropdown-container" ref={dropdownRef} style={{ width }}>
      <div
        className={`custom-dropdown-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayLabel}</span>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="custom-dropdown-menu"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {options.map((opt) => {
              const isSelected = value.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  className={`custom-dropdown-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleOption(opt.value)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt.label || opt.value}</span>
                  {isSelected && <Check size={14} color="#f72585" />}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CustomDropdown = ({ options, value, onChange, width = "160px" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className="custom-dropdown-container" ref={dropdownRef} style={{ width }}>
      <div
        className={`custom-dropdown-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedOption?.label || selectedOption?.value || value}
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="custom-dropdown-menu"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {options.map((opt) => (
              <div
                key={opt.value}
                className={`custom-dropdown-item ${value === opt.value ? 'selected' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label || opt.value}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ChartConfig = ({ data: propData, chartType: propChartType, onBack }) => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();

  // file_id priority: router state -> localStorage
  const fileId = state?.fileId || localStorage.getItem("currentFileId");

  // rawData priority: prop -> router state -> localStorage -> empty
  const localData = propData || state?.data || JSON.parse(localStorage.getItem("currentChartData") || "[]");

  const [rawData, setRawData] = useState(localData);
  const [columns, setColumns] = useState(
    localData.length ? Object.keys(localData[0]) : []
  );
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [selectedChartData, setSelectedChartData] = useState(null);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);

  // ✅ Fetch columns (and full rows) from DB if file_id is available
  useEffect(() => {
    if (!fileId) return;
    setColumnsLoading(true);

    // Fetch column names
    fetch(`http://localhost:8000/upload/${fileId}/columns`)
      .then(res => res.json())
      .then(data => {
        if (data.columns && data.columns.length > 0) {
          setColumns(data.columns);
        }
      })
      .catch(err => console.warn("Could not fetch columns from DB:", err))
      .finally(() => setColumnsLoading(false));

    // Fetch full row data from DB (Sampled for big data performance)
    fetch(`http://localhost:8000/upload/${fileId}/rows?sample=true`)
      .then(res => res.json())
      .then(data => {
        if (data.rows) {
          setRawData(data.rows);
          if (data.total_rows) {
            setTotalRows(data.total_rows);
          }
          // Also update localStorage for charts that rely on it
          localStorage.setItem("currentChartData", JSON.stringify(data.rows));
        }
      })
      .catch(err => console.warn("Could not fetch rows from DB:", err));
  }, [fileId]);

  // Removed redundant definition of totalRows below

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

  const isDataBig = rawData.length >= 3000;
  const initialChart = propChartType || state?.chartType || "";

  const [chartType, setChartType] = useState(initialChart);
  const [xAxis, setXAxis] = useState("");
  const [yAxis, setYAxis] = useState([]);

  useEffect(() => {
    if (initialChart) {
      setChartType(initialChart);
      setTempChartType(initialChart);
    }
  }, [initialChart]);

  const isStandalone = !onBack;
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const isConfigComplete =
    chartType &&
    (chartType === "pie" || chartType === "radar"
      ? yAxis.length > 0
      : xAxis && yAxis.length > 0);
  const [tempChartType, setTempChartType] = useState(initialChart);
  const [tempXAxis, setTempXAxis] = useState("");
  const [tempYAxis, setTempYAxis] = useState([]);
  const chartRef = useRef(null);

  /* ✅ BIG DATA PROCESSING + NaN SANITIZATION ✅ */
  const processedData = React.useMemo(() => {
    // Helper: coerce a raw value to a clean finite number
    const toNum = (val) => {
      if (val === null || val === undefined || val === '') return 0;
      const n = typeof val === 'string'
        ? parseFloat(val.replace(/[$,%\s]/g, '').replace(/,/g, ''))
        : Number(val);
      return isFinite(n) ? n : 0;
    };
    // Helper: coerce a value to a non-NaN string
    const toStr = (val) => (val === null || val === undefined || (typeof val === 'number' && isNaN(val))) ? '' : String(val);

    const sanitize = (rows) =>
      rows.map(row => {
        const clean = { ...row };
        // Sanitize every key: strings stay strings, numbers become valid floats
        Object.keys(clean).forEach(k => {
          const v = clean[k];
          if (typeof v === 'number') {
            clean[k] = isFinite(v) ? v : 0;
          } else if (typeof v === 'string') {
            // Keep as string (label columns); Recharts ignores non-yAxis keys
            clean[k] = toStr(v);
          } else if (v === null || v === undefined) {
            clean[k] = '';
          }
        });
        // Force yAxis column to be a proper number
        if (yAxis && yAxis.length > 0) {
          yAxis.forEach(yKey => {
            if (clean[yKey] !== undefined) {
              clean[yKey] = toNum(clean[yKey]);
            }
          });
        }
        return clean;
      });

    if (isDataBig && xAxis && yAxis.length > 0) {
      const labelGroups = {};
      rawData.forEach(item => {
        const xVal = toStr(item[xAxis]);

        if (!labelGroups[xVal]) {
          labelGroups[xVal] = { [xAxis]: xVal, count: 0 };
          yAxis.forEach(yKey => { labelGroups[xVal][yKey] = 0; });
        }
        yAxis.forEach(yKey => {
          labelGroups[xVal][yKey] += toNum(item[yKey]);
        });
        labelGroups[xVal].count += 1;
      });

      const uniqueLabelsCount = Object.keys(labelGroups).length;
      if (uniqueLabelsCount < 100) {
        return Object.values(labelGroups).map(g => {
          const row = { [xAxis]: g[xAxis] };
          yAxis.forEach(yKey => { row[yKey] = g[yKey]; });
          return row;
        });
      } else {
        const step = Math.ceil(rawData.length / 1000);
        return sanitize(rawData.filter((_, i) => i % step === 0));
      }
    }

    return sanitize(rawData);
  }, [rawData, xAxis, yAxis, isDataBig]);


  const showAxis = !["pie", "radar"].includes(tempChartType);


  // ✅ SYNC AXES WITH COLUMNS & AUTO-SELECT
  useEffect(() => {
    if (!columns.length || !rawData.length) return;

    // Check if current selections are still valid for these columns
    const isXValid = columns.includes(xAxis);
    const isYValid = yAxis.every(y => columns.includes(y));

    if (!isXValid || !isYValid || !xAxis || !yAxis.length) {
      // Find a good X axis (prefer non-numeric for labels)
      const isNumberColumn = (col) => rawData.slice(0, 50).some(row => {
        const val = row[col];
        if (typeof val === 'number') return true;
        if (typeof val === 'string' && val.trim() !== '') {
          return !isNaN(parseFloat(val.replace(/[$,%]/g, '')));
        }
        return false;
      });

      const labelCol = columns.find(col => !isNumberColumn(col)) || columns[0];
      const numericCols = columns.filter(col => col !== labelCol && isNumberColumn(col));

      const newX = labelCol;
      const newY = numericCols.length > 0 ? [numericCols[0]] : [columns[Math.min(1, columns.length - 1)]];

      setXAxis(newX);
      setTempXAxis(newX);
      setYAxis(newY);
      setTempYAxis(newY);

      if (!chartType || chartType === "") {
        setChartType("bar");
        setTempChartType("bar");
      }
    }
  }, [columns, rawData]);

  useEffect(() => {
    function handleClickOutside(event) {
      const isChartShapeClick = event.target.closest && (event.target.closest('.recharts-bar-rectangle') || event.target.closest('.recharts-rectangle') || event.target.closest('.recharts-layer') || event.target.closest('.recharts-wrapper') || event.target.closest('.recharts-surface'));
      const dataSidebar = document.getElementById('chart-config-data-sidebar');
      if (dataSidebar && !dataSidebar.contains(event.target) && !isChartShapeClick) {
        setSelectedChartData(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ AUTH CHECK (After Hooks)
  if (!user && isStandalone) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <Sparkles size={64} color="#78176b" />
        <h2 style={{ fontSize: '1.8rem' }}>Welcome to Arithpipe</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Please log in to use the Advanced Chart Configurator.</p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/")}
          style={{ background: '#78176b', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}
        >
          Go to Login
        </motion.button>
      </div>
    );
  }

  /* ---------- CHART RENDER ---------- */
  const renderChart = () => {
    if (!processedData.length) return null;

    const setChartDataIfValid = (label, value, payloadData) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        setSelectedChartData({ label: label || 'Data Point', value: value, ...payloadData });
      }
    };

    let yMin = null, yMax = null, yAvg = null;
    if (processedData.length > 0 && yAxis.length > 0) {
      const yValues = processedData.map(d => d[yAxis[0]]).filter(v => typeof v === 'number');
      if (yValues.length > 0) {
        yMin = Math.min(...yValues);
        yMax = Math.max(...yValues);
        const sum = yValues.reduce((a, b) => a + b, 0);
        yAvg = sum / yValues.length;
      }
    }

    const renderReferenceLines = () => (
      <>
        {yMin !== null && <ReferenceLine y={yMin} stroke="#ff4d4f" strokeDasharray="4 4" label={{ position: 'bottom', value: `Min: ${yMin.toFixed(2)}`, fill: '#ff4d4f', fontSize: 12, fontWeight: 500 }} />}
        {yMax !== null && <ReferenceLine y={yMax} stroke="#52c41a" strokeDasharray="4 4" label={{ position: 'top', value: `Max: ${yMax.toFixed(2)}`, fill: '#52c41a', fontSize: 12, fontWeight: 500 }} />}
        {yAvg !== null && <ReferenceLine y={yAvg} stroke="#1890ff" strokeDasharray="4 4" label={{ position: 'insideTopLeft', value: `Avg: ${yAvg.toFixed(2)}`, fill: '#1890ff', fontSize: 12, fontWeight: 500 }} />}
      </>
    );

    switch (chartType) {
      case "bar":
        return (
          <BarChart data={processedData} barSize={yAxis.length > 1 ? undefined : 45} margin={{ top: 10, right: 60, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color, #eaeaea)" />
            <XAxis dataKey={xAxis} tick={<CustomXAxisTick />} height={60} interval={0} />
            <YAxis yAxisId="left" />
            {yAxis.length > 1 && <YAxis yAxisId="right" orientation="right" />}
            <Tooltip cursor={{ fill: 'transparent' }} />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
            {renderReferenceLines()}
            {yAxis.map((yKey, idx) => (
              <Bar
                key={yKey}
                name={yKey}
                dataKey={yKey}
                yAxisId={idx === 1 ? "right" : "left"}
                radius={[10, 10, 0, 0]}
                fill={NEON_PALETTE[idx % NEON_PALETTE.length]}
                style={{ cursor: 'pointer' }}
                onClick={(data) => {
                  const val = data.value !== undefined ? data.value : (data.payload ? data.payload[yKey] : data[yKey]);
                  setChartDataIfValid(data.payload ? (data.payload[xAxis] || data.payload.label) : (data.name || data[xAxis]), val, data.payload);
                }}>
                {yAxis.length === 1 && processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={NEON_PALETTE[index % NEON_PALETTE.length]} />
                ))}
              </Bar>
            ))}
          </BarChart>
        );

      case "line":
        return (
          <LineChart data={processedData} margin={{ top: 10, right: 60, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color, #eaeaea)" />
            <XAxis dataKey={xAxis} tick={<CustomXAxisTick />} height={60} interval={0} />
            <YAxis yAxisId="left" />
            {yAxis.length > 1 && <YAxis yAxisId="right" orientation="right" />}
            <Tooltip />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
            {renderReferenceLines()}
            {yAxis.map((yKey, idx) => (
              <Line
                key={yKey}
                name={yKey}
                type="monotone"
                dataKey={yKey}
                yAxisId={idx === 1 ? "right" : "left"}
                stroke={NEON_PALETTE[idx % NEON_PALETTE.length]}
                strokeWidth={3}
                dot={false}
                activeDot={{
                  onClick: (e, payload) => {
                    if (payload && payload.payload) {
                      const data = payload.payload;
                      const val = data[yKey] !== undefined ? data[yKey] : data.value;
                      setChartDataIfValid(data[xAxis] || data.label || data.name, val, data);
                    }
                  }
                }} />
            ))}
          </LineChart>
        );

      case "horizontalBar":
        return (
          <BarChart data={processedData} layout="vertical" barSize={yAxis.length > 1 ? undefined : 45} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color, #eaeaea)" />
            <XAxis type="number" />
            <YAxis dataKey={xAxis} type="category" width={80} />
            <Tooltip cursor={{ fill: 'transparent' }} />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
            {yAxis.map((yKey, idx) => (
              <Bar key={yKey} name={yKey} dataKey={yKey} radius={[0, 10, 10, 0]} fill={NEON_PALETTE[idx % NEON_PALETTE.length]} style={{ cursor: 'pointer' }} onClick={(data) => {
                const val = data.value !== undefined ? data.value : (data.payload ? data.payload[yKey] : data[yKey]);
                setChartDataIfValid(data.payload ? (data.payload[xAxis] || data.payload.label) : (data.name || data[xAxis]), val, data.payload);
              }}>
                {yAxis.length === 1 && processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={NEON_PALETTE[index % NEON_PALETTE.length]} />
                ))}
              </Bar>
            ))}
          </BarChart>
        );
      case "area":
        return (
          <AreaChart data={processedData} margin={{ top: 10, right: 60, left: 20, bottom: 20 }}>
            <defs>
              {yAxis.map((yKey, idx) => (
                <linearGradient key={`gradient-${idx}`} id={`neonAreaChart-${idx}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={NEON_PALETTE[idx % NEON_PALETTE.length]} stopOpacity={0.6} />
                  <stop offset="95%" stopColor={NEON_PALETTE[idx % NEON_PALETTE.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color, #eaeaea)" />
            <XAxis dataKey={xAxis} tick={<CustomXAxisTick />} height={60} interval={0} />
            <YAxis yAxisId="left" />
            {yAxis.length > 1 && <YAxis yAxisId="right" orientation="right" />}
            <Tooltip />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
            {renderReferenceLines()}
            {yAxis.map((yKey, idx) => (
              <Area
                key={yKey}
                name={yKey}
                type="monotone"
                dataKey={yKey}
                yAxisId={idx === 1 ? "right" : "left"}
                stroke={NEON_PALETTE[idx % NEON_PALETTE.length]}
                fillOpacity={1}
                fill={`url(#neonAreaChart-${idx})`}
                style={{ cursor: 'pointer' }}
                onClick={(data) => {
                  if (data && data.payload) {
                    const val = data.value !== undefined ? data.value : data.payload[yKey];
                    setChartDataIfValid(data.payload[xAxis] || data.payload.label || data.name, val, data.payload);
                  } else if (data) {
                    const val = data.value !== undefined ? data.value : data[yKey];
                    setChartDataIfValid(data.name || data[xAxis], val, data);
                  }
                }} />
            ))}
          </AreaChart>
        );

      case "composed":
        return (
          <ComposedChart data={processedData} margin={{ top: 10, right: 60, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color, #eaeaea)" />
            <XAxis dataKey={xAxis} tick={<CustomXAxisTick />} height={60} interval={0} />
            <YAxis yAxisId="left" />
            {yAxis.length > 1 && <YAxis yAxisId="right" orientation="right" />}
            <Tooltip />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
            {renderReferenceLines()}
            {yAxis.map((yKey, idx) => idx !== yAxis.length - 1 ? (
              <Bar
                key={yKey}
                name={yKey}
                dataKey={yKey}
                yAxisId={idx === 1 ? "right" : "left"}
                fill={NEON_PALETTE[idx % NEON_PALETTE.length]}
                radius={[10, 10, 0, 0]}
                barSize={20}
                style={{ cursor: 'pointer' }}
                onClick={(data) => {
                  const val = data.value !== undefined ? data.value : (data.payload ? data.payload[yKey] : data[yKey]);
                  setChartDataIfValid(data.payload ? (data.payload[xAxis] || data.payload.label) : (data.name || data[xAxis]), val, data.payload);
                }} />
            ) : (
              <Line
                key={yKey}
                name={yKey}
                type="monotone"
                dataKey={yKey}
                yAxisId={idx === 1 ? "right" : "left"}
                stroke={NEON_PALETTE[idx % NEON_PALETTE.length]}
                strokeWidth={3}
                dot={false}
                activeDot={{
                  onClick: (e, payload) => {
                    if (payload && payload.payload) {
                      const data = payload.payload;
                      const val = data[yKey] !== undefined ? data[yKey] : data.value;
                      setChartDataIfValid(data[xAxis] || data.label || data.name, val, data);
                    }
                  }
                }} />
            ))}
          </ComposedChart>
        );

      case "pie":
        return (
          <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <Tooltip />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
            <Pie
              data={processedData}
              dataKey={yAxis[0] || ""}
              nameKey={xAxis}
              stroke="none"
              label={({ name }) => name ? name.toString() : ""}
              style={{ cursor: 'pointer' }}
              onClick={(data) => {
                if (data && data.payload) {
                  const val = data.value !== undefined ? data.value : data.payload[yAxis[0]];
                  setChartDataIfValid(data.payload[xAxis] || data.payload.label || data.name, val, data.payload);
                } else if (data) {
                  const val = data.value !== undefined ? data.value : data[yAxis[0]];
                  setChartDataIfValid(data.name || data[xAxis], val, data);
                }
              }}
            >
              {processedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={NEON_PALETTE[index % NEON_PALETTE.length]} />
              ))}
            </Pie>
          </PieChart>
        );

      case "scatter":
        return (
          <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #eaeaea)" />
            <XAxis dataKey={xAxis} tick={<CustomXAxisTick />} height={60} interval={0} />
            <YAxis />
            <Tooltip />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
            {yAxis.map((yKey, idx) => (
              <Scatter key={yKey} name={yKey} data={processedData} dataKey={yKey} fill={NEON_PALETTE[idx % NEON_PALETTE.length]} style={{ cursor: 'pointer' }} onClick={(data) => {
                if (data && data.payload) {
                  const val = data.value !== undefined ? data.value : data.payload[yKey];
                  setChartDataIfValid(data.payload[xAxis] || data.payload.label || data.name, val, data.payload);
                } else if (data) {
                  const val = data.value !== undefined ? data.value : data[yKey];
                  setChartDataIfValid(data.name || data[xAxis], val, data);
                }
              }}>
                {yAxis.length === 1 && processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={NEON_PALETTE[index % NEON_PALETTE.length]} />
                ))}
              </Scatter>
            ))}
          </ScatterChart>
        );

      case "radar":
        return (
          <RadarChart data={processedData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <PolarGrid />
            <PolarAngleAxis dataKey={xAxis} />
            <PolarRadiusAxis />
            <Tooltip />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
            {yAxis.map((yKey, idx) => (
              <Radar
                key={yKey}
                name={yKey}
                dataKey={yKey}
                stroke={NEON_PALETTE[idx % NEON_PALETTE.length]}
                fill={NEON_PALETTE[idx % NEON_PALETTE.length]}
                fillOpacity={0.6}
                style={{ cursor: 'pointer' }}
                onClick={(data) => {
                  if (data && data.payload) {
                    const val = data.value !== undefined ? data.value : data.payload[yKey];
                    setChartDataIfValid(data.payload[xAxis] || data.payload.label || data.name, val, data.payload);
                  } else if (data) {
                    const val = data.value !== undefined ? data.value : data[yKey];
                    setChartDataIfValid(data.name || data[xAxis], val, data);
                  }
                }}
              />
            ))}
          </RadarChart>
        );
      case "treemap":
        return (
          <Treemap
            data={processedData}
            dataKey={yAxis[0] || ""}
            nameKey={xAxis}
            stroke="#fff"
            fill={NEON_PALETTE[3]}
            style={{ cursor: 'pointer' }}
            onClick={(data) => {
              if (data) {
                const val = data.value !== undefined ? data.value : data[yAxis[0]];
                setChartDataIfValid(data.name || data.root?.name, val, data);
              }
            }}
          />
        );
      case "zoomLine":
        return (
          <LineChart data={processedData} margin={{ top: 10, right: 60, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color, #eaeaea)" />
            <XAxis dataKey={xAxis} tick={<CustomXAxisTick />} height={60} interval={0} />
            <YAxis yAxisId="left" />
            {yAxis.length > 1 && <YAxis yAxisId="right" orientation="right" />}
            <Tooltip />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
            {renderReferenceLines()}
            {yAxis.map((yKey, idx) => (
              <Line
                key={yKey}
                name={yKey}
                type="monotone"
                dataKey={yKey}
                yAxisId={idx === 1 ? "right" : "left"}
                stroke={NEON_PALETTE[(idx + 3) % NEON_PALETTE.length]}
                dot={false}
                strokeWidth={2}
                activeDot={{
                  onClick: (e, payload) => {
                    if (payload && payload.payload) {
                      const data = payload.payload;
                      const val = data[yKey] !== undefined ? data[yKey] : data.value;
                      setChartDataIfValid(data[xAxis] || data.label || data.name, val, data);
                    }
                  }
                }} />
            ))}
          </LineChart>
        );
      case "heatmap":
        return (
          <ScatterChart margin={{ top: 10, right: 60, left: 20, bottom: 20 }}>
            <XAxis dataKey={xAxis} tick={<CustomXAxisTick />} height={60} interval={0} />
            <YAxis yAxisId="left" />
            {yAxis.length > 1 && <YAxis yAxisId="right" orientation="right" />}
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            {yAxis.map((yKey, idx) => (
              <Scatter
                key={yKey}
                name={yKey}
                data={processedData}
                dataKey={yKey}
                yAxisId={idx === 1 ? "right" : "left"}
                fill={NEON_PALETTE[idx % NEON_PALETTE.length]}
                style={{ cursor: 'pointer' }}
                onClick={(data) => {
                  if (data && data.payload) {
                    const val = data.value !== undefined ? data.value : data.payload[yKey];
                    setChartDataIfValid(data.payload[xAxis] || data.payload.label || data.name, val, data.payload);
                  } else if (data) {
                    const val = data.value !== undefined ? data.value : data[yKey];
                    setChartDataIfValid(data.name || data[xAxis], val, data);
                  }
                }}>
                {yAxis.length === 1 && processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={NEON_PALETTE[index % NEON_PALETTE.length]} />
                ))}
              </Scatter>
            ))}
          </ScatterChart>
        );
      case "timeSeries":
        return (
          <AreaChart data={processedData} margin={{ top: 10, right: 60, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color, #eaeaea)" />
            <XAxis dataKey={xAxis} tick={<CustomXAxisTick />} height={60} interval={0} />
            <YAxis yAxisId="left" />
            {yAxis.length > 1 && <YAxis yAxisId="right" orientation="right" />}
            <Tooltip />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
            {renderReferenceLines()}
            {yAxis.map((yKey, idx) => (
              <Area
                key={yKey}
                name={yKey}
                type="monotone"
                dataKey={yKey}
                yAxisId={idx === 1 ? "right" : "left"}
                stroke={NEON_PALETTE[(idx + 2) % NEON_PALETTE.length]}
                fill={NEON_PALETTE[(idx + 2) % NEON_PALETTE.length]}
                fillOpacity={0.4}
                style={{ cursor: 'pointer' }}
                onClick={(data) => {
                  if (data && data.payload) {
                    const val = data.value !== undefined ? data.value : data.payload[yKey];
                    setChartDataIfValid(data.payload[xAxis] || data.payload.label || data.name, val, data.payload);
                  } else if (data) {
                    const val = data.value !== undefined ? data.value : data[yKey];
                    setChartDataIfValid(data.name || data[xAxis], val, data);
                  }
                }} />
            ))}
          </AreaChart>
        );
      case "sankey":
        return (
          <Treemap
            data={processedData}
            dataKey={yAxis[0] || ""}
            nameKey={xAxis}
            stroke="#fff"
            fill={NEON_PALETTE[4]}
            style={{ cursor: 'pointer' }}
            onClick={(data) => {
              if (data) {
                const val = data.value !== undefined ? data.value : data[yAxis[0]];
                setChartDataIfValid(data.name || data.root?.name, val, data);
              }
            }}
          />
        );
      case "hexbin":
        return (
          <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <XAxis dataKey={xAxis} tick={<CustomXAxisTick />} interval={0} />
            <YAxis dataKey={yAxis[0] || ""} />
            <Tooltip />
            {yAxis.map((yKey, idx) => (
              <Scatter key={yKey} name={yKey} data={processedData} dataKey={yKey} fill={NEON_PALETTE[(idx + 5) % NEON_PALETTE.length]} style={{ cursor: 'pointer' }} onClick={(data) => {
                if (data && data.payload) {
                  const val = data.value !== undefined ? data.value : data.payload[yKey];
                  setChartDataIfValid(data.payload[xAxis] || data.payload.label || data.name, val, data.payload);
                } else if (data) {
                  const val = data.value !== undefined ? data.value : data[yKey];
                  setChartDataIfValid(data.name || data[xAxis], val, data);
                }
              }}>
                {yAxis.length === 1 && processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={NEON_PALETTE[index % NEON_PALETTE.length]} />
                ))}
              </Scatter>
            ))}
          </ScatterChart>
        );

      default:
        return null;
    }
  };

  /* ================= EXPORT FEATURES ================= */

  // 🔹 Download PNG
  const downloadPNG = async () => {
    const chartElement = chartRef.current;
    if (!chartElement) return;

    const canvas = await html2canvas(chartElement);
    const image = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = image;
    link.download = "chart.png";
    link.click();
  };

  // 🔹 Download PDF
  const downloadPDF = async () => {
    const chartElement = chartRef.current;
    if (!chartElement) return;

    const canvas = await html2canvas(chartElement);
    const image = canvas.toDataURL("image/png");

    const pdf = new jsPDF("landscape");
    pdf.addImage(image, "PNG", 10, 10, 270, 150);
    pdf.save("chart.pdf");
  };

  // 🔹 Export CSV
  const exportCSV = () => {
    if (!processedData.length) return;

    const headers = Object.keys(processedData[0]).join(",");
    const rows = processedData.map(row =>
      Object.values(row).join(",")
    );

    const csvContent = [headers, ...rows].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "chart-data.csv";
    link.click();
  };

  return (
    <motion.div
      className={`config-page ${isStandalone ? 'standalone' : ''}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <AnimatePresence>
        {selectedChartData && (
          <motion.div
            id="chart-config-data-sidebar"
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
              background: isDarkMode ? 'rgba(20,20,20,0.95)' : 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              borderLeft: '1px solid var(--border-color)',
              zIndex: 1100, // Make sure it is on top
              padding: '24px',
              boxShadow: '-15px 0 40px rgba(0,0,0,0.3)',
              overflowY: 'auto',
              color: 'var(--text-primary)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>Data Details</h3>
              <button
                onClick={() => setSelectedChartData(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem', padding: 0, lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: 'var(--text-secondary)', borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, paddingBottom: '8px', marginBottom: '15px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Metrics</h4>
                {Object.keys(selectedChartData).map(key => {
                  if (['payload', 'background', 'tooltipPayload', 'tooltipPosition', 'stroke', 'fill', 'x', 'y', 'width', 'height', 'cx', 'cy', 'name'].includes(key)) return null;
                  const val = selectedChartData[key];
                  if (val === undefined || val === null || typeof val === 'object') return null;
                  return (
                    <div key={key} style={{ marginBottom: '15px', background: 'var(--bg-active)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>{key}</div>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{String(val)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Section at the bottom */}
            <div style={{ marginTop: 'auto', borderTop: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, paddingTop: '20px', flexShrink: 0 }}>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                <Sparkles size={18} color="#78176b" /> AI Assistant
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '15px', lineHeight: '1.4' }}>Ask a question or request an analysis about this specific data point.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {aiResponse && (
                  <div style={{ marginBottom: '5px', padding: '12px 14px', background: 'rgba(120, 23, 107, 0.15)', borderRadius: '8px', border: '1px solid rgba(120, 23, 107, 0.3)', fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                    {aiResponse}
                  </div>
                )}
                <input type="text" value={aiQuery} onChange={(e) => setAiQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAskAI()} placeholder="E.g., Why is this value high?" style={{ background: 'var(--bg-active)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.9rem', width: '100%', outline: 'none' }} />
                <button disabled={isAiLoading || !aiQuery.trim()} style={{ background: isAiLoading || !aiQuery.trim() ? '#888' : '#78176b', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: isAiLoading || !aiQuery.trim() ? 'not-allowed' : 'pointer', fontWeight: 600, transition: 'background 0.2s' }} onClick={(e) => {
                  if (!isAiLoading && aiQuery.trim()) {
                    e.target.style.background = '#5a1150';
                    setTimeout(() => e.target.style.background = '#78176b', 200);
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

      {/* STANDALONE HEADER */}
      {isStandalone && (
        <motion.header
          className="standalone-header"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 40px',
            background: 'transparent',
            borderBottom: '1px solid var(--border-color)',
            margin: '-10px -40px 8px -40px',
            width: 'calc(100% + 80px)'
          }}>
          <h2 className="logo" onClick={() => navigate("/")} style={{ cursor: 'pointer', color: '#78176b', fontWeight: 800 }}>Arithpipe</h2>
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.dispatchEvent(new CustomEvent('open-smart-ai'))}
              className="smart-ai-toggle header-variant"
              title="AI Assistant"
            >
              <Sparkles />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </motion.button>
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="user-profile-circle"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#78176b',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600
              }}>
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </motion.div>
          </div>
        </motion.header>
      )}

      {/* ================= CONFIG CARD ================= */}
      <motion.div
        className="config-card"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
      >
        {/* Inline Controls Container */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', width: '100%' }}>

          {/* Chart Type */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ margin: 0, whiteSpace: 'nowrap' }}>Type:</label>
            <CustomDropdown
              value={tempChartType}
              onChange={(val) => setTempChartType(val)}
              width="180px"
              options={[
                { value: "bar", label: "Bar Chart" },
                { value: "horizontalBar", label: "Horizontal Bar" },
                { value: "line", label: "Line Chart" },
                { value: "area", label: "Area Chart" },
                { value: "composed", label: "Bar + Line" },
                { value: "pie", label: "Pie Chart" },
                { value: "scatter", label: "Scatter Chart" },
                { value: "radar", label: "Radar Chart" },
                { value: "treemap", label: "Treemap" },
                { value: "zoomLine", label: "Zoom Line" },
                { value: "heatmap", label: "Heatmap" },
                { value: "timeSeries", label: "Time Series" },
                { value: "sankey", label: "Sankey" },
                { value: "hexbin", label: "Hexbin" },
              ]}
            />
          </div>

          {/* Axes — always shown, columns come from the uploaded file via DB */}
          {columnsLoading ? (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #7d6ce8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Loading columns…
            </div>
          ) : columns.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#f72585', opacity: 0.8 }}>
              ⚠ No file loaded — upload a file first
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ margin: 0, whiteSpace: 'nowrap', fontWeight: 600, fontSize: '13px' }}>X Axis:</label>
                <CustomDropdown
                  value={tempXAxis}
                  onChange={(val) => setTempXAxis(val)}
                  width="150px"
                  options={[{ value: "", label: "Select X Axis" }, ...columns.map(col => ({ value: col, label: col }))]}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ margin: 0, whiteSpace: 'nowrap', fontWeight: 600, fontSize: '13px' }}>Y Axis:</label>
                <CustomMultiDropdown
                  value={tempYAxis}
                  onChange={(val) => setTempYAxis(val)}
                  width="150px"
                  options={columns.map(col => ({ value: col, label: col }))}
                />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="config-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="apply-btn"
              onClick={() => {
                setChartType(tempChartType);
                setXAxis(tempXAxis);
                setYAxis(tempYAxis);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Check size={16} /> Apply
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="back-btn"
              onClick={() => {
                if (onBack) onBack();
                else navigate(-1);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ChevronLeft size={16} /> Back
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Floating Export Sidebar */}
      <motion.div
        className="export-sidebar"
        initial={{ x: 120, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 100, damping: 20 }}
        style={{
          right: selectedChartData ? 'auto' : '7px',
          left: selectedChartData ? '91px' : 'auto',
          marginLeft: selectedChartData ? '5px' : '0',
          transition: 'left 0.3s ease, right 0.3s ease, margin-left 0.3s ease'
        }}
      >
        <motion.button whileHover={{ scale: 1.1, x: selectedChartData ? 8 : -8 }} className="but-png" title="Download PNG" onClick={downloadPNG}>
          <Download size={18} />
        </motion.button>
        <motion.button whileHover={{ scale: 1.1, x: selectedChartData ? 8 : -8 }} className="but-pdf" title="Download PDF" onClick={downloadPDF}>
          <FileText size={18} />
        </motion.button>
        <motion.button whileHover={{ scale: 1.1, x: selectedChartData ? 8 : -8 }} className="but-csv" title="Export CSV" onClick={exportCSV}>
          <FileSpreadsheet size={18} />
        </motion.button>
      </motion.div>

      {/* ================= PREVIEW ================= */}
      <motion.div
        className="chart-preview"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        {totalRows > rawData.length && (
          <div style={{
            background: 'rgba(248, 150, 30, 0.1)',
            border: '1px solid #f8961e',
            color: '#f8961e',
            padding: '8px 15px',
            borderRadius: '8px',
            fontSize: '12px',
            marginBottom: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Sparkles size={14} />
            Optimized View: Large dataset ({totalRows.toLocaleString()} rows) detected. Showing a representative sample for better performance.
          </div>
        )}
        <motion.h3
          initial={{ opacity: 0, x: -25 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          Preview
        </motion.h3>

        <motion.div
          ref={chartRef}
          className="chart-contain"
          layout
          transition={{
            layout: { duration: 0.4, ease: "easeOut" }
          }}
          style={{ position: 'relative', minHeight: '250px' }}
        >
          {(!xAxis || !yAxis.length || !chartType) ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', color: 'var(--text-secondary)', opacity: 0.8, background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '2px dashed var(--border-color)', minHeight: '250px' }}>
              <Activity size={48} style={{ marginBottom: '15px', color: '#7d6ce8' }} />
              <h4 style={{ margin: 0 }}>Chart Not Specified</h4>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>Please select X and Y axes from the controls above.</p>
            </div>
          ) : !processedData.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', color: 'var(--text-secondary)', opacity: 0.6, minHeight: '250px' }}>
              <Sparkles size={48} style={{ marginBottom: '15px' }} />
              <p>No data available to display.</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${chartType}-${xAxis}-${yAxis}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                style={{ width: '100%', height: '100%' }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  {renderChart()}
                </ResponsiveContainer>
              </motion.div>
            </AnimatePresence>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default ChartConfig;
