// ==UserScript==
// @name         Authorize.net 2FA Auto-Bridge (Gmail)
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Automates 2FA PIN retrieval between Gmail and Authorize.net
// @author       EnduringGuerila
// @updateURL    https://raw.githubusercontent.com/EnduringGuerila/BRP-Userscripts/master/authorize-gmail-2fa-bridge.user.js
// @downloadURL  https://raw.githubusercontent.com/EnduringGuerila/BRP-Userscripts/master/authorize-gmail-2fa-bridge.user.js
// @match        https://login.authorize.net/verification-required*
// @match        https://mail.google.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// ==/UserScript==

(function() {
    'use strict';

    const AUTH_URL = "login.authorize.net";
    const GMAIL_URL = "mail.google.com";

    // --- AUTHORIZE.NET LOGIC ---
    if (location.href.includes(AUTH_URL)) {
        console.log("Auth.net: Waiting for PIN...");

        // Auto-click "Email PIN" button if it exists
        const sendBtn = document.querySelector('button.button-submit-recovery');
        if (sendBtn) sendBtn.click();

        GM_addValueChangeListener("latest_pin", (name, old_val, new_val, remote) => {
            if (remote) {
                // Find input by the name attribute since ID is dynamic
                const pinInput = document.querySelector('input[name="input-enter-pin"]');
                if (pinInput) {
                    pinInput.value = new_val;
                    
                    // Trigger events so the website "registers" the typing
                    pinInput.dispatchEvent(new Event('input', { bubbles: true }));
                    pinInput.dispatchEvent(new Event('change', { bubbles: true }));

                    console.log("PIN Injected: " + new_val);

                    // Auto-submit
                    setTimeout(() => {
                        const submitBtn = document.querySelector('button[type="submit"]:not(.button-submit-recovery)');
                        if (submitBtn) submitBtn.click();
                    }, 600);
                }
            }
        });
    }

    // --- GMAIL LOGIC ---
    if (location.href.includes(GMAIL_URL)) {
        let isProcessing = false;

        setInterval(() => {
            if (isProcessing) return; // Prevent loop during navigation

            const bodyText = document.body.innerText;
            const pinMatch = bodyText.match(/Your Verification PIN is: (\d{8})/);

            // 1. If PIN is found in an open email
            if (pinMatch) {
                const pin = pinMatch[1];
                const lastUsed = GM_getValue("latest_pin");

                if (pin !== lastUsed) {
                    isProcessing = true;
                    console.log("PIN Found: " + pin);
                    GM_setValue("latest_pin", pin);

                    // Wait a moment then go back to inbox
                    setTimeout(() => {
                        console.log("Returning to inbox...");
                        window.location.hash = "#inbox"; 
                        // Alternatively: window.history.back();
                        isProcessing = false;
                    }, 1000);
                }
            }

            // 2. Scan Inbox for the specific unread email
            const unreadEmails = document.querySelectorAll('tr.zE'); // 'zE' is Gmail's class for unread rows
            unreadEmails.forEach(row => {
                if (row.innerText.includes("Authorize.Net Verification PIN")) {
                    console.log("Authorize email detected. Opening...");
                    isProcessing = true;
                    row.click();
                    // Reset processing after a delay to allow the email to load
                    setTimeout(() => { isProcessing = false; }, 3000);
                }
            });

        }, 2000);
    }
})();
