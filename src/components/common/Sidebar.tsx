import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ClipboardList,
  CalendarClock,
  CalendarCheck2,
  BarChart3,
  FolderGit2,
  MapPin,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const BASE_NAV = [
  { id: 'plan', label: 'Annual Plan', sub: 'National → Project / Region', icon: ClipboardList },
  { id: 'quarterly-plan', label: 'Quarterly Plan', sub: 'Split targets into Q1–Q4', icon: CalendarClock },
  { id: 'quarterly', label: 'Quarterly Actual Entry', sub: 'Actuals vs quarterly plan', icon: CalendarCheck2 },
  { id: 'report', label: 'Report', sub: 'Aggregated results', icon: BarChart3 },
  { id: 'submissions', label: 'Submissions', sub: 'View all submitted entries', icon: BarChart3 },
];

// National Activity AOP never creates Quarterly Plan/Actual entries — enforced
// in AppContext's upsertQuarterlyPlan/upsertQuarterlyActual — so those two
// nav items are hidden for that role rather than left as dead-end links.
const RESTRICTED_FOR_AOP = new Set(['quarterly-plan', 'quarterly']);

const isAssignedRole = (role: string) =>
  role.startsWith('Regional Coordinator — ') || role.startsWith('Project Coordinator — ');

const getRoleScope = (role: string) => {
  if (role.startsWith('Regional Coordinator — ')) {
    return { kind: 'Regional' as const, name: role.slice('Regional Coordinator — '.length) };
  }
  if (role.startsWith('Project Coordinator — ')) {
    return { kind: 'Project' as const, name: role.slice('Project Coordinator — '.length) };
  }
  return { kind: 'National' as const, name: '' };
};

