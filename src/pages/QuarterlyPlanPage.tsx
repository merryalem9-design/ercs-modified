// src/pages/QuarterlyPlanPage.tsx
import React from 'react';
import { useApp } from '../context/AppContext';
import { FilterBar } from '../components/common/FilterBar';
import { convertToBeneficiaries } from '../utils/calculations';
import { PlanEntry, QuarterId } from '../types';
import { AlertTriangle, CheckCircle2, Wand2 } from 'lucide-react';

const clampNonNegative = (raw: string): number => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

// Quarterly figures are entered as plain numbers (including fractions, e.g.
// 1.5 boreholes/quarter), and reconciliation compares a SUM of four such
// numbers back against the annual figure. Comparing with strict `!==` can
// flag a false mismatch from ordinary binary floating-point drift (e.g.
// 0.1 + 0.2 !== 0.3), even when every quarter was entered exactly as
// intended. A tiny tolerance avoids that false alarm without hiding any
// real, human-sized discrepancy.
const RECONCILE_EPSILON = 1e-6;

export const QuarterlyPlanPage: React.FC = () => {
  const { quarters, getFilteredPlanEntries } = useApp();
  const entries = getFilteredPlanEntries();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-800">Step 2 — Quarterly Plan Breakdown</h2>
        <p className="text-xs text-slate-500 mt-1">
          Split each plan entry's annual target and budget across the four quarters. Quarterly Actual Entry
          measures achievement against this — quarter by quarter — instead of the full-year figure. The annual
          target/budget from Step 1 stays fixed; the "Reconciliation" column shows whether your quarters add up to it.
          A quarter's Budget can never be typed past what's left of the annual budget once the other three quarters
          are accounted for. Each quarter's Beneficiary figure converts that quarter's Target live, using the same
          UOM conversion factor used everywhere else. All entries are automatically approved and immediately
          included in aggregates.
        </p>
      </div>

      <FilterBar />

      <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b">
              <tr>
                <th className="p-3">Activity Code</th>
                <th className="p-3">Activity Description</th>
                <th className="p-3">Executed By</th>
                <th className="p-3 text-right">Annual Target</th>
                <th className="p-3 text-right">Annual Budget</th>
                {quarters.map(q => (
                  <th key={q.id} className="p-2 text-center bg-slate-100 border-l whitespace-nowrap">{q.id} (Tgt | Bgt | Ben)</th>
                ))}
                <th className="p-3 text-center">Reconciliation</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map(pe => <QuarterlyPlanRow key={pe.id} entry={pe} />)}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6 + quarters.length} className="p-6 text-center text-slate-500">
                    No plan entries match this filter. Go to the Plan page to add one first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const QuarterlyPlanRow: React.FC<{ entry: PlanEntry }> = ({ entry }) => {
  const { nationalActivities, regions, projects, quarters, quarterlyPlans, upsertQuarterlyPlan, uomConfigs } = useApp();
  const na = nationalActivities.find(n => n.id === entry.national_activity_id);
  const scopeName = entry.scope_type === 'Regional'
    ? regions.find(r => r.id === entry.region_id)?.name
    : projects.find(p => p.id === entry.project_id)?.name;

  const rowPlans = quarters.map(q => quarterlyPlans.find(qp => qp.plan_entry_id === entry.id && qp.quarter_id === q.id));
  const sumT = rowPlans.reduce((s, qp) => s + (qp?.target || 0), 0);
  const sumB = rowPlans.reduce((s, qp) => s + (qp?.budget || 0), 0);
  const targetMismatch = Math.abs(sumT - entry.annual_target) > RECONCILE_EPSILON;
  const budgetMismatch = Math.abs(sumB - entry.annual_budget) > RECONCILE_EPSILON;

  const setQuarterField = (quarterId: QuarterId, field: 'target' | 'budget', raw: string) => {
    let value = clampNonNegative(raw);

    if (field === 'budget') {
      const othersBudget = rowPlans.reduce((s, qp, idx) => (quarters[idx].id === quarterId ? s : s + (qp?.budget || 0)), 0);
      const remainingBudget = Math.max(0, entry.annual_budget - othersBudget);
      value = Math.min(value, remainingBudget);
    }

    upsertQuarterlyPlan({
      id: `qp-${entry.id}-${quarterId}`,
      plan_entry_id: entry.id,
      quarter_id: quarterId,
      target: field === 'target' ? value : (rowPlans.find(qp => qp?.quarter_id === quarterId)?.target || 0),
      budget: field === 'budget' ? value : (rowPlans.find(qp => qp?.quarter_id === quarterId)?.budget || 0),
    });
  };

  // A true even split — annual/4 for every quarter, fractions included.
  // Some UOMs (e.g. "6 boreholes") don't divide into 4 whole numbers, and
  // the seeded data already relies on that (1.5/quarter for an annual
  // target of 6). Dividing by 4 is exact in binary floating point (4 is a
  // power of two), so this always sums back to the annual figure exactly —
  // no remainder-to-last-quarter workaround needed.
  const splitEvenly = () => {
    const evenTarget = entry.annual_target / 4;
    const evenBudget = entry.annual_budget / 4;
    quarters.forEach(q => {
      upsertQuarterlyPlan({
        id: `qp-${entry.id}-${q.id}`,
        plan_entry_id: entry.id,
        quarter_id: q.id,
        target: evenTarget,
        budget: evenBudget,
      });
    });
  };

  return (
    <tr className="hover:bg-slate-50 align-top">
      {/* Always the parent National Activity's own code — never a
          Region/Project-suffixed variant, regardless of what may be
          stored on the entry itself. */}
      <td className="p-3 font-bold text-ercs-red whitespace-nowrap">{na?.code}</td>
      <td className="p-3 min-w-72"><div className="font-bold text-slate-800">{entry.activity_name}</div><div className="text-[10px] text-slate-500 mt-0.5">{entry.activity_description}</div></td>
      <td className="p-3 whitespace-nowrap">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${entry.scope_type === 'Regional' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>{entry.scope_type}</span>
        <span className="ml-2 font-semibold">{scopeName || '—'}</span>
      </td>
      <td className="p-3 text-right font-bold whitespace-nowrap">{entry.annual_target.toLocaleString()} {na?.uom}</td>
      <td className="p-3 text-right whitespace-nowrap">{entry.annual_budget.toLocaleString()}</td>
      {quarters.map((q, idx) => {
        const qp = rowPlans[idx];
        const qTarget = qp?.target ?? 0;
        const qBeneficiary = na ? convertToBeneficiaries(qTarget, na.uom, uomConfigs) : 0;
        return (
          <td key={q.id} className="p-2 border-l">
            <div className="flex gap-1 justify-center items-start">
              <input
                type="number" min="0"
                value={qTarget}
                onChange={e => setQuarterField(q.id, 'target', e.target.value)}
                title={`${q.id} Target`}
                className="w-14 text-center text-[10px] font-bold border border-slate-200 rounded p-1"
              />
              <input
                type="number" min="0"
                value={qp?.budget ?? 0}
                onChange={e => setQuarterField(q.id, 'budget', e.target.value)}
                title={`${q.id} Budget`}
                className="w-20 text-center text-[10px] font-bold border border-slate-200 rounded p-1"
              />
              <div
                title={`${q.id} Beneficiary — ${qTarget.toLocaleString()} ${na?.uom || ''} × conversion factor`}
                className="rounded bg-emerald-50 border border-emerald-100 px-1.5 py-1 text-center min-w-16"
              >
                <div className="text-[8px] font-black uppercase tracking-wide text-emerald-700 whitespace-nowrap">{q.id} Beneficiary</div>
                <div className="text-[10px] font-black text-emerald-900">{qBeneficiary.toLocaleString()}</div>
              </div>
            </div>
          </td>
        );
      })}
      <td className="p-3 text-center">
        <div className="flex flex-col gap-1 items-center">
          {targetMismatch
            ? <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 whitespace-nowrap"><AlertTriangle className="w-3 h-3" /> Tgt {sumT.toLocaleString()}/{entry.annual_target.toLocaleString()}</span>
            : <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 whitespace-nowrap"><CheckCircle2 className="w-3 h-3" /> Target OK</span>}
          {budgetMismatch
            ? <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 whitespace-nowrap"><AlertTriangle className="w-3 h-3" /> Bgt {sumB.toLocaleString()}/{entry.annual_budget.toLocaleString()}</span>
            : <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 whitespace-nowrap"><CheckCircle2 className="w-3 h-3" /> Budget OK</span>}
          <button onClick={splitEvenly} className="mt-1 text-[9px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 whitespace-nowrap">
            <Wand2 className="w-2.5 h-2.5" /> Split evenly
          </button>
        </div>
      </td>
    </tr>
  );
};