// src/context/AppContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  StrategicPriority, NationalActivity, Region, Zone, Project, PlanEntry, Quarter, QuarterId, QuarterlyPlan, QuarterlyActual, UomFactorConfig, FilterState, UserRole,
} from '../types';
import {
  INITIAL_STRATEGIC_PRIORITIES, INITIAL_NATIONAL_ACTIVITIES, INITIAL_REGIONS, INITIAL_ZONES, INITIAL_PROJECTS, INITIAL_PLAN_ENTRIES,
  FISCAL_QUARTERS, INITIAL_QUARTERLY_PLANS, INITIAL_QUARTERLY_ACTUALS, INITIAL_UOM_CONFIGS,
} from '../data/seedData';
import { sumTarget, sumBudget } from '../utils/calculations';
import { buildActivityCode } from '../utils/activityCode';

// What a Coordinator actually supplies when saving a quarter's numbers — the
// approval lifecycle fields are managed entirely by AppContext (see
// upsertQuarterlyPlan / submitQuarterlyPlan / approveQuarterlyPlan /
// rejectQuarterlyPlan below), never set directly by the caller.
type QuarterlyPlanInput = Omit<QuarterlyPlan, 'approval_status' | 'submitted_at' | 'reviewed_at' | 'rejection_reason'>;
type QuarterlyActualInput = Omit<QuarterlyActual, 'approval_status' | 'submitted_at' | 'reviewed_at' | 'rejection_reason'>;

interface AppContextType {
  activeRoute: string; setActiveRoute: (r: string) => void;
  currentRole: UserRole; setCurrentRole: (role: UserRole) => void;
  toastMessage: string | null; showToast: (msg: string) => void;

  // Which National Activity is being viewed on the drill-down detail page.
  selectedNationalActivityId: string | null; setSelectedNationalActivityId: (id: string | null) => void;

  // One-shot signal: "the user wants to add a Plan Entry linked to this
  // National Activity right now." Set by NationalActivityDetailPage's
  // "+ Add Plan Entry" button before it navigates to the Plan page; consumed
  // and cleared by PlanPage on mount, which opens the Add Plan wizard
  // directly at Step 2 with the parent already locked in.
  pendingAddPlanNationalActivityId: string | null;
  setPendingAddPlanNationalActivityId: (id: string | null) => void;

  strategicPriorities: StrategicPriority[];

  nationalActivities: NationalActivity[];
  addNationalActivity: (na: NationalActivity) => void;
  updateNationalActivity: (na: NationalActivity) => void;
  deleteNationalActivity: (id: string) => void;

  regions: Region[];
  addRegion: (r: Region) => void;

  zones: Zone[];
  addZone: (z: Zone) => void;

  projects: Project[];
  addProject: (p: Project) => void;
  quarters: Quarter[];

  planEntries: PlanEntry[];
  addPlanEntry: (pe: PlanEntry) => void;
  updatePlanEntry: (pe: PlanEntry) => void;
  deletePlanEntry: (id: string) => void;
  submitPlanEntry: (id: string) => void;
  approvePlanEntry: (id: string) => void;
  rejectPlanEntry: (id: string, reason?: string) => void;

  // Step 2 of the pipeline: Q1–Q4 breakdown of a Plan Entry's annual figure.
  // Each quarter goes through its own Draft -> Pending Approval ->
  // Approved/Rejected cycle, same shape as Plan Entry's own workflow.
  quarterlyPlans: QuarterlyPlan[];
  upsertQuarterlyPlan: (qp: QuarterlyPlanInput) => void;
  submitQuarterlyPlan: (id: string) => void;
  // Batch submission: submits every Draft/Rejected quarter for a Plan Entry
  // together, after validating all four quarters exist, each has a Budget
  // greater than 0, and the total doesn't exceed the Plan Entry's annual
  // budget. See the implementation below for the full rationale.
  submitQuarterlyPlanRow: (planEntryId: string) => void;
  approveQuarterlyPlan: (id: string) => void;
  rejectQuarterlyPlan: (id: string, reason?: string) => void;

  quarterlyActuals: QuarterlyActual[];
  upsertQuarterlyActual: (qa: QuarterlyActualInput) => void;
  submitQuarterlyActual: (id: string) => void;
  approveQuarterlyActual: (id: string) => void;
  rejectQuarterlyActual: (id: string, reason?: string) => void;

