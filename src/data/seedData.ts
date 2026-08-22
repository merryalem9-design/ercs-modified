import {
  StrategicPriority, NationalActivity, Region, Zone, Project, PlanEntry, Quarter, QuarterlyPlan, QuarterlyActual, UomFactorConfig,
} from '../types';

// ---------------------------------------------------------------------------
// Excel-backed starter data – exactly as provided in the workbook.
// National activities are rolled up from the child Project/Region rows.
// ---------------------------------------------------------------------------

export const INITIAL_STRATEGIC_PRIORITIES: StrategicPriority[] = [
  {
    id: 'sp-1',
    code: 'SP1',
    name: 'ERCS Annual Operational Plan',
    objective: 'Excel-backed national, project and regional activity plan.',
  },
];

// National Activities with totals computed from the sheets. `activity_description`
// is sourced verbatim from the "Description" column of the Excel workbook's
// National Aggregated sheet.
export const INITIAL_NATIONAL_ACTIVITIES: NationalActivity[] = [
  { id: 'na-1-1-1', strategic_priority_id: 'sp-1', code: '1.1.1', description: 'Distribute NFI Kits to IDP Households', uom: '# of households', responsibility: 'Both', activity_description: "Distribution of NFI kits to internally displaced households under the project's emergency response component." },
  { id: 'na-1-1-2', strategic_priority_id: 'sp-1', code: '1.1.2', description: 'Update Woreda-Level Emergency Response Plans', uom: '# of MHCP', responsibility: 'Both', activity_description: 'Development/update of woreda-level emergency response and contingency plans.' },
  { id: 'na-1-2-1', strategic_priority_id: 'sp-1', code: '1.2.1', description: 'Rehabilitate Boreholes in Project Woredas', uom: '# of water points', responsibility: 'Both', activity_description: "Rehabilitation of non-functional boreholes in the project's target woredas." },
  { id: 'na-1-2-2', strategic_priority_id: 'sp-1', code: '1.2.2', description: 'Provide Emergency Health and First Aid Services', uom: '# of people reached', responsibility: 'Both', activity_description: 'Provision of emergency health services, first aid and referrals to disaster-affected populations.' },
  { id: 'na-2-1-1', strategic_priority_id: 'sp-1', code: '2.1.1', description: 'Conduct Community-Based Disaster Risk Reduction (CBDRR) Training', uom: '# of people trained', responsibility: 'Both', activity_description: 'Training of community members and volunteers on disaster risk reduction and preparedness.' },
  { id: 'na-2-1-2', strategic_priority_id: 'sp-1', code: '2.1.2', description: 'Establish Community-Based Early Warning Systems', uom: '# of systems established', responsibility: 'Both', activity_description: 'Establishment/strengthening of early warning systems at community and woreda level.' },
  { id: 'na-3-1-1', strategic_priority_id: 'sp-1', code: '3.1.1', description: 'Provide Nutrition Support to Vulnerable Groups', uom: '# of beneficiaries', responsibility: 'Both', activity_description: 'Provision of nutrition support/supplementary feeding to malnourished and vulnerable groups.' },
  { id: 'na-3-2-1', strategic_priority_id: 'sp-1', code: '3.2.1', description: 'Conduct Health and Hygiene Awareness Campaigns', uom: '# of campaigns', responsibility: 'Both', activity_description: 'Community-level awareness campaigns on health, hygiene and disease prevention.' },
  { id: 'na-4-1-1', strategic_priority_id: 'sp-1', code: '4.1.1', description: 'Recruit and Train Community Volunteers', uom: '# of volunteers trained', responsibility: 'Both', activity_description: 'Recruitment and training of new RCRC volunteers on core competencies and code of conduct.' },
  { id: 'na-5-1-1', strategic_priority_id: 'sp-1', code: '5.1.1', description: 'Organize Migration and Protection Advocacy Forums', uom: '# of events', responsibility: 'Both', activity_description: 'Advocacy forums on migration and protection with government and partners.' },
];

export const INITIAL_REGIONS: Region[] = [
  { id: 'reg-1', name: 'Amhara Region' },
  { id: 'reg-2', name: 'Oromia Region' },
  { id: 'reg-3', name: 'Somali Region' },
];

export const INITIAL_ZONES: Zone[] = [];

export const INITIAL_PROJECTS: Project[] = [
  { id: 'proj-1', name: 'Project A' },
  { id: 'proj-2', name: 'Project B' },
  { id: 'proj-3', name: 'Project C' },
  { id: 'proj-4', name: 'Project D' },
];

