// ==UserScript==
// @name         Gmail POP3 Manual Mail Checker
// @namespace    https://github.com/EnduringGuerila/BRP-Userscripts/blob/master/gmail-pop3-manual-mail-checker.user.js
// @version      3.2
// @description  Adds a button to the Inbox toolbar that navigates to the Accounts Settings page, forces a one-time POP3 mail check, and navigates back to the Inbox.
// @author       EnduringGuerila
// @updateURL    https://raw.githubusercontent.com/EnduringGuerila/BRP-Userscripts/master/gmail-pop3-manual-mail-checker.user.js
// @downloadURL  https://raw.githubusercontent.com/EnduringGuerila/BRP-Userscripts/master/gmail-pop3-manual-mail-checker.user.js
// @grant        none
// @match        *://mail.google.com/*
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.log('[POP3 Script] Monitor Active');

    const AUTO_CHECK_INTERVAL = 60000; 
    let lastAutoCheck = Date.now();
    let isChecking = false;

    // --- 1. The Trigger Logic (Settings Page) ---
    function triggerPop3Check() {
        if (isChecking) return;
        
        const links = Array.from(document.querySelectorAll('span[role="button"], div[role="button"], a'))
            .filter(el => el.textContent.trim().toLowerCase().includes('check mail now'));

        if (links.length > 0) {
            isChecking = true;
            console.log(`[POP3 Script] Found ${links.length} account(s). Triggering...`);
            
            links.forEach(link => {
                const opts = { bubbles: true, cancelable: true, view: window };
                link.dispatchEvent(new MouseEvent('mousedown', opts));
                link.dispatchEvent(new MouseEvent('mouseup', opts));
                link.dispatchEvent(new MouseEvent('click', opts));
            });
            
            // Short delay to ensure Gmail registers the command before we leave
            setTimeout(() => {
                window.location.hash = '#inbox';
                isChecking = false;
            }, 1000);
        }
    }

    // --- 2. The UI Logic (Inbox Page) ---
    function injectButton() {
        if (document.getElementById('gm-pop3-btn')) return;

        // Gmail's toolbar uses several different selectors depending on the view
        const toolbar = document.querySelector('div.bzn, div.G-atb');
        const refreshBtn = document.querySelector('div[aria-label="Refresh"], div[data-tooltip="Refresh"]');
        
        if (refreshBtn && refreshBtn.parentNode) {
            const btn = document.createElement('div');
            btn.id = 'gm-pop3-btn';
            btn.setAttribute('role', 'button');
            btn.textContent = 'Check POP3';
            btn.style.cssText = `
                display: inline-flex; align-items: center; justify-content: center;
                padding: 0 10px; margin: 0 8px;
                background-color: #dadce0; color: #202124; font-size: 11px;
                font-weight: 500; border-radius: 4px; cursor: pointer;
                height: 24px; line-height: 24px; vertical-align: middle;
            `;

            btn.onclick = () => { window.location.hash = '#settings/accounts'; };
            btn.onmouseover = () => { btn.style.backgroundColor = '#d3d4d6'; };
            btn.onmouseout = () => { btn.style.backgroundColor = '#dadce0'; };

            refreshBtn.parentNode.insertBefore(btn, refreshBtn.nextSibling);
        }
    }

    // --- 3. Main Loop ---
    function mainLoop() {
        const hash = window.location.hash;

        // Route: Settings Page
        if (hash.includes('#settings/accounts')) {
            triggerPop3Check();
        } 
        
        // Route: Inbox
        if (hash.includes('#inbox') || hash === '' || hash === '#all') {
            injectButton();
        }

        // Automatic Background Check (If tab is hidden)
        if (document.hidden && (Date.now() - lastAutoCheck > AUTO_CHECK_INTERVAL)) {
            lastAutoCheck = Date.now();
            console.log('[POP3 Script] Auto-triggering check due to inactivity.');
            window.location.hash = '#settings/accounts';
        }
    }

    // High-frequency check to handle Gmail's fast UI swaps
    setInterval(mainLoop, 1500);

    // Initial check
    mainLoop();
})();
