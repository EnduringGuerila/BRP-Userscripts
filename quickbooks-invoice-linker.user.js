// ==UserScript==
// @name         QuickBooks Desktop Invoice Linker
// @namespace    https://github.com/EnduringGuerila/BRP-Userscripts/
// @version      1.0
// @description  Scans pages for QuickBooks invoice numbers (61000-75000) and makes them clickable.
// @author       EnduringGuerila
// @updateURL    https://raw.githubusercontent.com/EnduringGuerila/BRP-Userscripts/master/quickbooks-invoice-linker.user.js
// @downloadURL  https://raw.githubusercontent.com/EnduringGuerila/BRP-Userscripts/master/quickbooks-invoice-linker.user.js
// @grant        none
// @match        *://mail.google.com/*
// @match        *://mail.zoho.com/*
// @match        *://account.authorize.net/*
// @match        *://docs.google.com/*
// ==/UserScript==

(function() {
    'use strict';

    /**
     * NOTE: QuickBooks Desktop does not have a native global web URL.
     * If you use a specific web-connector or local relay, replace the BASE_URL below.
     * Currently, this is a placeholder format.
     */
    const BASE_URL = 'qbxml://open-invoice?number='; 

    /**
     * Regex Breakdown:
     * (?<!\d)        -> Lookbehind: Ensure the match is NOT preceded by a digit.
     * (Inv|Invoice\s*#?)? -> Optional prefix "Inv", "Invoice", or "Invoice #".
     * (6[1-9]\d{3}|7[0-4]\d{3}|75000) -> Match 61000 through 75000 (adjust as numbers grow).
     * (?!\d)         -> Lookahead: Ensure the match is NOT followed by a digit.
     */
    const INVOICE_REGEX = /(?<!\d)(Inv(?:oice)?\s*#?\s*)?(6[1-9]\d{3}|7[0-4]\d{3}|75000)(?!\d)/gi;

    function processNode(node) {
        if (['A', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT'].includes(node.nodeName)) {
            return;
        }

        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
        let textNode;

        while (textNode = walker.nextNode()) {
            const parent = textNode.parentNode;
            if (parent && parent.closest('a')) continue;

            const originalText = textNode.nodeValue;

            if (INVOICE_REGEX.test(originalText)) {
                INVOICE_REGEX.lastIndex = 0;
                const fragment = document.createDocumentFragment();
                let lastIndex = 0;
                let match;

                while ((match = INVOICE_REGEX.exec(originalText)) !== null) {
                    const fullMatch = match[0];
                    const prefix = match[1] || '';
                    const invNum = match[2];
                    const matchStart = match.index;
                    const matchEnd = match.index + fullMatch.length;

                    if (matchStart > lastIndex) {
                        fragment.appendChild(document.createTextNode(originalText.substring(lastIndex, matchStart)));
                    }

                    const link = document.createElement('a');
                    // Note: This link structure assumes you have a protocol handler for QB Desktop
                    link.href = `${BASE_URL}${invNum}`;
                    link.textContent = fullMatch;
                    link.style.cssText = 'color: #2ca01c; text-decoration: underline; font-weight: 600; cursor: pointer;';
                    link.title = `Open Invoice ${invNum} in QuickBooks`;
                    
                    fragment.appendChild(link);

                    lastIndex = matchEnd;
                }

                if (lastIndex < originalText.length) {
                    fragment.appendChild(document.createTextNode(originalText.substring(lastIndex)));
                }

                if (fragment.childNodes.length > 0 && parent) {
                    parent.replaceChild(fragment, textNode);
                }
            }
        }
    }

    function initialize() {
        processNode(document.body);
        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) processNode(node);
                });
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    initialize();
})();
