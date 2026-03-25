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
const defaultForm = () => ({
    title: '', description: '', jobType: 'general', priority: 'medium',
    humanRef: '', workstationId: '', submitting: false, error: null,
});
let ClarkWidget = ClarkWidget_1 = class ClarkWidget extends widgets_1.ReactWidget {
    constructor() {
        super();
        this.appState = { phase: 'init' };
        this.form = defaultForm();
        this.id = exports.CLARK_WIDGET_ID;
        this.title.label = ClarkWidget_1.LABEL;
        this.title.closable = false;
        this.update();
        setTimeout(() => this.initialize(), 0);
        window.addEventListener('clark:jobs-changed', () => {
            if (this.appState.phase === 'ready') {
                this.refreshJobs();
            }
        });
    }
    async initialize() {
        if (!(0, clark_api_1.getToken)()) {
            await this.doLogin();
            if (this.appState.phase === 'error')
                return;
        }
        this.appState = { phase: 'loading-jobs' };
        this.update();
        try {
            const [jobs, workstations] = await Promise.all([(0, clark_api_1.fetchJobs)(), (0, clark_api_1.fetchWorkstations)()]);
            this.appState = { phase: 'ready', jobs, workstations, selectedJobId: null, showCreateForm: false };
        }
        catch (e) {
            const msg = String(e);
            if (msg.includes('401')) {
                (0, clark_api_1.clearSession)();
                await this.doLogin();
                if (!(0, clark_api_1.getToken)())
                    return;
                this.appState = { phase: 'loading-jobs' };
                this.update();
                try {
                    const [jobs, workstations] = await Promise.all([(0, clark_api_1.fetchJobs)(), (0, clark_api_1.fetchWorkstations)()]);
                    this.appState = { phase: 'ready', jobs, workstations, selectedJobId: null, showCreateForm: false };
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
    async refreshJobs() {
        try {
            const jobs = await (0, clark_api_1.fetchJobs)();
            if (this.appState.phase === 'ready') {
                this.appState = { ...this.appState, jobs };
                this.update();
            }
        }
        catch { /* silent */ }
    }
    handleJobClick(job) {
        if (this.appState.phase !== 'ready')
            return;
        this.appState = { ...this.appState, selectedJobId: job.id };
        this.update();
        (0, clark_api_1.selectJob)(job.id, job.title);
    }
    toggleCreateForm() {
        if (this.appState.phase !== 'ready')
            return;
        const showing = !this.appState.showCreateForm;
        this.appState = { ...this.appState, showCreateForm: showing };
        if (showing) {
            // Pre-select first workstation if none selected
            if (!this.form.workstationId && this.appState.workstations.length > 0) {
                this.form = { ...this.form, workstationId: this.appState.workstations[0].id };
            }
        }
        else {
            this.form = defaultForm();
        }
        this.update();
    }
    setFormField(key, value) {
        this.form = { ...this.form, [key]: value };
        this.update();
    }
    async handleCreateSubmit() {
        if (this.appState.phase !== 'ready')
            return;
        if (!this.form.title.trim()) {
            this.form = { ...this.form, error: 'Title is required' };
            this.update();
            return;
        }
        if (!this.form.workstationId) {
            this.form = { ...this.form, error: 'Workstation is required' };
            this.update();
            return;
        }
        const ws = this.appState.workstations.find(w => w.id === this.form.workstationId);
        if (!ws) {
            this.form = { ...this.form, error: 'Invalid workstation' };
            this.update();
            return;
        }
        this.form = { ...this.form, submitting: true, error: null };
        this.update();
        try {
            const created = await (0, clark_api_1.createJob)({
                title: this.form.title.trim(),
                facilityId: ws.facility_id,
                zoneId: ws.zone_id,
                workstationId: ws.id,
                description: this.form.description.trim() || undefined,
                jobType: this.form.jobType,
                priority: this.form.priority,
                humanRef: this.form.humanRef.trim() || undefined,
            });
            // Refresh list and select the new job
            const jobs = await (0, clark_api_1.fetchJobs)();
            this.appState = { ...this.appState, jobs, selectedJobId: created.id, showCreateForm: false };
            this.form = defaultForm();
            (0, clark_api_1.selectJob)(created.id, created.title);
            (0, clark_api_1.notifyJobListChanged)();
        }
        catch (e) {
            this.form = { ...this.form, submitting: false, error: String(e) };
        }
        this.update();
    }
    render() {
        return ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                        padding: '8px 16px',
                        borderBottom: '1px solid var(--theia-border-color)',
                        fontWeight: 600, fontSize: '14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }, children: [(0, jsx_runtime_1.jsx)("span", { children: "Clark IPE" }), this.appState.phase === 'ready' && ((0, jsx_runtime_1.jsx)("button", { style: createBtnStyle(this.appState.showCreateForm), onClick: () => this.toggleCreateForm(), title: this.appState.showCreateForm ? 'Cancel' : 'New job', children: this.appState.showCreateForm ? '✕' : '+ New Job' }))] }), (0, jsx_runtime_1.jsx)("div", { style: { flex: 1, overflow: 'auto', padding: '12px 16px' }, children: this.renderBody() })] }));
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
        const { jobs, selectedJobId, showCreateForm, workstations } = state;
        return ((0, jsx_runtime_1.jsxs)("div", { children: [showCreateForm && this.renderCreateForm(workstations), !showCreateForm && jobs.length === 0 && ((0, jsx_runtime_1.jsx)("p", { style: muted, children: "No jobs found. Use \"+ New Job\" to create one." })), jobs.length > 0 && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { style: sectionLabel, children: "Jobs" }), jobs.map(job => ((0, jsx_runtime_1.jsxs)("div", { onClick: () => this.handleJobClick(job), style: {
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
                            }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 500, fontSize: '13px' }, children: job.title }), (0, jsx_runtime_1.jsxs)("div", { style: { fontSize: '11px', marginTop: '3px', opacity: 0.7 }, children: [job.job_type, " \u00B7 ", job.priority, " \u00B7 ", (0, jsx_runtime_1.jsx)(StatusBadge, { status: job.status }), job.human_ref && (0, jsx_runtime_1.jsxs)("span", { children: [" \u00B7 ", job.human_ref] })] })] }, job.id)))] }))] }));
    }
    renderCreateForm(workstations) {
        const f = this.form;
        return ((0, jsx_runtime_1.jsxs)("div", { style: {
                background: 'var(--theia-editor-background)',
                border: '1px solid var(--theia-border-color)',
                borderRadius: '4px',
                padding: '14px',
                marginBottom: '16px',
            }, children: [(0, jsx_runtime_1.jsx)("div", { style: sectionLabel, children: "New Job" }), f.error && ((0, jsx_runtime_1.jsx)("div", { style: { color: 'var(--theia-errorForeground)', fontSize: '12px', marginBottom: '8px' }, children: f.error })), (0, jsx_runtime_1.jsx)("label", { style: labelStyle, children: "Title *" }), (0, jsx_runtime_1.jsx)("input", { style: inputStyle, value: f.title, placeholder: "e.g. Hydraulic Pump Rebuild", disabled: f.submitting, onChange: (e) => this.setFormField('title', e.target.value) }), (0, jsx_runtime_1.jsx)("label", { style: labelStyle, children: "Work Order # (optional)" }), (0, jsx_runtime_1.jsx)("input", { style: inputStyle, value: f.humanRef, placeholder: "e.g. WO-1042", disabled: f.submitting, onChange: (e) => this.setFormField('humanRef', e.target.value) }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: '10px' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { flex: 1 }, children: [(0, jsx_runtime_1.jsx)("label", { style: labelStyle, children: "Type" }), (0, jsx_runtime_1.jsx)("select", { style: inputStyle, value: f.jobType, disabled: f.submitting, onChange: (e) => this.setFormField('jobType', e.target.value), children: ['general', 'repair', 'calibration', 'inspection', 'assembly', 'test', 'maintenance'].map(t => ((0, jsx_runtime_1.jsx)("option", { value: t, children: t }, t))) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { flex: 1 }, children: [(0, jsx_runtime_1.jsx)("label", { style: labelStyle, children: "Priority" }), (0, jsx_runtime_1.jsx)("select", { style: inputStyle, value: f.priority, disabled: f.submitting, onChange: (e) => this.setFormField('priority', e.target.value), children: ['low', 'medium', 'high', 'critical'].map(p => ((0, jsx_runtime_1.jsx)("option", { value: p, children: p }, p))) })] })] }), (0, jsx_runtime_1.jsx)("label", { style: labelStyle, children: "Workstation *" }), (0, jsx_runtime_1.jsxs)("select", { style: inputStyle, value: f.workstationId, disabled: f.submitting, onChange: (e) => this.setFormField('workstationId', e.target.value), children: [workstations.length === 0 && (0, jsx_runtime_1.jsx)("option", { value: "", children: "No workstations available" }), workstations.map(ws => ((0, jsx_runtime_1.jsx)("option", { value: ws.id, children: ws.name }, ws.id)))] }), (0, jsx_runtime_1.jsx)("label", { style: labelStyle, children: "Description (optional)" }), (0, jsx_runtime_1.jsx)("textarea", { style: { ...inputStyle, height: '60px', resize: 'vertical' }, value: f.description, placeholder: "Brief description of the job\u2026", disabled: f.submitting, onChange: (e) => this.setFormField('description', e.target.value) }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: '8px', marginTop: '4px' }, children: [(0, jsx_runtime_1.jsx)("button", { style: { ...btnStyle, background: 'var(--theia-button-background)', color: 'var(--theia-button-foreground)' }, disabled: f.submitting, onClick: () => this.handleCreateSubmit(), children: f.submitting ? 'Creating…' : 'Create Job' }), (0, jsx_runtime_1.jsx)("button", { style: btnStyle, disabled: f.submitting, onClick: () => this.toggleCreateForm(), children: "Cancel" })] })] }));
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
const sectionLabel = {
    fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em',
    color: 'var(--theia-descriptionForeground)', marginBottom: '8px', fontWeight: 600,
};
const labelStyle = {
    display: 'block', fontSize: '11px', marginBottom: '3px', marginTop: '10px',
    color: 'var(--theia-descriptionForeground)',
};
const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: '5px 8px', fontSize: '12px',
    background: 'var(--theia-input-background)',
    color: 'var(--theia-input-foreground)',
    border: '1px solid var(--theia-input-border, var(--theia-border-color))',
    borderRadius: '3px',
};
const btnStyle = {
    padding: '4px 10px', fontSize: '12px', cursor: 'pointer',
    background: 'var(--theia-secondaryButton-background)',
    color: 'var(--theia-secondaryButton-foreground)',
    border: '1px solid var(--theia-border-color)',
    borderRadius: '3px',
};
function createBtnStyle(active) {
    return {
        padding: '3px 8px', fontSize: '11px', cursor: 'pointer', borderRadius: '3px',
        background: active ? 'transparent' : 'var(--theia-button-background)',
        color: active ? 'var(--theia-descriptionForeground)' : 'var(--theia-button-foreground)',
        border: `1px solid ${active ? 'var(--theia-border-color)' : 'transparent'}`,
    };
}
