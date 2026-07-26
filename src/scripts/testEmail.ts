import { Resend } from "resend";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  console.log("Sending test email...");
  console.log("API Key:", process.env.RESEND_API_KEY?.slice(0, 10) + "...");
  console.log("From:", process.env.EMAIL_FROM);

  try {
    const result = await resend.emails.send({
      from: `KSI Gadgets <${process.env.EMAIL_FROM}>`,
      to: [process.env.TEST_EMAIL_TO || process.env.EMAIL_FROM || ""],
      subject: "KSI Gadgets - Email Test",
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px;">
          <h2 style="color: #667eea;">KSI Gadgets Email Test ✅</h2>
          <p>This is a test email confirming that the email service is working correctly.</p>
          <p>Sent via <strong>Resend</strong> from <strong>${process.env.EMAIL_FROM}</strong></p>
          <hr/>
          <small style="color: #999;">KSI Gadgets © ${new Date().getFullYear()}</small>
        </div>
      `,
    });

    if (result.error) {
      console.error("❌ Failed:", result.error);
    } else {
      console.log("✅ Email sent successfully! Message ID:", result.data?.id);
    }
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

testEmail();
