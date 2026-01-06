// ==UserScript==
// @name         Gmail POP3 Auto Checker
// @namespace    https://github.com/EnduringGuerila/BRP-Userscripts/
// @version      1.0-Auto
// @description  Automatically checks POP3 every 60s when inactive. Returns to previous email if viewing one.
// @author       EnduringGuerila
// @updateURL    https://raw.githubusercontent.com/EnduringGuerila/BRP-Userscripts/master/gmail-pop3-auto-mail-checker.user.js
// @downloadURL  https://raw.githubusercontent.com/EnduringGuerila/BRP-Userscripts/master/gmail-pop3-auto-mail-checker.user.js
// @grant        none
// @match        *://mail.google.com/*
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const CHECK_INTERVAL = 60000;
    let lastCheck = Date.now();
    let isAutoProcessing = false;
    let originalHash = '';
    let isWindowFocused = true;

    window.addEventListener('focus', () => { isWindowFocused = true; lastCheck = Date.now(); });
    window.addEventListener('blur', () => { isWindowFocused = false; });

    async function autoTrigger() {
        if (isAutoProcessing) return;
        isAutoProcessing = true;

        let attempts = 0;
        let links = [];
        while (attempts < 15) {
            links = Array.from(document.querySelectorAll('span[role="link"], span[role="button"], div[role="button"]'))
                .filter(el => el.textContent.trim().toLowerCase() === 'check mail now');
            if (links.length > 0) break;
            attempts++;
            await new Promise(r => setTimeout(r, 400));
        }

        if (links.length > 0) {
            links.forEach(link => {
                const opts = { bubbles: true, cancelable: true, view: window };
                link.dispatchEvent(new MouseEvent('mousedown', opts));
                link.dispatchEvent(new MouseEvent('mouseup', opts));
                link.dispatchEvent(new MouseEvent('click', opts));
            });
        }

        // Return to where we were (Inbox or specific Email)
        setTimeout(() => {
            window.location.hash = originalHash || '#inbox';
            isAutoProcessing = false;
            lastCheck = Date.now();
        }, 1200);
    }

    setInterval(() => {
        const hash = window.location.hash;

        // 1. Logic for when we are on the settings page
        if (hash.includes('#settings/accounts') && isAutoProcessing) {
            autoTrigger();
        }

        // 2. Logic for starting the check
        const isComposing = !!document.querySelector('div[role="dialog"] [aria-label*="Message Body"], .editable[aria-label*="Message Body"]');
        const timeElapsed = Date.now() - lastCheck;

        if (!isAutoProcessing && (document.hidden || !isWindowFocused) && timeElapsed > CHECK_INTERVAL) {
            if (isComposing) {
                console.log('[Auto-POP3] User is composing. Skipping check to prevent data loss.');
                lastCheck = Date.now(); // Reset timer to try again in 60s
                return;
            }

            console.log('[Auto-POP3] Inactive. Remembering current view and checking...');
            originalHash = window.location.hash; // Saves the current email ID or inbox view
            window.location.hash = '#settings/accounts';
            isAutoProcessing = true; 
        }
    }, 2000);
})();
