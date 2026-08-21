// src/pages/QuarterlyEntryPage.tsx
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FilterBar } from '../components/common/FilterBar';
import { achievementPct, budgetUtilizationPct, convertToBeneficiaries, sumActual } from '../utils/calculations';
import { PlanEntry, QuarterId } from '../types';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const QuarterlyEntryPage: React.FC = () => {
  const { nationalActivities, regions, projects, quarters, getFilteredPlanEntries } = useApp();
  const [quarter, setQuarter] = useState<QuarterId>('Q1');

  const entries = getFilteredPlanEntries();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-800">Step 3 — Quarterly Actual Entry</h2>
        <p className="text-xs text-slate-500 mt-1">
          Enter the Actual value achieved this quarter for each plan entry. It's compared against that quarter's
          Quarterly Plan (set on the previous step) for a Quarterly Achievement %, and still rolls up into the
          Cumulative Achievement against the annual target. Beneficiaries convert live as you type.
          All entries are automatically approved and immediately included in aggregates.
        </p>
      </div>

      <FilterBar />

      <div className="bg-white p-1.5 rounded-lg border inline-flex gap-1">
        {quarters.map(q => (
          <button key={q.id} onClick={() => setQuarter(q.id)} className={`px-4 py-1.5 rounded text-xs font-bold ${quarter === q.id ? 'bg-ercs-red text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
            {q.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {entries.map(pe => (
          <EntryRow
            key={pe.id}
            entry={pe}
            quarter={quarter}
            nationalActivityCode={nationalActivities.find(n => n.id === pe.national_activity_id)?.code || ''}
            uom={nationalActivities.find(n => n.id === pe.national_activity_id)?.uom || ''}
            scopeLabel={pe.scope_type === 'Regional' ? regions.find(r => r.id === pe.region_id)?.name : projects.find(p => p.id === pe.project_id)?.name}
          />
        ))}
        {entries.length === 0 && (
          <div className="bg-white p-8 rounded-xl border text-center text-xs text-slate-500">
            No plan entries match this filter. Go to the Plan page to add one first.
          </div>
        )}
      </div>
    </div>
  );
};

const clampNonNegative = (raw: string): number => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const EntryRow: React.FC<{
  entry: PlanEntry; quarter: QuarterId; nationalActivityCode: string; uom: string; scopeLabel?: string;
}> = ({ entry, quarter, nationalActivityCode, uom, scopeLabel }) => {
  const { quarterlyActuals, upsertQuarterlyActual, quarterlyPlans, uomConfigs, setFilters, setActiveRoute } = useApp();
  const existing = quarterlyActuals.find(a => a.plan_entry_id === entry.id && a.quarter_id === quarter);
  const [actualVal, setActualVal] = useState<number>(existing?.actual ?? 0);
  const [expVal, setExpVal] = useState<number>(existing?.expenditure ?? 0);
  const [commentVal, setCommentVal] = useState<string>(existing?.comment ?? '');

  React.useEffect(() => {
    setActualVal(existing?.actual ?? 0);
    setExpVal(existing?.expenditure ?? 0);
    setCommentVal(existing?.comment ?? '');
  }, [entry.id, quarter, existing]);

  const sync = (nextActual: number, nextExp: number, nextComment = commentVal) => {
    upsertQuarterlyActual({ id: existing?.id || `qa-${entry.id}-${quarter}`, plan_entry_id: entry.id, quarter_id: quarter, actual: nextActual, expenditure: nextExp, comment: nextComment });
  };

  const handleActualChange = (raw: string) => {
    const v = clampNonNegative(raw);
    setActualVal(v);
    sync(v, expVal, commentVal);
  };

  const handleExpChange = (raw: string) => {
    const v = clampNonNegative(raw);
    setExpVal(v);
    sync(actualVal, v, commentVal);
  };

  const planForQuarter = quarterlyPlans.find(qp => qp.plan_entry_id === entry.id && qp.quarter_id === quarter);
  const plannedTarget = planForQuarter?.target ?? 0;
  const plannedBudget = planForQuarter?.budget ?? 0;
  const hasQuarterlyPlanForThisQuarter = !!planForQuarter;
  const quarterlyAchievement = achievementPct(actualVal, plannedTarget);
  const quarterlyBudgetUtil = budgetUtilizationPct(expVal, plannedBudget);
  const isOverBudget = quarterlyBudgetUtil > 100;

  const cumulativeActual = sumActual([entry], quarterlyActuals);
  const cumulativeAchievement = achievementPct(cumulativeActual, entry.annual_target);
  const beneficiariesThisQuarter = convertToBeneficiaries(actualVal, uom, uomConfigs);

  const goToQuarterlyPlan = () => {
    setFilters(prev => ({
      ...prev,
      nationalActivityId: entry.national_activity_id,
      regionId: entry.scope_type === 'Regional' ? (entry.region_id || 'ALL') : 'ALL',
      projectId: entry.scope_type === 'Project' ? (entry.project_id || 'ALL') : 'ALL',
    }));
    setActiveRoute('quarterly-plan');
  };

  return (
    <div className="bg-white p-5 rounded-xl border shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
        <div>
          <span className="bg-ercs-red text-white text-[10px] font-extrabold px-2 py-0.5 rounded mr-2">{entry.activity_code || nationalActivityCode}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${entry.scope_type === 'Regional' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>{entry.scope_type}</span>
          <span className="ml-2 text-xs font-bold text-slate-800">{scopeLabel}</span>
          <div className="text-[10px] text-slate-500 mt-1 max-w-2xl"><b>{entry.activity_name}</b> — {entry.activity_description}</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="text-[10px] bg-slate-100 px-2 py-1 rounded font-semibold whitespace-nowrap">Annual Target: {entry.annual_target.toLocaleString()} {uom}</div>
          <div className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded font-semibold whitespace-nowrap">Planned {quarter}: {plannedTarget.toLocaleString()} {uom} · ETB {plannedBudget.toLocaleString()}</div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-100 text-emerald-800 border-emerald-300">Approved</span>
        </div>
      </div>

      {!hasQuarterlyPlanForThisQuarter && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[11px] text-amber-800 font-semibold">
          <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> No Quarterly Plan set for {quarter} yet — quarterly achievement can't be measured until you add one.</span>
          <button onClick={goToQuarterlyPlan} className="shrink-0 bg-amber-600 text-white px-2.5 py-1 rounded text-[10px] font-bold whitespace-nowrap">
            Go to Quarterly Plan
          </button>
        </div>
      )}

      {isOverBudget && (
        <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-[11px] text-rose-800 font-semibold">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Over budget for {quarter}: ETB {expVal.toLocaleString()} spent against a planned ETB {plannedBudget.toLocaleString()}.
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1">Actual this quarter ({uom})</label>
          <input type="number" min="0" value={actualVal} onChange={e => handleActualChange(e.target.value)} className="w-32 text-xs p-2 border rounded" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1">Expenditure this quarter (ETB)</label>
          <input type="number" min="0" value={expVal} onChange={e => handleExpChange(e.target.value)} className={`w-36 text-xs p-2 border rounded ${isOverBudget ? 'border-rose-300 bg-rose-50' : ''}`} />
        </div>
        <div className="min-w-64 flex-1">
          <label className="block text-[10px] font-bold text-slate-500 mb-1">Comment</label>
          <textarea rows={2} value={commentVal} onChange={e => { setCommentVal(e.target.value); sync(actualVal, expVal, e.target.value); }} placeholder="Add a note about the reported actual or expenditure" className="w-full text-xs p-2 border rounded resize-y bg-white" />
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-center">
            <div className="text-[9px] font-black uppercase tracking-wide text-blue-700">Conversion</div>
            <div className="text-xs font-bold text-blue-900">{actualVal} {uom} × factor</div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300" />
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-center min-w-24">
            <div className="text-[9px] font-black uppercase tracking-wide text-emerald-700">Beneficiaries (Q)</div>
            <div className="text-sm font-black text-emerald-900">{beneficiariesThisQuarter.toLocaleString()}</div>
          </div>
          <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-center min-w-24">
            <div className="text-[9px] font-black uppercase tracking-wide text-indigo-700">{quarter} Achievement</div>
            <div className="text-sm font-black text-indigo-900">{quarterlyAchievement.toFixed(1)}%</div>
            <div className="text-[9px] text-indigo-600 mt-0.5">{actualVal.toLocaleString()} / {plannedTarget.toLocaleString()} {uom}</div>
          </div>
          <div className={`rounded-lg border px-3 py-2 text-center min-w-24 ${isOverBudget ? 'bg-rose-50 border-rose-200' : 'bg-purple-50 border-purple-100'}`}>
            <div className={`text-[9px] font-black uppercase tracking-wide ${isOverBudget ? 'text-rose-700' : 'text-purple-700'}`}>{quarter} Budget</div>
            <div className={`text-sm font-black ${isOverBudget ? 'text-rose-900' : 'text-purple-900'}`}>{quarterlyBudgetUtil.toFixed(1)}%</div>
            <div className={`text-[9px] mt-0.5 ${isOverBudget ? 'text-rose-600' : 'text-purple-600'}`}>ETB {expVal.toLocaleString()} / {plannedBudget.toLocaleString()}</div>
          </div>
          <div className="rounded-lg bg-slate-50 border px-3 py-2 text-center min-w-24">
            <div className="text-[9px] font-black uppercase tracking-wide text-slate-500">Cumulative Ach.</div>
            <div className="text-sm font-black text-slate-800">{cumulativeAchievement.toFixed(1)}%</div>
            <div className="text-[9px] text-slate-400 mt-0.5">vs annual target</div>
          </div>
        </div>
      </div>
    </div>
  );
};