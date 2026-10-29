import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Legend } from 'recharts';
import '../styles/SmartAI.css';
import {
    MessageCircle,
    X,
    Send,
    Mic,
    Sparkles,
    Paperclip,
    FileText,
    Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CustomXAxisTick = ({ x, y, payload }) => {
    if (!payload || payload.value === undefined || payload.value === null) return null;
    let text = payload.value.toString().trim();
    if (text.length > 3) {
        text = text.substring(0, 3) + "..";
    }
    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={16} textAnchor="middle" fill="#94a3b8" fontSize={12}>
                {text}
            </text>
        </g>
    );
};

const NEON_PALETTE = ['#4361ee', '#f72585', '#7209b7', '#4cc9f0', '#f8961e', '#3a0ca3'];

const SmartDashboardAI = ({ isFullPage = false, isMainSidebarOpen = false }) => {
    const navigate = useNavigate();
    // --- CORE STATE ---
    const [isOpen, setIsOpen] = useState(isFullPage);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [isTyping, setIsTyping] = useState(false);

    // --- REFS ---
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const aiWindowRef = useRef(null);

    // --- SIDEBAR & HISTORY STATE ---
    const [showSidebar, setShowSidebar] = useState(!isMainSidebarOpen); // Default based on main sidebar

    // Sync sidebar state
    useEffect(() => {
        if (isMainSidebarOpen) {
            setShowSidebar(false);
        } else {
            setShowSidebar(true);
        }
    }, [isMainSidebarOpen]);
    const [chatHistory, setChatHistory] = useState([
        { id: '1', title: 'Sales Analysis 2024', timestamp: 'Today', messages: [] },
        { id: '2', title: 'Marketing Forecast', timestamp: 'Yesterday', messages: [] }
    ]);
    const [currentChatId, setCurrentChatId] = useState(null);
    const [lastAnalyzedData, setLastAnalyzedData] = useState(null);

    // Listen for 'open-smart-ai' event from header
    useEffect(() => {
        const handleOpenEvent = () => {
            if (isFullPage) return; // Full page is always open
            setIsOpen(true);
        };
        const handleClickOutside = (event) => {
            if (isOpen && !isFullPage && aiWindowRef.current && !aiWindowRef.current.contains(event.target)) {
                // Check if click was on the trigger button (avoid immediate re-close)
                // We can't easily check the trigger button ref, so we rely on bubbling order or specific class checks if needed.
                // For now, a simple outside check is usually sufficient if the trigger stops propagation, 
                // but let's just close if it's strictly outside.
                setIsOpen(false);
            }
        };

        window.addEventListener('open-smart-ai', handleOpenEvent);
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('open-smart-ai', handleOpenEvent);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isFullPage, isOpen]);

    // Initial load
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (user && user.id) {
            fetchHistory(user.id, true);
        } else {
            if (!currentChatId) createNewChat();
        }
    }, []);

    const fetchHistory = async (userId, shouldReset = false) => {
        try {
            const res = await fetch(`http://127.0.0.1:8000/chat/history?user_id=${userId}`);
            if (res.ok) {
                const history = await res.json();
                setChatHistory(history);
                // Start with default/new chat view instead of auto-loading history
                if (shouldReset) createNewChat();
            } else {
                if (shouldReset) createNewChat();
            }
        } catch (e) {
            console.error("Failed to load history", e);
            if (shouldReset) createNewChat(); // Fallback
        }
    };

    const createNewChat = () => {
        // Use null to signal backend to create a new session
        setCurrentChatId(null);
        setMessages([]);
        setLastAnalyzedData(null);
    };

    const loadChat = async (chatId) => {
        const chat = chatHistory.find(c => c.id === chatId);
        if (chat) {
            setCurrentChatId(chatId);
            setMessages(chat.messages || []); // Optimistic load

            // Fetch full details from DB to ensure sync
            const user = JSON.parse(localStorage.getItem("user"));
            if (user?.id) {
                try {
                    const res = await fetch(`http://127.0.0.1:8000/chat/session/${chatId}?user_id=${user.id}`);
                    if (res.ok) {
                        const data = await res.json();
                        setMessages(data.messages || []);
                    }
                } catch (e) { console.error(e); }
            }
        }
    };

    const updateCurrentChatHistory = (newMessages) => {
        setChatHistory(prev => prev.map(chat => {
            if (chat.id === currentChatId) {
                // Update title based on first user message if it's "New Chat"
                let title = chat.title;
                if (chat.title === 'New Chat' && newMessages.length > 0) {
                    const firstUserMsg = newMessages.find(m => m.type === 'user');
                    if (firstUserMsg) {
                        title = firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '');
                    }
                }
                return { ...chat, messages: newMessages, title };
            }
            return chat;
        }));
    };

    // Sync messages to history whenever they change
    useEffect(() => {
        if (currentChatId && messages.length > 0) {
            updateCurrentChatHistory(messages);
        }
    }, [messages]);


    const handleSendMessage = async () => {
        if (!inputValue.trim() && !selectedFile) return;

        const currentInput = inputValue;
        const currentFile = selectedFile;

        // 1. Add User Message
        const userMsg = {
            id: Date.now(),
            type: 'user',
            text: currentFile ? `[File: ${currentFile.name}]\n${currentInput}` : currentInput,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);

        // Reset inputs
        setInputValue("");
        setSelectedFile(null);
        setIsTyping(true);

        // NAVIGATION COMMAND CHECK (Client-side fast path)
        const lowerInput = currentInput.toLowerCase();
        const actionKeywords = ["go to", "navigate", "open", "show", "take me to"];
        const hasAction = actionKeywords.some(keyword => lowerInput.includes(keyword));

        if (hasAction && !currentFile) {
            let navTarget = null;
            if (lowerInput.includes("finbro") || lowerInput.includes("dashboard")) navTarget = "/finbro-dashboard";
            else if (lowerInput.includes("visualize") || lowerInput.includes("visualisation")) navTarget = "/visualize";
            else if (lowerInput.includes("config") || lowerInput.includes("chart")) navTarget = "/chart-config";
            else if (lowerInput.includes("home") || lowerInput.includes("landing")) navTarget = "/";

            if (navTarget) {
                if (navTarget === "/finbro-dashboard") {
                    window.dispatchEvent(new CustomEvent('active-section-change', { detail: { section: 'dashboard' } }));
                }
                setTimeout(() => {
                    setIsTyping(false);
                    setMessages(prev => [...prev, {
                        id: Date.now() + 1,
                        type: 'bot',
                        text: `Navigating to ${navTarget}...`,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }]);
                    navigate(navTarget);
                }, 500);
                return;
            }
        }

        try {
            let botReply = "";
            let chart_data = null;
            let chart_type = "bar";

            // A) IF FILE EXISTS: USE /ask/analyze_file
            if (currentFile) {
                const user = JSON.parse(localStorage.getItem("user"));
                const currentUserId = user ? user.id : null;

                const formData = new FormData();
                formData.append("file", currentFile);
                formData.append("message", currentInput);
                if (currentUserId) formData.append("user_id", currentUserId);
                if (currentChatId) formData.append("session_id", currentChatId);

                const uploadRes = await fetch("http://127.0.0.1:8000/ask/analyze_file", {
                    method: "POST",
                    body: formData
                });

                if (uploadRes.ok) {
                    const data = await uploadRes.json();
                    botReply = data.answer;
                    chart_data = data.chart_data;
                    chart_type = data.chart_type || "bar";

                    if (data.session_id && data.session_id !== currentChatId) {
                        setCurrentChatId(data.session_id);
                        if (currentUserId) fetchHistory(currentUserId);
                    }

                    // SAVE CONTEXT for future questions
                    if (chart_data) {
                        setLastAnalyzedData(chart_data);
                    }
                }
            }
            // B) TEXT ONLY (Start Context-Aware Chat)
            else if (currentInput) {
                // Use /ask if we have data context, otherwise fallback to /chat
                const endpoint = lastAnalyzedData ? "http://127.0.0.1:8000/ask" : "http://127.0.0.1:8000/chat";

                // Construct Payload with History
                let historyContext = [];
                // Simply map the last few messages for context
                if (messages.length > 0) {
                    historyContext = messages.slice(-6).map(m => ({
                        role: m.type === 'user' ? 'user' : 'model',
                        content: m.text
                    }));
                }

                const user = JSON.parse(localStorage.getItem("user"));
                const currentUserId = user ? user.id : null;

                const payload = {
                    ...(lastAnalyzedData
                        ? { question: currentInput, context: { data_summary: lastAnalyzedData, history: historyContext } }
                        : { message: currentInput }
                    ),
                    user_id: currentUserId,
                    session_id: currentChatId
                };

                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const data = await response.json();
                    botReply = data.answer || data.reply; // /ask returns 'answer', /chat returns 'reply'

                    if (data.session_id && data.session_id !== currentChatId) {
                        setCurrentChatId(data.session_id);
                        if (currentUserId) fetchHistory(currentUserId);
                    }

                    // Handle Actions from /ask
                    if (data.action === 'update_chart') {
                        chart_type = data.chart_type;
                        // Reuse the existing data context for the new chart
                        chart_data = lastAnalyzedData;
                    } else if (data.action === 'predict_data') {
                        // PREDICTION: Show BOTH Text + Chart
                        chart_type = data.chart_type || "line";
                        chart_data = data.chart_data;
                        if (chart_data) {
                            setLastAnalyzedData(chart_data);
                        }
                        // Do NOT clear botReply
                    } else if (data.action === 'navigate' && data.navigate_path) {
                        navigate(data.navigate_path);
                        botReply += ` (Navigating...)`;
                    }
                } else {
                    botReply = "I'm having trouble connecting to the AI server.";
                }
            }

            // Add Bot Message
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                type: 'bot',
                text: botReply,
                chart_data: chart_data,
                chart_type: chart_type,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                type: 'bot',
                text: "I encountered an error. Please ensure the backend server is connected.",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) setSelectedFile(file);
    };

    if (!isOpen && !isFullPage) return null;

    return (
        <div className={`smart-ai-container ${isFullPage ? 'full-page' : 'floating-window'}`}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className={`smart-ai-window ${messages.length === 0 ? 'empty-state' : ''}`}
                ref={aiWindowRef}
            >
                <div className="smart-ai-layout">
                    {/* SIDEBAR */}
                    {isFullPage && (
                        <div className={`smart-ai-sidebar ${!showSidebar ? 'collapsed' : ''}`}>
                            <div className="sidebar-header">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="new-chat-btn"
                                    onClick={createNewChat}
                                >
                                    <Sparkles size={16} />
                                    <span>New Chat</span>
                                </motion.button>
                            </div>

                            <div className="sidebar-history">
                                <div className="history-label">Recent</div>
                                {chatHistory.map(chat => (
                                    <motion.button
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.5 }}
                                        whileHover={{ x: 8, transition: { duration: 0.3 } }}
                                        key={chat.id}
                                        className={`history-item ${currentChatId === chat.id ? 'active' : ''}`}
                                        onClick={() => loadChat(chat.id)}
                                    >
                                        <MessageCircle size={14} />
                                        <span>{chat.title}</span>
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    )}

                    {isFullPage && (
                        <button className="sidebar-toggle-btn" onClick={() => {
                            if (isMainSidebarOpen) {
                                window.dispatchEvent(new CustomEvent('dashboard-sidebar-control', { detail: { action: 'close' } }));
                            } else {
                                setShowSidebar(!showSidebar);
                            }
                        }}>
                            <Activity size={20} />
                        </button>
                    )}

                    {/* MAIN CHAT AREA */}
                    <div className="smart-ai-main">
                        <div className={`smart-ai-messages ${messages.length === 0 ? 'empty-state' : ''}`}>
                            {messages.length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                                    className="chat-welcome-banner"
                                >
                                    <h2>How can I help you with your data today?</h2>
                                    <p>Ask me to analyze trends, forecast future data, filter top items, or navigate the dashboard.</p>
                                </motion.div>
                            )}

                            <AnimatePresence mode="popLayout">
                                {messages.map((msg) => (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 15, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                        className={`smart-msg ${msg.type}`}
                                    >
                                        {msg.type === 'bot' && (
                                            <div className="bot-avatar">
                                                <Sparkles size={16} />
                                            </div>
                                        )}
                                        <div className="smart-bubble">
                                            <div className="bubble-text">{msg.text}</div>
                                            {msg.chart_data && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                                                    className="inline-chart"
                                                >
                                                    <ResponsiveContainer width="100%" height={260}>
                                                        {(!msg.chart_type || msg.chart_type === 'bar') && (
                                                            <BarChart data={msg.chart_data} barSize={45}>
                                                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tick={<CustomXAxisTick />} height={60} interval={0} />
                                                                <Tooltip
                                                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                                    contentStyle={{ background: 'rgba(0,0,0,0.8)', borderRadius: '8px', border: '1px solid #444', color: '#fff', fontSize: '12px' }}
                                                                    itemStyle={{ color: '#fff' }}
                                                                />
                                                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                                                    {msg.chart_data.map((entry, index) => (
                                                                        <Cell key={`cell-${index}`} fill={NEON_PALETTE[index % NEON_PALETTE.length]} />
                                                                    ))}
                                                                </Bar>
                                                                <Bar dataKey="forecast" fill="#9333ea" radius={[6, 6, 0, 0]} fillOpacity={0.6} />
                                                            </BarChart>
                                                        )}
                                                        {msg.chart_type === 'line' && (
                                                            <LineChart data={msg.chart_data}>
                                                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tick={<CustomXAxisTick />} height={60} interval={0} />
                                                                <Tooltip
                                                                    contentStyle={{ background: 'rgba(0,0,0,0.8)', borderRadius: '8px', border: '1px solid #444', color: '#fff', fontSize: '12px' }}
                                                                    itemStyle={{ color: '#fff' }}
                                                                />
                                                                <Line type="monotone" dataKey="value" stroke={NEON_PALETTE[0]} strokeWidth={3} dot={{ r: 4, fill: NEON_PALETTE[0] }} activeDot={{ r: 6 }} connectNulls={true} />
                                                                <Line type="monotone" dataKey="forecast" stroke={NEON_PALETTE[2]} strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4, fill: NEON_PALETTE[2], strokeWidth: 2 }} activeDot={{ r: 6 }} connectNulls={true} />
                                                            </LineChart>
                                                        )}
                                                        {msg.chart_type === 'area' && (
                                                            <AreaChart data={msg.chart_data}>
                                                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tick={<CustomXAxisTick />} height={60} interval={0} />
                                                                <Tooltip
                                                                    contentStyle={{ background: 'rgba(0,0,0,0.8)', borderRadius: '8px', border: '1px solid #444', color: '#fff', fontSize: '12px' }}
                                                                    itemStyle={{ color: '#fff' }}
                                                                />
                                                                <Area type="monotone" dataKey="value" stroke={NEON_PALETTE[0]} fill={NEON_PALETTE[0]} fillOpacity={0.1} activeDot={{ r: 6 }} connectNulls={true} />
                                                                <Area type="monotone" dataKey="forecast" stroke={NEON_PALETTE[2]} strokeDasharray="5 5" fill={NEON_PALETTE[2]} fillOpacity={0.05} activeDot={{ r: 6 }} connectNulls={true} />
                                                            </AreaChart>
                                                        )}
                                                        {msg.chart_type === 'pie' && (
                                                            <PieChart>
                                                                <Pie data={msg.chart_data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} stroke="none" label={({ name }) => name ? name.toString().trim().split(' ')[0].substring(0, 3) : ""}>
                                                                    {msg.chart_data.map((entry, index) => (
                                                                        <Cell key={`cell-${index}`} fill={NEON_PALETTE[index % NEON_PALETTE.length]} />
                                                                    ))}
                                                                </Pie>
                                                                <Tooltip
                                                                    contentStyle={{ background: 'rgba(0,0,0,0.8)', borderRadius: '8px', border: '1px solid #444', color: '#fff', fontSize: '12px' }}
                                                                    itemStyle={{ color: '#fff' }}
                                                                />
                                                            </PieChart>
                                                        )}
                                                    </ResponsiveContainer>
                                                </motion.div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {isTyping && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.5 }}
                                    className="smart-msg bot"
                                >
                                    <div className="bot-avatar">
                                        <Sparkles size={16} />
                                    </div>
                                    <div className="smart-bubble typing">
                                        <div className="typing-dots">
                                            <span></span><span></span><span></span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="smart-input-container">
                            {selectedFile && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.4 }}
                                    className="file-preview-pill"
                                >
                                    <FileText size={14} />
                                    <span>{selectedFile.name}</span>
                                    <button onClick={() => setSelectedFile(null)}><X size={14} /></button>
                                </motion.div>
                            )}
                            <div className="smart-input-wrapper">
                                <button className="tool-btn" onClick={() => fileInputRef.current?.click()}>
                                    <Paperclip size={20} />
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={handleFileChange}
                                    accept=".csv, .xlsx, .png, .jpg, .jpeg"
                                />
                                <textarea
                                    rows="1"
                                    className="smart-textarea"
                                    placeholder="Message Arithpipe AI..."
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                />
                                <motion.button
                                    whileHover={inputValue || selectedFile ? { scale: 1.1 } : {}}
                                    whileTap={inputValue || selectedFile ? { scale: 0.9 } : {}}
                                    className={`send-btn ${inputValue || selectedFile ? 'active' : ''}`}
                                    onClick={handleSendMessage}
                                    disabled={!inputValue.trim() && !selectedFile}
                                >
                                    <Send size={18} />
                                </motion.button>
                            </div>
                            <p className="input-footer">AI can make mistakes. Verify important info.</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};


export default SmartDashboardAI;
