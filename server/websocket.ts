import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { IncomingMessage } from 'http';
import { parse } from 'url';
import { storage } from './storage';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  username?: string;
  role?: string;
}

interface WebSocketMessage {
  type: 'task_created' | 'material_request_created' | 'task_updated' | 'ping' | 'registration_request' | 'registration_reviewed' | 'user_created' | 'vacancy_created' | 'colab_message' | 'colab_message_deleted' | 'task_status_change';
  data?: any;
  request?: any;
  user?: any;
  vacancy?: any;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<AuthenticatedWebSocket> = new Set();

  init(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws'
    });

    this.wss.on('connection', async (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
      try {
        // Parse URL to get authentication token
        const url = parse(req.url || '', true);
        const token = url.query.token as string;
        
        if (!token) {
          console.log('WebSocket connection rejected: No token provided');
          ws.close(1008, 'Authentication required');
          return;
        }

        // Validate session token using the same method as HTTP authentication
        const session = await storage.getValidSession(token);
        if (!session) {
          console.log('WebSocket connection rejected: Invalid or expired session');
          ws.close(1008, 'Invalid or expired session');
          return;
        }

        // Get user details
        const user = await storage.getUser(session.userId);
        if (!user || !user.isApproved || !user.isActive) {
          console.log('WebSocket connection rejected: User not authorized');
          ws.close(1008, 'User not authorized');
          return;
        }

        // Attach authenticated user info to the WebSocket
        ws.userId = user.id;
        ws.username = user.username;
        ws.role = user.role;
        
        console.log(`WebSocket client connected: ${user.username} (${user.role})`);
        this.clients.add(ws);
      } catch (error) {
        console.error('WebSocket authentication error:', error);
        ws.close(1011, 'Authentication failed');
        return;
      }

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

  notifyColabMessage(message: any) {
    this.broadcast({
      type: 'colab_message',
      data: message
    });
  }

  notifyColabMessageDeleted(messageId: number) {
    this.broadcast({
      type: 'colab_message_deleted',
      data: { messageId }
    });
  }
}

export const wsManager = new WebSocketManager();