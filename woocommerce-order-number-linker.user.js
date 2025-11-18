// ==UserScript==
// @name         WooCommerce Order Number Linker
// @namespace    https://github.com/EnduringGuerila/BRP-Userscripts/blob/master/woocommerce-order-number-linker.user.js
// @version      1.2
// @description  Scans pages for WooCommerce order numbers (200000-300000) and makes them clickable links to the order edit page. Fixes for Gmail/Zoho multiple instances and subject lines.
// @author       Tim Kirtland
// @grant        none
// @match        *://mail.google.com/*
// @match        *://mail.zoho.com/*
// @match        *://account.authorize.net/*
//
// ==/UserScript==

(function() {
    'use strict';

    // The base URL for the WooCommerce order edit page
    const BASE_URL = 'https://shopbrp.com/wp-admin/post.php?post=';
    const ACTION = '&action=edit';

    // Regex to find order numbers between 200000 and 300000 (inclusive)
    // /(\W)?/ makes the preceding non-word character (like #) optional.
    // (2\d{5}|300000) is the actual order number, captured in group 2.
    // \b ensures it matches whole words/boundaries.
    const ORDER_NUMBER_REGEX = /(\W)?(2\d{5}|300000)\b/g;

    /**
     * Replaces plain text order numbers with clickable links.
     * @param {Node} node - The DOM node to scan for text.
     */
    function processNode(node) {
        // Skip elements that are scripts, styles, already links, or input fields
        if (node.nodeName === 'A' || node.nodeName === 'SCRIPT' || node.nodeName === 'STYLE' || node.nodeName === 'NOSCRIPT' || node.nodeName === 'TEXTAREA' || node.nodeName === 'INPUT') {
            return;
        }

        // Use a TreeWalker to efficiently find all text nodes
        const walker = document.createTreeWalker(
            node,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let textNode;
        while (textNode = walker.nextNode()) {
            const parent = textNode.parentNode;

            // Critical check: If the text node is already inside a link, skip it.
            if (parent && parent.closest('a')) {
                continue;
            }

            const originalText = textNode.nodeValue;

            // Check if the text contains an order number
            if (ORDER_NUMBER_REGEX.test(originalText)) {
                // Reset the regex index before using exec() to ensure it starts from the beginning
                ORDER_NUMBER_REGEX.lastIndex = 0;

                const fragment = document.createDocumentFragment();
                let lastIndex = 0;
                let match;

                // Loop through all matches in the text node
                while ((match = ORDER_NUMBER_REGEX.exec(originalText)) !== null) {
                    // match[1] is the optional preceding non-word char (e.g., #)
                    const prefix = match[1] || '';
                    // match[2] is the actual 6-digit order number
                    const orderNum = match[2];

                    // The start index of the match (including the optional prefix)
                    const matchStart = match.index;
                    // The end index of the match (including the optional prefix)
                    const matchEnd = match.index + match[0].length;

                    // 1. Append the text *before* the match
                    if (matchStart > lastIndex) {
                        fragment.appendChild(document.createTextNode(originalText.substring(lastIndex, matchStart)));
                    }

                    // 2. Create and append the new <a> link
                    const link = document.createElement('a');
                    link.href = `${BASE_URL}${orderNum}${ACTION}`;
                    link.textContent = prefix + orderNum; // Link text includes the prefix (e.g., "#245882")
                    link.style.cssText = 'color: #1a73e8; text-decoration: underline; font-weight: 600; cursor: pointer;';
                    link.target = '_blank';
                    fragment.appendChild(link);

                    lastIndex = matchEnd;
                }

                // 3. Append the remaining text *after* the last match
                if (lastIndex < originalText.length) {
                    fragment.appendChild(document.createTextNode(originalText.substring(lastIndex)));
                }

                // Replace the original text node with the fragment containing text and links
                if (fragment.childNodes.length > 0 && parent) {
                    parent.replaceChild(fragment, textNode);
                }
            }
        }
    }

    /**
     * Initializes the script by processing existing content and setting up observers.
     */
    function initialize() {
        // 1. Process the existing content of the body immediately (catches initial page load)
        processNode(document.body);

        // 2. Set up a MutationObserver for dynamic content (crucial for SPAs)
        const observer = new MutationObserver(mutationsList => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    // For added nodes, process each one
                    mutation.addedNodes.forEach(node => {
                        // We only care about element nodes
                        if (node.nodeType === 1) {
                            processNode(node);
                        }
                    });
                }
            }
        });

        // Start observing the body for changes in child nodes (subtree: true is crucial)
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Run the initialization immediately to ensure the MutationObserver starts early
    initialize();

})();