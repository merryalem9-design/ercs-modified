// src/App.tsx
import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { Toast } from './components/common/Toast';
import { PlanPage } from './pages/PlanPage';
import { QuarterlyPlanPage } from './pages/QuarterlyPlanPage';
import { QuarterlyEntryPage } from './pages/QuarterlyEntryPage';
import { ReportPage } from './pages/ReportPage';
import { NationalActivityDetailPage } from './pages/NationalActivityDetailPage';
import { ScopeDetailPage } from './pages/ScopeDetailPage';
import { SubmissionsPage } from './pages/SubmissionsPage';

// Quarterly Plan / Quarterly Actual Entry are not applicable to the
// National Activity AOP role — it never owns a Region/Project scope to
// submit them under (see AppContext's upsertQuarterlyPlan/upsertQuarterlyActual).
const RESTRICTED_FOR_AOP = new Set(['quarterly-plan', 'quarterly']);

const MainLayout: React.FC = () => {
  const { activeRoute, setActiveRoute, currentRole } = useApp();
  const isNationalAop = currentRole === 'National Activity AOP';
  const onRestrictedRoute = isNationalAop && RESTRICTED_FOR_AOP.has(activeRoute);

  // Covers a persisted activeRoute left over from a previous coordinator
  // session before the role was switched to AOP directly in localStorage.
  React.useEffect(() => {
    if (onRestrictedRoute) setActiveRoute('plan');
  }, [onRestrictedRoute, setActiveRoute]);

  const renderContent = () => {
    if (onRestrictedRoute) return <PlanPage />;
    switch (activeRoute) {
      case 'plan': return <PlanPage />;
      case 'quarterly-plan': return <QuarterlyPlanPage />;
      case 'quarterly': return <QuarterlyEntryPage />;
      case 'report': return <ReportPage />;
      case 'national-detail': return <NationalActivityDetailPage />;
      case 'scope-detail': return <ScopeDetailPage />;
      case 'submissions': return <SubmissionsPage />;
      default: return <PlanPage />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{renderContent()}</main>
      </div>
      <Toast />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
