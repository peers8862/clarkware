import * as React from 'react';
import { injectable } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets';
import {
  fetchSteps, createStep, completeStep,
  fetchCriteria, logResult, fetchResults,
  fetchDefects, dispositionDefect,
  STEP_TYPE_LABELS, RESULT_LABELS,
} from './inspection-api';
import type {
  AssemblyClass, InspectionResult, DefectDisposition,
  InspectionStep, InspectionPointResult, DefectRecord, IPCCriterion,
} from './inspection-api';

export const WORKMANSHIP_WIDGET_ID = 'clark-workmanship';

// ── State ─────────────────────────────────────────────────────────────────────

interface State {
  // Job context (set by clark:job-selected event)
  jobId: string | null;
  jobTitle: string | null;
  facilityId: string | null;
  workstationId: string | null;

  // Data
  steps: InspectionStep[];
  activeStepId: string | null;
  criteria: IPCCriterion[];
  results: InspectionPointResult[];  // results for active step
  defects: DefectRecord[];

  // Loading flags
  loading: boolean;
  loadingStep: boolean;

  // Error
  error: string | null;

  // New-step form
  showNewStep: boolean;
  newStepType: string;
  newAssemblyClass: AssemblyClass;
  creatingStep: boolean;
  newStepError: string | null;

  // Per-action flags
  submittingResult: string | null;   // criterionId being submitted
  completingStep: boolean;
  dispositioningDefect: string | null; // defectId being actioned
}

const INITIAL_STATE: State = {
  jobId: null, jobTitle: null, facilityId: null, workstationId: null,
  steps: [], activeStepId: null, criteria: [], results: [], defects: [],
  loading: false, loadingStep: false, error: null,
  showNewStep: false, newStepType: 'solder', newAssemblyClass: '2',
  creatingStep: false, newStepError: null,
  submittingResult: null, completingStep: false, dispositioningDefect: null,
};

// ── Widget ────────────────────────────────────────────────────────────────────

@injectable()
export class WorkmanshipWidget extends ReactWidget {
  static readonly ID = WORKMANSHIP_WIDGET_ID;
  static readonly LABEL = 'Workmanship';

  private state: State = { ...INITIAL_STATE };

  constructor() {
    super();
    this.id = WORKMANSHIP_WIDGET_ID;
    this.title.label = WorkmanshipWidget.LABEL;
    this.title.closable = false;
    this.update();

    window.addEventListener('clark:job-selected', (e) => {
      const { jobId, jobTitle, facilityId, workstationId } =
        (e as CustomEvent<{ jobId: string; jobTitle: string; facilityId?: string; workstationId?: string }>).detail;
      void this.loadJob(jobId, jobTitle, facilityId ?? null, workstationId ?? null);
    });
  }

  // ── Data loading ─────────────────────────────────────────────────────────

  private async loadJob(jobId: string, jobTitle: string, facilityId: string | null, workstationId: string | null): Promise<void> {
    this.state = {
      ...INITIAL_STATE,
      jobId, jobTitle, facilityId, workstationId,
      loading: true,
    };
    this.update();
    try {
      const [steps, defects] = await Promise.all([
        fetchSteps(jobId),
        fetchDefects(jobId),
      ]);
      // Auto-activate the most recent non-complete step, or the last step
      const activeStep = steps.find(s => s.status !== 'complete') ?? steps[steps.length - 1] ?? null;
      this.state = { ...this.state, steps, defects, loading: false };
      if (activeStep) {
        await this.loadStepDetail(activeStep.id);
      }
    } catch (e) {
      this.state = { ...this.state, loading: false, error: String(e) };
    }
    this.update();
  }

  private async loadStepDetail(stepId: string): Promise<void> {
    const step = this.state.steps.find(s => s.id === stepId);
    if (!step) return;
    this.state = { ...this.state, activeStepId: stepId, loadingStep: true, criteria: [], results: [] };
    this.update();
    try {
      const [criteria, results] = await Promise.all([
        fetchCriteria(step.assemblyClass, step.stepType),
        fetchResults(stepId),
      ]);
      this.state = { ...this.state, criteria, results, loadingStep: false };
    } catch (e) {
      this.state = { ...this.state, loadingStep: false, error: String(e) };
    }
    this.update();
  }

