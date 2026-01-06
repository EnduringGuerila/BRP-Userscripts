// ==UserScript==
// @name         Gmail POP3 Manual Mail Checker
// @namespace    https://github.com/EnduringGuerila/BRP-Userscripts/blob/master/gmail-pop3-manual-mail-checker.user.js
// @version      3.3
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

    console.log('[POP3 Script] Monitor Started');

    const AUTO_CHECK_INTERVAL = 60000; 
    let lastAutoCheck = Date.now();
    let checkInProgress = false;

    // --- 1. The Trigger Logic (Settings Page) ---
    async function triggerPop3Check() {
        if (checkInProgress) return;
        checkInProgress = true;

        console.log('[POP3 Script] Scanning for "Check mail now" links...');

        // Gmail POP3 links usually have the 'unselectable' class or role='button'
        const findLinks = () => Array.from(document.querySelectorAll('span[role="button"], div[role="button"], a'))
            .filter(el => el.textContent.trim().toLowerCase().includes('check mail now'));

        let links = findLinks();

        // If not found, wait a bit (Gmail settings take time to render)
        if (links.length === 0) {
            for (let i = 0; i < 10; i++) {
                await new Promise(r => setTimeout(r, 500));
                links = findLinks();
                if (links.length > 0) break;
            }
        }

        if (links.length > 0) {
            console.log(`[POP3 Script] Found ${links.length} account(s). Clicking...`);
            
            for (const link of links) {
                link.focus();
                const opts = { bubbles: true, cancelable: true, view: window };
                link.dispatchEvent(new MouseEvent('mousedown', opts));
                await new Promise(r => setTimeout(r, 100)); // Mimic human press duration
                link.dispatchEvent(new MouseEvent('mouseup', opts));
                link.dispatchEvent(new MouseEvent('click', opts));
            }
            
            console.log('[POP3 Script] Success. Returning to Inbox in 2s...');
            setTimeout(() => {
                window.location.hash = '#inbox';
                checkInProgress = false;
            }, 2000);
        } else {
            console.warn('[POP3 Script] Could not find POP3 links on this page.');
            checkInProgress = false;
        }
    }

    // --- 2. The UI Logic (Inbox Page) ---
    function injectButton() {
        if (document.getElementById('gm-pop3-btn')) return;

        // More robust toolbar detection
        const refreshBtn = document.querySelector('div[aria-label="Refresh"], div[data-tooltip="Refresh"], div[aria-label="Actualizar"]');
        
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
                border: 1px solid transparent;
            `;

            btn.onclick = (e) => {
                e.preventDefault();
                console.log('[POP3 Script] Button Clicked. Navigating...');
                window.location.hash = '#settings/accounts';
            };
            
            btn.onmouseover = () => { btn.style.backgroundColor = '#d3d4d6'; };
            btn.onmouseout = () => { btn.style.backgroundColor = '#dadce0'; };

            refreshBtn.parentNode.insertBefore(btn, refreshBtn.nextSibling);
        }
    }

    // --- 3. Main Loop ---
    function mainLoop() {
        const hash = window.location.hash;

        if (hash.includes('#settings/accounts')) {
            triggerPop3Check();
        } 
        
        // Match Inbox, All Mail, or Search results to keep button visible
        if (hash.includes('#inbox') || hash === '' || hash.includes('#all') || hash.includes('#search')) {
            injectButton();
        }

        // Automatic Background Check (If tab is hidden)
        if (document.hidden && (Date.now() - lastAutoCheck > AUTO_CHECK_INTERVAL)) {
            lastAutoCheck = Date.now();
            console.log('[POP3 Script] Tab hidden. Moving to settings for auto-check.');
            window.location.hash = '#settings/accounts';
        }
    }

    setInterval(mainLoop, 2000);
    mainLoop();
})();
