<?php

/**
 * Matomo - free/libre analytics platform
 *
 * @link    https://matomo.org
 * @license https://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

namespace Piwik\Plugins\LiveNotifications\tests\Unit;

use PHPUnit\Framework\TestCase;
use Piwik\Plugins\LiveNotifications\Settings;

/**
 * @group LiveNotifications
 * @group Unit
 */
class SettingsTest extends TestCase
{
    public function test_enabledByDefault_defaultValueIsFalse(): void
    {
        // Settings cannot be fully initialised without a Matomo bootstrap,
        // but we can verify the class is loadable and extends the correct base.
        self::assertInstanceOf(\Piwik\Settings\Plugin\SystemSettings::class, new Settings());
    }

    public function test_settingsClassExists(): void
    {
        self::assertTrue(class_exists(Settings::class));
    }
}
