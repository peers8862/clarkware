import type { DomainEvent, DomainEventType } from '@clark/core';

/**
 * A projector applies domain events to produce a read model.
 * Implement this interface to build projections (aggregates, read views, etc.).
 */
export interface Projector<TState> {
  /** Which event types this projector handles */
  readonly handledTypes: ReadonlyArray<DomainEventType>;

  /** Apply a single event to the current state, returning the new state */
  apply(state: TState, event: DomainEvent): TState;
}
