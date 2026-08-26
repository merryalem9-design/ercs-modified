// src/context/AppContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  StrategicPriority, NationalActivity, Region, Zone, Project, PlanEntry, Quarter, QuarterId, QuarterlyPlan, QuarterlyActual, UomFactorConfig, FilterState, UserRole, ScopeType,
} from '../types';
import {
  INITIAL_STRATEGIC_PRIORITIES, INITIAL_NATIONAL_ACTIVITIES, INITIAL_REGIONS, INITIAL_ZONES, INITIAL_PROJECTS, INITIAL_PLAN_ENTRIES,
  FISCAL_QUARTERS, INITIAL_QUARTERLY_PLANS, INITIAL_QUARTERLY_ACTUALS, INITIAL_UOM_CONFIGS,
} from '../data/seedData';

// No approval workflow; all entries are automatically Approved.
type QuarterlyPlanInput = Omit<QuarterlyPlan, 'approval_status' | 'submitted_at' | 'reviewed_at' | 'rejection_reason'>;
type QuarterlyActualInput = Omit<QuarterlyActual, 'approval_status' | 'submitted_at' | 'reviewed_at' | 'rejection_reason'>;

interface AppContextType {
  activeRoute: string; setActiveRoute: (r: string) => void;
  currentRole: UserRole; setCurrentRole: (role: UserRole) => void;
  toastMessage: string | null; showToast: (msg: string) => void;

  selectedNationalActivityId: string | null; setSelectedNationalActivityId: (id: string | null) => void;

  strategicPriorities: StrategicPriority[];

  // National Activities. Target/Budget is always computed live from each
  // one's linked Plan Entries wherever it's displayed (see sumTarget/
  // sumBudget in utils/calculations) — never stored here. The National
  // Activity AOP can create new ones (with the Regions/Projects allowed to
  // execute them) and delete ones that have zero linked Plan Entries.
  nationalActivities: NationalActivity[];
  addNationalActivity: (na: NationalActivity) => void;
  deleteNationalActivity: (id: string) => void;
  // Used by the Plan Entry wizard's "+ Add Project" flow: a brand-new
  // Project/Region created on the fly is automatically linked as an
  // eligible executor of the National Activity it was created under.
  addEligibleScope: (nationalActivityId: string, scopeType: ScopeType, scopeId: string) => void;
  // Returns only the National Activities the current role is allowed to
  // see/act on: every activity for the AOP, or only the ones the assigned
  // Region/Project is an eligible executor of for a Coordinator.
  getNationalActivitiesForRole: () => NationalActivity[];

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

  quarterlyPlans: QuarterlyPlan[];
  upsertQuarterlyPlan: (qp: QuarterlyPlanInput) => void;

  quarterlyActuals: QuarterlyActual[];
  upsertQuarterlyActual: (qa: QuarterlyActualInput) => void;

  // Fixed conversion table sourced from the Excel data — no editing UI;
  // read-only everywhere it's consumed (see convertToBeneficiaries).
  uomConfigs: UomFactorConfig[];

  filters: FilterState; setFilters: React.Dispatch<React.SetStateAction<FilterState>>; resetFilters: () => void;
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
  if (parseRoleScope(raw, regions, projects).kind !== 'National') return raw;
  return 'National Activity AOP';
};

