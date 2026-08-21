import {
  StrategicPriority, NationalActivity, Region, Zone, Project, PlanEntry, Quarter, QuarterlyPlan, QuarterlyActual, UomFactorConfig,
} from '../types';

// ---------------------------------------------------------------------------
// Excel-backed starter data
// The workbook supplied for this revision is the source of truth for the
// national activities and for every Project/Region execution entry below.
// Child entries are linked to their parent National Activity by the shared
// national_activity_id. Parent target/budget values are the exact Excel
// national totals, and the child rows reconcile to those ceilings.
// ---------------------------------------------------------------------------

export const INITIAL_STRATEGIC_PRIORITIES: StrategicPriority[] = [
  {
    id: 'sp-1',
    code: 'SP1',
    name: 'ERCS Annual Operational Plan',
    objective: 'Excel-backed national, project and regional activity plan.',
  },
];

export const INITIAL_NATIONAL_ACTIVITIES: NationalActivity[] = [
  { id: 'na-1-1-1', strategic_priority_id: 'sp-1', code: '1.1.1', description: 'Emergency shelter and non-food item support / disaster-affected household relief activities.', uom: '# of households', responsibility: 'Both', annual_target: 16450, annual_budget: 11_600_000 },
  { id: 'na-1-1-2', strategic_priority_id: 'sp-1', code: '1.1.2', description: 'Emergency response and contingency planning activities at woreda, regional and project levels.', uom: '# of MHCP', responsibility: 'Both', annual_target: 5, annual_budget: 850_000 },
  { id: 'na-1-2-1', strategic_priority_id: 'sp-1', code: '1.2.1', description: 'Water-point construction/rehabilitation activities for disaster-affected and host communities.', uom: '# of water points', responsibility: 'Both', annual_target: 27, annual_budget: 12_200_000 },
  { id: 'na-1-2-2', strategic_priority_id: 'sp-1', code: '1.2.2', description: 'Provision of emergency health services, first aid and referrals to disaster-affected populations.', uom: '# of people reached', responsibility: 'Both', annual_target: 14700, annual_budget: 6_400_000 },
  { id: 'na-2-1-1', strategic_priority_id: 'sp-1', code: '2.1.1', description: 'Training of community members and volunteers on disaster risk reduction and preparedness.', uom: '# of people trained', responsibility: 'Both', annual_target: 920, annual_budget: 1_250_000 },
  { id: 'na-2-1-2', strategic_priority_id: 'sp-1', code: '2.1.2', description: 'Establishment/strengthening of early warning systems at community and woreda level.', uom: '# of systems established', responsibility: 'Both', annual_target: 12, annual_budget: 2_000_000 },
  { id: 'na-3-1-1', strategic_priority_id: 'sp-1', code: '3.1.1', description: 'Provision of nutrition support/supplementary feeding to malnourished and vulnerable groups.', uom: '# of beneficiaries', responsibility: 'Both', annual_target: 4700, annual_budget: 3_850_000 },
  { id: 'na-3-2-1', strategic_priority_id: 'sp-1', code: '3.2.1', description: 'Community-level awareness campaigns on health, hygiene and disease prevention.', uom: '# of campaigns', responsibility: 'Both', annual_target: 25, annual_budget: 1_020_000 },
  { id: 'na-4-1-1', strategic_priority_id: 'sp-1', code: '4.1.1', description: 'Recruitment and training of new RCRC volunteers on core competencies and code of conduct.', uom: '# of volunteers trained', responsibility: 'Both', annual_target: 900, annual_budget: 1_280_000 },
  { id: 'na-5-1-1', strategic_priority_id: 'sp-1', code: '5.1.1', description: 'Advocacy forums on migration and protection with government and partners.', uom: '# of events', responsibility: 'HQ', annual_target: 6, annual_budget: 400_000 },
];

export const INITIAL_REGIONS: Region[] = [
  { id: 'reg-1', name: 'Amhara' },
  { id: 'reg-2', name: 'Oromia' },
  { id: 'reg-3', name: 'Somali' },
];

export const INITIAL_ZONES: Zone[] = [];

export const INITIAL_PROJECTS: Project[] = [
  { id: 'proj-1', name: 'Project A' },
  { id: 'proj-2', name: 'Project B' },
  { id: 'proj-3', name: 'Project C' },
  { id: 'proj-4', name: 'Project D' },
];

