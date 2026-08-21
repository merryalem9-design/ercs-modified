// src/pages/QuarterlyPlanPage.tsx
import React from 'react';
import { useApp } from '../context/AppContext';
import { FilterBar } from '../components/common/FilterBar';
import { PlanEntry, QuarterId } from '../types';
import { AlertTriangle, CheckCircle2, Wand2 } from 'lucide-react';

const clampNonNegative = (raw: string): number => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

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
          are accounted for. All entries are automatically approved and immediately included in aggregates.
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
                  <th key={q.id} className="p-2 text-center bg-slate-100 border-l whitespace-nowrap">{q.id} (Tgt | Bgt)</th>
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
  const { nationalActivities, regions, projects, quarters, quarterlyPlans, upsertQuarterlyPlan } = useApp();
  const na = nationalActivities.find(n => n.id === entry.national_activity_id);
  const scopeName = entry.scope_type === 'Regional'
    ? regions.find(r => r.id === entry.region_id)?.name
    : projects.find(p => p.id === entry.project_id)?.name;

  const rowPlans = quarters.map(q => quarterlyPlans.find(qp => qp.plan_entry_id === entry.id && qp.quarter_id === q.id));
  const sumT = rowPlans.reduce((s, qp) => s + (qp?.target || 0), 0);
  const sumB = rowPlans.reduce((s, qp) => s + (qp?.budget || 0), 0);
  const targetMismatch = sumT !== entry.annual_target;
  const budgetMismatch = sumB !== entry.annual_budget;

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

  const splitEvenly = () => {
    const baseTarget = Math.floor(entry.annual_target / 4);
    const remainderTarget = entry.annual_target - baseTarget * 4;
    const baseBudget = Math.floor(entry.annual_budget / 4);
    const remainderBudget = entry.annual_budget - baseBudget * 4;
    quarters.forEach((q, idx) => {
      const isLast = idx === quarters.length - 1;
      upsertQuarterlyPlan({
        id: `qp-${entry.id}-${q.id}`,
        plan_entry_id: entry.id,
        quarter_id: q.id,
        target: baseTarget + (isLast ? remainderTarget : 0),
        budget: baseBudget + (isLast ? remainderBudget : 0),
      });
    });
  };

  return (
    <tr className="hover:bg-slate-50 align-top">
      <td className="p-3 font-bold text-ercs-red whitespace-nowrap">{entry.activity_code}</td>
      <td className="p-3 min-w-72"><div className="font-bold text-slate-800">{entry.activity_name}</div><div className="text-[10px] text-slate-500 mt-0.5">{entry.activity_description}</div></td>
      <td className="p-3 whitespace-nowrap">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${entry.scope_type === 'Regional' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>{entry.scope_type}</span>
        <span className="ml-2 font-semibold">{scopeName || '—'}</span>
      </td>
      <td className="p-3 text-right font-bold whitespace-nowrap">{entry.annual_target.toLocaleString()} {na?.uom}</td>
      <td className="p-3 text-right whitespace-nowrap">{entry.annual_budget.toLocaleString()}</td>
      {quarters.map((q, idx) => {
        const qp = rowPlans[idx];
        return (
          <td key={q.id} className="p-2 border-l">
            <div className="flex gap-1 justify-center">
              <input
                type="number" min="0"
                value={qp?.target ?? 0}
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