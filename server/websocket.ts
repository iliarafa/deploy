import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface WebSocketMessage {
  type: 'task_created' | 'material_request_created' | 'task_updated' | 'ping' | 'registration_request' | 'registration_reviewed' | 'user_created' | 'vacancy_created';
  data?: any;
  request?: any;
  user?: any;
  vacancy?: any;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  init(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws'
    });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('WebSocket client connected');
      this.clients.add(ws);

      ws.on('message', (message: string) => {
        try {
          const parsed: WebSocketMessage = JSON.parse(message);
          if (parsed.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send ping to verify connection
      ws.send(JSON.stringify({ type: 'connected' }));
    });
  }

  broadcast(message: WebSocketMessage) {
    if (!this.wss) return;

    const messageStr = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  notifyTaskCreated(task: any) {
    this.broadcast({
      type: 'task_created',
      data: task
    });
  }

  notifyMaterialRequestCreated(request: any) {
    this.broadcast({
      type: 'material_request_created',
      data: request
    });
  }
}

export const wsManager = new WebSocketManager();