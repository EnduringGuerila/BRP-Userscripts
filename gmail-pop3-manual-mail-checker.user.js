// ==UserScript==
// @name         Gmail POP3 Manual Mail Checker
// @namespace    https://github.com/EnduringGuerila/BRP-Userscripts/blob/master/gmail-pop3-manual-mail-checker.user.js
// @version      4.0-Manual
// @description  Adds a button to the Inbox toolbar. Navigates to Settings, checks POP3, and returns to Inbox.
// @author       EnduringGuerila
// @updateURL    https://raw.githubusercontent.com/EnduringGuerila/BRP-Userscripts/master/gmail-pop3-manual-mail-checker.user.js
// @downloadURL  https://raw.githubusercontent.com/EnduringGuerila/BRP-Userscripts/master/gmail-pop3-manual-mail-checker.user.js
// @grant        none
// @match        *://mail.google.com/*
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    let isManualTrigger = false;

    async function triggerPop3Check() {
        if (!isManualTrigger) return;

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
            links.forEach(link => {
                const opts = { bubbles: true, cancelable: true, view: window };
                link.dispatchEvent(new MouseEvent('mousedown', opts));
                link.dispatchEvent(new MouseEvent('mouseup', opts));
                link.dispatchEvent(new MouseEvent('click', opts));
            });
            setTimeout(() => {
                window.location.hash = '#inbox';
                isManualTrigger = false;
            }, 1000);
        }
    }

    function injectButton() {
        if (document.getElementById('gm-pop3-btn')) return;
        const refreshBtn = document.querySelector('div[aria-label="Refresh"], div[data-tooltip="Refresh"]');
        if (refreshBtn && refreshBtn.parentNode) {
            const btn = document.createElement('div');
            btn.id = 'gm-pop3-btn';
            btn.setAttribute('role', 'button');
            btn.textContent = 'Check POP3';
            btn.style.cssText = `display: inline-flex; align-items: center; justify-content: center; padding: 0 10px; margin: 0 8px; background-color: #dadce0; color: #202124; font-size: 11px; font-weight: 500; border-radius: 4px; cursor: pointer; height: 24px; line-height: 24px; vertical-align: middle; border: 1px solid #bdc1c6;`;
            btn.onclick = (e) => {
                e.preventDefault();
                isManualTrigger = true;
                window.location.hash = '#settings/accounts';
            };
            refreshBtn.parentNode.insertBefore(btn, refreshBtn.nextSibling);
        }
    }

    setInterval(() => {
        const hash = window.location.hash;
        if (hash.includes('#settings/accounts')) triggerPop3Check();
        if (hash.includes('#inbox') || hash.includes('#all') || hash === '') injectButton();
    }, 1500);
})();
