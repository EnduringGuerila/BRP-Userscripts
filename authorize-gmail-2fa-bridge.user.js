// ==UserScript==
// @name         Authorize.net 2FA Auto-Bridge (Gmail)
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Automates 2FA PIN retrieval - Anti-Stale Logic
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
        setInterval(() => {
            const sendBtn = document.querySelector('button.button-submit-recovery');
            if (sendBtn && !sendBtn.dataset.clicked) {
                console.log("[Auth.net] Clearing old PIN and requesting new one...");
                GM_setValue("latest_pin", "WAITING"); // Clear the bridge
                sendBtn.dataset.clicked = "true";
                sendBtn.click();
            }

            const pinInput = document.querySelector('input[name="input-enter-pin"]');
            if (pinInput) {
                const currentPin = GM_getValue("latest_pin", "");
                // Only paste if we have a valid 8-digit number (not "WAITING" or empty)
                if (/^\d{8}$/.test(currentPin) && pinInput.value !== currentPin) {
                    console.log("[Auth.net] Valid PIN found. Injecting...");
                    pinInput.value = currentPin;

                    pinInput.dispatchEvent(new Event('input', { bubbles: true }));
                    pinInput.dispatchEvent(new Event('change', { bubbles: true }));

                    setTimeout(() => {
                        const submitBtn = document.querySelector('button[type="submit"]:not(.button-submit-recovery)');
                        if (submitBtn) submitBtn.click();
                    }, 500);
                }
            }
        }, 1000);
    }

    // --- GMAIL LOGIC ---
    if (location.href.includes(GMAIL_URL)) {
        let lastCaptured = GM_getValue("latest_pin", "");

        setInterval(() => {
            const isThreadOpen = location.hash.includes("#inbox/");
            const isInbox = location.hash === "#inbox" || location.hash === "" || location.hash.startsWith("#priority");

            // 1. If we are waiting for a PIN and in the inbox, check for unread
            if (isInbox && GM_getValue("latest_pin") === "WAITING") {
                const unreadRow = document.querySelector('tr.zE');
                if (unreadRow && unreadRow.innerText.includes("Authorize.Net Verification PIN")) {
                    console.log("[Gmail] New email detected. Opening...");
                    unreadRow.click();
                } else {
                    // If no unread found, click the Gmail 'Refresh' button every few seconds
                    const refreshBtn = document.querySelector('div[aria-label="Refresh"]');
                    if (refreshBtn) refreshBtn.click();
                }
            }

            // 2. If we are inside the email thread, scrape the PIN
            if (isThreadOpen) {
                const emailBody = document.querySelector('.ii.gt');
                if (emailBody) {
                    const text = emailBody.innerText;
                    const pinMatch = text.match(/Your Verification PIN is: (\d{8})/);

                    if (pinMatch) {
                        const newPin = pinMatch[1];
                        // Only capture if it's not the one we just used
                        if (newPin !== lastCaptured) {
                            console.log("[Gmail] CAPTURED NEW PIN: " + newPin);
                            GM_setValue("latest_pin", newPin);
                            lastCaptured = newPin;
                            
                            // Return to inbox and reset Gmail state
                            setTimeout(() => { window.location.hash = "#inbox"; }, 1000);
                        }
                    }
                }
            }
        }, 3000); // 3-second interval to give Gmail UI time to breathe
    }
})();
