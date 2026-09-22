import {Resend} from 'resend';

const resend=new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail({to,name,token}){
  const appUrl=(process.env.CLIENT_ORIGIN||'http://localhost:5173').replace(/\/$/,'');
  const resetUrl=`${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

  if(!process.env.RESEND_API_KEY){
    throw new Error('RESEND_API_KEY is not configured.');
  }

  const from=process.env.EMAIL_FROM||'Holy Bethel Dental Clinic <onboarding@resend.dev>';

  await resend.emails.send({
    from,
    to,
    subject:'Reset your DrPatientLog password',
    html:`
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
        <h2>Holy Bethel Dental Clinic</h2>
        <p>Hello ${String(name||'there').replace(/[<>&"]/g,'')}</p>
        <p>We received a request to reset your DrPatientLog password.</p>
        <p>
          <a href="${resetUrl}"
             style="display:inline-block;padding:12px 20px;background:#111827;color:#fff;text-decoration:none;border-radius:8px">
            Reset password
          </a>
        </p>
        <p>This link expires in 30 minutes.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `
  });
}