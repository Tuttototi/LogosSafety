<?php
require_once __DIR__ . '/../core/session.php';


// se non loggato → login
if (!isset($_SESSION['user'])) {
    header('Location: login.php');
    exit;
}

// se non ADMIN → forbidden
if ($_SESSION['user']['ruolo'] !== 'ADMIN') {
    header('Location: forbidden.php');
    exit;
}

// carica HTML
require __DIR__ . '/../views/dashboard_admin.html';

<?php require __DIR__ . '/../components/segnalazione_form.php'; ?>


