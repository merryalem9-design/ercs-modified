// src/pages/ScopeDetailPage.tsx
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  sumActual,
  sumExpenditure,
  sumPlannedTarget,
  sumPlannedBudget,
  achievementPct,
  budgetUtilizationPct,
  convertToBeneficiaries,
} from '../utils/calculations';
import { PlanEntry, QuarterId } from '../types';
import { PlanEntryWizardModal, ConfirmDeleteModal, type PeWizardFormState } from './PlanPage';
import {
  ArrowLeft,
  CalendarCheck2,
  CalendarClock,
  FolderGit2,
  Layers,
  MapPin,
  Plus,
  Target,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';

/** Beneficiary % = beneficiaries actually reached vs. beneficiaries planned. */
const beneficiaryPct = (actualBen: number, totalBen: number): number =>
  totalBen === 0 ? 0 : (actualBen / totalBen) * 100;

/**
 * Shown when a Project or Region is selected from the sidebar. Unlike
 * NationalActivityDetailPage (which is scoped to ONE National Activity),
 * this page lists EVERY National Activity the selected Project/Region
 * executes against, in one table — mirroring the Excel workbook's own
 * per-Project/Region sheet. Quarterly figures are switched via a filter
 * instead of being spread across extra Q1–Q4 columns.
 */
export const ScopeDetailPage: React.FC = () => {
  const {
    filters,
    setFilters,
    setActiveRoute,
    currentRole,
    nationalActivities,
    regions,
    projects,
    quarters,
    quarterlyPlans,
    quarterlyActuals,
    uomConfigs,
    getFilteredPlanEntries,
    deletePlanEntry,
  } = useApp();

  const [quarterId, setQuarterId] = useState<'ALL' | QuarterId>('ALL');
  const [peWizard, setPeWizard] = useState<null | { initial: PeWizardFormState; startStep: 1 | 2 }>(null);
  const [deleteTarget, setDeleteTarget] = useState<null | { id: string; label: string }>(null);

  const scopeType: 'Regional' | 'Project' | null =
    filters.projectId !== 'ALL' ? 'Project' : filters.regionId !== 'ALL' ? 'Regional' : null;
  const project = scopeType === 'Project' ? projects.find(p => p.id === filters.projectId) : undefined;
  const region = scopeType === 'Regional' ? regions.find(r => r.id === filters.regionId) : undefined;
  const scopeName = project?.name || region?.name;

  const goBackToPlan = () => {
    setFilters(prev => ({ ...prev, strategicPriorityId: 'ALL', nationalActivityId: 'ALL', regionId: 'ALL', projectId: 'ALL' }));
    setActiveRoute('plan');
  };

  if (!scopeType || !scopeName) {
    return (
      <div className="bg-white p-8 rounded-xl border text-center text-xs text-slate-500">
        No Project or Region selected. Go back to the Plan page and pick one from the sidebar.
      </div>
    );
  }

  // nationalActivityId is 'ALL' in filters whenever this page is reached via
  // the sidebar, so this already returns every Plan Entry this Project/
  // Region owns across every National Activity — exactly the Excel sheet.
  const entries = getFilteredPlanEntries();
  const roleIsCoordinator = currentRole !== 'National Activity AOP';

  const uomsInScope = Array.from(
    new Set(
      entries
        .map(e => nationalActivities.find(na => na.id === e.national_activity_id)?.uom)
        .filter((u): u is string => !!u)
    )
  );

  const totalBeneficiariesFor = (es: PlanEntry[]) =>
    es.reduce((sum, e) => {
      const na = nationalActivities.find(n => n.id === e.national_activity_id);
      const t = sumPlannedTarget([e], quarterlyPlans, quarterId);
      return sum + convertToBeneficiaries(t, na?.uom || '', uomConfigs);
    }, 0);

  const actualBeneficiariesFor = (es: PlanEntry[]) =>
    es.reduce((sum, e) => {
      const na = nationalActivities.find(n => n.id === e.national_activity_id);
      const a = sumActual([e], quarterlyActuals, quarterId);
      return sum + convertToBeneficiaries(a, na?.uom || '', uomConfigs);
    }, 0);

  const target = sumPlannedTarget(entries, quarterlyPlans, quarterId);
  const actual = sumActual(entries, quarterlyActuals, quarterId);
  const achievement = achievementPct(actual, target);
  const budget = sumPlannedBudget(entries, quarterlyPlans, quarterId);
  const spent = sumExpenditure(entries, quarterlyActuals, quarterId);
  const utilization = budgetUtilizationPct(spent, budget);
  const totalBeneficiaries = totalBeneficiariesFor(entries);
  const actualBeneficiaries = actualBeneficiariesFor(entries);

  const missingQuarterlyPlanCount =
    quarterId !== 'ALL'
      ? entries.filter(e => !quarterlyPlans.some(qp => qp.plan_entry_id === e.id && qp.quarter_id === quarterId)).length
      : 0;

  const achievementWarning =
    uomsInScope.length > 1
      ? `Mixed units in scope (${uomsInScope.join(', ')}) — this % sums raw counts across different UOMs and is not a real unit. See each activity's own row below for a precise reading.`
      : missingQuarterlyPlanCount > 0
        ? `${missingQuarterlyPlanCount} plan ${missingQuarterlyPlanCount === 1 ? 'entry has' : 'entries have'} no ${quarterId} Quarterly Plan — counted as 0 planned in this comparison.`
        : undefined;

  const openAddPlanWizard = () => {
    setPeWizard({
      initial: {
        strategicPriorityId: '',
        national_activity_id: '',
        scope_type: scopeType,
        region_id: region?.id || '',
        project_id: project?.id || '',
        annual_target: '',
        annual_budget: '',
        activity_name: '',
        activity_description: '',
        lockScope: true,
      },
      startStep: 1,
    });
  };

  const openEditPlanWizard = (pe: PlanEntry) => {
    const na = nationalActivities.find(n => n.id === pe.national_activity_id);
    setPeWizard({
      initial: {
        id: pe.id,
        strategicPriorityId: na?.strategic_priority_id || '',
        national_activity_id: pe.national_activity_id,
        scope_type: pe.scope_type,
        region_id: pe.region_id || '',
        project_id: pe.project_id || '',
        annual_target: String(pe.annual_target),
        annual_budget: String(pe.annual_budget),
        activity_name: pe.activity_name,
        activity_description: pe.activity_description,
        lockScope: true,
      },
      startStep: 2,
    });
  };

  return (
    <div className="space-y-6">
      <button onClick={goBackToPlan} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-ercs-red">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Plan
      </button>

      <div className="bg-white p-5 rounded-xl border shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${scopeType === 'Regional' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                {scopeType}
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase">{entries.length} linked activit{entries.length === 1 ? 'y' : 'ies'}</span>
            </div>
            <h2 className="text-lg font-black text-slate-800 mt-1 flex items-center gap-2">
              {scopeType === 'Regional' ? <MapPin className="w-4 h-4 text-blue-400" /> : <FolderGit2 className="w-4 h-4 text-purple-400" />}
              {scopeName}
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">
              Every National Activity {scopeName} executes against, in one place. Switch quarters to see that quarter's figures instead of the annual plan.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {roleIsCoordinator && (
              <>
                <button onClick={() => setActiveRoute('quarterly-plan')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
                  <CalendarClock className="w-3.5 h-3.5" /> Quarterly Plan
                </button>
                <button onClick={() => setActiveRoute('quarterly')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 font-bold text-xs">
                  <CalendarCheck2 className="w-3.5 h-3.5" /> Quarterly Actuals
                </button>
              </>
            )}
            <button onClick={openAddPlanWizard} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ercs-red text-white font-bold text-xs">
              <Plus className="w-3.5 h-3.5" /> Add Plan Entry
            </button>
          </div>
        </div>

        <div className="mt-4 bg-white p-1.5 rounded-lg border inline-flex gap-1">
          <button onClick={() => setQuarterId('ALL')} className={`px-3 py-1 rounded text-[10px] font-bold ${quarterId === 'ALL' ? 'bg-ercs-red text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
            Annual
          </button>
          {quarters.map(qtr => (
            <button key={qtr.id} onClick={() => setQuarterId(qtr.id)} className={`px-3 py-1 rounded text-[10px] font-bold ${quarterId === qtr.id ? 'bg-ercs-red text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              {qtr.id}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <StatCard icon={Target} label="Achievement" value={`${achievement.toFixed(1)}%`} sub={`${actual.toLocaleString()} / ${target.toLocaleString()}`} warning={achievementWarning} />
          <StatCard icon={Wallet} label="Budget Utilization" value={`${utilization.toFixed(1)}%`} sub={`ETB ${spent.toLocaleString()} / ${budget.toLocaleString()}`} />
          <StatCard icon={Users} label="Beneficiaries Reached" value={actualBeneficiaries.toLocaleString()} sub={`of ${totalBeneficiaries.toLocaleString()} planned`} />
          <StatCard icon={Layers} label="Linked Activities" value={String(entries.length)} sub="Matching current filters" />
        </div>
      </div>

      <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Layers className="w-4 h-4 text-ercs-red" /> Execution Plan Entries ({entries.length})
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs text-slate-500 mb-3">No Plan Entries are linked to {scopeName} yet.</p>
            <button onClick={openAddPlanWizard} className="inline-flex items-center gap-1.5 bg-ercs-red text-white px-3 py-1.5 rounded-lg text-xs font-bold">
              <Plus className="w-3.5 h-3.5" /> Add Plan Entry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b">
                <tr>
                  <th className="p-3">Code</th>
                  <th className="p-3">Activity Name</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">UOM</th>
                  <th className="p-3 text-right">Target</th>
                  <th className="p-3 text-right">Actual</th>
                  <th className="p-3 text-right">Achievement %</th>
                  <th className="p-3 text-right">Budget (ETB)</th>
                  <th className="p-3 text-right">Spent (ETB)</th>
                  <th className="p-3 text-right">Utilisation %</th>
                  <th className="p-3 text-right">Total Beneficiaries</th>
                  <th className="p-3 text-right">Actual Beneficiaries</th>
                  <th className="p-3 text-right">Beneficiary %</th>
                  {roleIsCoordinator && <th className="p-3 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map(pe => {
                  const na = nationalActivities.find(n => n.id === pe.national_activity_id);
                  const peTarget = sumPlannedTarget([pe], quarterlyPlans, quarterId);
                  const peActual = sumActual([pe], quarterlyActuals, quarterId);
                  const peBudget = sumPlannedBudget([pe], quarterlyPlans, quarterId);
                  const peSpent = sumExpenditure([pe], quarterlyActuals, quarterId);
                  const peAchievement = achievementPct(peActual, peTarget);
                  const peUtil = budgetUtilizationPct(peSpent, peBudget);
                  const peTotalBen = convertToBeneficiaries(peTarget, na?.uom || '', uomConfigs);
                  const peActualBen = convertToBeneficiaries(peActual, na?.uom || '', uomConfigs);
                  const peBenPct = beneficiaryPct(peActualBen, peTotalBen);

                  return (
                    <tr key={pe.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-ercs-red whitespace-nowrap">{na?.code}</td>
                      <td className="p-3 min-w-40 font-bold text-slate-800">{pe.activity_name}</td>
                      <td className="p-3 min-w-56 text-slate-500">{pe.activity_description}</td>
                      <td className="p-3 whitespace-nowrap text-slate-500 font-semibold">{na?.uom}</td>
                      <td className="p-3 text-right font-bold whitespace-nowrap">{peTarget.toLocaleString()}</td>
                      <td className="p-3 text-right whitespace-nowrap">{peActual.toLocaleString()}</td>
                      <td className="p-3 text-right font-bold whitespace-nowrap">{peAchievement.toFixed(1)}%</td>
                      <td className="p-3 text-right whitespace-nowrap">{peBudget.toLocaleString()}</td>
                      <td className="p-3 text-right whitespace-nowrap">{peSpent.toLocaleString()}</td>
                      <td className="p-3 text-right font-bold whitespace-nowrap">{peUtil.toFixed(1)}%</td>
                      <td className="p-3 text-right whitespace-nowrap">{peTotalBen.toLocaleString()}</td>
                      <td className="p-3 text-right whitespace-nowrap">{peActualBen.toLocaleString()}</td>
                      <td className="p-3 text-right whitespace-nowrap">{peBenPct.toFixed(1)}%</td>
                      {roleIsCoordinator && (
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            <button onClick={() => openEditPlanWizard(pe)} className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-bold">Edit</button>
                            <button onClick={() => setDeleteTarget({ id: pe.id, label: `${na?.code || ''} / ${scopeName}` })} className="px-2.5 py-1 rounded bg-red-50 text-red-700 font-bold"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-black border-t-2 border-slate-200">
                  <td className="p-3" colSpan={7}>TOTAL</td>
                  <td className="p-3 text-right">{budget.toLocaleString()}</td>
                  <td className="p-3 text-right">{spent.toLocaleString()}</td>
                  <td className="p-3 text-right">{utilization.toFixed(1)}%</td>
                  <td className="p-3 text-right">{totalBeneficiaries.toLocaleString()}</td>
                  <td className="p-3 text-right">{actualBeneficiaries.toLocaleString()}</td>
                  <td className="p-3 text-right">{beneficiaryPct(actualBeneficiaries, totalBeneficiaries).toFixed(1)}%</td>
                  {roleIsCoordinator && <td className="p-3"></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {peWizard && (
        <PlanEntryWizardModal
          initial={peWizard.initial}
          startStep={peWizard.startStep}
          onClose={() => setPeWizard(null)}
          onSaved={() => setPeWizard(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmDeleteModal
          label={deleteTarget.label}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            deletePlanEntry(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
};

const StatCard: React.FC<{ icon: any; label: string; value: React.ReactNode; sub?: React.ReactNode; warning?: string }> = ({ icon: Icon, label, value, sub, warning }) => (
  <div className="bg-slate-50 border rounded-lg p-3">
    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
      <span>{label}</span>
      <Icon className="w-3.5 h-3.5" />
    </div>
    <div className="text-lg font-black text-slate-800 mt-1">{value}</div>
    {sub && <div className="text-[10px] text-slate-500 mt-1">{sub}</div>}
    {warning && (
      <div className="mt-2 text-[9px] leading-snug text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-1 font-semibold">
        ⚠ {warning}
      </div>
    )}
  </div>
);
