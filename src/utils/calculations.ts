// src/utils/calculations.ts
import { PlanEntry, QuarterlyActual, QuarterlyPlan, UomFactorConfig } from '../types';

/** Sum of annual targets across a set of Plan Entries. */
export const sumTarget = (entries: PlanEntry[]): number =>
  entries.reduce((sum, e) => sum + e.annual_target, 0);

/** Sum of annual budgets across a set of Plan Entries. */
export const sumBudget = (entries: PlanEntry[]): number =>
  entries.reduce((sum, e) => sum + e.annual_budget, 0);

/**
 * Sum of quarterly actuals reported against the given Plan Entries.
 * quarterId === 'ALL' (or undefined) sums every quarter reported so far.
 */
export const sumActual = (
  entries: PlanEntry[],
  actuals: QuarterlyActual[],
  quarterId?: string
): number => {
  const ids = new Set(entries.map(e => e.id));
  return actuals
    .filter(a => ids.has(a.plan_entry_id))
    .filter(a => !quarterId || quarterId === 'ALL' || a.quarter_id === quarterId)
    .reduce((sum, a) => sum + a.actual, 0);
};

/** Sum of quarterly expenditure reported against the given Plan Entries. */
export const sumExpenditure = (
  entries: PlanEntry[],
  actuals: QuarterlyActual[],
  quarterId?: string
): number => {
  const ids = new Set(entries.map(e => e.id));
  return actuals
    .filter(a => ids.has(a.plan_entry_id))
    .filter(a => !quarterId || quarterId === 'ALL' || a.quarter_id === quarterId)
    .reduce((sum, a) => sum + a.expenditure, 0);
};

/**
 * THE "WHAT WAS PLANNED" STEP — quarter-aware.
 * - quarterId 'ALL' / undefined: falls back to the Plan Entries' own
 *   annual_target (the Step 1 "Plan" figure — fixed, never overwritten by
 *   the quarterly split).
 * - a specific quarter: the sum of that quarter's QuarterlyPlan.target for
 *   these entries (0 for any entry with no Quarterly Plan set for that
 *   quarter yet).
 */
export const sumPlannedTarget = (
  entries: PlanEntry[],
  quarterlyPlans: QuarterlyPlan[],
  quarterId?: string
): number => {
  if (!quarterId || quarterId === 'ALL') return sumTarget(entries);
  const ids = new Set(entries.map(e => e.id));
  return quarterlyPlans
    .filter(qp => ids.has(qp.plan_entry_id) && qp.quarter_id === quarterId)
    .reduce((sum, qp) => sum + qp.target, 0);
};

/** Same as sumPlannedTarget, for budget. */
export const sumPlannedBudget = (
  entries: PlanEntry[],
  quarterlyPlans: QuarterlyPlan[],
  quarterId?: string
): number => {
  if (!quarterId || quarterId === 'ALL') return sumBudget(entries);
  const ids = new Set(entries.map(e => e.id));
  return quarterlyPlans
    .filter(qp => ids.has(qp.plan_entry_id) && qp.quarter_id === quarterId)
    .reduce((sum, qp) => sum + qp.budget, 0);
};

export const achievementPct = (actual: number, target: number): number =>
  target === 0 ? 0 : (actual / target) * 100;

export const budgetUtilizationPct = (spent: number, budget: number): number =>
  budget === 0 ? 0 : (spent / budget) * 100;

/**
 * THE CONVERSION STEP.
 * Turns a raw figure (in a UOM, e.g. 150 Persons trained) into a
 * beneficiaries figure using the fixed global conversion factor for that
 * UOM (e.g. x1 for "# of people reached", x5 for "# of households"). Pass
 * a Target for a "planned reach" figure, or an Actual for "reached so far".
 */
export const convertToBeneficiaries = (
  value: number,
  uom: string,
  uomConfigs: UomFactorConfig[]
): number => {
  const config = uomConfigs.find(c => c.uom.toLowerCase() === uom.toLowerCase());
  return value * (config ? config.factor : 0);
};

/**
 * Achievement status — tracks physical progress (Actual vs Target) for a
 * single Plan Entry or National Activity. Independent from budget status:
 * an activity can be behind on target while over budget, or ahead of
 * target while under budget.
 */
export const getStatusBadge = (achievement: number, hasActuals: boolean) => {
  if (!hasActuals) return { label: 'Planning', color: 'bg-slate-100 text-slate-700 border-slate-300' };
  if (achievement > 100) return { label: 'Overachieved', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
  if (achievement >= 100) return { label: 'Completed', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  if (achievement >= 85) return { label: 'On Track', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  if (achievement >= 60) return { label: 'At Risk', color: 'bg-amber-100 text-amber-800 border-amber-300' };
  return { label: 'Behind', color: 'bg-rose-100 text-rose-800 border-rose-300' };
};

/**
 * Budget status — tracks financial spend (Spent vs Budget) for a single
 * Plan Entry or National Activity. Kept as its own badge on purpose:
 * physical progress and financial spend are two different axes and can
 * disagree.
 */
export const getBudgetStatusBadge = (utilizationPct: number, hasSpend: boolean) => {
  if (!hasSpend) return { label: 'Planning', color: 'bg-slate-100 text-slate-700 border-slate-300' };
  if (utilizationPct > 100) return { label: 'Over Budget', color: 'bg-rose-100 text-rose-800 border-rose-300' };
  if (utilizationPct >= 90) return { label: 'Near Limit', color: 'bg-amber-100 text-amber-800 border-amber-300' };
  return { label: 'On Budget', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
};