import { MailService } from '@sendgrid/mail';

let mailService: MailService | null = null;

if (process.env.SENDGRID_API_KEY) {
  mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!mailService) {
    console.warn('SendGrid API key not configured, skipping email send');
    return false;
  }

  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendTaskNotification(assignedToEmail: string, taskTitle: string, creator: string) {
  const html = `
    <h2>New Task Assigned</h2>
    <p>You have been assigned a new task:</p>
    <h3>${taskTitle}</h3>
    <p>Created by: ${creator}</p>
    <p>Please check the Deploy app for full details.</p>
  `;
  
  return sendEmail({
    to: assignedToEmail,
    from: process.env.FROM_EMAIL || 'ilias@csrllc.net',
    subject: `New Task: ${taskTitle}`,
    html,
    text: `New Task Assigned: ${taskTitle}. Created by: ${creator}. Check the Deploy app for details.`
  });
}

export async function sendMaterialRequestNotification(emails: string[], materialType: string, creator: string) {
  const html = `
    <h2>New Material Request</h2>
    <p>A new material request has been submitted:</p>
    <h3>${materialType}</h3>
    <p>Requested by: ${creator}</p>
    <p>Please check the Deploy app for full details.</p>
  `;
  
  const promises = emails.map(email => sendEmail({
    to: email,
    from: process.env.FROM_EMAIL || 'ilias@csrllc.net',
    subject: `Material Request: ${materialType}`,
    html,
    text: `New Material Request: ${materialType}. Requested by: ${creator}. Check the Deploy app for details.`
  }));
  
  const results = await Promise.all(promises);
  return results.every(result => result);
}

export async function sendTaskStatusChangeNotification(emails: string[], taskTitle: string, taskId: number, newStatus: string, workerName: string) {
  const html = `
    <h2>Task Status Update</h2>
    <p>A task has been updated to <strong>"${newStatus}"</strong> status:</p>
    <h3>${taskTitle}</h3>
    <p><strong>Task ID:</strong> #${taskId}</p>
    <p><strong>Updated by:</strong> ${workerName}</p>
    <p><strong>New Status:</strong> ${newStatus}</p>
    <p>Please check the Deploy app for full details and to monitor progress.</p>
  `;
  
  const promises = emails.map(email => sendEmail({
    to: email,
    from: process.env.FROM_EMAIL || 'ilias@csrllc.net',
    subject: `Task Status Update: ${taskTitle} is now ${newStatus}`,
    html,
    text: `Task Status Update: ${taskTitle} (ID: #${taskId}) has been updated to "${newStatus}" by ${workerName}. Check the Deploy app for details.`
  }));
  
  const results = await Promise.all(promises);
  return results.every(result => result);
}

export type ActivityAction = 'login' | 'create' | 'update' | 'delete';

export interface ActivityActor {
  id?: number;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  role?: string | null;
}

export interface ActivityAlertParams {
  action: ActivityAction;
  entityType: string;
  summary: string;
  actor?: ActivityActor | null;
  timestamp?: Date;
}

export const DEFAULT_ACTIVITY_ALERT_EMAILS = [
  'info@csrllc.net',
  'ilias@csrllc.net',
  'geodiac@aol.com',
  'billing@csrllc.net',
] as const;

