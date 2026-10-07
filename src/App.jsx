import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Layout from '@/components/Layout';
import AuthorizationGate from '@/components/AuthorizationGate';
import { lazy, Suspense } from 'react';
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Resumen = lazy(() => import('@/pages/Resumen'));
const Recepcion = lazy(() => import('@/pages/Recepcion'));
const Acondicionamiento = lazy(() => import('@/pages/Acondicionamiento'));
const BioComp = lazy(() => import('@/pages/BioComp'));
const Tratamiento = lazy(() => import('@/pages/Tratamiento'));
const Inspeccion = lazy(() => import('@/pages/Inspeccion'));
const Descarga = lazy(() => import('@/pages/Descarga'));
const Acopio = lazy(() => import('@/pages/Acopio'));
const Historial = lazy(() => import('@/pages/Historial'));
const CargaDetail = lazy(() => import('@/pages/CargaDetail'));
const Datos = lazy(() => import('@/pages/Datos'));
const Perfil = lazy(() => import('@/pages/Perfil'));
const Usuarios = lazy(() => import('@/pages/Usuarios'));
const Solicitudes = lazy(() => import('@/pages/Solicitudes'));
const Asistente = lazy(() => import('@/pages/Asistente'));
const Notificaciones = lazy(() => import('@/pages/Notificaciones'));
const Informe = lazy(() => import('@/pages/Informe'));
const Expediciones = lazy(() => import('@/pages/Expediciones'));
// Add page imports here
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import OAuthConsent from '@/pages/OAuthConsent';

const AUTH_ROUTE_PATHS = ['/login','/register','/forgot-password','/reset-password','/oauth-consent'];

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();

  // Auth pages render without auth guard
  if (AUTH_ROUTE_PATHS.includes(location.pathname)) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/oauth-consent" element={<OAuthConsent />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    );
  }

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" /></div>}>
    <AuthorizationGate>
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/resumen" element={<Resumen />} />
        <Route path="/recepcion" element={<Recepcion />} />
        <Route path="/acondicionamiento" element={<Acondicionamiento />} />
        <Route path="/biocomp" element={<BioComp />} />
        <Route path="/tratamiento" element={<Tratamiento />} />
        <Route path="/inspeccion" element={<Inspeccion />} />
        <Route path="/descarga" element={<Descarga />} />
        <Route path="/acopio" element={<Acopio />} />
        <Route path="/historial" element={<Historial />} />
        <Route path="/carga/:id" element={<CargaDetail />} />
        <Route path="/datos" element={<Datos />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/solicitudes" element={<Solicitudes />} />
        <Route path="/asistente" element={<Asistente />} />
        <Route path="/notificaciones" element={<Notificaciones />} />
        <Route path="/informe" element={<Informe />} />
        <Route path="/expediciones" element={<Expediciones />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </AuthorizationGate>
    </Suspense>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App