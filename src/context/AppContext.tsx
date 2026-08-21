// src/context/AppContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  StrategicPriority, NationalActivity, Region, Zone, Project, PlanEntry, Quarter, QuarterId, QuarterlyPlan, QuarterlyActual, UomFactorConfig, FilterState, UserRole,
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

  // Fixed, Excel-sourced reference data — no add/edit/delete. Each one's
  // Target/Budget is computed live from its linked Plan Entries wherever
  // it's displayed (see sumTarget/sumBudget in utils/calculations).
  nationalActivities: NationalActivity[];

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

  uomConfigs: UomFactorConfig[];
  updateUomFactor: (uom: string, factor: number) => void;

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
  //if (raw === 'Regional Coordinator') return regions[0] ? `Regional Coordinator — ${regions[0].name}` : 'National Activity AOP';
  //if (raw === 'Project Coordinator') return projects[0] ? `Project Coordinator — ${projects[0].name}` : 'National Activity AOP';
  if (parseRoleScope(raw, regions, projects).kind !== 'National') return raw;
  return 'National Activity AOP';
};

// Bumped to v3: National Activity no longer stores annual_target/annual_budget
// and can no longer be added/edited/deleted, so any stale v2 localStorage
// (which may contain user-created National Activities or edited ceilings)
// should not be carried forward over the fixed Excel-backed reference data.
const PERSISTENCE_KEY = 'ercs-aop-bottom-up-v3';

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
  // Fixed reference data — no setter exposed; nothing in the UI can change it.
  const [nationalActivities] = useState<NationalActivity[]>(INITIAL_NATIONAL_ACTIVITIES);
  const [regions, setRegions] = useState<Region[]>(() => readPersisted('regions', INITIAL_REGIONS));
  const [zones, setZones] = useState<Zone[]>(() => readPersisted('zones', INITIAL_ZONES));
  const [projects, setProjects] = useState<Project[]>(() => readPersisted('projects', INITIAL_PROJECTS));
  const [quarters] = useState<Quarter[]>(FISCAL_QUARTERS);
  const [planEntries, setPlanEntries] = useState<PlanEntry[]>(() => readPersisted('planEntries', INITIAL_PLAN_ENTRIES));
  const [quarterlyPlans, setQuarterlyPlans] = useState<QuarterlyPlan[]>(() => readPersisted('quarterlyPlans', INITIAL_QUARTERLY_PLANS));
  const [quarterlyActuals, setQuarterlyActuals] = useState<QuarterlyActual[]>(() => readPersisted('quarterlyActuals', INITIAL_QUARTERLY_ACTUALS));
  const [uomConfigs, setUomConfigs] = useState<UomFactorConfig[]>(() => readPersisted('uomConfigs', INITIAL_UOM_CONFIGS));
  const [filters, setFilters] = useState<FilterState>(() => ({ ...DEFAULT_FILTERS, ...readPersisted('filters', DEFAULT_FILTERS) }));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(PERSISTENCE_KEY, JSON.stringify({
        activeRoute, currentRole, selectedNationalActivityId, regions, zones, projects, planEntries, quarterlyPlans, quarterlyActuals, uomConfigs, filters,
      }));
    } catch {
      // localStorage may be unavailable; in-memory state still works for the session.
    }
  }, [activeRoute, currentRole, selectedNationalActivityId, regions, zones, projects, planEntries, quarterlyPlans, quarterlyActuals, uomConfigs, filters]);

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

  const addRegion = (r: Region) => { setRegions(prev => [...prev, r]); showToast(`Region ${r.name} added.`); };
  const addZone = (z: Zone) => { setZones(prev => [...prev, z]); showToast(`Zone ${z.name} added.`); };
  const addProject = (p: Project) => { setProjects(prev => [...prev, p]); showToast(`Project ${p.name} added.`); };

  // ---------------------------------------------------------------------
  // PLAN ENTRY — a National Activity's Target/Budget is always the live sum
  // of its linked Plan Entries, so there is no ceiling to validate against
  // here any more: any non-negative target/budget is acceptable.
  // National Activity AOP can now also create Plan Entries directly (this
  // is their only way to enter data now that National Activities are fixed
  // reference rows with no "Add" flow) — roleOwnsPlanEntry already allows
  // the National scope to own any Plan Entry.
  // ---------------------------------------------------------------------
  const addPlanEntry = (pe: PlanEntry) => {
    if (!roleOwnsPlanEntry(currentRole, pe, regions, projects)) { showToast('This coordinator can only manage entries for their assigned project or region.'); return; }

    setPlanEntries(prev => [...prev, pe]);
    const na = nationalActivities.find(n => n.id === pe.national_activity_id);
    showToast(na
      ? `Plan entry added and linked to ${na.code}. ${na.code}'s aggregated Target/Budget updates automatically.`
      : 'Plan entry added.');
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
      strategicPriorities,
      nationalActivities,
      regions, addRegion,
      zones, addZone,
      projects, addProject, quarters,
      planEntries, addPlanEntry, updatePlanEntry, deletePlanEntry,
      quarterlyPlans, upsertQuarterlyPlan,
      quarterlyActuals, upsertQuarterlyActual,
      uomConfigs, updateUomFactor,
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