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
$days = ['sat' => 'Saturday', 'sun' => 'Sunday'];
$stages = [];
foreach ($schedule as $day => $stageList) {
    foreach ($stageList as $stage) {
        if (!in_array($stage['stage'], $stages, true)) {
            $stages[] = $stage['stage'];
        }
    }
}
?>
<section class="cms-panel">
  <h1>Schedule</h1>
  <p class="note">Edit schedule acts by day, stage, time, and linked act ID.</p>
  <form id="schedule-form" action="../save.php" method="post">
    <input type="hidden" name="type" value="schedule" />
    <input type="hidden" name="data" />
    <div id="schedule-list" class="cms-grid">
      <?php foreach ($schedule as $day => $stageList): ?>
        <?php foreach ($stageList as $stage): ?>
          <?php foreach ($stage['acts'] as $actIndex => $act): ?>
            <fieldset class="item-card">
              <legend><?= htmlspecialchars($days[$day] ?? $day) ?> · <?= htmlspecialchars($stage['stage']) ?></legend>
              <div class="form-row">
                <label>Day<select data-field="day"><option value="sat"<?= $day === 'sat' ? ' selected' : '' ?>>Saturday</option><option value="sun"<?= $day === 'sun' ? ' selected' : '' ?>>Sunday</option></select></label>
                <label>Stage<select data-field="stage">
                  <?php $currentStage = htmlspecialchars($stage['stage']); ?>
                  <?php if ($currentStage && !in_array($currentStage, ['Ponton', 'The Lake', 'The Club', 'Hangar'], true)): ?>
                    <option value="<?= $currentStage ?>" selected><?= $currentStage ?></option>
                  <?php endif; ?>
                  <option value="Ponton"<?= $currentStage === 'Ponton' ? ' selected' : '' ?>>Ponton</option>
                  <option value="The Lake"<?= $currentStage === 'The Lake' ? ' selected' : '' ?>>The Lake</option>
                  <option value="The Club"<?= $currentStage === 'The Club' ? ' selected' : '' ?>>The Club</option>
                  <option value="Hangar"<?= $currentStage === 'Hangar' ? ' selected' : '' ?>>Hangar</option>
                </select></label>
              </div>
              <div class="form-row">
                <label>Act title<input type="text" data-field="title" value="<?= htmlspecialchars($act['title'] ?? '') ?>" /></label>
                <label>Linked act ID<input type="text" data-field="id" value="<?= htmlspecialchars($act['id'] ?? '') ?>" /></label>
              </div>
              <div class="form-row">
                <label>Start<input type="text" data-field="start" value="<?= htmlspecialchars($act['start'] ?? '') ?>" placeholder="HH:MM" /></label>
                <label>End<input type="text" data-field="end" value="<?= htmlspecialchars($act['end'] ?? '') ?>" placeholder="HH:MM" /></label>
              </div>
              <div class="item-actions">
                <button type="button" class="btn-danger remove-item">Delete</button>
              </div>
            </fieldset>
          <?php endforeach; ?>
        <?php endforeach; ?>
      <?php endforeach; ?>
    </div>
    <div class="item-actions">
      <a href="schedule_add.php" class="cms-btn">➕ Add Schedule Act</a>
      <button type="submit">Save Schedule</button>
    </div>
  </form>
</section>
    <script>
      document.addEventListener('DOMContentLoaded', () => {
        const form = document.querySelector('#schedule-form');

        document.addEventListener('click', (event) => {
          if (event.target.matches('.remove-item')) {
            event.preventDefault();
            const card = event.target.closest('.item-card');
            if (card) card.remove();
          }
        });

        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const output = { sat: [], sun: [] };
          document.querySelectorAll('#schedule-list .item-card').forEach((card) => {
            const day = card.querySelector('[data-field="day"]').value;
            const stage = card.querySelector('[data-field="stage"]').value;
            const title = card.querySelector('[data-field="title"]').value;
            const id = card.querySelector('[data-field="id"]').value;
            const start = card.querySelector('[data-field="start"]').value;
            const end = card.querySelector('[data-field="end"]').value;
            if (!day || !stage || !title) return;

            let stageGroup = output[day].find((item) => item.stage === stage);
            if (!stageGroup) {
              stageGroup = { stage, acts: [] };
              output[day].push(stageGroup);
            }
            stageGroup.acts.push({ id, title, start, end });
          });

          form.querySelector('[name="data"]').value = JSON.stringify(output, null, 2);
          form.querySelector('button[type="submit"]').disabled = true;
          fetch(form.action, { method: 'POST', body: new FormData(form) })
            .then((res) => res.json())
            .then((result) => {
              const message = form.querySelector('.cms-message') || document.createElement('div');
              message.className = 'cms-message ' + (result.success ? 'success-message' : 'error-message');
              message.textContent = result.success ? 'Saved successfully.' : result.error || 'Unable to save.';
              form.insertBefore(message, form.firstChild);
            })
            .catch((err) => {
              const message = form.querySelector('.cms-message') || document.createElement('div');
              message.className = 'cms-message error-message';
              message.textContent = err.message || 'Unable to save.';
              form.insertBefore(message, form.firstChild);
            })
            .finally(() => {
              form.querySelector('button[type="submit"]').disabled = false;
            });
        });
      });
    </script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>