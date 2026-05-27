<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/config.php';

cms_require_auth();

header('Content-Type: application/json');

$type = $_POST['type'] ?? '';
if (!isset(ALLOWED_DATA_TYPES[$type])) {
    echo json_encode(['success' => false, 'error' => 'Invalid save type.']);
    exit;
}

$data = $_POST['data'] ?? null;
if (!$data) {
    echo json_encode(['success' => false, 'error' => 'Missing data payload.']);
    exit;
}

$decoded = json_decode($data, true);
if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(['success' => false, 'error' => 'Invalid JSON payload: ' . json_last_error_msg()]);
    exit;
}

$filename = ALLOWED_DATA_TYPES[$type];
$sourcePath = realpath(__DIR__ . '/../src/data');
$publicPath = realpath(__DIR__ . '/../public/data');
if ($sourcePath === false || $publicPath === false) {
    echo json_encode(['success' => false, 'error' => 'Storage paths are not available.']);
    exit;
}

$targetSource = $sourcePath . DIRECTORY_SEPARATOR . $filename;
$targetPublic = $publicPath . DIRECTORY_SEPARATOR . $filename;

if (basename($targetSource) !== $filename || basename($targetPublic) !== $filename) {
    echo json_encode(['success' => false, 'error' => 'Invalid file location.']);
    exit;
}

$encoded = json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
if ($encoded === false) {
    echo json_encode(['success' => false, 'error' => 'Unable to encode JSON response.']);
    exit;
}

$sourceSaved = file_put_contents($targetSource, $encoded);
$publicSaved = file_put_contents($targetPublic, $encoded);
if ($sourceSaved === false || $publicSaved === false) {
    echo json_encode(['success' => false, 'error' => 'Unable to write JSON files.']);
    exit;
}

echo json_encode(['success' => true]);
