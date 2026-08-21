// src/pages/ReportPage.tsx
import React from 'react';
import { useApp } from '../context/AppContext';
import { FilterBar } from '../components/common/FilterBar';
import { StatusBadge } from '../components/common/StatusBadge';
import { BudgetStatusBadge } from '../components/common/BudgetStatusBadge';
import { ApprovalStatusBadge } from '../components/common/ApprovalStatusBadge';
import {
  sumTarget,
  sumPlannedTarget,
  sumPlannedBudget,
  sumActual,
  sumExpenditure,
  achievementPct,
  budgetUtilizationPct,
  convertToBeneficiaries,
  getStatusBadge,
  getBudgetStatusBadge,
  filterByApprovalStatus,
} from '../utils/calculations';
import {
  PlanEntry,
  NationalActivity,
  Region,
  Project,
  QuarterlyPlan,
  QuarterlyActual,
  QuarterId,
} from '../types';
import { Target, Wallet, Users, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

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
    reportApprovalStatus,
  } = useApp();

  const roleFilteredEntries = getFilteredPlanEntries();

  // Plan-Entry-level filtering — unchanged from before.
  const filteredEntries = filterByApprovalStatus(roleFilteredEntries, reportApprovalStatus);

  // Quarterly-level filtering — NEW. A Plan Entry being Approved does not by
  // itself mean any of its quarters are Approved: each Quarterly Plan and
  // each Quarterly Actual has its own independent approval status. The
  // "Approved" report must only count quarters that are themselves
  // Approved; the "Draft" report shows everything not yet Approved. Every
  // aggregate below (KPIs, chart, execution table, breakdown tables) reads
  // from these filtered arrays instead of the raw context ones, so totals
  // stay reconciled with what's actually "live" in the selected view.
  const filteredQuarterlyPlans = filterByApprovalStatus(quarterlyPlans, reportApprovalStatus);
  const filteredQuarterlyActuals = filterByApprovalStatus(quarterlyActuals, reportApprovalStatus);

  const q = filters.quarterId;

  // Every National Activity can define its own UOM (Person, House Hold (HH), ...).
  // Summing raw Target/Actual across entries that don't share a UOM produces a
  // number with no real unit. This helper is reused for the top KPI card AND
  // every breakdown table below.
  const uomsFor = (es: typeof filteredEntries) =>
    Array.from(
      new Set(
        es
          .map(e => nationalActivities.find(na => na.id === e.national_activity_id)?.uom)
          .filter((u): u is string => !!u)
      )
    );

  const uomsInScope = uomsFor(filteredEntries);
  const singleUom = uomsInScope.length === 1 ? uomsInScope[0] : null;

  const beneficiariesFor = (entryIds: typeof filteredEntries) =>
    entryIds.reduce((sum, e) => {
      const na = nationalActivities.find(n => n.id === e.national_activity_id);
      const actual = sumActual([e], filteredQuarterlyActuals, q);
      return sum + convertToBeneficiaries(actual, na?.uom || '', uomConfigs);
    }, 0);

  // Quarter-aware:
  // when a specific quarter is selected, target/budget come from that
  // quarter's Quarterly Plan instead of the full annual figure.
  const target = sumPlannedTarget(filteredEntries, filteredQuarterlyPlans, q);
  const actual = sumActual(filteredEntries, filteredQuarterlyActuals, q);
  const achievement = achievementPct(actual, target);
  const budget = sumPlannedBudget(filteredEntries, filteredQuarterlyPlans, q);
  const spent = sumExpenditure(filteredEntries, filteredQuarterlyActuals, q);
  const utilization = budgetUtilizationPct(spent, budget);
  const beneficiaries = beneficiariesFor(filteredEntries);

  // How many entries in scope have no Quarterly Plan set for the selected
  // quarter — within the current report view (e.g. in the "Approved" view,
  // this counts entries with no APPROVED Quarterly Plan for that quarter).
  const missingQuarterlyPlanCount =
    q && q !== 'ALL'
      ? filteredEntries.filter(
          e => !filteredQuarterlyPlans.some(qp => qp.plan_entry_id === e.id && qp.quarter_id === q)
        ).length
      : 0;

  // ---------------------------------------------------------------------------
  // BREAKDOWN BY NATIONAL ACTIVITY
  // ---------------------------------------------------------------------------

  const byNational = nationalActivities
    .map(na => {
      const es = filteredEntries.filter(e => e.national_activity_id === na.id);
      if (es.length === 0) return null;

      const t = sumPlannedTarget(es, filteredQuarterlyPlans, q);
      const a = sumActual(es, filteredQuarterlyActuals, q);
      const b = sumPlannedBudget(es, filteredQuarterlyPlans, q);
      const x = sumExpenditure(es, filteredQuarterlyActuals, q);

      // When viewing ALL, use the official annual target stored
      // on the National Activity.
      //
      // When viewing Approved / Draft, use the sum of the entries
      // included in the selected report status.
      const officialTarget = reportApprovalStatus === 'ALL' ? na.annual_target : sumTarget(es);

      return {
        key: na.id,
        name: na.code,
        officialTarget,
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
      const es = filteredEntries.filter(e => e.region_id === r.id);
      if (es.length === 0) return null;

      const t = sumPlannedTarget(es, filteredQuarterlyPlans, q);
      const a = sumActual(es, filteredQuarterlyActuals, q);
      const b = sumPlannedBudget(es, filteredQuarterlyPlans, q);
      const x = sumExpenditure(es, filteredQuarterlyActuals, q);

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
      const es = filteredEntries.filter(e => e.project_id === p.id);
      if (es.length === 0) return null;

      const t = sumPlannedTarget(es, filteredQuarterlyPlans, q);
      const a = sumActual(es, filteredQuarterlyActuals, q);
      const b = sumPlannedBudget(es, filteredQuarterlyPlans, q);
      const x = sumExpenditure(es, filteredQuarterlyActuals, q);

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

  // ---------------------------------------------------------------------------
  // CHART
  // ---------------------------------------------------------------------------

  const chartData =
    filters.nationalActivityId !== 'ALL'
      ? filteredEntries.map(e => {
          const label =
            e.scope_type === 'Regional'
              ? regions.find(r => r.id === e.region_id)?.name
              : projects.find(p => p.id === e.project_id)?.name;

          const plannedTarget =
            q && q !== 'ALL'
              ? filteredQuarterlyPlans.find(qp => qp.plan_entry_id === e.id && qp.quarter_id === q)?.target || 0
              : e.annual_target;

          return {
            name: label || e.id,
            Target: plannedTarget,
            Actual: sumActual([e], filteredQuarterlyActuals, q),
          };
        })
      : byNational.map(row => ({
          name: row.name,
          Target: row.target,
          Actual: row.actual,
        }));

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* HEADER                                                             */}
      {/* ------------------------------------------------------------------ */}

      <div>
        <h2 className="text-xl font-black text-slate-800">Step 4 — Aggregated Report</h2>

        <p className="text-xs text-slate-500 mt-1">
          Everything below is derived live from the Plan, Quarterly Plan and Quarterly Actual
          Entry pages. Each level — the Plan Entry itself, and each quarter's Plan and Actual —
          has its own approval status; the Approved view below only counts rows that are
          themselves Approved, quarter by quarter. When a specific quarter is selected,
          Achievement and Budget Utilization compare against that quarter's Quarterly Plan
          rather than the full annual target — otherwise summed up by National Activity, Region and Project.
        </p>
      </div>

      <FilterBar showApprovalStatus />

      {/* ------------------------------------------------------------------ */}
      {/* APPROVAL STATUS INFO                                               */}
      {/* ------------------------------------------------------------------ */}

      <div
        className={`rounded-lg border px-3 py-2 text-[11px] font-semibold ${
          reportApprovalStatus === 'Approved'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}
      >
        {reportApprovalStatus === 'Approved'
          ? 'Only entries and quarterly submissions Approved by the National Activity AOP are included here — the Plan Entry AND the specific Quarterly Plan / Quarterly Actual for the selected quarter must each be Approved to count.'
          : reportApprovalStatus === 'Draft'
          ? 'Draft view includes everything not yet Approved — Plan Entries, Quarterly Plans and Quarterly Actuals that are still Draft, Pending Approval or Rejected.'
          : 'All view includes every execution entry and quarterly submission regardless of approval status.'}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* KPI CARDS                                                          */}
      {/* ------------------------------------------------------------------ */}

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
          val={String(filteredEntries.length)}
          sub="Matching current filters"
          icon={TrendingUp}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* CHART                                                              */}
      {/* ------------------------------------------------------------------ */}

      <div className="bg-white p-5 border rounded-xl shadow-sm h-72">
        <h3 className="text-xs font-bold mb-4 uppercase tracking-wide text-slate-600">
          {filters.nationalActivityId !== 'ALL'
            ? 'Target vs Actual — by Region / Project'
            : 'Target vs Actual — by National Activity'}
        </h3>

        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Target" fill="#cbd5e1" />
            <Bar dataKey="Actual" fill="#C8102E" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* EXECUTION ENTRIES                                                  */}
      {/* ------------------------------------------------------------------ */}

      <ExecutionEntriesTable
        entries={filteredEntries}
        nationalActivities={nationalActivities}
        regions={regions}
        projects={projects}
        quarterlyActuals={filteredQuarterlyActuals}
        quarterlyPlans={filteredQuarterlyPlans}
        rawQuarterlyPlans={quarterlyPlans}
        rawQuarterlyActuals={quarterlyActuals}
        quarterId={q}
      />

      {/* ------------------------------------------------------------------ */}
      {/* BREAKDOWN TABLES                                                   */}
      {/* ------------------------------------------------------------------ */}

      <ReportTable
        title="By National Activity"
        rows={byNational}
        extraColumn={{
          label: reportApprovalStatus === 'ALL' ? 'Official Target (Annual)' : `${reportApprovalStatus} Target (Annual)`,
          get: r => `${r.officialTarget.toLocaleString()} ${r.uoms[0]}`,
        }}
      />

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

// ===========================================================================
// ACHIEVEMENT KPI
// ===========================================================================

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
  const badge = getStatusBadge(achievement, hasActuals);
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

// ===========================================================================
// BUDGET KPI
// ===========================================================================

const BUDGET_TONE: Record<string, string> = {
  'Over Budget': 'text-rose-600',
  'Near Limit': 'text-amber-600',
  'On Budget': 'text-emerald-600',
  Planning: 'text-slate-800',
};

const BudgetKPICard: React.FC<{
  utilization: number;
  spent: number;
  budget: number;
  hasSpend: boolean;
}> = ({ utilization, spent, budget, hasSpend }) => {
  const badge = getBudgetStatusBadge(utilization, hasSpend);
  const tone = BUDGET_TONE[badge.label] || 'text-slate-800';

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
  quarterlyActuals: QuarterlyActual[]; // status-filtered — drives Actual/Spent
  quarterlyPlans: {
    plan_entry_id: string;
    quarter_id: QuarterId;
    target: number;
  }[]; // status-filtered — drives Target when a quarter is selected
  rawQuarterlyPlans: QuarterlyPlan[]; // unfiltered — used only for the approval-status column
  rawQuarterlyActuals: QuarterlyActual[]; // unfiltered — used only for the approval-status column
  quarterId: string;
}> = ({
  entries,
  nationalActivities,
  regions,
  projects,
  quarterlyActuals,
  quarterlyPlans,
  rawQuarterlyPlans,
  rawQuarterlyActuals,
  quarterId,
}) => {
  // Shows the CURRENT approval status regardless of which report view is
  // active, so a Coordinator/AOP can always see what's actually pending —
  // even while looking at the Draft view where the numbers themselves read
  // as 0 for anything already Approved.
  const quarterApprovalCell = (pe: PlanEntry): React.ReactNode => {
    if (quarterId && quarterId !== 'ALL') {
      const qa = rawQuarterlyActuals.find(a => a.plan_entry_id === pe.id && a.quarter_id === quarterId);
      const qp = rawQuarterlyPlans.find(p => p.plan_entry_id === pe.id && p.quarter_id === quarterId);
      const status = qa?.approval_status || qp?.approval_status;
      return status ? <ApprovalStatusBadge status={status} /> : <span className="text-slate-300">—</span>;
    }
    const totalQuarters = rawQuarterlyActuals.filter(a => a.plan_entry_id === pe.id).length;
    const approvedQuarters = rawQuarterlyActuals.filter(
      a => a.plan_entry_id === pe.id && a.approval_status === 'Approved'
    ).length;
    return <span className="text-[10px] font-bold text-slate-600">{approvedQuarters}/{totalQuarters || 4} Approved</span>;
  };

  return (
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
              <th className="p-3 text-center">Approval Status</th>
              <th className="p-3 text-center">Quarterly Actual Status</th>
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

                  <td className="p-3 text-center"><ApprovalStatusBadge status={pe.approval_status} /></td>
                  <td className="p-3 text-center">{quarterApprovalCell(pe)}</td>
                </tr>
              );
            })}

            {entries.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">
                  No execution entries are available for this report status and filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

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
  extraColumn?: {
    label: string;
    get: (r: any) => string;
  };
}> = ({ title, rows, extraColumn }) => (
  <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
    <div className="p-4 border-b bg-slate-50 text-xs font-bold text-slate-800 uppercase tracking-wider">
      {title} ({rows.length})
    </div>

    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b">
          <tr>
            <th className="p-3">Name</th>

            {extraColumn && <th className="p-3 text-right">{extraColumn.label}</th>}

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
                    <div
                      className="mt-1 inline-flex items-center gap-1 text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5"
                      title={`Mixed units (${r.uoms.join(', ')}) — Target, Actual and Achievement for this row sum raw counts across different UOMs and are not a real, comparable number.`}
                    >
                      ⚠ Mixed Units
                    </div>
                  )}
                </td>

                {extraColumn && <td className="p-3 text-right text-slate-500">{extraColumn.get(r)}</td>}

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
              <td colSpan={extraColumn ? 10 : 9} className="p-6 text-center text-slate-500">
                No data for this filter yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);
