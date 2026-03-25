import * as React from 'react';
import { ReactWidget } from '@theia/core/lib/browser/widgets';
export declare const JOB_CONTEXT_WIDGET_ID = "clark-job-context";
interface JobContext {
    id: string;
    name: string;
    status: string;
    facilityId: string;
    workstationId: string;
}
export declare class JobContextWidget extends ReactWidget {
    static readonly ID = "clark-job-context";
    static readonly LABEL = "Job Context";
    private jobContext;
    constructor();
    setJobContext(ctx: JobContext | null): void;
    protected render(): React.ReactNode;
}
export {};
//# sourceMappingURL=job-context-widget.d.ts.map