<?php

/**
 * Matomo - free/libre analytics platform
 *
 * @link    https://matomo.org
 * @license https://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

namespace Piwik\Plugins\LiveNotifications;

use Piwik\Piwik;
use Piwik\Settings\FieldConfig;
use Piwik\Settings\Plugin\SystemSetting;

/**
 * Plugin settings. Exposes one system-wide setting that super-users can
 * change under Administration → General Settings → Plugins.
 */
class SystemSettings extends \Piwik\Settings\Plugin\SystemSettings
{
    public SystemSetting $enabledByDefault;
    public SystemSetting $notifyOnlyOnGoal;

    protected function init(): void
    {
        $this->enabledByDefault = $this->makeSetting(
            'enabledByDefault',
            false,
            FieldConfig::TYPE_BOOL,
            function (FieldConfig $field): void {
                $field->title       = Piwik::translate('LiveNotifications_EnabledByDefault');
                $field->description = Piwik::translate('LiveNotifications_EnabledByDefaultDesc');
                $field->uiControl   = FieldConfig::UI_CONTROL_CHECKBOX;
            }
        );

        $this->notifyOnlyOnGoal = $this->makeSetting(
            'notifyOnlyOnGoal',
            false,
            FieldConfig::TYPE_BOOL,
            function (FieldConfig $field): void {
                $field->title       = Piwik::translate('LiveNotifications_NotifyOnlyOnGoal');
                $field->description = Piwik::translate('LiveNotifications_NotifyOnlyOnGoalDesc');
                $field->uiControl   = FieldConfig::UI_CONTROL_CHECKBOX;
            }
        );
    }
}