function fromAddress(): string {
  return process.env.FROM_EMAIL || 'ilias@csrllc.net';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(value: string, max: number): string {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function getActivityAlertRecipients(
  raw = process.env.ACTIVITY_ALERT_EMAILS
): string[] {
  if (!raw || !raw.trim()) {
    return [...DEFAULT_ACTIVITY_ALERT_EMAILS];
  }

  const parsed = raw
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : [...DEFAULT_ACTIVITY_ALERT_EMAILS];
}

export function formatActorLabel(actor?: ActivityActor | null): string {
  if (!actor) return 'Unknown user';
  const name = (actor.name || '').trim();
  if (name) return name;
  if (actor.username) return actor.username;
  if (actor.email) return actor.email;
  if (actor.id != null) return `User #${actor.id}`;
  return 'Unknown user';
}

export function activitySubjectHeading(action: ActivityAction, entityType: string): string {
  if (action === 'login') return 'Login';
  const entity = entityType.trim()
    ? entityType.charAt(0).toUpperCase() + entityType.slice(1)
    : 'Record';
  const verb = action === 'create' ? 'created' : action === 'update' ? 'updated' : 'deleted';
  return `${entity} ${verb}`;
}

export function buildActivityAlertContent(params: ActivityAlertParams): {
  subject: string;
  html: string;
  text: string;
} {
  const timestamp = (params.timestamp ?? new Date()).toISOString();
  const actorLabel = formatActorLabel(params.actor);
  const heading = activitySubjectHeading(params.action, params.entityType);
  const summary = (params.summary || params.entityType || 'activity').trim();
  const subject = `[Deploy] ${heading}: ${truncate(summary, 80)}`;

  const whoParts = [actorLabel];
  if (params.actor?.email && actorLabel !== params.actor.email) {
    whoParts.push(`(${params.actor.email})`);
  }
  if (params.actor?.role) {
    whoParts.push(`— ${params.actor.role}`);
  }
  const who = whoParts.join(' ');

  const text = [
    'Deploy activity alert',
    '',
    `Who: ${who}`,
    `Action: ${params.action}`,
    `Entity: ${params.entityType}`,
    `Summary: ${summary}`,
    `Time: ${timestamp}`,
  ].join('\n');

  const html = `
    <h2>Deploy activity alert</h2>
    <p><strong>Who:</strong> ${escapeHtml(who)}</p>
    <p><strong>Action:</strong> ${escapeHtml(params.action)}</p>
    <p><strong>Entity:</strong> ${escapeHtml(params.entityType)}</p>
    <p><strong>Summary:</strong> ${escapeHtml(summary)}</p>
    <p><strong>Time:</strong> ${escapeHtml(timestamp)}</p>
  `.trim();

  return { subject, html, text };
}

export async function sendActivityAlert(params: ActivityAlertParams): Promise<boolean> {
  const recipients = getActivityAlertRecipients();
  if (recipients.length === 0) {
    return false;
  }

  const { subject, html, text } = buildActivityAlertContent(params);
  const from = fromAddress();

  const results = await Promise.all(
    recipients.map((to) =>
      sendEmail({
        to,
        from,
        subject,
        html,
        text,
      })
    )
  );

  return results.every(Boolean);
}

/** Fire-and-forget wrapper — never rejects to the caller. */
export function queueActivityAlert(params: ActivityAlertParams): void {
  void sendActivityAlert(params).catch((error) => {
    console.error('Activity alert email failed:', error);
  });
}

export async function sendTaskCreatedNotificationToAdmins(
  adminEmails: string[], 
  taskTitle: string, 
  taskDescription: string | null,
  creatorName: string,
  category: string,
  priority: string,
  startDate: string
) {
  const html = `
    <h2>New Task Created</h2>
    <p>A new task has been created by <strong>${creatorName}</strong>:</p>
    <h3>${taskTitle}</h3>
    ${taskDescription ? `<p><strong>Description:</strong> ${taskDescription}</p>` : ''}
    <p><strong>Category:</strong> ${category}</p>
    <p><strong>Priority:</strong> ${priority}</p>
    <p><strong>Start Date:</strong> ${startDate}</p>
    <p>Please check the Deploy app for full details.</p>
  `;
  
  const promises = adminEmails.map(email => sendEmail({
    to: email,
    from: process.env.FROM_EMAIL || 'ilias@csrllc.net',
    subject: `New Task Created: ${taskTitle} by ${creatorName}`,
    html,
    text: `New Task Created: ${taskTitle} by ${creatorName}. Category: ${category}, Priority: ${priority}. Check the Deploy app for details.`
  }));
  
  const results = await Promise.all(promises);
  return results.every(result => result);
}