// Bumped to v4: National Activities now carry eligible_region_ids/
// eligible_project_ids and can be created/deleted by the AOP, so any stale
// v3 localStorage (missing those fields, or containing National Activities
// shaped the old way) should not be carried forward over the fixed
// Excel-backed starter data.
const PERSISTENCE_KEY = 'ercs-aop-bottom-up-v4';

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

  const [strategicPriorities] = useState<StrategicPriority[]>(INITIAL_STRATEGIC_PRIORITIES);
  const [nationalActivities, setNationalActivities] = useState<NationalActivity[]>(() => readPersisted('nationalActivities', INITIAL_NATIONAL_ACTIVITIES));
  const [regions, setRegions] = useState<Region[]>(() => readPersisted('regions', INITIAL_REGIONS));
  const [zones, setZones] = useState<Zone[]>(() => readPersisted('zones', INITIAL_ZONES));
  const [projects, setProjects] = useState<Project[]>(() => readPersisted('projects', INITIAL_PROJECTS));
  const [quarters] = useState<Quarter[]>(FISCAL_QUARTERS);
  const [planEntries, setPlanEntries] = useState<PlanEntry[]>(() => readPersisted('planEntries', INITIAL_PLAN_ENTRIES));
  const [quarterlyPlans, setQuarterlyPlans] = useState<QuarterlyPlan[]>(() => readPersisted('quarterlyPlans', INITIAL_QUARTERLY_PLANS));
  const [quarterlyActuals, setQuarterlyActuals] = useState<QuarterlyActual[]>(() => readPersisted('quarterlyActuals', INITIAL_QUARTERLY_ACTUALS));
  // Fixed reference data too — sourced from the Excel UOM table, no setter exposed.
  const [uomConfigs] = useState<UomFactorConfig[]>(() => readPersisted('uomConfigs', INITIAL_UOM_CONFIGS));
  const [filters, setFilters] = useState<FilterState>(() => ({ ...DEFAULT_FILTERS, ...readPersisted('filters', DEFAULT_FILTERS) }));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(PERSISTENCE_KEY, JSON.stringify({
        activeRoute, currentRole, selectedNationalActivityId, nationalActivities, regions, zones, projects, planEntries, quarterlyPlans, quarterlyActuals, uomConfigs, filters,
      }));
    } catch {
      // localStorage may be unavailable; in-memory state still works for the session.
    }
  }, [activeRoute, currentRole, selectedNationalActivityId, nationalActivities, regions, zones, projects, planEntries, quarterlyPlans, quarterlyActuals, uomConfigs, filters]);

  const showToast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 3000); };
  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const getFilteredPlanEntries = () => planEntries.filter(pe => {
    if (!roleOwnsPlanEntry(currentRole, pe, regions, projects)) return false;
    if (filters.strategicPriorityId !== 'ALL') {
      const na = nationalActivities.find(n => n.id === pe.national_activity_id);
      if (!na || na.strategic_priority_id !== filters.strategicPriorityId) return false;
    }
    if (filters.nationalActivityId !== 'ALL' && pe.national_activity_id !== filters.nationalActivityId) return false;
    // 'NONE' is a Report-page-only display toggle (see FilterBar's
    // allowNoneScope / ReportPage's "By National Activity only" view) — it
    // never removes a Plan Entry from scope, it's treated exactly like
    // 'ALL' here. Only a real Region/Project id actually restricts entries.
    if (filters.regionId !== 'ALL' && filters.regionId !== 'NONE' && pe.region_id !== filters.regionId) return false;
    if (filters.projectId !== 'ALL' && filters.projectId !== 'NONE' && pe.project_id !== filters.projectId) return false;
    return true;
  });

  // ---------------------------------------------------------------------
  // NATIONAL ACTIVITY VISIBILITY — the AOP sees every National Activity.
  // A Regional/Project Coordinator only sees the ones their exact Region/
  // Project is an eligible executor of (per eligible_region_ids/
  // eligible_project_ids) — mirroring the Excel data, where a Region/
  // Project sheet only ever contained the activities it actually executed.
  // ---------------------------------------------------------------------
  const getNationalActivitiesForRole = (): NationalActivity[] => {
    const scope = parseRoleScope(currentRole, regions, projects);
    if (scope.kind === 'National') return nationalActivities;
    if (scope.kind === 'Regional') return nationalActivities.filter(na => na.eligible_region_ids.includes(scope.regionId));
    return nationalActivities.filter(na => na.eligible_project_ids.includes(scope.projectId));
  };

  // ---------------------------------------------------------------------
  // NATIONAL ACTIVITY — create/delete. Only the National Activity AOP
  // manages these; Regional/Project Coordinators only ever add Plan
  // Entries against an existing (eligible) one.
  // ---------------------------------------------------------------------
  const addNationalActivity = (na: NationalActivity) => {
    if (parseRoleScope(currentRole, regions, projects).kind !== 'National') {
      showToast('Only National Activity AOP can create National Activities.');
      return;
    }
    setNationalActivities(prev => [...prev, na]);
    showToast(`National Activity ${na.code} created. It will appear under "Annual Plan" for its assigned Regions/Projects to submit Plan Entries against.`);
  };

  const deleteNationalActivity = (id: string) => {
    if (parseRoleScope(currentRole, regions, projects).kind !== 'National') {
      showToast('Only National Activity AOP can delete National Activities.');
      return;
    }
    const hasLinkedEntries = planEntries.some(pe => pe.national_activity_id === id);
    if (hasLinkedEntries) {
      showToast('This National Activity has linked Plan Entries (Regional or Project) and cannot be deleted.');
      return;
    }
    const na = nationalActivities.find(n => n.id === id);
    setNationalActivities(prev => prev.filter(n => n.id !== id));
    showToast(na ? `National Activity ${na.code} deleted.` : 'National Activity deleted.');
  };

  const addEligibleScope = (nationalActivityId: string, scopeType: ScopeType, scopeId: string) => {
    setNationalActivities(prev => prev.map(na => {
      if (na.id !== nationalActivityId) return na;
      if (scopeType === 'Regional') {
        return na.eligible_region_ids.includes(scopeId) ? na : { ...na, eligible_region_ids: [...na.eligible_region_ids, scopeId] };
      }
      return na.eligible_project_ids.includes(scopeId) ? na : { ...na, eligible_project_ids: [...na.eligible_project_ids, scopeId] };
    }));
  };

  const addRegion = (r: Region) => { setRegions(prev => [...prev, r]); showToast(`Region ${r.name} added.`); };
  const addZone = (z: Zone) => { setZones(prev => [...prev, z]); showToast(`Zone ${z.name} added.`); };
  const addProject = (p: Project) => { setProjects(prev => [...prev, p]); showToast(`Project ${p.name} added.`); };

  // ---------------------------------------------------------------------
  // PLAN ENTRY — a National Activity's Target/Budget is always the live sum
  // of its linked Plan Entries, so there is no ceiling to validate against
  // here any more: any non-negative target/budget is acceptable.
  // A Plan Entry may only be added for a Region/Project that is actually
  // listed as an eligible executor of the target National Activity
  // (eligible_region_ids/eligible_project_ids) — mirroring the Excel data,
  // where only certain Regions/Projects executed each activity.
  // ---------------------------------------------------------------------
  const addPlanEntry = (pe: PlanEntry) => {
    if (!roleOwnsPlanEntry(currentRole, pe, regions, projects)) { showToast('This coordinator can only manage entries for their assigned project or region.'); return; }

    const na = nationalActivities.find(n => n.id === pe.national_activity_id);
    if (!na) { showToast('National Activity not found.'); return; }

    const isEligible = pe.scope_type === 'Regional'
      ? (!!pe.region_id && na.eligible_region_ids.includes(pe.region_id))
      : (!!pe.project_id && na.eligible_project_ids.includes(pe.project_id));
    if (!isEligible) {
      showToast(`${na.code} is not executed by this ${pe.scope_type === 'Regional' ? 'Region' : 'Project'} — only its originally assigned Regions/Projects can add a Plan Entry here.`);
      return;
    }

    setPlanEntries(prev => [...prev, pe]);
    showToast(`Plan entry added and linked to ${na.code}. ${na.code}'s aggregated Target/Budget updates automatically.`);
  };

