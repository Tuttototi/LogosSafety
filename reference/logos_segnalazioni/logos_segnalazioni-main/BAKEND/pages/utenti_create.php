<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = db();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Metodo non consentito']);
    exit;
}

$input = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($input)) {
    echo json_encode(['ok' => false, 'error' => 'Payload non valido']);
    exit;
}

$nome    = trim((string)($input['nome'] ?? ''));
$email   = trim((string)($input['email'] ?? ''));
$ruolo   = (string)($input['ruolo'] ?? '');
$appalti = $input['appalti'] ?? [];

if ($nome === '' || $email === '' || $ruolo === '') {
    echo json_encode(['ok' => false, 'error' => 'Dati obbligatori mancanti']);
    exit;
}

$ruoliValidi = ['ADMIN', 'RSPP', 'SICUREZZA', 'SEGNALATORE'];
if (!in_array($ruolo, $ruoliValidi, true)) {
    echo json_encode(['ok' => false, 'error' => 'Ruolo non valido']);
    exit;
}

// username = nome normalizzato
$username = strtolower(trim(preg_replace('/\s+/', '.', $nome) ?? ''));
if ($username === '') {
    $username = strtolower((string)strtok($email, '@'));
}
if ($username === '') {
    echo json_encode(['ok' => false, 'error' => 'Username non valido']);
    exit;
}

// password default = 1234
$hash = password_hash('1234', PASSWORD_DEFAULT);

try {
    $pdo->beginTransaction();

    // crea utente
    $stmt = $pdo->prepare("
        INSERT INTO utenti (username, email, password_hash, ruolo, attivo, must_change_password)
        VALUES (:u, :e, :p, :r, 1, 1)
    ");
    $stmt->execute([
        'u' => $username,
        'e' => $email,
        'p' => $hash,
        'r' => $ruolo,
    ]);

    $utenteId = (int)$pdo->lastInsertId();

    // appalti (array di id, string o int)
    if (is_array($appalti) && !empty($appalti)) {
        $stmtApp = $pdo->prepare("
            INSERT INTO utenti_appalti (utente_id, appalto_id)
            VALUES (:uid, :aid)
        ");

        foreach ($appalti as $appaltoId) {
            $aid = (int)$appaltoId;
            if ($aid > 0) {
                $stmtApp->execute([
                    'uid' => $utenteId,
                    'aid' => $aid
                ]);
            }
        }
    }

    $pdo->commit();

    echo json_encode(['ok' => true]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();

    // duplicati (username/email unique)
    if ($e->getCode() === '23000') {
        echo json_encode(['ok' => false, 'error' => 'Username o email già esistenti']);
        exit;
    }

    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Errore server']);
}
