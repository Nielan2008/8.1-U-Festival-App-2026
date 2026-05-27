<?php
$basePath = $basePath ?? '';
$rootPath = $rootPath ?? '';
$pagePath = $pagePath ?? 'pages/';
$activePage = $activePage ?? '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>❤️U Festival CMS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sansation:wght@300;400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <link rel="stylesheet" href="<?= $basePath ?>style.css" />
</head>
<body>
  <div class="cms-shell">
    <header class="cms-header">
      <div>
        <div class="cms-logo">❤️U CMS</div>
        <p class="cms-tagline">Edit the festival content shared with the PWA.</p>
      </div>
      <nav class="cms-nav">
        <a href="<?= $rootPath ?>dashboard.php" class="cms-nav-link<?= $activePage === 'dashboard' ? ' active' : '' ?>">Dashboard</a>
        <a href="<?= $pagePath ?>news.php" class="cms-nav-link<?= $activePage === 'news' ? ' active' : '' ?>">News</a>
        <a href="<?= $pagePath ?>info.php" class="cms-nav-link<?= $activePage === 'info' ? ' active' : '' ?>">Info</a>
        <a href="<?= $pagePath ?>schedule.php" class="cms-nav-link<?= $activePage === 'schedule' ? ' active' : '' ?>">Schedule</a>
        <a href="<?= $pagePath ?>acts.php" class="cms-nav-link<?= $activePage === 'acts' ? ' active' : '' ?>">Acts</a>
        <a href="<?= $pagePath ?>map.php" class="cms-nav-link<?= $activePage === 'map' ? ' active' : '' ?>">Map</a>
      </nav>
      <a class="logout-button" href="<?= $rootPath ?>logout.php">Logout</a>
    </header>
    <main class="cms-content">
