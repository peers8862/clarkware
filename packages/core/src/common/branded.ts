declare const __brand: unique symbol;
type Brand<B> = { readonly [__brand]: B };
export type Branded<T, B> = T & Brand<B>;

export type FacilityId       = Branded<string, 'FacilityId'>;
export type ZoneId           = Branded<string, 'ZoneId'>;
export type WorkstationId    = Branded<string, 'WorkstationId'>;
export type JobId            = Branded<string, 'JobId'>;
export type TaskId           = Branded<string, 'TaskId'>;
export type IssueId          = Branded<string, 'IssueId'>;
export type ConversationId   = Branded<string, 'ConversationId'>;
export type MessageId        = Branded<string, 'MessageId'>;
export type NoteId           = Branded<string, 'NoteId'>;
export type ToolId           = Branded<string, 'ToolId'>;
export type MachineSessionId = Branded<string, 'MachineSessionId'>;
export type ArtifactId       = Branded<string, 'ArtifactId'>;
export type PersonId         = Branded<string, 'PersonId'>;
export type AgentId          = Branded<string, 'AgentId'>;
export type EventId          = Branded<string, 'EventId'>;

/**
 * Cast a raw string (e.g. uuid v7) to a branded ID type.
 * Only call at system boundaries — never in business logic.
 */
export const asId = <T>(s: string): T => s as unknown as T;
