/**
 * CFX message name constants.
 * Standard CFX messages use the 'CFX.' prefix per IPC-2591.
 * Clark extension messages use 'com.clark.ipe.' prefix.
 */
export const CFX_MESSAGES = {
  // IPC-CFX standard (v1.0+)
  WORK_ORDER_SCHEDULED:    'CFX.WorkOrderScheduled',
  WORK_ORDER_STARTED:      'CFX.WorkOrderStarted',
  WORK_ORDER_COMPLETED:    'CFX.WorkOrderCompleted',
  UNIT_STARTED:            'CFX.UnitStarted',
  UNIT_COMPLETED:          'CFX.UnitCompleted',
  INSPECTION_COMPLETED:    'CFX.InspectionCompleted',
  NON_CONFORMANCE_CREATED: 'CFX.NonConformanceCreated',
  UNIT_REPAIRED:           'CFX.UnitRepaired',
  MATERIAL_INSTALLED:      'CFX.MaterialInstalled',

  // IPC-CFX v2.0 human workstation extensions
  OPERATOR_ACTIVITY:              'CFX.OperatorActivity',
  WORK_INSTRUCTION_COMPLETED:     'CFX.WorkInstructionCompleted',
  SIGNOFF_REQUIRED:               'CFX.SignoffRequired',
  SIGNOFF_COMPLETED:              'CFX.SignoffCompleted',

  // Clark proprietary extensions
  FIRMWARE_PROVISIONED: 'com.clark.ipe/FirmwareProvisioned',
} as const;
