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
var JobContextWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobContextWidget = exports.JOB_CONTEXT_WIDGET_ID = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const inversify_1 = require("@theia/core/shared/inversify");
const widgets_1 = require("@theia/core/lib/browser/widgets");
const clark_api_1 = require("./clark-api");
exports.JOB_CONTEXT_WIDGET_ID = 'clark-job-context';
let JobContextWidget = JobContextWidget_1 = class JobContextWidget extends widgets_1.ReactWidget {
    constructor() {
        super();
        this.state = { mode: 'idle' };
        this.actionError = null;
        this.actionInProgress = null; // which action is running
        this.id = exports.JOB_CONTEXT_WIDGET_ID;
        this.title.label = JobContextWidget_1.LABEL;
        this.title.closable = false;
        this.update();
        window.addEventListener('clark:job-selected', (e) => {
            const { jobId } = e.detail;
            this.loadJob(jobId);
        });
    }
    get currentJobId() {
        if (this.state.mode === 'ready' || this.state.mode === 'editing')
            return this.state.job.id;
        return null;
    }
    async loadJob(jobId) {
        this.state = { mode: 'loading' };
        this.actionError = null;
        this.update();
        try {
            const job = await (0, clark_api_1.fetchJob)(jobId);
            this.state = { mode: 'ready', job };
        }
        catch (e) {
            this.state = { mode: 'error', message: String(e) };
        }
        this.update();
    }
    async reloadCurrentJob() {
        const id = this.currentJobId;
        if (id)
            await this.loadJob(id);
    }
    // --- Actions ---
    async handleStart() {
        if (this.state.mode !== 'ready')
            return;
        const id = this.state.job.id;
        this.actionInProgress = 'start';
        this.actionError = null;
        this.update();
        try {
            await (0, clark_api_1.startJob)(id);
            (0, clark_api_1.notifyJobListChanged)();
            await this.reloadCurrentJob();
        }
        catch (e) {
            this.actionError = String(e);
        }
        this.actionInProgress = null;
        this.update();
    }
    async handleResume() {
        if (this.state.mode !== 'ready')
            return;
        const id = this.state.job.id;
        this.actionInProgress = 'resume';
        this.actionError = null;
        this.update();
        try {
            await (0, clark_api_1.resumeJob)(id);
            (0, clark_api_1.notifyJobListChanged)();
            await this.reloadCurrentJob();
        }
        catch (e) {
            this.actionError = String(e);
        }
        this.actionInProgress = null;
        this.update();
    }
    async handleReopen() {
        if (this.state.mode !== 'ready')
            return;
        const id = this.state.job.id;
        this.actionInProgress = 'reopen';
        this.actionError = null;
        this.update();
        try {
            await (0, clark_api_1.reopenJob)(id);
            (0, clark_api_1.notifyJobListChanged)();
            await this.reloadCurrentJob();
        }
        catch (e) {
            this.actionError = String(e);
        }
        this.actionInProgress = null;
        this.update();
    }
    async handleStatusChange(status) {
        if (this.state.mode !== 'ready')
            return;
        const id = this.state.job.id;
        this.actionInProgress = status;
        this.actionError = null;
        this.update();
        try {
            await (0, clark_api_1.updateJob)(id, { status });
            (0, clark_api_1.notifyJobListChanged)();
            await this.reloadCurrentJob();
        }
        catch (e) {
            this.actionError = String(e);
        }
        this.actionInProgress = null;
        this.update();
    }
    // --- Edit mode ---
    enterEditMode() {
        if (this.state.mode !== 'ready')
            return;
        const { job } = this.state;
        this.state = {
            mode: 'editing',
            job,
            draft: { title: job.title, description: job.description ?? '', priority: job.priority },
            saving: false,
            error: null,
        };
        this.update();
    }
    cancelEdit() {
        if (this.state.mode !== 'editing')
            return;
        this.state = { mode: 'ready', job: this.state.job };
        this.update();
    }
    setDraftField(key, value) {
        if (this.state.mode !== 'editing')
            return;
        this.state = { ...this.state, draft: { ...this.state.draft, [key]: value } };
        this.update();
    }
    async handleSaveEdit() {
        if (this.state.mode !== 'editing')
            return;
        const { job, draft } = this.state;
        if (!draft.title.trim()) {
            this.state = { ...this.state, error: 'Title is required' };
            this.update();
            return;
        }
        this.state = { ...this.state, saving: true, error: null };
        this.update();
        try {
            await (0, clark_api_1.updateJob)(job.id, {
                title: draft.title.trim(),
                description: draft.description.trim() || undefined,
                priority: draft.priority,
            });
            (0, clark_api_1.notifyJobListChanged)();
            await this.reloadCurrentJob();
        }
        catch (e) {
            this.state = { ...this.state, saving: false, error: String(e) };
            this.update();
        }
    }
    // --- Render ---
    render() {
        return ((0, jsx_runtime_1.jsx)("div", { style: { padding: '12px 16px' }, children: this.renderContent() }));
    }
    renderContent() {
        const s = this.state;
        if (s.mode === 'idle') {
            return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { style: sectionLabel, children: "Job Context" }), (0, jsx_runtime_1.jsx)("p", { style: muted, children: "No active job" })] }));
        }
        if (s.mode === 'loading') {
            return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { style: sectionLabel, children: "Job Context" }), (0, jsx_runtime_1.jsx)("p", { style: muted, children: "Loading\u2026" })] }));
        }
        if (s.mode === 'error') {
            return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { style: sectionLabel, children: "Job Context" }), (0, jsx_runtime_1.jsx)("p", { style: { color: 'var(--theia-errorForeground)', fontSize: '12px' }, children: s.message })] }));
        }
        if (s.mode === 'editing') {
            return this.renderEditForm(s.job, s.draft, s.saving, s.error);
        }
        // ready
        return this.renderJobView(s.job);
    }
    renderJobView(job) {
        const busy = this.actionInProgress !== null;
        return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }, children: [(0, jsx_runtime_1.jsx)("div", { style: sectionLabel, children: "Job Context" }), canEdit(job.status) && ((0, jsx_runtime_1.jsx)("button", { style: smallBtn, onClick: () => this.enterEditMode(), disabled: busy, children: "Edit" }))] }), this.actionError && ((0, jsx_runtime_1.jsx)("div", { style: { color: 'var(--theia-errorForeground)', fontSize: '12px', marginBottom: '8px' }, children: this.actionError })), (0, jsx_runtime_1.jsx)("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '14px' }, children: (0, jsx_runtime_1.jsx)("tbody", { children: jobRows(job).map(([label, value]) => ((0, jsx_runtime_1.jsxs)("tr", { style: { borderBottom: '1px solid var(--theia-border-color)' }, children: [(0, jsx_runtime_1.jsx)("td", { style: { padding: '5px 8px 5px 0', color: 'var(--theia-descriptionForeground)', whiteSpace: 'nowrap', verticalAlign: 'top' }, children: label }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '5px 0', color: 'var(--theia-foreground)', wordBreak: 'break-all' }, children: label === 'Status' ? (0, jsx_runtime_1.jsx)(StatusChip, { status: value }) : value })] }, label))) }) }), this.renderActions(job, busy)] }));
    }
    renderActions(job, busy) {
        const { status } = job;
        if (status === 'draft') {
            return ((0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', gap: '8px' }, children: (0, jsx_runtime_1.jsx)("button", { style: primaryBtn, disabled: busy, onClick: () => this.handleStart(), children: this.actionInProgress === 'start' ? 'Starting…' : 'Start Job' }) }));
        }
        if (status === 'active') {
            return ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' }, children: [(0, jsx_runtime_1.jsx)("button", { style: smallBtn, disabled: busy, onClick: () => this.handleStatusChange('paused'), children: this.actionInProgress === 'paused' ? '…' : 'Pause' }), (0, jsx_runtime_1.jsx)("button", { style: successBtn, disabled: busy, onClick: () => this.handleStatusChange('completed'), children: this.actionInProgress === 'completed' ? '…' : 'Complete' }), (0, jsx_runtime_1.jsx)("button", { style: dangerBtn, disabled: busy, onClick: () => this.handleStatusChange('voided'), children: this.actionInProgress === 'voided' ? '…' : 'Void' })] }));
        }
        if (status === 'paused') {
            return ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' }, children: [(0, jsx_runtime_1.jsx)("button", { style: primaryBtn, disabled: busy, onClick: () => this.handleResume(), children: this.actionInProgress === 'resume' ? '…' : 'Resume' }), (0, jsx_runtime_1.jsx)("button", { style: successBtn, disabled: busy, onClick: () => this.handleStatusChange('completed'), children: this.actionInProgress === 'completed' ? '…' : 'Complete' }), (0, jsx_runtime_1.jsx)("button", { style: dangerBtn, disabled: busy, onClick: () => this.handleStatusChange('voided'), children: this.actionInProgress === 'voided' ? '…' : 'Void' })] }));
        }
        if (status === 'completed' || status === 'voided') {
            return ((0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', gap: '8px' }, children: (0, jsx_runtime_1.jsx)("button", { style: smallBtn, disabled: busy, onClick: () => this.handleReopen(), children: this.actionInProgress === 'reopen' ? '…' : 'Reopen' }) }));
        }
        return null;
    }
    renderEditForm(job, draft, saving, error) {
        return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }, children: (0, jsx_runtime_1.jsx)("div", { style: sectionLabel, children: "Edit Job" }) }), error && ((0, jsx_runtime_1.jsx)("div", { style: { color: 'var(--theia-errorForeground)', fontSize: '12px', marginBottom: '8px' }, children: error })), (0, jsx_runtime_1.jsx)("label", { style: labelStyle, children: "Title *" }), (0, jsx_runtime_1.jsx)("input", { style: inputStyle, value: draft.title, disabled: saving, onChange: (e) => this.setDraftField('title', e.target.value) }), (0, jsx_runtime_1.jsx)("label", { style: labelStyle, children: "Priority" }), (0, jsx_runtime_1.jsx)("select", { style: inputStyle, value: draft.priority, disabled: saving, onChange: (e) => this.setDraftField('priority', e.target.value), children: ['low', 'medium', 'high', 'critical'].map(p => ((0, jsx_runtime_1.jsx)("option", { value: p, children: p }, p))) }), (0, jsx_runtime_1.jsx)("label", { style: labelStyle, children: "Description" }), (0, jsx_runtime_1.jsx)("textarea", { style: { ...inputStyle, height: '70px', resize: 'vertical' }, value: draft.description, disabled: saving, onChange: (e) => this.setDraftField('description', e.target.value) }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: '8px', marginTop: '10px' }, children: [(0, jsx_runtime_1.jsx)("button", { style: primaryBtn, disabled: saving, onClick: () => this.handleSaveEdit(), children: saving ? 'Saving…' : 'Save' }), (0, jsx_runtime_1.jsx)("button", { style: smallBtn, disabled: saving, onClick: () => this.cancelEdit(), children: "Cancel" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--theia-border-color)', fontSize: '11px', color: 'var(--theia-descriptionForeground)' }, children: ["ID: ", job.id] })] }));
    }
};
exports.JobContextWidget = JobContextWidget;
JobContextWidget.ID = exports.JOB_CONTEXT_WIDGET_ID;
JobContextWidget.LABEL = 'Job Context';
exports.JobContextWidget = JobContextWidget = JobContextWidget_1 = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], JobContextWidget);
// --- Helpers ---
function canEdit(status) {
    return status === 'draft' || status === 'active' || status === 'paused';
}
function jobRows(job) {
    const rows = [
        ['Title', job.title],
        ['Status', job.status],
        ['Type', job.job_type ?? '—'],
        ['Priority', job.priority],
    ];
    if (job.description)
        rows.push(['Description', job.description]);
    rows.push(['Workstation', job.workstation_id]);
    rows.push(['ID', job.id]);
    return rows;
}
function StatusChip({ status }) {
    const colors = {
        active: '#22c55e', draft: '#f59e0b', paused: '#6366f1',
        completed: '#64748b', voided: '#ef4444',
    };
    return (0, jsx_runtime_1.jsx)("span", { style: { color: colors[status] ?? 'inherit', fontWeight: 500 }, children: status });
}
// --- Styles ---
const sectionLabel = {
    fontWeight: 600, fontSize: '11px', textTransform: 'uppercase',
    letterSpacing: '0.05em', color: 'var(--theia-descriptionForeground)',
    margin: 0,
};
const muted = {
    color: 'var(--theia-descriptionForeground)', fontSize: '12px', margin: 0,
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
const baseBtn = {
    padding: '4px 10px', fontSize: '12px', cursor: 'pointer', borderRadius: '3px',
    border: '1px solid transparent',
};
const smallBtn = {
    ...baseBtn,
    background: 'var(--theia-secondaryButton-background)',
    color: 'var(--theia-secondaryButton-foreground)',
    border: '1px solid var(--theia-border-color)',
};
const primaryBtn = {
    ...baseBtn,
    background: 'var(--theia-button-background)',
    color: 'var(--theia-button-foreground)',
};
const successBtn = {
    ...baseBtn,
    background: '#166534',
    color: '#dcfce7',
};
const dangerBtn = {
    ...baseBtn,
    background: '#7f1d1d',
    color: '#fee2e2',
};
