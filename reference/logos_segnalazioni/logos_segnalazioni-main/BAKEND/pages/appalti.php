<?php
require_once __DIR__ . '/../config/database.php';
$pdo = db();

$msg = null;
$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $codice  = trim($_POST['codice']);
    $nome    = trim($_POST['nome']);
    $cliente = trim($_POST['cliente']);

    try {
        $stmt = $pdo->prepare("
            INSERT INTO appalti (codice_appalto, nome, cliente, attivo)
            VALUES (:c, :n, :cl, 1)
        ");
        $stmt->execute([
            'c'  => $codice,
            'n'  => $nome,
            'cl' => $cliente
        ]);
        $msg = 'Appalto creato';
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            $error = 'Codice appalto già esistente';
        } else {
            throw $e;
        }
    }
}

$appalti = $pdo->query("
    SELECT id, codice_appalto, nome, cliente, attivo
    FROM appalti
    ORDER BY id DESC
")->fetchAll();
?>
<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>Appalti</title>
<link href="https://cdn.tailwindcss.com" rel="stylesheet">
</head>
<body class="bg-gray-100 p-6">

<h1 class="text-2xl font-bold mb-4">Appalti</h1>

<?php if ($msg): ?><p class="text-green-600"><?= $msg ?></p><?php endif; ?>
<?php if ($error): ?><p class="text-red-600"><?= $error ?></p><?php endif; ?>

<form method="post" class="bg-white p-4 shadow w-96 mb-6 space-y-2">
    <input name="codice" placeholder="Codice appalto" required class="w-full border p-2">
    <input name="nome" placeholder="Nome appalto" required class="w-full border p-2">
    <input name="cliente" placeholder="Cliente" class="w-full border p-2">
    <button class="bg-red-700 text-white px-4 py-2 w-full">Crea appalto</button>
</form>

<table class="w-full bg-white shadow">
<thead class="bg-gray-200">
<tr>
<th class="p-2">Codice</th>
<th class="p-2">Nome</th>
<th class="p-2">Cliente</th>
<th class="p-2">Attivo</th>
</tr>
</thead>
<tbody>
<?php foreach ($appalti as $a): ?>
<tr class="border-t">
<td class="p-2"><?= htmlspecialchars($a['codice_appalto']) ?></td>
<td class="p-2"><?= htmlspecialchars($a['nome']) ?></td>
<td class="p-2"><?= htmlspecialchars($a['cliente']) ?></td>
<td class="p-2"><?= $a['attivo'] ? '🟢' : '🔴' ?></td>
<td class="p-2">
    <a href="appalto_utenti.php?id=<?= $a['id'] ?>"
       class="text-blue-600 underline">
       Gestisci utenti
    </a>
</td>
</tr>

<?php endforeach; ?>
</tbody>
</table>

<a href="dashboard_admin.php" class="block mt-4 text-blue-600">← Dashboard Admin</a>

</body>
</html>
