<h1>segnalazioni</h1>
<p>PASSO 1 - Pagina caricata correttamente</p>
<h1 class="text-2xl font-bold mb-6">Segnalazioni</h1>

<!-- FILTRI -->
<div class="bg-white p-4 rounded shadow mb-6">
    <form class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
            <label class="block text-sm font-medium mb-1">Stato</label>
            <select class="w-full border rounded p-2">
                <option>Tutti</option>
                <option>Nuova</option>
                <option>In lavorazione</option>
                <option>Richiesta integrazione</option>
                <option>Chiusa</option>
            </select>
        </div>

        <div>
            <label class="block text-sm font-medium mb-1">Priorità</label>
            <select class="w-full border rounded p-2">
                <option>Tutte</option>
                <option>Bassa</option>
                <option>Media</option>
                <option>Alta</option>
                <option>Critica</option>
            </select>
        </div>

        <div>
            <label class="block text-sm font-medium mb-1">Appalto</label>
            <select class="w-full border rounded p-2">
                <option>Tutti</option>
                <option>Appalto A</option>
                <option>Appalto B</option>
            </select>
        </div>

        <div class="flex items-end">
            <button class="bg-gray-800 text-white px-4 py-2 rounded w-full">
                Filtra
            </button>
        </div>
    </form>
</div>

<!-- CTA -->
<div class="mb-4">
    <a href="/cfl_segnalazioni/segnalazioni/nuova"
       class="inline-block bg-blue-600 text-white px-4 py-2 rounded">
        + Nuova segnalazione
    </a>
</div>

<!-- TABELLA -->
<div class="bg-white rounded shadow overflow-x-auto">
    <table class="w-full text-sm">
        <thead class="bg-gray-100">
            <tr>
                <th class="p-3 text-left">ID</th>
                <th class="p-3 text-left">Data</th>
                <th class="p-3 text-left">Appalto</th>
                <th class="p-3 text-left">Stato</th>
                <th class="p-3 text-left">Priorità</th>
                <th class="p-3 text-left">Azioni</th>
            </tr>
        </thead>
        <tbody>
            <tr class="border-t">
                <td class="p-3">#123</td>
                <td class="p-3">14/12/2025</td>
                <td class="p-3">Appalto A</td>
                <td class="p-3">Nuova</td>
                <td class="p-3">Alta</td>
                <td class="p-3">
                    <a href="#" class="text-blue-600 underline">Dettaglio</a>
                </td>
            </tr>
        </tbody>
    </table>
</div>
