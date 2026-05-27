<?php
require_once __DIR__ . '/../includes/auth.php';
$activePage = 'acts';
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

$acts = loadJsonFile('acts.json');
?>
<section class="cms-panel">
  <h1>Acts</h1>
  <p class="note">Manage festival acts and artist details.</p>
  <form id="acts-form" action="../save.php" method="post">
    <input type="hidden" name="type" value="acts" />
    <input type="hidden" name="data" />
    <div id="acts-list" class="cms-grid">
      <?php foreach ($acts as $actId => $act): ?>
        <fieldset class="item-card" data-key-name="id">
          <legend><?= htmlspecialchars($act['name'] ?? $actId) ?></legend>
          <div class="form-row full">
            <label>Artist ID<input type="text" data-field="id" value="<?= htmlspecialchars($actId) ?>" /></label>
            <label>Name<input type="text" data-field="name" value="<?= htmlspecialchars($act['name'] ?? '') ?>" /></label>
          </div>
          <div class="form-row full">
            <label>Tagline NL<input type="text" data-field="tagline.nl" value="<?= htmlspecialchars($act['tagline']['nl'] ?? '') ?>" /></label>
            <label>Tagline EN<input type="text" data-field="tagline.en" value="<?= htmlspecialchars($act['tagline']['en'] ?? '') ?>" /></label>
          </div>
          <div class="form-row full">
            <label>Description NL<textarea data-field="description.nl"><?= htmlspecialchars($act['description']['nl'] ?? '') ?></textarea></label>
            <label>Description EN<textarea data-field="description.en"><?= htmlspecialchars($act['description']['en'] ?? '') ?></textarea></label>
          </div>
          <div class="form-row full">
            <label>YouTube URL<input type="text" data-field="youtube" value="<?= htmlspecialchars($act['youtube'] ?? '') ?>" /></label>
            <label>Image URL<input type="text" data-field="image" value="<?= htmlspecialchars($act['image'] ?? '') ?>" /></label>
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
      <a href="acts_add.php" class="cms-btn">➕ Add Act</a>
      <button type="submit">Save Acts</button>
    </div>
  </form>
</section>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>