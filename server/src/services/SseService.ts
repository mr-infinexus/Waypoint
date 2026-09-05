import { Response } from 'express';

export interface DisruptionNotification {
  type: 'disruption' | 'resolved';
  itineraryId: string;
  serviceNumber?: string;
  reason?: string;
  message: string;
  pendingAlternativesCount?: number;
}

const clients = new Map<string, Set<Response>>();

export function addClient(userId: string, res: Response): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(': connected\n\n');

  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId)!.add(res);

  res.on('close', () => {
    removeClient(userId, res);
  });
}

function removeClient(userId: string, res: Response): void {
  const userClients = clients.get(userId);
  if (!userClients) return;

  userClients.delete(res);
  if (userClients.size === 0) {
    clients.delete(userId);
  }
}

export function notifyUser(userId: string, eventName: string, data: DisruptionNotification): void {
  const userClients = clients.get(userId);
  if (!userClients || userClients.size === 0) return;

  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of userClients) {
    try {
      client.write(payload);
    } catch {
      userClients.delete(client);
    }
  }
}

export function broadcast(eventName: string, data: unknown): void {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [userId, userClients] of clients) {
    for (const client of userClients) {
      try {
        client.write(payload);
      } catch {
        userClients.delete(client);
      }
    }
    if (userClients.size === 0) {
      clients.delete(userId);
    }
  }
}

setInterval(() => {
  for (const [userId, userClients] of clients) {
    for (const client of userClients) {
      try {
        client.write(': heartbeat\n\n');
      } catch {
        userClients.delete(client);
      }
    }
    if (userClients.size === 0) {
      clients.delete(userId);
    }
  }
}, 25000);
