import { getAnthropicClient, MODEL } from './client.js';

export interface AlertInput {
  message: string;
  facilityId: string;
  workstationId?: string;
  jobId?: string;
  issueId?: string;
  severity: string;
}

export interface AlertRouting {
  conversationType: string;
  contextId: string;
  suggestedRecipientRoles: string[];
  urgency: 'immediate' | 'high' | 'normal';
  rationale: string;
  generatedAt: Date;
}

export async function routeAlert(alert: AlertInput): Promise<AlertRouting> {
  const client = getAnthropicClient();

  const contextParts: string[] = [
    `Facility ID: ${alert.facilityId}`,
    `Severity: ${alert.severity}`,
    `Alert Message: ${alert.message}`,
  ];
  if (alert.workstationId) contextParts.push(`Workstation ID: ${alert.workstationId}`);
  if (alert.jobId) contextParts.push(`Job ID: ${alert.jobId}`);
  if (alert.issueId) contextParts.push(`Issue ID: ${alert.issueId}`);

  const userMessage =
    `Route the following manufacturing alert to the appropriate conversation and actors:\n` +
    contextParts.join('\n');

  const systemPrompt =
    'You are a manufacturing operations routing assistant for Clarkware. ' +
    'Your job is to determine the most appropriate conversation type, context, recipient roles, ' +
    'and urgency level for incoming manufacturing alerts. ' +
    'Available conversation types: direct, workspace, job, issue, system, ai_assist. ' +
    'Available recipient roles: operator, supervisor, quality_engineer, technician, facility_manager, safety_officer. ' +
    'Urgency levels: immediate (safety/critical), high (production-blocking), normal (informational).';

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: systemPrompt,
    tools: [
      {
        name: 'alert_routing',
        description: 'Structured routing decision for a manufacturing alert',
        input_schema: {
          type: 'object' as const,
          properties: {
            conversationType: {
              type: 'string',
              description:
                'The conversation type to route to: direct, workspace, job, issue, system, or ai_assist',
            },
            contextId: {
              type: 'string',
              description:
                'The ID of the context to route to (job ID, issue ID, facility ID, etc.)',
            },
            suggestedRecipientRoles: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of role names that should receive this alert',
            },
            urgency: {
              type: 'string',
              enum: ['immediate', 'high', 'normal'],
              description: 'Urgency level for the alert',
            },
            rationale: {
              type: 'string',
              description: 'Brief explanation of why this routing decision was made',
            },
          },
          required: [
            'conversationType',
            'contextId',
            'suggestedRecipientRoles',
            'urgency',
            'rationale',
          ],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'alert_routing' },
    messages: [{ role: 'user', content: userMessage }],
  });

  const toolUse = response.content.find((block) => block.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Claude did not return a tool_use block for alert_routing');
  }

  const input = toolUse.input as {
    conversationType: string;
    contextId: string;
    suggestedRecipientRoles: string[];
    urgency: 'immediate' | 'high' | 'normal';
    rationale: string;
  };

  return {
    conversationType: input.conversationType,
    contextId: input.contextId,
    suggestedRecipientRoles: input.suggestedRecipientRoles,
    urgency: input.urgency,
    rationale: input.rationale,
    generatedAt: new Date(),
  };
}
