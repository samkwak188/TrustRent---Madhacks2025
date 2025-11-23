import sgMail from "@sendgrid/mail";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM =
  process.env.SENDGRID_FROM_EMAIL ||
  process.env.INVITE_FROM_EMAIL ||
  process.env.FROM_EMAIL;

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export type InvitationEmailPayload = {
  renterName: string;
  renterEmail: string;
  companyName: string;
  apartmentName: string;
  unitNumber: string;
  accessToken: string; // Simple 6-digit token
};

export async function sendInvitationEmail(
  payload: InvitationEmailPayload
): Promise<boolean> {
  console.log("=== SendGrid Email Attempt ===");
  console.log("API Key present:", !!SENDGRID_API_KEY);
  console.log("API Key first 10 chars:", SENDGRID_API_KEY?.substring(0, 10));
  console.log("From address:", EMAIL_FROM);
  console.log("To address:", payload.renterEmail);
  console.log("==============================");

  if (!SENDGRID_API_KEY || !EMAIL_FROM) {
    console.warn(
      "SENDGRID_API_KEY or email sender address missing; skipping real email send."
    );
    return false;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0f172a;">Welcome to TrustRent</h2>
      <p>Hi ${payload.renterName},</p>
      <p>${payload.companyName} has invited you to document your move-in inspection for <strong>${payload.apartmentName} – Unit ${payload.unitNumber}</strong>.</p>
      
      <div style="background: #f8fafc; padding: 24px; border-radius: 8px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">Your Access Token:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0f172a; margin: 0;">${payload.accessToken}</p>
      </div>
      
      <p><strong>How to use your token:</strong></p>
      <ol style="line-height: 1.8;">
        <li>Go to <strong>trustrent.app/access</strong></li>
        <li>Enter your token: <strong>${payload.accessToken}</strong></li>
        <li>Create your account and document your unit condition</li>
      </ol>
      
      <p style="color: #64748b; font-size: 14px;">This token is unique to your unit and will remain valid until you complete your inspection.</p>
      <p style="color: #64748b; font-size: 14px;">If you didn't expect this, please contact your property manager.</p>
      
      <p style="margin-top: 32px;">— The TrustRent Team</p>
    </div>
  `;

  try {
    const response = await sgMail.send({
      to: payload.renterEmail,
      from: EMAIL_FROM,
      subject: `Your TrustRent Access Token: ${payload.accessToken}`,
      html,
    });
    console.log("✅ SendGrid SUCCESS - Status:", response[0]?.statusCode);
    console.log("SendGrid Response:", JSON.stringify(response[0], null, 2));
    return true;
  } catch (error: any) {
    console.error("❌ SendGrid FAILED");
    console.error("Error code:", error?.code);
    console.error("Error message:", error?.message);
    console.error("Error response:", JSON.stringify(error?.response?.body, null, 2));
    return false;
  }
}

