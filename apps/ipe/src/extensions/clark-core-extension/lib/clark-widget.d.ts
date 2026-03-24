import * as React from 'react';
import { ReactWidget } from '@theia/core/lib/browser/widgets';
export declare const CLARK_WIDGET_ID = "clark-main-panel";
export declare class ClarkWidget extends ReactWidget {
    static readonly ID = "clark-main-panel";
    static readonly LABEL = "Clark";
    constructor();
    protected render(): React.ReactNode;
}
