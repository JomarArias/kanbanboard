import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

export const sendInvitationEmail = async (toEmail: string, workspaceName: string, inviteUrl: string) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('SMTP credentials not configured, falling back to console logging.');
        console.log(`[EMAIL SIMULATION] To: ${toEmail} | Subject: Invitation to ${workspaceName} | Link: ${inviteUrl}`);
        return;
    }

    try {
        await transporter.sendMail({
            from: `"Kanban Board" <${process.env.SMTP_USER}>`,
            to: toEmail,
            subject: `Has sido invitado a unirte a ${workspaceName}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2>¡Hola!</h2>
                    <p>Has sido invitado a colaborar en el tablero de trabajo <strong>${workspaceName}</strong> en nuestra plataforma Kanban.</p>
                    <p>Para aceptar la invitación, haz clic en el siguiente botón:</p>
                    <a href="${inviteUrl}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #fff; background-color: #3B82F6; text-decoration: none; border-radius: 5px;">Aceptar Invitación</a>
                    <p style="margin-top: 20px; font-size: 12px; color: #777;">Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:</p>
                    <p style="font-size: 12px; color: #3B82F6;">${inviteUrl}</p>
                </div>
            `
        });
        console.log(`Email sent successfully to ${toEmail}`);
    } catch (error) {
        console.error('Error sending invitation email:', error);
        throw error;
    }
};
