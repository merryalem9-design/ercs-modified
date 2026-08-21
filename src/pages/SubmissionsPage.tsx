// src/pages/SubmissionsPage.tsx
import React from 'react';
import { useApp } from '../context/AppContext';
import { FileText } from 'lucide-react';

export const SubmissionsPage: React.FC = () => {
  const { planEntries, nationalActivities, regions, projects } = useApp();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-800">Submissions</h2>
        <p className="text-xs text-slate-500 mt-1">
          All submitted plan entries are listed below. In this prototype, all entries are automatically approved and immediately included in aggregates.
        </p>
      </div>

      <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <FileText className="w-4 h-4 text-ercs-red" /> All Plan Entries ({planEntries.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b text-slate-600 uppercase font-bold">
              <tr>
                <th className="p-3">Activity Code</th>
                <th className="p-3">Activity Name</th>
                <th className="p-3">Executed By</th>
                <th className="p-3 text-right">Target</th>
                <th className="p-3 text-right">Budget</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {planEntries.map(pe => {
                const na = nationalActivities.find(n => n.id === pe.national_activity_id);
                const scopeName = pe.scope_type === 'Regional'
                  ? regions.find(r => r.id === pe.region_id)?.name
                  : projects.find(p => p.id === pe.project_id)?.name;
                return (
                  <tr key={pe.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-ercs-red">{pe.activity_code}</td>
                    <td className="p-3 min-w-72"><div className="font-bold text-slate-800">{pe.activity_name}</div><div className="text-[10px] text-slate-500 mt-0.5">{pe.activity_description}</div></td>
                    <td className="p-3"><span className="font-semibold">{scopeName || '—'}</span><div className="text-[10px] text-slate-400">{pe.scope_type}</div></td>
                    <td className="p-3 text-right font-bold">{pe.annual_target.toLocaleString()} {na?.uom}</td>
                    <td className="p-3 text-right">ETB {pe.annual_budget.toLocaleString()}</td>
                    <td className="p-3 text-center"><span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-100 text-emerald-800 border-emerald-300">Approved</span></td>
                  </tr>
                );
              })}
              {planEntries.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">No submissions found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};