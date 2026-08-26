/**
 * FoundrySuite Website - Main JavaScript
 * Optimized and refactored for performance and maintainability
 * Form submission handled by Formspree (no backend required)
 */

// ============================================================================
// SECURITY MODULE - Input Validation & XSS Prevention
// ============================================================================

// Prefer FoundrySecurity (assets/js/core/security-manager.js) when present.
const Security = {
    sanitizeInput: (input) => {
        if (window.FoundrySecurity && typeof window.FoundrySecurity.sanitizeInput === 'function') {
            return window.FoundrySecurity.sanitizeInput(input);
        }
        if (typeof input !== 'string') return input;
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    },

    validateEmailSecure: (email) => {
        if (window.FoundrySecurity && typeof window.FoundrySecurity.validateEmail === 'function') {
            return window.FoundrySecurity.validateEmail(email);
        }
        if (!email || typeof email !== 'string') return false;
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (email.length > 254) return false;
        if (email.split('@').length !== 2) return false;
        const [localPart, domain] = email.split('@');
        if (localPart.length > 64 || domain.length > 253) return false;
        return emailRegex.test(email);
    },

    detectSQLInjection: (input) => {
        if (window.FoundrySecurity && typeof window.FoundrySecurity.detectSqlInjection === 'function') {
            return window.FoundrySecurity.detectSqlInjection(input);
        }
        if (typeof input !== 'string') return false;
        const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION)\b)/gi,
            /(--|\/\*|\*\/)/g,
            /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
            /(\b(OR|AND)\s+['"]\s*=\s*['"])/gi
        ];
        return sqlPatterns.some(pattern => pattern.test(input));
    }
};

// ============================================================================
// DOM ELEMENT CACHE - Cache all frequently used elements
// ============================================================================
const DOM = {
    navbar: document.querySelector('.navbar'),
    navToggle: document.getElementById('navToggle'),
    navMenu: document.getElementById('navMenu'),
    navLinks: document.querySelectorAll('.nav-link'),
    sections: document.querySelectorAll('section[id]'),
    themeToggle: document.getElementById('themeToggle'),
    html: document.documentElement,
    
    // Form elements
    contactForm: document.getElementById('contactForm'),
    countrySelect: document.getElementById('country'),
    phoneCodeSelect: document.getElementById('phoneCode'),
    captchaCanvas: document.getElementById('captchaCanvas'),
    captchaAnswer: document.getElementById('captchaAnswer'),
    captchaRefresh: document.getElementById('captchaRefresh'),
    phoneFlagDisplay: document.getElementById('phoneFlagDisplay'),
    phoneCodeDisplay: document.getElementById('phoneCodeDisplay'),
    phoneInput: document.getElementById('phone'),
    
    // Form fields
    description: document.getElementById('description'),
    firstName: document.getElementById('firstName'),
    email: document.getElementById('email'),
    company: document.getElementById('company'),
    relationship: document.getElementById('relationship'),
    
    // Slideshow
    slides: document.querySelectorAll('.solution-slide'),
    indicators: document.querySelectorAll('.slide-indicator'),
    prevBtn: document.querySelector('.prev-btn'),
    nextBtn: document.querySelector('.next-btn'),
    slideshow: document.querySelector('.solution-slideshow'),
    mobileScreens: document.querySelectorAll('.mobile-screen-view'),
    
    // Other
    contactItems: document.querySelectorAll('.contact-item'),
    
    // Success Modal
    successModal: document.getElementById('successModal'),
    successModalOverlay: document.querySelector('.success-modal-overlay'),
    closeSuccessModal: document.getElementById('closeSuccessModal')
};

// ============================================================================
// CONSTANTS
// ============================================================================
const FORM_FIELDS = ['description', 'firstName', 'country', 'phone', 'email', 'company', 'relationship'];
const NAVBAR_SCROLL_THRESHOLD = 100;
const SCROLL_OFFSET = 10;
const SLIDESHOW_INTERVAL = 8000;

