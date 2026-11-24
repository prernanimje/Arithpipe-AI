// Dynamic API Base URL configuration
const getApiBase = () => {
  // If explicitly configured in .env (e.g. production domain)
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }

  // When accessing from a mobile device or other computer on the same Wi-Fi / LAN:
  // Dynamically target the backend port 8000 on the same host IP (e.g. http://192.168.1.66:8000)
  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:8000`;
    }
  }

  return "http://127.0.0.1:8000";
};

export const API_BASE = getApiBase();
