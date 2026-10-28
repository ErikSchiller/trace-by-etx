import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
// Eager — most common entry paths, avoid lazy flash
import LandingPage from './pages/LandingPage';
import OnboardingPage from './pages/OnboardingPage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import ResetPassword from './pages/Auth/ResetPassword';
import AppLayout from './layouts/AppLayout';
import Dashboard from './pages/Dashboard';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { UpgradeModal } from './components/Modals/UpgradeModal';
import { ScrollToTop } from './components/ScrollToTop';
import { LogoMark } from './components/UI/LogoMark';
import { useSettingsStore } from './store/settingsStore';
import { applyAccentColor } from './utils/export';

// Lazy — heavier authenticated pages
const Journal = lazy(() => import('./pages/Journal'));
const Trades = lazy(() => import('./pages/Trades'));
const Notebook = lazy(() => import('./pages/Notebook'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Brokers = lazy(() => import('./pages/Brokers'));
const Settings = lazy(() => import('./pages/Settings'));
const Reportes = lazy(() => import('./pages/Reportes'));
const Progress = lazy(() => import('./pages/Progress'));
const Replay = lazy(() => import('./pages/Replay'));
const Simulator = lazy(() => import('./pages/Simulator'));
const PropFirms = lazy(() => import('./pages/PropFirms'));
const PropFirmDetail = lazy(() => import('./pages/PropFirms/Detail'));
const Gallery = lazy(() => import('./pages/Gallery'));
// Lazy — marketing pages
const Funciones = lazy(() => import('./pages/Funciones'));
const BrokersLanding = lazy(() => import('./pages/BrokersLanding'));
const Pricing = lazy(() => import('./pages/Pricing'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Privacy = lazy(() => import('./pages/Legal/Privacy'));
const Terms = lazy(() => import('./pages/Legal/Terms'));
const CookiesPolicy = lazy(() => import('./pages/Legal/Cookies'));
const LegalNotice = lazy(() => import('./pages/Legal/LegalNotice'));
const Changelog = lazy(() => import('./pages/Changelog'));
const Roadmap = lazy(() => import('./pages/Roadmap'));
const NotFound = lazy(() => import('./pages/NotFound'));

function LoadingScreen() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0a0c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LogoMark symbolOnly size="xl" />
    </div>
  );
}

export default function App() {
  const accent = useSettingsStore(s => s.accentColor);
  useEffect(() => { applyAccentColor(accent); }, [accent]);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          {/* Marketing pages */}
          <Route path="/funciones" element={<Funciones />} />
          <Route path="/brokers-soportados" element={<BrokersLanding />} />
          <Route path="/precios" element={<Pricing />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/privacidad" element={<Privacy />} />
          <Route path="/terminos" element={<Terms />} />
          <Route path="/cookies" element={<CookiesPolicy />} />
          <Route path="/aviso-legal" element={<LegalNotice />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute requireOnboarded={false} onlyDuringOnboarding>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/trades" element={<Trades />} />
            <Route path="/notebook" element={<Notebook />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/reports" element={<Reportes />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/replay" element={<Replay />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/prop-firms" element={<PropFirms />} />
            <Route path="/prop-firms/:id" element={<PropFirmDetail />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/brokers" element={<Brokers />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          {/* 404 catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <UpgradeModal />
    </BrowserRouter>
  );
}
