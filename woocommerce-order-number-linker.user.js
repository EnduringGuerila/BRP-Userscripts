// ==UserScript==
// @name         WooCommerce Order Number Linker
// @namespace    https://github.com/EnduringGuerila/BRP-Userscripts/
// @version      1.3
// @description  Scans pages for WooCommerce order numbers (200000-270000) and makes them clickable links. Prevents matching numbers within longer numeric strings.
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
        if (['A', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT'].includes(node.nodeName)) {
            return;
        }

        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
        let textNode;

        while (textNode = walker.nextNode()) {
            const parent = textNode.parentNode;
            if (parent && parent.closest('a')) continue;

            const originalText = textNode.nodeValue;

            if (ORDER_NUMBER_REGEX.test(originalText)) {
                ORDER_NUMBER_REGEX.lastIndex = 0;
                const fragment = document.createDocumentFragment();
                let lastIndex = 0;
                let match;

                while ((match = ORDER_NUMBER_REGEX.exec(originalText)) !== null) {
                    const prefix = match[1] || '';
                    const orderNum = match[2];
                    const matchStart = match.index;
                    const matchEnd = match.index + match[0].length;

                    if (matchStart > lastIndex) {
                        fragment.appendChild(document.createTextNode(originalText.substring(lastIndex, matchStart)));
                    }

                    const link = document.createElement('a');
                    link.href = `${BASE_URL}${orderNum}${ACTION}`;
                    link.textContent = prefix + orderNum;
                    link.style.cssText = 'color: #1a73e8; text-decoration: underline; font-weight: 600; cursor: pointer;';
                    link.target = '_blank';
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
