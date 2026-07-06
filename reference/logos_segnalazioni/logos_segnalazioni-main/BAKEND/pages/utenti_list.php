<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = db();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Metodo non consentito']);
    exit;
}

try {
    $sql = "
        SELECT
            u.id,
            u.username,
            u.email,
            u.ruolo,
            u.attivo,
            GROUP_CONCAT(a.nome ORDER BY a.nome SEPARATOR '||') AS appalti
        FROM utenti u
        LEFT JOIN utenti_appalti ua ON ua.utente_id = u.id
        LEFT JOIN appalti a ON a.id = ua.appalto_id
        GROUP BY u.id
        ORDER BY u.username
    ";

    $stmt = $pdo->query($sql);

    $utenti = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $appalti = [];
        if (!empty($row['appalti'])) {
            $appalti = explode('||', $row['appalti']);
        }

        $utenti[] = [
            'id'      => (int)$row['id'],
            'nome'    => (string)$row['username'],
            'email'   => (string)$row['email'],
            'ruolo'   => (string)$row['ruolo'],
            'stato'   => ((int)$row['attivo'] === 1) ? 'ATTIVO' : 'DISATTIVO',
            'appalti' => $appalti
        ];
    }

    echo json_encode([
        'ok' => true,
        'utenti' => $utenti
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Errore caricamento utenti']);
}





