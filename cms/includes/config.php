<?php
/**
 * CMS Configuration
 * Central config file for shared constants and settings
 */

// App config
// TODO: update these values for your deployment environment
define('CMS_APP_NAME', '❤️U Festival CMS');
define('CMS_PASSWORD', 'festival2026');

// Paths
define('CMS_ROOT', __DIR__ . '/..');
define('CMS_DATA_DIR', CMS_ROOT . '/src/data');
define('CMS_PUBLIC_DATA_DIR', CMS_ROOT . '/public/data');

// Allowed data files for saving
define('ALLOWED_DATA_TYPES', [
    'news' => 'news.json',
    'info' => 'info.json',
    'schedule' => 'schedule.json',
    'acts' => 'acts.json',
    'map' => 'map.json'
]);

// DB / services (future-proofing)
// define('DB_HOST', 'localhost');
// define('DB_USER', 'root');
// define('DB_PASS', '');
// define('DB_NAME', 'festival');