export const INITIAL_PLAN_ENTRIES: PlanEntry[] = [
  // Project A
  { id: 'pe-pa-111', national_activity_id: 'na-1-1-1', scope_type: 'Project', project_id: 'proj-1', annual_target: 1200, annual_budget: 950_000, activity_code: '1.1.1_Project_A', activity_name: 'Distribute NFI Kits to IDP Households', activity_description: "Distribution of NFI kits to internally displaced households under the project's emergency response component.", approval_status: 'Approved' },
  { id: 'pe-pa-122', national_activity_id: 'na-1-2-2', scope_type: 'Project', project_id: 'proj-1', annual_target: 2500, annual_budget: 1_100_000, activity_code: '1.2.2_Project_A', activity_name: 'Deliver Mobile Health and First Aid Outreach', activity_description: 'Mobile health/first aid outreach to project-targeted communities.', approval_status: 'Approved' },
  { id: 'pe-pa-211', national_activity_id: 'na-2-1-1', scope_type: 'Project', project_id: 'proj-1', annual_target: 120, annual_budget: 300_000, activity_code: '2.1.1_Project_A', activity_name: 'Deliver DRR Training of Trainers (ToT) for Community Leaders', activity_description: 'ToT sessions on disaster risk reduction for community leaders under the project.', approval_status: 'Approved' },

  // Project B
  { id: 'pe-pb-121', national_activity_id: 'na-1-2-1', scope_type: 'Project', project_id: 'proj-2', annual_target: 6, annual_budget: 2_800_000, activity_code: '1.2.1_Project_B', activity_name: 'Rehabilitate Boreholes in Project Woredas', activity_description: "Rehabilitation of non-functional boreholes in the project's target woredas.", approval_status: 'Approved' },
  { id: 'pe-pb-311', national_activity_id: 'na-3-1-1', scope_type: 'Project', project_id: 'proj-2', annual_target: 900, annual_budget: 750_000, activity_code: '3.1.1_Project_B', activity_name: 'Provide Supplementary Feeding to Malnourished Children', activity_description: 'Supplementary feeding support to malnourished children under 5 and PLW.', approval_status: 'Approved' },
  { id: 'pe-pb-411', national_activity_id: 'na-4-1-1', scope_type: 'Project', project_id: 'proj-2', annual_target: 150, annual_budget: 210_000, activity_code: '4.1.1_Project_B', activity_name: 'Train and Deploy Community-Based Volunteers', activity_description: 'Recruitment and deployment of community volunteers to support project activities.', approval_status: 'Approved' },

  // Project C
  { id: 'pe-pc-111', national_activity_id: 'na-1-1-1', scope_type: 'Project', project_id: 'proj-3', annual_target: 950, annual_budget: 700_000, activity_code: '1.1.1_Project_C', activity_name: 'Provide Emergency Shelter and NFI Support', activity_description: 'Emergency shelter and NFI support to disaster-affected households in project areas.', approval_status: 'Approved' },
  { id: 'pe-pc-212', national_activity_id: 'na-2-1-2', scope_type: 'Project', project_id: 'proj-3', annual_target: 4, annual_budget: 900_000, activity_code: '2.1.2_Project_C', activity_name: 'Install Community Early Warning Alert Systems', activity_description: 'Installation of early warning alert systems in flood/drought-prone project woredas.', approval_status: 'Approved' },
  { id: 'pe-pc-321', national_activity_id: 'na-3-2-1', scope_type: 'Project', project_id: 'proj-3', annual_target: 10, annual_budget: 320_000, activity_code: '3.2.1_Project_C', activity_name: 'Conduct Hygiene Promotion Sessions', activity_description: "Community hygiene promotion sessions under the project's WASH component.", approval_status: 'Approved' },

  // Project D
  { id: 'pe-pd-112', national_activity_id: 'na-1-1-2', scope_type: 'Project', project_id: 'proj-4', annual_target: 2, annual_budget: 250_000, activity_code: '1.1.2_Project_D', activity_name: 'Update Woreda-Level Emergency Response Plans', activity_description: 'Development/update of woreda-level emergency response and contingency plans.', approval_status: 'Approved' },
  { id: 'pe-pd-122', national_activity_id: 'na-1-2-2', scope_type: 'Project', project_id: 'proj-4', annual_target: 3000, annual_budget: 1_050_000, activity_code: '1.2.2_Project_D', activity_name: 'Provide First Aid and Referral Services at Reception Centers', activity_description: 'First aid and referral services for migrants/returnees at reception centers.', approval_status: 'Approved' },
  { id: 'pe-pd-511', national_activity_id: 'na-5-1-1', scope_type: 'Project', project_id: 'proj-4', annual_target: 6, annual_budget: 400_000, activity_code: '5.1.1_Project_D', activity_name: 'Organize Migration and Protection Advocacy Forums', activity_description: 'Advocacy forums on migration and protection with government and partners.', approval_status: 'Approved' },

  // Amhara Region
  { id: 'pe-r-am-111', national_activity_id: 'na-1-1-1', scope_type: 'Regional', region_id: 'reg-1', annual_target: 4500, annual_budget: 3_200_000, activity_code: '1.1.1_Amhara', activity_name: 'Provide Non-Food Items (NFI) to Disaster-Affected Households', activity_description: 'Distribution of core relief NFI kits (blankets, jerry cans, kitchen sets, etc.) to households affected by disaster.', approval_status: 'Approved' },
  { id: 'pe-r-am-121', national_activity_id: 'na-1-2-1', scope_type: 'Regional', region_id: 'reg-1', annual_target: 12, annual_budget: 5_400_000, activity_code: '1.2.1_Amhara', activity_name: 'Construct/Rehabilitate Community Water Points', activity_description: 'Construction or rehabilitation of water points (boreholes, wells, water schemes) for disaster-affected and host communities.', approval_status: 'Approved' },
  { id: 'pe-r-am-211', national_activity_id: 'na-2-1-1', scope_type: 'Regional', region_id: 'reg-1', annual_target: 800, annual_budget: 950_000, activity_code: '2.1.1_Amhara', activity_name: 'Conduct Community-Based Disaster Risk Reduction (CBDRR) Training', activity_description: 'Training of community members and volunteers on disaster risk reduction and preparedness.', approval_status: 'Approved' },
  { id: 'pe-r-am-311', national_activity_id: 'na-3-1-1', scope_type: 'Regional', region_id: 'reg-1', annual_target: 2200, annual_budget: 1_800_000, activity_code: '3.1.1_Amhara', activity_name: 'Provide Nutrition Support to Vulnerable Groups', activity_description: 'Provision of nutrition support/supplementary feeding to malnourished and vulnerable groups.', approval_status: 'Approved' },
  { id: 'pe-r-am-411', national_activity_id: 'na-4-1-1', scope_type: 'Regional', region_id: 'reg-1', annual_target: 300, annual_budget: 450_000, activity_code: '4.1.1_Amhara', activity_name: 'Recruit and Train Community Volunteers', activity_description: 'Recruitment and training of new RCRC volunteers on core competencies and code of conduct.', approval_status: 'Approved' },

  // Oromia Region
  { id: 'pe-r-or-111', national_activity_id: 'na-1-1-1', scope_type: 'Regional', region_id: 'reg-2', annual_target: 6000, annual_budget: 4_100_000, activity_code: '1.1.1_Oromia', activity_name: 'Provide Non-Food Items (NFI) to Disaster-Affected Households', activity_description: 'Distribution of core relief NFI kits (blankets, jerry cans, kitchen sets, etc.) to households affected by disaster.', approval_status: 'Approved' },
  { id: 'pe-r-or-112', national_activity_id: 'na-1-1-2', scope_type: 'Regional', region_id: 'reg-2', annual_target: 3, annual_budget: 600_000, activity_code: '1.1.2_Oromia', activity_name: 'Develop Multi-Hazard Contingency Plan (MHCP)', activity_description: 'Development/update of multi-hazard contingency plans at national and regional level.', approval_status: 'Approved' },
  { id: 'pe-r-or-122', national_activity_id: 'na-1-2-2', scope_type: 'Regional', region_id: 'reg-2', annual_target: 5000, annual_budget: 2_300_000, activity_code: '1.2.2_Oromia', activity_name: 'Provide Emergency Health and First Aid Services', activity_description: 'Provision of emergency health services, first aid and referrals to disaster-affected populations.', approval_status: 'Approved' },
  { id: 'pe-r-or-212', national_activity_id: 'na-2-1-2', scope_type: 'Regional', region_id: 'reg-2', annual_target: 8, annual_budget: 1_100_000, activity_code: '2.1.2_Oromia', activity_name: 'Establish Community-Based Early Warning Systems', activity_description: 'Establishment/strengthening of early warning systems at community and woreda level.', approval_status: 'Approved' },
  { id: 'pe-r-or-321', national_activity_id: 'na-3-2-1', scope_type: 'Regional', region_id: 'reg-2', annual_target: 15, annual_budget: 700_000, activity_code: '3.2.1_Oromia', activity_name: 'Conduct Health and Hygiene Awareness Campaigns', activity_description: 'Community-level awareness campaigns on health, hygiene and disease prevention.', approval_status: 'Approved' },
  { id: 'pe-r-or-411', national_activity_id: 'na-4-1-1', scope_type: 'Regional', region_id: 'reg-2', annual_target: 450, annual_budget: 620_000, activity_code: '4.1.1_Oromia', activity_name: 'Recruit and Train Community Volunteers', activity_description: 'Recruitment and training of new RCRC volunteers on core competencies and code of conduct.', approval_status: 'Approved' },

  // Somali Region
  { id: 'pe-r-so-111', national_activity_id: 'na-1-1-1', scope_type: 'Regional', region_id: 'reg-3', annual_target: 3800, annual_budget: 2_650_000, activity_code: '1.1.1_Somali', activity_name: 'Provide Non-Food Items (NFI) to Disaster-Affected Households', activity_description: 'Distribution of core relief NFI kits (blankets, jerry cans, kitchen sets, etc.) to households affected by disaster.', approval_status: 'Approved' },
  { id: 'pe-r-so-121', national_activity_id: 'na-1-2-1', scope_type: 'Regional', region_id: 'reg-3', annual_target: 9, annual_budget: 4_000_000, activity_code: '1.2.1_Somali', activity_name: 'Construct/Rehabilitate Community Water Points', activity_description: 'Construction or rehabilitation of water points (boreholes, wells, water schemes) for disaster-affected and host communities.', approval_status: 'Approved' },
  { id: 'pe-r-so-122', national_activity_id: 'na-1-2-2', scope_type: 'Regional', region_id: 'reg-3', annual_target: 4200, annual_budget: 1_950_000, activity_code: '1.2.2_Somali', activity_name: 'Provide Emergency Health and First Aid Services', activity_description: 'Provision of emergency health services, first aid and referrals to disaster-affected populations.', approval_status: 'Approved' },
  { id: 'pe-r-so-311', national_activity_id: 'na-3-1-1', scope_type: 'Regional', region_id: 'reg-3', annual_target: 1600, annual_budget: 1_300_000, activity_code: '3.1.1_Somali', activity_name: 'Provide Nutrition Support to Vulnerable Groups', activity_description: 'Provision of nutrition support/supplementary feeding to malnourished and vulnerable groups.', approval_status: 'Approved' },
];

export const FISCAL_QUARTERS: Quarter[] = [
  { id: 'Q1', label: 'Q1 (Jul-Sep)' },
  { id: 'Q2', label: 'Q2 (Oct-Dec)' },
  { id: 'Q3', label: 'Q3 (Jan-Mar)' },
  { id: 'Q4', label: 'Q4 (Apr-Jun)' },
];

// The Excel workbook provides annual plan figures, not quarter-specific
// figures. Keep the quarterly tables empty so these values are entered by the
// specific Project/Regional coordinator instead of inventing a quarter.
export const INITIAL_QUARTERLY_PLANS: QuarterlyPlan[] = [];
export const INITIAL_QUARTERLY_ACTUALS: QuarterlyActual[] = [];

// The supplied Excel data uses many different UOM labels. A default factor of
// 1 preserves the existing beneficiary-conversion pipeline until the user
// intentionally configures another factor for a unit.
export const INITIAL_UOM_CONFIGS: UomFactorConfig[] = [
  { uom: '# of households', factor: 1 },
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
