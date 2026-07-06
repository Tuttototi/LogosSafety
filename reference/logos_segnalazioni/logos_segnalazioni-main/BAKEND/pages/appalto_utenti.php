<?php
require_once __DIR__ . '/../config/database.php';
$pdo = db();

$appalto_id = (int)($_GET['id'] ?? 0);
if (!$appalto_id) die('Appalto non valido');

// dati appalto
$stmt = $pdo->prepare("SELECT * FROM appalti WHERE id = ?");
$stmt->execute([$appalto_id]);
$appalto = $stmt->fetch();
if (!$appalto) die('Appalto non trovato');

// aggiunta associazione
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['utente_id'])) {
    $stmt = $pdo->prepare("
        INSERT IGNORE INTO utenti_appalti (utente_id, appalto_id)
        VALUES (?, ?)
    ");
    $stmt->execute([$_POST['utente_id'], $appalto_id]);
}

// rimozione associazione
if (isset($_GET['remove'])) {
    $stmt = $pdo->prepare("
        DELETE FROM utenti_appalti
        WHERE utente_id = ? AND appalto_id = ?
    ");
    $stmt->execute([(int)$_GET['remove'], $appalto_id]);
}

// utenti associati
$associati = $pdo->prepare("
    SELECT u.id, u.username, u.ruolo
    FROM utenti u
    JOIN utenti_appalti ua ON ua.utente_id = u.id
    WHERE ua.appalto_id = ?
");
$associati->execute([$appalto_id]);
$associati = $associati->fetchAll();

// utenti disponibili
$disponibili = $pdo->prepare("
    SELECT id, username, ruolo
    FROM utenti
    WHERE id NOT IN (
        SELECT utente_id FROM utenti_appalti WHERE appalto_id = ?
    )
    ORDER BY username
");
$disponibili->execute([$appalto_id]);
$disponibili = $disponibili->fetchAll();
?>
<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>Utenti Appalto</title>
<link href="https://cdn.tailwindcss.com" rel="stylesheet">
</head>
<body class="bg-gray-100 p-6">

<h1 class="text-xl font-bold mb-2">
Appalto: <?= htmlspecialchars($appalto['nome']) ?>
</h1>

<h2 class="font-semibold mt-4">Utenti associati</h2>
<ul class="bg-white shadow p-4">
<?php foreach ($associati as $u): ?>
<li class="flex justify-between border-b py-1">
    <?= $u['username'] ?> (<?= $u['ruolo'] ?>)
    <a href="?id=<?= $appalto_id ?>&remove=<?= $u['id'] ?>"
       class="text-red-600">Rimuovi</a>
</li>
<?php endforeach; ?>
</ul>

<h2 class="font-semibold mt-6">Aggiungi utente</h2>
<form method="post" class="bg-white p-4 shadow w-96">
    <select name="utente_id" class="w-full border p-2 mb-2">
        <?php foreach ($disponibili as $u): ?>
        <option value="<?= $u['id'] ?>">
            <?= $u['username'] ?> (<?= $u['ruolo'] ?>)
        </option>
        <?php endforeach; ?>
    </select>
    <button class="bg-red-700 text-white px-4 py-2 w-full">
        Associa
    </button>
</form>

<a href="appalti.php" class="block mt-4 text-blue-600">
← Torna agli appalti
</a>

</body>
</html>