const countryToPhoneCode = {
    'AF': '+93', 'AL': '+355', 'DZ': '+213', 'AR': '+54', 'AU': '+61', 'AT': '+43',
    'BH': '+973', 'BD': '+880', 'BE': '+32', 'BR': '+55', 'BN': '+673', 'BG': '+359',
    'CA': '+1', 'CL': '+56', 'CN': '+86', 'CO': '+57', 'CR': '+506', 'HR': '+385',
    'CZ': '+420', 'DK': '+45', 'EG': '+20', 'EE': '+372', 'FI': '+358', 'FR': '+33',
    'DE': '+49', 'GH': '+233', 'GR': '+30', 'HK': '+852', 'HU': '+36', 'IS': '+354',
    'IN': '+91', 'ID': '+62', 'IE': '+353', 'IL': '+972', 'IT': '+39', 'JP': '+81',
    'JO': '+962', 'KE': '+254', 'KW': '+965', 'LV': '+371', 'LB': '+961', 'MY': '+60',
    'MX': '+52', 'MA': '+212', 'NL': '+31', 'NZ': '+64', 'NG': '+234', 'NO': '+47',
    'OM': '+968', 'PK': '+92', 'PH': '+63', 'PL': '+48', 'PT': '+351', 'QA': '+974',
    'RO': '+40', 'RU': '+7', 'SA': '+966', 'SG': '+65', 'ZA': '+27', 'KR': '+82',
    'ES': '+34', 'SE': '+46', 'CH': '+41', 'TW': '+886', 'TH': '+66', 'TR': '+90',
    'UA': '+380', 'AE': '+971', 'GB': '+44', 'US': '+1', 'VN': '+84'
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate scroll position for a target element accounting for navbar
 */
const calculateScrollPosition = (target) => {
    const navbarHeight = DOM.navbar ? DOM.navbar.offsetHeight : 100;
    const targetRect = target.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const offsetTop = targetRect.top + scrollTop - navbarHeight - SCROLL_OFFSET;
    return Math.max(0, offsetTop);
};

/**
 * Ensure only one hyphen in phone number
 */
const ensureSingleHyphen = (value) => {
    const hyphenCount = (value.match(/-/g) || []).length;
    if (hyphenCount > 1) {
        const firstHyphenIndex = value.indexOf('-');
        return value.substring(0, firstHyphenIndex + 1) + value.substring(firstHyphenIndex + 1).replace(/-/g, '');
    }
    return value;
};

/**
 * Detect likely script / HTML injection in free-text fields
 */
const looksLikeScriptInjection = (input) => {
    if (window.FoundrySecurity && typeof window.FoundrySecurity.looksLikeScriptInjection === 'function') {
        return window.FoundrySecurity.looksLikeScriptInjection(input);
    }
    if (typeof input !== 'string') return false;
    return /<\s*script\b/i.test(input)
        || /javascript\s*:/i.test(input)
        || /on\w+\s*=\s*['"]?/i.test(input)
        || /<\s*iframe\b/i.test(input);
};

/**
 * Sanitize plain-text form values before submission (strip controls/tags; keep readable text)
 */
const sanitizeFormText = (input) => {
    if (typeof input !== 'string') return '';
    let value = input;
    if (window.FoundrySecurity && typeof window.FoundrySecurity.stripControlChars === 'function') {
        value = window.FoundrySecurity.stripControlChars(value);
    } else {
        value = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
    }
    // Remove HTML tags without entity-encoding (plain-text email delivery)
    return value.replace(/<\/?[^>]+>/g, '').trim();
};

/**
 * Validate email format securely
 */
const validateEmail = (email) => {
    if (!email || !email.trim()) {
        return 'Please enter valid e-mail address...';
    }
    
    const trimmed = email.trim();
    
    // Use secure email validation
    if (!Security.validateEmailSecure(trimmed)) {
        return 'Please enter valid e-mail address...';
    }
    
    return null;
};

/**
 * Get element by ID safely
 */
const getElement = (id) => document.getElementById(id);

/**
 * Get error element for a field
 */
const getErrorElement = (fieldId) => getElement(fieldId + 'Error');

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Show error message for a field
 */
const showError = (fieldId, message) => {
    const errorElement = getErrorElement(fieldId);
    const inputElement = getElement(fieldId);
    
    if (errorElement) {
        // Set text and show immediately (no animations)
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        errorElement.classList.add('show');
    }
    
    if (inputElement) {
        inputElement.classList.add('error');
        if (fieldId === 'phone') {
            const phoneWrapper = inputElement.closest('.phone-input-wrapper');
            if (phoneWrapper) phoneWrapper.classList.add('error');
        }
    }
};

/**
 * Hide error message for a field
 */
const hideError = (fieldId) => {
    const errorElement = getErrorElement(fieldId);
    const inputElement = getElement(fieldId);
    
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.classList.remove('show');
    }
    
    if (inputElement) {
        inputElement.classList.remove('error');
        if (fieldId === 'phone') {
            const phoneWrapper = inputElement.closest('.phone-input-wrapper');
            if (phoneWrapper) phoneWrapper.classList.remove('error');
        }
    }
};

/**
 * Clear all form errors
 */
const clearAllErrors = () => {
    FORM_FIELDS.forEach(fieldId => hideError(fieldId));
    // Also clear CAPTCHA error
    if (DOM.captchaAnswer) {
        hideError('captchaAnswer');
        DOM.captchaAnswer.classList.remove('error');
    }
};

/**
 * Show success modal
 */
const showSuccessModal = () => {
    if (DOM.successModal) {
        DOM.successModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
};

/**
 * Hide success modal
 */
const hideSuccessModal = () => {
    if (DOM.successModal) {
        DOM.successModal.classList.remove('show');
        document.body.style.overflow = '';
    }
};

/**
 * Initialize success modal
 */
const initSuccessModal = () => {
    if (!DOM.successModal || !DOM.closeSuccessModal) return;
    
    // Close button click
    DOM.closeSuccessModal.addEventListener('click', hideSuccessModal);
    
    // Close on overlay click
    if (DOM.successModalOverlay) {
        DOM.successModalOverlay.addEventListener('click', (e) => {
            if (e.target === DOM.successModalOverlay) hideSuccessModal();
        });
    }
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && DOM.successModal.classList.contains('show')) {
            hideSuccessModal();
        }
    });
};

// ============================================================================
// NAVIGATION
// ============================================================================

/**
 * Update navbar scroll state
 */
const updateNavbarScroll = () => {
    if (DOM.navbar) {
        DOM.navbar.classList.toggle('scrolled', window.pageYOffset > NAVBAR_SCROLL_THRESHOLD);
    }
};

const SCROLL_TARGET_KEY = 'fs-scroll-to';
const HOME_SECTION_IDS = ['home', 'products', 'solutions', 'services', 'about', 'contact'];

const isHomePage = () => Boolean(document.getElementById('home'));

const getHomeUrl = () => {
    // Prefer a clean site-root URL (production: https://www.foundrysuite.com/)
    try {
        const url = new URL('/', window.location.href);
        return url.pathname;
    } catch (e) {
        return '/';
    }
};

/**
 * Keep the address bar on a clean path (no #fragments)
 */
const clearUrlHash = () => {
    if (!window.location.hash) return;
    history.replaceState(null, '', window.location.pathname + window.location.search);
};

/**
 * Resolve a scroll target id from a link
 */
const getScrollTargetId = (link) => {
    if (!link) return null;

    const dataTarget = link.getAttribute('data-scroll-to');
    if (dataTarget) return dataTarget;

    const href = link.getAttribute('href') || '';
    if (href === '#' || href === '') return null;

    if (href.startsWith('#')) {
        const id = href.slice(1);
        return id || null;
    }

    try {
        const url = new URL(href, window.location.href);
        if (url.hash) {
            return url.hash.slice(1) || null;
        }
        // Logo / home links that point at the site root
        if (
            link.classList.contains('logo') ||
            link.classList.contains('footer-logo-link') ||
            link.classList.contains('login-brand-logo') ||
            link.matches('[data-scroll-to="home"]')
        ) {
            const path = url.pathname.replace(/\/index\.html$/i, '/');
            if (path === '/' || path === '') return 'home';
        }
    } catch (e) {
        return null;
    }

    return null;
};

/**
 * Smooth-scroll to a homepage section without changing the URL
 */
const scrollToSection = (targetId, { smooth = true } = {}) => {
    if (!targetId) return false;

    const target = document.getElementById(targetId);
    if (!target) return false;

    clearUrlHash();
    const scrollPosition = calculateScrollPosition(target);
    window.scrollTo({
        top: scrollPosition,
        behavior: smooth ? 'smooth' : 'auto'
    });

    const refreshActive = () => updateActiveNavLink();
    if (smooth && 'onscrollend' in window) {
        window.addEventListener('scrollend', refreshActive, { once: true });
    }
    setTimeout(refreshActive, smooth ? 450 : 40);
    return true;
};

