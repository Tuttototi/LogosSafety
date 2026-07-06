<?php
declare(strict_types=1);

// PASSO 2 - Entry point con layout

$routes = require __DIR__ . '/core/router.php';

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$basePath = '/cfl_segnalazioni';

$route = str_replace($basePath, '', $uri);
$route = $route === '' ? '/' : $route;

$page = $routes[$route] ?? null;

if ($page === null) {
    http_response_code(404);
    $page = '_404';
}

$pageFile = __DIR__ . '/pages/' . $page . '.php';

ob_start();
require $pageFile;
$content = ob_get_clean();

require __DIR__ . '/core/layout.php';

