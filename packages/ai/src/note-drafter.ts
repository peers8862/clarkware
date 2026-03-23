import { NoteType, ReviewState } from '@clark/core';
import { getAnthropicClient, MODEL } from './client.js';

export interface NoteDraftContext {
  jobId?: string;
  issueId?: string;
  workstationId?: string;
  existingNotes: string[];
  taskDescription?: string;
  noteType: NoteType;
}

export interface NoteDraft {
  body: string;
  noteType: NoteType;
  suggestedVisibilityScope: string;
  reviewState: ReviewState.PendingReview;
  generatedAt: Date;
}

function noteTypeStyleGuide(noteType: NoteType): string {
  switch (noteType) {
    case NoteType.Observation:
      return 'Write a factual, objective observation note. Focus on what was seen or measured without interpretation.';
    case NoteType.OperatorLog:
      return 'Write an operator log entry. Include what was done, when, and any notable conditions.';
    case NoteType.QualityNote:
      return 'Write a quality note. Reference specific measurements, tolerances, or quality criteria.';
    case NoteType.TestNote:
      return 'Write a test note. Include pass/fail status, test conditions, and relevant measurements.';
    case NoteType.ShiftHandoff:
      return 'Write a shift handoff note. Summarize open items, work completed, and what the next shift needs to know.';
    case NoteType.AIDraft:
      return 'Write a concise AI-generated draft note summarizing the context. Keep it factual.';
    case NoteType.ResolutionNote:
      return 'Write a resolution note. Describe what caused the issue and what was done to resolve it.';
    default:
      return 'Write a concise, professional operational note.';
  }
}

function suggestVisibilityScope(noteType: NoteType): string {
  switch (noteType) {
    case NoteType.ShiftHandoff:
      return 'shift_team';
    case NoteType.QualityNote:
      return 'quality_team';
    case NoteType.ResolutionNote:
      return 'facility';
    default:
      return 'workstation';
  }
}

export async function draftNote(ctx: NoteDraftContext): Promise<NoteDraft> {
  const client = getAnthropicClient();

  const contextParts: string[] = [];
  if (ctx.jobId) contextParts.push(`Job ID: ${ctx.jobId}`);
  if (ctx.issueId) contextParts.push(`Issue ID: ${ctx.issueId}`);
  if (ctx.workstationId) contextParts.push(`Workstation ID: ${ctx.workstationId}`);
  if (ctx.taskDescription) contextParts.push(`Task Description: ${ctx.taskDescription}`);

  const existingNotesText =
    ctx.existingNotes.length > 0
      ? `Existing Notes:\n${ctx.existingNotes.map((n) => `  - ${n}`).join('\n')}`
      : 'Existing Notes: (none)';

  const styleGuide = noteTypeStyleGuide(ctx.noteType);

  const userMessage =
    `Draft a ${ctx.noteType} note for the following context:\n` +
    contextParts.join('\n') +
    '\n' +
    existingNotesText +
    '\n\n' +
    `Style guide: ${styleGuide}\n` +
    'Keep the note concise (2–5 sentences) and professional.';

  const systemPrompt =
    'You are a manufacturing operations assistant for Clarkware. ' +
    'You help operators draft clear, professional notes for manufacturing jobs, issues, and workstations. ' +
    'Notes should be factual, concise, and appropriate for the manufacturing context.';

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude did not return a text block for note drafting');
  }

  return {
    body: textBlock.text.trim(),
    noteType: ctx.noteType,
    suggestedVisibilityScope: suggestVisibilityScope(ctx.noteType),
    reviewState: ReviewState.PendingReview,
    generatedAt: new Date(),
  };
}
