<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/auth.php';

require_login(); // utente loggato obbligatorio

// layout standard
require_once __DIR__ . '/../core/layout.php';
layout_header('Nuova Segnalazione');
?>

<div class="p-6">

  <h1 class="text-2xl font-bold mb-6">Nuova Segnalazione</h1>

  <?php
    // FORM GIÀ ESISTENTE
    // contiene campi + name corretti
    require_once __DIR__ . '/../components/segnalazione_form.php';
  ?>

</div>

<?php
layout_footer();


