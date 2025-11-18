// ==UserScript==
// @name         Gmail POP3 Manual Mail Checker
// @namespace    https://github.com/EnduringGuerila/BRP-Userscripts/blob/master/gmail-pop3-manual-mail-checker.user.js
// @version      2.2
// @description  Adds a button to the Inbox toolbar that navigates to the Accounts Settings page and immediately forces a one-time POP3 mail check.
// @author       Gemini
// @grant        GM_xmlhttpRequest
// @match        *://mail.google.com/*
//
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration ---
    const POP3_LINK_TEXT_EN = 'Check mail now'; // The text for the link in English UI
    const REFRESH_LABEL = 'Refresh'; // The aria-label for the existing Gmail Refresh button
    const TOOLBAR_BUTTONS_CONTAINER_SELECTOR = 'div.bzn';

    // Check if we are on the Accounts Settings page (where the true POP3 check link lives)
    const isOnSettingsPage = window.location.hash.includes('#settings/accounts');

    // --- Core POP3 Check Logic (Runs ONLY on Settings Page) ---

    /**
     * Finds and clicks the native Gmail "Check mail now" link(s) for POP3 accounts
     * using aggressive mouse event simulation.
     * @returns {boolean} True if at least one link was found and clicked.
     */
    function autoCheckPop3() {
        // Selector 1: Try to find links that have the text (language dependent)
        let pop3Links = Array.from(document.querySelectorAll('span[role="button"], div[role="button"], a[role="button"]'))
            .filter(el => el.textContent.trim() === POP3_LINK_TEXT_EN);

        // Fallback Selector 2: Look for elements that have a 'data-popid' attribute (more reliable)
        if (pop3Links.length === 0) {
            pop3Links = Array.from(document.querySelectorAll('[data-popid]'))
                .filter(el => el.textContent.trim().toLowerCase().includes('check mail'));
        }

        if (pop3Links.length > 0) {
            pop3Links.forEach((link, index) => {
                // Use robust mousedown/mouseup/click dispatch for guaranteed click detection
                const eventConfig = {
                    view: document.defaultView,
                    bubbles: true,
                    cancelable: true
                };

                // Dispatch mousedown and mouseup events to fully simulate a physical click
                link.dispatchEvent(new MouseEvent('mousedown', eventConfig));
                link.dispatchEvent(new MouseEvent('mouseup', eventConfig));
                link.dispatchEvent(new MouseEvent('click', eventConfig)); // Also dispatch click just in case

                const accountIdentifier = link.closest('table, tr')?.querySelector('td:nth-child(2)')?.textContent?.trim() || `Account #${index + 1}`;
                console.log(`[POP3 Check] Triggered check for ${accountIdentifier}.`);
            });
            return true; // Success!
        }

        console.warn(`[POP3 Check] Could not find any "${POP3_LINK_TEXT_EN}" links.`);
        return false; // Failure to find links
    }

    // --- Settings Page Initialization (Manual Check Logic) ---

    if (isOnSettingsPage) {
        // --- LOGIC FOR ACCOUNTS SETTINGS PAGE: ONE-TIME CHECK ---

        const MAX_INITIAL_ATTEMPTS = 10; // Try for up to 5 seconds (10 attempts * 500ms)
        let attemptCount = 0;
        let initialCheckInterval;

        /**
         * The loop function that runs repeatedly until the links are found and clicked.
         */
        function runInitialCheckLoop() {
            if (autoCheckPop3()) {
                // Success: Links found and clicked. Clear the polling interval and stop.
                clearInterval(initialCheckInterval);
                console.log('[POP3 Manual Check] Check successful. Polling stopped.');

            } else if (attemptCount >= MAX_INITIAL_ATTEMPTS) {
                // Failure: Max attempts reached. Clear the polling interval and stop.
                clearInterval(initialCheckInterval);
                console.error('[POP3 Manual Check] Failed to find "Check mail now" links within the allowed time. Check failed.');
            }
            attemptCount++;
        }

        // Start polling immediately after the navigation happens (checks every 500ms)
        initialCheckInterval = setInterval(runInitialCheckLoop, 500);

        console.log('POP3 Checker: Initializing aggressive polling check on Accounts Settings page.');

    } else {
        // --- LOGIC FOR INBOX PAGE (Add Button) ---

        /**
         * Action for the custom button: navigates to the Settings > Accounts hash.
         */
        function navigateToSettings() {
            console.log('Navigating to Settings page to initiate POP3 mail check.');
            // This will trigger the Settings Page logic block to run upon navigation completion
            window.location.hash = '#settings/accounts';
        }

        /**
         * Creates and adds the manual 'Check POP3' button right next to the Refresh icon.
         */
        function addManualCheckButton() {
            const toolbarContainer = document.querySelector(TOOLBAR_BUTTONS_CONTAINER_SELECTOR);
            if (!toolbarContainer) return;

            const existingRefreshButton = toolbarContainer.querySelector(`div[aria-label="${REFRESH_LABEL}"]`);

            if (existingRefreshButton) {
                const refreshGroupContainer = existingRefreshButton.parentNode;

                // --- 1. Create the new button element ---
                const newButton = document.createElement('div');
                newButton.setAttribute('role', 'button');
                newButton.setAttribute('tabindex', '0');
                newButton.setAttribute('aria-label', 'Check POP3 Mail Now');

                // Custom styling for a compact, text-based Gmail toolbar button
                newButton.style.cssText = `
                    min-width: unset !important;
                    height: 26px;
                    line-height: 26px;
                    padding: 0 8px;
                    margin-left: 8px;
                    background-color: #dadce0;
                    color: #202124;
                    font-size: 11px;
                    font-weight: 500;
                    border-radius: 4px;
                    cursor: pointer;
                    user-select: none;
                    display: inline-block;
                    transition: background-color 0.2s;
                `;

                newButton.textContent = 'Check POP3';

                // Add hover/active styling
                newButton.onmouseover = () => newButton.style.backgroundColor = '#d3d4d6';
                newButton.onmouseout = () => newButton.style.backgroundColor = '#dadce0';

                // Attach the navigation function
                newButton.addEventListener('click', navigateToSettings);

                // --- 2. Insert the new button next to the existing Refresh icon ---
                refreshGroupContainer.insertBefore(newButton, existingRefreshButton.nextSibling);

                console.log('Manual POP3 check button successfully added to Inbox toolbar.');
            }
        }

        /**
         * Initializes the button addition process for the Inbox page.
         */
        function initializeInboxButton() {
            setTimeout(() => {
                const observer = new MutationObserver((mutationsList, observerInstance) => {
                    const toolbarContainer = document.querySelector(TOOLBAR_BUTTONS_CONTAINER_SELECTOR);
                    if (toolbarContainer) {
                        observerInstance.disconnect();
                        // Use a small delay to ensure all related elements are fully ready
                        setTimeout(addManualCheckButton, 500);
                    }
                });

                observer.observe(document.body, { childList: true, subtree: true });
            }, 100);
        }

        initializeInboxButton();
        console.log('POP3 Checker: Inbox active. Button added.');
    }

})();