import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import type { DomainEvent } from '@clark/core';

// Map of streamId → Set of active WebSocket connections
const subscribers = new Map<string, Set<WebSocket>>();

/**
 * Subscribe a WebSocket connection to events from a stream.
 * Called from route handlers that need to fan out events.
 */
export function broadcastEvent(event: DomainEvent): void {
  const clients = subscribers.get(event.streamId);
  if (!clients) return;
  const payload = JSON.stringify(event);
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(payload);
    }
  }
}

export default async function realtimeRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/ws',
    { websocket: true },
    (socket: WebSocket, request) => {
      const streamId = (request.query as Record<string, string>)['stream'] ?? '';

      if (!streamId) {
        socket.close(1008, 'Missing stream query parameter');
        return;
      }

      // Register subscriber
      if (!subscribers.has(streamId)) {
        subscribers.set(streamId, new Set());
      }
      subscribers.get(streamId)!.add(socket);

      socket.on('close', () => {
        subscribers.get(streamId)?.delete(socket);
        if (subscribers.get(streamId)?.size === 0) {
          subscribers.delete(streamId);
        }
      });
    },
  );
}
