// ==UserScript==
// @name         Authorize.net 2FA Auto-Bridge (Gmail)
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Automates 2FA PIN retrieval - Anti-Throttling & Input Fix
// @author       EnduringGuerila
// @match        https://login.authorize.net/*
// @match        https://mail.google.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @updateURL    https://raw.githubusercontent.com/EnduringGuerila/BRP-Userscripts/master/authorize-gmail-2fa-bridge.user.js
// @downloadURL  https://raw.githubusercontent.com/EnduringGuerila/BRP-Userscripts/master/authorize-gmail-2fa-bridge.user.js
// ==/UserScript==

(function() {
    'use strict';

    const AUTH_URL = "login.authorize.net";
    const GMAIL_URL = "mail.google.com";

    // --- AUTHORIZE.NET LOGIC ---
    if (location.href.includes(AUTH_URL)) {
        let isPasting = false;

        setInterval(() => {
            const sendBtn = document.querySelector('button.button-submit-recovery');
            if (sendBtn && !sendBtn.dataset.clicked) {
                console.log("[Auth.net] Requesting PIN...");
                GM_setValue("latest_pin", "WAITING");
                sendBtn.dataset.clicked = "true";
                sendBtn.click();
            }

            const pinInput = document.querySelector('input[name="input-enter-pin"]');
            if (pinInput && !isPasting) {
                const currentPin = GM_getValue("latest_pin", "");
                
                if (/^\d{8}$/.test(currentPin) && pinInput.value !== currentPin) {
                    isPasting = true;
                    console.log("[Auth.net] Injecting: " + currentPin);
                    
                    // 1. Focus the element first
                    pinInput.focus();
                    
                    // 2. Set value
                    pinInput.value = currentPin;

                    // 3. Trigger events in a specific order with a slight delay
                    pinInput.dispatchEvent(new Event('input', { bubbles: true }));
                    pinInput.dispatchEvent(new Event('change', { bubbles: true }));
                    pinInput.dispatchEvent(new Event('blur', { bubbles: true })); // Tell the site we are "done" typing

                    // 4. Click Submit with a longer delay to let the site's JS catch up
                    setTimeout(() => {
                        const submitBtn = document.querySelector('button[aria-label="VERIFY PIN"]');
                        if (submitBtn) {
                            console.log("[Auth.net] Clicking Verify...");
                            submitBtn.click();
                            // If clicking fails, try a direct form submission
                            submitBtn.closest('form')?.requestSubmit();
                        }
                        isPasting = false;
                    }, 1000); 
                }
            }
        }, 1500);
    }

    // --- GMAIL LOGIC ---
    if (location.href.includes(GMAIL_URL)) {
        // Anti-Throttling: This keeps the tab "alive" in the browser's eyes
        const heartbeat = () => { console.log("Gmail bridge heartbeat..."); };
        setInterval(heartbeat, 30000);

        setInterval(() => {
            const isThreadOpen = location.hash.includes("#inbox/");
            const isInbox = location.hash === "#inbox" || location.hash === "" || location.hash.startsWith("#priority") || location.hash.startsWith("#all");

            if (isInbox && GM_getValue("latest_pin") === "WAITING") {
                // Look for unread row
                const unreadRow = document.querySelector('tr.zE');
                if (unreadRow && unreadRow.innerText.includes("Authorize.Net Verification PIN")) {
                    unreadRow.click();
                } else {
                    // Force Gmail to check for new mail
                    const refreshBtn = document.querySelector('div[aria-label="Refresh"]');
                    if (refreshBtn) refreshBtn.click();
                }
            }

            if (isThreadOpen) {
                const emailBody = document.querySelector('.ii.gt');
                if (emailBody) {
                    const text = emailBody.innerText;
                    const pinMatch = text.match(/Your Verification PIN is: (\d{8})/);

                    if (pinMatch) {
                        const newPin = pinMatch[1];
                        if (newPin !== GM_getValue("latest_pin")) {
                            GM_setValue("latest_pin", newPin);
                            console.log("[Gmail] Captured: " + newPin);
                            setTimeout(() => { window.location.hash = "#inbox"; }, 1000);
                        }
                    }
                }
            }
        }, 2000); 
    }
})();
