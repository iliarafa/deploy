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