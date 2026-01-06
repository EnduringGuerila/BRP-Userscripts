// ==UserScript==
// @name         Gmail POP3 Manual Mail Checker
// @namespace    https://github.com/EnduringGuerila/BRP-Userscripts/blob/master/gmail-pop3-manual-mail-checker.user.js
// @version      3.4
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
    let isProcessing = false;

    // --- 1. The Trigger Logic ---
    async function triggerPop3Check() {
        if (isProcessing) return;
        isProcessing = true;

        console.log('[POP3 Script] Searching for links with role="link" and text "Check mail now"...');

        let attempts = 0;
        let links = [];

        // Retry loop: Gmail settings often load the "frame" before the actual account data
        while (attempts < 15) {
            links = Array.from(document.querySelectorAll('span[role="link"], span[role="button"], div[role="button"]'))
                .filter(el => el.textContent.trim().toLowerCase() === 'check mail now');

            if (links.length > 0) break;
            
            attempts++;
            await new Promise(r => setTimeout(r, 400));
        }

        if (links.length > 0) {
            console.log(`[POP3 Script] Found ${links.length} account(s). Clicking now...`);
            
            links.forEach(link => {
                const opts = { bubbles: true, cancelable: true, view: window };
                link.dispatchEvent(new MouseEvent('mousedown', opts));
                link.dispatchEvent(new MouseEvent('mouseup', opts));
                link.dispatchEvent(new MouseEvent('click', opts));
            });

            // Wait for Gmail to acknowledge the clicks
            setTimeout(() => {
                console.log('[POP3 Script] Finished. Returning to inbox.');
                window.location.hash = '#inbox';
                isProcessing = false;
            }, 1500);
        } else {
            console.error('[POP3 Script] Failed to find links after 15 attempts.');
            // Go back anyway so the user/auto-checker isn't stuck in settings
            window.location.hash = '#inbox';
            isProcessing = false;
        }
    }

    // --- 2. UI Injection ---
    function injectButton() {
        if (document.getElementById('gm-pop3-btn')) return;

        // Target the Refresh button
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
                border: 1px solid #bdc1c6;
            `;

            btn.onclick = (e) => {
                e.preventDefault();
                console.log('[POP3 Script] Manual trigger clicked.');
                window.location.hash = '#settings/accounts';
            };
            
            btn.onmouseover = () => { btn.style.backgroundColor = '#d3d4d6'; };
            btn.onmouseout = () => { btn.style.backgroundColor = '#dadce0'; };

            refreshBtn.parentNode.insertBefore(btn, refreshBtn.nextSibling);
        }
    }

    // --- 3. Execution Loop ---
    function run() {
        const hash = window.location.hash;

        // If we just landed on the accounts page
        if (hash.includes('#settings/accounts')) {
            triggerPop3Check();
        } 
        
        // If we are in any list view (Inbox, All Mail, Search, Trash, etc.)
        if (hash.includes('#inbox') || hash.includes('#all') || hash.includes('#search') || hash.includes('#trash') || hash === '') {
            injectButton();
        }

        // Background Check Logic
        if (document.hidden && (Date.now() - lastAutoCheck > AUTO_CHECK_INTERVAL)) {
            lastAutoCheck = Date.now();
            console.log('[POP3 Script] Auto-check triggered (Tab hidden).');
            window.location.hash = '#settings/accounts';
        }
    }

    // Run every 1.5 seconds to ensure the button is re-injected when navigating back to inbox
    setInterval(run, 1500);
    run();

})();
