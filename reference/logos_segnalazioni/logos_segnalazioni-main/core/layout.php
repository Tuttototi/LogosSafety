<?php
require_once __DIR__ . '/session.php';
require_login();
?>
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>CFL Segnalazioni</title>
  <link href="https://cdn.tailwindcss.com" rel="stylesheet">
</head>
<body class="bg-gray-100">

<header class="bg-red-700 text-white p-4 flex justify-between">
  <div class="font-bold">CFL – Segnalazioni</div>
  <div><?= $_SESSION['user']['username'] ?> (<?= $_SESSION['user']['ruolo'] ?>)</div>
</header>

<div class="flex">
  <?php require __DIR__ . '/sidebar.php'; ?>

  <main class="flex-1 p-6">
    <?php echo $content; ?>
  </main>
</div>

</body>
</html>

