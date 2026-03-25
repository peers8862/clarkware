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
var MessagingWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingWidget = exports.MESSAGING_WIDGET_ID = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const inversify_1 = require("@theia/core/shared/inversify");
const widgets_1 = require("@theia/core/lib/browser/widgets");
const clark_api_1 = require("clark-core-extension/lib/clark-api");
exports.MESSAGING_WIDGET_ID = 'clark-messaging';
let MessagingWidget = MessagingWidget_1 = class MessagingWidget extends widgets_1.ReactWidget {
    constructor() {
        super();
        this.messages = [];
        this.connected = false;
        this.ws = null;
        this.jobId = null;
        this.jobTitle = null;
        this.inputValue = '';
        this.id = exports.MESSAGING_WIDGET_ID;
        this.title.label = MessagingWidget_1.LABEL;
        this.title.closable = false;
        this.update();
        window.addEventListener('clark:job-selected', (e) => {
            const { jobId, jobTitle } = e.detail;
            this.connectToJob(jobId, jobTitle);
        });
    }
    connectToJob(jobId, jobTitle) {
        this.jobId = jobId;
        this.jobTitle = jobTitle;
        this.messages = [];
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        const token = (0, clark_api_1.getToken)();
        const wsUrl = `ws://localhost:3000/ws?stream=${encodeURIComponent(`job:${jobId}`)}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
        const ws = new WebSocket(wsUrl);
        ws.onopen = () => { this.connected = true; this.update(); };
        ws.onclose = () => { this.connected = false; this.ws = null; this.update(); };
        ws.onerror = () => { this.connected = false; this.update(); };
        ws.onmessage = (event) => {
            try {
                const ev = JSON.parse(event.data);
                if (ev.type === 'message.sent' && ev.payload.body) {
                    this.messages = [...this.messages, {
                            id: ev.id,
                            from: ev.actor.actorId,
                            body: ev.payload.body,
                            sentAt: ev.occurredAt,
                        }];
                    this.update();
                }
            }
            catch { /* ignore malformed */ }
        };
        this.ws = ws;
        this.update();
    }
    async send() {
        const body = this.inputValue.trim();
        if (!body || !this.jobId)
            return;
        const tempId = `pending-${Date.now()}`;
        this.messages = [...this.messages, {
                id: tempId, from: 'me', body, sentAt: new Date().toISOString(), pending: true,
            }];
        this.inputValue = '';
        this.update();
        try {
            await (0, clark_api_1.postNote)(this.jobId, body);
            // The WS broadcast will deliver the confirmed message; remove the pending one
            this.messages = this.messages.filter(m => m.id !== tempId);
        }
        catch (e) {
            this.messages = this.messages.map(m => m.id === tempId ? { ...m, pending: false, error: true } : m);
        }
        this.update();
    }
    render() {
        return ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', padding: '10px 14px' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }, children: [(0, jsx_runtime_1.jsxs)("span", { style: sectionLabel, children: ["Messages ", this.jobTitle ? `— ${this.jobTitle}` : ''] }), (0, jsx_runtime_1.jsx)("span", { style: {
                                width: '7px', height: '7px', borderRadius: '50%', display: 'inline-block',
                                background: this.connected ? '#22c55e' : '#64748b',
                            } }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: '10px', color: 'var(--theia-descriptionForeground)' }, children: this.jobId ? (this.connected ? 'live' : 'connecting…') : 'no job' })] }), (0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, overflowY: 'auto', marginBottom: '8px' }, children: [!this.jobId && (0, jsx_runtime_1.jsx)("p", { style: muted, children: "Select a job to see real-time events." }), this.jobId && this.messages.length === 0 && ((0, jsx_runtime_1.jsx)("p", { style: muted, children: "No messages yet." })), this.messages.map(msg => ((0, jsx_runtime_1.jsxs)("div", { style: {
                                padding: '5px 0',
                                borderBottom: '1px solid var(--theia-border-color)',
                                fontSize: '12px',
                                opacity: msg.pending ? 0.5 : 1,
                            }, children: [(0, jsx_runtime_1.jsxs)("span", { style: { fontWeight: 500, color: msg.error ? 'var(--theia-errorForeground)' : 'var(--theia-foreground)' }, children: [msg.from, ":", ' '] }), (0, jsx_runtime_1.jsx)("span", { style: { color: 'var(--theia-foreground)' }, children: msg.body }), msg.error && (0, jsx_runtime_1.jsx)("span", { style: { fontSize: '10px', color: 'var(--theia-errorForeground)', marginLeft: '4px' }, children: "(failed)" }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: '10px', color: 'var(--theia-descriptionForeground)' }, children: new Date(msg.sentAt).toLocaleTimeString() })] }, msg.id)))] }), this.jobId && ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: '6px' }, children: [(0, jsx_runtime_1.jsx)("input", { style: {
                                flex: 1, padding: '5px 8px', fontSize: '12px',
                                background: 'var(--theia-input-background)',
                                color: 'var(--theia-input-foreground)',
                                border: '1px solid var(--theia-input-border)',
                                borderRadius: '3px',
                            }, placeholder: "Send a note\u2026", value: this.inputValue, onChange: (e) => { this.inputValue = e.target.value; this.update(); }, onKeyDown: (e) => { if (e.key === 'Enter')
                                void this.send(); } }), (0, jsx_runtime_1.jsx)("button", { style: { padding: '5px 10px', fontSize: '12px', cursor: 'pointer' }, onClick: () => void this.send(), children: "Send" })] }))] }));
    }
};
exports.MessagingWidget = MessagingWidget;
MessagingWidget.ID = exports.MESSAGING_WIDGET_ID;
MessagingWidget.LABEL = 'Messages';
exports.MessagingWidget = MessagingWidget = MessagingWidget_1 = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], MessagingWidget);
const sectionLabel = {
    fontWeight: 600, fontSize: '11px', textTransform: 'uppercase',
    letterSpacing: '0.05em', color: 'var(--theia-descriptionForeground)', margin: 0,
};
const muted = {
    color: 'var(--theia-descriptionForeground)', fontSize: '12px', margin: 0,
};
