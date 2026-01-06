// ==UserScript==
// @name         QuickBooks Desktop Invoice Linker
// @namespace    https://github.com/EnduringGuerila/BRP-Userscripts/
// @version      1.1
// @description  Scans pages for QuickBooks invoice numbers (61000-75000) and makes them clickable. Fixes multiple detection issues and protocol handling.
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
     * NOTE: For this to work, QuickBooks Desktop requires a protocol handler.
     * If qbxml:// doesn't work, ensure your 3rd party relay/handler is installed.
     */
    const BASE_URL = 'qbxml://open-invoice?number='; 

    /**
     * Regex Breakdown:
     * (?<!\d)           -> Lookbehind: Ensure no digit precedes the match.
     * (Inv(?:oice)?\s*#?\s*)? -> Optional prefix like "Inv #", "Invoice ", etc.
     * (6[1-9]\d{3}|7[0-5]\d{3}) -> Match 61000 through 75999.
     * (?!\d)            -> Lookahead: Ensure no digit follows the match.
     */
    const INVOICE_REGEX = /(?<!\d)(Inv(?:oice)?\s*#?\s*)?(6[1-9]\d{3}|7[0-5]\d{3})(?!\d)/gi;

    function processNode(node) {
        // Skip interactive or styling elements
        if (['A', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'BUTTON'].includes(node.nodeName)) {
            return;
        }

        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
        let textNode;

        const nodesToReplace = [];

        while (textNode = walker.nextNode()) {
            const parent = textNode.parentNode;
            if (parent && parent.closest('a')) continue;

            const text = textNode.nodeValue;
            if (INVOICE_REGEX.test(text)) {
                nodesToReplace.push(textNode);
            }
        }

        nodesToReplace.forEach(node => {
            const parent = node.parentNode;
            if (!parent) return;

            const originalText = node.nodeValue;
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            let match;

            // Reset regex for each node
            INVOICE_REGEX.lastIndex = 0;

            while ((match = INVOICE_REGEX.exec(originalText)) !== null) {
                const fullMatch = match[0];
                const invNum = match[2];
                const matchStart = match.index;

                // Append text before the match
                if (matchStart > lastIndex) {
                    fragment.appendChild(document.createTextNode(originalText.substring(lastIndex, matchStart)));
                }

                // Create the QuickBooks link
                const link = document.createElement('a');
                link.href = `${BASE_URL}${invNum}`;
                link.textContent = fullMatch;
                
                // Styling: QB Green with distinct hover state
                link.style.cssText = `
                    color: #2ca01c !important; 
                    text-decoration: underline !important; 
                    font-weight: 600 !important; 
                    cursor: pointer !important;
                    display: inline !important;
                `;
                
                link.title = `Click to open Invoice ${invNum} in QuickBooks Desktop`;
                
                // Add a small event listener to log for debugging
                link.addEventListener('click', () => {
                    console.log(`[QB Linker] Attempting to open protocol: ${link.href}`);
                });

                fragment.appendChild(link);
                lastIndex = match.index + fullMatch.length;
            }

            // Append remaining text
            if (lastIndex < originalText.length) {
                fragment.appendChild(document.createTextNode(originalText.substring(lastIndex)));
            }

            if (fragment.childNodes.length > 0) {
                parent.replaceChild(fragment, node);
            }
        });
    }

    function initialize() {
        // Initial scan
        processNode(document.body);

        // Continuous scan for dynamic content (like Authorize.net tables or Gmail threads)
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(newNode => {
                    if (newNode.nodeType === 1) { // ELEMENT_NODE
                        processNode(newNode);
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Run when the DOM is ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initialize();
    } else {
        window.addEventListener('DOMContentLoaded', initialize);
    }
})();
