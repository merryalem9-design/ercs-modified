import React from 'react';
import { useApp } from '../../context/AppContext';
import { Filter, RotateCcw } from 'lucide-react';

interface FilterBarProps {
  /** When true, adds a "None" option to the Region and Project selects.
   *  Picking it doesn't remove any Plan Entries from scope — AppContext's
   *  getFilteredPlanEntries treats 'NONE' exactly like 'ALL' — it's purely
   *  a display signal a page can read off `filters` to hide its own
   *  region/project-level breakdown and show just the National Activity
   *  summary. Off by default, so every other page keeps its exact current
   *  behavior and never even renders the option. */
  allowNoneScope?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({ allowNoneScope = false }) => {
  const { filters, setFilters, resetFilters, currentRole, nationalActivities, regions, projects, quarters } = useApp();

  const isRegionalRole = currentRole.startsWith('Regional Coordinator — ');
  const isProjectRole = currentRole.startsWith('Project Coordinator — ');
  const assignedRegionName = isRegionalRole ? currentRole.slice('Regional Coordinator — '.length) : '';
  const assignedProjectName = isProjectRole ? currentRole.slice('Project Coordinator — '.length) : '';
  const visibleRegions = isRegionalRole ? regions.filter(r => r.name === assignedRegionName) : regions;
  const visibleProjects = isProjectRole ? projects.filter(p => p.name === assignedProjectName) : projects;
  const nationalActivitiesInScope = nationalActivities;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Only a real, specific Region/Project id should force the other
    // dimension back to 'ALL'. 'ALL' and 'NONE' both mean "not a specific
    // scope", so either can be picked on both sides at once — e.g.
    // Region=NONE and Project=NONE together, to ask for "no breakdown".
    const isSpecificSelection = value !== 'ALL' && value !== 'NONE';
    setFilters(prev => {
      if (name === 'regionId' && isSpecificSelection) return { ...prev, regionId: value, projectId: 'ALL' };
      if (name === 'projectId' && isSpecificSelection) return { ...prev, projectId: value, regionId: 'ALL' };
      return { ...prev, [name]: value };
    });
  };

  // If a 'NONE' value leaked in from a page that allows it (e.g. Report)
  // and the user navigated to a page that doesn't render that option,
  // show the select as 'All' instead of a value with no matching <option>.
  // The underlying filters.regionId/projectId state is left untouched.
  const regionSelectValue = filters.regionId === 'NONE' && !allowNoneScope ? 'ALL' : filters.regionId;
  const projectSelectValue = filters.projectId === 'NONE' && !allowNoneScope ? 'ALL' : filters.projectId;

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-ercs-red" />
          <span>Filters</span>
        </div>
        <button onClick={resetFilters} className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-ercs-red">
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1">National Activity</label>
          <select name="nationalActivityId" value={filters.nationalActivityId} onChange={handleChange} className="w-full text-xs font-medium border-slate-200 rounded-lg bg-slate-50 py-1.5">
            <option value="ALL">All National Activities</option>
            {nationalActivitiesInScope.map(na => <option key={na.id} value={na.id}>{na.code}</option>)}
          </select>
        </div>
        {(!isProjectRole) && (
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Region</label>
            <select name="regionId" value={regionSelectValue} onChange={handleChange} className="w-full text-xs font-medium border-slate-200 rounded-lg bg-slate-50 py-1.5">
              <option value="ALL">All Regions</option>
              {allowNoneScope && <option value="NONE">None (National Activity Only)</option>}
              {visibleRegions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        )}
        {(!isRegionalRole) && (
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Project</label>
            <select name="projectId" value={projectSelectValue} onChange={handleChange} className="w-full text-xs font-medium border-slate-200 rounded-lg bg-slate-50 py-1.5">
              <option value="ALL">All Projects</option>
              {allowNoneScope && <option value="NONE">None (National Activity Only)</option>}
              {visibleProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1">Quarter</label>
          <select name="quarterId" value={filters.quarterId} onChange={handleChange} className="w-full text-xs font-medium border-slate-200 rounded-lg bg-slate-50 py-1.5">
            <option value="ALL">All Quarters (Annual)</option>
            {quarters.map(q => <option key={q.id} value={q.id}>{q.id}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};