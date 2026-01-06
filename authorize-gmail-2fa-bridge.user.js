// ==UserScript==
// @name         Authorize.net 2FA Auto-Bridge (Gmail)
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Automates 2FA PIN retrieval - Improved Logic & Reliability
// @author       EnduringGuerila
// @match        https://login.authorize.net/verification-required*
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
        console.log("[Auth.net] Script active. Polling for PIN...");

        // 1. Auto-trigger the email send
        const sendBtn = document.querySelector('button.button-submit-recovery');
        if (sendBtn) {
            console.log("[Auth.net] Clicking 'Email PIN'...");
            sendBtn.click();
        }

        // 2. Poll for changes in storage (Firefox handles this better than listeners)
        let lastKnownPin = GM_getValue("latest_pin", "");

        const pollTimer = setInterval(() => {
            const currentPin = GM_getValue("latest_pin", "");

            if (currentPin && currentPin !== lastKnownPin) {
                const pinInput = document.querySelector('input[name="input-enter-pin"]');
                if (pinInput) {
                    pinInput.value = currentPin;
                    pinInput.dispatchEvent(new Event('input', { bubbles: true }));
                    pinInput.dispatchEvent(new Event('change', { bubbles: true }));

                    console.log("[Auth.net] PIN Injected: " + currentPin);
                    lastKnownPin = currentPin;

                    // Clear interval and submit
                    clearInterval(pollTimer);
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
        setInterval(() => {
            const isThreadOpen = location.hash.includes("#inbox/"); // Checks if we are viewing a specific email
            const isInbox = location.hash === "#inbox" || location.hash === "";

            // A. If we are in the INBOX, find and open the email
            if (isInbox) {
                const unreadEmails = document.querySelectorAll('tr.zE');
                unreadEmails.forEach(row => {
                    if (row.innerText.includes("Authorize.Net Verification PIN")) {
                        console.log("[Gmail] Unread PIN email found. Opening...");
                        row.click();
                    }
                });
            }

            // B. If we are INSIDE the email, find the PIN
            if (isThreadOpen) {
                // We target the specific Gmail message body container (ii gt)
                const emailBody = document.querySelector('.ii.gt');
                if (emailBody) {
                    const text = emailBody.innerText;
                    const pinMatch = text.match(/Your Verification PIN is: (\d{8})/);

                    if (pinMatch) {
                        const newPin = pinMatch[1];
                        if (newPin !== GM_getValue("latest_pin")) {
                            console.log("[Gmail] NEW PIN captured: " + newPin);
                            GM_setValue("latest_pin", newPin);

                            // Auto-return to inbox
                            setTimeout(() => {
                                window.location.hash = "#inbox";
                            }, 1500);
                        }
                    }
                }
            }
        }, 2000);
    }
})();
