import type { EventEnvelope } from './base-event.js';
import type { ToolId, WorkstationId, MachineSessionId, ArtifactId } from '../common/branded.js';
import type { IntegrationMode } from '../common/enums.js';

export type ToolAdapterConnectedEvent = EventEnvelope<
  'tool.adapter.connected',
  { readonly toolId: ToolId; readonly workstationId: WorkstationId; readonly integrationMode: IntegrationMode }
>;

export type TestRunImportedEvent = EventEnvelope<
  'test.run.imported',
  {
    readonly toolId: ToolId;
    readonly machineSessionId: MachineSessionId | null;
    readonly importFormat: 'csv' | 'json' | 'xml' | 'binary';
    readonly runLabel: string;
    readonly measurementCount: number;
    readonly passFailResult: 'pass' | 'fail' | 'inconclusive' | null;
    readonly rawArtifactId: ArtifactId | null;
  }
>;

export type CalibrationResultImportedEvent = EventEnvelope<
  'calibration.result.imported',
  {
    readonly toolId: ToolId;
    readonly runLabel: string;
    readonly passed: boolean;
    readonly rawArtifactId: ArtifactId | null;
  }
>;
