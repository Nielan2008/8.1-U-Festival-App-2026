<?php
require_once __DIR__ . '/../includes/auth.php';
$activePage = 'news';
$basePath = '../';
$rootPath = '../';
$pagePath = '';
require_once __DIR__ . '/../includes/header.php';

function loadJsonFile($filename) {
    $path = realpath(__DIR__ . '/../../src/data/' . $filename);
    if (!$path || !is_file($path)) {
        return [];
    }
    $content = file_get_contents($path);
    return json_decode($content, true) ?? [];
}

$newsItems = loadJsonFile('news.json');
?>
<section class="cms-panel">
  <h1>News</h1>
  <p class="note">Edit the festival news cards shown in the app.</p>
  <form id="news-form" action="../save.php" method="post">
    <input type="hidden" name="type" value="news" />
    <input type="hidden" name="data" />
    <div id="news-list" class="cms-grid">
      <?php $num = 0; foreach ($newsItems as $item): $num++; ?>
        <fieldset class="item-card">
          <legend>News item <?= $num ?></legend>
          <div class="form-row full">
            <label>Title NL<input type="text" data-field="title.nl" value="<?= htmlspecialchars($item['title']['nl'] ?? '') ?>" /></label>
            <label>Title EN<input type="text" data-field="title.en" value="<?= htmlspecialchars($item['title']['en'] ?? '') ?>" /></label>
          </div>
          <div class="form-row full">
            <label>Body NL<textarea data-field="body.nl"><?= htmlspecialchars($item['body']['nl'] ?? '') ?></textarea></label>
            <label>Body EN<textarea data-field="body.en"><?= htmlspecialchars($item['body']['en'] ?? '') ?></textarea></label>
          </div>
          <div class="form-row full">
            <label>Timestamp<input type="text" data-field="timestamp" value="<?= htmlspecialchars($item['timestamp'] ?? '') ?>" /></label>
          </div>
          <div class="item-actions">
            <button type="button" class="btn-danger remove-item">Delete</button>
          </div>
        </fieldset>
      <?php endforeach; ?>
    </div>
    <div class="item-actions">
      <a href="news_add.php" class="cms-btn">➕ Add News Item</a>
      <button type="submit">Save News</button>
    </div>
  </form>
</section>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>