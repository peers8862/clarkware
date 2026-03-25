import * as React from 'react';
import { ReactWidget } from '@theia/core/lib/browser/widgets';
export declare const JOB_CONTEXT_WIDGET_ID = "clark-job-context";
export declare class JobContextWidget extends ReactWidget {
    static readonly ID = "clark-job-context";
    static readonly LABEL = "Job Context";
    private state;
    private actionError;
    private actionInProgress;
    constructor();
    private get currentJobId();
    private loadJob;
    private reloadCurrentJob;
    private handleStart;
    private handleResume;
    private handleReopen;
    private handleStatusChange;
    private enterEditMode;
    private cancelEdit;
    private setDraftField;
    private handleSaveEdit;
    protected render(): React.ReactNode;
    private renderContent;
    private renderJobView;
    private renderActions;
    private renderEditForm;
}
