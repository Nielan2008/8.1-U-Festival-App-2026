<?php
require_once __DIR__ . '/../includes/auth.php';
$activePage = 'info';
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

$sections = loadJsonFile('info.json');
?>
<section class="cms-panel">
  <h1>Info Sections</h1>
  <p class="note">Edit accordion sections in the app info page.</p>
  <form id="info-form" action="../save.php" method="post">
    <input type="hidden" name="type" value="info" />
    <input type="hidden" name="data" />
    <div id="info-list" class="cms-grid">
      <?php $num = 0; foreach ($sections as $section): $num++; ?>
        <fieldset class="item-card">
          <legend>Section <?= $num ?></legend>
          <div class="form-row full">
            <label>Title NL<input type="text" data-field="title.nl" value="<?= htmlspecialchars($section['title']['nl'] ?? '') ?>" /></label>
            <label>Title EN<input type="text" data-field="title.en" value="<?= htmlspecialchars($section['title']['en'] ?? '') ?>" /></label>
          </div>
          <div class="form-row full">
            <label>Body NL<textarea data-field="body.nl"><?= htmlspecialchars($section['body']['nl'] ?? '') ?></textarea></label>
            <label>Body EN<textarea data-field="body.en"><?= htmlspecialchars($section['body']['en'] ?? '') ?></textarea></label>
          </div>
          <div class="item-actions">
            <button type="button" class="btn-danger remove-item">Delete</button>
          </div>
        </fieldset>
      <?php endforeach; ?>
    </div>
  </form>
</section>
    <div class="item-actions">
      <a href="info_add.php" class="cms-btn">➕ Add Section</a>
      <button type="submit">Save Info</button>
    </div>
  </form>
</section>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>