// ---------------------------------------------------------------------------
// Plan Entries – one for every row in every Project/Region sheet.
// activity_code is always the PARENT National Activity's own code — never
// suffixed with the executing Region/Project. The "Executed By" column
// already makes it clear who owns the entry.
// ---------------------------------------------------------------------------
export const INITIAL_PLAN_ENTRIES: PlanEntry[] = [
  // Project A
  { id: 'pe-pa-111', national_activity_id: 'na-1-1-1', scope_type: 'Project', project_id: 'proj-1', annual_target: 1200, annual_budget: 950_000, activity_code: '1.1.1', activity_name: 'Distribute NFI Kits to IDP Households', activity_description: "Distribution of NFI kits to internally displaced households under the project's emergency response component.", approval_status: 'Approved' },
  { id: 'pe-pa-122', national_activity_id: 'na-1-2-2', scope_type: 'Project', project_id: 'proj-1', annual_target: 2500, annual_budget: 1_100_000, activity_code: '1.2.2', activity_name: 'Deliver Mobile Health and First Aid Outreach', activity_description: 'Mobile health/first aid outreach to project-targeted communities.', approval_status: 'Approved' },
  { id: 'pe-pa-211', national_activity_id: 'na-2-1-1', scope_type: 'Project', project_id: 'proj-1', annual_target: 120, annual_budget: 300_000, activity_code: '2.1.1', activity_name: 'Deliver DRR Training of Trainers (ToT) for Community Leaders', activity_description: 'ToT sessions on disaster risk reduction for community leaders under the project.', approval_status: 'Approved' },

  // Project B
  { id: 'pe-pb-121', national_activity_id: 'na-1-2-1', scope_type: 'Project', project_id: 'proj-2', annual_target: 6, annual_budget: 2_800_000, activity_code: '1.2.1', activity_name: 'Rehabilitate Boreholes in Project Woredas', activity_description: "Rehabilitation of non-functional boreholes in the project's target woredas.", approval_status: 'Approved' },
  { id: 'pe-pb-311', national_activity_id: 'na-3-1-1', scope_type: 'Project', project_id: 'proj-2', annual_target: 900, annual_budget: 750_000, activity_code: '3.1.1', activity_name: 'Provide Supplementary Feeding to Malnourished Children', activity_description: 'Supplementary feeding support to malnourished children under 5 and PLW.', approval_status: 'Approved' },
  { id: 'pe-pb-411', national_activity_id: 'na-4-1-1', scope_type: 'Project', project_id: 'proj-2', annual_target: 150, annual_budget: 210_000, activity_code: '4.1.1', activity_name: 'Train and Deploy Community-Based Volunteers', activity_description: 'Recruitment and deployment of community volunteers to support project activities.', approval_status: 'Approved' },

  // Project C
  { id: 'pe-pc-111', national_activity_id: 'na-1-1-1', scope_type: 'Project', project_id: 'proj-3', annual_target: 950, annual_budget: 700_000, activity_code: '1.1.1', activity_name: 'Provide Emergency Shelter and NFI Support', activity_description: 'Emergency shelter and NFI support to disaster-affected households in project areas.', approval_status: 'Approved' },
  { id: 'pe-pc-212', national_activity_id: 'na-2-1-2', scope_type: 'Project', project_id: 'proj-3', annual_target: 4, annual_budget: 900_000, activity_code: '2.1.2', activity_name: 'Install Community Early Warning Alert Systems', activity_description: 'Installation of early warning alert systems in flood/drought-prone project woredas.', approval_status: 'Approved' },
  { id: 'pe-pc-321', national_activity_id: 'na-3-2-1', scope_type: 'Project', project_id: 'proj-3', annual_target: 10, annual_budget: 320_000, activity_code: '3.2.1', activity_name: 'Conduct Hygiene Promotion Sessions', activity_description: "Community hygiene promotion sessions under the project's WASH component.", approval_status: 'Approved' },

  // Project D
  { id: 'pe-pd-112', national_activity_id: 'na-1-1-2', scope_type: 'Project', project_id: 'proj-4', annual_target: 2, annual_budget: 250_000, activity_code: '1.1.2', activity_name: 'Update Woreda-Level Emergency Response Plans', activity_description: 'Development/update of woreda-level emergency response and contingency plans.', approval_status: 'Approved' },
  { id: 'pe-pd-122', national_activity_id: 'na-1-2-2', scope_type: 'Project', project_id: 'proj-4', annual_target: 3000, annual_budget: 1_050_000, activity_code: '1.2.2', activity_name: 'Provide First Aid and Referral Services at Reception Centers', activity_description: 'First aid and referral services for migrants/returnees at reception centers.', approval_status: 'Approved' },
  { id: 'pe-pd-511', national_activity_id: 'na-5-1-1', scope_type: 'Project', project_id: 'proj-4', annual_target: 6, annual_budget: 400_000, activity_code: '5.1.1', activity_name: 'Organize Migration and Protection Advocacy Forums', activity_description: 'Advocacy forums on migration and protection with government and partners.', approval_status: 'Approved' },

  // Amhara Region
  { id: 'pe-r-am-111', national_activity_id: 'na-1-1-1', scope_type: 'Regional', region_id: 'reg-1', annual_target: 4500, annual_budget: 3_200_000, activity_code: '1.1.1', activity_name: 'Provide Non-Food Items (NFI) to Disaster-Affected Households', activity_description: 'Distribution of core relief NFI kits (blankets, jerry cans, kitchen sets, etc.) to households affected by disaster.', approval_status: 'Approved' },
  { id: 'pe-r-am-121', national_activity_id: 'na-1-2-1', scope_type: 'Regional', region_id: 'reg-1', annual_target: 12, annual_budget: 5_400_000, activity_code: '1.2.1', activity_name: 'Construct/Rehabilitate Community Water Points', activity_description: 'Construction or rehabilitation of water points (boreholes, wells, water schemes) for disaster-affected and host communities.', approval_status: 'Approved' },
  { id: 'pe-r-am-211', national_activity_id: 'na-2-1-1', scope_type: 'Regional', region_id: 'reg-1', annual_target: 800, annual_budget: 950_000, activity_code: '2.1.1', activity_name: 'Conduct Community-Based Disaster Risk Reduction (CBDRR) Training', activity_description: 'Training of community members and volunteers on disaster risk reduction and preparedness.', approval_status: 'Approved' },
  { id: 'pe-r-am-311', national_activity_id: 'na-3-1-1', scope_type: 'Regional', region_id: 'reg-1', annual_target: 2200, annual_budget: 1_800_000, activity_code: '3.1.1', activity_name: 'Provide Nutrition Support to Vulnerable Groups', activity_description: 'Provision of nutrition support/supplementary feeding to malnourished and vulnerable groups.', approval_status: 'Approved' },
  { id: 'pe-r-am-411', national_activity_id: 'na-4-1-1', scope_type: 'Regional', region_id: 'reg-1', annual_target: 300, annual_budget: 450_000, activity_code: '4.1.1', activity_name: 'Recruit and Train Community Volunteers', activity_description: 'Recruitment and training of new RCRC volunteers on core competencies and code of conduct.', approval_status: 'Approved' },

  // Oromia Region
  { id: 'pe-r-or-111', national_activity_id: 'na-1-1-1', scope_type: 'Regional', region_id: 'reg-2', annual_target: 6000, annual_budget: 4_100_000, activity_code: '1.1.1', activity_name: 'Provide Non-Food Items (NFI) to Disaster-Affected Households', activity_description: 'Distribution of core relief NFI kits (blankets, jerry cans, kitchen sets, etc.) to households affected by disaster.', approval_status: 'Approved' },
  { id: 'pe-r-or-112', national_activity_id: 'na-1-1-2', scope_type: 'Regional', region_id: 'reg-2', annual_target: 3, annual_budget: 600_000, activity_code: '1.1.2', activity_name: 'Develop Multi-Hazard Contingency Plan (MHCP)', activity_description: 'Development/update of multi-hazard contingency plans at national and regional level.', approval_status: 'Approved' },
  { id: 'pe-r-or-122', national_activity_id: 'na-1-2-2', scope_type: 'Regional', region_id: 'reg-2', annual_target: 5000, annual_budget: 2_300_000, activity_code: '1.2.2', activity_name: 'Provide Emergency Health and First Aid Services', activity_description: 'Provision of emergency health services, first aid and referrals to disaster-affected populations.', approval_status: 'Approved' },
  { id: 'pe-r-or-212', national_activity_id: 'na-2-1-2', scope_type: 'Regional', region_id: 'reg-2', annual_target: 8, annual_budget: 1_100_000, activity_code: '2.1.2', activity_name: 'Establish Community-Based Early Warning Systems', activity_description: 'Establishment/strengthening of early warning systems at community and woreda level.', approval_status: 'Approved' },
  { id: 'pe-r-or-321', national_activity_id: 'na-3-2-1', scope_type: 'Regional', region_id: 'reg-2', annual_target: 15, annual_budget: 700_000, activity_code: '3.2.1', activity_name: 'Conduct Health and Hygiene Awareness Campaigns', activity_description: 'Community-level awareness campaigns on health, hygiene and disease prevention.', approval_status: 'Approved' },
  { id: 'pe-r-or-411', national_activity_id: 'na-4-1-1', scope_type: 'Regional', region_id: 'reg-2', annual_target: 450, annual_budget: 620_000, activity_code: '4.1.1', activity_name: 'Recruit and Train Community Volunteers', activity_description: 'Recruitment and training of new RCRC volunteers on core competencies and code of conduct.', approval_status: 'Approved' },

  // Somali Region
  { id: 'pe-r-so-111', national_activity_id: 'na-1-1-1', scope_type: 'Regional', region_id: 'reg-3', annual_target: 3800, annual_budget: 2_650_000, activity_code: '1.1.1', activity_name: 'Provide Non-Food Items (NFI) to Disaster-Affected Households', activity_description: 'Distribution of core relief NFI kits (blankets, jerry cans, kitchen sets, etc.) to households affected by disaster.', approval_status: 'Approved' },
  { id: 'pe-r-so-121', national_activity_id: 'na-1-2-1', scope_type: 'Regional', region_id: 'reg-3', annual_target: 9, annual_budget: 4_000_000, activity_code: '1.2.1', activity_name: 'Construct/Rehabilitate Community Water Points', activity_description: 'Construction or rehabilitation of water points (boreholes, wells, water schemes) for disaster-affected and host communities.', approval_status: 'Approved' },
  { id: 'pe-r-so-122', national_activity_id: 'na-1-2-2', scope_type: 'Regional', region_id: 'reg-3', annual_target: 4200, annual_budget: 1_950_000, activity_code: '1.2.2', activity_name: 'Provide Emergency Health and First Aid Services', activity_description: 'Provision of emergency health services, first aid and referrals to disaster-affected populations.', approval_status: 'Approved' },
  { id: 'pe-r-so-311', national_activity_id: 'na-3-1-1', scope_type: 'Regional', region_id: 'reg-3', annual_target: 1600, annual_budget: 1_300_000, activity_code: '3.1.1', activity_name: 'Provide Nutrition Support to Vulnerable Groups', activity_description: 'Provision of nutrition support/supplementary feeding to malnourished and vulnerable groups.', approval_status: 'Approved' },
];

