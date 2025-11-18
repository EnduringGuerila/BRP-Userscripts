// ==UserScript==
// @name         Universal Shipment Tracker Linker
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Scans pages for FedEx, UPS, and USPS tracking numbers and makes them clickable links.
// @author       Tim Kirtland
// @grant        none
// @match        *://*/*
//
// ==/UserScript==

(function() {
    'use strict';

    // Base tracking URLs for each carrier
    const TRACKING_URLS = {
        // UPS: 1Z... (18 characters)
        UPS: 'https://www.ups.com/track?tracknum=',
        // USPS: 20-22 digits, or 13-character alpha-numeric (2 letters + 9 digits + 2 letters)
        USPS: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=',
        // FedEx: 12, 14, 15, or 20 digits, or 22-digit numbers (URL corrected)
        FEDEX: 'https://www.fedex.com/fedextrack/?trknbr=',
    };

    // Universal Regex Patterns (optimized for reliability and avoiding false positives)
    const TRACKING_REGEX = {
        // 1Z followed by 16 alphanumeric characters
        // Example: 1ZV76K060308012470
        UPS: /(\b1Z[0-9A-Z]{16,16}\b)/g,

        // 1. 20-22 digit pure numeric, or
        // 2. 13-character international (CM243306337US)
        // Example: 9405536106194289505408, EQ109535439US
        USPS: /(\b\d{20,22}\b|\b[A-Z]{2}\d{9}[A-Z]{2}\b)/g,

        // 1. 12-digit number (common Express/Ground)
        // 2. 14-digit number
        // 3. 20-digit number
        // Example: 463123445186
        FEDEX: /(\b\d{12,12}\b|\b\d{14,14}\b|\b\d{20,20}\b)/g,
    };

    // Combine all tracking regex patterns into a single array for easier iteration
    const ALL_REGEXES = [
        { type: 'UPS', regex: TRACKING_REGEX.UPS },
        { type: 'USPS', regex: TRACKING_REGEX.USPS },
        { type: 'FEDEX', regex: TRACKING_REGEX.FEDEX },
    ];

    /**
     * Determines the carrier type and tracking URL for a given tracking number.
     * @param {string} trackingNum - The raw tracking number.
     * @returns {object|null} An object containing the URL and carrier type, or null.
     */
    function getCarrierInfo(trackingNum) {
        // Run against the specific regexes again to definitively assign a carrier
        for (const { type, regex } of ALL_REGEXES) {
             // Create a fresh regex instance here for a clean test
            const testRegex = new RegExp(regex.source);
            if (testRegex.test(trackingNum)) {
                return {
                    url: `${TRACKING_URLS[type]}${trackingNum}`,
                    type: type
                };
            }
        }
        return null;
    }

    /**
     * Replaces plain text tracking numbers with clickable links.
     * This function now collects ALL matches from all carriers before performing
     * a single, sorted replacement pass, ensuring all instances are linked.
     * @param {Node} node - The DOM node to scan for text.
     */
    function processNode(node) {
        // Skip elements that are scripts, styles, or already links (<a> tags)
        if (node.nodeName === 'A' || node.nodeName === 'SCRIPT' || node.nodeName === 'STYLE' || node.nodeName === 'NOSCRIPT' || node.nodeName === 'TEXTAREA' || node.nodeName === 'INPUT') {
            return;
        }

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
            let allMatches = [];

            // --- 1. COLLECT ALL MATCHES FROM ALL CARRIERS ---
            for (const { type, regex } of ALL_REGEXES) {
                // Find all matches for this specific carrier
                // Using spread operator on matchAll for iterable results
                const matches = [...originalText.matchAll(regex)];

                matches.forEach(match => {
                    const trackingNum = match[0];
                    const carrierInfo = getCarrierInfo(trackingNum);

                    if (carrierInfo) {
                        allMatches.push({
                            index: match.index,
                            value: trackingNum,
                            url: carrierInfo.url,
                            type: carrierInfo.type,
                            length: trackingNum.length
                        });
                    }
                });
            }

            // --- 2. SORT MATCHES BY INDEX ---
            // Sort by index to process them in the correct order
            allMatches.sort((a, b) => a.index - b.index);

            // --- 3. PERFORM SINGLE REPLACEMENT PASS ---
            if (allMatches.length > 0) {
                const fragment = document.createDocumentFragment();
                let lastIndex = 0;

                allMatches.forEach(match => {
                    // Append the text *before* the match
                    if (match.index > lastIndex) {
                        fragment.appendChild(document.createTextNode(originalText.substring(lastIndex, match.index)));
                    }

                    // Create and append the new <a> link
                    const link = document.createElement('a');
                    link.href = match.url;
                    link.textContent = match.value;
                    link.style.cssText = 'color: #3870e8; text-decoration: underline; font-weight: 600; cursor: pointer; border-bottom: 2px dashed #3870e8;';
                    link.title = `Track via ${match.type}`;
                    link.target = '_blank';
                    fragment.appendChild(link);

                    // Update lastIndex to the end of the current match
                    lastIndex = match.index + match.length;
                });

                // Append the remaining text *after* the last match
                if (lastIndex < originalText.length) {
                    fragment.appendChild(document.createTextNode(originalText.substring(lastIndex)));
                }

                // Replace the original text node with the fragment
                if (parent) {
                    parent.replaceChild(fragment, textNode);
                }
            }
        }
    }

    /**
     * Initializes the script by processing existing content and setting up observers.
     */
    function initialize() {
        // 1. Process the existing content of the body immediately
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