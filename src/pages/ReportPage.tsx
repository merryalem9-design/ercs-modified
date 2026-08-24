// src/pages/ReportPage.tsx
import React from 'react';
import { useApp } from '../context/AppContext';
import { FilterBar } from '../components/common/FilterBar';
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
  UomFactorConfig,
} from '../types';
import { Target, Wallet, Users, TrendingUp, Layers } from 'lucide-react';

/** Beneficiary % = beneficiaries actually reached vs. beneficiaries planned. */
const beneficiaryPct = (actualBen: number, totalBen: number): number =>
  totalBen === 0 ? 0 : (actualBen / totalBen) * 100;

// KPI card status badges — shown only when a percentage exceeds 100%.
// Values themselves are never capped; this is purely a visual flag.
type KpiBadge = { label: string; color: string };
const OVERACHIEVED_BADGE: KpiBadge = { label: 'Overachieved', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
const OVER_BUDGET_BADGE: KpiBadge = { label: 'Over Budget', color: 'bg-rose-100 text-rose-800 border-rose-300' };

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

  // 'NONE' on either select means "skip the Region/Project-level detail,
  // just show me the National Activity summary" — see FilterBar's
  // allowNoneScope. It never restricts `entries` itself (AppContext treats
  // it the same as 'ALL'), so the KPI cards and the National Activity table
  // below are always the full totals for whatever else is filtered.
  const hideDetailBreakdown = filters.regionId === 'NONE' || filters.projectId === 'NONE';

  const uomsFor = (es: PlanEntry[]) =>
    Array.from(
      new Set(
        es
          .map(e => nationalActivities.find(na => na.id === e.national_activity_id)?.uom)
          .filter((u): u is string => !!u)
      )
    );

  const uomsInScope = uomsFor(entries);
  const singleUom = uomsInScope.length === 1 ? uomsInScope[0] : null;

  // Total Beneficiaries — planned reach (quarter-aware Target × conversion factor).
  const totalBeneficiariesFor = (es: PlanEntry[]) =>
    es.reduce((sum, e) => {
      const na = nationalActivities.find(n => n.id === e.national_activity_id);
      const t = sumPlannedTarget([e], quarterlyPlans, q);
      return sum + convertToBeneficiaries(t, na?.uom || '', uomConfigs);
    }, 0);

  // Actual Beneficiaries — beneficiaries actually reached (quarter-aware Actual × factor).
  const actualBeneficiariesFor = (es: PlanEntry[]) =>
    es.reduce((sum, e) => {
      const na = nationalActivities.find(n => n.id === e.national_activity_id);
      const a = sumActual([e], quarterlyActuals, q);
      return sum + convertToBeneficiaries(a, na?.uom || '', uomConfigs);
    }, 0);

  const target = sumPlannedTarget(entries, quarterlyPlans, q);
  const actual = sumActual(entries, quarterlyActuals, q);
  const achievement = achievementPct(actual, target);
  const budget = sumPlannedBudget(entries, quarterlyPlans, q);
  const spent = sumExpenditure(entries, quarterlyActuals, q);
  const utilization = budgetUtilizationPct(spent, budget);
  const totalBeneficiaries = totalBeneficiariesFor(entries);
  const actualBeneficiaries = actualBeneficiariesFor(entries);

  const missingQuarterlyPlanCount =
    q && q !== 'ALL'
      ? entries.filter(
          e => !quarterlyPlans.some(qp => qp.plan_entry_id === e.id && qp.quarter_id === q)
        ).length
      : 0;

  const achievementWarning =
    uomsInScope.length > 1
      ? `Mixed units in scope (${uomsInScope.join(', ')}) — this % sums raw counts across different UOMs and is not a real unit. Filter to one National Activity for a precise reading.`
      : missingQuarterlyPlanCount > 0
        ? `${missingQuarterlyPlanCount} plan ${missingQuarterlyPlanCount === 1 ? 'entry has' : 'entries have'} no ${q} Quarterly Plan — counted as 0 planned in this comparison.`
        : undefined;

  // ---------------------------------------------------------------------------
  // BREAKDOWN BY NATIONAL ACTIVITY — mirrors the Excel "Report" sheet columns.
  // ---------------------------------------------------------------------------
  const byNational: NationalActivityRow[] = nationalActivities
    .map(na => {
      const es = entries.filter(e => e.national_activity_id === na.id);
      if (es.length === 0) return null;

      const t = sumPlannedTarget(es, quarterlyPlans, q);
      const a = sumActual(es, quarterlyActuals, q);
      const b = sumPlannedBudget(es, quarterlyPlans, q);
      const x = sumExpenditure(es, quarterlyActuals, q);
      const tb = totalBeneficiariesFor(es);
      const ab = actualBeneficiariesFor(es);

      return {
        key: na.id,
        code: na.code,
        name: na.description,
        uom: na.uom,
        target: t,
        actual: a,
        achievement: achievementPct(a, t),
        budget: b,
        spent: x,
        utilization: budgetUtilizationPct(x, b),
        totalBeneficiaries: tb,
        actualBeneficiaries: ab,
        beneficiaryPct: beneficiaryPct(ab, tb),
      };
    })
    .filter((r): r is NationalActivityRow => r !== null);

  // ---------------------------------------------------------------------------
  // BREAKDOWN BY REGION / BY PROJECT
  // ---------------------------------------------------------------------------
  const buildScopeRows = (
    scopes: { id: string; name: string }[],
    matches: (e: PlanEntry, scopeId: string) => boolean
  ): ScopeRow[] =>
    scopes
      .map(scope => {
        const es = entries.filter(e => matches(e, scope.id));
        if (es.length === 0) return null;

        const t = sumPlannedTarget(es, quarterlyPlans, q);
        const a = sumActual(es, quarterlyActuals, q);
        const b = sumPlannedBudget(es, quarterlyPlans, q);
        const x = sumExpenditure(es, quarterlyActuals, q);
        const tb = totalBeneficiariesFor(es);
        const ab = actualBeneficiariesFor(es);

        return {
          key: scope.id,
          name: scope.name,
          target: t,
          actual: a,
          achievement: achievementPct(a, t),
          budget: b,
          spent: x,
          utilization: budgetUtilizationPct(x, b),
          totalBeneficiaries: tb,
          actualBeneficiaries: ab,
          beneficiaryPct: beneficiaryPct(ab, tb),
          uoms: uomsFor(es),
        };
      })
      .filter((r): r is ScopeRow => r !== null);

  const byRegion = buildScopeRows(regions, (e, id) => e.region_id === id);
  const byProject = buildScopeRows(projects, (e, id) => e.project_id === id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-800">Step 4 — Aggregated Report</h2>
        <p className="text-xs text-slate-500 mt-1">
          Everything below is derived live from the Plan, Quarterly Plan and Quarterly Actual Entry
          pages — every figure is a bottom-up sum, there's no nationally assigned ceiling behind it.
          When a specific quarter is selected, Target/Budget compare against that quarter's Quarterly
          Plan instead of the full annual figure. Total Beneficiaries is the planned reach (Target ×
          conversion factor); Actual Beneficiaries is what's actually been reached so far. Set Region
          or Project to "None" below to hide the detailed breakdown tables and see just the National
          Activity summary.
        </p>
      </div>

      <FilterBar allowNoneScope />

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Achievement"
          val={`${achievement.toFixed(1)}%`}
          sub={`${actual.toLocaleString()} / ${target.toLocaleString()}${singleUom ? ` ${singleUom}` : ''}`}
          icon={Target}
          warning={achievementWarning}
          statusBadge={achievement > 100 ? OVERACHIEVED_BADGE : undefined}
        />
        <KPICard
          title="Budget Utilization"
          val={`${utilization.toFixed(1)}%`}
          sub={`ETB ${spent.toLocaleString()} / ${budget.toLocaleString()}`}
          icon={Wallet}
          statusBadge={utilization > 100 ? OVER_BUDGET_BADGE : undefined}
        />
        <KPICard
          title="Beneficiaries Reached"
          val={actualBeneficiaries.toLocaleString()}
          sub={`of ${totalBeneficiaries.toLocaleString()} planned · Actual × Conversion Factor`}
          icon={Users}
        />
        <KPICard
          title="Plan Entries in Scope"
          val={String(entries.length)}
          sub="Matching current filters"
          icon={TrendingUp}
        />
      </div>

      {/* BREAKDOWN BY NATIONAL ACTIVITY — always shown first/top-level. */}
      <NationalActivityReportTable rows={byNational} />

      {hideDetailBreakdown ? (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-2.5 text-xs text-blue-800 font-semibold">
          <Layers className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Showing the National Activity summary only. Set Region and Project back to "All" in the
            filters above to see the full Execution Plan Entries, By Region and By Project breakdowns
            again.
          </span>
        </div>
      ) : (
        <>
          {/* EXECUTION ENTRIES TABLE */}
          <ExecutionEntriesTable
            entries={entries}
            nationalActivities={nationalActivities}
            regions={regions}
            projects={projects}
            quarterlyPlans={quarterlyPlans}
            quarterlyActuals={quarterlyActuals}
            uomConfigs={uomConfigs}
            quarterId={q}
          />

          <ScopeReportTable title="By Region" rows={byRegion} />
          <ScopeReportTable title="By Project" rows={byProject} />
        </>
      )}
    </div>
  );
};