export const FISCAL_QUARTERS: Quarter[] = [
  { id: 'Q1', label: 'Q1 (Jul-Sep)' },
  { id: 'Q2', label: 'Q2 (Oct-Dec)' },
  { id: 'Q3', label: 'Q3 (Jan-Mar)' },
  { id: 'Q4', label: 'Q4 (Apr-Jun)' },
];

// ---------------------------------------------------------------------------
// Quarterly Plans – seeded from the Excel quarterly columns for each entry.
// ---------------------------------------------------------------------------
export const INITIAL_QUARTERLY_PLANS: QuarterlyPlan[] = [
  // Project A
  { id: 'qp-pa-111-q1', plan_entry_id: 'pe-pa-111', quarter_id: 'Q1', target: 300, budget: 237500, approval_status: 'Approved' },
  { id: 'qp-pa-111-q2', plan_entry_id: 'pe-pa-111', quarter_id: 'Q2', target: 300, budget: 237500, approval_status: 'Approved' },
  { id: 'qp-pa-111-q3', plan_entry_id: 'pe-pa-111', quarter_id: 'Q3', target: 300, budget: 237500, approval_status: 'Approved' },
  { id: 'qp-pa-111-q4', plan_entry_id: 'pe-pa-111', quarter_id: 'Q4', target: 300, budget: 237500, approval_status: 'Approved' },
  { id: 'qp-pa-122-q1', plan_entry_id: 'pe-pa-122', quarter_id: 'Q1', target: 625, budget: 275000, approval_status: 'Approved' },
  { id: 'qp-pa-122-q2', plan_entry_id: 'pe-pa-122', quarter_id: 'Q2', target: 625, budget: 275000, approval_status: 'Approved' },
  { id: 'qp-pa-122-q3', plan_entry_id: 'pe-pa-122', quarter_id: 'Q3', target: 625, budget: 275000, approval_status: 'Approved' },
  { id: 'qp-pa-122-q4', plan_entry_id: 'pe-pa-122', quarter_id: 'Q4', target: 625, budget: 275000, approval_status: 'Approved' },
  { id: 'qp-pa-211-q1', plan_entry_id: 'pe-pa-211', quarter_id: 'Q1', target: 30, budget: 75000, approval_status: 'Approved' },
  { id: 'qp-pa-211-q2', plan_entry_id: 'pe-pa-211', quarter_id: 'Q2', target: 30, budget: 75000, approval_status: 'Approved' },
  { id: 'qp-pa-211-q3', plan_entry_id: 'pe-pa-211', quarter_id: 'Q3', target: 30, budget: 75000, approval_status: 'Approved' },
  { id: 'qp-pa-211-q4', plan_entry_id: 'pe-pa-211', quarter_id: 'Q4', target: 30, budget: 75000, approval_status: 'Approved' },

  // Project B
  { id: 'qp-pb-121-q1', plan_entry_id: 'pe-pb-121', quarter_id: 'Q1', target: 1.5, budget: 700000, approval_status: 'Approved' },
  { id: 'qp-pb-121-q2', plan_entry_id: 'pe-pb-121', quarter_id: 'Q2', target: 1.5, budget: 700000, approval_status: 'Approved' },
  { id: 'qp-pb-121-q3', plan_entry_id: 'pe-pb-121', quarter_id: 'Q3', target: 1.5, budget: 700000, approval_status: 'Approved' },
  { id: 'qp-pb-121-q4', plan_entry_id: 'pe-pb-121', quarter_id: 'Q4', target: 1.5, budget: 700000, approval_status: 'Approved' },
  { id: 'qp-pb-311-q1', plan_entry_id: 'pe-pb-311', quarter_id: 'Q1', target: 225, budget: 187500, approval_status: 'Approved' },
  { id: 'qp-pb-311-q2', plan_entry_id: 'pe-pb-311', quarter_id: 'Q2', target: 225, budget: 187500, approval_status: 'Approved' },
  { id: 'qp-pb-311-q3', plan_entry_id: 'pe-pb-311', quarter_id: 'Q3', target: 225, budget: 187500, approval_status: 'Approved' },
  { id: 'qp-pb-311-q4', plan_entry_id: 'pe-pb-311', quarter_id: 'Q4', target: 225, budget: 187500, approval_status: 'Approved' },
  { id: 'qp-pb-411-q1', plan_entry_id: 'pe-pb-411', quarter_id: 'Q1', target: 37.5, budget: 52500, approval_status: 'Approved' },
  { id: 'qp-pb-411-q2', plan_entry_id: 'pe-pb-411', quarter_id: 'Q2', target: 37.5, budget: 52500, approval_status: 'Approved' },
  { id: 'qp-pb-411-q3', plan_entry_id: 'pe-pb-411', quarter_id: 'Q3', target: 37.5, budget: 52500, approval_status: 'Approved' },
  { id: 'qp-pb-411-q4', plan_entry_id: 'pe-pb-411', quarter_id: 'Q4', target: 37.5, budget: 52500, approval_status: 'Approved' },

  // Project C
  { id: 'qp-pc-111-q1', plan_entry_id: 'pe-pc-111', quarter_id: 'Q1', target: 237.5, budget: 175000, approval_status: 'Approved' },
  { id: 'qp-pc-111-q2', plan_entry_id: 'pe-pc-111', quarter_id: 'Q2', target: 237.5, budget: 175000, approval_status: 'Approved' },
  { id: 'qp-pc-111-q3', plan_entry_id: 'pe-pc-111', quarter_id: 'Q3', target: 237.5, budget: 175000, approval_status: 'Approved' },
  { id: 'qp-pc-111-q4', plan_entry_id: 'pe-pc-111', quarter_id: 'Q4', target: 237.5, budget: 175000, approval_status: 'Approved' },
  { id: 'qp-pc-212-q1', plan_entry_id: 'pe-pc-212', quarter_id: 'Q1', target: 1, budget: 225000, approval_status: 'Approved' },
  { id: 'qp-pc-212-q2', plan_entry_id: 'pe-pc-212', quarter_id: 'Q2', target: 1, budget: 225000, approval_status: 'Approved' },
  { id: 'qp-pc-212-q3', plan_entry_id: 'pe-pc-212', quarter_id: 'Q3', target: 1, budget: 225000, approval_status: 'Approved' },
  { id: 'qp-pc-212-q4', plan_entry_id: 'pe-pc-212', quarter_id: 'Q4', target: 1, budget: 225000, approval_status: 'Approved' },
  { id: 'qp-pc-321-q1', plan_entry_id: 'pe-pc-321', quarter_id: 'Q1', target: 2.5, budget: 80000, approval_status: 'Approved' },
  { id: 'qp-pc-321-q2', plan_entry_id: 'pe-pc-321', quarter_id: 'Q2', target: 2.5, budget: 80000, approval_status: 'Approved' },
  { id: 'qp-pc-321-q3', plan_entry_id: 'pe-pc-321', quarter_id: 'Q3', target: 2.5, budget: 80000, approval_status: 'Approved' },
  { id: 'qp-pc-321-q4', plan_entry_id: 'pe-pc-321', quarter_id: 'Q4', target: 2.5, budget: 80000, approval_status: 'Approved' },

  // Project D
  { id: 'qp-pd-112-q1', plan_entry_id: 'pe-pd-112', quarter_id: 'Q1', target: 0.5, budget: 62500, approval_status: 'Approved' },
  { id: 'qp-pd-112-q2', plan_entry_id: 'pe-pd-112', quarter_id: 'Q2', target: 0.5, budget: 62500, approval_status: 'Approved' },
  { id: 'qp-pd-112-q3', plan_entry_id: 'pe-pd-112', quarter_id: 'Q3', target: 0.5, budget: 62500, approval_status: 'Approved' },
  { id: 'qp-pd-112-q4', plan_entry_id: 'pe-pd-112', quarter_id: 'Q4', target: 0.5, budget: 62500, approval_status: 'Approved' },
  { id: 'qp-pd-122-q1', plan_entry_id: 'pe-pd-122', quarter_id: 'Q1', target: 750, budget: 262500, approval_status: 'Approved' },
  { id: 'qp-pd-122-q2', plan_entry_id: 'pe-pd-122', quarter_id: 'Q2', target: 750, budget: 262500, approval_status: 'Approved' },
  { id: 'qp-pd-122-q3', plan_entry_id: 'pe-pd-122', quarter_id: 'Q3', target: 750, budget: 262500, approval_status: 'Approved' },
  { id: 'qp-pd-122-q4', plan_entry_id: 'pe-pd-122', quarter_id: 'Q4', target: 750, budget: 262500, approval_status: 'Approved' },
  { id: 'qp-pd-511-q1', plan_entry_id: 'pe-pd-511', quarter_id: 'Q1', target: 1.5, budget: 100000, approval_status: 'Approved' },
  { id: 'qp-pd-511-q2', plan_entry_id: 'pe-pd-511', quarter_id: 'Q2', target: 1.5, budget: 100000, approval_status: 'Approved' },
  { id: 'qp-pd-511-q3', plan_entry_id: 'pe-pd-511', quarter_id: 'Q3', target: 1.5, budget: 100000, approval_status: 'Approved' },
  { id: 'qp-pd-511-q4', plan_entry_id: 'pe-pd-511', quarter_id: 'Q4', target: 1.5, budget: 100000, approval_status: 'Approved' },

  // Amhara Region
  { id: 'qp-r-am-111-q1', plan_entry_id: 'pe-r-am-111', quarter_id: 'Q1', target: 1125, budget: 800000, approval_status: 'Approved' },
  { id: 'qp-r-am-111-q2', plan_entry_id: 'pe-r-am-111', quarter_id: 'Q2', target: 1125, budget: 800000, approval_status: 'Approved' },
  { id: 'qp-r-am-111-q3', plan_entry_id: 'pe-r-am-111', quarter_id: 'Q3', target: 1125, budget: 800000, approval_status: 'Approved' },
  { id: 'qp-r-am-111-q4', plan_entry_id: 'pe-r-am-111', quarter_id: 'Q4', target: 1125, budget: 800000, approval_status: 'Approved' },
  { id: 'qp-r-am-121-q1', plan_entry_id: 'pe-r-am-121', quarter_id: 'Q1', target: 3, budget: 1350000, approval_status: 'Approved' },
  { id: 'qp-r-am-121-q2', plan_entry_id: 'pe-r-am-121', quarter_id: 'Q2', target: 3, budget: 1350000, approval_status: 'Approved' },
  { id: 'qp-r-am-121-q3', plan_entry_id: 'pe-r-am-121', quarter_id: 'Q3', target: 3, budget: 1350000, approval_status: 'Approved' },
  { id: 'qp-r-am-121-q4', plan_entry_id: 'pe-r-am-121', quarter_id: 'Q4', target: 3, budget: 1350000, approval_status: 'Approved' },
  { id: 'qp-r-am-211-q1', plan_entry_id: 'pe-r-am-211', quarter_id: 'Q1', target: 200, budget: 237500, approval_status: 'Approved' },
  { id: 'qp-r-am-211-q2', plan_entry_id: 'pe-r-am-211', quarter_id: 'Q2', target: 200, budget: 237500, approval_status: 'Approved' },
  { id: 'qp-r-am-211-q3', plan_entry_id: 'pe-r-am-211', quarter_id: 'Q3', target: 200, budget: 237500, approval_status: 'Approved' },
  { id: 'qp-r-am-211-q4', plan_entry_id: 'pe-r-am-211', quarter_id: 'Q4', target: 200, budget: 237500, approval_status: 'Approved' },
  { id: 'qp-r-am-311-q1', plan_entry_id: 'pe-r-am-311', quarter_id: 'Q1', target: 550, budget: 450000, approval_status: 'Approved' },
  { id: 'qp-r-am-311-q2', plan_entry_id: 'pe-r-am-311', quarter_id: 'Q2', target: 550, budget: 450000, approval_status: 'Approved' },
  { id: 'qp-r-am-311-q3', plan_entry_id: 'pe-r-am-311', quarter_id: 'Q3', target: 550, budget: 450000, approval_status: 'Approved' },
  { id: 'qp-r-am-311-q4', plan_entry_id: 'pe-r-am-311', quarter_id: 'Q4', target: 550, budget: 450000, approval_status: 'Approved' },
  { id: 'qp-r-am-411-q1', plan_entry_id: 'pe-r-am-411', quarter_id: 'Q1', target: 75, budget: 112500, approval_status: 'Approved' },
  { id: 'qp-r-am-411-q2', plan_entry_id: 'pe-r-am-411', quarter_id: 'Q2', target: 75, budget: 112500, approval_status: 'Approved' },
  { id: 'qp-r-am-411-q3', plan_entry_id: 'pe-r-am-411', quarter_id: 'Q3', target: 75, budget: 112500, approval_status: 'Approved' },
  { id: 'qp-r-am-411-q4', plan_entry_id: 'pe-r-am-411', quarter_id: 'Q4', target: 75, budget: 112500, approval_status: 'Approved' },

  // Oromia Region
  { id: 'qp-r-or-111-q1', plan_entry_id: 'pe-r-or-111', quarter_id: 'Q1', target: 1500, budget: 1025000, approval_status: 'Approved' },
  { id: 'qp-r-or-111-q2', plan_entry_id: 'pe-r-or-111', quarter_id: 'Q2', target: 1500, budget: 1025000, approval_status: 'Approved' },
  { id: 'qp-r-or-111-q3', plan_entry_id: 'pe-r-or-111', quarter_id: 'Q3', target: 1500, budget: 1025000, approval_status: 'Approved' },
  { id: 'qp-r-or-111-q4', plan_entry_id: 'pe-r-or-111', quarter_id: 'Q4', target: 1500, budget: 1025000, approval_status: 'Approved' },
  { id: 'qp-r-or-112-q1', plan_entry_id: 'pe-r-or-112', quarter_id: 'Q1', target: 0.75, budget: 150000, approval_status: 'Approved' },
  { id: 'qp-r-or-112-q2', plan_entry_id: 'pe-r-or-112', quarter_id: 'Q2', target: 0.75, budget: 150000, approval_status: 'Approved' },
  { id: 'qp-r-or-112-q3', plan_entry_id: 'pe-r-or-112', quarter_id: 'Q3', target: 0.75, budget: 150000, approval_status: 'Approved' },
  { id: 'qp-r-or-112-q4', plan_entry_id: 'pe-r-or-112', quarter_id: 'Q4', target: 0.75, budget: 150000, approval_status: 'Approved' },
  { id: 'qp-r-or-122-q1', plan_entry_id: 'pe-r-or-122', quarter_id: 'Q1', target: 1250, budget: 575000, approval_status: 'Approved' },
  { id: 'qp-r-or-122-q2', plan_entry_id: 'pe-r-or-122', quarter_id: 'Q2', target: 1250, budget: 575000, approval_status: 'Approved' },
  { id: 'qp-r-or-122-q3', plan_entry_id: 'pe-r-or-122', quarter_id: 'Q3', target: 1250, budget: 575000, approval_status: 'Approved' },
  { id: 'qp-r-or-122-q4', plan_entry_id: 'pe-r-or-122', quarter_id: 'Q4', target: 1250, budget: 575000, approval_status: 'Approved' },
  { id: 'qp-r-or-212-q1', plan_entry_id: 'pe-r-or-212', quarter_id: 'Q1', target: 2, budget: 275000, approval_status: 'Approved' },
  { id: 'qp-r-or-212-q2', plan_entry_id: 'pe-r-or-212', quarter_id: 'Q2', target: 2, budget: 275000, approval_status: 'Approved' },
  { id: 'qp-r-or-212-q3', plan_entry_id: 'pe-r-or-212', quarter_id: 'Q3', target: 2, budget: 275000, approval_status: 'Approved' },
  { id: 'qp-r-or-212-q4', plan_entry_id: 'pe-r-or-212', quarter_id: 'Q4', target: 2, budget: 275000, approval_status: 'Approved' },
  { id: 'qp-r-or-321-q1', plan_entry_id: 'pe-r-or-321', quarter_id: 'Q1', target: 3.75, budget: 175000, approval_status: 'Approved' },
  { id: 'qp-r-or-321-q2', plan_entry_id: 'pe-r-or-321', quarter_id: 'Q2', target: 3.75, budget: 175000, approval_status: 'Approved' },
  { id: 'qp-r-or-321-q3', plan_entry_id: 'pe-r-or-321', quarter_id: 'Q3', target: 3.75, budget: 175000, approval_status: 'Approved' },
  { id: 'qp-r-or-321-q4', plan_entry_id: 'pe-r-or-321', quarter_id: 'Q4', target: 3.75, budget: 175000, approval_status: 'Approved' },
  { id: 'qp-r-or-411-q1', plan_entry_id: 'pe-r-or-411', quarter_id: 'Q1', target: 112.5, budget: 155000, approval_status: 'Approved' },
  { id: 'qp-r-or-411-q2', plan_entry_id: 'pe-r-or-411', quarter_id: 'Q2', target: 112.5, budget: 155000, approval_status: 'Approved' },
  { id: 'qp-r-or-411-q3', plan_entry_id: 'pe-r-or-411', quarter_id: 'Q3', target: 112.5, budget: 155000, approval_status: 'Approved' },
  { id: 'qp-r-or-411-q4', plan_entry_id: 'pe-r-or-411', quarter_id: 'Q4', target: 112.5, budget: 155000, approval_status: 'Approved' },

  // Somali Region
  { id: 'qp-r-so-111-q1', plan_entry_id: 'pe-r-so-111', quarter_id: 'Q1', target: 950, budget: 662500, approval_status: 'Approved' },
  { id: 'qp-r-so-111-q2', plan_entry_id: 'pe-r-so-111', quarter_id: 'Q2', target: 950, budget: 662500, approval_status: 'Approved' },
  { id: 'qp-r-so-111-q3', plan_entry_id: 'pe-r-so-111', quarter_id: 'Q3', target: 950, budget: 662500, approval_status: 'Approved' },
  { id: 'qp-r-so-111-q4', plan_entry_id: 'pe-r-so-111', quarter_id: 'Q4', target: 950, budget: 662500, approval_status: 'Approved' },
  { id: 'qp-r-so-121-q1', plan_entry_id: 'pe-r-so-121', quarter_id: 'Q1', target: 2.25, budget: 1000000, approval_status: 'Approved' },
  { id: 'qp-r-so-121-q2', plan_entry_id: 'pe-r-so-121', quarter_id: 'Q2', target: 2.25, budget: 1000000, approval_status: 'Approved' },
  { id: 'qp-r-so-121-q3', plan_entry_id: 'pe-r-so-121', quarter_id: 'Q3', target: 2.25, budget: 1000000, approval_status: 'Approved' },
  { id: 'qp-r-so-121-q4', plan_entry_id: 'pe-r-so-121', quarter_id: 'Q4', target: 2.25, budget: 1000000, approval_status: 'Approved' },
  { id: 'qp-r-so-122-q1', plan_entry_id: 'pe-r-so-122', quarter_id: 'Q1', target: 1050, budget: 487500, approval_status: 'Approved' },
  { id: 'qp-r-so-122-q2', plan_entry_id: 'pe-r-so-122', quarter_id: 'Q2', target: 1050, budget: 487500, approval_status: 'Approved' },
  { id: 'qp-r-so-122-q3', plan_entry_id: 'pe-r-so-122', quarter_id: 'Q3', target: 1050, budget: 487500, approval_status: 'Approved' },
  { id: 'qp-r-so-122-q4', plan_entry_id: 'pe-r-so-122', quarter_id: 'Q4', target: 1050, budget: 487500, approval_status: 'Approved' },
  { id: 'qp-r-so-311-q1', plan_entry_id: 'pe-r-so-311', quarter_id: 'Q1', target: 400, budget: 325000, approval_status: 'Approved' },
  { id: 'qp-r-so-311-q2', plan_entry_id: 'pe-r-so-311', quarter_id: 'Q2', target: 400, budget: 325000, approval_status: 'Approved' },
  { id: 'qp-r-so-311-q3', plan_entry_id: 'pe-r-so-311', quarter_id: 'Q3', target: 400, budget: 325000, approval_status: 'Approved' },
  { id: 'qp-r-so-311-q4', plan_entry_id: 'pe-r-so-311', quarter_id: 'Q4', target: 400, budget: 325000, approval_status: 'Approved' },
];

export const INITIAL_QUARTERLY_ACTUALS: QuarterlyActual[] = [];

export const INITIAL_UOM_CONFIGS: UomFactorConfig[] = [
  { uom: '# of households', factor: 5 },
  { uom: '# of people reached', factor: 1 },
  { uom: '# of people trained', factor: 1 },
  { uom: '# of systems established', factor: 1 },
  { uom: '# of beneficiaries', factor: 1 },
  { uom: '# of campaigns', factor: 1 },
  { uom: '# of volunteers trained', factor: 1 },
  { uom: '# of events', factor: 1 },
  { uom: '# of water points', factor: 1 },
  { uom: '# of MHCP', factor: 1 },
];