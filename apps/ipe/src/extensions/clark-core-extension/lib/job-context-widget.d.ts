import * as React from 'react';
import { ReactWidget } from '@theia/core/lib/browser/widgets';
export declare const JOB_CONTEXT_WIDGET_ID = "clark-job-context";
export declare class JobContextWidget extends ReactWidget {
    static readonly ID = "clark-job-context";
    static readonly LABEL = "Job Context";
    private job;
    private loading;
    private error;
    constructor();
    private loadJob;
    protected render(): React.ReactNode;
    private renderJob;
}