const updatePlanEntry = (pe: PlanEntry) => {
  if (parseRoleScope(currentRole, regions, projects).kind === 'National') { showToast('National Activity AOP does not edit execution entries.'); return; }
  if (!roleOwnsPlanEntry(currentRole, pe, regions, projects)) { showToast('This coordinator can only edit entries for their assigned project or region.'); return; }

  setPlanEntries(prev => prev.map(x => (x.id === pe.id ? pe : x)));
  const na = nationalActivities.find(n => n.id === pe.national_activity_id);
  showToast(`Plan entry updated. ${na?.code || ''}'s aggregated Target/Budget recalculates automatically.`);
};

const deletePlanEntry = (id: string) => {
  if (parseRoleScope(currentRole, regions, projects).kind === 'National') { showToast('National Activity AOP does not delete execution entries.'); return; }
  const old = planEntries.find(x => x.id === id);
  if (!old) return;
  if (!roleOwnsPlanEntry(currentRole, old, regions, projects)) { showToast('This coordinator can only delete entries for their assigned project or region.'); return; }
  setPlanEntries(prev => prev.filter(x => x.id !== id));
  setQuarterlyPlans(prev => prev.filter(qp => qp.plan_entry_id !== id));
  setQuarterlyActuals(prev => prev.filter(a => a.plan_entry_id !== id));
  showToast("Plan entry, its quarterly plan and its quarterly actuals deleted. The parent National Activity's aggregated Target/Budget updates automatically.");
};

  // ---------------------------------------------------------------------
  // QUARTERLY PLAN – automatically Approved.
  // ---------------------------------------------------------------------
  const upsertQuarterlyPlan = (qp: QuarterlyPlanInput) => {
    if (parseRoleScope(currentRole, regions, projects).kind === 'National') { showToast('Quarterly Plan entries are created by assigned Regional and Project Coordinators.'); return; }
    const parentEntry = planEntries.find(x => x.id === qp.plan_entry_id);
    if (!parentEntry || !roleOwnsPlanEntry(currentRole, parentEntry, regions, projects)) { showToast('You can only enter Quarterly Plan values for your assigned project or region.'); return; }
    setQuarterlyPlans(prev => {
      const idx = prev.findIndex(x => x.plan_entry_id === qp.plan_entry_id && x.quarter_id === qp.quarter_id);
      const merged: QuarterlyPlan = { ...qp, approval_status: 'Approved' };
      if (idx >= 0) { const copy = [...prev]; copy[idx] = merged; return copy; }
      return [...prev, merged];
    });
  };

  // ---------------------------------------------------------------------
  // QUARTERLY ACTUAL – automatically Approved.
  // ---------------------------------------------------------------------
  const upsertQuarterlyActual = (qa: QuarterlyActualInput) => {
    if (parseRoleScope(currentRole, regions, projects).kind === 'National') { showToast('Quarterly Actual entries are created by assigned Regional and Project Coordinators.'); return; }
    const parentEntry = planEntries.find(x => x.id === qa.plan_entry_id);
    if (!parentEntry || !roleOwnsPlanEntry(currentRole, parentEntry, regions, projects)) { showToast('You can only enter Quarterly Actual values for your assigned project or region.'); return; }
    setQuarterlyActuals(prev => {
      const idx = prev.findIndex(a => a.plan_entry_id === qa.plan_entry_id && a.quarter_id === qa.quarter_id);
      const merged: QuarterlyActual = { ...qa, approval_status: 'Approved' };
      if (idx >= 0) { const copy = [...prev]; copy[idx] = merged; return copy; }
      return [...prev, merged];
    });
  };

  return (
    <AppContext.Provider value={{
      activeRoute, setActiveRoute, currentRole, setCurrentRole, toastMessage, showToast,
      selectedNationalActivityId, setSelectedNationalActivityId,
      strategicPriorities,
      nationalActivities, addNationalActivity, deleteNationalActivity, addEligibleScope, getNationalActivitiesForRole,
      regions, addRegion,
      zones, addZone,
      projects, addProject, quarters,
      planEntries, addPlanEntry, updatePlanEntry, deletePlanEntry,
      quarterlyPlans, upsertQuarterlyPlan,
      quarterlyActuals, upsertQuarterlyActual,
      uomConfigs,
      filters, setFilters, resetFilters, getFilteredPlanEntries,
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