  uomConfigs: UomFactorConfig[];
  updateUomFactor: (uom: string, factor: number) => void;

  filters: FilterState; setFilters: React.Dispatch<React.SetStateAction<FilterState>>; resetFilters: () => void;
  reportApprovalStatus: 'ALL' | 'Approved' | 'Draft'; setReportApprovalStatus: (status: 'ALL' | 'Approved' | 'Draft') => void;
  getFilteredPlanEntries: () => PlanEntry[];
}

const DEFAULT_FILTERS: FilterState = { strategicPriorityId: 'ALL', nationalActivityId: 'ALL', regionId: 'ALL', projectId: 'ALL', quarterId: 'ALL' };

type RoleScope =
  | { kind: 'National' }
  | { kind: 'Regional'; regionId: string }
  | { kind: 'Project'; projectId: string };

const parseRoleScope = (role: UserRole, regions: Region[], projects: Project[]): RoleScope => {
  if (role === 'National Activity AOP') return { kind: 'National' };
  const regionalPrefix = 'Regional Coordinator — ';
  if (role.startsWith(regionalPrefix)) {
    const name = role.slice(regionalPrefix.length);
    const region = regions.find(r => r.name === name);
    return region ? { kind: 'Regional', regionId: region.id } : { kind: 'National' };
  }
  const projectPrefix = 'Project Coordinator — ';
  if (role.startsWith(projectPrefix)) {
    const name = role.slice(projectPrefix.length);
    const project = projects.find(p => p.name === name);
    return project ? { kind: 'Project', projectId: project.id } : { kind: 'National' };
  }
  return { kind: 'National' };
};

const roleOwnsPlanEntry = (role: UserRole, pe: PlanEntry, regions: Region[], projects: Project[]): boolean => {
  const scope = parseRoleScope(role, regions, projects);
  if (scope.kind === 'National') return true;
  if (scope.kind === 'Regional') return pe.scope_type === 'Regional' && pe.region_id === scope.regionId;
  return pe.scope_type === 'Project' && pe.project_id === scope.projectId;
};

const normalizePersistedRole = (raw: UserRole, regions: Region[], projects: Project[]): UserRole => {
  if (raw === 'National Activity AOP') return raw;
  if (raw === 'Regional Coordinator') return regions[0] ? `Regional Coordinator — ${regions[0].name}` : 'National Activity AOP';
  if (raw === 'Project Coordinator') return projects[0] ? `Project Coordinator — ${projects[0].name}` : 'National Activity AOP';
  if (parseRoleScope(raw, regions, projects).kind !== 'National') return raw;
  return 'National Activity AOP';
};

const PERSISTENCE_KEY = 'ercs-aop-final-role-filtered-v2';

// Fills in activity_code/activity_name/etc. on legacy persisted Plan Entries
// that predate those fields. Uses the shared buildActivityCode helper (also
// used live by PlanPage's Add Plan wizard) so a migrated code can never
// drift from what the wizard itself would have generated for the same
// National Activity + Region/Project combination.
const migratePlanEntries = (raw: PlanEntry[]): PlanEntry[] => raw.map(pe => {
  const na = INITIAL_NATIONAL_ACTIVITIES.find(n => n.id === pe.national_activity_id);
  const label = pe.scope_type === 'Regional' ? INITIAL_REGIONS.find(r => r.id === pe.region_id)?.name : INITIAL_PROJECTS.find(p => p.id === pe.project_id)?.name;
  return {
    ...pe,
    activity_code: pe.activity_code || buildActivityCode(na, pe.scope_type, pe.region_id, pe.project_id, INITIAL_REGIONS, INITIAL_PROJECTS),
    activity_name: pe.activity_name || label || 'Execution Entry',
    activity_description: pe.activity_description || `Execution plan entry under ${na?.code || 'National Activity'}.`,
    approval_status: pe.approval_status || 'Approved',
  };
});

// Backfills approval_status on Quarterly Plan/Actual rows persisted before
// this workflow existed. Legacy data predates any approval concept — it was
// already treated as "live" everywhere it was used, so it's migrated in as
// Approved rather than suddenly disappearing from the Approved report.
const migrateQuarterlyPlans = (raw: QuarterlyPlan[]): QuarterlyPlan[] =>
  raw.map(qp => ({ ...qp, approval_status: qp.approval_status || 'Approved' }));

const migrateQuarterlyActuals = (raw: QuarterlyActual[]): QuarterlyActual[] =>
  raw.map(qa => ({ ...qa, approval_status: qa.approval_status || 'Approved' }));

