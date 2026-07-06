<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function require_login(): void {
    if (!isset($_SESSION['user'])) {
        header('Location: /cfl_segnalazioni/pages/login.php');
        exit;
    }
}



