// src/pages/NationalActivityDetailPage.tsx
import React from 'react';
import { useApp } from '../context/AppContext';
import {
  sumTarget,
  sumBudget,
  sumActual,
  sumExpenditure,
  achievementPct,
  budgetUtilizationPct,
  convertToBeneficiaries,
  sumPlannedTarget,
  sumPlannedBudget,
} from '../utils/calculations';
import { PlanEntry } from '../types';
import { BudgetStatusBadge } from '../components/common/BudgetStatusBadge';
import {
  ArrowLeft,
  Layers,
  Building2,
  FolderGit2,
  Plus,
  Target,
  Wallet,
  Users,
  CalendarClock,
  CalendarCheck2,
} from 'lucide-react';

/**
 * National Activity detail page.
 *
 * Important rules for this page:
 * - Strategic Priority is intentionally not displayed or required by the UI.
 * - Coordinators only see Plan Entries they own (their exact Region/Project).
 * - National Activity AOP sees all linked entries.
 * - Quarterly Plan and Quarterly Actual routes inherit the same parent and
 *   scope filters, so the user lands on the selected National Activity and,
 *   when applicable, the exact selected Region/Project.
 * - No aggregation logic is changed: every number is still derived from the
 *   linked Plan Entries and quarterly records.
 */
export const NationalActivityDetailPage: React.FC = () => {
  const {
    selectedNationalActivityId,
    setActiveRoute,
    setFilters,
    setPendingAddPlanNationalActivityId,
    currentRole,
    nationalActivities,
    regions,
    projects,
    planEntries,
    quarterlyPlans,
    quarterlyActuals,
    uomConfigs,
    quarters,
    getFilteredPlanEntries,
  } = useApp();

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

  // CRITICAL: use the role-aware filtered entries instead of the raw global
  // planEntries array. This prevents Amhara, Oromia, Somali, Project A, etc.
  // from appearing to every coordinator.
  const roleVisibleEntries = getFilteredPlanEntries();

  // The selected activity is always the parent scope of this page. The active
  // Region/Project filters are respected too, so clicking a specific child in
  // the sidebar can narrow this page down to that exact child.
  const children = roleVisibleEntries.filter(
    pe => pe.national_activity_id === na.id
  );

  const regionalChildren = children.filter(
    c => c.scope_type === 'Regional'
  );

  const projectChildren = children.filter(
    c => c.scope_type === 'Project'
  );

  const target = sumTarget(children);
  const actual = sumActual(children, quarterlyActuals);
  const pct = achievementPct(actual, target);

  const budget = sumBudget(children);
  const spent = sumExpenditure(children, quarterlyActuals);
  const util = budgetUtilizationPct(spent, budget);

  const beneficiaries = children.reduce(
    (sum, c) =>
      sum +
      convertToBeneficiaries(
        sumActual([c], quarterlyActuals),
        na.uom,
        uomConfigs
      ),
    0
  );

  const selectedScopeLabel = children.length === 1
    ? children[0].scope_type === 'Regional'
      ? regions.find(r => r.id === children[0].region_id)?.name
      : projects.find(p => p.id === children[0].project_id)?.name
    : undefined;

  const roleIsCoordinator = currentRole !== 'National Activity AOP';

  const setParentFilter = (
    scopeType: 'Regional' | 'Project' | null = null,
    scopeId?: string
  ) => {
    setFilters(prev => ({
      ...prev,
      strategicPriorityId: 'ALL',
      nationalActivityId: na.id,
      regionId:
        scopeType === 'Regional' && scopeId
          ? scopeId
          : 'ALL',
      projectId:
        scopeType === 'Project' && scopeId
          ? scopeId
          : 'ALL',
    }));
  };

  const goBackToPlan = () => {
    setParentFilter(null);
    setActiveRoute('plan');
  };

  // Clicking a linked child keeps the user on the National Activity page, but
  // narrows the page to that exact Region/Project. This makes the sidebar and
  // the detail page behave consistently.
  const openChild = (pe: PlanEntry) => {
    setParentFilter(
      pe.scope_type,
      pe.scope_type === 'Regional'
        ? pe.region_id
        : pe.project_id
    );
    setActiveRoute('national-detail');
  };

  // Add a brand-new annual Plan Entry under the currently selected National
  // Activity. The existing Plan wizard then locks the parent and enforces the
  // role's Region/Project scope.
  const addLinkedEntry = () => {
    if (!roleIsCoordinator) return;
    setParentFilter(null);
    setPendingAddPlanNationalActivityId(na.id);
    setActiveRoute('plan');
  };

  const goToQuarterlyPlan = () => {
    if (!children.length && roleIsCoordinator) return;
    setParentFilter(
      children.length === 1 ? children[0].scope_type : null,
      children.length === 1
        ? children[0].scope_type === 'Regional'
          ? children[0].region_id
          : children[0].project_id
        : undefined
    );
    setActiveRoute('quarterly-plan');
  };

  const goToQuarterlyActual = () => {
    if (!children.length && roleIsCoordinator) return;
    setParentFilter(
      children.length === 1 ? children[0].scope_type : null,
      children.length === 1
        ? children[0].scope_type === 'Regional'
          ? children[0].region_id
          : children[0].project_id
        : undefined
    );
    setActiveRoute('quarterly');
  };

  const approvedPlanQuarters = (peId: string) =>
    quarterlyPlans.filter(
      qp =>
        qp.plan_entry_id === peId &&
        qp.approval_status === 'Approved'
    ).length;

  const approvedActualQuarters = (peId: string) =>
    quarterlyActuals.filter(
      qa =>
        qa.plan_entry_id === peId &&
        qa.approval_status === 'Approved'
    ).length;

  const scopeButtonLabel = selectedScopeLabel
    ? `${selectedScopeLabel}`
    : 'All assigned entries';

  return (
    <div className="space-y-6">
      {/* TOP ACTIONS */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          onClick={goBackToPlan}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-ercs-red"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Plan
        </button>

        <div className="flex gap-2 flex-wrap justify-end">
          {children.length > 0 && (
            <>
              <button
                onClick={goToQuarterlyPlan}
                className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold"
              >
                <CalendarClock className="w-3.5 h-3.5" />
                Quarterly Plan
              </button>

              <button
                onClick={goToQuarterlyActual}
                className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold"
              >
                <CalendarCheck2 className="w-3.5 h-3.5" />
                Quarterly Actuals
              </button>
            </>
          )}

          {roleIsCoordinator && (
            <button
              onClick={addLinkedEntry}
              className="flex items-center gap-1.5 bg-ercs-red text-white px-3 py-1.5 rounded-lg text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Plan Entry
            </button>
          )}
        </div>
      </div>

      {/* PARENT HEADER */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-ercs-red text-white text-xs font-extrabold px-2 py-0.5 rounded">
            {na.code}
          </span>

          <span className="text-xs text-slate-500 font-bold uppercase">
            {na.uom}
          </span>

          {na.responsibility && (
            <span className="bg-slate-100 text-slate-600 text-xs font-extrabold px-2 py-0.5 rounded border border-slate-200">
              {na.responsibility}
            </span>
          )}

          {selectedScopeLabel && (
            <span className="bg-blue-50 text-blue-700 text-xs font-extrabold px-2 py-0.5 rounded">
              {selectedScopeLabel}
            </span>
          )}
        </div>

        <h2 className="text-xl font-black text-slate-800">
          {na.description}
        </h2>

        <div className="text-xs text-slate-400 font-semibold">
          {roleIsCoordinator
            ? `Showing ${scopeButtonLabel} for this National Activity.`
            : 'Showing all linked Region and Project execution entries.'}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <div className="flex justify-between mb-1 text-xs font-bold text-slate-500">
            <span>Target vs Actual</span>
            <Target className="w-4 h-4" />
          </div>

          <div className="text-2xl font-black mt-1">
            {pct.toFixed(1)}%
          </div>

          <div className="text-xs text-slate-500 mt-1">
            Tgt: <b>{target.toLocaleString()}</b> | Act:{' '}
            <b>{actual.toLocaleString()}</b> {na.uom}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <div className="flex justify-between mb-1 text-xs font-bold text-slate-500">
            <span>Budget Utilization</span>
            <Wallet className="w-4 h-4" />
          </div>

          <div className="text-2xl font-black mt-1">
            {util.toFixed(1)}%
          </div>

          <div className="text-xs text-slate-500 mt-1">
            Spent: <b>ETB {spent.toLocaleString()}</b> /{' '}
            <b>ETB {budget.toLocaleString()}</b>
          </div>

          <div className="mt-2">
            <BudgetStatusBadge
              utilizationPct={util}
              hasSpend={spent > 0}
            />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <div className="flex justify-between mb-1 text-xs font-bold text-slate-500">
            <span>Contributing Entries</span>
            <Layers className="w-4 h-4" />
          </div>

          <div className="text-2xl font-black mt-1">
            {children.length}
          </div>

          <div className="text-xs text-slate-500 mt-1">
            {regionalChildren.length} Regional |{' '}
            {projectChildren.length} Project
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <div className="flex justify-between mb-1 text-xs font-bold text-slate-500">
            <span>Beneficiaries</span>
            <Users className="w-4 h-4" />
          </div>

          <div className="text-2xl font-black mt-1">
            {beneficiaries.toLocaleString()}
          </div>

          <div className="text-xs text-slate-500 mt-1">
            People reached
          </div>
        </div>
      </div>

      {/* QUARTERLY SUMMARY */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <CalendarClock className="w-4 h-4 text-ercs-red" />
          <span>Quarterly Plan vs Actual</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b">
              <tr>
                <th className="p-2">Quarter</th>
                <th className="p-2 text-right">Planned Target</th>
                <th className="p-2 text-right">Actual</th>
                <th className="p-2 text-right">Achievement</th>
                <th className="p-2 text-right">Planned Budget</th>
                <th className="p-2 text-right">Spent</th>
                <th className="p-2 text-right">Budget Util.</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {quarters.map(q => {
                const plannedT = sumPlannedTarget(
                  children,
                  quarterlyPlans,
                  q.id
                );
                const actualQ = sumActual(
                  children,
                  quarterlyActuals,
                  q.id
                );
                const achQ = achievementPct(actualQ, plannedT);
                const plannedB = sumPlannedBudget(
                  children,
                  quarterlyPlans,
                  q.id
                );
                const spentQ = sumExpenditure(
                  children,
                  quarterlyActuals,
                  q.id
                );
                const utilQ = budgetUtilizationPct(spentQ, plannedB);

                return (
                  <tr key={q.id} className="hover:bg-slate-50">
                    <td className="p-2 font-bold">{q.label}</td>
                    <td className="p-2 text-right">
                      {plannedT.toLocaleString()} {na.uom}
                    </td>
                    <td className="p-2 text-right font-bold">
                      {actualQ.toLocaleString()}
                    </td>
                    <td className="p-2 text-right font-black">
                      {achQ.toFixed(1)}%
                    </td>
                    <td className="p-2 text-right">
                      ETB {plannedB.toLocaleString()}
                    </td>
                    <td
                      className={`p-2 text-right font-bold ${
                        utilQ > 100 ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      ETB {spentQ.toLocaleString()}
                    </td>
                    <td
                      className={`p-2 text-right font-black ${
                        utilQ > 100 ? 'text-rose-600' : ''
                      }`}
                    >
                      {utilQ.toFixed(1)}%
                      {utilQ > 100 ? ' ⚠' : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {roleIsCoordinator && !children.length && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-800 font-semibold">
            No plan entry exists yet for your assigned Region/Project under this National Activity. Add the annual Plan Entry first; after that, Quarterly Plan and Quarterly Actual entry will become available here.
          </div>
        )}
      </div>

      {/* CHILD ENTRIES */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Layers className="w-4 h-4 text-ercs-red" />
            <span>Linked Plan Entries</span>
          </div>

          {children.length > 0 && (
            <div className="text-[10px] text-slate-400 font-semibold">
              Click a Region/Project to focus this page on that specific entry.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* REGIONAL */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs uppercase pb-2 border-b">
              <Building2 className="w-4 h-4 text-ercs-red" />
              <span>Regional ({regionalChildren.length})</span>
            </div>

            <div className="space-y-2">
              {regionalChildren.map(pe => {
                const reg = regions.find(r => r.id === pe.region_id);
                const cAct = sumActual([pe], quarterlyActuals);

                return (
                  <button
                    key={pe.id}
                    onClick={() => openChild(pe)}
                    className="w-full bg-white p-3 rounded-lg border shadow-sm flex justify-between text-xs text-left hover:border-ercs-red transition-colors"
                  >
                    <div>
                      <div className="font-bold">
                        {reg?.name || '—'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {pe.activity_code || na.code}
                      </div>
                      <div className="text-[10px] text-slate-600 font-semibold mt-0.5">
                        {pe.activity_name}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5 line-clamp-2">
                        {pe.activity_description}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-1">
                        Qtrly Plan Approved: {approvedPlanQuarters(pe.id)}/4 · Qtrly Actual Approved: {approvedActualQuarters(pe.id)}/4
                      </div>
                    </div>

                    <div className="text-right font-extrabold whitespace-nowrap ml-3">
                      {cAct.toLocaleString()} /{' '}
                      {pe.annual_target.toLocaleString()}
                    </div>
                  </button>
                );
              })}

              {regionalChildren.length === 0 && (
                <div className="text-xs text-slate-400 text-center py-3">
                  No regional entries for the current user/filter.
                </div>
              )}
            </div>
          </div>

          {/* PROJECT */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs uppercase pb-2 border-b">
              <FolderGit2 className="w-4 h-4 text-blue-600" />
              <span>Project ({projectChildren.length})</span>
            </div>

            <div className="space-y-2">
              {projectChildren.map(pe => {
                const prj = projects.find(p => p.id === pe.project_id);
                const cAct = sumActual([pe], quarterlyActuals);

                return (
                  <button
                    key={pe.id}
                    onClick={() => openChild(pe)}
                    className="w-full bg-white p-3 rounded-lg border shadow-sm flex justify-between text-xs text-left hover:border-blue-500 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-blue-800">
                        {prj?.name || '—'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {pe.activity_code || na.code}
                      </div>
                      <div className="text-[10px] text-slate-600 font-semibold mt-0.5">
                        {pe.activity_name}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5 line-clamp-2">
                        {pe.activity_description}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-1">
                        Qtrly Plan Approved: {approvedPlanQuarters(pe.id)}/4 · Qtrly Actual Approved: {approvedActualQuarters(pe.id)}/4
                      </div>
                    </div>

                    <div className="text-right font-extrabold whitespace-nowrap ml-3">
                      {cAct.toLocaleString()} /{' '}
                      {pe.annual_target.toLocaleString()}
                    </div>
                  </button>
                );
              })}

              {projectChildren.length === 0 && (
                <div className="text-xs text-slate-400 text-center py-3">
                  No project entries for the current user/filter.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
