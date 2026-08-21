// src/utils/activityCode.ts
// Single source of truth for generating a Plan Entry's Activity Code, so the
// live "Add Plan" wizard (PlanPage.tsx) and the legacy-data migration path
// (AppContext.tsx) can never drift into producing different codes for the
// same National Activity + Region/Project combination.
import { NationalActivity, Region, ScopeType } from '../types';

/** Strips a label down to a safe code fragment: letters/digits only, single underscores. */
const sanitize = (label: string): string =>
  label.trim().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

/**
 * Builds "<NationalActivityCode>_<ScopeSuffix>", where ScopeSuffix is:
 * - the Region name (sanitized), for Regional entries
 * - the part of the Project name before any "/" (sanitized), with an "_HQ"
 *   suffix appended when the parent National Activity's responsibility is
 *   'Both' (both HQ and Branch), for Project entries.
 * Returns '' if there is no National Activity, and just the National
 * Activity's own code if the Region/Project can't be resolved yet.
 */
export const buildActivityCode = (
  na: NationalActivity | undefined,
  scopeType: ScopeType,
  regionId: string | undefined,
  projectId: string | undefined,
  regions: Region[],
  projects: { id: string; name: string }[],
): string => {
  if (!na) return '';
  const scopeLabel = scopeType === 'Regional'
    ? regions.find(r => r.id === regionId)?.name
    : projects.find(p => p.id === projectId)?.name;
  if (!scopeLabel) return na.code;
  const suffix = scopeType === 'Regional'
    ? sanitize(scopeLabel)
    : `${sanitize(scopeLabel.split('/')[0])}${na.responsibility === 'Both' ? '_HQ' : ''}`;
  return `${na.code}_${suffix}`;
};
