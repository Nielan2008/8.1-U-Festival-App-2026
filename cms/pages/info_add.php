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

$items = loadJsonFile('info.json');

?>
<section class="cms-panel">
  <h1>Add Info Section</h1>
  <p class="note">Create a new info accordion section.</p>
  <form id="info-add-form" action="../save.php" method="post">
    <input type="hidden" name="type" value="info" />
    <input type="hidden" name="data" />
    <div class="form-row full">
      <label>Title NL<input type="text" id="title-nl" /></label>
      <label>Title EN<input type="text" id="title-en" /></label>
    </div>
    <div class="form-row full">
      <label>Body NL<textarea id="body-nl"></textarea></label>
      <label>Body EN<textarea id="body-en"></textarea></label>
    </div>
    <div class="item-actions">
      <button type="submit" class="btn-primary">💾 Save</button>
      <a href="info.php" class="cms-btn">← Back</a>
    </div>
  </form>
</section>

<script>
  const existing = <?php echo json_encode($items, JSON_UNESCAPED_UNICODE); ?>;
  document.getElementById('info-add-form').addEventListener('submit', function(e){
    e.preventDefault();
    const titleNl = document.getElementById('title-nl').value;
    const titleEn = document.getElementById('title-en').value;
    const bodyNl = document.getElementById('body-nl').value;
    const bodyEn = document.getElementById('body-en').value;
    const item = { title: { nl: titleNl, en: titleEn }, body: { nl: bodyNl, en: bodyEn } };
    const payload = Array.isArray(existing) ? existing.slice() : [];
    payload.push(item);
    this.querySelector('[name="data"]').value = JSON.stringify(payload, null, 2);
    const form = this;
    fetch(form.action, { method: 'POST', body: new FormData(form) })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          alert('Saved successfully');
          window.location.href = 'info.php';
        } else {
          alert('Save failed: ' + (result.error || 'unknown'));
        }
      }).catch(err => {
        alert('Save failed: ' + err.message);
      });
  });
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