export const Sidebar: React.FC = () => {
  const {
    activeRoute,
    setActiveRoute,
    currentRole,
    nationalActivities,
    planEntries,
    regions,
    projects,
    filters,
    setSelectedNationalActivityId,
    setFilters,
  } = useApp();

  const [planOpen, setPlanOpen] = useState(true);
  const [expandedActivities, setExpandedActivities] = useState<Record<string, boolean>>({});

  const isNationalAop = currentRole === 'National Activity AOP';
  const nav = isNationalAop ? BASE_NAV.filter(item => !RESTRICTED_FOR_AOP.has(item.id)) : BASE_NAV;

  const roleHint = currentRole === 'National Activity AOP'
    ? 'Create National Activities, review coordinator submissions, and approve or reject proposals.'
    : currentRole.startsWith('Regional Coordinator')
      ? 'Enter and manage the plan, quarterly plan, and actuals for the assigned region.'
      : 'Enter and manage the plan, quarterly plan, and actuals for the assigned project.';

  const roleScope = getRoleScope(currentRole);

  const roleOwnedEntries = useMemo(() => {
    if (!isAssignedRole(currentRole)) return planEntries;

    if (roleScope.kind === 'Regional') {
      const region = regions.find(r => r.name === roleScope.name);
      return region
        ? planEntries.filter(pe => pe.scope_type === 'Regional' && pe.region_id === region.id)
        : [];
    }

    const project = projects.find(p => p.name === roleScope.name);
    return project
      ? planEntries.filter(pe => pe.scope_type === 'Project' && pe.project_id === project.id)
      : [];
  }, [currentRole, roleScope.kind, roleScope.name, planEntries, regions, projects]);

  const visibleNationalActivities = nationalActivities;

  const activityChildren = useMemo(() => {
    const byActivity = new Map<
      string,
      { projects: { id: string; name: string }[]; regions: { id: string; name: string }[] }
    >();

    for (const na of visibleNationalActivities) {
      byActivity.set(na.id, { projects: [], regions: [] });
    }

    for (const pe of roleOwnedEntries) {
      const bucket = byActivity.get(pe.national_activity_id);
      if (!bucket) continue;

      if (pe.scope_type === 'Project') {
        const project = projects.find(p => p.id === pe.project_id);
        if (project && !bucket.projects.some(p => p.id === project.id)) {
          bucket.projects.push(project);
        }
      } else {
        const region = regions.find(r => r.id === pe.region_id);
        if (region && !bucket.regions.some(r => r.id === region.id)) {
          bucket.regions.push(region);
        }
      }
    }

    return byActivity;
  }, [visibleNationalActivities, roleOwnedEntries, regions, projects]);

  const toggleActivity = (id: string) => {
    setExpandedActivities(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const openActivity = (id: string) => {
    setSelectedNationalActivityId(id);
    setFilters(prev => ({
      ...prev,
      strategicPriorityId: 'ALL',
      nationalActivityId: id,
      regionId: 'ALL',
      projectId: 'ALL',
    }));
    setActiveRoute('national-detail');
  };

  // Clicking a Project/Region opens a scope-wide view of everything it
  // executes — across every National Activity it's linked to, not just the
  // one it happened to be expanded under. Mirrors the Excel workbook's own
  // per-Project/Region sheet, which likewise lists every linked activity.
  const openScope = (scopeType: 'Project' | 'Regional', scopeId: string) => {
    setFilters(prev => ({
      ...prev,
      strategicPriorityId: 'ALL',
      nationalActivityId: 'ALL',
      projectId: scopeType === 'Project' ? scopeId : 'ALL',
      regionId: scopeType === 'Regional' ? scopeId : 'ALL',
    }));
    setActiveRoute('scope-detail');
  };

  return (
    <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 shrink-0">
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <img
          src="/ercs-logo.png"
          alt="Ethiopian Red Cross Society"
          className="w-11 h-11 rounded-full object-contain bg-white shrink-0 shadow-md p-0.5"
        />
        <div>
          <div className="font-extrabold text-white text-sm tracking-wider uppercase">ERCS AoP</div>
          <div className="text-[10px] text-slate-400 font-medium">Prototype Stage</div>
        </div>
      </div>

      <div className="mx-3 my-3 p-2.5 rounded bg-slate-800/80 border border-slate-700/50 text-[10px] text-slate-400 leading-relaxed">
        <b className="text-white">{currentRole}</b><br />
        {roleHint}
      </div>

      <nav className="flex-1 px-2 py-2 space-y-1 text-xs font-medium overflow-y-auto">
        {nav.map(({ id, label, sub, icon: Icon }) => (
          <React.Fragment key={id}>
            {id === 'plan' ? (
              <div>
                <button
                  onClick={() => {
                    setPlanOpen(v => !v);
                    setActiveRoute('plan');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-left ${
                    activeRoute === 'plan' || activeRoute === 'national-detail' || activeRoute === 'scope-detail'
                      ? 'bg-ercs-red text-white font-bold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <div className="flex-1">
                    <div>{label}</div>
                    <div
                      className={`text-[10px] font-normal ${
                        activeRoute === 'plan' || activeRoute === 'national-detail' || activeRoute === 'scope-detail'
                          ? 'text-red-100'
                          : 'text-slate-500'
                      }`}
                    >
                      {sub}
                    </div>
                  </div>
                  {planOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                {planOpen && (
                  <div className="mt-1 ml-3 border-l border-slate-700 pl-2 space-y-1">
                    {visibleNationalActivities.map(na => {
                      const children = activityChildren.get(na.id) || {
                        projects: [],
                        regions: [],
                      };
                      const expanded = expandedActivities[na.id] ?? false;

                      return (
                        <div key={na.id}>
                          <button
                            onClick={() => {
                              toggleActivity(na.id);
                              openActivity(na.id);
                            }}
                            className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-left text-slate-200 hover:bg-slate-800"
                            title={na.description}
                          >
                            {expanded ? (
                              <ChevronDown className="w-3 h-3 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3 h-3 shrink-0" />
                            )}
                            <span className="font-bold">{na.code}</span>
                            <span className="truncate text-slate-400">— {na.description}</span>
                          </button>

                          {expanded && (
                            <div className="ml-5 mt-0.5 space-y-0.5">
                              {children.projects.length > 0 && (
                                <div className="text-[9px] uppercase tracking-wider text-slate-500 px-2 pt-1">
                                  Projects
                                </div>
                              )}

                              {children.projects.map(project => {
                                const isSelected = activeRoute === 'scope-detail' && filters.projectId === project.id;
                                return (
                                  <button
                                    key={project.id}
                                    onClick={() => openScope('Project', project.id)}
                                    className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left ${
                                      isSelected ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                                  >
                                    <FolderGit2 className="w-3 h-3 shrink-0 text-purple-300" />
                                    <span className="truncate">{project.name}</span>
                                  </button>
                                );
                              })}

                              {children.regions.length > 0 && (
                                <div className="text-[9px] uppercase tracking-wider text-slate-500 px-2 pt-1">
                                  Regions
                                </div>
                              )}

                              {children.regions.map(region => {
                                const isSelected = activeRoute === 'scope-detail' && filters.regionId === region.id;
                                return (
                                  <button
                                    key={region.id}
                                    onClick={() => openScope('Regional', region.id)}
                                    className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left ${
                                      isSelected ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                                  >
                                    <MapPin className="w-3 h-3 shrink-0 text-blue-300" />
                                    <span className="truncate">{region.name}</span>
                                  </button>
                                );
                              })}

                              {children.projects.length === 0 && children.regions.length === 0 && (
                                <div className="px-2 py-1 text-[10px] text-slate-600">
                                  No linked execution entries yet.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {visibleNationalActivities.length === 0 && (
                      <div className="px-2 py-3 text-[10px] text-slate-500">
                        No activities are assigned to this user yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setActiveRoute(id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-left ${
                  activeRoute === id
                    ? 'bg-ercs-red text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <div>
                  <div>{label}</div>
                  <div
                    className={`text-[10px] font-normal ${
                      activeRoute === id ? 'text-red-100' : 'text-slate-500'
                    }`}
                  >
                    {sub}
                  </div>
                </div>
              </button>
            )}
          </React.Fragment>
        ))}
      </nav>
    </aside>
  );
};
