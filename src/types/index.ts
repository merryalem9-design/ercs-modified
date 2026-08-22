// src/types/index.ts
// ---------------------------------------------------------------------------
// SIMPLIFIED DATA MODEL
// The goal at this stage is to make one pipeline crystal clear:
//
//   Strategic Priority (grouping)
//     -> National Activity (FIXED reference data — code/description/uom only;
//                            its Target and Budget are never stored, they are
//                            always the live sum of its linked Plan Entries)
//       -> Plan Entry (data entry — the annual target/budget for a
//                       Region/Project executing against a National Activity)
//         -> Quarterly Plan (data entry — Q1-Q4 breakdown of that Plan
//                             Entry; does NOT overwrite the Plan Entry, just
//                             reconciles against it. EACH QUARTER has its own
//                             Draft -> Pending Approval -> Approved/Rejected
//                             cycle, submitted by the Coordinator and
//                             approved by the National Activity AOP. Once
//                             Approved, that quarter is locked from editing.)
//           -> Quarterly Actual (data entry — reported per quarter, measured
//                                 against that quarter's Quarterly Plan. Goes
//                                 through the SAME per-quarter approval cycle
//                                 as Quarterly Plan, independently.)
//             -> Beneficiaries = Actual x UoM Conversion Factor   (conversion)
//               -> Summed by Strategic Priority / National Activity / Region / Project (aggregation)
//                 -> Report Page — the "Approved" view only counts Plan
//                    Entries AND Quarterly Plan/Actual rows that are
//                    themselves Approved; the "Draft" view shows everything
//                    not yet Approved.                            (reporting)
// ---------------------------------------------------------------------------

/** Top-level grouping — a Strategic Priority that National Activities roll up into. */
export interface StrategicPriority {
  id: string;
  code: string;      // e.g. "SP1"
  name: string;       // e.g. "Disaster Preparedness and Response (DPR)"
  objective: string;  // e.g. "Strategy Objective 1.1: Enhance disaster preparedness measures..."
}

/** Who owns delivery of a National Activity. */
export type Responsibility = 'HQ' | 'Branch' | 'Both';

export interface Region { id: string; name: string; }

/** A Zone is a sub-division of a Region (Ethiopian admin structure: Region > Zone). */
export interface Zone {
  id: string;
  region_id: string; // which Region this Zone belongs to
  name: string;
}

/**
 * The top-level "what" — a National Activity. This is FIXED, Excel-sourced
 * reference data: no annual_target/annual_budget is stored here. Its
 * aggregate Target and Budget are always computed live as the sum of the
 * Plan Entries linked to it (see sumTarget/sumBudget in utils/calculations).
 * There is nothing to set and nothing that can ever get out of sync.
 */
export interface NationalActivity {
  id: string;
  strategic_priority_id: string; // links up to a StrategicPriority
  code: string;          // e.g. "Activity 1.1.8"
  description: string;
  uom: string;            // Unit of Measure, e.g. "Person", "House Hold (HH)"
  responsibility: Responsibility; // HQ, Branch, or Both
  region_id?: string;     // optional — set when this activity is scoped to a specific Region
  zone_id?: string;       // optional — set when this activity is scoped to a specific Zone within that Region
  /**
   * Full narrative description of this National Activity, sourced from the
   * "Description" column of the Excel workbook's National Aggregated sheet.
   * Distinct from `description` above (which is really the Activity
   * Name/title) — this is the longer explanatory text.
   */
  activity_description: string;
}

export interface Project { id: string; name: string; }

export type ScopeType = 'Regional' | 'Project';

export type UserRole =
  | 'National Activity AOP'
  | `Regional Coordinator — ${string}`
  | `Project Coordinator — ${string}`;

/**
 * Shared approval lifecycle, reused by Plan Entry, Quarterly Plan and
 * Quarterly Actual. Draft/Rejected are freely editable by the Coordinator
 * who owns the record; Pending Approval is awaiting the National Activity
 * AOP's decision; Approved is locked — the Coordinator can no longer edit it
 * (enforced both in the UI and defensively in AppContext).
 */
export type ApprovalStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';

/** The "how" — who is executing against a National Activity: a Region or a Project. */
export interface PlanEntry {
  id: string;
  national_activity_id: string;
  scope_type: ScopeType;
  region_id?: string;   // set when scope_type === 'Regional'
  project_id?: string;  // set when scope_type === 'Project'
  annual_target: number;
  annual_budget: number;
  activity_code: string;
  activity_name: string;
  activity_description: string;
  approval_status: ApprovalStatus;
  submitted_at?: string;
  reviewed_at?: string;
  rejection_reason?: string;
}

export type QuarterId = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export interface Quarter { id: QuarterId; label: string; }

/**
 * The quarterly breakdown of a Plan Entry's annual target/budget. Entered on
 * the Quarterly Plan page (Step 2) — BEFORE Quarterly Actuals are reported
 * for that quarter. Deliberately does NOT drive/overwrite the Plan Entry's
 * own annual_target/annual_budget; the Quarterly Plan page instead shows a
 * reconciliation badge if the quarters don't sum to the annual figure, so a
 * mismatch is visible rather than silently resolved by shrinking the annual
 * commitment.
 *
 * Each quarter's row has its OWN approval_status — a Coordinator submits it,
 * the National Activity AOP approves or rejects it. Only Approved rows are
 * counted in the Report page's "Approved" view; editing is blocked entirely
 * once Approved.
 */
export interface QuarterlyPlan {
  id: string;
  plan_entry_id: string;
  quarter_id: QuarterId;
  target: number;
  budget: number;
  approval_status: ApprovalStatus;
  submitted_at?: string;
  reviewed_at?: string;
  rejection_reason?: string;
}

/**
 * Actual performance reported against a Plan Entry, for one quarter. Same
 * per-quarter approval cycle as QuarterlyPlan, tracked independently of it —
 * a quarter's Plan can be Approved while its Actual is still Draft, and vice
 * versa.
 */
export interface QuarterlyActual {
  id: string;
  plan_entry_id: string;
  quarter_id: QuarterId;
  actual: number;
  expenditure: number; // ETB spent
  comment?: string;
  approval_status: ApprovalStatus;
  submitted_at?: string;
  reviewed_at?: string;
  rejection_reason?: string;
}

/** Global conversion table: Actual (in UoM units) x factor = Beneficiaries reached. */
export interface UomFactorConfig {
  uom: string;
  factor: number;
}

export interface FilterState {
  strategicPriorityId: string; // 'ALL' or a StrategicPriority id
  nationalActivityId: string;  // 'ALL' or a NationalActivity id
  regionId: string;            // 'ALL' or a Region id
  projectId: string;           // 'ALL' or a Project id
  quarterId: string;           // 'ALL' or a QuarterId
}