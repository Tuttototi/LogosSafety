<?php
require_once __DIR__ . '/../core/session.php';
require_login();
?>
<h1>Dashboard</h1>
<p>Benvenuto <?= $_SESSION['user']['username'] ?></p>


<?php include __DIR__ . '/../views/App_Segnalazioni.html'; ?>
