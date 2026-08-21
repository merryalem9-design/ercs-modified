import React from 'react';
import { useApp } from '../context/AppContext';
import { ApprovalStatusBadge } from '../components/common/ApprovalStatusBadge';
import { CheckCircle2, XCircle, Clock3, Inbox, FileText, CalendarClock, CalendarCheck2 } from 'lucide-react';

export const PendingApprovalPage: React.FC = () => {
  const {
    currentRole,
    planEntries, nationalActivities, regions, projects,
    approvePlanEntry, rejectPlanEntry,
    quarterlyPlans, approveQuarterlyPlan, rejectQuarterlyPlan,
    quarterlyActuals, approveQuarterlyActual, rejectQuarterlyActual,
    quarters,
  } = useApp();

  if (currentRole !== 'National Activity AOP') {
    return <div className="bg-white rounded-xl border p-8 text-center text-xs text-slate-500">This page is only available to the National Activity AOP role.</div>;
  }

  const pending = planEntries.filter(pe => pe.approval_status === 'Pending Approval');
  const draftCount = planEntries.filter(pe => pe.approval_status !== 'Approved').length;

  const pendingQuarterlyPlans = quarterlyPlans.filter(qp => qp.approval_status === 'Pending Approval');
  const pendingQuarterlyActuals = quarterlyActuals.filter(qa => qa.approval_status === 'Pending Approval');

  // Resolves a Quarterly Plan/Actual row back to its parent Plan Entry, the
  // National Activity it rolls up to, and the Region/Project executing it —
  // everything the table needs to show without repeating this lookup logic
  // three times.
  const resolveParent = (planEntryId: string) => {
    const pe = planEntries.find(p => p.id === planEntryId);
    const na = pe ? nationalActivities.find(n => n.id === pe.national_activity_id) : undefined;
    const scopeName = pe
      ? (pe.scope_type === 'Regional' ? regions.find(r => r.id === pe.region_id)?.name : projects.find(p => p.id === pe.project_id)?.name)
      : undefined;
    return { pe, na, scopeName };
  };

  const quarterLabel = (id: string) => quarters.find(q => q.id === id)?.label || id;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-800">Pending Approval</h2>
        <p className="text-xs text-slate-500 mt-1">
          Review Regional and Project submissions at all three levels of the pipeline: the annual Plan Entry itself, its
          Quarterly Plan breakdown, and its Quarterly Actual reports. Approving a Quarterly Plan or Quarterly Actual locks
          that specific quarter from further editing and includes it in the live Approved report; rejecting sends it back
          for revision and resubmission.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-4"><div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500"><Clock3 className="w-4 h-4" /> Plan Entries Pending</div><div className="text-2xl font-black mt-2">{pending.length}</div></div>
        <div className="bg-white rounded-xl border shadow-sm p-4"><div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500"><Inbox className="w-4 h-4" /> Non-approved Entries</div><div className="text-2xl font-black mt-2">{draftCount}</div></div>
        <div className="bg-white rounded-xl border shadow-sm p-4"><div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500"><CheckCircle2 className="w-4 h-4" /> Approved Entries</div><div className="text-2xl font-black mt-2">{planEntries.filter(pe => pe.approval_status === 'Approved').length}</div></div>
        <div className="bg-white rounded-xl border shadow-sm p-4"><div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500"><CalendarClock className="w-4 h-4" /> Qtrly Plans Pending</div><div className="text-2xl font-black mt-2">{pendingQuarterlyPlans.length}</div></div>
        <div className="bg-white rounded-xl border shadow-sm p-4"><div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500"><CalendarCheck2 className="w-4 h-4" /> Qtrly Actuals Pending</div><div className="text-2xl font-black mt-2">{pendingQuarterlyActuals.length}</div></div>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* PLAN ENTRY PROPOSALS                                            */}
      {/* -------------------------------------------------------------- */}
      <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><FileText className="w-4 h-4 text-ercs-red" /> Submitted Proposals — Plan Entries</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b text-slate-600 uppercase font-bold">
              <tr>
                <th className="p-3">Activity Code</th>
                <th className="p-3">Activity Description</th>
                <th className="p-3">Executed By</th>
                <th className="p-3 text-right">Target</th>
                <th className="p-3 text-right">Budget</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pending.map(pe => {
                const na = nationalActivities.find(na => na.id === pe.national_activity_id);
                const scopeName = pe.scope_type === 'Regional' ? regions.find(r => r.id === pe.region_id)?.name : projects.find(p => p.id === pe.project_id)?.name;
                return (
                  <tr key={pe.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-ercs-red">{pe.activity_code}</td>
                    <td className="p-3 min-w-72"><div className="font-bold text-slate-800">{pe.activity_name}</div><div className="text-[10px] text-slate-500 mt-0.5">{pe.activity_description}</div></td>
                    <td className="p-3"><span className="font-semibold">{scopeName || '—'}</span><div className="text-[10px] text-slate-400">{pe.scope_type}</div></td>
                    <td className="p-3 text-right font-bold">{pe.annual_target.toLocaleString()} {na?.uom}</td>
                    <td className="p-3 text-right">ETB {pe.annual_budget.toLocaleString()}</td>
                    <td className="p-3 text-center"><ApprovalStatusBadge status={pe.approval_status} /></td>
                    <td className="p-3"><div className="flex justify-center gap-2"><button onClick={() => approvePlanEntry(pe.id)} className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Approve</button><button onClick={() => rejectPlanEntry(pe.id)} className="px-2.5 py-1 rounded bg-rose-50 text-rose-700 font-bold flex items-center gap-1"><XCircle className="w-3 h-3" /> Reject</button></div></td>
                  </tr>
                );
              })}
              {pending.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-500">There are no submitted plan entries waiting for approval.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* QUARTERLY PLAN SUBMISSIONS                                      */}
      {/* -------------------------------------------------------------- */}
      <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><CalendarClock className="w-4 h-4 text-blue-600" /> Submitted Quarterly Plans</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b text-slate-600 uppercase font-bold">
              <tr>
                <th className="p-3">Activity Code</th>
                <th className="p-3">Executed By</th>
                <th className="p-3">Quarter</th>
                <th className="p-3 text-right">Target</th>
                <th className="p-3 text-right">Budget</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pendingQuarterlyPlans.map(qp => {
                const { pe, na, scopeName } = resolveParent(qp.plan_entry_id);
                return (
                  <tr key={qp.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-ercs-red">{pe?.activity_code || '—'}</td>
                    <td className="p-3"><span className="font-semibold">{scopeName || '—'}</span><div className="text-[10px] text-slate-400">{pe?.scope_type}</div></td>
                    <td className="p-3 font-bold">{quarterLabel(qp.quarter_id)}</td>
                    <td className="p-3 text-right font-bold">{qp.target.toLocaleString()} {na?.uom}</td>
                    <td className="p-3 text-right">ETB {qp.budget.toLocaleString()}</td>
                    <td className="p-3 text-center"><ApprovalStatusBadge status={qp.approval_status} /></td>
                    <td className="p-3"><div className="flex justify-center gap-2"><button onClick={() => approveQuarterlyPlan(qp.id)} className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Approve</button><button onClick={() => rejectQuarterlyPlan(qp.id)} className="px-2.5 py-1 rounded bg-rose-50 text-rose-700 font-bold flex items-center gap-1"><XCircle className="w-3 h-3" /> Reject</button></div></td>
                  </tr>
                );
              })}
              {pendingQuarterlyPlans.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-500">There are no submitted Quarterly Plan entries waiting for approval.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* QUARTERLY ACTUAL SUBMISSIONS                                    */}
      {/* -------------------------------------------------------------- */}
      <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><CalendarCheck2 className="w-4 h-4 text-purple-600" /> Submitted Quarterly Actuals</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b text-slate-600 uppercase font-bold">
              <tr>
                <th className="p-3">Activity Code</th>
                <th className="p-3">Executed By</th>
                <th className="p-3">Quarter</th>
                <th className="p-3 text-right">Actual</th>
                <th className="p-3 text-right">Expenditure</th>
                <th className="p-3">Comment</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pendingQuarterlyActuals.map(qa => {
                const { pe, na, scopeName } = resolveParent(qa.plan_entry_id);
                return (
                  <tr key={qa.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-ercs-red">{pe?.activity_code || '—'}</td>
                    <td className="p-3"><span className="font-semibold">{scopeName || '—'}</span><div className="text-[10px] text-slate-400">{pe?.scope_type}</div></td>
                    <td className="p-3 font-bold">{quarterLabel(qa.quarter_id)}</td>
                    <td className="p-3 text-right font-bold">{qa.actual.toLocaleString()} {na?.uom}</td>
                    <td className="p-3 text-right">ETB {qa.expenditure.toLocaleString()}</td>
                    <td className="p-3 min-w-48 text-[10px] text-slate-500">{qa.comment || '—'}</td>
                    <td className="p-3 text-center"><ApprovalStatusBadge status={qa.approval_status} /></td>
                    <td className="p-3"><div className="flex justify-center gap-2"><button onClick={() => approveQuarterlyActual(qa.id)} className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Approve</button><button onClick={() => rejectQuarterlyActual(qa.id)} className="px-2.5 py-1 rounded bg-rose-50 text-rose-700 font-bold flex items-center gap-1"><XCircle className="w-3 h-3" /> Reject</button></div></td>
                  </tr>
                );
              })}
              {pendingQuarterlyActuals.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-slate-500">There are no submitted Quarterly Actual entries waiting for approval.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
