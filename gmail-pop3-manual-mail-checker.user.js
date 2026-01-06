// ==UserScript==
// @name         Gmail POP3 Manual Mail Checker
// @namespace    https://github.com/EnduringGuerila/BRP-Userscripts/blob/master/gmail-pop3-manual-mail-checker.user.js
// @version      3.6
// @description  Adds a button to the Inbox toolbar. Navigates to Settings, checks POP3, and returns to Inbox ONLY if triggered by the script.
// @author       EnduringGuerila
// @updateURL    https://raw.githubusercontent.com/EnduringGuerila/BRP-Userscripts/master/gmail-pop3-manual-mail-checker.user.js
// @downloadURL  https://raw.githubusercontent.com/EnduringGuerila/BRP-Userscripts/master/gmail-pop3-manual-mail-checker.user.js
// @grant        none
// @match        *://mail.google.com/*
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.log('[POP3 Script] Monitor Active - v3.6');

    const AUTO_CHECK_INTERVAL = 60000; 
    let lastInteractionTime = Date.now();
    let isProcessing = false;
    let isWindowFocused = true;
    let wasScriptTriggered = false; // The "Return to Inbox" gatekeeper

    // --- Window Focus Tracking ---
    window.addEventListener('focus', () => {
        isWindowFocused = true;
        lastInteractionTime = Date.now();
    });
    
    window.addEventListener('blur', () => {
        isWindowFocused = false;
    });

    // Function to navigate safely
    function navigateToSettings(isAuto = false) {
        console.log(`[POP3 Script] ${isAuto ? 'Auto' : 'Manual'} check initiated.`);
        wasScriptTriggered = true; // Set the flag so we know to return later
        window.location.hash = '#settings/accounts';
    }

    // --- 1. The Trigger Logic (Settings Page) ---
    async function triggerPop3Check() {
        if (isProcessing) return;
        isProcessing = true;

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
            console.log(`[POP3 Script] Found ${links.length} account(s). Triggering...`);
            links.forEach(link => {
                const opts = { bubbles: true, cancelable: true, view: window };
                link.dispatchEvent(new MouseEvent('mousedown', opts));
                link.dispatchEvent(new MouseEvent('mouseup', opts));
                link.dispatchEvent(new MouseEvent('click', opts));
            });

            // Only return to inbox if the script was the one that brought us here
            if (wasScriptTriggered) {
                setTimeout(() => {
                    console.log('[POP3 Script] Returning to inbox...');
                    window.location.hash = '#inbox';
                    wasScriptTriggered = false; // Reset flag
                    isProcessing = false;
                    lastInteractionTime = Date.now();
                }, 1500);
            } else {
                console.log('[POP3 Script] Check complete. User is here manually; staying on page.');
                isProcessing = false;
            }
        } else {
            // If we fail to find links but the script triggered it, go back to avoid being stuck
            if (wasScriptTriggered) {
                window.location.hash = '#inbox';
                wasScriptTriggered = false;
            }
            isProcessing = false;
        }
    }

    // --- 2. UI Injection ---
    function injectButton() {
        if (document.getElementById('gm-pop3-btn')) return;

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
                navigateToSettings(false);
            };
            
            refreshBtn.parentNode.insertBefore(btn, refreshBtn.nextSibling);
        }
    }

    // --- 3. Main Loop ---
    function run() {
        const hash = window.location.hash;

        if (hash.includes('#settings/accounts')) {
            triggerPop3Check();
        } else {
            // Reset the script flag if the user navigates away from settings on their own
            wasScriptTriggered = false;
        }
        
        if (hash.includes('#inbox') || hash.includes('#all') || hash === '') {
            injectButton();
        }

        const timeSinceLastCheck = Date.now() - lastInteractionTime;
        if (!isProcessing && (document.hidden || !isWindowFocused) && timeSinceLastCheck > AUTO_CHECK_INTERVAL) {
            lastInteractionTime = Date.now();
            navigateToSettings(true);
        }
    }

    setInterval(run, 1500);
    run();

})();
