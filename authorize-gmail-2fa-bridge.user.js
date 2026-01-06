// ==UserScript==
// @name         Authorize.net 2FA Auto-Bridge (Gmail)
// @namespace    http://tampermonkey.net/
// @version      1.0
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

    // --- CONFIGURATION ---
    const AUTH_URL = "login.authorize.net";
    const GMAIL_URL = "mail.google.com";

    // --- LOGIC FOR AUTHORIZE.NET ---
    if (location.href.includes(AUTH_URL)) {
        console.log("Auth.net Monitor Active...");

        // 1. Auto-click the "Email PIN" button if visible
        const sendBtn = document.querySelector('button.button-submit-recovery');
        if (sendBtn) {
            console.log("Triggering Email PIN send...");
            sendBtn.click();
        }

        // 2. Wait for the Gmail script to send the code
        GM_addValueChangeListener("latest_pin", (name, old_value, new_value, remote) => {
            if (remote) { // Only react if the value came from the Gmail tab
                const pinInput = document.querySelector('input[name="input-enter-pin"]');
                if (pinInput) {
                    pinInput.value = new_value;
                    console.log("PIN Pasted: " + new_value);

                    // Optional: Auto-submit after a small delay
                    setTimeout(() => {
                        const submitBtn = document.querySelector('button[type="submit"]:not(.button-submit-recovery)');
                        if (submitBtn) submitBtn.click();
                    }, 500);
                }
            }
        });
    }

    // --- LOGIC FOR GMAIL ---
    if (location.href.includes(GMAIL_URL)) {
        console.log("Gmail Monitor Active...");

        setInterval(() => {
            // A. Look for the PIN in the email body (if email is already open)
            const bodyText = document.body.innerText;
            const pinMatch = bodyText.match(/Your Verification PIN is: (\d{8})/);

            if (pinMatch) {
                const pin = pinMatch[1];
                if (GM_getValue("latest_pin") !== pin) {
                    console.log("New PIN found: " + pin);
                    GM_setValue("latest_pin", pin);
                }
            }

            // B. If not open, look for the unread Authorize.net email in the list
            // Gmail uses 'bog' for subject text spans
            const emailThreads = document.querySelectorAll('tr.zA'); // Inbox rows
            emailThreads.forEach(row => {
                const subject = row.querySelector('span.bog');
                if (subject && subject.innerText.includes("Authorize.Net Verification PIN")) {
                    // Check if it's "new" (roughly checking if it's unread)
                    if (row.classList.contains('zE')) {
                        console.log("Found unread PIN email, opening...");
                        subject.click();
                    }
                }
            });
        }, 2000); // Check every 2 seconds
    }
})();
