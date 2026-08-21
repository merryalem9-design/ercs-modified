// src/pages/NationalActivityDetailPage.tsx
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  sumActual,
  sumExpenditure,
  sumTarget,
  sumBudget,
  achievementPct,
  budgetUtilizationPct,
  convertToBeneficiaries,
} from '../utils/calculations';
import { PlanEntry, ScopeType } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { BudgetStatusBadge } from '../components/common/BudgetStatusBadge';
import { PlanEntryWizardModal, type PeWizardFormState } from './PlanPage';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarCheck2,
  CalendarClock,
  FolderGit2,
  Layers,
  MapPin,
  Plus,
  Target,
  Users,
  Wallet,
} from 'lucide-react';

export const NationalActivityDetailPage: React.FC = () => {
  const {
    selectedNationalActivityId,
    setActiveRoute,
    setFilters,
    filters,
    currentRole,
    nationalActivities,
    regions,
    projects,
    quarterlyActuals,
    uomConfigs,
    getFilteredPlanEntries,
  } = useApp();

  const [peWizard, setPeWizard] = useState<null | { initial: PeWizardFormState; startStep: 1 | 2 }>(null);

  const na = selectedNationalActivityId
    ? nationalActivities.find(n => n.id === selectedNationalActivityId)
    : undefined;

  if (!na) {
    return (
      <div className="bg-white p-8 rounded-xl border text-center text-xs text-slate-500">
        No National Activity selected. Go back to the Plan page and choose one.
      </div>
    );
  }

  const roleVisibleEntries = getFilteredPlanEntries();
  const children = roleVisibleEntries.filter(pe => pe.national_activity_id === na.id);
  const regionalChildren = children.filter(c => c.scope_type === 'Regional');
  const projectChildren = children.filter(c => c.scope_type === 'Project');

  const target = sumTarget(children);
  const actual = sumActual(children, quarterlyActuals);
  const pct = achievementPct(actual, target);
  const budget = sumBudget(children);
  const spent = sumExpenditure(children, quarterlyActuals);
  const util = budgetUtilizationPct(spent, budget);
  const beneficiaries = children.reduce(
    (sum, c) => sum + convertToBeneficiaries(sumActual([c], quarterlyActuals), na.uom, uomConfigs),
    0
  );

  // National Activity AOP has no assigned Region/Project of their own, so
  // they neither create Plan Entries in isolation from a Region/Project
  // scope nor create Quarterly Plan / Quarterly Actual entries at all —
  // upsertQuarterlyPlan / upsertQuarterlyActual in AppContext both refuse
  // that role outright. Those two actions are hidden here accordingly.
  const roleIsCoordinator = currentRole !== 'National Activity AOP';
  const regionalRole = currentRole.startsWith('Regional Coordinator — ');
  const projectRole = currentRole.startsWith('Project Coordinator — ');
  const assignedRegion = regionalRole ? regions.find(r => r.name === currentRole.slice('Regional Coordinator — '.length)) : undefined;
  const assignedProject = projectRole ? projects.find(p => p.name === currentRole.slice('Project Coordinator — '.length)) : undefined;
  const filterRegion = filters.regionId !== 'ALL' ? regions.find(r => r.id === filters.regionId) : undefined;
  const filterProject = filters.projectId !== 'ALL' ? projects.find(p => p.id === filters.projectId) : undefined;

  // Same rule as PlanPage: AOP only gets "Add Plan Entry" once they've
  // filtered down to a specific Region or Project.
  const canAddPlanEntry = roleIsCoordinator || !!filterRegion || !!filterProject;

  const setParentFilter = (scopeType: 'Regional' | 'Project' | null = null, scopeId?: string) => {
    setFilters(prev => ({
      ...prev,
      strategicPriorityId: 'ALL',
      nationalActivityId: na.id,
      regionId: scopeType === 'Regional' && scopeId ? scopeId : 'ALL',
      projectId: scopeType === 'Project' && scopeId ? scopeId : 'ALL',
    }));
  };

  const goBackToPlan = () => {
    setParentFilter(null);
    setActiveRoute('plan');
  };

  const openChild = (pe: PlanEntry) => {
    setParentFilter(pe.scope_type, pe.scope_type === 'Regional' ? pe.region_id : pe.project_id);
    setActiveRoute('national-detail');
  };

  const openAddPlanWizard = () => {
    const resolvedRegion = assignedRegion || filterRegion;
    const resolvedProject = assignedProject || filterProject;
    const scopeResolved = !!(resolvedRegion || resolvedProject);
    const scopeType: ScopeType = resolvedRegion ? 'Regional' : resolvedProject ? 'Project' : (regionalRole ? 'Regional' : projectRole ? 'Project' : 'Regional');

    setPeWizard({
      initial: {
        strategicPriorityId: na.strategic_priority_id,
        national_activity_id: na.id,
        scope_type: scopeType,
        region_id: resolvedRegion?.id || '',
        project_id: resolvedProject?.id || '',
        annual_target: '',
        annual_budget: '',
        activity_name: '',
        activity_description: '',
        lockScope: scopeResolved,
      },
      // The National Activity is already known here (this page), so we only
      // need a resolved Region/Project to skip straight to step 2.
      startStep: scopeResolved ? 2 : 1,
    });
  };

  const goToQuarterlyPlan = () => {
    setParentFilter(
      children.length === 1 ? children[0].scope_type : null,
      children.length === 1 ? (children[0].scope_type === 'Regional' ? children[0].region_id : children[0].project_id) : undefined
    );
    setActiveRoute('quarterly-plan');
  };

  const goToQuarterlyActual = () => {
    setParentFilter(
      children.length === 1 ? children[0].scope_type : null,
      children.length === 1 ? (children[0].scope_type === 'Regional' ? children[0].region_id : children[0].project_id) : undefined
    );
    setActiveRoute('quarterly');
  };

  return (
    <div className="space-y-6">
      <button onClick={goBackToPlan} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-ercs-red">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Plan
      </button>

      <div className="bg-white p-5 rounded-xl border shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-ercs-red text-white text-[10px] font-extrabold px-2 py-0.5 rounded">{na.code}</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase">{na.uom}</span>
              {na.responsibility && (
                <span className="bg-slate-100 text-slate-600 text-[10px] font-extrabold px-2 py-0.5 rounded border border-slate-200">{na.responsibility}</span>
              )}
            </div>
            <h2 className="text-lg font-black text-slate-800 mt-1">{na.description}</h2>
            <p className="text-[11px] text-slate-500 mt-1">
              Target and Budget below are aggregated live from every linked Plan Entry — there's no separate national ceiling to set or reconcile.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {roleIsCoordinator && (
              <>
                <button onClick={goToQuarterlyPlan} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
                  <CalendarClock className="w-3.5 h-3.5" /> Quarterly Plan
                </button>
                <button onClick={goToQuarterlyActual} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 font-bold text-xs">
                  <CalendarCheck2 className="w-3.5 h-3.5" /> Quarterly Actuals
                </button>
              </>
            )}
            {canAddPlanEntry && (
              <button onClick={openAddPlanWizard} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ercs-red text-white font-bold text-xs">
                <Plus className="w-3.5 h-3.5" /> Add Plan Entry
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <StatCard icon={Target} label="Aggregated Target" value={`${target.toLocaleString()} ${na.uom}`} sub={`${actual.toLocaleString()} achieved so far`} />
          <StatCard icon={Layers} label="Achievement" value={`${pct.toFixed(1)}%`} sub={<StatusBadge achievementPct={pct} hasActuals={actual > 0} />} />
          <StatCard icon={Wallet} label="Aggregated Budget" value={`ETB ${budget.toLocaleString()}`} sub={`ETB ${spent.toLocaleString()} spent`} />
          <StatCard icon={Users} label="Beneficiaries Reached" value={beneficiaries.toLocaleString()} sub={<BudgetStatusBadge utilizationPct={util} hasSpend={spent > 0} />} />
        </div>
      </div>

      <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Layers className="w-4 h-4 text-ercs-red" /> Linked Plan Entries ({children.length})
          </div>
        </div>

        {children.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs text-slate-500 mb-3">No Plan Entries are linked to this National Activity yet in your current scope.</p>
            {canAddPlanEntry && (
              <button onClick={openAddPlanWizard} className="inline-flex items-center gap-1.5 bg-ercs-red text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                <Plus className="w-3.5 h-3.5" /> Add Plan Entry
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b">
                <tr>
                  <th className="p-3">Activity Code</th>
                  <th className="p-3">Executed By</th>
                  <th className="p-3 text-right">Target</th>
                  <th className="p-3 text-right">Actual</th>
                  <th className="p-3 text-right">Budget</th>
                  <th className="p-3 text-right">Spent</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {children.map(pe => {
                  const scopeName = pe.scope_type === 'Regional' ? regions.find(r => r.id === pe.region_id)?.name : projects.find(p => p.id === pe.project_id)?.name;
                  const peActual = sumActual([pe], quarterlyActuals);
                  const peSpent = sumExpenditure([pe], quarterlyActuals);
                  const peAchievement = achievementPct(peActual, pe.annual_target);
                  return (
                    <tr key={pe.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-ercs-red">{pe.activity_code}</td>
                      <td className="p-3">
                        {pe.scope_type === 'Regional' ? <MapPin className="w-3 h-3 inline text-blue-400 mr-1" /> : <FolderGit2 className="w-3 h-3 inline text-purple-400 mr-1" />}
                        <span className="font-semibold">{scopeName || '—'}</span>
                      </td>
                      <td className="p-3 text-right font-bold">{pe.annual_target.toLocaleString()} {na.uom}</td>
                      <td className="p-3 text-right">{peActual.toLocaleString()} {na.uom}</td>
                      <td className="p-3 text-right">ETB {pe.annual_budget.toLocaleString()}</td>
                      <td className="p-3 text-right">ETB {peSpent.toLocaleString()}</td>
                      <td className="p-3 text-center"><StatusBadge achievementPct={peAchievement} hasActuals={peActual > 0} /></td>
                      <td className="p-3 text-center">
                        <button onClick={() => openChild(pe)} className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-bold flex items-center gap-1 mx-auto">
                          Focus <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(regionalChildren.length > 0 || projectChildren.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {regionalChildren.length > 0 && (
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-2 flex items-center gap-1"><MapPin className="w-3 h-3 text-blue-400" /> Regions</div>
              <div className="space-y-1">
                {regionalChildren.map(pe => (
                  <button key={pe.id} onClick={() => openChild(pe)} className="w-full text-left text-xs font-semibold px-2 py-1.5 rounded hover:bg-slate-50 flex items-center justify-between">
                    {regions.find(r => r.id === pe.region_id)?.name}
                    <ArrowUpRight className="w-3 h-3 text-slate-300" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {projectChildren.length > 0 && (
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-2 flex items-center gap-1"><FolderGit2 className="w-3 h-3 text-purple-400" /> Projects</div>
              <div className="space-y-1">
                {projectChildren.map(pe => (
                  <button key={pe.id} onClick={() => openChild(pe)} className="w-full text-left text-xs font-semibold px-2 py-1.5 rounded hover:bg-slate-50 flex items-center justify-between">
                    {projects.find(p => p.id === pe.project_id)?.name}
                    <ArrowUpRight className="w-3 h-3 text-slate-300" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {peWizard && (
        <PlanEntryWizardModal
          initial={peWizard.initial}
          startStep={peWizard.startStep}
          onClose={() => setPeWizard(null)}
          onSaved={() => setPeWizard(null)}
        />
      )}
    </div>
  );
};

const StatCard: React.FC<{ icon: any; label: string; value: React.ReactNode; sub?: React.ReactNode }> = ({ icon: Icon, label, value, sub }) => (
  <div className="bg-slate-50 border rounded-lg p-3">
    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
      <span>{label}</span>
      <Icon className="w-3.5 h-3.5" />
    </div>
    <div className="text-lg font-black text-slate-800 mt-1">{value}</div>
    {sub && <div className="text-[10px] text-slate-500 mt-1">{sub}</div>}
  </div>
);