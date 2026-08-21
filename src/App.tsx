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
import { PendingApprovalPage } from './pages/PendingApprovalPage';

const MainLayout: React.FC = () => {
  const { activeRoute, currentRole, setActiveRoute } = useApp();

  React.useEffect(() => {
    const aopOnly = activeRoute === 'pending-approval';
    const coordinatorOnly = activeRoute === 'quarterly-plan' || activeRoute === 'quarterly';
    const isNational = currentRole === 'National Activity AOP';
    if (!isNational && aopOnly) setActiveRoute('plan');
    if (isNational && coordinatorOnly) setActiveRoute('plan');
  }, [currentRole, activeRoute, setActiveRoute]);

  const renderContent = () => {
    switch (activeRoute) {
      case 'plan': return <PlanPage />;
      case 'quarterly-plan': return currentRole === 'National Activity AOP' ? <PlanPage /> : <QuarterlyPlanPage />;
      case 'quarterly': return currentRole === 'National Activity AOP' ? <PlanPage /> : <QuarterlyEntryPage />;
      case 'report': return <ReportPage />;
      case 'national-detail': return <NationalActivityDetailPage />;
      case 'pending-approval': return currentRole === 'National Activity AOP' ? <PendingApprovalPage /> : <PlanPage />;
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
