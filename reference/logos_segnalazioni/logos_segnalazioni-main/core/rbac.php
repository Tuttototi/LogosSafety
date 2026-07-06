<?php
declare(strict_types=1);
require_once __DIR__ . '/session.php';

function require_role(array $allowed): void {
    require_login();
    if (!in_array($_SESSION['user']['ruolo'], $allowed, true)) {
        header('Location: /cfl_segnalazioni/pages/forbidden.php');
        exit;
    }
}
