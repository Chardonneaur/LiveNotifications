<?php

/**
 * Matomo - free/libre analytics platform
 *
 * @link    https://matomo.org
 * @license https://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

namespace Piwik\Plugins\LiveNotifications;

use Piwik\Plugin;

/**
 * Sound notifications for the "Visitors in real time" Live widget.
 *
 * Hooks into Matomo's asset pipeline to inject a JavaScript module that:
 *   - Watches the #visitsLive UL for new <li class="visit"> entries via MutationObserver
 *   - Synthesises a short notification chime using the Web Audio API (no external files)
 *   - Injects a mute/unmute toggle button into the widget header
 *   - Persists the mute preference in localStorage
 *
 * Admins can enable sound by default via Administration → General Settings → Plugins.
 */
class LiveNotifications extends Plugin
{
    public function registerEvents(): array
    {
        return [
            'AssetManager.getJavaScriptFiles'       => 'getJsFiles',
            'AssetManager.getStylesheetFiles'        => 'getCssFiles',
            'Translate.getClientSideTranslationKeys' => 'getClientSideTranslationKeys',
            'Template.jsGlobalVariables'             => 'addJsGlobalVariables',
        ];
    }

    public function getJsFiles(array &$jsFiles): void
    {
        $jsFiles[] = 'plugins/LiveNotifications/javascripts/LiveNotifications.js';
    }

    public function getCssFiles(array &$cssFiles): void
    {
        $cssFiles[] = 'plugins/LiveNotifications/stylesheets/LiveNotifications.less';
    }

    public function getClientSideTranslationKeys(array &$translationKeys): void
    {
        $translationKeys[] = 'LiveNotifications_MuteNotifications';
        $translationKeys[] = 'LiveNotifications_UnmuteNotifications';
    }

    /**
     * Injects the admin-configured default into the global JS namespace so
     * LiveNotifications.js can read it without an extra AJAX call.
     */
    public function addJsGlobalVariables(string &$out): void
    {
        $settings = new SystemSettings();

        $out .= 'piwik.LiveNotifications = ' . json_encode([
            'enabledByDefault' => (bool) $settings->enabledByDefault->getValue(),
            'notifyOnlyOnGoal' => (bool) $settings->notifyOnlyOnGoal->getValue(),
        ], JSON_THROW_ON_ERROR) . ";\n";
    }
}
