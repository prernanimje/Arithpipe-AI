import Landing from "../frontend/src/pages/Landing.jsx";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Vizualize from "../frontend/src/pages/visuaize.jsx"
import ChartConfig from "../frontend/src/pages/ChartConfig.jsx";
// import Dashboard from "./pages/dashboard.jsx";
import FinbroDashboard from "../frontend/src/pages/FinbroDashboard.jsx";
import ProtectedRoute from "../frontend/src/components/ProtectedRoute.jsx";
import { ThemeProvider } from "../frontend/src/context/ThemeContext.jsx";
import SmartDashboardAI from "../frontend/src/components/SmartDashboardAI.jsx";

import ParticleBackground from "../frontend/src/components/ParticleBackground.jsx";

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
