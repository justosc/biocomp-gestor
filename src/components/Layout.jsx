import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  LayoutDashboard, PackagePlus, FlaskConical, Cpu, Thermometer,
  Droplets, Trash2, Boxes, FileText, History, Menu, X, Leaf, Database, Users, ChevronLeft, ClipboardList, Bot, Home, FileDown, Truck
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import NotificationBell from '@/components/NotificationBell';
import { Image } from '@/components/ui/image';

const APP_LOGO = 'https://media.base44.com/images/public/6a79c74dc3c4ace1fc6c6172/e03d99f8e_generated_image.png';

// Lazy tab pages — mount-once, keep-alive al cambiar de pestaña
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Recepcion = lazy(() => import('@/pages/Recepcion'));
const Acondicionamiento = lazy(() => import('@/pages/Acondicionamiento'));
const BioComp = lazy(() => import('@/pages/BioComp'));
const Tratamiento = lazy(() => import('@/pages/Tratamiento'));
const Inspeccion = lazy(() => import('@/pages/Inspeccion'));
const Descarga = lazy(() => import('@/pages/Descarga'));
const Acopio = lazy(() => import('@/pages/Acopio'));

const TAB_COMPONENTS = {
  '/': Dashboard,
  '/recepcion': Recepcion,
  '/acondicionamiento': Acondicionamiento,
  '/biocomp': BioComp,
  '/tratamiento': Tratamiento,
  '/inspeccion': Inspeccion,
  '/descarga': Descarga,
  '/acopio': Acopio,
};

const dailyNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/recepcion', label: 'Recepción', icon: PackagePlus },
  { to: '/acondicionamiento', label: 'Acondicionamiento', icon: FlaskConical },
  { to: '/biocomp', label: 'BioComp', icon: Cpu },
  { to: '/tratamiento', label: 'Tratamiento', icon: Thermometer },
  { to: '/inspeccion', label: 'Inspección', icon: Droplets },
  { to: '/descarga', label: 'Descarga', icon: Trash2 },
  { to: '/acopio', label: 'Acopio', icon: Boxes },
];

const secondaryNav = [
  { to: '/resumen', label: 'Resumen', icon: FileText },
  { to: '/historial', label: 'Historial', icon: History },
  { to: '/informe', label: 'Informe semanal', icon: FileDown },
  { to: '/expediciones', label: 'Expedición a maduración', icon: Truck },
  { to: '/datos', label: 'Datos', icon: Database },
  { to: '/usuarios', label: 'Usuarios', icon: Users },
  { to: '/asistente', label: 'Asistente', icon: Bot },
  { to: '/solicitudes', label: 'Solicitudes', icon: ClipboardList },
];

const operatorDailyNav = [
  { to: '/recepcion', label: 'Recepción', icon: PackagePlus },
  { to: '/acondicionamiento', label: 'Acondicionamiento', icon: FlaskConical },
  { to: '/biocomp', label: 'BioComp', icon: Cpu },
  { to: '/tratamiento', label: 'Tratamiento', icon: Thermometer },
  { to: '/descarga', label: 'Descarga', icon: Trash2 },
  { to: '/acopio', label: 'Acopio', icon: Boxes },
];

const adminOnlyPaths = ['/', '/resumen', '/inspeccion', '/historial', '/datos', '/usuarios'];