// ===========================================================================
// KPI CARD — plain numbers, with an optional status badge (e.g. "Over
// Budget" / "Overachieved") shown next to the value when a percentage
// exceeds 100%. Values are never capped — the badge is purely a visual flag.
// ===========================================================================
const KPICard: React.FC<{
  title: string;
  val: React.ReactNode;
  sub: React.ReactNode;
  icon: any;
  warning?: string;
  statusBadge?: KpiBadge;
}> = ({ title, val, sub, icon: Icon, warning, statusBadge }) => (
  <div className="bg-white p-4 rounded-xl border shadow-sm">
    <div className="flex justify-between mb-2 text-xs font-bold text-slate-500">
      <span>{title}</span>
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex items-center gap-2 flex-wrap">
      <div className="text-2xl font-black text-slate-800">{val}</div>
      {statusBadge && (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.color}`}>
          {statusBadge.label}
        </span>
      )}
    </div>
    <div className="text-[10px] mt-1 text-slate-500">{sub}</div>
    {warning && (
      <div className="mt-2 text-[9px] leading-snug text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-1 font-semibold">
        ⚠ {warning}
      </div>
    )}
  </div>
);

// ===========================================================================
// EXECUTION ENTRIES TABLE — one row per Plan Entry, full Excel "Report" column set.
// ===========================================================================
const ExecutionEntriesTable: React.FC<{
  entries: PlanEntry[];
  nationalActivities: NationalActivity[];
  regions: Region[];
  projects: Project[];
  quarterlyPlans: QuarterlyPlan[];
  quarterlyActuals: QuarterlyActual[];
  uomConfigs: UomFactorConfig[];
  quarterId: string;
}> = ({ entries, nationalActivities, regions, projects, quarterlyPlans, quarterlyActuals, uomConfigs, quarterId }) => (
  <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
    <div className="p-4 border-b bg-slate-50 text-xs font-bold text-slate-800 uppercase tracking-wider">
      Execution Plan Entries ({entries.length})
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b">
          <tr>
            <th className="p-3">Code</th>
            <th className="p-3">Activity Name</th>
            <th className="p-3">Description</th>
            <th className="p-3">UOM</th>
            <th className="p-3">Executed By</th>
            <th className="p-3 text-right">Target</th>
            <th className="p-3 text-right">Actual</th>
            <th className="p-3 text-right">Achievement %</th>
            <th className="p-3 text-right">Budget (ETB)</th>
            <th className="p-3 text-right">Spent (ETB)</th>
            <th className="p-3 text-right">Utilization %</th>
            <th className="p-3 text-right">Total Beneficiaries</th>
            <th className="p-3 text-right">Actual Beneficiaries</th>
            <th className="p-3 text-right">Beneficiary %</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {entries.map(pe => {
            const na = nationalActivities.find(n => n.id === pe.national_activity_id);
            const scopeName =
              pe.scope_type === 'Regional'
                ? regions.find(r => r.id === pe.region_id)?.name
                : projects.find(p => p.id === pe.project_id)?.name;

            const target = sumPlannedTarget([pe], quarterlyPlans, quarterId);
            const actual = sumActual([pe], quarterlyActuals, quarterId);
            const budget = sumPlannedBudget([pe], quarterlyPlans, quarterId);
            const spent = sumExpenditure([pe], quarterlyActuals, quarterId);
            const achievement = achievementPct(actual, target);
            const utilization = budgetUtilizationPct(spent, budget);
            const totalBen = convertToBeneficiaries(target, na?.uom || '', uomConfigs);
            const actualBen = convertToBeneficiaries(actual, na?.uom || '', uomConfigs);
            const benPct = beneficiaryPct(actualBen, totalBen);

            return (
              <tr key={pe.id} className="hover:bg-slate-50">
                {/* Always the parent National Activity's own code — never a
                    Region/Project-suffixed variant, regardless of what may be
                    stored on the entry itself. */}
                <td className="p-3 font-bold text-ercs-red whitespace-nowrap">{na?.code}</td>
                <td className="p-3 min-w-40 font-bold text-slate-800">{pe.activity_name}</td>
                <td className="p-3 min-w-56 text-slate-500">{pe.activity_description}</td>
                <td className="p-3 whitespace-nowrap text-slate-500 font-semibold">{na?.uom}</td>
                <td className="p-3 whitespace-nowrap">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      pe.scope_type === 'Regional' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                    }`}
                  >
                    {pe.scope_type}
                  </span>
                  <span className="ml-2 font-semibold">{scopeName || '—'}</span>
                </td>
                <td className="p-3 text-right font-bold whitespace-nowrap">{target.toLocaleString()}</td>
                <td className="p-3 text-right whitespace-nowrap">{actual.toLocaleString()}</td>
                <td className="p-3 text-right font-bold whitespace-nowrap">{achievement.toFixed(1)}%</td>
                <td className="p-3 text-right whitespace-nowrap">{budget.toLocaleString()}</td>
                <td className="p-3 text-right whitespace-nowrap">{spent.toLocaleString()}</td>
                <td className="p-3 text-right font-bold whitespace-nowrap">{utilization.toFixed(1)}%</td>
                <td className="p-3 text-right whitespace-nowrap">{totalBen.toLocaleString()}</td>
                <td className="p-3 text-right whitespace-nowrap">{actualBen.toLocaleString()}</td>
                <td className="p-3 text-right whitespace-nowrap">{benPct.toFixed(1)}%</td>
              </tr>
            );
          })}
          {entries.length === 0 && (
            <tr>
              <td colSpan={14} className="p-6 text-center text-slate-500">
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
// BY NATIONAL ACTIVITY TABLE
// ===========================================================================
interface NationalActivityRow {
  key: string;
  code: string;
  name: string;
  uom: string;
  target: number;
  actual: number;
  achievement: number;
  budget: number;
  spent: number;
  utilization: number;
  totalBeneficiaries: number;
  actualBeneficiaries: number;
  beneficiaryPct: number;
}

const NationalActivityReportTable: React.FC<{ rows: NationalActivityRow[] }> = ({ rows }) => (
  <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
    <div className="p-4 border-b bg-slate-50 text-xs font-bold text-slate-800 uppercase tracking-wider">
      By National Activity ({rows.length})
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b">
          <tr>
            <th className="p-3">Code</th>
            <th className="p-3">Activity</th>
            <th className="p-3">UOM</th>
            <th className="p-3 text-right">Target</th>
            <th className="p-3 text-right">Actual</th>
            <th className="p-3 text-right">Achievement %</th>
            <th className="p-3 text-right">Budget (ETB)</th>
            <th className="p-3 text-right">Spent (ETB)</th>
            <th className="p-3 text-right">Utilization %</th>
            <th className="p-3 text-right">Total Beneficiaries</th>
            <th className="p-3 text-right">Actual Beneficiaries</th>
            <th className="p-3 text-right">Beneficiary %</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(r => (
            <tr key={r.key} className="hover:bg-slate-50">
              <td className="p-3 font-bold text-ercs-red whitespace-nowrap">{r.code}</td>
              <td className="p-3 font-bold text-slate-800 min-w-56">{r.name}</td>
              <td className="p-3 whitespace-nowrap text-slate-500 font-semibold">{r.uom}</td>
              <td className="p-3 text-right">{r.target.toLocaleString()}</td>
              <td className="p-3 text-right font-bold">{r.actual.toLocaleString()}</td>
              <td className="p-3 text-right font-black">{r.achievement.toFixed(1)}%</td>
              <td className="p-3 text-right">{r.budget.toLocaleString()}</td>
              <td className="p-3 text-right">{r.spent.toLocaleString()}</td>
              <td className="p-3 text-right font-black">{r.utilization.toFixed(1)}%</td>
              <td className="p-3 text-right">{r.totalBeneficiaries.toLocaleString()}</td>
              <td className="p-3 text-right font-black text-blue-600">{r.actualBeneficiaries.toLocaleString()}</td>
              <td className="p-3 text-right">{r.beneficiaryPct.toFixed(1)}%</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={12} className="p-6 text-center text-slate-500">
                No data for this filter yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

// ===========================================================================
// BY REGION / BY PROJECT TABLE
// ===========================================================================
interface ScopeRow {
  key: string;
  name: string;
  target: number;
  actual: number;
  achievement: number;
  budget: number;
  spent: number;
  utilization: number;
  totalBeneficiaries: number;
  actualBeneficiaries: number;
  beneficiaryPct: number;
  uoms: string[];
}

const ScopeReportTable: React.FC<{ title: string; rows: ScopeRow[] }> = ({ title, rows }) => (
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
            <th className="p-3 text-right">Achievement %</th>
            <th className="p-3 text-right">Budget (ETB)</th>
            <th className="p-3 text-right">Spent (ETB)</th>
            <th className="p-3 text-right">Utilization %</th>
            <th className="p-3 text-right">Total Beneficiaries</th>
            <th className="p-3 text-right">Actual Beneficiaries</th>
            <th className="p-3 text-right">Beneficiary %</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(r => {
            const unitSuffix = r.uoms.length === 1 ? ` ${r.uoms[0]}` : '';
            return (
              <tr key={r.key} className="hover:bg-slate-50">
                <td className="p-3 font-bold text-slate-800">
                  <div>{r.name}</div>
                  {r.uoms.length > 1 && (
                    <div className="mt-1 inline-flex items-center gap-1 text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                      ⚠ Mixed Units ({r.uoms.join(', ')})
                    </div>
                  )}
                </td>
                <td className="p-3 text-right">{r.target.toLocaleString()}{unitSuffix}</td>
                <td className="p-3 text-right font-bold">{r.actual.toLocaleString()}{unitSuffix}</td>
                <td className="p-3 text-right font-black">{r.achievement.toFixed(1)}%</td>
                <td className="p-3 text-right">{r.budget.toLocaleString()}</td>
                <td className="p-3 text-right">{r.spent.toLocaleString()}</td>
                <td className="p-3 text-right font-black">{r.utilization.toFixed(1)}%</td>
                <td className="p-3 text-right">{r.totalBeneficiaries.toLocaleString()}</td>
                <td className="p-3 text-right font-black text-blue-600">{r.actualBeneficiaries.toLocaleString()}</td>
                <td className="p-3 text-right">{r.beneficiaryPct.toFixed(1)}%</td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={10} className="p-6 text-center text-slate-500">
                No data for this filter yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);