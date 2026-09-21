import assert from 'node:assert/strict';
import {
  activitySubjectHeading,
  buildActivityAlertContent,
  DEFAULT_ACTIVITY_ALERT_EMAILS,
  formatActorLabel,
  getActivityAlertRecipients,
} from './email';
import {
  activityAlertMiddleware,
  actorFromUserRecord,
  inferActivityAction,
  inferEntityType,
  inferSummary,
  shouldSendActivityAlert,
} from './activity-alerts';

function fakeReq(partial: {
  method?: string;
  path: string;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  user?: { id: number; role: string };
}) {
  return {
    method: partial.method || 'GET',
    path: partial.path,
    params: partial.params || {},
    body: partial.body || {},
    user: partial.user,
  } as any;
}

assert.deepEqual(
  getActivityAlertRecipients(undefined),
  [...DEFAULT_ACTIVITY_ALERT_EMAILS]
);
assert.deepEqual(
  getActivityAlertRecipients(''),
  [...DEFAULT_ACTIVITY_ALERT_EMAILS]
);
assert.deepEqual(
  getActivityAlertRecipients('ops@example.com,  alerts@example.com'),
  ['ops@example.com', 'alerts@example.com']
);

assert.equal(formatActorLabel({ firstName: undefined, name: 'Jane Worker' } as any), 'Jane Worker');
assert.equal(formatActorLabel({ username: 'jane' }), 'jane');
assert.equal(formatActorLabel(null), 'Unknown user');

assert.equal(activitySubjectHeading('login', 'session'), 'Login');
assert.equal(activitySubjectHeading('update', 'task'), 'Task updated');
assert.equal(activitySubjectHeading('create', 'material request'), 'Material request created');
assert.equal(activitySubjectHeading('delete', 'quick note'), 'Quick note deleted');

const loginEmail = buildActivityAlertContent({
  action: 'login',
  entityType: 'session',
  summary: 'Jane Worker',
  actor: { name: 'Jane Worker', email: 'jane@csrllc.net', role: 'worker' },
  timestamp: new Date('2026-09-21T14:50:00.000Z'),
});
assert.equal(loginEmail.subject, '[Deploy] Login: Jane Worker');
assert.match(loginEmail.text, /Who: Jane Worker \(jane@csrllc.net\) — worker/);
assert.match(loginEmail.text, /Action: login/);
assert.doesNotMatch(loginEmail.text, /password|sessionToken/i);
assert.doesNotMatch(loginEmail.html, /password|sessionToken/i);

const taskEmail = buildActivityAlertContent({
  action: 'update',
  entityType: 'task',
  summary: '#42 Fix leak',
  actor: { name: 'Jane Worker', email: 'jane@csrllc.net', role: 'worker' },
});
assert.equal(taskEmail.subject, '[Deploy] Task updated: #42 Fix leak');

assert.equal(shouldSendActivityAlert(fakeReq({ method: 'POST', path: '/api/auth/login' })), true);
assert.equal(shouldSendActivityAlert(fakeReq({ method: 'POST', path: '/api/tasks' })), true);
assert.equal(shouldSendActivityAlert(fakeReq({ method: 'DELETE', path: '/api/quick-notes' })), true);
assert.equal(shouldSendActivityAlert(fakeReq({ method: 'GET', path: '/api/tasks' })), false);
assert.equal(shouldSendActivityAlert(fakeReq({ method: 'POST', path: '/api/auth/logout' })), false);
assert.equal(shouldSendActivityAlert(fakeReq({ method: 'POST', path: '/api/test-email' })), false);
assert.equal(shouldSendActivityAlert(fakeReq({ method: 'PATCH', path: '/api/me/settings' })), false);

assert.equal(inferActivityAction(fakeReq({ method: 'POST', path: '/api/auth/login' })), 'login');
assert.equal(inferActivityAction(fakeReq({ method: 'POST', path: '/api/tasks' })), 'create');
assert.equal(inferActivityAction(fakeReq({ method: 'PUT', path: '/api/tasks/42' })), 'update');
assert.equal(inferActivityAction(fakeReq({ method: 'DELETE', path: '/api/tasks/42' })), 'delete');

assert.equal(inferEntityType('/api/auth/login'), 'session');
assert.equal(inferEntityType('/api/tasks/42'), 'task');
assert.equal(inferEntityType('/api/material-requests/9'), 'material request');
assert.equal(inferEntityType('/api/quick-notes/3'), 'quick note');
assert.equal(inferEntityType('/api/admin/users/4'), 'user');

assert.equal(
  inferSummary(fakeReq({ method: 'POST', path: '/api/auth/login' }), {
    user: { firstName: 'Jane', lastName: 'Worker', username: 'jane' },
    sessionToken: 'secret-token',
  }),
  'Jane Worker'
);
assert.equal(
  inferSummary(fakeReq({ method: 'PUT', path: '/api/tasks/42', params: { id: '42' } }), {
    id: 42,
    title: 'Fix leak',
  }),
  '#42 Fix leak'
);
assert.equal(
  inferSummary(fakeReq({ method: 'PUT', path: '/api/auth/change-password' }), {
    message: 'Password changed successfully',
    user: { username: 'jane' },
  }),
  'Password changed'
);

const actor = actorFromUserRecord({
  id: 1,
  firstName: 'Jane',
  lastName: 'Worker',
  username: 'jane',
  email: 'jane@csrllc.net',
  role: 'worker',
  password: 'should-not-be-copied',
} as any);
assert.equal(actor?.name, 'Jane Worker');
assert.equal((actor as any).password, undefined);

let nextCalled = false;
const mutatingReq = fakeReq({ method: 'POST', path: '/api/tasks' });
const mutatingRes: any = {
  statusCode: 201,
  json(body: unknown) { return body; },
  send(body: unknown) { return body; },
};
activityAlertMiddleware()(mutatingReq, mutatingRes, () => { nextCalled = true; });
assert.equal(nextCalled, true);
mutatingRes.json({ id: 42, title: 'Fix leak' });

const failedReq = fakeReq({ method: 'POST', path: '/api/tasks' });
const failedRes: any = {
  statusCode: 400,
  json(body: unknown) { return body; },
  send(body: unknown) { return body; },
};
activityAlertMiddleware()(failedReq, failedRes, () => undefined);
failedRes.json({ message: 'Invalid task data' });

console.log('activity-alert helper tests passed');
