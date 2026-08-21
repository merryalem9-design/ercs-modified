// src/pages/QuarterlyPlanPage.tsx
// STEP 2 of the pipeline — split each Plan Entry's annual target/budget
// across Q1–Q4. This is entered BEFORE any Quarterly Actual, and is what
// Quarterly Actual Entry measures achievement against. It intentionally
// does NOT overwrite the Plan Entry's own annual figure (see the
// QuarterlyPlan type comment in types/index.ts) — instead each row shows a
// reconciliation badge if the quarters don't sum to it yet.
//
// Budget inputs are live-capped to the Plan Entry's own annual_budget: as
// you type, a quarter's Budget can never be pushed past what's left of the
// ceiling once the other three quarters are accounted for, so the four
// quarters can never sum to more than the annual budget.
//
// Quarters are entered and submitted as a SET, not one at a time: all four
// quarters must exist and every one of them must carry a Budget greater
// than 0 (a 0 is treated as "not entered") before the row's "Submit all 4
// quarters" button is enabled. Submitting moves every Draft/Rejected
// quarter to Pending Approval in one action — quarters already Approved are
// left untouched, so this same action also re-submits just the rejected
// ones after a fix. The National Activity AOP still approves or rejects
// each quarter individually from the Pending Approval page. Once Approved,
// that quarter's inputs lock.
import React from 'react';
import { useApp } from '../context/AppContext';
import { FilterBar } from '../components/common/FilterBar';
import { ApprovalStatusBadge } from '../components/common/ApprovalStatusBadge';
import { PlanEntry, QuarterId } from '../types';
import { AlertTriangle, CheckCircle2, Lock, Wand2 } from 'lucide-react';

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
          are accounted for. All four quarters must be filled in — each with a Budget greater than 0 — before they
          can be submitted; "Submit all 4 quarters" sends every unsubmitted quarter to the National Activity AOP
          together. Once a quarter is Approved it's locked from further edits.
        </p>
      </div>

      <FilterBar showQuarter={false} />

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
  const { nationalActivities, regions, projects, quarters, quarterlyPlans, upsertQuarterlyPlan, submitQuarterlyPlanRow } = useApp();
  const na = nationalActivities.find(n => n.id === entry.national_activity_id);
  const scopeName = entry.scope_type === 'Regional'
    ? regions.find(r => r.id === entry.region_id)?.name
    : projects.find(p => p.id === entry.project_id)?.name;

  const rowPlans = quarters.map(q => quarterlyPlans.find(qp => qp.plan_entry_id === entry.id && qp.quarter_id === q.id));
  const sumT = rowPlans.reduce((s, qp) => s + (qp?.target || 0), 0);
  const sumB = rowPlans.reduce((s, qp) => s + (qp?.budget || 0), 0);
  const targetMismatch = sumT !== entry.annual_target;
  const budgetMismatch = sumB !== entry.annual_budget;

  // Batch-submission readiness — ALL FOUR quarters must exist with a Budget
  // greater than 0 before this row can be submitted; they go to the
  // National Activity AOP together, not one at a time. If every quarter is
  // already Approved there's nothing left to submit.
  const allFourExist = rowPlans.every(qp => !!qp);
  const allBudgetsPositive = rowPlans.every(qp => (qp?.budget || 0) > 0);
  const allApproved = rowPlans.every(qp => qp?.approval_status === 'Approved');
  const needsSubmission = rowPlans.some(qp => qp && (qp.approval_status === 'Draft' || qp.approval_status === 'Rejected'));
  const canSubmitRow = allFourExist && allBudgetsPositive && needsSubmission;

  const setQuarterField = (quarterId: QuarterId, field: 'target' | 'budget', raw: string) => {
    const existing = quarterlyPlans.find(qp => qp.plan_entry_id === entry.id && qp.quarter_id === quarterId);
    if (existing?.approval_status === 'Approved') return; // defensive — inputs are disabled for this case anyway
    let value = clampNonNegative(raw);

    // Budget inputs are live-capped to what's left of the Plan Entry's own
    // annual_budget ceiling after the OTHER three quarters — the total
    // across Q1–Q4 can never be pushed past the annual budget just by typing.
    if (field === 'budget') {
      const othersBudget = rowPlans.reduce((s, qp, idx) => (quarters[idx].id === quarterId ? s : s + (qp?.budget || 0)), 0);
      const remainingBudget = Math.max(0, entry.annual_budget - othersBudget);
      value = Math.min(value, remainingBudget);
    }

    upsertQuarterlyPlan({
      id: existing?.id || `qp-${entry.id}-${quarterId}`,
      plan_entry_id: entry.id,
      quarter_id: quarterId,
      target: field === 'target' ? value : (existing?.target || 0),
      budget: field === 'budget' ? value : (existing?.budget || 0),
    });
  };

  // Convenience action: divide the annual target/budget evenly across the
  // four quarters (remainder folded into Q4) so the row starts reconciled,
  // and the user just fine-tunes from there instead of typing from scratch.
  // Skips any quarter that's already Approved and locked.
  const splitEvenly = () => {
    const baseTarget = Math.floor(entry.annual_target / 4);
    const remainderTarget = entry.annual_target - baseTarget * 4;
    const baseBudget = Math.floor(entry.annual_budget / 4);
    const remainderBudget = entry.annual_budget - baseBudget * 4;
    quarters.forEach((q, idx) => {
      const existing = quarterlyPlans.find(qp => qp.plan_entry_id === entry.id && qp.quarter_id === q.id);
      if (existing?.approval_status === 'Approved') return;
      const isLast = idx === quarters.length - 1;
      upsertQuarterlyPlan({
        id: existing?.id || `qp-${entry.id}-${q.id}`,
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
        const isApproved = qp?.approval_status === 'Approved';
        return (
          <td key={q.id} className="p-2 border-l">
            <div className="flex gap-1 justify-center">
              <input
                type="number" min="0"
                value={qp?.target ?? 0}
                disabled={isApproved}
                onChange={e => setQuarterField(q.id, 'target', e.target.value)}
                title={`${q.id} Target`}
                className={`w-14 text-center text-[10px] font-bold border border-slate-200 rounded p-1 ${isApproved ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
              />
              <input
                type="number" min="0"
                value={qp?.budget ?? 0}
                disabled={isApproved}
                onChange={e => setQuarterField(q.id, 'budget', e.target.value)}
                title={`${q.id} Budget`}
                className={`w-20 text-center text-[10px] font-bold border border-slate-200 rounded p-1 ${isApproved ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
              />
            </div>
            <div className="mt-1 flex flex-col items-center gap-1">
              {qp ? (
                isApproved
                  ? <span className="inline-flex items-center gap-1 text-[9px]"><Lock className="w-2.5 h-2.5 text-emerald-600" /><ApprovalStatusBadge status={qp.approval_status} /></span>
                  : <ApprovalStatusBadge status={qp.approval_status} />
              ) : (
                <span className="text-[9px] text-slate-300 font-semibold">Not entered</span>
              )}
              {qp && !isApproved && qp.budget <= 0 && (
                <span className="text-[8px] text-amber-600 text-center leading-tight max-w-[90px] font-semibold">Budget required</span>
              )}
              {qp?.approval_status === 'Rejected' && qp.rejection_reason && (
                <span className="text-[8px] text-rose-600 text-center leading-tight max-w-[90px]">{qp.rejection_reason}</span>
              )}
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
          {allApproved ? (
            <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 whitespace-nowrap">
              <Lock className="w-2.5 h-2.5" /> All 4 quarters approved
            </span>
          ) : (
            <button
              onClick={() => submitQuarterlyPlanRow(entry.id)}
              disabled={!canSubmitRow}
              title={
                !allFourExist
                  ? 'Enter Target and Budget for all four quarters (Q1–Q4) first'
                  : !allBudgetsPositive
                    ? 'Every quarter needs a Budget greater than 0'
                    : undefined
              }
              className={`mt-1 px-2 py-1 rounded text-[9px] font-bold whitespace-nowrap ${
                canSubmitRow ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              Submit all 4 quarters
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};
