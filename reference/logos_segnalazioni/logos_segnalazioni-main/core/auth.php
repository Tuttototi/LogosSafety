<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/session.php';

function login(string $username, string $password): bool {
    $pdo = db();

    $stmt = $pdo->prepare("
        SELECT id, username, password_hash, ruolo, attivo
        FROM utenti
        WHERE username = :u
        LIMIT 1
    ");
    $stmt->execute(['u' => $username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        return false;
    }

    if ((int)$user['attivo'] !== 1) {
        return false;
    }

    if (!password_verify($password, $user['password_hash'])) {
        return false;
    }

    $_SESSION['user'] = [
        'id'       => $user['id'],
        'username' => $user['username'],
        'ruolo'    => $user['ruolo'],
        'must_change_password' => (int)$user['must_change_password'],
    ];

    return true;
    
}

  


