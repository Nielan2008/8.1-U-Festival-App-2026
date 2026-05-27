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
  <h1>Add Act</h1>
  <p class="note">Create a new act entry.</p>
  <form id="acts-add-form" action="../save.php" method="post">
    <input type="hidden" name="type" value="acts" />
    <input type="hidden" name="data" />
    <div class="form-row full">
      <label>Name<input type="text" id="name" required /></label>
      <label>Tagline NL<input type="text" id="tagline-nl" /></label>
    </div>
    <div class="form-row full">
      <label>Tagline EN<input type="text" id="tagline-en" /></label>
      <label>YouTube URL<input type="text" id="youtube" /></label>
    </div>
    <div class="form-row full">
      <label>Image URL<input type="text" id="image" /></label>
    </div>
    <div class="form-row full">
      <label>Description NL<textarea id="desc-nl"></textarea></label>
      <label>Description EN<textarea id="desc-en"></textarea></label>
    </div>
    <div class="item-actions">
      <button type="submit" class="btn-primary">💾 Save</button>
      <a href="acts.php" class="cms-btn">← Back</a>
    </div>
  </form>
</section>

<script>
  const existing = <?php echo json_encode($acts, JSON_UNESCAPED_UNICODE); ?> || {};
  function slugify(text){
    return text.toString().toLowerCase().trim()
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/(^-|-$)+/g,'');
  }

  document.getElementById('acts-add-form').addEventListener('submit', function(e){
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    if (!name) { alert('Name is required'); return; }
    const idBase = slugify(name) || 'act-' + Date.now();
    let id = idBase;
    let counter = 1;
    while (existing[id]) { id = idBase + '-' + counter; counter++; }

    const obj = {
      name: name,
      tagline: { nl: document.getElementById('tagline-nl').value, en: document.getElementById('tagline-en').value },
      description: { nl: document.getElementById('desc-nl').value, en: document.getElementById('desc-en').value },
      youtube: document.getElementById('youtube').value,
      image: document.getElementById('image').value
    };
    const payload = Object.assign({}, existing);
    payload[id] = obj;
    this.querySelector('[name="data"]').value = JSON.stringify(payload, null, 2);
    const form = this;
    fetch(form.action, { method: 'POST', body: new FormData(form) })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          alert('Saved successfully');
          window.location.href = 'acts.php';
        } else {
          alert('Save failed: ' + (result.error || 'unknown'));
        }
      }).catch(err => {
        alert('Save failed: ' + err.message);
      });
  });
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