const readPersisted = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(PERSISTENCE_KEY);
    if (!raw) return fallback;
    const data = JSON.parse(raw) as Record<string, unknown>;
    return Object.prototype.hasOwnProperty.call(data, key) ? (data[key] as T) : fallback;
  } catch {
    return fallback;
  }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeRoute, setActiveRoute] = useState<string>(() => readPersisted('activeRoute', 'plan'));
  const [currentRole, setCurrentRole] = useState<UserRole>(() => normalizePersistedRole(readPersisted('currentRole', 'National Activity AOP' as UserRole), INITIAL_REGIONS, INITIAL_PROJECTS));
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedNationalActivityId, setSelectedNationalActivityId] = useState<string | null>(() => readPersisted('selectedNationalActivityId', null));
  // Deliberately NOT persisted — this is a transient one-shot UI signal, not
  // durable app data. A stale value surviving a page reload would incorrectly
  // pop the wizard open on next visit to the Plan page.
  const [pendingAddPlanNationalActivityId, setPendingAddPlanNationalActivityId] = useState<string | null>(null);

  const [strategicPriorities] = useState<StrategicPriority[]>(INITIAL_STRATEGIC_PRIORITIES);
  const [nationalActivities, setNationalActivities] = useState<NationalActivity[]>(() => readPersisted('nationalActivities', INITIAL_NATIONAL_ACTIVITIES));
  const [regions, setRegions] = useState<Region[]>(() => readPersisted('regions', INITIAL_REGIONS));
  const [zones, setZones] = useState<Zone[]>(() => readPersisted('zones', INITIAL_ZONES));
  const [projects, setProjects] = useState<Project[]>(() => readPersisted('projects', INITIAL_PROJECTS));
  const [quarters] = useState<Quarter[]>(FISCAL_QUARTERS);
  const [planEntries, setPlanEntries] = useState<PlanEntry[]>(() => migratePlanEntries(readPersisted('planEntries', INITIAL_PLAN_ENTRIES)));
  const [quarterlyPlans, setQuarterlyPlans] = useState<QuarterlyPlan[]>(() => migrateQuarterlyPlans(readPersisted('quarterlyPlans', INITIAL_QUARTERLY_PLANS)));
  const [quarterlyActuals, setQuarterlyActuals] = useState<QuarterlyActual[]>(() => migrateQuarterlyActuals(readPersisted('quarterlyActuals', INITIAL_QUARTERLY_ACTUALS)));
  const [uomConfigs, setUomConfigs] = useState<UomFactorConfig[]>(() => readPersisted('uomConfigs', INITIAL_UOM_CONFIGS));
  const [filters, setFilters] = useState<FilterState>(() => ({ ...DEFAULT_FILTERS, ...readPersisted('filters', DEFAULT_FILTERS) }));
  const [reportApprovalStatus, setReportApprovalStatus] = useState<'ALL' | 'Approved' | 'Draft'>(() => readPersisted('reportApprovalStatus', 'Approved'));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(PERSISTENCE_KEY, JSON.stringify({
        activeRoute, currentRole, selectedNationalActivityId, nationalActivities, regions, zones, projects, planEntries, quarterlyPlans, quarterlyActuals, uomConfigs, filters, reportApprovalStatus,
      }));
    } catch {
      // localStorage may be unavailable; in-memory state still works for the session.
    }
  }, [activeRoute, currentRole, selectedNationalActivityId, nationalActivities, regions, zones, projects, planEntries, quarterlyPlans, quarterlyActuals, uomConfigs, filters, reportApprovalStatus]);

  const showToast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 3000); };
  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const getFilteredPlanEntries = () => planEntries.filter(pe => {
    if (!roleOwnsPlanEntry(currentRole, pe, regions, projects)) return false;
    if (filters.strategicPriorityId !== 'ALL') {
      const na = nationalActivities.find(n => n.id === pe.national_activity_id);
      if (!na || na.strategic_priority_id !== filters.strategicPriorityId) return false;
    }
    if (filters.nationalActivityId !== 'ALL' && pe.national_activity_id !== filters.nationalActivityId) return false;
    if (filters.regionId !== 'ALL' && pe.region_id !== filters.regionId) return false;
    if (filters.projectId !== 'ALL' && pe.project_id !== filters.projectId) return false;
    return true;
  });

  const addNationalActivity = (na: NationalActivity) => {
    if (currentRole !== 'National Activity AOP') { showToast('Only the National Activity AOP can create National Activities.'); return; }
    setNationalActivities(prev => [...prev, na]);
    showToast(`National Activity ${na.code} created.`);
  };
  const updateNationalActivity = (na: NationalActivity) => {
    if (currentRole !== 'National Activity AOP') { showToast('Only the National Activity AOP can edit National Activities.'); return; }
    setNationalActivities(prev => prev.map(x => x.id === na.id ? na : x));
    showToast(`National Activity ${na.code} updated.`);
  };

  // Cascades the delete to EVERY dependent record — Plan Entries, their
  // Quarterly Plans, and their Quarterly Actuals — and clears any UI state
  // that referenced this National Activity by id, so nothing is left
  // pointing at an id that no longer exists anywhere.
  const deleteNationalActivity = (id: string) => {
    if (currentRole !== 'National Activity AOP') { showToast('Only the National Activity AOP can delete National Activities.'); return; }
    const childIds = planEntries.filter(pe => pe.national_activity_id === id).map(pe => pe.id);
    setPlanEntries(prev => prev.filter(pe => pe.national_activity_id !== id));
    setQuarterlyPlans(prev => prev.filter(qp => !childIds.includes(qp.plan_entry_id)));
    setQuarterlyActuals(prev => prev.filter(a => !childIds.includes(a.plan_entry_id)));
    setNationalActivities(prev => prev.filter(x => x.id !== id));
    setSelectedNationalActivityId(prev => (prev === id ? null : prev));
    setFilters(prev => (prev.nationalActivityId === id ? { ...prev, nationalActivityId: 'ALL' } : prev));
    showToast('National Activity and its linked plan, quarterly plan and actual records deleted.');
  };

  const addRegion = (r: Region) => { setRegions(prev => [...prev, r]); showToast(`Region ${r.name} added.`); };
  const addZone = (z: Zone) => { setZones(prev => [...prev, z]); showToast(`Zone ${z.name} added.`); };
  const addProject = (p: Project) => { setProjects(prev => [...prev, p]); showToast(`Project ${p.name} added.`); };

  // ---------------------------------------------------------------------
  // National Activity ceilings are fixed parent limits. Plan Entries roll
  // up into Reports/Details, but they MUST NOT increase the parent's
  // annual_target / annual_budget ceiling.
  // ---------------------------------------------------------------------
  const getNationalActivityUsage = (nationalActivityId: string, entries: PlanEntry[]) => {
    const children = entries.filter(pe => pe.national_activity_id === nationalActivityId);
    return {
      target: sumTarget(children),
      budget: sumBudget(children),
    };
  };

  const getNationalActivityValidation = (nationalActivityId: string, entries: PlanEntry[]) => {
    const na = nationalActivities.find(n => n.id === nationalActivityId);
    if (!na) {
      return { ok: false, reason: 'The selected National Activity no longer exists.' };
    }

    const usage = getNationalActivityUsage(nationalActivityId, entries);
    const targetExceeded = usage.target > na.annual_target;
    const budgetExceeded = usage.budget > na.annual_budget;

    if (targetExceeded || budgetExceeded) {
      const reasons: string[] = [];
      if (targetExceeded) {
        reasons.push(
          `annual target ${usage.target.toLocaleString()} exceeds the National Activity target limit of ${na.annual_target.toLocaleString()} ${na.uom}`
        );
      }
      if (budgetExceeded) {
        reasons.push(
          `annual budget ETB ${usage.budget.toLocaleString()} exceeds the National Activity budget limit of ETB ${na.annual_budget.toLocaleString()}`
        );
      }
      return { ok: false, reason: reasons.join(' and ') + '.' };
    }

    return { ok: true, reason: '' };
  };

  const addPlanEntry = (pe: PlanEntry) => {
    if (parseRoleScope(currentRole, regions, projects).kind === 'National') { showToast('National Activity AOP creates National Activities; Coordinators create execution entries.'); return; }
    if (!roleOwnsPlanEntry(currentRole, pe, regions, projects)) { showToast('This coordinator can only manage entries for their assigned project or region.'); return; }

    const next = [...planEntries, pe];
    const validation = getNationalActivityValidation(pe.national_activity_id, next);
    if (!validation.ok) {
      showToast(`Plan entry not saved: ${validation.reason}`);
      return;
    }

    setPlanEntries(next);
    const na = nationalActivities.find(n => n.id === pe.national_activity_id);
    showToast(na
      ? `Plan entry added and linked to ${na.code}. National Activity Target/Budget ceilings remain unchanged.`
      : 'Plan entry added.');
  };

  const updatePlanEntry = (pe: PlanEntry) => {
    if (parseRoleScope(currentRole, regions, projects).kind === 'National') { showToast('National Activity AOP does not edit execution entries.'); return; }
    if (!roleOwnsPlanEntry(currentRole, pe, regions, projects)) { showToast('This coordinator can only edit entries for their assigned project or region.'); return; }
    const old = planEntries.find(x => x.id === pe.id);
    if (old?.approval_status === 'Approved') { showToast('This plan entry is already approved and locked. It can no longer be edited.'); return; }
    const next = planEntries.map(x => (x.id === pe.id ? pe : x));

    const newParentValidation = getNationalActivityValidation(pe.national_activity_id, next);
    if (!newParentValidation.ok) {
      showToast(`Plan entry not updated: ${newParentValidation.reason}`);
      return;
    }

    if (old && old.national_activity_id !== pe.national_activity_id) {
      const oldParentValidation = getNationalActivityValidation(old.national_activity_id, next);
      if (!oldParentValidation.ok) {
        showToast(`Plan entry not updated: ${oldParentValidation.reason}`);
        return;
      }
    }

    setPlanEntries(next);
    const na = nationalActivities.find(n => n.id === pe.national_activity_id);
    showToast(`Plan entry updated. National Activity ${na?.code || ''} Target/Budget ceilings remain unchanged.`);
  };

  // Deleting a Plan Entry cascades to its Quarterly Plan AND its Quarterly
  // Actuals — both are meaningless without the Plan Entry they measure.
  const deletePlanEntry = (id: string) => {
    if (parseRoleScope(currentRole, regions, projects).kind === 'National') { showToast('National Activity AOP does not delete execution entries.'); return; }
    const old = planEntries.find(x => x.id === id);
    if (!old) return;
    if (!roleOwnsPlanEntry(currentRole, old, regions, projects)) { showToast('This coordinator can only delete entries for their assigned project or region.'); return; }
    if (old.approval_status === 'Approved') { showToast('This plan entry is already approved and locked. It can no longer be deleted.'); return; }
    const next = planEntries.filter(x => x.id !== id);
    setPlanEntries(next);
    setQuarterlyPlans(prev => prev.filter(qp => qp.plan_entry_id !== id));
    setQuarterlyActuals(prev => prev.filter(a => a.plan_entry_id !== id));
    showToast('Plan entry, its quarterly plan and its quarterly actuals deleted. National Activity Target/Budget ceilings remain unchanged.');
  };

  const submitPlanEntry = (id: string) => {
    if (currentRole === 'National Activity AOP') { showToast('National Activity AOP approves or rejects proposals; Coordinators submit them.'); return; }
    const entry = planEntries.find(pe => pe.id === id);
    if (!entry) { showToast('Plan entry not found.'); return; }
    if (!roleOwnsPlanEntry(currentRole, entry, regions, projects)) {
      showToast('This coordinator can only submit entries for their assigned project or region.');
      return;
    }

    const validation = getNationalActivityValidation(entry.national_activity_id, planEntries);
    if (!validation.ok) {
      showToast(`Cannot submit for approval: ${validation.reason}`);
      return;
    }

    setPlanEntries(prev => prev.map(pe => pe.id === id
      ? { ...pe, approval_status: 'Pending Approval', submitted_at: new Date().toISOString(), rejection_reason: undefined }
      : pe
    ));
    showToast('Plan entry submitted to the National Activity AOP for approval.');
  };

  const approvePlanEntry = (id: string) => {
    if (currentRole !== 'National Activity AOP') { showToast('Only the National Activity AOP can approve entries.'); return; }
    const entry = planEntries.find(pe => pe.id === id);
    if (!entry) { showToast('Plan entry not found.'); return; }

    const validation = getNationalActivityValidation(entry.national_activity_id, planEntries);
    if (!validation.ok) {
      showToast(`Cannot approve: ${validation.reason}`);
      return;
    }

    setPlanEntries(prev => prev.map(pe => pe.id === id
      ? { ...pe, approval_status: 'Approved', reviewed_at: new Date().toISOString(), rejection_reason: undefined }
      : pe
    ));
    showToast('Plan entry approved. It is now included in the live approved report.');
  };

  const rejectPlanEntry = (id: string, reason = 'Rejected by National Activity AOP.') => {
    if (currentRole !== 'National Activity AOP') { showToast('Only the National Activity AOP can reject entries.'); return; }
    setPlanEntries(prev => prev.map(pe => pe.id === id
      ? { ...pe, approval_status: 'Rejected', reviewed_at: new Date().toISOString(), rejection_reason: reason }
      : pe
    ));
    showToast('Plan entry rejected. It remains in Draft reports for review.');
  };

  // ---------------------------------------------------------------------
  // QUARTERLY PLAN — each quarter of a Plan Entry has its own approval
  // lifecycle, independent of the Plan Entry's own approval_status and of
  // every other quarter. upsert is what the Quarterly Plan page's number
  // inputs call on every keystroke: it creates/updates the quarter's
  // target/budget and (re)sets it to Draft — including snapping a
  // previously Pending or Rejected quarter back to Draft, so the AOP can
  // never approve a value that has since changed without seeing it first.
  // Once a quarter is Approved, upsert refuses to touch it at all — this is
  // the actual enforcement point; the UI additionally disables the inputs
  // so a Coordinator never gets this toast in normal use.
  // ---------------------------------------------------------------------
  const upsertQuarterlyPlan = (qp: QuarterlyPlanInput) => {
    if (parseRoleScope(currentRole, regions, projects).kind === 'National') { showToast('Quarterly Plan entries are created by assigned Regional and Project Coordinators.'); return; }
    const parentEntry = planEntries.find(x => x.id === qp.plan_entry_id);
    if (!parentEntry || !roleOwnsPlanEntry(currentRole, parentEntry, regions, projects)) { showToast('You can only enter Quarterly Plan values for your assigned project or region.'); return; }
    const existing = quarterlyPlans.find(x => x.plan_entry_id === qp.plan_entry_id && x.quarter_id === qp.quarter_id);
    if (existing?.approval_status === 'Approved') {
      showToast(`${qp.quarter_id} Quarterly Plan is already approved and locked. It can no longer be edited.`);
      return;
    }
    setQuarterlyPlans(prev => {
      const idx = prev.findIndex(x => x.plan_entry_id === qp.plan_entry_id && x.quarter_id === qp.quarter_id);
      const merged: QuarterlyPlan = { ...qp, approval_status: 'Draft', submitted_at: undefined, reviewed_at: undefined, rejection_reason: undefined };
      if (idx >= 0) { const copy = [...prev]; copy[idx] = merged; return copy; }
      return [...prev, merged];
    });
  };

  const submitQuarterlyPlan = (id: string) => {
    if (parseRoleScope(currentRole, regions, projects).kind === 'National') { showToast('National Activity AOP approves or rejects Quarterly Plan submissions; Coordinators submit them.'); return; }
    const qp = quarterlyPlans.find(x => x.id === id);
    if (!qp) { showToast('Quarterly Plan entry not found.'); return; }
    if (qp.approval_status === 'Approved') { showToast(`${qp.quarter_id} Quarterly Plan is already approved.`); return; }
    setQuarterlyPlans(prev => prev.map(x => x.id === id
      ? { ...x, approval_status: 'Pending Approval', submitted_at: new Date().toISOString(), rejection_reason: undefined }
      : x
    ));
    showToast(`${qp.quarter_id} Quarterly Plan submitted to the National Activity AOP for approval.`);
  };

  // ---------------------------------------------------------------------
  // Batch submission for Quarterly Plan: quarters are entered and reviewed
  // as a set, not one at a time. All FOUR quarters (Q1–Q4) must already
  // exist for this Plan Entry, and every one of them must carry a Budget
  // greater than zero — a budget of 0 is treated as "not entered" — before
  // any of them can move to Pending Approval. Quarters that are already
  // Approved are left untouched; only the ones still Draft or Rejected are
  // advanced, so this same action also doubles as "resubmit after a
  // rejection" once the coordinator fixes the flagged quarter(s).
  // Also defensively re-checks that the four budgets don't exceed the Plan
  // Entry's own annual_budget ceiling — the Quarterly Plan page's live
  // input clamp already prevents this from happening through normal
  // typing, this is just the last line of defense before anything moves
  // to Pending Approval.
  // ---------------------------------------------------------------------
  const submitQuarterlyPlanRow = (planEntryId: string) => {
    if (parseRoleScope(currentRole, regions, projects).kind === 'National') { showToast('National Activity AOP approves or rejects Quarterly Plan submissions; Coordinators submit them.'); return; }
    const entry = planEntries.find(pe => pe.id === planEntryId);
    if (entry && !roleOwnsPlanEntry(currentRole, entry, regions, projects)) { showToast('You can only submit Quarterly Plan values for your assigned project or region.'); return; }
    if (!entry) { showToast('Plan entry not found.'); return; }

    const rows = quarters.map(q => quarterlyPlans.find(qp => qp.plan_entry_id === planEntryId && qp.quarter_id === q.id));
    if (rows.some(qp => !qp)) {
      showToast('Enter a Target and Budget for all four quarters (Q1–Q4) before submitting for approval.');
      return;
    }
    const definiteRows = rows as QuarterlyPlan[];

    if (definiteRows.some(qp => qp.budget <= 0)) {
      showToast('Every quarter needs a Budget greater than 0 before this plan entry can be submitted for approval.');
      return;
    }

    const totalBudget = definiteRows.reduce((sum, qp) => sum + qp.budget, 0);
    if (totalBudget > entry.annual_budget) {
      showToast(`Quarterly budgets total ETB ${totalBudget.toLocaleString()}, which exceeds this plan entry's annual budget of ETB ${entry.annual_budget.toLocaleString()}.`);
      return;
    }

    const toSubmit = definiteRows.filter(qp => qp.approval_status === 'Draft' || qp.approval_status === 'Rejected');
    if (toSubmit.length === 0) {
      showToast('All four quarters are already submitted or approved.');
      return;
    }

    setQuarterlyPlans(prev => prev.map(qp => {
      if (qp.plan_entry_id !== planEntryId) return qp;
      if (qp.approval_status !== 'Draft' && qp.approval_status !== 'Rejected') return qp;
      return { ...qp, approval_status: 'Pending Approval', submitted_at: new Date().toISOString(), rejection_reason: undefined };
    }));
    showToast('All four quarters submitted to the National Activity AOP for approval.');
  };

  const approveQuarterlyPlan = (id: string) => {
    if (currentRole !== 'National Activity AOP') { showToast('Only the National Activity AOP can approve Quarterly Plan submissions.'); return; }
    const qp = quarterlyPlans.find(x => x.id === id);
    if (!qp) { showToast('Quarterly Plan entry not found.'); return; }
    setQuarterlyPlans(prev => prev.map(x => x.id === id
      ? { ...x, approval_status: 'Approved', reviewed_at: new Date().toISOString(), rejection_reason: undefined }
      : x
    ));
    showToast(`${qp.quarter_id} Quarterly Plan approved and locked. It is now included in the live approved report.`);
  };

  const rejectQuarterlyPlan = (id: string, reason = 'Rejected by National Activity AOP.') => {
    if (currentRole !== 'National Activity AOP') { showToast('Only the National Activity AOP can reject Quarterly Plan submissions.'); return; }
    const qp = quarterlyPlans.find(x => x.id === id);
    setQuarterlyPlans(prev => prev.map(x => x.id === id
      ? { ...x, approval_status: 'Rejected', reviewed_at: new Date().toISOString(), rejection_reason: reason }
      : x
    ));
    showToast(`${qp?.quarter_id || ''} Quarterly Plan rejected. It remains editable for revision and resubmission.`.trim());
  };

  // ---------------------------------------------------------------------
  // QUARTERLY ACTUAL — same per-quarter approval lifecycle as Quarterly
  // Plan above, tracked completely independently (a quarter's Actual can be
  // Approved while its Plan is still Pending, or vice versa).
  // ---------------------------------------------------------------------
  const upsertQuarterlyActual = (qa: QuarterlyActualInput) => {
    if (parseRoleScope(currentRole, regions, projects).kind === 'National') { showToast('Quarterly Actual entries are created by assigned Regional and Project Coordinators.'); return; }
    const parentEntry = planEntries.find(x => x.id === qa.plan_entry_id);
    if (!parentEntry || !roleOwnsPlanEntry(currentRole, parentEntry, regions, projects)) { showToast('You can only enter Quarterly Actual values for your assigned project or region.'); return; }
    const existing = quarterlyActuals.find(a => a.plan_entry_id === qa.plan_entry_id && a.quarter_id === qa.quarter_id);
    if (existing?.approval_status === 'Approved') {
      showToast(`${qa.quarter_id} Quarterly Actual is already approved and locked. It can no longer be edited.`);
      return;
    }
    setQuarterlyActuals(prev => {
      const idx = prev.findIndex(a => a.plan_entry_id === qa.plan_entry_id && a.quarter_id === qa.quarter_id);
      const merged: QuarterlyActual = { ...qa, approval_status: 'Draft', submitted_at: undefined, reviewed_at: undefined, rejection_reason: undefined };
      if (idx >= 0) { const copy = [...prev]; copy[idx] = merged; return copy; }
      return [...prev, merged];
    });
  };

  const submitQuarterlyActual = (id: string) => {
    if (parseRoleScope(currentRole, regions, projects).kind === 'National') { showToast('National Activity AOP approves or rejects Quarterly Actual submissions; Coordinators submit them.'); return; }
    const qa = quarterlyActuals.find(x => x.id === id);
    if (!qa) { showToast('Quarterly Actual entry not found.'); return; }
    if (qa.approval_status === 'Approved') { showToast(`${qa.quarter_id} Quarterly Actual is already approved.`); return; }
    setQuarterlyActuals(prev => prev.map(x => x.id === id
      ? { ...x, approval_status: 'Pending Approval', submitted_at: new Date().toISOString(), rejection_reason: undefined }
      : x
    ));
    showToast(`${qa.quarter_id} Quarterly Actual submitted to the National Activity AOP for approval.`);
  };

  const approveQuarterlyActual = (id: string) => {
    if (currentRole !== 'National Activity AOP') { showToast('Only the National Activity AOP can approve Quarterly Actual submissions.'); return; }
    const qa = quarterlyActuals.find(x => x.id === id);
    if (!qa) { showToast('Quarterly Actual entry not found.'); return; }
    setQuarterlyActuals(prev => prev.map(x => x.id === id
      ? { ...x, approval_status: 'Approved', reviewed_at: new Date().toISOString(), rejection_reason: undefined }
      : x
    ));
    showToast(`${qa.quarter_id} Quarterly Actual approved and locked. It is now included in the live approved report.`);
  };

  const rejectQuarterlyActual = (id: string, reason = 'Rejected by National Activity AOP.') => {
    if (currentRole !== 'National Activity AOP') { showToast('Only the National Activity AOP can reject Quarterly Actual submissions.'); return; }
    const qa = quarterlyActuals.find(x => x.id === id);
    setQuarterlyActuals(prev => prev.map(x => x.id === id
      ? { ...x, approval_status: 'Rejected', reviewed_at: new Date().toISOString(), rejection_reason: reason }
      : x
    ));
    showToast(`${qa?.quarter_id || ''} Quarterly Actual rejected. It remains editable for revision and resubmission.`.trim());
  };

  const updateUomFactor = (uom: string, factor: number) => {
    setUomConfigs(prev => {
      const exists = prev.find(c => c.uom.toLowerCase() === uom.toLowerCase());
      if (exists) return prev.map(c => c.uom.toLowerCase() === uom.toLowerCase() ? { ...c, factor } : c);
      return [...prev, { uom, factor }];
    });
    showToast(`Conversion factor for ${uom} set to x${factor}. All beneficiary totals recompute live.`);
  };

  return (
    <AppContext.Provider value={{
      activeRoute, setActiveRoute, currentRole, setCurrentRole, toastMessage, showToast,
      selectedNationalActivityId, setSelectedNationalActivityId,
      pendingAddPlanNationalActivityId, setPendingAddPlanNationalActivityId,
      strategicPriorities,
      nationalActivities, addNationalActivity, updateNationalActivity, deleteNationalActivity,
      regions, addRegion,
      zones, addZone,
      projects, addProject, quarters,
      planEntries, addPlanEntry, updatePlanEntry, deletePlanEntry, submitPlanEntry, approvePlanEntry, rejectPlanEntry,
      quarterlyPlans, upsertQuarterlyPlan, submitQuarterlyPlan, submitQuarterlyPlanRow, approveQuarterlyPlan, rejectQuarterlyPlan,
      quarterlyActuals, upsertQuarterlyActual, submitQuarterlyActual, approveQuarterlyActual, rejectQuarterlyActual,
      uomConfigs, updateUomFactor,
      filters, setFilters, resetFilters, reportApprovalStatus, setReportApprovalStatus, getFilteredPlanEntries,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};
