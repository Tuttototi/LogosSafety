<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/rbac.php';

// solo SICUREZZA (eventualmente ADMIN)
require_role(['SICUREZZA', 'ADMIN']);

// carica HTML
require __DIR__ . '/../views/dashboard_sicurezza.html';

<?php include __DIR__ . '/../views/App_Segnalazioni.html'; ?>
