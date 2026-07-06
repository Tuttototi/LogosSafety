<?php
require_once __DIR__ . '/../core/auth.php';

$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $u = $_POST['username'] ?? '';
    $p = $_POST['password'] ?? '';

    if (login($u, $p)) {

        $ruolo = $_SESSION['user']['ruolo'];

        switch ($ruolo) {
            case 'ADMIN':
                header('Location: dashboard_admin.php');
                break;

            case 'RSPP':
                header('Location: dashboard_rspp.php');
                break;

            case 'SICUREZZA':
                header('Location: dashboard_sicurezza.php');
                break;

            case 'SEGNALATORE':
                header('Location: dashboard_segnalatore.php');
                break;

            default:
                header('Location: forbidden.php');
        }
        exit;

    } else {
        $error = 'Credenziali non valide';
    }
}
?>


