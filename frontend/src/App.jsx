import Landing from "./pages/Landing.jsx";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Vizualize from "./pages/visuaize.jsx"
import ChartConfig from "./pages/ChartConfig.jsx";
// import Dashboard from "./pages/dashboard.jsx";
import FinbroDashboard from "./pages/FinbroDashboard.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import SmartDashboardAI from "./components/SmartDashboardAI.jsx";

import ParticleBackground from "./components/ParticleBackground.jsx";

function App() {
  return (
    <ThemeProvider>
      <ParticleBackground />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/visualize" element={<Vizualize />} />
        <Route path="/chart-config" element={<ChartConfig />} />
        {/* <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} /> */}
        <Route path="/finbro-dashboard" element={<FinbroDashboard />} />
      </Routes>
      <SmartDashboardAI />
    </ThemeProvider>
  );
}

export default App;
