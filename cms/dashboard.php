<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/config.php';
cms_require_auth();
$activePage = 'dashboard';
$basePath = '';
$rootPath = '';
$pagePath = 'pages/';
require_once __DIR__ . '/includes/header.php';
?>
<section class="cms-panel">
  <h1>CMS Dashboard</h1>
  <p>Use the tabs above to manage festival news, info sections, schedule, acts, and map markers.</p>
  <div class="cms-grid">
    <div class="cms-panel">
      <h2>Quick Actions</h2>
      <ul>
        <li><a href="pages/news.php" class="cms-nav-link">Edit News</a></li>
        <li><a href="pages/info.php" class="cms-nav-link">Edit Info Sections</a></li>
        <li><a href="pages/schedule.php" class="cms-nav-link">Edit Schedule</a></li>
        <li><a href="pages/acts.php" class="cms-nav-link">Edit Acts</a></li>
        <li><a href="pages/map.php" class="cms-nav-link">Edit Map Markers</a></li>
      </ul>
    </div>
    <div class="cms-panel">
      <h2>Shared JSON Files</h2>
      <p>The PWA reads from <code>/public/data/*.json</code> at runtime and the CMS writes both <code>/src/data</code> and <code>/public/data</code> so changes appear immediately.</p>
    </div>
  </div>
</section>
<?php require_once __DIR__ . '/includes/footer.php';