// Contenedor de pestañas persistentes: monta cada pestaña la primera vez
// que se visita y la mantiene montada (oculta) al cambiar, preservando el
// estado de scroll y formularios en curso. Reproduce el comportamiento de
// una tab bar nativa de iOS.
function PersistentTabs({ tabs, activePath }) {
  const [mounted, setMounted] = useState(() => new Set([activePath]));

  useEffect(() => {
    setMounted(prev => {
      if (prev.has(activePath)) return prev;
      const next = new Set(prev);
      next.add(activePath);
      return next;
    });
  }, [activePath]);

  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" /></div>}>
      {tabs.map(t => {
        if (!mounted.has(t.path)) return null;
        const Comp = t.Component;
        const active = t.path === activePath;
        return (
          <div key={t.path} className={active ? '' : 'hidden'} aria-hidden={!active}>
            <Comp />
          </div>
        );
      })}
    </Suspense>
  );
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isOperator = user?.role === 'user';

  if (isOperator && (!user?.nombre || !user?.dni) && location.pathname !== '/perfil') {
    return <Navigate to="/perfil" replace />;
  }

  if (isOperator && adminOnlyPaths.includes(location.pathname)) {
    return <Navigate to="/recepcion" replace />;
  }

  const bottomTabs = isOperator
    ? [
        { to: '/recepcion', label: 'Recepción', icon: PackagePlus },
        { to: '/acondicionamiento', label: 'Acondic.', icon: FlaskConical },
        { to: '/biocomp', label: 'BioComp', icon: Cpu },
        { to: '/tratamiento', label: 'Temp.', icon: Thermometer },
        { to: '/descarga', label: 'Descarga', icon: Trash2 },
        { to: '/acopio', label: 'Acopio', icon: Boxes },
      ]
    : [
        { to: '/', label: 'Inicio', icon: LayoutDashboard },
        { to: '/recepcion', label: 'Recepción', icon: PackagePlus },
        { to: '/acondicionamiento', label: 'Acondic.', icon: FlaskConical },
        { to: '/biocomp', label: 'BioComp', icon: Cpu },
        { to: '/tratamiento', label: 'Temp.', icon: Thermometer },
        { to: '/inspeccion', label: 'Insp.', icon: Droplets },
        { to: '/descarga', label: 'Descarga', icon: Trash2 },
        { to: '/acopio', label: 'Acopio', icon: Boxes },
      ];

  const tabPaths = bottomTabs.map(t => t.to);
  const isTabPath = tabPaths.includes(location.pathname);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(isOperator ? '/recepcion' : '/');
    }
  };

  const activeDailyNav = isOperator ? operatorDailyNav : dailyNav;
  const activeSecondaryNav = isOperator ? [{ to: '/expediciones', label: 'Expedición a maduración', icon: Truck }, { to: '/asistente', label: 'Asistente', icon: Bot }, { to: '/solicitudes', label: 'Solicitudes', icon: ClipboardList }] : secondaryNav;

  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  // Pestañas persistentes (sin animación al cambiar entre ellas) + transición
  // de deslizamiento lateral para páginas de detalle (no-tab).
  const tabPages = bottomTabs.map(t => ({ path: t.to, Component: TAB_COMPONENTS[t.to] }));

  const content = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={isTabPath ? '__tabs__' : location.pathname}
        initial={isTabPath ? { opacity: 0 } : { x: '100%' }}
        animate={{ opacity: 1, x: 0 }}
        exit={isTabPath ? { opacity: 0 } : { x: '100%' }}
        transition={{ duration: isTabPath ? 0.15 : 0.28, ease: [0.4, 0, 0.2, 1] }}
      >
        {isTabPath ? (
          <PersistentTabs tabs={tabPages} activePath={location.pathname} />
        ) : (
          <Outlet />
        )}
      </motion.div>
    </AnimatePresence>
  );

  const sidePanel = menuOpen && (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={() => setMenuOpen(false)}
      />
      <aside className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <span className="font-semibold text-gray-900">Más secciones</span>
          <button onClick={() => setMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {activeSecondaryNav.map(item => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  active ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="sticky top-0 z-30 bg-card border-b border-gray-200 pt-safe">
          <div className="h-14 flex items-center gap-2 px-3">
            {isTabPath ? (
              <Link to={isOperator ? '/recepcion' : '/'} className="flex items-center gap-2 shrink-0">
                <Image src={APP_LOGO} alt="BioComp" fittingType="fill" className="w-8 h-8 rounded-lg object-cover" />
                <span className="font-bold text-gray-900">BioComp</span>
              </Link>
            ) : (
              <div className="flex items-center gap-0.5">
                <button onClick={() => navigate(isOperator ? '/recepcion' : '/')} className="p-2 rounded-lg text-gray-700 active:bg-gray-100" aria-label="Inicio">
                  <Home className="w-5 h-5" />
                </button>
                <button onClick={handleBack} className="flex items-center gap-1 px-1.5 py-1.5 rounded-lg text-gray-700 active:bg-gray-100">
                  <ChevronLeft className="w-5 h-5" />
                  <span className="text-sm font-medium">Atrás</span>
                </button>
              </div>
            )}
            <div className="flex-1" />
            <ThemeToggle />
            {!isOperator && <NotificationBell />}
            {!isOperator && (
              <button
                onClick={() => setMenuOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 shrink-0"
                aria-label="Menú"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
          </div>
        </header>

        <main className={`flex-1 relative overflow-x-hidden px-4 py-5 max-w-7xl w-full mx-auto ${isTabPath ? 'pb-28' : 'pb-6'}`}>
          {content}
        </main>

        {isTabPath && (
          <nav className="fixed bottom-0 inset-x-0 z-30 bg-card border-t border-gray-200 pb-safe">
            <div className="flex items-center h-[68px] overflow-x-auto scrollbar-hide">
              {bottomTabs.map(tab => {
                const Icon = tab.icon;
                const active = isActive(tab.to);
                return (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    className={`flex-1 min-w-[72px] shrink-0 flex flex-col items-center justify-center gap-1 px-1.5 py-2 ${
                      active ? 'text-emerald-600' : 'text-gray-400'
                    }`}
                  >
                    <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
                    <span className="text-[11px] font-medium leading-none">{tab.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}

        {sidePanel}
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="px-3 md:px-6 h-14 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Image src={APP_LOGO} alt="BioComp" fittingType="fill" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-bold text-gray-900 hidden sm:block">BioComp</span>
          </Link>
          <nav className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {activeDailyNav.map(item => {
              const Icon = item.icon;
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <ThemeToggle />
          {!isOperator && <NotificationBell />}
          {!isOperator && (
            <button
              onClick={() => setMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 shrink-0"
              aria-label="Menú"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 px-3 md:px-6 py-5 max-w-7xl w-full mx-auto overflow-x-hidden">
        {content}
      </main>

      {sidePanel}
    </div>
  );
}