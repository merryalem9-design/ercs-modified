import React from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';

export const Header: React.FC = () => {
  const { currentRole, setCurrentRole, setActiveRoute, setFilters, regions, projects } = useApp();

  const roles: UserRole[] = [
    'National Activity AOP',
    ...regions.map(region => `Regional Coordinator — ${region.name}` as UserRole),
    ...projects.map(project => `Project Coordinator — ${project.name}` as UserRole),
  ];

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    setFilters(prev => ({
      ...prev,
      strategicPriorityId: 'ALL',
      nationalActivityId: 'ALL',
      regionId: 'ALL',
      projectId: 'ALL',
    }));
    setActiveRoute('plan');
  };

  return (
    <header className="bg-white border-b border-slate-200 min-h-16 px-6 py-2 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-sm">
      <h1 className="text-lg font-bold text-slate-800 tracking-tight whitespace-nowrap">
        ERCS AoP — Plan, Report &amp; Aggregation Prototype
      </h1>
      <div className="flex items-center gap-3">
        <div className="min-w-72">
          <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-0.5">Current User / Role</label>
          <select
            value={currentRole}
            onChange={e => handleRoleChange(e.target.value as UserRole)}
            className="w-full text-[11px] font-bold border border-slate-200 rounded-lg bg-slate-50 px-2.5 py-1.5 text-slate-700"
          >
            {roles.map(role => <option key={role} value={role}>{role}</option>)}
          </select>
        </div>
        <div className="text-[10px] font-extrabold uppercase px-2.5 py-1.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
          FY 2026
        </div>
      </div>
    </header>
  );
};
