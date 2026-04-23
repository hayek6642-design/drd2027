import twilio from 'twilio';

/**
 * 📲 Secure OTP Provider Service
 * Supports multiple OTP delivery modes: console (dev), WhatsApp (Twilio), SMS (Twilio)
 */
export async function sendAdminOtp(phone, otp) {
  const mode = process.env.OTP_MODE || "console";

  if (mode === "console") {
    console.log("🔐 ===============================");
    console.log("🔐 ADMIN OTP (DEV MODE)");
    console.log("📱 Phone:", phone);
    console.log("🔢 OTP CODE:", otp);
    console.log("⏳ Expires in: 5 minutes");
    console.log("🔐 ===============================");
    return { success: true, mode: "console" };
  }

  if (mode === "whatsapp") {
    return await sendWhatsAppOtp(phone, otp);
  }

  if (mode === "sms") {
    return await sendSMSOtp(phone, otp);
  }

  throw new Error('Invalid OTP mode');
}

/**
 * 📲 Unified OTP Provider for General Use
 * Supports multiple OTP delivery modes: console (dev), WhatsApp (Twilio), SMS (Twilio)
 */
export async function sendOTP({ phone, code }) {
  const mode = (process.env.OTP_MODE || "console").toLowerCase();

  if (mode === "console") {
    console.log("🔐 OTP:", code);
    return { success: true, mode: "console" };
  }

  if (mode === "whatsapp") {
    return await sendWhatsAppOtp(phone, code);
  }

  if (mode === "sms") {
    return await sendSMSOtp(phone, code);
  }

  console.warn(`⚠️ Unknown OTP mode: ${mode}, falling back to console`);
  console.log("🔐 OTP:", code);
  return { success: true, mode: "console_fallback" };
}

async function sendWhatsAppOtp(phone, otp) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured');
  }

  const client = twilio(accountSid, authToken);

  // 🛡️ Twilio Verify API check (Recommended for production)
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (verifyServiceSid && !verifyServiceSid.startsWith('VA12345')) {
    try {
      const verification = await client.verify.v2.services(verifyServiceSid)
        .verifications
        .create({ to: phone, channel: 'whatsapp' });
      return { success: true, sid: verification.sid, mode: "verify-whatsapp" };
    } catch (err) {
      console.warn('⚠️ Twilio Verify failed, falling back to standard message:', err.message);
    }
  }

  const message = await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886",
    to: `whatsapp:${phone}`,
    body: `🔐 Bankode OTP: ${otp}\n⏳ Valid for 5 minutes`
  });

  return { success: true, sid: message.sid, mode: "whatsapp" };
}

async function sendSMSOtp(phone, otp) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured');
  }

  const client = twilio(accountSid, authToken);

  // 🛡️ Twilio Verify API check (Recommended for production)
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (verifyServiceSid && !verifyServiceSid.startsWith('VA12345')) {
    try {
      const verification = await client.verify.v2.services(verifyServiceSid)
        .verifications
        .create({ to: phone, channel: 'sms' });
      return { success: true, sid: verification.sid, mode: "verify-sms" };
    } catch (err) {
      console.warn('⚠️ Twilio Verify failed, falling back to standard message:', err.message);
    }
  }

  const message = await client.messages.create({
    body: `[Bankode Security] Your Admin OTP is: ${otp}. Valid for 5 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone
  });

  return { success: true, sid: message.sid, mode: "sms" };
}
