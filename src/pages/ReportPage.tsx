// src/pages/ReportPage.tsx
import React from 'react';
import { useApp } from '../context/AppContext';
import { FilterBar } from '../components/common/FilterBar';
import { StatusBadge } from '../components/common/StatusBadge';
import { BudgetStatusBadge } from '../components/common/BudgetStatusBadge';
import {
  sumPlannedTarget,
  sumPlannedBudget,
  sumActual,
  sumExpenditure,
  achievementPct,
  budgetUtilizationPct,
  convertToBeneficiaries,
} from '../utils/calculations';
import {
  PlanEntry,
  NationalActivity,
  Region,
  Project,
  QuarterlyPlan,
  QuarterlyActual,
} from '../types';
import { Target, Wallet, Users, TrendingUp } from 'lucide-react';

export const ReportPage: React.FC = () => {
  const {
    nationalActivities,
    regions,
    projects,
    quarterlyPlans,
    quarterlyActuals,
    uomConfigs,
    filters,
    getFilteredPlanEntries,
  } = useApp();

  const entries = getFilteredPlanEntries();
  const q = filters.quarterId;

  const uomsFor = (es: typeof entries) =>
    Array.from(
      new Set(
        es
          .map(e => nationalActivities.find(na => na.id === e.national_activity_id)?.uom)
          .filter((u): u is string => !!u)
      )
    );

  const uomsInScope = uomsFor(entries);
  const singleUom = uomsInScope.length === 1 ? uomsInScope[0] : null;

  const beneficiariesFor = (entryIds: typeof entries) =>
    entryIds.reduce((sum, e) => {
      const na = nationalActivities.find(n => n.id === e.national_activity_id);
      const actual = sumActual([e], quarterlyActuals, q);
      return sum + convertToBeneficiaries(actual, na?.uom || '', uomConfigs);
    }, 0);

  const target = sumPlannedTarget(entries, quarterlyPlans, q);
  const actual = sumActual(entries, quarterlyActuals, q);
  const achievement = achievementPct(actual, target);
  const budget = sumPlannedBudget(entries, quarterlyPlans, q);
  const spent = sumExpenditure(entries, quarterlyActuals, q);
  const utilization = budgetUtilizationPct(spent, budget);
  const beneficiaries = beneficiariesFor(entries);

  const missingQuarterlyPlanCount =
    q && q !== 'ALL'
      ? entries.filter(
          e => !quarterlyPlans.some(qp => qp.plan_entry_id === e.id && qp.quarter_id === q)
        ).length
      : 0;

  // ---------------------------------------------------------------------------
  // BREAKDOWN BY NATIONAL ACTIVITY
  // ---------------------------------------------------------------------------
  const byNational = nationalActivities
    .map(na => {
      const es = entries.filter(e => e.national_activity_id === na.id);
      if (es.length === 0) return null;

      const t = sumPlannedTarget(es, quarterlyPlans, q);
      const a = sumActual(es, quarterlyActuals, q);
      const b = sumPlannedBudget(es, quarterlyPlans, q);
      const x = sumExpenditure(es, quarterlyActuals, q);

      return {
        key: na.id,
        name: na.code,
        target: t,
        actual: a,
        achievement: achievementPct(a, t),
        budget: b,
        spent: x,
        beneficiaries: beneficiariesFor(es),
        uoms: [na.uom],
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // ---------------------------------------------------------------------------
  // BREAKDOWN BY REGION
  // ---------------------------------------------------------------------------
  const byRegion = regions
    .map(r => {
      const es = entries.filter(e => e.region_id === r.id);
      if (es.length === 0) return null;

      const t = sumPlannedTarget(es, quarterlyPlans, q);
      const a = sumActual(es, quarterlyActuals, q);
      const b = sumPlannedBudget(es, quarterlyPlans, q);
      const x = sumExpenditure(es, quarterlyActuals, q);

      return {
        key: r.id,
        name: r.name,
        target: t,
        actual: a,
        achievement: achievementPct(a, t),
        budget: b,
        spent: x,
        beneficiaries: beneficiariesFor(es),
        uoms: uomsFor(es),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // ---------------------------------------------------------------------------
  // BREAKDOWN BY PROJECT
  // ---------------------------------------------------------------------------
  const byProject = projects
    .map(p => {
      const es = entries.filter(e => e.project_id === p.id);
      if (es.length === 0) return null;

      const t = sumPlannedTarget(es, quarterlyPlans, q);
      const a = sumActual(es, quarterlyActuals, q);
      const b = sumPlannedBudget(es, quarterlyPlans, q);
      const x = sumExpenditure(es, quarterlyActuals, q);

      return {
        key: p.id,
        name: p.name,
        target: t,
        actual: a,
        achievement: achievementPct(a, t),
        budget: b,
        spent: x,
        beneficiaries: beneficiariesFor(es),
        uoms: uomsFor(es),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-800">Step 4 — Aggregated Report</h2>
        <p className="text-xs text-slate-500 mt-1">
          Everything below is derived live from the Plan, Quarterly Plan and Quarterly Actual
          Entry pages. All entries are automatically approved and included. When a specific quarter is selected,
          Achievement and Budget Utilization compare against that quarter's Quarterly Plan
          rather than the full annual target — otherwise summed up by National Activity, Region and Project.
        </p>
      </div>

      <FilterBar />

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AchievementKPICard
          achievement={achievement}
          actual={actual}
          target={target}
          singleUom={singleUom}
          uomsInScope={uomsInScope}
          hasActuals={actual > 0}
          missingPlanCount={missingQuarterlyPlanCount}
          quarterId={q !== 'ALL' ? q : ''}
        />

        <BudgetKPICard utilization={utilization} spent={spent} budget={budget} hasSpend={spent > 0} />

        <KPICard
          title="Beneficiaries Reached"
          val={beneficiaries.toLocaleString()}
          sub="Actual × Conversion Factor"
          icon={Users}
        />

        <KPICard
          title="Plan Entries in Scope"
          val={String(entries.length)}
          sub="Matching current filters"
          icon={TrendingUp}
        />
      </div>

      {/* EXECUTION ENTRIES TABLE */}
      <ExecutionEntriesTable
        entries={entries}
        nationalActivities={nationalActivities}
        regions={regions}
        projects={projects}
        quarterlyActuals={quarterlyActuals}
        quarterlyPlans={quarterlyPlans}
        quarterId={q}
      />

      {/* BREAKDOWN TABLES */}
      <ReportTable title="By National Activity" rows={byNational} />
      <ReportTable title="By Region" rows={byRegion} />
      <ReportTable title="By Project" rows={byProject} />
    </div>
  );
};

// ===========================================================================
// KPI CARD
// ===========================================================================
const KPICard = ({ title, val, sub, icon: Icon }: any) => (
  <div className="bg-white p-4 rounded-xl border shadow-sm">
    <div className="flex justify-between mb-2 text-xs font-bold text-slate-500">
      <span>{title}</span>
      <Icon className="w-4 h-4" />
    </div>
    <div className="text-2xl font-black">{val}</div>
    <div className="text-[10px] mt-1 text-slate-500">{sub}</div>
  </div>
);

const ACHIEVEMENT_TONE: Record<string, string> = {
  Overachieved: 'text-indigo-600',
  Completed: 'text-emerald-600',
  'On Track': 'text-emerald-600',
  'At Risk': 'text-amber-600',
  Behind: 'text-rose-600',
  Planning: 'text-slate-800',
};

const AchievementKPICard: React.FC<{
  achievement: number;
  actual: number;
  target: number;
  singleUom: string | null;
  uomsInScope: string[];
  hasActuals: boolean;
  missingPlanCount: number;
  quarterId: string;
}> = ({ achievement, actual, target, singleUom, uomsInScope, hasActuals, missingPlanCount, quarterId }) => {
  const badge = { label: achievement >= 100 ? 'Completed' : achievement >= 60 ? 'On Track' : 'Behind', color: achievement >= 100 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : achievement >= 60 ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-rose-100 text-rose-800 border-rose-300' };
  const tone = ACHIEVEMENT_TONE[badge.label] || 'text-slate-800';

  return (
    <div className="bg-white p-4 rounded-xl border shadow-sm">
      <div className="flex justify-between mb-2 text-xs font-bold text-slate-500">
        <span>Achievement</span>
        <Target className="w-4 h-4" />
      </div>
      <div className={`text-2xl font-black ${tone}`}>{achievement.toFixed(1)}%</div>
      <div className="text-[10px] mt-1 text-slate-500">
        {actual.toLocaleString()} / {target.toLocaleString()}
        {singleUom ? ` ${singleUom}` : ''}
      </div>
      <div className="mt-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
          {badge.label}
        </span>
      </div>
      {uomsInScope.length > 1 && (
        <div className="mt-2 text-[9px] leading-snug text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-1 font-semibold">
          ⚠ Mixed units in scope ({uomsInScope.join(', ')}) — this % sums raw counts across different
          UOMs and is not a real unit. Filter to one National Activity for a precise reading.
        </div>
      )}
      {missingPlanCount > 0 && (
        <div className="mt-2 text-[9px] leading-snug text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-1 font-semibold">
          ⚠ {missingPlanCount} plan {missingPlanCount === 1 ? 'entry has' : 'entries have'} no {quarterId} Quarterly Plan
          counted in this view — counted as 0 planned in this comparison.
        </div>
      )}
    </div>
  );
};

const BudgetKPICard: React.FC<{
  utilization: number;
  spent: number;
  budget: number;
  hasSpend: boolean;
}> = ({ utilization, spent, budget, hasSpend }) => {
  const badge = { label: utilization > 100 ? 'Over Budget' : utilization >= 90 ? 'Near Limit' : 'On Budget', color: utilization > 100 ? 'bg-rose-100 text-rose-800 border-rose-300' : utilization >= 90 ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  const tone = utilization > 100 ? 'text-rose-600' : utilization >= 90 ? 'text-amber-600' : 'text-emerald-600';

  return (
    <div className="bg-white p-4 rounded-xl border shadow-sm">
      <div className="flex justify-between mb-2 text-xs font-bold text-slate-500">
        <span>Budget Utilization</span>
        <Wallet className="w-4 h-4" />
      </div>
      <div className={`text-2xl font-black ${tone}`}>{utilization.toFixed(1)}%</div>
      <div className="text-[10px] mt-1 text-slate-500">
        ETB {spent.toLocaleString()} / {budget.toLocaleString()}
      </div>
      <div className="mt-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
          {badge.label}
        </span>
      </div>
    </div>
  );
};

// ===========================================================================
// EXECUTION ENTRIES TABLE
// ===========================================================================
const ExecutionEntriesTable: React.FC<{
  entries: PlanEntry[];
  nationalActivities: NationalActivity[];
  regions: Region[];
  projects: Project[];
  quarterlyActuals: QuarterlyActual[];
  quarterlyPlans: QuarterlyPlan[];
  quarterId: string;
}> = ({
  entries,
  nationalActivities,
  regions,
  projects,
  quarterlyActuals,
  quarterlyPlans,
  quarterId,
}) => (
  <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
    <div className="p-4 border-b bg-slate-50 text-xs font-bold text-slate-800 uppercase tracking-wider">
      Execution Plan Entries ({entries.length})
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b">
          <tr>
            <th className="p-3">Activity Code</th>
            <th className="p-3">Activity Description</th>
            <th className="p-3">Executed By</th>
            <th className="p-3 text-right">Target</th>
            <th className="p-3 text-right">Actual</th>
            <th className="p-3 text-right">Spent</th>
            <th className="p-3 text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {entries.map(pe => {
            const na = nationalActivities.find(n => n.id === pe.national_activity_id);
            const scopeName =
              pe.scope_type === 'Regional'
                ? regions.find(r => r.id === pe.region_id)?.name
                : projects.find(p => p.id === pe.project_id)?.name;

            const actual = sumActual([pe], quarterlyActuals, quarterId);
            const spent = sumExpenditure([pe], quarterlyActuals, quarterId);
            const target =
              quarterId && quarterId !== 'ALL'
                ? quarterlyPlans.find(qp => qp.plan_entry_id === pe.id && qp.quarter_id === quarterId)?.target || 0
                : pe.annual_target;

            return (
              <tr key={pe.id} className="hover:bg-slate-50">
                <td className="p-3 font-bold text-ercs-red">{pe.activity_code}</td>
                <td className="p-3 min-w-80">
                  <div className="font-bold text-slate-800">{pe.activity_name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{pe.activity_description}</div>
                  <div className="text-[9px] text-slate-400 mt-1">Parent: {na?.code}</div>
                </td>
                <td className="p-3">
                  <span className="font-semibold">{scopeName || '—'}</span>
                  <div className="text-[10px] text-slate-400">{pe.scope_type}</div>
                </td>
                <td className="p-3 text-right font-bold">{target.toLocaleString()} {na?.uom}</td>
                <td className="p-3 text-right">{actual.toLocaleString()} {na?.uom}</td>
                <td className="p-3 text-right">ETB {spent.toLocaleString()}</td>
                <td className="p-3 text-center"><span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-100 text-emerald-800 border-emerald-300">Approved</span></td>
              </tr>
            );
          })}
          {entries.length === 0 && (
            <tr>
              <td colSpan={7} className="p-6 text-center text-slate-500">
                No execution entries are available for this filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

// ===========================================================================
// REPORT TABLE
// ===========================================================================
interface Row {
  key: string;
  name: string;
  target: number;
  actual: number;
  achievement: number;
  budget: number;
  spent: number;
  beneficiaries: number;
  uoms: string[];
}

const ReportTable: React.FC<{
  title: string;
  rows: Row[];
}> = ({ title, rows }) => (
  <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
    <div className="p-4 border-b bg-slate-50 text-xs font-bold text-slate-800 uppercase tracking-wider">
      {title} ({rows.length})
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b">
          <tr>
            <th className="p-3">Name</th>
            <th className="p-3 text-right">Target</th>
            <th className="p-3 text-right">Actual</th>
            <th className="p-3 text-right">Achievement</th>
            <th className="p-3 text-right">Budget (ETB)</th>
            <th className="p-3 text-right">Spent (ETB)</th>
            <th className="p-3 text-right">Beneficiaries</th>
            <th className="p-3 text-center">Status</th>
            <th className="p-3 text-center">Budget Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(r => {
            const rowBudgetUtil = budgetUtilizationPct(r.spent, r.budget);
            const mixedUnits = r.uoms.length > 1;
            const unitSuffix = r.uoms.length === 1 ? ` ${r.uoms[0]}` : '';

            return (
              <tr key={r.key} className="hover:bg-slate-50">
                <td className="p-3 font-bold text-slate-800">
                  <div>{r.name}</div>
                  {mixedUnits && (
                    <div className="mt-1 inline-flex items-center gap-1 text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                      ⚠ Mixed Units
                    </div>
                  )}
                </td>
                <td className="p-3 text-right">{r.target.toLocaleString()}{unitSuffix}</td>
                <td className="p-3 text-right font-bold">{r.actual.toLocaleString()}{unitSuffix}</td>
                <td className="p-3 text-right font-black">{r.achievement.toFixed(1)}%</td>
                <td className="p-3 text-right">{r.budget.toLocaleString()}</td>
                <td className={`p-3 text-right font-bold ${rowBudgetUtil > 100 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {r.spent.toLocaleString()}
                </td>
                <td className="p-3 text-right font-black text-blue-600">{r.beneficiaries.toLocaleString()}</td>
                <td className="p-3 text-center">
                  <StatusBadge achievementPct={r.achievement} hasActuals={r.actual > 0} />
                </td>
                <td className="p-3 text-center">
                  <BudgetStatusBadge utilizationPct={rowBudgetUtil} hasSpend={r.spent > 0} />
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="p-6 text-center text-slate-500">
                No data for this filter yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);