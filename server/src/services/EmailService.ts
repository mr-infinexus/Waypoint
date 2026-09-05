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

const transporter: Transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '1025', 10),
  secure: false,
  ignoreTLS: true,
});

export async function sendDisruptionAlert(params: DisruptionAlertParams): Promise<boolean> {
  const isDelay = params.type === 'delay';
  const subject = isDelay
    ? `[Waypoint Alert] Delay Notice: Service ${params.serviceNumber}`
    : `[Waypoint Alert] Cancellation Notice: Service ${params.serviceNumber}`;

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  const statusBadge = isDelay
    ? `<span style="display: inline-block; background-color: rgba(224,93,56,0.15); color: #f38d68; border: 1px solid rgba(224,93,56,0.35); padding: 5px 12px; border-radius: 8px; font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 600; text-transform: uppercase;">Delayed (${params.delayMinutes ?? 0}m)</span>`
    : `<span style="display: inline-block; background-color: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.35); padding: 5px 12px; border-radius: 8px; font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 600; text-transform: uppercase;">Cancelled</span>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Waypoint Transit Alert</title>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;600&family=Lexend:wght@400;600;800&display=swap" rel="stylesheet">
    </head>
    <body style="margin: 0; padding: 32px 16px; background-color: #1c2433; font-family: 'Lexend', sans-serif; color: #e5e5e5;">

      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
        style="max-width: 600px; margin: 0 auto; background-color: #1c202b; border: 1px solid #3d4354; border-radius: 16px; overflow: hidden;">

        <!-- Header -->
        <tr>
          <td style="padding: 24px 28px; border-bottom: 1px solid #3d4354;">
            <span style="font-size: 20px; font-weight: 800; color: #cba135;">👣 Waypoint</span>
            <span style="float: right; font-family: 'DM Mono', monospace; font-size: 10px; color: #cba135;
              border: 1px solid rgba(203,161,53,0.35); padding: 4px 10px; border-radius: 20px; text-transform: uppercase;">
              Alert
            </span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding: 28px;">

            <p style="margin: 0 0 6px 0; font-size: 16px; font-weight: 600; color: #e5e5e5;">
              Hi <span style="color: #cba135;">${params.travelerName}</span>,
            </p>
            <p style="margin: 0 0 22px 0; font-size: 14px; color: #a3a3a3; line-height: 1.6;">
              There's an update on one of your journeys. Here's what we know:
            </p>

            <!-- Service card -->
            <div style="background-color: #262b38; border: 1px solid #3d4354; border-radius: 12px; padding: 18px; margin-bottom: 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                style="border-bottom: 1px solid #3d4354; padding-bottom: 12px; margin-bottom: 14px;">
                <tr>
                  <td style="font-family: 'DM Mono', monospace; font-size: 17px; font-weight: 700; color: #fff;">
                    ${params.serviceNumber}
                  </td>
                  <td style="text-align: right;">${statusBadge}</td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size: 13px; color: #a3a3a3; width: 120px; padding: 4px 0;">Route</td>
                  <td style="font-size: 13px; color: #e5e5e5; font-weight: 500; padding: 4px 0;">
                    ${params.originStation} <span style="color: #cba135; margin: 0 4px;">→</span> ${params.destinationStation}
                  </td>
                </tr>
                ${params.newArrivalTime ? `
                <tr>
                  <td style="font-size: 13px; color: #a3a3a3; padding: 4px 0;">New arrival</td>
                  <td style="font-family: 'DM Mono', monospace; font-size: 13px; color: #f38d68; font-weight: 600; padding: 4px 0;">
                    ${new Date(params.newArrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>` : ''}
                ${params.description ? `
                <tr>
                  <td style="font-size: 13px; color: #a3a3a3; padding: 4px 0;">Reason</td>
                  <td style="font-size: 13px; color: #d9d9d9; line-height: 1.4; padding: 4px 0;">${params.description}</td>
                </tr>` : ''}
              </table>
            </div>

            <!-- Alternatives or status note -->
            ${params.hasAlternatives ? `
              <div style="background-color: rgba(203,161,53,0.08); border: 1px solid rgba(203,161,53,0.3);
                border-left: 4px solid #cba135; border-radius: 10px; padding: 16px 18px; margin-bottom: 24px;">
                <p style="margin: 0 0 6px 0; font-size: 14px; color: #cba135; font-weight: 700;">
                  Alternative routes found
                </p>
                <p style="margin: 0; font-size: 13px; color: #d9d9d9; line-height: 1.5;">
                  We found <strong style="color: #fff;">${params.alternativeCount || 1} alternative(s)</strong>
                  from your point of disruption.
                </p>
              </div>
              <div style="text-align: center; margin-bottom: 28px;">
                <a href="${clientUrl}/disruption/${params.itineraryId}"
                  style="background-color: #cba135; color: #1c202b; text-decoration: none;
                    padding: 13px 30px; border-radius: 10px; font-weight: 700; font-size: 13px; display: inline-block;">
                  View Alternatives →
                </a>
              </div>
            ` : `
              <div style="background-color: #262b38; border: 1px solid #3d4354; border-radius: 10px; padding: 14px 18px; margin-bottom: 22px;">
                <p style="margin: 0; font-size: 13px; color: #a3a3a3; line-height: 1.5;">
                  Your itinerary is still active. We'll send another update if anything else changes.
                </p>
              </div>
            `}

            <!-- Footer -->
            <div style="border-top: 1px solid #3d4354; padding-top: 18px;">
              <p style="margin: 0; font-family: 'DM Mono', monospace; font-size: 11px; color: #a3a3a3;">
                Booking ref: <span style="color: #cba135;">${params.itineraryId}</span>
              </p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #71717a;">
                Waypoint Transit System · Automated alert
              </p>
            </div>

          </td>
        </tr>
      </table>

    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: '"Waypoint Alerts" <alerts@waypoint.in>',
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
