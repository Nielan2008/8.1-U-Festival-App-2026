<?php
require_once __DIR__ . '/../includes/auth.php';
$activePage = 'schedule';
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

$schedule = loadJsonFile('schedule.json');

?>
<section class="cms-panel">
  <h1>Add Schedule Act</h1>
  <p class="note">Add an act to the schedule.</p>
  <form id="schedule-add-form" action="../save.php" method="post">
    <input type="hidden" name="type" value="schedule" />
    <input type="hidden" name="data" />
    <div class="form-row">
      <label>Day<select id="day"><option value="sat">Saturday</option><option value="sun">Sunday</option></select></label>
      <label>Stage<select id="stage"><option value="Ponton">Ponton</option><option value="The Lake">The Lake</option><option value="The Club">The Club</option><option value="Hangar">Hangar</option></select></label>
    </div>
    <div class="form-row">
      <label>Act title<input type="text" id="title" required /></label>
      <label>Linked act ID<input type="text" id="act-id" /></label>
    </div>
    <div class="form-row">
      <label>Start<input type="time" id="start" /></label>
      <label>End<input type="time" id="end" /></label>
    </div>
    <div class="item-actions">
      <button type="submit" class="btn-primary">💾 Save</button>
      <a href="schedule.php" class="cms-btn">← Back</a>
    </div>
  </form>
</section>

<script>
  const existingSchedule = <?php echo json_encode($schedule, JSON_UNESCAPED_UNICODE); ?> || {};
  document.getElementById('schedule-add-form').addEventListener('submit', function(e){
    e.preventDefault();
    const day = document.getElementById('day').value;
    const stage = document.getElementById('stage').value;
    const title = document.getElementById('title').value;
    const id = document.getElementById('act-id').value;
    const start = document.getElementById('start').value;
    const end = document.getElementById('end').value;
    if (!day || !stage || !title) { alert('Missing required fields'); return; }
    const out = { sat: [], sun: [] };
    // copy existing structure
    if (existingSchedule && typeof existingSchedule === 'object') {
      if (existingSchedule.sat) out.sat = JSON.parse(JSON.stringify(existingSchedule.sat));
      if (existingSchedule.sun) out.sun = JSON.parse(JSON.stringify(existingSchedule.sun));
    }
    // find or create stage group
    let dayArr = out[day];
    let group = dayArr.find(g => g.stage === stage);
    if (!group) { group = { stage: stage, acts: [] }; dayArr.push(group); }
    group.acts.push({ id: id, title: title, start: start, end: end });
    this.querySelector('[name="data"]').value = JSON.stringify(out, null, 2);
    const form = this;
    fetch(form.action, { method: 'POST', body: new FormData(form) })
      .then(res => res.json())
      .then(result => {
        if (result.success) { alert('Saved successfully'); window.location.href = 'schedule.php'; }
        else { alert('Save failed: ' + (result.error || 'unknown')); }
      }).catch(err => { alert('Save failed: ' + err.message); });
  });
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
