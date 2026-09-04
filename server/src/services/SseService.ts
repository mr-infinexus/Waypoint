import { Response } from 'express';

export interface DisruptionNotification {
  type: 'disruption' | 'resolved';
  itineraryId: string;
  serviceNumber?: string;
  reason?: string;
  message: string;
  pendingAlternativesCount?: number;
}

export class SseService {
  private static instance: SseService;
  private clients = new Map<string, Set<Response>>();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.startHeartbeat();
  }

  public static getInstance(): SseService {
    if (!SseService.instance) {
      SseService.instance = new SseService();
    }
    return SseService.instance;
  }

  public addClient(userId: string, res: Response): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.write(': connected\n\n');

    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(res);

    res.on('close', () => {
      this.removeClient(userId, res);
    });
  }

  private removeClient(userId: string, res: Response): void {
    const userClients = this.clients.get(userId);
    if (!userClients) return;

    userClients.delete(res);
    if (userClients.size === 0) {
      this.clients.delete(userId);
    }
  }

  public notifyUser(userId: string, eventName: string, data: DisruptionNotification): void {
    const userClients = this.clients.get(userId);
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

  public broadcast(eventName: string, data: unknown): void {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [userId, userClients] of this.clients) {
      for (const client of userClients) {
        try {
          client.write(payload);
        } catch {
          userClients.delete(client);
        }
      }
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      for (const [userId, userClients] of this.clients) {
        for (const client of userClients) {
          try {
            client.write(': heartbeat\n\n');
          } catch {
            userClients.delete(client);
          }
        }
        if (userClients.size === 0) {
          this.clients.delete(userId);
        }
      }
    }, 25000);
  }
}
