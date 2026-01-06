// ==UserScript==
// @name         Authorize.net 2FA Auto-Bridge (Gmail)
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Automates 2FA PIN retrieval - SPA Compatible & Auto-Send
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
        
        // 1. Monitor the page for the PIN field or the Send Button
        setInterval(() => {
            // Check for the "Email PIN" button and click it automatically
            const sendBtn = document.querySelector('button.button-submit-recovery');
            if (sendBtn && !sendBtn.dataset.clicked) {
                console.log("[Auth.net] Send Button found. Clicking...");
                sendBtn.dataset.clicked = "true"; // Mark so we don't click it 100 times
                sendBtn.click();
            }

            // Check for the PIN input field
            const pinInput = document.querySelector('input[name="input-enter-pin"]');
            if (pinInput) {
                const currentPin = GM_getValue("latest_pin", "");
                // Only paste if there is a pin and it's not already in the box
                if (currentPin && pinInput.value !== currentPin) {
                    console.log("[Auth.net] New PIN detected in storage. Injecting: " + currentPin);
                    
                    // Force the value into the field
                    pinInput.value = currentPin;

                    // IMPORTANT: Authorize.net needs these events to enable the "Submit" button
                    pinInput.dispatchEvent(new Event('input', { bubbles: true }));
                    pinInput.dispatchEvent(new Event('change', { bubbles: true }));
                    pinInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
                    pinInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' }));

                    // Try to click the Submit button after a brief pause
                    setTimeout(() => {
                        const submitBtn = document.querySelector('button[type="submit"]:not(.button-submit-recovery)');
                        if (submitBtn) {
                            console.log("[Auth.net] Submitting PIN...");
                            submitBtn.click();
                        }
                    }, 800);
                }
            }
        }, 1000);
    }

    // --- GMAIL LOGIC ---
    if (location.href.includes(GMAIL_URL)) {
        setInterval(() => {
            const isThreadOpen = location.hash.includes("#inbox/");
            const isInbox = location.hash === "#inbox" || location.hash === "" || location.hash.startsWith("#priority");

            if (isInbox) {
                const unreadEmails = document.querySelectorAll('tr.zE');
                unreadEmails.forEach(row => {
                    if (row.innerText.includes("Authorize.Net Verification PIN")) {
                        console.log("[Gmail] Authorize email found. Opening...");
                        row.click();
                    }
                });
            }

            if (isThreadOpen) {
                const emailBody = document.querySelector('.ii.gt');
                if (emailBody) {
                    const text = emailBody.innerText;
                    const pinMatch = text.match(/Your Verification PIN is: (\d{8})/);

                    if (pinMatch) {
                        const newPin = pinMatch[1];
                        if (newPin !== GM_getValue("latest_pin")) {
                            console.log("[Gmail] CAPTURED: " + newPin);
                            GM_setValue("latest_pin", newPin);
                            setTimeout(() => { window.location.hash = "#inbox"; }, 1500);
                        }
                    }
                }
            }
        }, 2000);
    }
})();
