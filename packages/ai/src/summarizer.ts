import { getAnthropicClient, MODEL } from './client.js';

export interface JobContext {
  jobId: string;
  title: string;
  description: string;
  status: string;
  recentNotes: string[];
  openIssues: { title: string; severity: string }[];
  jobType: string;
  facilityCode: string;
}

export interface JobSummary {
  summary: string;
  keyRisks: string[];
  suggestedActions: string[];
  generatedAt: Date;
}

export interface IssueContext {
  issueId: string;
  title: string;
  description: string;
  issueType: string;
  severity: string;
  status: string;
  notes: string[];
  facilityCode: string;
}

export interface IssueSummary {
  summary: string;
  likelyRootCauses: string[];
  recommendedActions: string[];
  generatedAt: Date;
}

const SYSTEM_PROMPT =
  'You are a manufacturing operations assistant for Clarkware. ' +
  'You help operators and supervisors understand the current state of jobs, issues, and workstations. ' +
  'Be concise, precise, and focused on actionable information.';

export async function summarizeJob(jobContext: JobContext): Promise<JobSummary> {
  const client = getAnthropicClient();

  const userMessage =
    `Summarize the following manufacturing job:\n` +
    `Job ID: ${jobContext.jobId}\n` +
    `Title: ${jobContext.title}\n` +
    `Type: ${jobContext.jobType}\n` +
    `Facility: ${jobContext.facilityCode}\n` +
    `Status: ${jobContext.status}\n` +
    `Description: ${jobContext.description}\n` +
    `Recent Notes:\n${jobContext.recentNotes.map((n) => `  - ${n}`).join('\n') || '  (none)'}\n` +
    `Open Issues:\n${
      jobContext.openIssues.length > 0
        ? jobContext.openIssues.map((i) => `  - [${i.severity}] ${i.title}`).join('\n')
        : '  (none)'
    }`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: 'job_summary',
        description: 'Structured summary of a manufacturing job',
        input_schema: {
          type: 'object' as const,
          properties: {
            summary: {
              type: 'string',
              description: 'A concise 2–4 sentence summary of the job status',
            },
            keyRisks: {
              type: 'array',
              items: { type: 'string' },
              description: 'Key risks or blockers identified',
            },
            suggestedActions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Suggested next actions for the operator or supervisor',
            },
          },
          required: ['summary', 'keyRisks', 'suggestedActions'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'job_summary' },
    messages: [{ role: 'user', content: userMessage }],
  });

  const toolUse = response.content.find((block) => block.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Claude did not return a tool_use block for job_summary');
  }

  const input = toolUse.input as {
    summary: string;
    keyRisks: string[];
    suggestedActions: string[];
  };

  return {
    summary: input.summary,
    keyRisks: input.keyRisks,
    suggestedActions: input.suggestedActions,
    generatedAt: new Date(),
  };
}

export async function summarizeIssue(issueContext: IssueContext): Promise<IssueSummary> {
  const client = getAnthropicClient();

  const userMessage =
    `Summarize the following manufacturing issue:\n` +
    `Issue ID: ${issueContext.issueId}\n` +
    `Title: ${issueContext.title}\n` +
    `Type: ${issueContext.issueType}\n` +
    `Severity: ${issueContext.severity}\n` +
    `Facility: ${issueContext.facilityCode}\n` +
    `Status: ${issueContext.status}\n` +
    `Description: ${issueContext.description}\n` +
    `Notes:\n${issueContext.notes.map((n) => `  - ${n}`).join('\n') || '  (none)'}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: 'issue_summary',
        description: 'Structured summary of a manufacturing issue',
        input_schema: {
          type: 'object' as const,
          properties: {
            summary: {
              type: 'string',
              description: 'A concise 2–4 sentence summary of the issue',
            },
            likelyRootCauses: {
              type: 'array',
              items: { type: 'string' },
              description: 'Likely root causes identified from the available context',
            },
            recommendedActions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Recommended actions to address the issue',
            },
          },
          required: ['summary', 'likelyRootCauses', 'recommendedActions'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'issue_summary' },
    messages: [{ role: 'user', content: userMessage }],
  });

  const toolUse = response.content.find((block) => block.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Claude did not return a tool_use block for issue_summary');
  }

  const input = toolUse.input as {
    summary: string;
    likelyRootCauses: string[];
    recommendedActions: string[];
  };

  return {
    summary: input.summary,
    likelyRootCauses: input.likelyRootCauses,
    recommendedActions: input.recommendedActions,
    generatedAt: new Date(),
  };
}
