import nodemailer, { Transporter } from 'nodemailer';

export interface DisruptionAlertParams {
  toEmail: string;
  travelerName: string;
  type: 'delay' | 'cancellation';
  serviceNumber: string;
  originStation: string;
  destinationStation: string;
  description?: string;
  delayMinutes?: number;
  newArrivalTime?: Date | null;
  hasAlternatives: boolean;
  alternativeCount?: number;
  itineraryId: string;
}

export class EmailService {
  private static instance: EmailService;
  private transporter: Transporter;

  private constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025', 10),
      secure: false,
      ignoreTLS: true,
    });
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  public async sendDisruptionAlert(params: DisruptionAlertParams): Promise<boolean> {
    const isDelay = params.type === 'delay';
    const subject = isDelay
      ? `[Waypoint Alert] Delay Notice: Service ${params.serviceNumber}`
      : `[Waypoint Alert] Cancellation Notice: Service ${params.serviceNumber}`;

    const statusBadge = isDelay
      ? `<span style="background-color: #fef3c7; color: #b45309; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 12px; text-transform: uppercase;">Delayed (${params.delayMinutes ?? 0}m)</span>`
      : `<span style="background-color: #fee2e2; color: #b91c1c; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 12px; text-transform: uppercase;">Cancelled</span>`;

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: -0.5px;">Waypoint Transit Alert</h1>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Real-Time Multi-Modal Journey Updates</p>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 15px; color: #334155; margin-top: 0;">Hello <strong>${params.travelerName}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.5;">
            An operational disruption affects your scheduled travel:
          </p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="font-weight: 700; font-size: 16px; color: #0f172a;">${params.serviceNumber}</span>
              ${statusBadge}
            </div>
            <p style="margin: 6px 0; font-size: 13px; color: #64748b;">
              <strong>Route:</strong> ${params.originStation} → ${params.destinationStation}
            </p>
            ${params.newArrivalTime ? `<p style="margin: 6px 0; font-size: 13px; color: #64748b;"><strong>Revised Arrival:</strong> ${new Date(params.newArrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>` : ''}
            ${params.description ? `<p style="margin: 6px 0; font-size: 13px; color: #64748b;"><strong>Reason:</strong> ${params.description}</p>` : ''}
          </div>

          ${params.hasAlternatives ? `
            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 13px; color: #1e40af; font-weight: 600;">
                Action Required: Alternative Routes Available
              </p>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #3b82f6;">
                We found ${params.alternativeCount || 1} alternative route(s) starting from your breakdown point. Tap below to review and confirm your new itinerary without rebooking fees.
              </p>
            </div>
            <div style="text-align: center; margin: 24px 0;">
              <a href="http://localhost:5173/disruption/${params.itineraryId}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 13px; display: inline-block;">
                Review Alternatives & Rebook
              </a>
            </div>
          ` : `
            <p style="font-size: 13px; color: #64748b;">
              Your itinerary remains active. Please monitor Waypoint for further schedule updates.
            </p>
          `}

          <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            Booking Reference: ${params.itineraryId} • Waypoint Multi-Modal Transit System
          </p>
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: '"Waypoint Alerts" <alerts@waypoint.internal>',
        to: params.toEmail,
        subject,
        html: htmlContent,
      });
      return true;
    } catch (err) {
      console.warn('Failed to dispatch disruption email:', err);
      return false;
    }
  }
}
