<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/config.php';

if (cms_is_authenticated()) {
    header('Location: dashboard.php');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $password = $_POST['password'] ?? '';
    if ($password === CMS_PASSWORD) {
        $_SESSION['cms_auth'] = true;
        header('Location: dashboard.php');
        exit;
    }
    $error = 'Incorrect password. Please try again.';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><?= CMS_APP_NAME ?> Login</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sansation:wght@300;400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="cms-shell">
    <header class="cms-header">
      <div>
        <div class="cms-logo"><?= CMS_APP_NAME ?></div>
        <p class="cms-tagline">Secure login to edit festival content.</p>
      </div>
    </header>
    <main class="cms-content">
      <section class="cms-panel">
        <h1>Sign in</h1>
        <?php if ($error): ?>
          <div class="error-message"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>
        <form method="post">
          <label>
            Password
            <input type="password" name="password" autocomplete="current-password" required />
          </label>
          <button type="submit">Login</button>
        </form>
      </section>
    </main>
  </div>
</body>
</html>
