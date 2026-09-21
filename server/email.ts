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

const DEFAULT_ACTIVITY_ALERT_EMAILS = [
  "info@csrllc.net",
  "ilias@csrllc.net",
  "geodiac@aol.com",
  "billing@csrllc.net",
];

export type ActivityAction = "created" | "edited";

export interface ActivityActor {
  name?: string | null;
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

export function getActivityAlertRecipients(): string[] {
  const raw = process.env.ACTIVITY_ALERT_EMAILS;
  if (raw && raw.trim()) {
    const parsed = raw.split(",").map((email) => email.trim()).filter(Boolean);
    if (parsed.length > 0) {
      return parsed;
    }
  }
  return DEFAULT_ACTIVITY_ALERT_EMAILS;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeEmailText(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
}

function formatActorLabel(actor?: ActivityActor | null): string {
  if (!actor) return "Unknown user";
  const name = sanitizeEmailText(actor.name) || "Unknown user";
  const parts = [name];
  const email = sanitizeEmailText(actor.email);
  const role = sanitizeEmailText(actor.role);
  if (email) parts.push(`<${email}>`);
  if (role) parts.push(`(${role})`);
  return parts.join(" ");
}

export function formatActivitySummary(parts: Array<string | number | null | undefined>, maxLength = 80): string {
  const summary = parts
    .map((part) => (part === null || part === undefined ? "" : sanitizeEmailText(String(part))))
    .filter(Boolean)
    .join(" ");
  if (summary.length <= maxLength) return summary;
  return `${summary.slice(0, maxLength - 1)}…`;
}

/**
 * Email all activity-alert recipients after a successful create or edit.
 * Never throws — missing SendGrid or mail errors are logged and skipped.
 */
export async function sendActivityAlert(params: ActivityAlertParams): Promise<boolean> {
  try {
    const recipients = getActivityAlertRecipients();
    if (recipients.length === 0) {
      console.warn("No activity alert recipients configured, skipping email send");
      return false;
    }

    const action = params.action === "edited" ? "edited" : "created";
    const entityType = sanitizeEmailText(params.entityType) || "Entry";
    const summary = formatActivitySummary([params.summary]);
    const timestamp = params.timestamp || new Date();
    const actorLabel = formatActorLabel(params.actor);
    const subject = `[Deploy] Entry ${action}: ${entityType}${summary ? ` ${summary}` : ""}`;
    const from = process.env.FROM_EMAIL || "ilias@csrllc.net";

    const html = `
      <h2>Entry ${escapeHtml(action)}</h2>
      <p>An entry was ${escapeHtml(action)} in Deploy.</p>
      <p><strong>Who:</strong> ${escapeHtml(actorLabel)}</p>
      <p><strong>Action:</strong> ${escapeHtml(action)}</p>
      <p><strong>Entity:</strong> ${escapeHtml(entityType)}</p>
      <p><strong>Summary:</strong> ${escapeHtml(summary || "—")}</p>
      <p><strong>When:</strong> ${escapeHtml(timestamp.toISOString())}</p>
      <p>Please check the Deploy app for full details.</p>
    `;

    const text = [
      `Entry ${action}`,
      `Who: ${actorLabel}`,
      `Action: ${action}`,
      `Entity: ${entityType}`,
      `Summary: ${summary || "—"}`,
      `When: ${timestamp.toISOString()}`,
      "Check the Deploy app for details.",
    ].join("\n");

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
  } catch (error) {
    console.warn("Activity alert email failed:", error);
    return false;
  }
}

/** Fire-and-forget wrapper so create/edit APIs never wait on mail. */
export function queueActivityAlert(params: ActivityAlertParams): void {
  void sendActivityAlert(params).catch((error) => {
    console.warn("Activity alert email failed:", error);
  });
}