const closeMobileNav = () => {
    if (DOM.navMenu) DOM.navMenu.classList.remove('active');
    if (DOM.navToggle) {
        DOM.navToggle.classList.remove('active');
        DOM.navToggle.setAttribute('aria-expanded', 'false');
    }
    document.body.classList.remove('nav-open');
};

/**
 * Navigate to homepage then scroll to a section (used from other pages)
 */
const goHomeAndScroll = (targetId) => {
    if (targetId && targetId !== 'home') {
        sessionStorage.setItem(SCROLL_TARGET_KEY, targetId);
    } else {
        sessionStorage.removeItem(SCROLL_TARGET_KEY);
    }
    window.location.href = getHomeUrl();
};

/**
 * Document Y position for an element (offsetTop is parent-relative)
 */
const getDocumentTop = (el) => {
    const rect = el.getBoundingClientRect();
    return rect.top + (window.pageYOffset || document.documentElement.scrollTop);
};

/**
 * Update active navigation link based on scroll position
 */
const updateActiveNavLink = () => {
    // Homepage-only scroll spy for in-page section links
    if (!isHomePage()) return;

    const scrollY = window.pageYOffset;
    const offset = (DOM.navbar ? DOM.navbar.offsetHeight : 70) + SCROLL_OFFSET + 8;

    const setActiveLink = (targetId) => {
        DOM.navLinks.forEach((link) => {
            if (
                link.classList.contains('nav-login') ||
                link.classList.contains('nav-cta') ||
                link.classList.contains('nav-link--platform') ||
                /(?:foundry-)?platform\.html/i.test(link.getAttribute('href') || '') ||
                /why\.html/i.test(link.getAttribute('href') || '')
            ) {
                link.classList.remove('active');
                return;
            }
            const linkTarget = getScrollTargetId(link);
            link.classList.toggle('active', linkTarget === targetId);
        });
    };

    if (scrollY < NAVBAR_SCROLL_THRESHOLD) {
        setActiveLink('home');
        return;
    }

    const targets = HOME_SECTION_IDS
        .map((id) => {
            const el = document.getElementById(id);
            return el ? { id, top: getDocumentTop(el) } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.top - b.top);

    let activeId = targets[0] ? targets[0].id : 'home';
    for (const target of targets) {
        if (scrollY + offset >= target.top) {
            activeId = target.id;
        }
    }
    setActiveLink(activeId);
};

/**
 * Initialize smooth scrolling for in-page and cross-page nav
 */
const initSmoothScroll = () => {
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const href = (link.getAttribute('href') || '').trim();

        // Foundry Platform + official Sign In entry — never intercept / scroll
        if (
            link.classList.contains('nav-link--platform') ||
            link.classList.contains('nav-login') ||
            /(?:foundry-)?platform\.html(?:[?#]|$)/i.test(href) ||
            /why\.html(?:[?#]|$)/i.test(href) ||
            /login\.html(?:[?#]|$)/i.test(href) ||
            /login\.foundrysuite\.com/i.test(href)
        ) {
            closeMobileNav();
            return;
        }

        const targetId = getScrollTargetId(link);
        if (!targetId) {
            // Bare "#" placeholders (privacy/social) — avoid jump-to-top
            if (href === '#') e.preventDefault();
            return;
        }

        // On homepage: scroll in place, never change the URL
        if (isHomePage()) {
            e.preventDefault();
            scrollToSection(targetId, { smooth: true });
            closeMobileNav();
            return;
        }

        // On other pages: go home, then scroll
        if (HOME_SECTION_IDS.includes(targetId) || targetId === 'home') {
            e.preventDefault();
            goHomeAndScroll(targetId);
        }
    });
};

/**
 * Initialize mobile navigation
 */
const initMobileNav = () => {
    if (DOM.navToggle && DOM.navMenu) {
        const syncToggleState = () => {
            const isOpen = DOM.navMenu.classList.contains('active');
            DOM.navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            document.body.classList.toggle('nav-open', isOpen);
        };

        DOM.navToggle.setAttribute('aria-expanded', 'false');
        DOM.navToggle.addEventListener('click', () => {
            DOM.navMenu.classList.toggle('active');
            DOM.navToggle.classList.toggle('active');
            syncToggleState();
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 1100) {
                closeMobileNav();
                document.body.classList.remove('nav-open');
                DOM.navToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }
};

/**
 * Consume pending scroll target from hash or sessionStorage (URL stays clean)
 */
let pendingScrollTarget = null;
if (window.location.hash) {
    pendingScrollTarget = window.location.hash.slice(1) || null;
    clearUrlHash();
}
try {
    const storedTarget = sessionStorage.getItem(SCROLL_TARGET_KEY);
    if (storedTarget) {
        pendingScrollTarget = storedTarget;
        sessionStorage.removeItem(SCROLL_TARGET_KEY);
    }
} catch (e) {
    // sessionStorage may be unavailable
}

const handlePendingScroll = (useSmooth = false) => {
    if (!pendingScrollTarget || !isHomePage()) return;
    const targetId = pendingScrollTarget;
    pendingScrollTarget = null;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            scrollToSection(targetId, { smooth: useSmooth });
            setTimeout(() => {
                updateActiveNavLink();
                updateNavbarScroll();
            }, useSmooth ? 500 : 100);
        });
    });
};

// Pending scroll handled via handlePendingScroll (hash / sessionStorage)

// ============================================================================
// PHONE NUMBER HANDLING
// ============================================================================

/**
 * Update phone display from option
 */
const updatePhoneDisplayFromOption = (option) => {
    if (DOM.phoneFlagDisplay && DOM.phoneCodeDisplay) {
        const flag = option.getAttribute('data-flag');
        const code = option.getAttribute('data-code');
        if (flag) DOM.phoneFlagDisplay.textContent = flag;
        if (code) DOM.phoneCodeDisplay.textContent = code;
    }
};

/**
 * Find and select phone code option
 */
const findPhoneCodeOption = (selectedCountry, phoneCode) => {
    for (let i = 0; i < DOM.phoneCodeSelect.options.length; i++) {
        const option = DOM.phoneCodeSelect.options[i];
        const optionCountry = option.getAttribute('data-country');
        const alsoFor = option.getAttribute('data-also-for');
        
        if ((optionCountry && optionCountry === selectedCountry) ||
            (alsoFor && alsoFor === selectedCountry) ||
            (!optionCountry && !alsoFor && option.value === phoneCode)) {
            DOM.phoneCodeSelect.selectedIndex = i;
            updatePhoneDisplayFromOption(option);
            return true;
        }
    }
    return false;
};

/**
 * Draw a text CAPTCHA onto the canvas
 */
const drawCaptcha = (text) => {
    const canvas = DOM.captchaCanvas;
    if (!canvas || !canvas.getContext) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    ctx.fillStyle = isDark ? '#1e293b' : '#e2e8f0';
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 8; i++) {
        ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(15, 23, 42, 0.18)';
        ctx.beginPath();
        ctx.moveTo(Math.random() * width, Math.random() * height);
        ctx.lineTo(Math.random() * width, Math.random() * height);
        ctx.stroke();
    }

    ctx.textBaseline = 'middle';
    ctx.font = 'bold 26px ui-sans-serif, system-ui, sans-serif';
    const startX = 14;
    for (let i = 0; i < text.length; i++) {
        ctx.save();
        ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.translate(startX + i * 24, height / 2 + (Math.random() * 8 - 4));
        ctx.rotate((Math.random() - 0.5) * 0.35);
        ctx.fillText(text[i], 0, 0);
        ctx.restore();
    }
};

/**
 * Generate a random text CAPTCHA
 * Returns an object with { answer: string }
 */
let currentCaptchaAnswer = null;

const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let answer = '';
    for (let i = 0; i < 5; i++) {
        answer += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    currentCaptchaAnswer = answer;
    drawCaptcha(answer);
    return { answer };
};

/**
 * Initialize CAPTCHA
 */
const initCaptcha = () => {
    if (!DOM.captchaCanvas || !DOM.captchaAnswer) return;

    generateCaptcha();
    DOM.captchaAnswer.value = '';

    DOM.captchaAnswer.addEventListener('input', () => {
        hideError('captchaAnswer');
        DOM.captchaAnswer.classList.remove('error');
    });

    if (DOM.captchaRefresh) {
        DOM.captchaRefresh.addEventListener('click', () => {
            generateCaptcha();
            DOM.captchaAnswer.value = '';
            hideError('captchaAnswer');
            DOM.captchaAnswer.classList.remove('error');
            DOM.captchaAnswer.focus();
        });
    }
};

/**
 * Initialize phone code selection
 */
const initPhoneCodeSelection = () => {
    if (!DOM.countrySelect || !DOM.phoneCodeSelect) return;
    
    // Handle country selection change
    DOM.countrySelect.addEventListener('change', function(e) {
        const selectedCountry = this.value;
        
        // ALWAYS clear error immediately - no conditions
        hideError('country');
        this.setCustomValidity('');
        this.classList.remove('error');
        
        // Update phone code if country is selected
        if (selectedCountry && selectedCountry !== '' && countryToPhoneCode[selectedCountry]) {
            findPhoneCodeOption(selectedCountry, countryToPhoneCode[selectedCountry]);
        }
    });
    
    // Also clear errors on interaction
    ['focus', 'click'].forEach(eventType => {
        DOM.countrySelect.addEventListener(eventType, function() {
            if (this.value && this.value !== '' && this.value !== 'Select Country/Region') {
                hideError('country');
                this.setCustomValidity('');
                this.classList.remove('error');
            }
        });
    });
    
    if (DOM.countrySelect.value === 'IN') {
        const defaultOption = DOM.phoneCodeSelect.querySelector('option[data-country="IN"]');
        if (defaultOption) updatePhoneDisplayFromOption(defaultOption);
    }
};

/**
 * Initialize phone code display
 */
const initPhoneCodeDisplay = () => {
    if (!DOM.phoneCodeSelect || !DOM.phoneFlagDisplay || !DOM.phoneCodeDisplay) return;
    
    const hideSelectText = () => {
        DOM.phoneCodeSelect.style.color = 'transparent';
        DOM.phoneCodeSelect.style.textIndent = '-9999px';
    };
    
    const updatePhoneDisplay = () => {
        const selectedOption = DOM.phoneCodeSelect.options[DOM.phoneCodeSelect.selectedIndex];
        if (selectedOption) updatePhoneDisplayFromOption(selectedOption);
        hideSelectText();
    };
    
    const preventInteraction = (e) => {
        e.preventDefault();
        e.stopPropagation();
        DOM.phoneCodeSelect.blur();
        return false;
    };
    
    ['mousedown', 'click', 'keydown'].forEach(event => {
        DOM.phoneCodeSelect.addEventListener(event, preventInteraction);
    });
    
    DOM.phoneCodeSelect.addEventListener('focus', (e) => {
        e.preventDefault();
        DOM.phoneCodeSelect.blur();
    });
    
    hideSelectText();
    updatePhoneDisplay();
    
    const observer = new MutationObserver(hideSelectText);
    observer.observe(DOM.phoneCodeSelect, {
        attributes: true,
        attributeFilter: ['style', 'class']
    });
};

/**
 * Initialize phone input validation
 */
const initPhoneInput = () => {
    if (!DOM.phoneInput) return;
    
    const processPhoneValue = (value) => {
        value = value.replace(/[^0-9\-]/g, '');
        value = ensureSingleHyphen(value);
        const digitCount = value.replace(/-/g, '').length;
        
        if (digitCount > 15) {
            let digitsOnly = value.replace(/-/g, '').slice(0, 15);
            const hyphenIndex = value.indexOf('-');
            if (hyphenIndex !== -1 && hyphenIndex < digitsOnly.length) {
                value = digitsOnly.substring(0, hyphenIndex) + '-' + digitsOnly.substring(hyphenIndex);
            } else {
                value = digitsOnly;
            }
        }
        
        return value.length > 16 ? value.slice(0, 16) : value;
    };
    
    DOM.phoneInput.addEventListener('input', (e) => {
        e.target.value = processPhoneValue(e.target.value);
    });
    
    DOM.phoneInput.addEventListener('keypress', (e) => {
        const char = String.fromCharCode(e.which || e.keyCode);
        const currentValue = e.target.value;
        const hasHyphen = currentValue.includes('-');
        
        if (!/[0-9]/.test(char) && !(char === '-' && !hasHyphen && currentValue.length > 0)) {
            e.preventDefault();
        }
    });
    
    DOM.phoneInput.addEventListener('paste', (e) => {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        DOM.phoneInput.value = processPhoneValue(paste);
    });
};

// ============================================================================
// FORM VALIDATION
// ============================================================================

/**
 * Setup alphabetic-only field validation with security
 */
const setupAlphaOnlyField = (input, fieldId) => {
    if (!input) return;
    
    const filterAlphaOnly = (e) => {
        let value = e.target.value;
        
        // Security: Remove potentially dangerous characters
        value = value.replace(/[^A-Za-z\s]/g, '');
        
        e.target.value = value;
        hideError(e.target.id);
    };
    
    input.addEventListener('input', filterAlphaOnly);
    input.addEventListener('keypress', (e) => {
        const char = String.fromCharCode(e.which || e.keyCode);
        if (!/[A-Za-z\s]/.test(char)) {
            e.preventDefault();
        }
    });
    input.addEventListener('paste', (e) => {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        input.value = paste.replace(/[^A-Za-z\s]/g, '');
        hideError(fieldId);
    });
};

/**
 * Set custom validation messages
 */
const setCustomValidationMessages = () => {
    const fields = {
        description: 'Please add a message',
        firstName: 'Please enter your name',
        country: 'Please select your country/region',
        phone: 'Please enter your contact number (7-15 digits, numeric only)',
        email: 'Please enter valid e-mail address...',
        company: 'Please enter your company name (5-50 characters)',
        relationship: 'Please select your relationship to FoundrySuite',
        captchaAnswer: 'Please enter the captcha characters'
    };
    
    Object.entries(fields).forEach(([fieldId, message]) => {
        const field = getElement(fieldId);
        if (field) {
            field.setCustomValidity(message);
            const eventType = (fieldId === 'country' || fieldId === 'relationship') ? 'change' : 'input';
            field.addEventListener(eventType, (e) => e.target.setCustomValidity(''));
        }
    });
};

/**
 * Validate form field with security checks
 */
const validateField = (fieldId, value) => {
    const trimmed = value ? value.trim() : '';
    
    switch (fieldId) {
        case 'description':
            if (!trimmed) return null;
            if (trimmed.length > 5000) return 'Message must not exceed 5000 characters';
            if (looksLikeScriptInjection(trimmed)) {
                return 'Invalid characters detected. Please remove HTML or script content.';
            }
            return null;
            
        case 'firstName':
            if (Security.detectSQLInjection(trimmed) || looksLikeScriptInjection(trimmed)) {
                return 'Invalid characters detected. Please remove HTML or script content.';
            }
            if (!trimmed) return 'Please enter your name';
            return null;
            
        case 'country':
            // Check if value is empty or the default empty option
            // Handle null, undefined, empty string, or default option text
            const countryValue = value ? String(value).trim() : '';
            if (!countryValue || 
                countryValue === '' || 
                countryValue === 'Select Country/Region' || 
                countryValue === 'Please select' ||
                countryValue === '0') {
                return 'Please select your country/region';
            }
            // Any non-empty value that's not the default is valid (like "IN", "US", etc.)
            return null; // Valid country selection
            
        case 'phone':
            if (!trimmed) return null;
            const phoneDigits = trimmed.replace(/[^0-9]/g, '');
            const hasMultipleHyphens = (trimmed.match(/-/g) || []).length > 1;
            if (!/^[0-9]+(-[0-9]+)?$/.test(trimmed)) return 'Phone number must contain only numeric digits with optional hyphen';
            if (hasMultipleHyphens) return 'Phone number can contain only one hyphen to separate area code';
            if (phoneDigits.length < 7) return 'Phone number must contain at least 7 digits';
            if (phoneDigits.length > 15) return 'Phone number must not exceed 15 digits';
            return null;
            
        case 'email':
            if (!trimmed) return 'Please enter valid e-mail address...';
            return validateEmail(trimmed);
            
        case 'company':
            // Security: Check for SQL injection and XSS patterns
            if (Security.detectSQLInjection(trimmed) || looksLikeScriptInjection(trimmed)) {
                return 'Invalid characters detected. Please use only alphanumeric characters and standard punctuation.';
            }
            if (!trimmed) return 'Please enter your company name';
            if (!/^[A-Za-z0-9][A-Za-z0-9\s.&'\-]*$/.test(trimmed)) {
                return 'Company name may include letters, numbers, spaces, and . & \' -';
            }
            if (trimmed.length < 5) return 'Company name must be at least 5 characters';
            if (trimmed.length > 50) return 'Company name must not exceed 50 characters';
            return null;
            
        case 'relationship':
            return null;
            
        case 'captchaAnswer':
            if (!trimmed) return 'Please enter the captcha characters';
            return null;
            
        default:
            return null;
    }
};

/**
 * Reset contact form UI after a successful submission
 */
const resetContactFormAfterSuccess = () => {
    if (!DOM.contactForm) return;

    DOM.contactForm.reset();

    FORM_FIELDS.forEach((fieldId) => {
        const field = getElement(fieldId);
        if (!field) return;
        if (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT' || field.tagName === 'SELECT') {
            field.value = '';
        }
        field.classList.remove('error');
    });

    // Restore default India phone display after reset
    if (DOM.phoneCodeSelect) {
        const indiaOption = DOM.phoneCodeSelect.querySelector('option[data-country="IN"]');
        if (indiaOption) {
            indiaOption.selected = true;
            updatePhoneDisplayFromOption(indiaOption);
        }
    }
    if (DOM.countrySelect) {
        DOM.countrySelect.value = 'IN';
    }

    clearAllErrors();

    if (DOM.captchaCanvas && DOM.captchaAnswer) {
        generateCaptcha();
        DOM.captchaAnswer.value = '';
    }
};

/**
 * Initialize form submission
 * Formspree handles spam protection and email sending
 */
const initFormSubmission = () => {
    if (!DOM.contactForm) return;
    
    // Clear errors on input
    FORM_FIELDS.forEach(fieldId => {
        const field = getElement(fieldId);
        if (field) {
            const eventType = (fieldId === 'country' || fieldId === 'relationship') ? 'change' : 'input';
            field.addEventListener(eventType, () => {
                hideError(fieldId);
                // Clear custom validity to prevent native HTML5 validation
                field.setCustomValidity('');
            });
        }
    });
    
    // Setup restricted fields
    setupAlphaOnlyField(DOM.company, 'company');
    
    // Form validation before submission (Formspree will handle the actual submission)
    DOM.contactForm.addEventListener('submit', (e) => {
        // Prevent native HTML5 validation from showing one error at a time
        e.preventDefault();
        e.stopPropagation();

        // Honeypot — silently drop bot submissions
        const honeypot = DOM.contactForm.querySelector('[name="_gotcha"]');
        if (honeypot && String(honeypot.value || '').trim()) {
            return false;
        }

        // Fail closed if action is not a trusted HTTPS endpoint
        const formAction = DOM.contactForm.getAttribute('action') || '';
        const trustedActions = (window.FoundrySecurity && window.FoundrySecurity.config && window.FoundrySecurity.config.trustedFormActions)
            || ['https://formspree.io'];
        const actionOk = (() => {
            try {
                const url = new URL(formAction, window.location.href);
                if (url.protocol !== 'https:') return false;
                return trustedActions.some((trusted) => formAction.indexOf(trusted) === 0 || url.origin.indexOf(trusted.replace(/\/$/, '')) === 0 || formAction.startsWith(trusted));
            } catch (err) {
                return false;
            }
        })();
        if (!actionOk) {
            alert('Unable to submit form securely. Please try again later.');
            return false;
        }
        
        // Clear all previous errors first
        clearAllErrors();
        
        // Clear any native HTML5 validation messages
        FORM_FIELDS.forEach(fieldId => {
            const field = getElement(fieldId);
            if (field) {
                field.setCustomValidity('');
                field.classList.remove('error');
            }
        });
        
        // Also clear CAPTCHA error
        if (DOM.captchaAnswer) {
            DOM.captchaAnswer.setCustomValidity('');
            DOM.captchaAnswer.classList.remove('error');
        }
        
        let hasErrors = false;
        const formDataObj = new FormData(DOM.contactForm);
        const errorsToShow = []; // Collect all errors first
        
        // Validate all fields and collect all errors (don't display yet)
        FORM_FIELDS.forEach(fieldId => {
            const field = getElement(fieldId);
            // Always get value directly from field element to ensure we have the current value
            // This is especially important for select elements like country
            let value = '';
            if (field) {
                // For select elements, always get the value directly from the element
                // Read the actual value from the DOM element
                value = field.value;
                // Handle null/undefined but preserve empty string and '0'
                if (value === null || value === undefined) {
                    value = '';
                }
            } else {
                value = formDataObj.get(fieldId) || '';
            }
            const error = validateField(fieldId, value);
            
            if (error) {
                errorsToShow.push({ fieldId, error, field });
                hasErrors = true;
            } else {
                // Clear custom validity if validation passes
                if (field) {
                    field.setCustomValidity('');
                }
            }
        });
        
        // Validate CAPTCHA separately
        if (DOM.captchaAnswer) {
            const userAnswer = DOM.captchaAnswer.value.trim();
            if (!userAnswer) {
                errorsToShow.push({ 
                    fieldId: 'captchaAnswer', 
                    error: 'Please enter the captcha characters',
                    field: DOM.captchaAnswer
                });
                hasErrors = true;
            } else if (userAnswer.toUpperCase() !== String(currentCaptchaAnswer || '').toUpperCase()) {
                errorsToShow.push({ 
                    fieldId: 'captchaAnswer', 
                    error: 'Captcha did not match. Please try again.',
                    field: DOM.captchaAnswer
                });
                generateCaptcha();
                DOM.captchaAnswer.value = '';
                hasErrors = true;
            } else {
                hideError('captchaAnswer');
                DOM.captchaAnswer.setCustomValidity('');
                DOM.captchaAnswer.classList.remove('error');
            }
        }
        
        // Now display ALL errors at once (synchronously - NO delays)
        if (hasErrors) {
            // First, set all custom validity to prevent any native HTML5 validation
            errorsToShow.forEach(({ fieldId, field }) => {
                if (field) {
                    field.setCustomValidity('Invalid'); // Set to prevent native validation
                }
            });
            
            // Then display all errors immediately in one synchronous batch (no loops with delays)
            errorsToShow.forEach(({ fieldId, error, field }) => {
                showError(fieldId, error);
                // Add error class to input field
                if (field) {
                    field.classList.add('error');
                    // Set custom validity with the actual error message
                    field.setCustomValidity(error);
                }
            });
            
            // Scroll to first error after all errors are displayed (small delay for DOM updates)
            setTimeout(() => {
                const firstErrorField = document.querySelector('.error-message.show');
                if (firstErrorField) {
                    firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 10);
            
            return false;
        }
        
        // If no errors, submit the form to Formspree using fetch
        const submitFormData = new FormData();

        // Sanitize and copy validated fields (include form-associated description via form attribute)
        const fieldNames = ['name', 'country', 'phoneCode', 'phone', 'email', 'company', 'relationship'];
        fieldNames.forEach((name) => {
            const el = DOM.contactForm.elements.namedItem(name) || getElement(name);
            if (!el || typeof el.value !== 'string') return;
            const raw = String(el.value).trim();
            if (!raw && (name === 'phone' || name === 'phoneCode' || name === 'relationship')) return;
            if (name === 'phoneCode' && !(DOM.phoneInput && String(DOM.phoneInput.value || '').trim())) return;
            const safe = name === 'email' || name === 'phone' || name === 'phoneCode' || name === 'country' || name === 'relationship'
                ? raw
                : sanitizeFormText(raw);
            submitFormData.append(name, safe);
        });

        const descriptionField = getElement('description') || DOM.contactForm.elements.namedItem('message');
        const descriptionValue = descriptionField && typeof descriptionField.value === 'string'
            ? sanitizeFormText(descriptionField.value.trim())
            : '';
        if (descriptionValue) {
            submitFormData.append('message', descriptionValue);
        }
        
        // Add Formspree-specific fields to improve email delivery and reduce spam detection
        submitFormData.append('_subject', 'New Contact Form Submission from FoundrySuite Website');
        submitFormData.append('_format', 'plain'); // Plain text emails are less likely to be marked as spam
        
        // Set reply-to address to the submitter's email
        const emailValue = submitFormData.get('email');
        if (emailValue) {
            submitFormData.append('_replyto', emailValue);
        }
        
        // Show loading state
        const submitButton = DOM.contactForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton ? submitButton.textContent : '';
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';
        }
        
        fetch(DOM.contactForm.action, {
            method: 'POST',
            body: submitFormData,
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(response => {
            if (response.ok) {
                return response.json().catch(() => ({})).then(() => {
                    showSuccessModal();
                    resetContactFormAfterSuccess();
                });
            }
            return response.json().then(data => {
                throw new Error(data.error || data.message || 'Form submission failed');
            }).catch(() => {
                throw new Error('Form submission failed. Status: ' + response.status);
            });
        })
        .catch(() => {
            alert('There was an error submitting your form. Please check your connection and try again.');
        })
        .finally(() => {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
        
        return false;
    });
};

// ============================================================================
// ANIMATIONS
// ============================================================================

/**
 * Initialize intersection observer animations
 */
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

const initAnimations = () => {
    DOM.contactItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-30px)';
        item.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(item);
    });
};


// ============================================================================
// THEME TOGGLE
// ============================================================================

const syncThemeLogos = (theme) => {
    const activeTheme = theme || DOM.html.getAttribute('data-theme') || 'light';
    document.querySelectorAll('[data-logo]').forEach((img) => {
        const nextSrc = activeTheme === 'dark'
            ? img.getAttribute('data-logo-dark')
            : img.getAttribute('data-logo-light');
        if (nextSrc && img.getAttribute('src') !== nextSrc) {
            img.setAttribute('src', nextSrc);
        }
    });
};

const initThemeToggle = () => {
    syncThemeLogos();

    if (DOM.themeToggle) {
        DOM.themeToggle.addEventListener('click', () => {
            const currentTheme = DOM.html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            DOM.html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            syncThemeLogos(newTheme);
        });
    }
};

/**
 * Platform FAQ — exclusive accordion (one open panel at a time)
 */
const initPlatformFaqAccordion = () => {
    const list = document.querySelector('[data-faq-accordion]');
    if (!list) return;

    const items = Array.from(list.querySelectorAll('details.platform-faq-item'));
    if (!items.length) return;

    const syncItemAria = (item) => {
        const summary = item.querySelector('summary');
        if (!summary) return;
        summary.setAttribute('aria-expanded', item.open ? 'true' : 'false');
    };

    const syncAllAria = () => {
        items.forEach(syncItemAria);
    };

    items.forEach((item) => {
        syncItemAria(item);

        item.addEventListener('toggle', () => {
            if (item.open) {
                items.forEach((other) => {
                    if (other !== item && other.open) {
                        other.open = false;
                    }
                });
            }
            // Sync after exclusive close settles
            queueMicrotask(syncAllAria);
        });
    });
};

// ============================================================================
// SLIDESHOW
// ============================================================================

const initSolutionSlideshow = () => {
    if (DOM.slides.length === 0) return;
    
    let currentSlide = 0;
    let slideInterval = null;
    const compactHero = window.matchMedia('(max-width: 968px)');
    const slideCount = DOM.slides.length;
    const isOrbitSlide = (index) => DOM.slides[index]?.dataset.solution === 'orbit';
    const isCompactHero = () => compactHero.matches;
    const shouldSkipSlide = (index) => isCompactHero() && isOrbitSlide(index);

    const wrapIndex = (from, step) => {
        let index = from;
        for (let i = 0; i < slideCount; i += 1) {
            index = (index + step + slideCount) % slideCount;
            if (!shouldSkipSlide(index)) return index;
        }
        return from;
    };
    
    const showSlide = (index) => {
        try {
            const next = shouldSkipSlide(index) ? wrapIndex(index, 1) : index;
            DOM.slides.forEach(slide => slide.classList.remove('active'));
            if (DOM.indicators) {
                DOM.indicators.forEach(indicator => indicator.classList.remove('active'));
            }
            
            if (DOM.slides[next]) DOM.slides[next].classList.add('active');
            if (DOM.indicators && DOM.indicators[next]) DOM.indicators[next].classList.add('active');
            
            currentSlide = next;
            
            if (DOM.mobileScreens && DOM.mobileScreens.length > 0) {
                const mobileScreenIndex = next % DOM.mobileScreens.length;
                DOM.mobileScreens.forEach((screen, i) => {
                    screen.classList.toggle('active', i === mobileScreenIndex);
                });
            }
        } catch (e) {
            // Silently handle errors
        }
    };
    
    const nextSlide = () => showSlide(wrapIndex(currentSlide, 1));
    const prevSlide = () => showSlide(wrapIndex(currentSlide, -1));
    
    const startSlideshow = () => {
        if (slideInterval) clearInterval(slideInterval);
        slideInterval = setInterval(nextSlide, SLIDESHOW_INTERVAL);
    };
    
    const stopSlideshow = () => {
        if (slideInterval) {
            clearInterval(slideInterval);
            slideInterval = null;
        }
    };
    
    if (DOM.nextBtn) {
        DOM.nextBtn.addEventListener('click', () => {
            stopSlideshow();
            nextSlide();
            startSlideshow();
        });
    }
    
    if (DOM.prevBtn) {
        DOM.prevBtn.addEventListener('click', () => {
            stopSlideshow();
            prevSlide();
            startSlideshow();
        });
    }
    
    DOM.indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            if (shouldSkipSlide(index)) return;
            stopSlideshow();
            showSlide(index);
            startSlideshow();
        });
    });
    
    if (DOM.slideshow) {
        DOM.slideshow.addEventListener('mouseenter', stopSlideshow);
        DOM.slideshow.addEventListener('mouseleave', startSlideshow);
        DOM.slideshow.addEventListener('focusin', stopSlideshow);
        DOM.slideshow.addEventListener('focusout', (event) => {
            if (!DOM.slideshow.contains(event.relatedTarget)) {
                startSlideshow();
            }
        });
    }

    const syncHeroBreakpoint = () => {
        DOM.indicators.forEach((indicator, index) => {
            const skip = shouldSkipSlide(index);
            indicator.toggleAttribute('hidden', skip);
            indicator.setAttribute('aria-hidden', skip ? 'true' : 'false');
            indicator.tabIndex = skip ? -1 : 0;
        });
        if (shouldSkipSlide(currentSlide)) {
            showSlide(wrapIndex(currentSlide, 1));
        }
    };
    if (typeof compactHero.addEventListener === 'function') {
        compactHero.addEventListener('change', syncHeroBreakpoint);
    } else if (typeof compactHero.addListener === 'function') {
        compactHero.addListener(syncHeroBreakpoint);
    }

    syncHeroBreakpoint();
    showSlide(isCompactHero() ? wrapIndex(-1, 1) : 0);
    startSlideshow();
};

// ============================================================================
// IMAGE FALLBACKS (replaces inline onerror handlers)
// ============================================================================

const initImageFallbacks = () => {
    document.querySelectorAll('img[data-fallback-sibling="true"]').forEach((img) => {
        img.addEventListener('error', () => {
            img.style.display = 'none';
            const sibling = img.nextElementSibling;
            if (sibling) {
                sibling.classList.remove('is-hidden');
                sibling.style.display = 'flex';
            }
        });
    });
};

// ============================================================================
// COPYRIGHT YEAR UPDATE
// ============================================================================

/**
 * Update copyright year automatically
 */
const updateCopyrightYear = () => {
    const currentYear = new Date().getFullYear();
    const copyrightYearElements = document.querySelectorAll('#copyright-year');
    
    copyrightYearElements.forEach(element => {
        element.textContent = currentYear;
    });
};

// ============================================================================
// PAGE INITIALIZATION
// ============================================================================

const initPageState = () => {
    updateNavbarScroll();
    updateActiveNavLink();
    
    if (DOM.navMenu && DOM.navToggle) {
        closeMobileNav();
    }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    updateCopyrightYear();
    initImageFallbacks();
    initAnimations();
    initSolutionSlideshow();
    setCustomValidationMessages();
    initFormSubmission();
    initPageState();
    initSmoothScroll();
    initMobileNav();
    initPhoneCodeSelection();
    initPhoneCodeDisplay();
    initPhoneInput();
    initCaptcha();
    initSuccessModal();
    initThemeToggle();
    initPlatformFaqAccordion();

    // Core platform services — ensure active even if a page forgets a script tag.
    if (window.FoundrySecurity && typeof window.FoundrySecurity.init === 'function') {
        window.FoundrySecurity.init();
    }
    if (window.FoundryContentProtection && typeof window.FoundryContentProtection.init === 'function') {
        window.FoundryContentProtection.init();
    }
    
    setTimeout(() => {
        updateNavbarScroll();
        updateActiveNavLink();
    }, 50);
});