  private async reloadDefects(): Promise<void> {
    if (!this.state.jobId) return;
    try {
      const defects = await fetchDefects(this.state.jobId);
      this.state = { ...this.state, defects };
      this.update();
    } catch { /* non-critical */ }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  private async handleCreateStep(): Promise<void> {
    const { jobId, facilityId, workstationId, steps, newStepType, newAssemblyClass } = this.state;
    if (!jobId || !facilityId || !workstationId) return;
    this.state = { ...this.state, creatingStep: true, newStepError: null };
    this.update();
    try {
      const step = await createStep({
        jobId, facilityId, workstationId,
        stepIndex: steps.length,
        stepType: newStepType,
        assemblyClass: newAssemblyClass,
      });
      const newSteps = [...steps, step];
      this.state = { ...this.state, steps: newSteps, showNewStep: false, creatingStep: false };
      this.update();
      await this.loadStepDetail(step.id);
    } catch (e) {
      this.state = { ...this.state, creatingStep: false, newStepError: String(e) };
      this.update();
    }
  }

  private async handleLogResult(criterionId: string, result: InspectionResult): Promise<void> {
    const { activeStepId, jobId, facilityId, workstationId } = this.state;
    if (!activeStepId || !jobId || !facilityId || !workstationId) return;
    this.state = { ...this.state, submittingResult: criterionId };
    this.update();
    try {
      const outcome = await logResult({ stepId: activeStepId, jobId, facilityId, workstationId, criterionId, result });
      const newResults = [
        ...this.state.results.filter(r => r.criterionId !== criterionId),
        outcome.result,
      ];
      const newDefects = outcome.defect
        ? [...this.state.defects.filter(d => d.criterionId !== criterionId || d.status !== 'open'), outcome.defect]
        : this.state.defects;
      this.state = { ...this.state, results: newResults, defects: newDefects, submittingResult: null };
    } catch (e) {
      this.state = { ...this.state, submittingResult: null, error: String(e) };
    }
    this.update();
  }

  private async handleCompleteStep(): Promise<void> {
    const { activeStepId, jobId, facilityId, workstationId, steps } = this.state;
    if (!activeStepId || !jobId || !facilityId || !workstationId) return;
    this.state = { ...this.state, completingStep: true };
    this.update();
    try {
      const updated = await completeStep({ stepId: activeStepId, jobId, facilityId, workstationId });
      const newSteps = steps.map(s => s.id === activeStepId ? updated : s);
      this.state = { ...this.state, steps: newSteps, completingStep: false };
    } catch (e) {
      this.state = { ...this.state, completingStep: false, error: String(e) };
    }
    this.update();
  }

  private async handleDisposition(defectId: string, disposition: DefectDisposition): Promise<void> {
    const { jobId } = this.state;
    if (!jobId) return;
    this.state = { ...this.state, dispositioningDefect: defectId };
    this.update();
    try {
      const updated = await dispositionDefect({ defectId, jobId, disposition });
      const newDefects = this.state.defects.map(d => d.id === defectId ? updated : d);
      this.state = { ...this.state, defects: newDefects, dispositioningDefect: null };
    } catch (e) {
      this.state = { ...this.state, dispositioningDefect: null, error: String(e) };
    }
    this.update();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  protected render(): React.ReactNode {
    const { jobId, jobTitle, loading, error } = this.state;

    return (
      <div style={container}>
        <div style={header}>
          <span style={headerLabel}>Workmanship</span>
          {jobTitle && <span style={headerJob}>{jobTitle}</span>}
        </div>

        {error && (
          <div style={errorBanner} onClick={() => { this.state = { ...this.state, error: null }; this.update(); }}>
            {error} ✕
          </div>
        )}

        {!jobId && <p style={muted}>Select a job to begin inspection.</p>}
        {jobId && loading && <p style={muted}>Loading…</p>}
        {jobId && !loading && this.renderContent()}
      </div>
    );
  }

  private renderContent(): React.ReactNode {
    const { steps, facilityId } = this.state;
    const missingContext = !facilityId;

    return (
      <>
        {missingContext && (
          <div style={warnBanner}>
            Job context unavailable — please re-select the job from the jobs panel.
          </div>
        )}

        {this.renderStepBar(steps)}

        {this.state.showNewStep
          ? this.renderNewStepForm()
          : this.renderStepDetail()}

        {this.renderDefects()}
      </>
    );
  }

  // ── Step bar ──────────────────────────────────────────────────────────────

  private renderStepBar(steps: InspectionStep[]): React.ReactNode {
    const { activeStepId } = this.state;
    return (
      <div style={stepBar}>
        <div style={stepTabs}>
          {steps.length === 0 && <span style={muted}>No steps yet</span>}
          {steps.map((step, i) => {
            const isActive = step.id === activeStepId;
            return (
              <button
                key={step.id}
                style={stepTab(isActive, step.status)}
                onClick={() => { if (!isActive) void this.loadStepDetail(step.id); }}
              >
                {i + 1}. {STEP_TYPE_LABELS[step.stepType] ?? step.stepType}
                <span style={statusDot(step.status)} title={step.status} />
              </button>
            );
          })}
        </div>
        <button
          style={addBtn}
          disabled={this.state.showNewStep || this.state.creatingStep}
          onClick={() => { this.state = { ...this.state, showNewStep: true, newStepError: null }; this.update(); }}
          title="Add inspection step"
        >
          + Step
        </button>
      </div>
    );
  }

  // ── New step form ─────────────────────────────────────────────────────────

  private renderNewStepForm(): React.ReactNode {
    const { newStepType, newAssemblyClass, creatingStep, newStepError } = this.state;
    return (
      <div style={formCard}>
        <div style={formTitle}>New Inspection Step</div>

        {newStepError && <div style={errorInline}>{newStepError}</div>}

        <label style={labelStyle}>Step type</label>
        <select
          style={selectStyle}
          value={newStepType}
          disabled={creatingStep}
          onChange={(e) => { this.state = { ...this.state, newStepType: (e.target as HTMLSelectElement).value }; this.update(); }}
        >
          {Object.entries(STEP_TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        <label style={labelStyle}>IPC Assembly Class</label>
        <select
          style={selectStyle}
          value={newAssemblyClass}
          disabled={creatingStep}
          onChange={(e) => { this.state = { ...this.state, newAssemblyClass: (e.target as HTMLSelectElement).value as AssemblyClass }; this.update(); }}
        >
          <option value="1">Class 1 — General Electronics</option>
          <option value="2">Class 2 — Dedicated Service</option>
          <option value="3">Class 3 — High Reliability</option>
        </select>

        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          <button
            style={primaryBtn}
            disabled={creatingStep}
            onClick={() => void this.handleCreateStep()}
          >
            {creatingStep ? 'Creating…' : 'Create Step'}
          </button>
          <button
            style={smallBtn}
            disabled={creatingStep}
            onClick={() => { this.state = { ...this.state, showNewStep: false }; this.update(); }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Step detail ───────────────────────────────────────────────────────────

  private renderStepDetail(): React.ReactNode {
    const { activeStepId, steps, loadingStep, criteria, results } = this.state;
    if (!activeStepId) return <p style={muted}>Select a step above or add one to begin.</p>;

    const step = steps.find(s => s.id === activeStepId);
    if (!step) return null;

    if (loadingStep) return <p style={muted}>Loading criteria…</p>;

    // Latest result per criterionId
    const latestResults = new Map<string, InspectionPointResult>();
    for (const r of results) {
      const existing = latestResults.get(r.criterionId);
      if (!existing || r.recordedAt > existing.recordedAt) latestResults.set(r.criterionId, r);
    }

    const allLogged = criteria.length > 0 && criteria.every(c => latestResults.has(c.id));
    const isComplete = step.status === 'complete';

    return (
      <div style={stepDetailContainer}>
        {/* Step header */}
        <div style={stepDetailHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={stepDetailTitle}>
              {STEP_TYPE_LABELS[step.stepType] ?? step.stepType}
            </span>
            <span style={classBadge}>Class {step.assemblyClass}</span>
            <span style={statusBadge(step.status)}>{step.status}</span>
          </div>
          {!isComplete && allLogged && (
            <button
              style={successBtn}
              disabled={this.state.completingStep}
              onClick={() => void this.handleCompleteStep()}
            >
              {this.state.completingStep ? 'Completing…' : 'Complete Step'}
            </button>
          )}
          {isComplete && <span style={{ fontSize: '12px', color: '#22c55e' }}>Step complete</span>}
        </div>

        {/* Criteria list */}
        {criteria.length === 0 && (
          <p style={muted}>No criteria found for this step type.</p>
        )}
        {criteria.map(criterion => this.renderCriterion(criterion, step, latestResults.get(criterion.id) ?? null, isComplete))}
      </div>
    );
  }

  private renderCriterion(
    criterion: IPCCriterion,
    step: InspectionStep,
    logged: InspectionPointResult | null,
    stepComplete: boolean,
  ): React.ReactNode {
    const { submittingResult } = this.state;
    const submitting = submittingResult === criterion.id;
    const cls = step.assemblyClass;

    return (
      <div key={criterion.id} style={criterionCard(logged)}>
        {/* Criterion header */}
        <div style={criterionHeader}>
          <span style={criterionName}>{criterion.name}</span>
          <span style={ipcRef}>IPC §{criterion.ipcSection}</span>
        </div>

        {/* Accept/reject for the class */}
        <div style={criterionAccept}>
          <span style={acceptLabel}>Accept:</span> {criterion.accept[cls]}
        </div>
        <div style={criterionReject}>
          <span style={rejectLabel}>Reject:</span> {criterion.reject[cls]}
        </div>

        {/* Logged result (if any) */}
        {logged && (
          <div style={loggedResult(logged.result)}>
            {RESULT_LABELS[logged.result]} — logged {new Date(logged.recordedAt).toLocaleTimeString()}
          </div>
        )}

        {/* Result buttons — available for re-logging unless step complete */}
        {!stepComplete && (
          <div style={resultButtons}>
            {(['Pass', 'Fail', 'ProcessIndicator', 'NotEvaluated'] as InspectionResult[]).map(r => (
              <button
                key={r}
                style={resultBtn(r, logged?.result === r)}
                disabled={submitting}
                onClick={() => void this.handleLogResult(criterion.id, r)}
              >
                {submitting && logged?.result !== r ? '…' : RESULT_LABELS[r]}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Defects ───────────────────────────────────────────────────────────────

  private renderDefects(): React.ReactNode {
    const { defects } = this.state;
    const open = defects.filter(d => d.status === 'open');
    if (open.length === 0) return null;

    return (
      <div style={defectsSection}>
        <div style={sectionLabel}>Open Defects ({open.length})</div>
        {open.map(defect => this.renderDefect(defect))}
      </div>
    );
  }

  private renderDefect(defect: DefectRecord): React.ReactNode {
    const { dispositioningDefect } = this.state;
    const busy = dispositioningDefect === defect.id;

    return (
      <div key={defect.id} style={defectCard}>
        <div style={defectDesc}>{defect.description}</div>
        <div style={defectMeta}>
          Criterion: {defect.criterionId} · Created {new Date(defect.createdAt).toLocaleTimeString()}
        </div>
        <div style={dispositionButtons}>
          {(['Repair', 'UseAsIs', 'Reject', 'CustomerWaiver'] as DefectDisposition[]).map(d => (
            <button
              key={d}
              style={dispBtn(d)}
              disabled={busy}
              onClick={() => void this.handleDisposition(defect.id, d)}
            >
              {busy ? '…' : d === 'UseAsIs' ? 'Use As-Is' : d === 'CustomerWaiver' ? 'Waiver' : d}
            </button>
          ))}
        </div>
      </div>
    );
  }
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const container: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', height: '100%',
  padding: '10px 14px', overflowY: 'auto',
  fontFamily: 'var(--theia-ui-font-family)',
};

const header: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px',
};

const headerLabel: React.CSSProperties = {
  fontWeight: 600, fontSize: '11px', textTransform: 'uppercase',
  letterSpacing: '0.05em', color: 'var(--theia-descriptionForeground)',
};

const headerJob: React.CSSProperties = {
  fontSize: '12px', color: 'var(--theia-foreground)', fontWeight: 500,
};

const errorBanner: React.CSSProperties = {
  padding: '6px 10px', marginBottom: '8px', fontSize: '11px', cursor: 'pointer',
  background: 'var(--theia-inputValidation-errorBackground)',
  color: 'var(--theia-errorForeground)',
  border: '1px solid var(--theia-inputValidation-errorBorder)',
  borderRadius: '3px',
};

const warnBanner: React.CSSProperties = {
  padding: '6px 10px', marginBottom: '8px', fontSize: '11px',
  background: 'var(--theia-inputValidation-warningBackground)',
  color: 'var(--theia-foreground)',
  border: '1px solid var(--theia-inputValidation-warningBorder)',
  borderRadius: '3px',
};

const errorInline: React.CSSProperties = {
  fontSize: '11px', color: 'var(--theia-errorForeground)', marginBottom: '6px',
};

const muted: React.CSSProperties = {
  color: 'var(--theia-descriptionForeground)', fontSize: '12px', margin: '0 0 8px 0',
};

const stepBar: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '6px',
  marginBottom: '10px', flexWrap: 'wrap',
};

const stepTabs: React.CSSProperties = {
  display: 'flex', gap: '4px', flexWrap: 'wrap', flex: 1,
};

function stepTab(active: boolean, status: string): React.CSSProperties {
  const completeColor = '#166534';
  return {
    display: 'flex', alignItems: 'center', gap: '4px',
    padding: '3px 9px', fontSize: '11px', cursor: 'pointer', borderRadius: '12px',
    border: `1px solid ${active ? 'var(--theia-focusBorder)' : 'var(--theia-border-color)'}`,
    background: active
      ? 'var(--theia-button-background)'
      : status === 'complete' ? completeColor : 'var(--theia-editor-background)',
    color: active || status === 'complete' ? '#fff' : 'var(--theia-foreground)',
    fontWeight: active ? 600 : 400,
  };
}

function statusDot(status: string): React.CSSProperties {
  const colors: Record<string, string> = { pending: '#f59e0b', in_progress: '#6366f1', complete: '#22c55e' };
  return {
    display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%',
    background: colors[status] ?? '#888',
  };
}

const addBtn: React.CSSProperties = {
  padding: '3px 9px', fontSize: '11px', cursor: 'pointer', borderRadius: '3px',
  background: 'var(--theia-secondaryButton-background)',
  color: 'var(--theia-secondaryButton-foreground)',
  border: '1px solid var(--theia-border-color)',
  flexShrink: 0,
};

const formCard: React.CSSProperties = {
  padding: '12px', marginBottom: '10px',
  background: 'var(--theia-editor-background)',
  border: '1px solid var(--theia-border-color)',
  borderRadius: '4px',
};

const formTitle: React.CSSProperties = {
  fontWeight: 600, fontSize: '12px', marginBottom: '10px',
  color: 'var(--theia-foreground)',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', marginBottom: '3px', marginTop: '8px',
  color: 'var(--theia-descriptionForeground)',
};

const selectStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '5px 8px', fontSize: '12px',
  background: 'var(--theia-input-background)',
  color: 'var(--theia-input-foreground)',
  border: '1px solid var(--theia-input-border, var(--theia-border-color))',
  borderRadius: '3px',
};

const stepDetailContainer: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px',
};

const stepDetailHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  marginBottom: '6px',
};

const stepDetailTitle: React.CSSProperties = {
  fontWeight: 600, fontSize: '13px', color: 'var(--theia-foreground)',
};

const classBadge: React.CSSProperties = {
  fontSize: '10px', padding: '1px 6px', borderRadius: '10px',
  background: 'var(--theia-badge-background)',
  color: 'var(--theia-badge-foreground)',
};

function statusBadge(status: string): React.CSSProperties {
  const colors: Record<string, string> = { pending: '#f59e0b', in_progress: '#6366f1', complete: '#22c55e' };
  return {
    fontSize: '10px', padding: '1px 6px', borderRadius: '10px',
    background: colors[status] ?? '#888', color: '#fff',
  };
}

function criterionCard(logged: InspectionPointResult | null): React.CSSProperties {
  return {
    padding: '10px 12px',
    background: logged ? 'var(--theia-editor-background)' : 'var(--theia-sideBar-background)',
    border: `1px solid ${logged ? resultBorderColor(logged.result) : 'var(--theia-border-color)'}`,
    borderRadius: '4px',
    opacity: logged?.result === 'NotEvaluated' ? 0.7 : 1,
  };
}

function resultBorderColor(result: InspectionResult): string {
  switch (result) {
    case 'Pass': return '#166534';
    case 'Fail': return '#7f1d1d';
    case 'ProcessIndicator': return '#78350f';
    case 'NotEvaluated': return 'var(--theia-border-color)';
  }
}

const criterionHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '4px',
};

const criterionName: React.CSSProperties = {
  fontWeight: 600, fontSize: '12px', color: 'var(--theia-foreground)',
};

const ipcRef: React.CSSProperties = {
  fontSize: '10px', color: 'var(--theia-descriptionForeground)',
};

const criterionAccept: React.CSSProperties = {
  fontSize: '11px', color: '#16a34a', marginBottom: '2px',
};

const criterionReject: React.CSSProperties = {
  fontSize: '11px', color: '#dc2626', marginBottom: '6px',
};

const acceptLabel: React.CSSProperties = {
  fontWeight: 600,
};

const rejectLabel: React.CSSProperties = {
  fontWeight: 600,
};

function loggedResult(result: InspectionResult): React.CSSProperties {
  const colors: Record<InspectionResult, string> = {
    Pass: '#22c55e', Fail: '#ef4444', ProcessIndicator: '#f59e0b', NotEvaluated: '#94a3b8',
  };
  return {
    fontSize: '11px', fontWeight: 600, color: colors[result],
    marginBottom: '4px',
  };
}

const resultButtons: React.CSSProperties = {
  display: 'flex', gap: '4px', flexWrap: 'wrap',
};

function resultBtn(result: InspectionResult, active: boolean): React.CSSProperties {
  const styles: Record<InspectionResult, { bg: string; color: string }> = {
    Pass:             { bg: '#166534', color: '#dcfce7' },
    Fail:             { bg: '#7f1d1d', color: '#fee2e2' },
    ProcessIndicator: { bg: '#78350f', color: '#fef3c7' },
    NotEvaluated:     { bg: '#1e293b', color: '#94a3b8' },
  };
  const { bg, color } = styles[result];
  return {
    padding: '3px 9px', fontSize: '11px', cursor: 'pointer', borderRadius: '3px',
    background: active ? bg : 'var(--theia-editor-background)',
    color: active ? color : 'var(--theia-foreground)',
    border: `1px solid ${active ? bg : 'var(--theia-border-color)'}`,
    fontWeight: active ? 600 : 400,
  };
}

const sectionLabel: React.CSSProperties = {
  fontWeight: 600, fontSize: '11px', textTransform: 'uppercase',
  letterSpacing: '0.05em', color: 'var(--theia-descriptionForeground)',
  marginBottom: '6px',
};

const defectsSection: React.CSSProperties = {
  marginTop: '12px', paddingTop: '10px',
  borderTop: '1px solid var(--theia-border-color)',
};

const defectCard: React.CSSProperties = {
  padding: '8px 10px', marginBottom: '6px',
  background: 'var(--theia-editor-background)',
  border: '1px solid #7f1d1d',
  borderRadius: '4px',
};

const defectDesc: React.CSSProperties = {
  fontSize: '12px', color: '#ef4444', fontWeight: 500, marginBottom: '3px',
};

const defectMeta: React.CSSProperties = {
  fontSize: '10px', color: 'var(--theia-descriptionForeground)', marginBottom: '6px',
};

const dispositionButtons: React.CSSProperties = {
  display: 'flex', gap: '4px', flexWrap: 'wrap',
};

function dispBtn(disposition: DefectDisposition): React.CSSProperties {
  const styles: Record<DefectDisposition, { bg: string; color: string }> = {
    Repair:         { bg: '#1e3a5f', color: '#bfdbfe' },
    UseAsIs:        { bg: '#166534', color: '#dcfce7' },
    Reject:         { bg: '#7f1d1d', color: '#fee2e2' },
    CustomerWaiver: { bg: '#4a1d96', color: '#ede9fe' },
  };
  const { bg, color } = styles[disposition];
  return {
    padding: '2px 8px', fontSize: '10px', cursor: 'pointer', borderRadius: '3px',
    background: bg, color, border: 'none',
  };
}

const baseBtn: React.CSSProperties = {
  padding: '4px 10px', fontSize: '12px', cursor: 'pointer', borderRadius: '3px',
  border: '1px solid transparent',
};

const smallBtn: React.CSSProperties = {
  ...baseBtn,
  background: 'var(--theia-secondaryButton-background)',
  color: 'var(--theia-secondaryButton-foreground)',
  border: '1px solid var(--theia-border-color)',
};

const primaryBtn: React.CSSProperties = {
  ...baseBtn,
  background: 'var(--theia-button-background)',
  color: 'var(--theia-button-foreground)',
};

const successBtn: React.CSSProperties = {
  ...baseBtn,
  background: '#166534', color: '#dcfce7',
};
