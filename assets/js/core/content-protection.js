/**
 * FoundrySuite — Platform-Level Content Protection Framework
 * --------------------------------------------------------------------------
 * Core platform service that protects site imagery and media from casual
 * copy / drag / save actions across all current and future pages.
 *
 * Features:
 *  - Image-only context-menu blocking (page UI remains usable)
 *  - Drag / selection / copy hardening for images
 *  - Transparent shields on key visual assets
 *  - Background-image host protection where configured
 *  - Shortcut blocking for save / view-source (Ctrl/Cmd+S, Ctrl+U)
 *  - MutationObserver coverage for dynamically inserted media
 *  - Toast notifications (no native alert dialogs)
 *
 * Does NOT:
 *  - Block Developer Tools (F12, Ctrl+Shift+I/J/C, etc.)
 *  - Alter image URLs, alt text, lazy-loading, or SEO metadata
 *  - Break keyboard navigation, forms, links, or screen readers
 *
 * Usage:
 *  <script src="assets/js/core/content-protection.js" defer></script>
 *  Optional: override window.ContentProtectionConfig before this file loads.
 */
(function (global) {
    'use strict';

    if (global.__FoundryContentProtectionInitialized) {
        return;
    }

    // ----------------------------------------------------------------------
    // Configuration (overridable via window.ContentProtectionConfig)
    // ----------------------------------------------------------------------
    const DEFAULT_CONFIG = {
        disableImageRightClick: true,
        disableImageDrag: true,
        disableImageCopy: true,
        disableSaveShortcuts: true,
        enableOverlayProtection: true,
        protectBackgroundImages: true,
        showToastNotifications: true,
        toastMessage: 'Content protection is enabled.',
        toastDurationMs: 2600,
        /** Selectors whose <img> nodes receive transparent shields */
        overlayImageSelectors: [
            '.logo-img',
            '.footer-logo',
            '.hero-dashboard-img img',
            '.hero-devices-wrapper img',
            '.solution-slideshow img',
            '.slideshow-container img',
            '.about-image img',
            '.about-image',
            '.platform-orbit-img',
            '.platform-orbit-frame img',
            '.architecture-diagram img',
            '.arch-diagram img',
            '.login-brand-orbit-img',
            '.login-brand-logo-img',
            '.product-card img',
            'img[src*="Branding/"]',
            'img[src*="Architecture/"]',
            'img[src*="About/"]',
            'img[src*="Products/"]',
            'img[src*="Social/"]'
        ],
        /** Containers that may use CSS background-image and need a shield */
        backgroundHostSelectors: [
            '.hero-dashboard-img',
            '.about-image',
            '.platform-orbit-frame',
            '.login-brand-orbit',
            '.login-brand-panel',
            '[data-cp-bg-protect]'
        ]
    };

    const ContentProtectionConfig = Object.assign(
        {},
        DEFAULT_CONFIG,
        global.ContentProtectionConfig || {}
    );

    global.ContentProtectionConfig = ContentProtectionConfig;

    const SHIELD_CLASS = 'cp-image-shield';
    const HOST_CLASS = 'cp-protect-host';
    const BG_HOST_CLASS = 'cp-bg-protect-host';
    const PROTECTED_ATTR = 'data-cp-protected';
    const STYLE_ID = 'foundry-content-protection-styles';
    const TOAST_ID = 'foundry-cp-toast';

    // ----------------------------------------------------------------------
    // Styles (injected once — keeps the service self-contained)
    // ----------------------------------------------------------------------
    const injectStyles = () => {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            img[${PROTECTED_ATTR}="1"],
            picture[${PROTECTED_ATTR}="1"],
            .${HOST_CLASS} img,
            .${BG_HOST_CLASS} {
                -webkit-user-drag: none;
                user-select: none;
                -webkit-user-select: none;
                -moz-user-select: none;
            }

            img[${PROTECTED_ATTR}="1"] {
                pointer-events: auto;
            }

            .${HOST_CLASS},
            .${BG_HOST_CLASS} {
                position: relative;
            }

            .${SHIELD_CLASS} {
                position: absolute;
                inset: 0;
                z-index: 2;
                background: transparent;
                border: 0;
                margin: 0;
                padding: 0;
                display: block;
                cursor: inherit;
                /* Capture context menu / drag; clicks pass when over links via JS */
                pointer-events: auto;
            }

            /* Linked media: keep navigation usable; JS still blocks image context menu */
            a .${SHIELD_CLASS},
            button .${SHIELD_CLASS},
            [role="button"] .${SHIELD_CLASS},
            label .${SHIELD_CLASS} {
                pointer-events: none;
            }

            #${TOAST_ID} {
                position: fixed;
                left: 50%;
                bottom: 1.5rem;
                transform: translateX(-50%) translateY(120%);
                z-index: 100000;
                max-width: min(92vw, 420px);
                padding: 0.85rem 1.15rem;
                border-radius: 0.75rem;
                background: rgba(15, 23, 42, 0.94);
                color: #f8fafc;
                font-family: 'Inter', system-ui, sans-serif;
                font-size: 0.875rem;
                font-weight: 500;
                letter-spacing: 0.01em;
                box-shadow: 0 12px 40px rgba(15, 23, 42, 0.28);
                opacity: 0;
                pointer-events: none;
                transition: transform 0.28s ease, opacity 0.28s ease;
            }

            #${TOAST_ID}.is-visible {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }

            @media (prefers-reduced-motion: reduce) {
                #${TOAST_ID} {
                    transition: opacity 0.15s ease;
                }
            }
        `;
        document.head.appendChild(style);
    };

    // ----------------------------------------------------------------------
    // Toast
    // ----------------------------------------------------------------------
    let toastTimer = null;

    const ensureToast = () => {
        let toast = document.getElementById(TOAST_ID);
        if (toast) return toast;

        toast = document.createElement('div');
        toast.id = TOAST_ID;
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        toast.setAttribute('aria-atomic', 'true');
        document.body.appendChild(toast);
        return toast;
    };

    const showToast = (message) => {
        if (!ContentProtectionConfig.showToastNotifications) return;

        const toast = ensureToast();
        toast.textContent = message || ContentProtectionConfig.toastMessage;
        toast.classList.add('is-visible');

        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.classList.remove('is-visible');
        }, ContentProtectionConfig.toastDurationMs || 2600);
    };

    // ----------------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------------
    const isElement = (node) => node && node.nodeType === 1;

    const isImageLike = (el) => {
        if (!isElement(el)) return false;
        if (el.tagName === 'IMG' || el.tagName === 'PICTURE' || el.tagName === 'SVG') return true;
        if (el.tagName === 'SOURCE' && el.parentElement && el.parentElement.tagName === 'PICTURE') return true;
        if (el.classList && el.classList.contains(SHIELD_CLASS)) return true;
        return false;
    };

    const eventTargetsImage = (event) => {
        const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
        for (let i = 0; i < path.length; i += 1) {
            if (isImageLike(path[i])) return true;
        }
        const t = event.target;
        if (isImageLike(t)) return true;
        if (isElement(t) && t.closest('img, picture, svg, .' + SHIELD_CLASS)) return true;
        return false;
    };

    const matchesAny = (el, selectors) => {
        if (!isElement(el) || !selectors || !selectors.length) return false;
        return selectors.some((sel) => {
            try {
                return el.matches(sel);
            } catch (e) {
                return false;
            }
        });
    };

    const isInteractiveMedia = (img) => Boolean(img.closest('a, button, [role="button"], label'));

    const shouldOverlayImage = (img) => {
        if (!ContentProtectionConfig.enableOverlayProtection) return false;
        if (!img || img.tagName !== 'IMG') return false;
        return matchesAny(img, ContentProtectionConfig.overlayImageSelectors);
    };

    const hasCssBackgroundImage = (el) => {
        if (!isElement(el)) return false;
        const bg = global.getComputedStyle(el).backgroundImage;
        if (!bg || bg === 'none') return false;
        // Ignore tiny UI data-URI chevrons / icons
        if (bg.indexOf('data:image/svg+xml') !== -1 && bg.length < 800) return false;
        return bg.indexOf('url(') !== -1;
    };

    // ----------------------------------------------------------------------
    // Per-image / per-host protection
    // ----------------------------------------------------------------------
    const ensureShield = (host) => {
        if (!host || host.querySelector(':scope > .' + SHIELD_CLASS)) return;
        const shield = document.createElement('span');
        shield.className = SHIELD_CLASS;
        shield.setAttribute('aria-hidden', 'true');
        shield.setAttribute(PROTECTED_ATTR, '1');
        host.appendChild(shield);
    };

    const protectImage = (img) => {
        if (!isElement(img) || img.tagName !== 'IMG') return;
        if (img.getAttribute(PROTECTED_ATTR) === '1') {
            // Still ensure drag flag if config changed mid-session
            if (ContentProtectionConfig.disableImageDrag) {
                img.setAttribute('draggable', 'false');
            }
            return;
        }

        img.setAttribute(PROTECTED_ATTR, '1');

        if (ContentProtectionConfig.disableImageDrag) {
            img.setAttribute('draggable', 'false');
        }

        if (ContentProtectionConfig.enableOverlayProtection && shouldOverlayImage(img)) {
            const host = img.parentElement;
            if (host) {
                host.classList.add(HOST_CLASS);
                // Overlay only when it won't block link/button activation
                if (!isInteractiveMedia(img)) {
                    ensureShield(host);
                }
            }
        }
    };

    const protectBackgroundHost = (el) => {
        if (!ContentProtectionConfig.protectBackgroundImages) return;
        if (!isElement(el)) return;
        if (el.getAttribute(PROTECTED_ATTR) === 'bg') return;
        if (!matchesAny(el, ContentProtectionConfig.backgroundHostSelectors)) return;
        if (!hasCssBackgroundImage(el) && !el.hasAttribute('data-cp-bg-protect')) return;

        el.setAttribute(PROTECTED_ATTR, 'bg');
        el.classList.add(BG_HOST_CLASS);
        ensureShield(el);
    };

    const protectTree = (root) => {
        const scope = root && root.querySelectorAll ? root : document;

        scope.querySelectorAll('img').forEach(protectImage);

        if (ContentProtectionConfig.protectBackgroundImages) {
            ContentProtectionConfig.backgroundHostSelectors.forEach((sel) => {
                try {
                    document.querySelectorAll(sel).forEach(protectBackgroundHost);
                } catch (e) {
                    /* invalid selector — ignore */
                }
            });
        }

        // If root itself is an image / host
        if (isElement(root)) {
            if (root.tagName === 'IMG') protectImage(root);
            protectBackgroundHost(root);
        }
    };

    // ----------------------------------------------------------------------
    // Event delegation
    // ----------------------------------------------------------------------
    const onContextMenu = (event) => {
        if (!ContentProtectionConfig.disableImageRightClick) return;
        if (!eventTargetsImage(event)) return;
        event.preventDefault();
        showToast(ContentProtectionConfig.toastMessage);
    };

    const onDragStart = (event) => {
        if (!ContentProtectionConfig.disableImageDrag) return;
        if (!eventTargetsImage(event)) return;
        event.preventDefault();
    };

    const onCopy = (event) => {
        if (!ContentProtectionConfig.disableImageCopy) return;
        const selection = global.getSelection && global.getSelection();
        if (selection && selection.anchorNode) {
            const node = selection.anchorNode.nodeType === 1
                ? selection.anchorNode
                : selection.anchorNode.parentElement;
            if (node && node.closest && node.closest('img, picture, .' + SHIELD_CLASS + ', .' + HOST_CLASS)) {
                event.preventDefault();
                showToast(ContentProtectionConfig.toastMessage);
                return;
            }
        }
        if (eventTargetsImage(event)) {
            event.preventDefault();
            showToast(ContentProtectionConfig.toastMessage);
        }
    };

    const isEditableTarget = (el) => {
        if (!isElement(el)) return false;
        if (el.isContentEditable) return true;
        const tag = el.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };

    const onKeyDown = (event) => {
        if (!ContentProtectionConfig.disableSaveShortcuts) return;
        if (isEditableTarget(event.target)) return;

        const key = (event.key || '').toLowerCase();
        const cmd = event.ctrlKey || event.metaKey;

        // Explicitly never block developer tools
        if (
            event.key === 'F12' ||
            (cmd && event.shiftKey && ['i', 'j', 'c', 'k'].includes(key))
        ) {
            return;
        }

        // Ctrl/Cmd + S  |  Ctrl/Cmd + Shift + S  |  Ctrl/Cmd + U
        const blockSave = cmd && key === 's';
        const blockSource = cmd && key === 'u';

        if (blockSave || blockSource) {
            event.preventDefault();
            showToast(ContentProtectionConfig.toastMessage);
        }
    };

    // ----------------------------------------------------------------------
    // MutationObserver — future images & components
    // ----------------------------------------------------------------------
    const startObserver = () => {
        if (!global.MutationObserver) {
            return null;
        }

        const observer = new MutationObserver((mutations) => {
            for (let i = 0; i < mutations.length; i += 1) {
                const mutation = mutations[i];
                if (mutation.type !== 'childList') continue;

                mutation.addedNodes.forEach((node) => {
                    if (!isElement(node)) return;
                    if (node.tagName === 'IMG') {
                        protectImage(node);
                        return;
                    }
                    if (node.querySelectorAll) {
                        protectTree(node);
                    }
                });
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        return observer;
    };

    // ----------------------------------------------------------------------
    // Public API
    // ----------------------------------------------------------------------
    const ContentProtection = {
        config: ContentProtectionConfig,
        protectImage,
        protectTree,
        showToast,
        refresh() {
            protectTree(document);
        },
        init() {
            if (global.__FoundryContentProtectionInitialized) return ContentProtection;
            global.__FoundryContentProtectionInitialized = true;

            injectStyles();
            protectTree(document);

            // Single delegated listeners on document
            document.addEventListener('contextmenu', onContextMenu, true);
            document.addEventListener('dragstart', onDragStart, true);
            document.addEventListener('copy', onCopy, true);
            document.addEventListener('keydown', onKeyDown, true);

            startObserver();
            return ContentProtection;
        }
    };

    global.FoundryContentProtection = ContentProtection;

    const boot = () => ContentProtection.init();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})(typeof window !== 'undefined' ? window : this);
