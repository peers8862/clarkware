import * as React from 'react';
import { ReactWidget } from '@theia/core/lib/browser/widgets';
export declare const MESSAGING_WIDGET_ID = "clark-messaging";
export declare class MessagingWidget extends ReactWidget {
    static readonly ID = "clark-messaging";
    static readonly LABEL = "Messages";
    private messages;
    private connected;
    private ws;
    private jobId;
    private jobTitle;
    private inputValue;
    constructor();
    private connectToJob;
    private send;
    protected render(): React.ReactNode;
}
