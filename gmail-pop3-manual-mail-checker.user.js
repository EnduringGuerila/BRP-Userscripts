// ==UserScript==
// @name          Gmail POP3 Manual & Auto Checker
// @namespace     https://github.com/EnduringGuerila/BRP-Userscripts/
// @version       3.0
// @description   Adds a persistent "Check POP3" button and runs an automated check every 60 seconds when the tab is inactive.
// @author       EnduringGuerila
// @updateURL    https://raw.githubusercontent.com/EnduringGuerila/BRP-Userscripts/master/gmail-pop3-manual-mail-checker.user.js
// @downloadURL  https://raw.githubusercontent.com/EnduringGuerila/BRP-Userscripts/master/gmail-pop3-manual-mail-checker.user.js
// @match         *://mail.google.com/*
// @grant         none
// ==/UserScript==

(function() {
    'use strict';

    const POP3_LINK_TEXT_EN = 'Check mail now';
    const REFRESH_LABEL = 'Refresh';
    const AUTO_CHECK_INTERVAL = 60000; // 60 seconds
    let lastAutoCheck = Date.now();

    // --- Core Logic: The "Check mail now" Trigger ---

    function triggerPop3Check() {
        let pop3Links = Array.from(document.querySelectorAll('span[role="button"], div[role="button"], a[role="button"], [data-popid]'))
            .filter(el => el.textContent.trim().includes(POP3_LINK_TEXT_EN) || el.textContent.toLowerCase().includes('check mail now'));

        if (pop3Links.length > 0) {
            pop3Links.forEach(link => {
                const e = { bubbles: true, cancelable: true, view: window };
                link.dispatchEvent(new MouseEvent('mousedown', e));
                link.dispatchEvent(new MouseEvent('mouseup', e));
                link.dispatchEvent(new MouseEvent('click', e));
            });
            console.log('[POP3] Check triggered. Returning to inbox...');
            window.location.hash = '#inbox';
            return true;
        }
        return false;
    }

    // --- UI Logic: Persistent Button Insertion ---

    function addManualCheckButton() {
        // Prevent duplicate buttons
        if (document.getElementById('gm-pop3-btn')) return;

        const refreshBtn = document.querySelector(`div[aria-label="${REFRESH_LABEL}"]`);
        if (!refreshBtn) return;

        const btn = document.createElement('div');
        btn.id = 'gm-pop3-btn';
        btn.setAttribute('role', 'button');
        btn.textContent = 'Check POP3';
        btn.style.cssText = `
            display: inline-block; padding: 0 8px; margin-left: 8px;
            background-color: #dadce0; color: #202124; font-size: 11px;
            font-weight: 500; border-radius: 4px; cursor: pointer;
            height: 26px; line-height: 26px; user-select: none;
        `;

        btn.onclick = () => { window.location.hash = '#settings/accounts'; };
        btn.onmouseover = () => { btn.style.backgroundColor = '#d3d4d6'; };
        btn.onmouseout = () => { btn.style.backgroundColor = '#dadce0'; };

        refreshBtn.parentNode.insertBefore(btn, refreshBtn.nextSibling);
    }

    // --- Automation: Background Checker ---

    function runBackgroundMonitor() {
        // 1. If we are on the settings page, try to click the button immediately
        if (window.location.hash.includes('#settings/accounts')) {
            const found = triggerPop3Check();
            if (!found) {
                // If not found yet (page still loading), retry briefly
                setTimeout(triggerPop3Check, 1000);
            }
        }

        // 2. If tab is hidden and 60s passed, go to settings
        setInterval(() => {
            if (document.hidden && (Date.now() - lastAutoCheck > AUTO_CHECK_INTERVAL)) {
                console.log('[POP3] Tab is inactive. Starting auto-check...');
                lastAutoCheck = Date.now();
                window.location.hash = '#settings/accounts';
            }
        }, 5000); // Check state every 5 seconds
    }

    // --- Initialization: MutationObserver ---

    // This observer stays active. Whenever Gmail swaps the UI (Inbox -> Email -> Inbox), 
    // it looks for the Refresh button and re-injects our button.
    const observer = new MutationObserver(() => {
        addManualCheckButton();
        
        // Handle the settings page logic if we just navigated there
        if (window.location.hash.includes('#settings/accounts')) {
            triggerPop3Check();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    runBackgroundMonitor();

})();
