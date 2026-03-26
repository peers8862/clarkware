import { Event } from '@theia/core';

export const ICFXPublisher = Symbol('ICFXPublisher');

export type CFXConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface ICFXPublisher {
  /** Enqueue a CFX message for delivery. Returns immediately — delivery is guaranteed via the outbox. */
  publish(messageName: string, payload: object): void;

  /** Emits whenever the AMQP connection status changes. */
  readonly onConnectionChange: Event<CFXConnectionStatus>;

  /** Current broker connection status. */
  readonly connectionStatus: CFXConnectionStatus;
}

export const CFX_STATUS_PATH = '/services/clark-cfx-status';
