// ==UserScript==
// @name         WooCommerce Order Number Linker
// @namespace    https://github.com/EnduringGuerila/BRP-Userscripts/
// @version      1.4
// @description  Scans pages for WooCommerce order numbers (200000-270000) and makes them clickable links. Prevents matching numbers within longer numeric strings and handles multiple matches per node.
// @author       EnduringGuerila
// @updateURL    https://raw.githubusercontent.com/EnduringGuerila/BRP-Userscripts/master/woocommerce-order-number-linker.user.js
// @downloadURL  https://raw.githubusercontent.com/EnduringGuerila/BRP-Userscripts/master/woocommerce-order-number-linker.user.js
// @grant        none
// @match        *://mail.google.com/*
// @match        *://mail.zoho.com/*
// @match        *://account.authorize.net/*
// @match        *://docs.google.com/*
// ==/UserScript==

(function() {
    'use strict';

    // The base URL for the WooCommerce order edit page
    const BASE_URL = 'https://shopbrp.com/wp-admin/post.php?post=';
    const ACTION = '&action=edit';

    /**
     * Regex Breakdown:
     * (?<!\d)        -> Lookbehind: Ensure the match is NOT preceded by a digit.
     * (#)?           -> Capture Group 1: Optional hash symbol.
     * (2[0-6]\d{4}|270000) -> Capture Group 2: Match 200000 through 270000.
     * (?!\d)         -> Lookahead: Ensure the match is NOT followed by a digit.
     */
    const ORDER_NUMBER_REGEX = /(?<!\d)(#)?(2[0-6]\d{4}|270000)(?!\d)/g;

    function processNode(node) {
        // Skip elements that are scripts, styles, already links, or input fields
        if (['A', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'BUTTON'].includes(node.nodeName)) {
            return;
        }

        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
        let textNode;
        const nodesToReplace = [];

        // First, find all text nodes that contain at least one match
        while (textNode = walker.nextNode()) {
            const parent = textNode.parentNode;
            if (parent && parent.closest('a')) continue;

            const text = textNode.nodeValue;
            if (ORDER_NUMBER_REGEX.test(text)) {
                nodesToReplace.push(textNode);
            }
        }

        // Process each identified text node
        nodesToReplace.forEach(node => {
            const parent = node.parentNode;
            if (!parent) return;

            const originalText = node.nodeValue;
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            let match;

            // Reset the regex index for each node to ensure all matches are found
            ORDER_NUMBER_REGEX.lastIndex = 0;

            while ((match = ORDER_NUMBER_REGEX.exec(originalText)) !== null) {
                const prefix = match[1] || '';
                const orderNum = match[2];
                const fullMatch = match[0];
                const matchStart = match.index;

                // 1. Append the text *before* the match
                if (matchStart > lastIndex) {
                    fragment.appendChild(document.createTextNode(originalText.substring(lastIndex, matchStart)));
                }

                // 2. Create and append the new <a> link
                const link = document.createElement('a');
                link.href = `${BASE_URL}${orderNum}${ACTION}`;
                link.textContent = fullMatch;
                link.style.cssText = 'color: #1a73e8 !important; text-decoration: underline !important; font-weight: 600 !important; cursor: pointer !important; display: inline !important;';
                link.target = '_blank';
                fragment.appendChild(link);

                lastIndex = match.index + fullMatch.length;
            }

            // 3. Append the remaining text *after* the last match
            if (lastIndex < originalText.length) {
                fragment.appendChild(document.createTextNode(originalText.substring(lastIndex)));
            }

            // Replace the original text node with the fragment
            if (fragment.childNodes.length > 0) {
                parent.replaceChild(fragment, node);
            }
        });
    }

    /**
     * Initializes the script by processing existing content and setting up observers.
     */
    function initialize() {
        processNode(document.body);

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
