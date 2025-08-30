import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import FeatureSection from "./components/FeatureSection";
import Workflow from "./components/Workflow";
import Testimonials from "./components/Testimonials";
import Pricing from "./components/Pricing";
import Footer from "./components/Footer";
import Login from "./components/Login";
import Register from "./components/Register";

// Create a Home component for landing page sections
const Home = () => (
  <div className="max-w-7xl mx-auto pt-20 px-6">
    <HeroSection />
    <FeatureSection />
    <Workflow />
    <Pricing />
    <Testimonials />
    <Footer />
  </div>
);

function App() {
  return (
    <div className="bg-neutral-900 min-h-screen">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={<div>Dashboard (To be implemented)</div>}
        />
        <Route
          path="/pricing"
          element={<div>Pricing (To be implemented)</div>}
        />
      </Routes>
    </div>
  );
}

export default App;