window.addEventListener('load', () => {
    updateNavbarScroll();
    updateActiveNavLink();

    if (pendingScrollTarget) {
        setTimeout(() => {
            handlePendingScroll(false);
        }, 300);
    }
});

// Initialize scroll listeners
if (DOM.navbar) {
    updateNavbarScroll();
    window.addEventListener('scroll', updateNavbarScroll);
}

window.addEventListener('scroll', updateActiveNavLink);

// ============================================================================
// PLATFORM ENGINES — sticky layer nav active state
// ============================================================================

const initPlatformEnginesNav = () => {
    const section = document.getElementById('engines');
    const slot = document.getElementById('platformEnginesNavSlot');
    const nav = document.getElementById('platformEnginesNav');
    const links = nav ? Array.from(nav.querySelectorAll('.platform-engines-nav-item')) : [];
    const layers = section ? Array.from(section.querySelectorAll('.platform-engine-layer[id]')) : [];
    if (!section || !slot || !nav || !links.length || !layers.length) return;

    const homeParent = slot.parentNode;
    const placeholder = document.createElement('div');
    placeholder.className = 'platform-engines-nav-placeholder';
    placeholder.setAttribute('aria-hidden', 'true');
    homeParent.insertBefore(placeholder, slot);

    const setActive = (id) => {
        links.forEach((link) => {
            const on = link.getAttribute('href') === `#${id}`;
            link.classList.toggle('is-active', on);
            if (on) link.setAttribute('aria-current', 'true');
            else link.removeAttribute('aria-current');
        });
    };

    const pinNav = () => {
        const headerH = DOM.navbar ? DOM.navbar.offsetHeight : 70;
        const sectionRect = section.getBoundingClientRect();
        const slotHeight = slot.offsetHeight || nav.offsetHeight || 48;
        const anchorTop = placeholder.classList.contains('is-active')
            ? placeholder.getBoundingClientRect().top
            : slot.getBoundingClientRect().top;

        // Keep menu visible while the engines section is in view
        const shouldPin =
            anchorTop <= headerH + 1 &&
            sectionRect.bottom > headerH + slotHeight + 40;

        if (shouldPin) {
            if (!slot.classList.contains('is-pinned')) {
                placeholder.style.height = `${slotHeight}px`;
                placeholder.classList.add('is-active');
                document.body.appendChild(slot);
                slot.classList.add('is-pinned');
            }
            slot.style.top = `${headerH}px`;
        } else if (slot.classList.contains('is-pinned')) {
            slot.classList.remove('is-pinned');
            slot.style.top = '';
            homeParent.insertBefore(slot, placeholder.nextSibling);
            placeholder.style.height = '';
            placeholder.classList.remove('is-active');
        }

        const marker = headerH + (shouldPin ? slot.offsetHeight : 0) + 16;
        let current = layers[0].id;
        layers.forEach((layer) => {
            if (layer.getBoundingClientRect().top <= marker) current = layer.id;
        });
        setActive(current);
    };

    let frame = 0;
    const requestPin = () => {
        if (frame) return;
        frame = window.requestAnimationFrame(() => {
            frame = 0;
            pinNav();
        });
    };

    const getEngineScrollOffset = () => {
        const headerH = DOM.navbar ? DOM.navbar.offsetHeight : 70;
        const slotH = slot.classList.contains('is-pinned')
            ? slot.offsetHeight
            : Math.max(nav.offsetHeight + 36, 64);
        return headerH + slotH + 16;
    };

    const scrollToEngineTarget = (id) => {
        const target = document.getElementById(id);
        if (!target) return;

        setActive(id);
        const top = window.scrollY + target.getBoundingClientRect().top - getEngineScrollOffset();
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });

        const settle = () => {
            pinNav();
            const desired = getEngineScrollOffset();
            const delta = target.getBoundingClientRect().top - desired;
            if (Math.abs(delta) > 2) {
                window.scrollBy({ top: delta, behavior: 'auto' });
            }
            setActive(id);
        };

        if ('onscrollend' in window) {
            window.addEventListener('scrollend', settle, { once: true });
        }
        setTimeout(settle, 420);
    };

    window.addEventListener('scroll', requestPin, { passive: true });
    window.addEventListener('resize', requestPin);

    document.addEventListener('click', (e) => {
        const anchor = e.target.closest('a');
        if (!anchor) return;
        const href = (anchor.getAttribute('href') || '').trim();
        if (!href.startsWith('#engine-layer-') && href !== '#engines') return;
        const id = href.slice(1);
        if (!document.getElementById(id)) return;
        e.preventDefault();
        closeMobileNav();
        if (id === 'engines') {
            const top = window.scrollY + section.getBoundingClientRect().top - (DOM.navbar ? DOM.navbar.offsetHeight : 70) - 8;
            window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
            return;
        }
        scrollToEngineTarget(id);
    });

    pinNav();
};

initPlatformEnginesNav();
