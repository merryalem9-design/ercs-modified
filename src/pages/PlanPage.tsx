// src/pages/PlanPage.tsx
import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { FilterBar } from '../components/common/FilterBar';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  sumTarget,
  sumBudget,
  sumPlannedTarget,
  sumPlannedBudget,
  sumActual,
  sumExpenditure,
  achievementPct,
  budgetUtilizationPct,
  convertToBeneficiaries,
} from '../utils/calculations';
import { PlanEntry, ScopeType, Project } from '../types';
import { ArrowLeft, ArrowUpRight, ChevronRight, Layers, Plus, Save, Trash2, X } from 'lucide-react';

interface PeWizardFormState {
  id?: string;
  strategicPriorityId: string;
  national_activity_id: string;
  scope_type: ScopeType;
  region_id: string;
  project_id: string;
  annual_target: string;
  annual_budget: string;
  activity_name: string;
  activity_description: string;
  /** True when the execution scope (Region/Project) is fixed by the user's
   *  assigned role or by the active filter — the wizard locks scope
   *  selection in that case instead of leaving it open. */
  lockScope?: boolean;
}

export const PlanPage: React.FC = () => {
  const {
    nationalActivities, regions, projects, deletePlanEntry,
    uomConfigs, quarterlyPlans, quarterlyActuals, filters, getFilteredPlanEntries,
    setSelectedNationalActivityId, setActiveRoute, currentRole,
  } = useApp();

  const [peWizard, setPeWizard] = useState<null | { initial: PeWizardFormState; startStep: 1 | 2 }>(null);
  const [deleteTarget, setDeleteTarget] = useState<null | { id: string; label: string }>(null);

  const filteredEntries = getFilteredPlanEntries();
  const q = filters.quarterId;
  const isQuarterScoped = q !== 'ALL';

  const isCoordinator = currentRole !== 'National Activity AOP';
  // 'NONE' is a Report-page-only display toggle (see FilterBar's
  // allowNoneScope) — it never restricts which Plan Entries are in scope
  // (see AppContext's getFilteredPlanEntries), so it must be treated the
  // same as 'ALL' here too. Otherwise a stale Region/Project = 'NONE' left
  // over from a Report page visit would incorrectly flip this page out of
  // its aggregated view.
  const hasRegionOrProjectFilter =
    (filters.regionId !== 'ALL' && filters.regionId !== 'NONE') ||
    (filters.projectId !== 'ALL' && filters.projectId !== 'NONE');
  // Regional/Project coordinators are already scoped to their own entries by
  // role, so they always see the flat execution-entries view. The AOP sees
  // the rolled-up National-Aggregated view unless they've drilled into a
  // specific Region/Project via the filters.
  const showAggregatedView = !isCoordinator && !hasRegionOrProjectFilter;

  const canAddPlanEntry = isCoordinator || hasRegionOrProjectFilter;

  const viewLinkMap = (naId: string) => {
    setSelectedNationalActivityId(naId);
    setActiveRoute('national-detail');
  };

  const openAddPlanWizard = () => {
    const naFilterActive = filters.nationalActivityId !== 'ALL';
    const naId = naFilterActive ? filters.nationalActivityId : (nationalActivities[0]?.id || '');
    const na = nationalActivities.find(n => n.id === naId);

    const regionalRole = currentRole.startsWith('Regional Coordinator — ');
    const projectRole = currentRole.startsWith('Project Coordinator — ');
    const assignedRegion = regionalRole ? regions.find(r => r.name === currentRole.slice('Regional Coordinator — '.length)) : undefined;
    const assignedProject = projectRole ? projects.find(p => p.name === currentRole.slice('Project Coordinator — '.length)) : undefined;
    const filterRegion = filters.regionId !== 'ALL' ? regions.find(r => r.id === filters.regionId) : undefined;
    const filterProject = filters.projectId !== 'ALL' ? projects.find(p => p.id === filters.projectId) : undefined;

    const resolvedRegion = assignedRegion || filterRegion;
    const resolvedProject = assignedProject || filterProject;
    const scopeResolved = !!(resolvedRegion || resolvedProject);
    const scopeType: ScopeType = resolvedRegion ? 'Regional' : resolvedProject ? 'Project' : (regionalRole ? 'Regional' : projectRole ? 'Project' : 'Regional');

    // Only skip the "pick parent" step when we already know both which
    // National Activity this belongs to (active NA filter) and which
    // Region/Project will execute it (assigned role or active filter).
    const startStep: 1 | 2 = naFilterActive && scopeResolved ? 2 : 1;

    setPeWizard({
      initial: {
        strategicPriorityId: na?.strategic_priority_id || '',
        national_activity_id: naId,
        scope_type: scopeType,
        region_id: resolvedRegion?.id || '',
        project_id: resolvedProject?.id || '',
        annual_target: '',
        annual_budget: '',
        activity_name: '',
        activity_description: '',
        lockScope: scopeResolved,
      },
      startStep,
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

  // ---------------------------------------------------------------------
  // National-Aggregated rows — one per National Activity, bottom-up summed
  // from the Plan Entries in scope (never a stored NA-level figure).
  // ---------------------------------------------------------------------
  const naInScope = nationalActivities.filter(na =>
    filters.nationalActivityId === 'ALL' || na.id === filters.nationalActivityId
  );

  const aggregatedRows = naInScope.map(na => {
    const naEntries = filteredEntries.filter(pe => pe.national_activity_id === na.id);
    const target = sumPlannedTarget(naEntries, quarterlyPlans, q);
    const budget = sumPlannedBudget(naEntries, quarterlyPlans, q);
    const spent = sumExpenditure(naEntries, quarterlyActuals, q);
    const utilization = budgetUtilizationPct(spent, budget);
    const factor = uomConfigs.find(c => c.uom.toLowerCase() === na.uom.toLowerCase())?.factor ?? 0;
    const beneficiaries = convertToBeneficiaries(target, na.uom, uomConfigs);
    return { na, entryCount: naEntries.length, target, budget, spent, utilization, beneficiaries, factor };
  });

  const aggregatedTotalBudget = aggregatedRows.reduce((s, r) => s + r.budget, 0);
  const aggregatedTotalSpent = aggregatedRows.reduce((s, r) => s + r.spent, 0);
  const aggregatedTotalBeneficiaries = aggregatedRows.reduce((s, r) => s + r.beneficiaries, 0);
  const aggregatedTotalUtilization = budgetUtilizationPct(aggregatedTotalSpent, aggregatedTotalBudget);

  // ---------------------------------------------------------------------
  // Execution-entries rows — one per Plan Entry.
  // ---------------------------------------------------------------------
  const executionRows = filteredEntries.map(pe => {
    const na = nationalActivities.find(n => n.id === pe.national_activity_id);
    const target = sumPlannedTarget([pe], quarterlyPlans, q);
    const budget = sumPlannedBudget([pe], quarterlyPlans, q);
    const actual = sumActual([pe], quarterlyActuals, q);
    const spent = sumExpenditure([pe], quarterlyActuals, q);
    const achievement = achievementPct(actual, target);
    const utilization = budgetUtilizationPct(spent, budget);
    const factor = na ? (uomConfigs.find(c => c.uom.toLowerCase() === na.uom.toLowerCase())?.factor ?? 0) : 0;
    const beneficiaries = convertToBeneficiaries(target, na?.uom || '', uomConfigs);
    const scopeName = pe.scope_type === 'Regional' ? regions.find(r => r.id === pe.region_id)?.name : projects.find(p => p.id === pe.project_id)?.name;
    return { pe, na, target, budget, actual, spent, achievement, utilization, beneficiaries, factor, scopeName };
  });

  const executionTotalBudget = executionRows.reduce((s, r) => s + r.budget, 0);
  const executionTotalSpent = executionRows.reduce((s, r) => s + r.spent, 0);
  const executionTotalBeneficiaries = executionRows.reduce((s, r) => s + r.beneficiaries, 0);
  const executionTotalUtilization = budgetUtilizationPct(executionTotalSpent, executionTotalBudget);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-800">Step 1 — Annual Plan Data Entry</h2>
        <p className="text-xs text-slate-500 mt-1">
          {showAggregatedView
            ? "Every National Activity is fixed, Excel-sourced reference data — its Target, Budget and Beneficiaries below are always the live sum of the Plan Entries linked to it, bottom-up, nothing to set and nothing to reconcile. Filter to a Region or Project to see (and add) the execution entries behind these numbers."
            : "Each row below is a Plan Entry — a Region or Project's contribution to a National Activity. Its Target and Budget roll up live into that National Activity's totals. Use the Quarter filter to switch these figures between the full annual plan and a single quarter's Quarterly Plan / Quarterly Actual."}
        </p>
      </div>

      <FilterBar />

      <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Layers className="w-4 h-4 text-ercs-red" />
            <span>{showAggregatedView ? `National Activities (${aggregatedRows.length})` : `Execution Plan Entries (${executionRows.length})`}</span>
            {isQuarterScoped && <span className="normal-case font-semibold text-slate-400">— {q} figures</span>}
          </div>
          {canAddPlanEntry && (
            <button onClick={openAddPlanWizard} className="flex items-center gap-1.5 bg-ercs-red text-white px-3 py-1.5 rounded-lg text-xs font-bold">
              <Plus className="w-3.5 h-3.5" /> Add Plan Entry
            </button>
          )}
        </div>

        {showAggregatedView ? (
          aggregatedRows.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No National Activities match this filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b">
                  <tr>
                    <th className="p-3">Code</th>
                    <th className="p-3">Activity</th>
                    <th className="p-3">UOM</th>
                    <th className="p-3 text-right">Target</th>
                    <th className="p-3 text-right">Budget (ETB)</th>
                    <th className="p-3 text-right">Beneficiaries</th>
                    <th className="p-3 text-right">% Utilization</th>
                    <th className="p-3 text-center">Open</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {aggregatedRows.map(row => (
                    <tr key={row.na.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-ercs-red whitespace-nowrap">{row.na.code}</td>
                      <td className="p-3 min-w-56">
                        <div className="font-bold text-slate-800">{row.na.description}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">{row.entryCount} linked plan {row.entryCount === 1 ? 'entry' : 'entries'} · {row.na.responsibility}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-500 font-semibold">{row.na.uom}</td>
                      <td className="p-3 text-right font-bold whitespace-nowrap">{row.target.toLocaleString()}</td>
                      <td className="p-3 text-right whitespace-nowrap">{row.budget.toLocaleString()}</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="font-bold">{row.beneficiaries.toLocaleString()}</div>
                        <div className="text-[9px] text-slate-400">Target × {row.factor}</div>
                      </td>
                      <td className="p-3 text-right font-bold whitespace-nowrap">{row.utilization.toFixed(1)}%</td>
                      <td className="p-3 text-center">
                        <button onClick={() => viewLinkMap(row.na.id)} className="text-[10px] font-bold text-ercs-red inline-flex items-center gap-0.5">
                          View <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-black border-t-2 border-slate-200">
                    <td className="p-3" colSpan={3}>TOTAL</td>
                    <td className="p-3 text-right text-slate-300" title="Targets use different units across activities and are not summable">—</td>
                    <td className="p-3 text-right">{aggregatedTotalBudget.toLocaleString()}</td>
                    <td className="p-3 text-right">{aggregatedTotalBeneficiaries.toLocaleString()}</td>
                    <td className="p-3 text-right">{aggregatedTotalUtilization.toFixed(1)}%</td>
                    <td className="p-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        ) : (
          executionRows.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs text-slate-500 mb-3">No Plan Entries are linked yet for this selection.</p>
              {canAddPlanEntry && (
                <button onClick={openAddPlanWizard} className="inline-flex items-center gap-1.5 bg-ercs-red text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                  <Plus className="w-3.5 h-3.5" /> Add Plan Entry
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b">
                  <tr>
                    <th className="p-3">Code</th>
                    <th className="p-3">Activity Name</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Executed By</th>
                    <th className="p-3 text-right">Target</th>
                    <th className="p-3 text-right">Budget (ETB)</th>
                    <th className="p-3 text-right">Beneficiaries</th>
                    <th className="p-3 text-right">% Utilization</th>
                    <th className="p-3 text-center">Status</th>
                    {isCoordinator && <th className="p-3 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {executionRows.map(row => (
                    <tr key={row.pe.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-ercs-red whitespace-nowrap">{row.na?.code}</td>
                      <td className="p-3 min-w-40 font-bold text-slate-800">{row.pe.activity_name}</td>
                      <td className="p-3 min-w-56 text-slate-500">{row.pe.activity_description}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.pe.scope_type === 'Regional' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>{row.pe.scope_type}</span>
                        <span className="ml-2 font-semibold">{row.scopeName || '—'}</span>
                      </td>
                      <td className="p-3 text-right font-bold whitespace-nowrap">{row.target.toLocaleString()} {row.na?.uom}</td>
                      <td className="p-3 text-right whitespace-nowrap">{row.budget.toLocaleString()}</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="font-bold">{row.beneficiaries.toLocaleString()}</div>
                        <div className="text-[9px] text-slate-400">Target × {row.factor}</div>
                      </td>
                      <td className="p-3 text-right font-bold whitespace-nowrap">{row.utilization.toFixed(1)}%</td>
                      <td className="p-3 text-center"><StatusBadge achievementPct={row.achievement} hasActuals={row.actual > 0} /></td>
                      {isCoordinator && (
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            <button onClick={() => openEditPlanWizard(row.pe)} className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-bold">Edit</button>
                            <button onClick={() => setDeleteTarget({ id: row.pe.id, label: `${row.na?.code || ''} / ${row.scopeName || ''}` })} className="px-2.5 py-1 rounded bg-red-50 text-red-700 font-bold"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-black border-t-2 border-slate-200">
                    <td className="p-3" colSpan={4}>TOTAL</td>
                    <td className="p-3 text-right text-slate-300" title="Targets use different units across activities and are not summable">—</td>
                    <td className="p-3 text-right">{executionTotalBudget.toLocaleString()}</td>
                    <td className="p-3 text-right">{executionTotalBeneficiaries.toLocaleString()}</td>
                    <td className="p-3 text-right">{executionTotalUtilization.toFixed(1)}%</td>
                    <td className="p-3" colSpan={isCoordinator ? 2 : 1}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
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

// ============================================================
// PlanEntryWizardModal — exported so NationalActivityDetailPage and
// ScopeDetailPage can reuse it for their own "Add Plan Entry" flows.
// ============================================================
export const PlanEntryWizardModal: React.FC<{
  initial: PeWizardFormState;
  startStep: 1 | 2;
  onClose: () => void;
  onSaved: () => void;
}> = ({ initial, startStep, onClose, onSaved }) => {
  const { nationalActivities, regions, projects, addProject, planEntries, addPlanEntry, updatePlanEntry, currentRole } = useApp();
  const [step, setStep] = useState<1 | 2>(startStep);
  const [form, setForm] = useState<PeWizardFormState>(initial);
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const savingRef = useRef(false);

  const isEditing = !!form.id;
  const regionalRole = currentRole.startsWith('Regional Coordinator — ');
  const projectRole = currentRole.startsWith('Project Coordinator — ');
  const roleForcedScope: ScopeType | null = regionalRole ? 'Regional' : projectRole ? 'Project' : null;
  const scopeLocked = !!roleForcedScope || !!initial.lockScope;
  const assignedRegion = regionalRole ? regions.find(r => r.name === currentRole.slice('Regional Coordinator — '.length)) : undefined;
  const assignedProject = projectRole ? projects.find(p => p.name === currentRole.slice('Project Coordinator — '.length)) : undefined;
  const effectiveScope = form.scope_type;

  const naOptions = nationalActivities;
  const selectedNa = nationalActivities.find(na => na.id === form.national_activity_id);

  const siblingEntries = selectedNa ? planEntries.filter(pe => pe.national_activity_id === selectedNa.id && pe.id !== form.id) : [];
  const siblingTarget = sumTarget(siblingEntries);
  const siblingBudget = sumBudget(siblingEntries);
  const thisTarget = Number(form.annual_target) || 0;
  const thisBudget = Number(form.annual_budget) || 0;

  const numbersValid = thisTarget >= 0 && thisBudget >= 0;

  const isDuplicateLink = !!selectedNa && !!form.scope_type && planEntries.some(pe =>
    pe.id !== form.id &&
    pe.national_activity_id === selectedNa.id &&
    pe.scope_type === effectiveScope &&
    (effectiveScope === 'Regional'
      ? (!!form.region_id && pe.region_id === form.region_id)
      : (!!form.project_id && pe.project_id === form.project_id))
  );

  const canContinue = !!form.national_activity_id;
  const canSave =
    !!form.national_activity_id &&
    !!effectiveScope &&
    (effectiveScope === 'Regional' ? !!form.region_id : !!form.project_id) &&
    !!form.activity_name.trim() &&
    !!form.activity_description.trim() &&
    numbersValid &&
    !isDuplicateLink;

  // The Plan Entry's activity code is always just its parent National
  // Activity's own code — the "Executed By" column already makes clear
  // who's running it, so there's no per-Region/Project suffix any more.
  const activityCode = selectedNa?.code || '';

  React.useEffect(() => {
    if (form.activity_name.trim()) return;
    const label = effectiveScope === 'Regional' ? regions.find(r => r.id === form.region_id)?.name : projects.find(p => p.id === form.project_id)?.name;
    if (label) setForm(f => ({ ...f, activity_name: label }));
  }, [form.activity_name, form.region_id, form.project_id, effectiveScope, regions, projects]);

  const handleAddProject = () => {
    const name = newProjectName.trim();
    if (!name) return;
    const project: Project = { id: `proj-${Date.now()}`, name };
    addProject(project);
    setForm(f => ({ ...f, project_id: project.id }));
    setNewProjectName('');
    setAddingProject(false);
  };

  const handleSave = () => {
    if (!canSave || savingRef.current) return;
    savingRef.current = true;
    const pe: PlanEntry = {
      id: form.id || `pe-${Date.now()}`,
      national_activity_id: form.national_activity_id,
      scope_type: effectiveScope,
      region_id: effectiveScope === 'Regional' ? form.region_id : undefined,
      project_id: effectiveScope === 'Project' ? form.project_id : undefined,
      annual_target: thisTarget,
      annual_budget: thisBudget,
      activity_code: selectedNa?.code || '',
      activity_name: form.activity_name.trim(),
      activity_description: form.activity_description.trim(),
      approval_status: 'Approved',
    };
    if (isEditing) updatePlanEntry(pe); else addPlanEntry(pe);
    onSaved();
  };

  const scopeLabel = effectiveScope === 'Regional' ? regions.find(r => r.id === form.region_id)?.name : projects.find(p => p.id === form.project_id)?.name;

  return (
    <ModalShell title={isEditing ? 'Edit Plan Entry' : 'Add Plan — Link to National Activity'} onClose={onClose}>
      <div className="flex items-center gap-2 mb-4">
        <StepPill num={1} label="Link to Parent" active={step === 1} done={step > 1} />
        <div className="flex-1 h-px bg-slate-200" />
        <StepPill num={2} label="Execution Details" active={step === 2} done={false} />
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <span className="block text-[10px] font-bold text-slate-500 mb-1">National Activity (Parent)</span>
            <select
              value={form.national_activity_id}
              onChange={e => setForm(f => ({ ...f, national_activity_id: e.target.value }))}
              disabled={isEditing}
              className="w-full text-xs border border-slate-200 rounded p-2 bg-slate-50 disabled:opacity-60"
            >
              <option value="">Select the National Activity this plan entry belongs to…</option>
              {naOptions.map(na => <option key={na.id} value={na.id}>{na.code} — {na.description}</option>)}
            </select>
            {isEditing && <div className="text-[10px] text-slate-400 mt-1">The parent link is fixed while editing an existing entry.</div>}
          </div>

          {selectedNa && (
            <div className="bg-slate-50 border rounded-lg p-3 space-y-2">
              <div className="text-[10px] uppercase font-extrabold text-slate-400">Link Preview</div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="bg-red-50 text-ercs-red border border-red-100 rounded px-2 py-1">{selectedNa.code}</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="bg-blue-50 text-blue-700 rounded px-2 py-1">{isEditing ? 'This Plan Entry' : 'New Plan Entry'}</span>
              </div>
              <div className="text-[10px] text-slate-500">
                Current Aggregated Target: <b>{sumTarget(planEntries.filter(pe => pe.national_activity_id === selectedNa.id)).toLocaleString()} {selectedNa.uom}</b> · Current Aggregated Budget: <b>ETB {sumBudget(planEntries.filter(pe => pe.national_activity_id === selectedNa.id)).toLocaleString()}</b> · Linked entries: <b>{planEntries.filter(pe => pe.national_activity_id === selectedNa.id).length}</b>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button disabled={!canContinue} onClick={() => setStep(2)} className="bg-ercs-red text-white px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-40">
              Continue to Execution Details
            </button>
          </div>
        </div>
      )}

      {step === 2 && selectedNa && (
        <div className="space-y-4">
          <div>
            <span className="block text-[10px] font-bold text-slate-500 mb-1">Executed By</span>
            {scopeLocked && (
              <div className="mb-2 text-[10px] font-semibold text-slate-600 bg-blue-50 border border-blue-100 rounded p-2">
                {assignedRegion || assignedProject
                  ? <>Assigned user scope: <b>{assignedRegion?.name || assignedProject?.name}</b>. This plan entry will be saved under that exact {assignedRegion ? 'regional' : 'project'} scope.</>
                  : <>Using the active filter: <b>{scopeLabel}</b>. This plan entry will be saved under that exact {effectiveScope === 'Regional' ? 'regional' : 'project'} scope — reset the filter first if you meant a different one.</>}
              </div>
            )}
            <div className="flex gap-2">
              {(['Regional', 'Project'] as ScopeType[]).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => scopeLocked ? undefined : setForm(f => ({ ...f, scope_type: st, region_id: '', project_id: '', activity_name: '' }))}
                  disabled={scopeLocked && effectiveScope !== st}
                  className={`flex-1 py-2 rounded text-xs font-bold border ${effectiveScope === st ? 'bg-ercs-red text-white border-ercs-red' : 'bg-slate-50 text-slate-600'} disabled:opacity-40`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {effectiveScope === 'Regional' && (
            <div>
              <span className="block text-[10px] font-bold text-slate-500 mb-1">Region</span>
              <select value={form.region_id} onChange={e => setForm(f => ({ ...f, region_id: e.target.value }))} disabled={scopeLocked} className="w-full text-xs border rounded p-2 bg-slate-50 disabled:opacity-60">
                <option value="">Select region…</option>
                {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}
          {effectiveScope === 'Project' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="block text-[10px] font-bold text-slate-500">Project</span>
                {!scopeLocked && <button type="button" onClick={() => setAddingProject(a => !a)} className="text-[10px] font-bold text-ercs-red">+ Add Project</button>}
              </div>
              <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))} disabled={scopeLocked} className="w-full text-xs border rounded p-2 bg-slate-50 disabled:opacity-60">
                <option value="">Select project…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {addingProject && !scopeLocked && (
                <div className="mt-2 flex gap-1.5">
                  <input
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    placeholder="New project name"
                    className="flex-1 text-xs border border-slate-200 rounded p-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
                  />
                  <button type="button" onClick={handleAddProject} className="px-2.5 py-1 rounded bg-ercs-red text-white text-[10px] font-bold">Add</button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 bg-slate-50 border rounded-lg p-3">
              <div className="text-[10px] uppercase font-extrabold text-slate-400">Activity Code</div>
              <div className="text-sm font-black text-ercs-red mt-1">{activityCode || '—'}</div>
              <div className="text-[10px] text-slate-400 mt-1">Always the parent National Activity's own code — the "Executed By" column already shows who's running it.</div>
            </div>
            <LabeledInput label="Activity Name" value={form.activity_name} onChange={v => setForm(f => ({ ...f, activity_name: v }))} placeholder="e.g. HNS, EAP, Amhara" />
            <div className="col-span-2">
              <label className="block">
                <span className="block text-[10px] font-bold text-slate-500 mb-1">Activity Description</span>
                <textarea value={form.activity_description} onChange={e => setForm(f => ({ ...f, activity_description: e.target.value }))} rows={3} placeholder="Describe what this Region/Project entry will deliver" className="w-full text-xs border border-slate-200 rounded p-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-100" />
              </label>
            </div>
            <LabeledInput
              label={`Annual Target (${selectedNa.uom})`}
              type="number"
              value={form.annual_target}
              onChange={v => {
                if (v === '') { setForm(f => ({ ...f, annual_target: '' })); return; }
                const value = Number(v);
                setForm(f => ({ ...f, annual_target: String(Number.isFinite(value) ? Math.max(0, value) : 0) }));
              }}
            />
            <LabeledInput
              label="Annual Budget (ETB)"
              type="number"
              value={form.annual_budget}
              onChange={v => {
                if (v === '') { setForm(f => ({ ...f, annual_budget: '' })); return; }
                const value = Number(v);
                setForm(f => ({ ...f, annual_budget: String(Number.isFinite(value) ? Math.max(0, value) : 0) }));
              }}
            />
          </div>

          {isDuplicateLink && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-[11px] text-rose-700 font-semibold">
              This {effectiveScope === 'Regional' ? 'Region' : 'Project'} is already linked to {selectedNa.code}. Pick a different {effectiveScope === 'Regional' ? 'Region' : 'Project'}, or close this wizard and edit the existing entry instead — two entries for the same {effectiveScope === 'Regional' ? 'Region' : 'Project'} would double-count its contribution.
            </div>
          )}
          {!numbersValid && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-[11px] text-rose-700 font-semibold">
              Annual Target and Annual Budget must be zero or greater.
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-[11px] text-blue-800 font-semibold space-y-1">
            <div><b>{selectedNa.code}</b>'s Target and Budget are simply the sum of its linked Plan Entries — there's no fixed ceiling to reconcile against.</div>
            <div>This entry will contribute <b>{thisTarget.toLocaleString()} {selectedNa.uom}</b> and <b>ETB {thisBudget.toLocaleString()}</b>, alongside <b>{siblingTarget.toLocaleString()} {selectedNa.uom}</b> / <b>ETB {siblingBudget.toLocaleString()}</b> already committed by {siblingEntries.length} other linked {siblingEntries.length === 1 ? 'entry' : 'entries'}.</div>
            <div>After saving, split this entry's annual target and budget across Q1–Q4 on the Quarterly Plan page — Quarterly Actual Entry measures against that breakdown.</div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="px-4 py-2 rounded-lg border text-xs font-bold">Back</button>
            <button disabled={!canSave} onClick={handleSave} className="bg-ercs-red text-white px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-40">
              <Save className="w-3.5 h-3.5" /> {isEditing ? 'Update Plan Entry' : 'Save & Link to National Activity'}
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
};

export type { PeWizardFormState };

// ============================================================
// Helper Components
// ============================================================
const StepPill: React.FC<{ num: number; label: string; active: boolean; done: boolean }> = ({ num, label, active, done }) => (
  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold ${active ? 'bg-red-50 text-ercs-red' : done ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-400'}`}>
    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${active ? 'bg-ercs-red text-white' : done ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'}`}>{num}</span>
    {label}
  </div>
);

const LabeledInput: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }> = ({ label, value, onChange, type = 'text', placeholder }) => (
  <label className="block">
    <span className="block text-[10px] font-bold text-slate-500 mb-1">{label}</span>
    <input type={type} min={type === 'number' ? 0 : undefined} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} className="w-full text-xs border border-slate-200 rounded p-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-100" />
  </label>
);

// ============================================================
// ModalShell — capped at 90vh with only the body scrolling. The header
// (with an explicit "Back" control plus the "X") is pinned outside the
// scroll area, so there's always a way back out no matter how tall the
// step content gets.
// ============================================================
const ModalShell: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-ercs-red shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <h3 className="text-sm font-black text-slate-800 text-center flex-1 truncate">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-5 overflow-y-auto">{children}</div>
    </div>
  </div>
);

// Exported so ScopeDetailPage (and any other page listing Plan Entries) can
// reuse the exact same confirmation dialog instead of duplicating it.
export const ConfirmDeleteModal: React.FC<{ label: string; onCancel: () => void; onConfirm: () => void }> = ({ label, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
    <div className="bg-white max-w-md w-full rounded-xl shadow-2xl p-5">
      <div className="flex items-center gap-2 text-red-700 font-black text-sm"><Trash2 className="w-5 h-5" /> Delete "{label}"?</div>
      <p className="text-xs text-slate-600 mt-3">This also removes any linked Quarterly Plan and Quarterly Actual records. The parent National Activity's aggregated Target and Budget recalculate automatically — they're always the live sum of its linked Plan Entries.</p>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg border text-xs font-bold">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold">Delete</button>
      </div>
    </div>
  </div>
);