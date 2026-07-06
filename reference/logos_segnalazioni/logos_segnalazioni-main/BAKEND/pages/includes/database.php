<?php
declare(strict_types=1);

function db(): PDO {
    static $pdo;
    if ($pdo) return $pdo;

    $pdo = new PDO(
        'mysql:host=127.0.0.1;dbname=cfl_segnalazioni;charset=utf8mb4',
        'root',
        '',
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
    return $pdo;
}

