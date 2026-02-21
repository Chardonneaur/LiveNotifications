/*!
 * Matomo - free/libre analytics platform
 *
 * LiveNotifications plugin — sound alerts for the "Visitors in real time" widget.
 *
 * Sound is synthesised entirely with the Web Audio API; no external audio files
 * are required or loaded.  The two-tone chime (A5 → C#6) is generated from
 * pure sine oscillators and therefore carries no separate licence burden.
 *
 * @link    https://matomo.org
 * @license https://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */
(function ($) {
    'use strict';

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    var STORAGE_KEY  = 'matomo_live_notifications_muted'; // localStorage key
    var VISITS_LIST_ID = 'visitsLive';                     // Live widget UL id
    var BTN_CLASS    = 'liveNotificationsMuteBtn';

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    var isMuted      = true;   // resolved in initMuteState()
    var audioCtx     = null;   // Web Audio context, created lazily
    var visitObserver = null;  // MutationObserver for #visitsLive children
    var domObserver   = null;  // MutationObserver watching document.body for SPA navigation

    // -------------------------------------------------------------------------
    // Config helper
    // -------------------------------------------------------------------------

    /** Read a value from the PHP-injected piwik.LiveNotifications object. */
    function cfg(key) {
        var c = window.piwik && window.piwik.LiveNotifications;
        return c ? c[key] : undefined;
    }

    // -------------------------------------------------------------------------
    // Goal-conversion detection
    // -------------------------------------------------------------------------

    /**
     * Return true if the visitor row contains at least one goal or ecommerce
     * conversion.
     *
     * The Live plugin renders a <span class="visitorType"> inside the visitor
     * row only when goalConversions > 0 OR visitHasEcommerceActivity is true.
     * Checking for that element is therefore a reliable, markup-stable signal.
     */
    function visitHasConversion(visitNode) {
        return !!visitNode.querySelector('.visitorType');
    }

    // -------------------------------------------------------------------------
    // Mute state helpers
    // -------------------------------------------------------------------------

    /**
     * Resolve initial mute state.
     *
     * Priority (highest wins):
     *   1. User's explicit localStorage preference
     *   2. Admin-configured default (piwik.LiveNotifications.enabledByDefault)
     *   3. Hard default: muted (sounds off)
     */
    function initMuteState() {
        var stored = null;
        try {
            stored = localStorage.getItem(STORAGE_KEY);
        } catch (e) { /* privacy mode / quota */ }

        if (stored !== null) {
            isMuted = (stored === '1');
        } else {
            isMuted = !cfg('enabledByDefault');
        }
    }

    function saveMuteState() {
        try {
            localStorage.setItem(STORAGE_KEY, isMuted ? '1' : '0');
        } catch (e) { /* storage not available */ }
    }

    // -------------------------------------------------------------------------
    // Translation helper
    // -------------------------------------------------------------------------

    /**
     * Retrieve a client-side translation key registered via
     * getClientSideTranslationKeys().  Falls back gracefully on older Matomo or
     * if the key is missing.
     */
    function translate(key, fallback) {
        var t = window.piwik && window.piwik.translations;
        if (t && t[key]) {
            return t[key];
        }
        return fallback || key;
    }

    // -------------------------------------------------------------------------
    // Audio synthesis
    // -------------------------------------------------------------------------

    function getAudioContext() {
        if (!audioCtx) {
            var Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) {
                return null;
            }
            audioCtx = new Ctx();
        }
        return audioCtx;
    }

    /**
     * Play a short two-tone chime: A5 (880 Hz) → C#6 (1108.73 Hz).
     * Uses sine oscillators with a quick attack and exponential decay.
     * The AudioContext is created lazily on first call.
     *
     * Modern browsers block AudioContext playback until a user gesture has
     * occurred.  We call resume() to handle the case where the context was
     * created before any interaction, and catch/ignore any resulting errors
     * so that silence is the graceful fallback.
     */
    function playNotificationSound() {
        var ctx = getAudioContext();
        if (!ctx) {
            return;
        }

        function doPlay() {
            var now = ctx.currentTime;

            function tone(freq, startOffset, duration) {
                var osc  = ctx.createOscillator();
                var gain = ctx.createGain();

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + startOffset);

                // Soft attack then exponential decay
                gain.gain.setValueAtTime(0, now + startOffset);
                gain.gain.linearRampToValueAtTime(0.25, now + startOffset + 0.025);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);

                osc.start(now + startOffset);
                osc.stop(now + startOffset + duration + 0.01);
            }

            tone(880.00,    0,    0.35);   // A5  — first note
            tone(1108.73,  0.18,  0.45);   // C#6 — second note (pleasant rising interval)
        }

        try {
            if (ctx.state === 'suspended') {
                ctx.resume().then(doPlay).catch(function () { /* blocked by policy */ });
            } else {
                doPlay();
            }
        } catch (e) {
            /* AudioContext not functional in this environment */
        }
    }

    // -------------------------------------------------------------------------
    // Mute button
    // -------------------------------------------------------------------------

    function updateButtonUI($btn) {
        if (isMuted) {
            $btn
                .text('\uD83D\uDD07') // 🔇 — .text() never interprets HTML, safe by design
                .attr('title', translate('LiveNotifications_UnmuteNotifications', 'Unmute visitor sound notifications'))
                .removeClass('liveNotificationsMuteBtn--active')
                .addClass('liveNotificationsMuteBtn--muted');
        } else {
            $btn
                .text('\uD83D\uDD0A') // 🔊 — .text() never interprets HTML, safe by design
                .attr('title', translate('LiveNotifications_MuteNotifications', 'Mute visitor sound notifications'))
                .removeClass('liveNotificationsMuteBtn--muted')
                .addClass('liveNotificationsMuteBtn--active');
        }
    }

    /**
     * Inject the mute/unmute toggle button into the Live widget header.
     *
     * Matomo widgets use the class hierarchy:
     *   .widget > .widgetTop > .widgetName   (dashboard widgets)
     *   .card   > .card-header               (some admin pages)
     *
     * We try each in order and fall back to inserting before the list element.
     */
    function injectMuteButton(liveEl) {
        var $widget = $(liveEl).closest('.widget, .card');

        // Avoid double-injection if the widget was re-used
        if ($widget.find('.' + BTN_CLASS).length) {
            // Button already present — update its visual state in case mute changed
            updateButtonUI($widget.find('.' + BTN_CLASS));
            return;
        }

        var $btn = $('<button type="button"></button>').addClass(BTN_CLASS);
        updateButtonUI($btn);

        // Resume/create AudioContext on first user interaction with the button
        // to satisfy browser autoplay policies for subsequent automatic plays.
        $btn.on('click', function () {
            // Ensure AudioContext exists and is running before toggling
            var ctx = getAudioContext();
            if (ctx && ctx.state === 'suspended') {
                ctx.resume();
            }

            isMuted = !isMuted;
            saveMuteState();
            updateButtonUI($btn);

            // Play a preview chime when unmuting so the user confirms audio works
            if (!isMuted) {
                playNotificationSound();
            }
        });

        // Try known Matomo widget header selectors in priority order
        var $header = $widget.find('.widgetTop').first();
        if (!$header.length) {
            $header = $widget.find('.card-header').first();
        }

        if ($header.length) {
            $header.append($btn);
        } else {
            // Fallback: insert the button directly above the visitor list
            $(liveEl).before($btn);
        }
    }

    // -------------------------------------------------------------------------
    // MutationObserver — watch #visitsLive for new visitor rows
    // -------------------------------------------------------------------------

    function attachVisitObserver(liveEl) {
        if (visitObserver) {
            visitObserver.disconnect();
        }

        visitObserver = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var added = mutations[i].addedNodes;
                for (var j = 0; j < added.length; j++) {
                    var node = added[j];
                    if (
                        node.nodeType === 1 &&
                        node.classList &&
                        node.classList.contains('visit')
                    ) {
                        // If the admin enabled "goal-only" mode, skip visits
                        // that have no goal or ecommerce conversion.
                        if (cfg('notifyOnlyOnGoal') && !visitHasConversion(node)) {
                            return;
                        }

                        if (!isMuted) {
                            playNotificationSound();
                        }
                        // Only one sound per mutation batch
                        return;
                    }
                }
            }
        });

        visitObserver.observe(liveEl, { childList: true });
        injectMuteButton(liveEl);
    }

    // -------------------------------------------------------------------------
    // DOM watcher — wait for #visitsLive (handles SPA navigation)
    // -------------------------------------------------------------------------

    /**
     * Start observing document.body for #visitsLive being added or removed.
     *
     * In Matomo 5's SPA the Live widget is mounted and unmounted dynamically.
     * We keep a persistent body-level observer so sounds resume automatically
     * whenever the user navigates back to the Live page.
     */
    function startDomObserver() {
        if (domObserver) {
            return; // already running
        }

        domObserver = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var mutation = mutations[i];

                // Check added nodes for #visitsLive
                for (var j = 0; j < mutation.addedNodes.length; j++) {
                    var node = mutation.addedNodes[j];
                    if (node.nodeType !== 1) {
                        continue;
                    }
                    var target = (node.id === VISITS_LIST_ID)
                        ? node
                        : (node.querySelector ? node.querySelector('#' + VISITS_LIST_ID) : null);

                    if (target) {
                        attachVisitObserver(target);
                    }
                }

                // Check removed nodes — tear down visit observer when widget leaves DOM
                for (var k = 0; k < mutation.removedNodes.length; k++) {
                    var removed = mutation.removedNodes[k];
                    if (removed.nodeType !== 1) {
                        continue;
                    }
                    var gone = (removed.id === VISITS_LIST_ID)
                        ? removed
                        : (removed.querySelector ? removed.querySelector('#' + VISITS_LIST_ID) : null);

                    if (gone && visitObserver) {
                        visitObserver.disconnect();
                        visitObserver = null;
                    }
                }
            }
        });

        domObserver.observe(document.body, { childList: true, subtree: true });
    }

    // -------------------------------------------------------------------------
    // Initialisation
    // -------------------------------------------------------------------------

    $(function () {
        initMuteState();

        // Attach immediately if the Live widget is already in the DOM
        // (e.g. when the page loads directly on the Live report).
        var existing = document.getElementById(VISITS_LIST_ID);
        if (existing) {
            attachVisitObserver(existing);
        }

        // Keep watching for SPA navigation to/from the Live page.
        startDomObserver();
    });

}(jQuery));
