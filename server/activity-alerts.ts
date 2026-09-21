import type { NextFunction, Request, Response } from 'express';
import {
  type ActivityAction,
  type ActivityActor,
  sendActivityAlert,
} from './email';

const SKIP_EXACT_PATHS = new Set([
  '/api/auth/logout',
  '/api/objects/upload',
  '/api/vacancy-images',
  '/api/test-email',
  '/api/me/nav-preferences',
  '/api/me/settings',
]);

function snippet(value?: string | null, max = 60): string {
  if (!value) return '';
  const trimmed = String(value).replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function asRecord(body: unknown): Record<string, any> | null {
  if (!body) return null;
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  if (typeof body === 'object' && !Buffer.isBuffer(body) && !Array.isArray(body)) {
    return body as Record<string, any>;
  }
  return null;
}

function titledId(id: string | number | undefined, title?: string | null): string {
  const label = snippet(title, 70);
  if (id != null && id !== '' && label) return `#${id} ${label}`;
  if (id != null && id !== '') return `#${id}`;
  return label;
}

function pathId(req: Request): string | undefined {
  const raw = req.params?.id;
  if (raw != null && raw !== '') return String(raw);
  const match = req.path.match(/\/(\d+)(?:\/|$)/);
  return match?.[1];
}

export function shouldSendActivityAlert(req: Request): boolean {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return false;
  }
  if (!req.path.startsWith('/api/')) {
    return false;
  }
  return !SKIP_EXACT_PATHS.has(req.path);
}

export function inferActivityAction(req: Request): ActivityAction {
  if (req.path === '/api/auth/login') return 'login';
  if (req.method === 'POST') return 'create';
  if (req.method === 'DELETE') return 'delete';
  return 'update';
}

export function inferEntityType(path: string): string {
  if (path === '/api/auth/login') return 'session';
  if (path === '/api/auth/change-password') return 'password';
  if (path === '/api/register' || path.includes('/registration-requests')) return 'registration';
  if (path.startsWith('/api/admin/users') || path === '/api/users/profile') return 'user';
  if (path.includes('/material-requests')) return 'material request';
  if (path.includes('/communications')) return 'communication';
  if (path.includes('/colab-messages')) return 'colab message';
  if (path.includes('/vacancies')) return 'vacancy';
  if (path.includes('/issues')) return 'issue';
  if (path.includes('/quick-notes')) return 'quick note';
  if (path.includes('/tasks')) return 'task';
  return 'record';
}

export function actorFromUserRecord(user?: {
  id?: number;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
  role?: string | null;
} | null): ActivityActor | null {
  if (!user) return null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return {
    id: user.id,
    name: name || null,
    username: user.username || null,
    email: user.email || null,
    role: user.role || null,
  };
}

export function inferSummary(req: Request, payload: Record<string, any> | null): string {
  const entity = payload?.user && typeof payload.user === 'object' ? payload.user : payload || {};
  const id = entity.id ?? pathId(req);

  if (req.path === '/api/auth/login') {
    const actor = actorFromUserRecord(entity);
    return [actor?.name, actor?.username].find(Boolean) || actor?.email || 'Successful login';
  }

  if (req.path === '/api/auth/change-password') {
    return 'Password changed';
  }

  if (req.path === '/api/register') {
    const body = req.body || {};
    const name = [body.firstName, body.lastName].filter(Boolean).join(' ').trim() || body.username;
    return name && body.email ? `${name} (${body.email})` : name || body.email || titledId(payload?.requestId, 'Registration request');
  }

  if (req.path.includes('/tasks/recurring/generate')) {
    const count = Array.isArray(payload?.tasks) ? payload.tasks.length : 0;
    return `Generated ${count} recurring task instance${count === 1 ? '' : 's'}`;
  }

  if (req.path.includes('/material-requests')) {
    return titledId(id, entity.materialType);
  }

  if (req.path.includes('/vacancies')) {
    const vacancyLabel = [entity.property, entity.apartmentNumber ? `Apt ${entity.apartmentNumber}` : '']
      .filter(Boolean)
      .join(' ');
    return titledId(id, vacancyLabel);
  }

  if (req.path.startsWith('/api/admin/users') || req.path === '/api/users/profile') {
    const name = [entity.firstName, entity.lastName].filter(Boolean).join(' ').trim();
    return titledId(id, name || entity.username || entity.email);
  }

  if (req.path.includes('/registration-requests')) {
    const name = [entity.firstName, entity.lastName].filter(Boolean).join(' ').trim() || entity.username;
    const status = entity.status ? ` (${entity.status})` : '';
    return `${titledId(id, name)}${status}`.trim();
  }

  if (req.path.includes('/issues')) {
    return titledId(id, entity.description || entity.category);
  }

  if (req.path.includes('/quick-notes') || req.path.includes('/colab-messages') || req.path.includes('/communications')) {
    return titledId(id, entity.content || entity.type);
  }

  if (req.path.includes('/tasks')) {
    return titledId(id, entity.title);
  }

  return titledId(id, entity.title || entity.name || entity.username || snippet(entity.content || entity.description || entity.message));
}

async function resolveActor(req: Request, payload: Record<string, any> | null): Promise<ActivityActor | null> {
  if (req.user?.id) {
    try {
      const { storage } = await import('./storage');
      const user = await storage.getUser(req.user.id);
      return actorFromUserRecord(user) ?? {
        id: req.user.id,
        role: req.user.role,
      };
    } catch {
      return {
        id: req.user.id,
        role: req.user.role,
      };
    }
  }

  if (payload?.user) {
    return actorFromUserRecord(payload.user);
  }

  if (req.path === '/api/register') {
    const body = req.body || {};
    return actorFromUserRecord({
      firstName: body.firstName,
      lastName: body.lastName,
      username: body.username,
      email: body.email,
      role: body.requestedRole,
    });
  }

  return null;
}

export async function emitActivityAlert(req: Request, body?: unknown): Promise<void> {
  const payload = asRecord(body);
  const actor = await resolveActor(req, payload);

  await sendActivityAlert({
    action: inferActivityAction(req),
    entityType: inferEntityType(req.path),
    summary: inferSummary(req, payload),
    actor,
  });
}

export function activityAlertMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!shouldSendActivityAlert(req)) {
      return next();
    }

    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    let queued = false;

    const queueIfSuccess = (body?: unknown) => {
      if (queued) return;
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      queued = true;
      void emitActivityAlert(req, body).catch((error) => {
        console.error('Activity alert email failed:', error);
      });
    };

    res.json = ((body?: any) => {
      queueIfSuccess(body);
      return originalJson(body);
    }) as typeof res.json;

    res.send = ((body?: any) => {
      queueIfSuccess(body);
      return originalSend(body);
    }) as typeof res.send;

    next();
  };
}
