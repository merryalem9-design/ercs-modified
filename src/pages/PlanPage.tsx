// src/pages/PlanPage.tsx
import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { FilterBar } from '../components/common/FilterBar';
import { sumTarget, sumBudget } from '../utils/calculations';
import { buildActivityCode } from '../utils/activityCode';
import { NationalActivity, PlanEntry, ScopeType, Region, Zone, Project, Responsibility } from '../types';
import { AlertTriangle, ArrowUpRight, CheckCircle2, Layers, Lock, Plus, Save, Trash2, X } from 'lucide-react';

const RESPONSIBILITY_OPTIONS: Responsibility[] = ['HQ', 'Branch', 'Both'];

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
}

const OTHER_UOM = '__OTHER__';
const LOCKED_UOMS = new Set(['Person', 'House Hold (HH)']);

const clampFactor = (raw: string): number => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

type NationalActivityFormState = Partial<NationalActivity> & {
  customUomName?: string;
  customUomValue?: string;
};

export const PlanPage: React.FC = () => {
  const {
    nationalActivities, addNationalActivity, updateNationalActivity, deleteNationalActivity,
    regions, zones, projects, planEntries, deletePlanEntry,
    uomConfigs, updateUomFactor, filters, getFilteredPlanEntries,
    setSelectedNationalActivityId, setActiveRoute, currentRole,
  } = useApp();

  const [naForm, setNaForm] = useState<null | NationalActivityFormState>(null);
  const [peWizard, setPeWizard] = useState<null | { initial: PeWizardFormState; startStep: 1 | 2 }>(null);
  const [deleteTarget, setDeleteTarget] = useState<null | { type: 'na' | 'pe'; id: string; label: string }>(null);

  const filteredEntries = getFilteredPlanEntries();

  const visibleNationalActivities = nationalActivities.filter(na => {
    if (filters.nationalActivityId !== 'ALL' && na.id !== filters.nationalActivityId) return false;
    return true;
  });

  const viewLinkMap = (naId: string) => {
    setSelectedNationalActivityId(naId);
    setActiveRoute('national-detail');
  };

  const saveNa = () => {
    if (!naForm) return;
    const manualTarget = Number(naForm.annual_target);
    const manualBudget = Number(naForm.annual_budget);
    const isOtherUom = naForm.uom === OTHER_UOM;
    const resolvedUom = isOtherUom ? (naForm.customUomName || '').trim() : (naForm.uom || '').trim();

    const na: NationalActivity = {
      id: naForm.id || `na-${Date.now()}`,
      strategic_priority_id: naForm.strategic_priority_id || nationalActivities[0]?.strategic_priority_id || '',
      code: (naForm.code || '').trim(),
      description: (naForm.description || '').trim(),
      uom: resolvedUom,
      responsibility: (naForm.responsibility as Responsibility) || 'HQ',
      region_id: naForm.region_id || undefined,
      zone_id: naForm.zone_id || undefined,
      annual_target: Number.isFinite(manualTarget) && manualTarget >= 0 ? manualTarget : 0,
      annual_budget: Number.isFinite(manualBudget) && manualBudget >= 0 ? manualBudget : 0,
    };
    if (!na.code || !na.description || !na.uom || !na.strategic_priority_id) return;
    const isDuplicateCode = nationalActivities.some(other => other.id !== na.id && other.code.trim().toLowerCase() === na.code.toLowerCase());
    if (isDuplicateCode) return;

    if (isOtherUom && resolvedUom) {
      const alreadyExists = uomConfigs.some(cfg => cfg.uom.trim().toLowerCase() === resolvedUom.toLowerCase());
      if (!alreadyExists) {
        const parsedValue = Number(naForm.customUomValue);
        const factor = Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : 1;
        updateUomFactor(resolvedUom, factor);
      }
    }

    if (naForm.id) updateNationalActivity(na); else addNationalActivity(na);
    setNaForm(null);
  };

  const openAddPlanWizard = () => {
    const naId = filters.nationalActivityId !== 'ALL' ? filters.nationalActivityId : (nationalActivities[0]?.id || '');
    const na = nationalActivities.find(n => n.id === naId);
    const regionalRole = currentRole.startsWith('Regional Coordinator — ');
    const projectRole = currentRole.startsWith('Project Coordinator — ');
    const assignedRegion = regionalRole ? regions.find(r => r.name === currentRole.slice('Regional Coordinator — '.length)) : undefined;
    const assignedProject = projectRole ? projects.find(p => p.name === currentRole.slice('Project Coordinator — '.length)) : undefined;
    setPeWizard({
      initial: {
        strategicPriorityId: na?.strategic_priority_id || '',
        national_activity_id: naId,
        scope_type: regionalRole ? 'Regional' : projectRole ? 'Project' : 'Regional',
        region_id: assignedRegion?.id || '',
        project_id: assignedProject?.id || '',
        annual_target: '',
        annual_budget: '',
        activity_name: '',
        activity_description: '',
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
      },
      startStep: 2,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-800">Step 1 — Annual Plan Data Entry</h2>
        <p className="text-xs text-slate-500 mt-1">
          Define each National Activity's official target, then link it to the Regions or Projects executing against it.
          Once linked, head to the Quarterly Plan page to split each entry's annual figures into Q1–Q4 before reporting actuals.
        </p>
      </div>

      <FilterBar />

      <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Layers className="w-4 h-4 text-ercs-red" /> National Activities ({visibleNationalActivities.length})
          </div>
          {currentRole === 'National Activity AOP' && (
            <button
              onClick={() => setNaForm({ strategic_priority_id: nationalActivities[0]?.strategic_priority_id, code: 'Activity ' })}
              className="flex items-center gap-1.5 bg-ercs-red text-white px-3 py-1.5 rounded-lg text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" /> Add National Activity
            </button>
          )}
        </div>
        <div className="divide-y">
          {visibleNationalActivities.map(na => {
            const allChildren = planEntries.filter(pe => pe.national_activity_id === na.id);
            const children = filteredEntries.filter(pe => pe.national_activity_id === na.id);
            const childTarget = sumTarget(allChildren);
            const childBudget = sumBudget(allChildren);
            const targetMismatch = childTarget !== na.annual_target;
            const budgetMismatch = childBudget !== na.annual_budget;
            const naRegion = regions.find(r => r.id === na.region_id);
            const naZone = zones.find(z => z.id === na.zone_id);
            return (
              <div key={na.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-ercs-red text-white text-[10px] font-extrabold px-2 py-0.5 rounded">{na.code}</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">{na.uom}</span>
                      {na.responsibility && (
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-extrabold px-2 py-0.5 rounded border border-slate-200">{na.responsibility}</span>
                      )}
                      {(naRegion || naZone) && (
                        <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2 py-0.5 rounded">
                          {[naRegion?.name, naZone?.name].filter(Boolean).join(' / ')}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-slate-800 mt-1">{na.description}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Official Target: <b>{na.annual_target.toLocaleString()} {na.uom}</b> · Official Budget: <b>ETB {na.annual_budget.toLocaleString()}</b>
                      {children.length > 0 && <span className="text-slate-400"> (fixed National Activity ceiling)</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => viewLinkMap(na.id)} className="px-2.5 py-1.5 rounded bg-red-50 text-ercs-red font-bold text-xs flex items-center gap-1">
                      View Link Map <ArrowUpRight className="w-3 h-3" />
                    </button>
                    {currentRole === 'National Activity AOP' && <>
                      <button onClick={() => setNaForm(na)} className="px-2.5 py-1.5 rounded bg-blue-50 text-blue-700 font-bold text-xs">Edit</button>
                      <button onClick={() => setDeleteTarget({ type: 'na', id: na.id, label: na.code })} className="px-2.5 py-1.5 rounded bg-red-50 text-red-700 font-bold text-xs flex items-center gap-1"><Trash2 className="w-3 h-3" /></button>
                    </>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold">
                  <button onClick={() => viewLinkMap(na.id)} className="bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded flex items-center gap-1 transition-colors">
                    {children.length} linked plan entries <ArrowUpRight className="w-3 h-3" />
                  </button>
                  {targetMismatch
                    ? <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Target sum {childTarget.toLocaleString()} ≠ official {na.annual_target.toLocaleString()}</span>
                    : <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Target reconciled</span>}
                  {budgetMismatch
                    ? <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Budget sum {childBudget.toLocaleString()} ≠ official {na.annual_budget.toLocaleString()}</span>
                    : <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Budget reconciled</span>}
                </div>
              </div>
            );
          })}
          {visibleNationalActivities.length === 0 && <div className="p-6 text-center text-xs text-slate-500">No National Activities match this filter.</div>}
        </div>
      </section>

      <section className="bg-white p-5 rounded-xl border shadow-sm space-y-3">
        <div className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-3">Conversion Factors (UoM → Beneficiaries)</div>
        <p className="text-[11px] text-slate-500 -mt-1">This is the multiplier the Report page uses to turn a reported Actual into Beneficiaries Reached. Person and House Hold (HH) are fixed; any UoM added via "Other" on a National Activity can be fine-tuned here.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {uomConfigs.map(cfg => (
            <UomFactorCard key={cfg.uom} uom={cfg.uom} factor={cfg.factor} />
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between bg-slate-50">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">Execution Plan Entries ({filteredEntries.length})</div>
          {currentRole !== 'National Activity AOP' && (
            <button onClick={openAddPlanWizard} className="flex items-center gap-1.5 bg-ercs-red text-white px-3 py-1.5 rounded-lg text-xs font-bold">
              <Plus className="w-3.5 h-3.5" /> Add Plan Entry
            </button>
          )}
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b"><tr><th className="p-3">Activity Code</th><th className="p-3">Activity Description</th><th className="p-3">Executed By</th><th className="p-3 text-right">Annual Target</th><th className="p-3 text-right">Annual Budget</th><th className="p-3 text-center">Status</th><th className="p-3 text-center">Actions</th></tr></thead>
          <tbody className="divide-y">
            {filteredEntries.map(pe => {
              const na = nationalActivities.find(n => n.id === pe.national_activity_id);
              const scopeName = pe.scope_type === 'Regional' ? regions.find(r => r.id === pe.region_id)?.name : projects.find(p => p.id === pe.project_id)?.name;
              const isLocked = pe.approval_status === 'Approved';
              return (
                <tr key={pe.id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-ercs-red">{pe.activity_code}</td>
                  <td className="p-3 min-w-56">
                    <div className="font-bold text-slate-800">{pe.activity_name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{pe.activity_description}</div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pe.scope_type === 'Regional' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>{pe.scope_type}</span>
                    <span className="ml-2 font-semibold">{scopeName || '—'}</span>
                  </td>
                  <td className="p-3 text-right font-bold">{pe.annual_target.toLocaleString()} {na?.uom}</td>
                  <td className="p-3 text-right">{pe.annual_budget.toLocaleString()}</td>
                  <td className="p-3 text-center"><span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-100 text-emerald-800 border-emerald-300">Approved</span></td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {currentRole !== 'National Activity AOP' && !isLocked && <button onClick={() => openEditPlanWizard(pe)} className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-bold">Edit</button>}
                      {currentRole !== 'National Activity AOP' && !isLocked && <button onClick={() => setDeleteTarget({ type: 'pe', id: pe.id, label: `${pe.activity_code} / ${scopeName}` })} className="px-2.5 py-1 rounded bg-red-50 text-red-700 font-bold"><Trash2 className="w-3 h-3" /></button>}
                      {currentRole !== 'National Activity AOP' && isLocked && (
                        <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                          <Lock className="w-3 h-3" /> Approved &amp; locked
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredEntries.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-500">No plan entries match this filter.</td></tr>}
          </tbody>
        </table>
      </section>

      {naForm && <NationalActivityModal form={naForm} setForm={setNaForm} onSave={saveNa} onClose={() => setNaForm(null)} />}
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
            if (deleteTarget.type === 'na') deleteNationalActivity(deleteTarget.id); else deletePlanEntry(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
};

// ============================================================
// NationalActivityModal
// ============================================================
const NationalActivityModal: React.FC<{ form: NationalActivityFormState; setForm: any; onSave: () => void; onClose: () => void }> = ({ form, setForm, onSave, onClose }) => {
  const { uomConfigs, regions, zones, addRegion, addZone, planEntries, nationalActivities } = useApp();

  const [addingRegion, setAddingRegion] = useState(false);
  const [newRegionName, setNewRegionName] = useState('');
  const [addingZone, setAddingZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');

  const savingRef = useRef(false);

  const zonesInScope = form.region_id ? zones.filter(z => z.region_id === form.region_id) : [];

  const linkedChildren = form.id ? planEntries.filter(pe => pe.national_activity_id === form.id) : [];
  const hasChildren = linkedChildren.length > 0;
  const computedTarget = sumTarget(linkedChildren);
  const computedBudget = sumBudget(linkedChildren);
  const ceilingTarget = Number(form.annual_target || 0);
  const ceilingBudget = Number(form.annual_budget || 0);

  const isOtherUom = form.uom === OTHER_UOM;
  const customUomNameTrimmed = (form.customUomName || '').trim();
  const customUomValueRaw = form.customUomValue;
  const customUomValueNum = Number(customUomValueRaw);
  const otherUomMissingName = isOtherUom && !customUomNameTrimmed;
  const otherUomInvalidValue = isOtherUom && customUomValueRaw !== undefined && customUomValueRaw !== '' && (Number.isNaN(customUomValueNum) || customUomValueNum < 0);

  const requiredMissing =
    !(form.code || '').trim() ||
    !(form.description || '').trim() ||
    !(form.uom || '').trim() ||
    !form.strategic_priority_id ||
    otherUomMissingName;

  const manualTargetRaw = form.annual_target;
  const manualBudgetRaw = form.annual_budget;
  const manualTargetNum = Number(manualTargetRaw);
  const manualBudgetNum = Number(manualBudgetRaw);
  const manualNumbersInvalid =
    !hasChildren &&
    (
      (manualTargetRaw !== undefined && manualTargetRaw !== ('' as any) && (Number.isNaN(manualTargetNum) || manualTargetNum < 0)) ||
      (manualBudgetRaw !== undefined && manualBudgetRaw !== ('' as any) && (Number.isNaN(manualBudgetNum) || manualBudgetNum < 0))
    );

  const codeTrimmed = (form.code || '').trim();
  const duplicateCode = codeTrimmed.length > 0 && nationalActivities.some(
    other => other.id !== form.id && other.code.trim().toLowerCase() === codeTrimmed.toLowerCase()
  );

  const otherUomDuplicate = isOtherUom && customUomNameTrimmed.length > 0 && uomConfigs.some(
    cfg => cfg.uom.trim().toLowerCase() === customUomNameTrimmed.toLowerCase()
  );

  const linkedTargetExceedsCeiling = hasChildren && computedTarget > ceilingTarget;
  const linkedBudgetExceedsCeiling = hasChildren && computedBudget > ceilingBudget;

  const saveDisabled = requiredMissing || manualNumbersInvalid || duplicateCode || otherUomInvalidValue || otherUomDuplicate || linkedTargetExceedsCeiling || linkedBudgetExceedsCeiling;

  const handleAddRegion = () => {
    const name = newRegionName.trim();
    if (!name) return;
    const region: Region = { id: `reg-${Date.now()}`, name };
    addRegion(region);
    setForm((f: any) => ({ ...f, region_id: region.id, zone_id: undefined }));
    setNewRegionName('');
    setAddingRegion(false);
  };

  const handleAddZone = () => {
    const name = newZoneName.trim();
    if (!name || !form.region_id) return;
    const zone: Zone = { id: `zone-${Date.now()}`, region_id: form.region_id, name };
    addZone(zone);
    setForm((f: any) => ({ ...f, zone_id: zone.id }));
    setNewZoneName('');
    setAddingZone(false);
  };

  const handleSaveClick = () => {
    if (saveDisabled || savingRef.current) return;
    savingRef.current = true;
    onSave();
  };

  return (
    <ModalShell title={form.id ? 'Edit National Activity' : 'Add National Activity'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <LabeledInput label="Code" value={form.code || ''} onChange={v => setForm((f: any) => ({ ...f, code: v }))} placeholder="Activity 1.1.3" />
        <div>
          <span className="block text-[10px] font-bold text-slate-500 mb-1">UoM</span>
          <select
            value={form.uom || ''}
            onChange={e => {
              const value = e.target.value;
              if (value === OTHER_UOM) {
                setForm((f: any) => ({ ...f, uom: value, customUomValue: f.customUomValue ?? '1' }));
              } else {
                setForm((f: any) => ({ ...f, uom: value }));
              }
            }}
            className="w-full text-xs border border-slate-200 rounded p-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-100"
          >
            <option value="">Select UoM…</option>
            {uomConfigs.map(cfg => <option key={cfg.uom} value={cfg.uom}>{cfg.uom}</option>)}
            <option value={OTHER_UOM}>Other (add new UoM)…</option>
          </select>
        </div>

        {isOtherUom && (
          <div className="col-span-2 grid grid-cols-2 gap-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg p-3">
            <LabeledInput
              label="New UoM Name"
              value={form.customUomName || ''}
              onChange={v => setForm((f: any) => ({ ...f, customUomName: v }))}
              placeholder="e.g. # of Agreements, # of Boats"
            />
            <LabeledInput
              label="Beneficiaries per Unit"
              type="number"
              value={form.customUomValue ?? '1'}
              onChange={v => setForm((f: any) => ({ ...f, customUomValue: v }))}
            />
            <div className="col-span-2 text-[10px] text-slate-500">
              Saving adds this as a new entry in the Conversion Factors list below (defaulting to a factor of 1). Person and House Hold (HH) are never affected.
            </div>
          </div>
        )}

        <div className="col-span-2"><LabeledInput label="Description" value={form.description || ''} onChange={v => setForm((f: any) => ({ ...f, description: v }))} placeholder="What this activity delivers" /></div>

        <div>
          <span className="block text-[10px] font-bold text-slate-500 mb-1">Responsibility</span>
          <select
            value={form.responsibility || ''}
            onChange={e => setForm((f: any) => ({ ...f, responsibility: e.target.value as Responsibility }))}
            className="w-full text-xs border border-slate-200 rounded p-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-100"
          >
            <option value="">Select Responsibility…</option>
            {RESPONSIBILITY_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {hasChildren ? (
          <>
            <div>
              <span className="block text-[10px] font-bold text-slate-500 mb-1">Annual Target Ceiling</span>
              <div className="w-full text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded p-2">{ceilingTarget.toLocaleString()} {form.uom || ''}</div>
              <div className="text-[10px] text-slate-400 mt-1">
                Fixed National Activity limit — locked while Plan Entries are linked. Currently allocated across linked entries: <b>{computedTarget.toLocaleString()} {form.uom || ''}</b>
                {computedTarget !== ceilingTarget ? ' (not yet fully reconciled — see the badges on the Plan page).' : '.'}
              </div>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-500 mb-1">Annual Budget Ceiling</span>
              <div className="w-full text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded p-2">ETB {ceilingBudget.toLocaleString()}</div>
              <div className="text-[10px] text-slate-400 mt-1">
                Fixed National Activity limit — locked while Plan Entries are linked. Currently allocated across linked entries: <b>ETB {computedBudget.toLocaleString()}</b>
                {computedBudget !== ceilingBudget ? ' (not yet fully reconciled — see the badges on the Plan page).' : '.'}
              </div>
            </div>
          </>
        ) : (
          <>
            <LabeledInput label="Annual Target" type="number" value={String(form.annual_target ?? '')} onChange={v => setForm((f: any) => ({ ...f, annual_target: v }))} />
            <LabeledInput label="Annual Budget (ETB)" type="number" value={String(form.annual_budget ?? '')} onChange={v => setForm((f: any) => ({ ...f, annual_budget: v }))} />
          </>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="block text-[10px] font-bold text-slate-500">Region</span>
            <button type="button" onClick={() => setAddingRegion(a => !a)} className="text-[10px] font-bold text-ercs-red">+ Add Region</button>
          </div>
          <select
            value={form.region_id || ''}
            onChange={e => setForm((f: any) => ({ ...f, region_id: e.target.value || undefined, zone_id: undefined }))}
            className="w-full text-xs border border-slate-200 rounded p-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-100"
          >
            <option value="">National (All Regions)</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {addingRegion && (
            <div className="mt-2 flex gap-1.5">
              <input
                value={newRegionName}
                onChange={e => setNewRegionName(e.target.value)}
                placeholder="New region name"
                className="flex-1 text-xs border border-slate-200 rounded p-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
              />
              <button type="button" onClick={handleAddRegion} className="px-2.5 py-1 rounded bg-ercs-red text-white text-[10px] font-bold">Add</button>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="block text-[10px] font-bold text-slate-500">Zone</span>
            <button
              type="button"
              disabled={!form.region_id}
              onClick={() => setAddingZone(a => !a)}
              className={`text-[10px] font-bold ${form.region_id ? 'text-ercs-red' : 'text-slate-300 cursor-not-allowed'}`}
            >
              + Add Zone
            </button>
          </div>
          <select
            value={form.zone_id || ''}
            onChange={e => setForm((f: any) => ({ ...f, zone_id: e.target.value || undefined }))}
            disabled={!form.region_id}
            className="w-full text-xs border border-slate-200 rounded p-2 bg-slate-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-100"
          >
            <option value="">{form.region_id ? 'All Zones' : 'Select a Region first'}</option>
            {zonesInScope.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
          {addingZone && form.region_id && (
            <div className="mt-2 flex gap-1.5">
              <input
                value={newZoneName}
                onChange={e => setNewZoneName(e.target.value)}
                placeholder="New zone name"
                className="flex-1 text-xs border border-slate-200 rounded p-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
              />
              <button type="button" onClick={handleAddZone} className="px-2.5 py-1 rounded bg-ercs-red text-white text-[10px] font-bold">Add</button>
            </div>
          )}
        </div>
      </div>

      {requiredMissing && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-800 font-semibold">
          Code, Description and UoM are all required before saving.
        </div>
      )}
      {!requiredMissing && duplicateCode && (
        <div className="mt-3 bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-[11px] text-rose-700 font-semibold">
          Another National Activity already uses the code "{codeTrimmed}". Codes must be unique — every Report table and filter is labeled by code, not id.
        </div>
      )}
      {!requiredMissing && otherUomDuplicate && (
        <div className="mt-3 bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-[11px] text-rose-700 font-semibold">
          "{customUomNameTrimmed}" already exists in the Conversion Factors list. Close this and select it directly from the UoM dropdown instead of re-adding it as "Other".
        </div>
      )}
      {manualNumbersInvalid && (
        <div className="mt-3 bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-[11px] text-rose-700 font-semibold">
          Annual Target and Annual Budget must be zero or greater.
        </div>
      )}
      {linkedTargetExceedsCeiling && (
        <div className="mt-3 bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-[11px] text-rose-700 font-semibold">
          Linked Plan Entry targets total <b>{computedTarget.toLocaleString()} {form.uom || ''}</b>, which exceeds the fixed National Activity target ceiling of <b>{ceilingTarget.toLocaleString()} {form.uom || ''}</b>.
        </div>
      )}
      {linkedBudgetExceedsCeiling && (
        <div className="mt-3 bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-[11px] text-rose-700 font-semibold">
          Linked Plan Entry budgets total <b>ETB {computedBudget.toLocaleString()}</b>, which exceeds the fixed National Activity budget ceiling of <b>ETB {ceilingBudget.toLocaleString()}</b>.
        </div>
      )}
      {otherUomInvalidValue && (
        <div className="mt-3 bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-[11px] text-rose-700 font-semibold">
          Beneficiaries per Unit must be zero or greater.
        </div>
      )}

      <button onClick={handleSaveClick} disabled={saveDisabled} className="mt-4 w-full bg-ercs-red text-white py-2 rounded text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"><Save className="w-3.5 h-3.5" /> Save</button>
    </ModalShell>
  );
};

// ============================================================
// PlanEntryWizardModal
// ============================================================
const PlanEntryWizardModal: React.FC<{
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
  const allowedScope: ScopeType | null = regionalRole ? 'Regional' : projectRole ? 'Project' : null;
  const assignedRegion = regionalRole ? regions.find(r => r.name === currentRole.slice('Regional Coordinator — '.length)) : undefined;
  const assignedProject = projectRole ? projects.find(p => p.name === currentRole.slice('Project Coordinator — '.length)) : undefined;
  const effectiveScope = allowedScope || form.scope_type;

  const naOptions = nationalActivities;

  const selectedNa = nationalActivities.find(na => na.id === form.national_activity_id);

  const siblingEntries = selectedNa ? planEntries.filter(pe => pe.national_activity_id === selectedNa.id && pe.id !== form.id) : [];
  const siblingTarget = sumTarget(siblingEntries);
  const siblingBudget = sumBudget(siblingEntries);
  const thisTarget = Number(form.annual_target) || 0;
  const thisBudget = Number(form.annual_budget) || 0;
  const projectedTarget = siblingTarget + thisTarget;
  const projectedBudget = siblingBudget + thisBudget;

  const targetLimit = selectedNa?.annual_target ?? 0;
  const budgetLimit = selectedNa?.annual_budget ?? 0;
  const remainingTarget = Math.max(0, targetLimit - siblingTarget);
  const remainingBudget = Math.max(0, budgetLimit - siblingBudget);
  const targetExceeded = projectedTarget > targetLimit;
  const budgetExceeded = projectedBudget > budgetLimit;

  const numbersValid = thisTarget >= 0 && thisBudget >= 0 && !targetExceeded && !budgetExceeded;

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

  const generatedActivityCode = buildActivityCode(selectedNa, effectiveScope, form.region_id, form.project_id, regions, projects);

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
      activity_code: buildActivityCode(selectedNa, effectiveScope, form.region_id, form.project_id, regions, projects),
      activity_name: form.activity_name.trim(),
      activity_description: form.activity_description.trim(),
      approval_status: 'Approved',
    };
    if (isEditing) updatePlanEntry(pe); else addPlanEntry(pe);
    onSaved();
  };

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

          {naOptions.length === 0 && (
            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 font-semibold">
              No National Activities exist yet in this scope. Close this wizard and create one first via "+ Add National Activity".
            </div>
          )}

          {selectedNa && (
            <div className="bg-slate-50 border rounded-lg p-3 space-y-2">
              <div className="text-[10px] uppercase font-extrabold text-slate-400">Link Preview</div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="bg-red-50 text-ercs-red border border-red-100 rounded px-2 py-1">{selectedNa.code}</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="bg-blue-50 text-blue-700 rounded px-2 py-1">{isEditing ? 'This Plan Entry' : 'New Plan Entry'}</span>
              </div>
              <div className="text-[10px] text-slate-500">
                Official Target: <b>{selectedNa.annual_target.toLocaleString()} {selectedNa.uom}</b> · Official Budget: <b>ETB {selectedNa.annual_budget.toLocaleString()}</b> · Linked entries: <b>{planEntries.filter(pe => pe.national_activity_id === selectedNa.id).length}</b>
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
            {(assignedRegion || assignedProject) && <div className="mb-2 text-[10px] font-semibold text-slate-600 bg-blue-50 border border-blue-100 rounded p-2">Assigned user scope: <b>{assignedRegion?.name || assignedProject?.name}</b>. This plan entry will be saved under that exact {assignedRegion ? 'regional' : 'project'} scope.</div>}
            <div className="flex gap-2">
              {(['Regional', 'Project'] as ScopeType[]).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => allowedScope ? undefined : setForm(f => ({ ...f, scope_type: st, region_id: '', project_id: '', activity_name: '' }))}
                  disabled={!!allowedScope && allowedScope !== st}
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
              <select value={form.region_id} onChange={e => setForm(f => ({ ...f, region_id: e.target.value }))} disabled={!!assignedRegion} className="w-full text-xs border rounded p-2 bg-slate-50 disabled:opacity-60">
                <option value="">Select region…</option>
                {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}
          {effectiveScope === 'Project' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="block text-[10px] font-bold text-slate-500">Project</span>
                {!assignedProject && <button type="button" onClick={() => setAddingProject(a => !a)} className="text-[10px] font-bold text-ercs-red">+ Add Project</button>}
              </div>
              <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))} disabled={!!assignedProject} className="w-full text-xs border rounded p-2 bg-slate-50 disabled:opacity-60">
                <option value="">Select project…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {addingProject && (
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
              <div className="text-[10px] uppercase font-extrabold text-slate-400">Auto-generated Activity Code</div>
              <div className="text-sm font-black text-ercs-red mt-1">{generatedActivityCode || 'Select the execution scope first'}</div>
              <div className="text-[10px] text-slate-400 mt-1">Generated from the parent National Activity and the selected Region/Project.</div>
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
                const raw = v;
                if (raw === '') {
                  setForm(f => ({ ...f, annual_target: '' }));
                  return;
                }
                const value = Number(raw);
                setForm(f => ({ ...f, annual_target: String(Math.min(Number.isFinite(value) ? Math.max(0, value) : 0, remainingTarget)) }));
              }}
            />
            <LabeledInput
              label="Annual Budget (ETB)"
              type="number"
              value={form.annual_budget}
              onChange={v => {
                const raw = v;
                if (raw === '') {
                  setForm(f => ({ ...f, annual_budget: '' }));
                  return;
                }
                const value = Number(raw);
                setForm(f => ({ ...f, annual_budget: String(Math.min(Number.isFinite(value) ? Math.max(0, value) : 0, remainingBudget)) }));
              }}
            />
          </div>

          {isDuplicateLink && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-[11px] text-rose-700 font-semibold">
              This {effectiveScope === 'Regional' ? 'Region' : 'Project'} is already linked to {selectedNa.code}. Pick a different {effectiveScope === 'Regional' ? 'Region' : 'Project'}, or close this wizard and edit the existing entry instead — two entries for the same {effectiveScope === 'Regional' ? 'Region' : 'Project'} would double-count its contribution.
            </div>
          )}
          {!numbersValid && !targetExceeded && !budgetExceeded && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-[11px] text-rose-700 font-semibold">
              Annual Target and Annual Budget must be zero or greater.
            </div>
          )}

          {(targetExceeded || budgetExceeded) && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-[11px] text-rose-700 font-semibold space-y-1">
              {targetExceeded && <div>Annual Target cannot exceed the National Activity limit of <b>{targetLimit.toLocaleString()} {selectedNa.uom}</b>. Remaining allowance for this entry: <b>{remainingTarget.toLocaleString()} {selectedNa.uom}</b>.</div>}
              {budgetExceeded && <div>Annual Budget cannot exceed the National Activity limit of <b>ETB {budgetLimit.toLocaleString()}</b>. Remaining allowance for this entry: <b>ETB {remainingBudget.toLocaleString()}</b>.</div>}
              <div>Save and Submit for Approval are blocked until the total stays within the parent National Activity ceiling.</div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-[11px] text-blue-800 font-semibold space-y-1">
            <div><b>{selectedNa.code}</b> has a fixed annual Target/Budget ceiling. Linked Plan Entries consume this ceiling; they do not increase it.</div>
            <div>Projected National Activity Target: <b>{projectedTarget.toLocaleString()} {selectedNa.uom}</b> / limit <b>{selectedNa.annual_target.toLocaleString()} {selectedNa.uom}</b></div>
            <div>Projected National Activity Budget: <b>ETB {projectedBudget.toLocaleString()}</b> / limit <b>ETB {selectedNa.annual_budget.toLocaleString()}</b></div>
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

const UomFactorCard: React.FC<{ uom: string; factor: number }> = ({ uom, factor }) => {
  const { updateUomFactor } = useApp();
  const locked = LOCKED_UOMS.has(uom);
  const [draft, setDraft] = useState(String(factor));

  React.useEffect(() => { setDraft(String(factor)); }, [factor]);

  if (locked) {
    return (
      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
        <div><div className="text-xs font-bold text-slate-800">{uom}</div><div className="text-[10px] text-slate-500">Beneficiaries per unit</div></div>
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-slate-400">×</span>
          <span className="w-14 text-center text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded p-1.5">{factor}</span>
        </div>
      </div>
    );
  }

  const commit = (raw: string) => {
    const v = clampFactor(raw);
    setDraft(String(v));
    updateUomFactor(uom, v);
  };

  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
      <div><div className="text-xs font-bold text-slate-800">{uom}</div><div className="text-[10px] text-slate-500">Beneficiaries per unit</div></div>
      <div className="flex items-center gap-1">
        <span className="text-xs font-bold text-slate-400">×</span>
        <input
          type="number"
          min="0"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={e => commit(e.target.value)}
          className="w-14 text-center text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded p-1.5 focus:outline-none focus:ring-2 focus:ring-red-100"
        />
      </div>
    </div>
  );
};

const ModalShell: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-5">
      <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-black">{title}</h3><button onClick={onClose}><X className="w-4 h-4" /></button></div>
      {children}
    </div>
  </div>
);

const ConfirmDeleteModal: React.FC<{ label: string; onCancel: () => void; onConfirm: () => void }> = ({ label, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
    <div className="bg-white max-w-md w-full rounded-xl shadow-2xl p-5">
      <div className="flex items-center gap-2 text-red-700 font-black text-sm"><Trash2 className="w-5 h-5" /> Delete "{label}"?</div>
      <p className="text-xs text-slate-600 mt-3">This also removes any linked Quarterly Plan and Quarterly Actual records, and re-syncs the parent National Activity's totals, so nothing ever references deleted data.</p>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg border text-xs font-bold">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold">Delete</button>
      </div>
    </div>
  </div>
);