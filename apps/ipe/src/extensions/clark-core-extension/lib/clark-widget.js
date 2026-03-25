"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ClarkWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClarkWidget = exports.CLARK_WIDGET_ID = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const inversify_1 = require("@theia/core/shared/inversify");
const widgets_1 = require("@theia/core/lib/browser/widgets");
const clark_api_1 = require("./clark-api");
exports.CLARK_WIDGET_ID = 'clark-main-panel';
let ClarkWidget = ClarkWidget_1 = class ClarkWidget extends widgets_1.ReactWidget {
    constructor() {
        super();
        this.appState = { phase: 'init' };
        this.id = exports.CLARK_WIDGET_ID;
        this.title.label = ClarkWidget_1.LABEL;
        this.title.closable = false;
        this.update();
        // Kick off auth + job load after widget is attached
        setTimeout(() => this.initialize(), 0);
    }
    async initialize() {
        // Ensure we have a valid token
        if (!(0, clark_api_1.getToken)()) {
            await this.doLogin();
            if (this.appState.phase === 'error')
                return;
        }
        this.appState = { phase: 'loading-jobs' };
        this.update();
        try {
            const jobs = await (0, clark_api_1.fetchJobs)();
            this.appState = { phase: 'ready', jobs, selectedJobId: null };
        }
        catch (e) {
            const msg = String(e);
            // Stale token — clear and re-login once
            if (msg.includes('401')) {
                (0, clark_api_1.clearSession)();
                await this.doLogin();
                if (!(0, clark_api_1.getToken)())
                    return; // doLogin failed
                this.appState = { phase: 'loading-jobs' };
                this.update();
                try {
                    const jobs = await (0, clark_api_1.fetchJobs)();
                    this.appState = { phase: 'ready', jobs, selectedJobId: null };
                }
                catch (e2) {
                    this.appState = { phase: 'error', message: `Could not load jobs: ${String(e2)}` };
                }
            }
            else {
                this.appState = { phase: 'error', message: `Could not load jobs: ${msg}` };
            }
        }
        this.update();
    }
    async doLogin() {
        this.appState = { phase: 'logging-in' };
        this.update();
        try {
            await (0, clark_api_1.login)('admin', 'admin_dev_password');
        }
        catch (e) {
            this.appState = { phase: 'error', message: `Login failed: ${String(e)}` };
            this.update();
        }
    }
    handleJobClick(job) {
        if (this.appState.phase !== 'ready')
            return;
        this.appState = { ...this.appState, selectedJobId: job.id };
        this.update();
        (0, clark_api_1.selectJob)(job.id, job.title);
    }
    render() {
        return ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                        padding: '8px 16px',
                        borderBottom: '1px solid var(--theia-border-color)',
                        fontWeight: 600, fontSize: '14px',
                    }, children: "Clark Industrial Process Environment" }), (0, jsx_runtime_1.jsx)("div", { style: { flex: 1, overflow: 'auto', padding: '16px' }, children: this.renderBody() })] }));
    }
    renderBody() {
        const state = this.appState;
        if (state.phase === 'init' || state.phase === 'logging-in') {
            return (0, jsx_runtime_1.jsx)("p", { style: muted, children: "Connecting to Clark API\u2026" });
        }
        if (state.phase === 'loading-jobs') {
            return (0, jsx_runtime_1.jsx)("p", { style: muted, children: "Loading jobs\u2026" });
        }
        if (state.phase === 'error') {
            return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { style: { color: 'var(--theia-errorForeground)', fontSize: '13px' }, children: state.message }), (0, jsx_runtime_1.jsx)("button", { style: btnStyle, onClick: () => this.initialize(), children: "Retry" })] }));
        }
        const { jobs, selectedJobId } = state;
        if (jobs.length === 0) {
            return (0, jsx_runtime_1.jsx)("p", { style: muted, children: "No jobs found. Create a job to begin." });
        }
        return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--theia-descriptionForeground)', marginBottom: '8px' }, children: "Active Jobs" }), jobs.map(job => ((0, jsx_runtime_1.jsxs)("div", { onClick: () => this.handleJobClick(job), style: {
                        padding: '10px 12px',
                        marginBottom: '6px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: selectedJobId === job.id
                            ? 'var(--theia-list-activeSelectionBackground)'
                            : 'var(--theia-editor-background)',
                        color: selectedJobId === job.id
                            ? 'var(--theia-list-activeSelectionForeground)'
                            : 'var(--theia-foreground)',
                        border: '1px solid var(--theia-border-color)',
                    }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 500, fontSize: '13px' }, children: job.title }), (0, jsx_runtime_1.jsxs)("div", { style: { fontSize: '11px', marginTop: '3px', opacity: 0.7 }, children: [job.job_type, " \u00B7 ", job.priority, " \u00B7 ", (0, jsx_runtime_1.jsx)(StatusBadge, { status: job.status })] })] }, job.id)))] }));
    }
};
exports.ClarkWidget = ClarkWidget;
ClarkWidget.ID = exports.CLARK_WIDGET_ID;
ClarkWidget.LABEL = 'Clark';
exports.ClarkWidget = ClarkWidget = ClarkWidget_1 = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], ClarkWidget);
function StatusBadge({ status }) {
    const colors = {
        active: '#22c55e', draft: '#f59e0b', paused: '#6366f1',
        completed: '#64748b', voided: '#ef4444',
    };
    return ((0, jsx_runtime_1.jsx)("span", { style: { color: colors[status] ?? 'inherit' }, children: status }));
}
const muted = {
    color: 'var(--theia-descriptionForeground)', fontSize: '13px',
};
const btnStyle = {
    padding: '4px 10px', fontSize: '12px', cursor: 'pointer', marginTop: '8px',
};
