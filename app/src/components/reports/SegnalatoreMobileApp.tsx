import { useState } from "react";

export function SegnalatoreMobileApp() {
  const [message, setMessage] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("Invio segnalazione non ancora collegato al backend LogosSafety");
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.target.value = "";
  };

  return (
    <div className="flex h-full min-h-0 items-start justify-center overflow-y-auto bg-gray-100 px-4 py-6">
      <div className="w-full rounded-2xl bg-white p-5 shadow-xl">
        <h1 className="mb-6 text-center text-xl font-bold text-red-600">
          Nuova Segnalazione
        </h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="mobile-contract" className="mb-1 block text-sm font-medium text-slate-800">
              Appalto *
            </label>
            <select
              id="mobile-contract"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
              defaultValue=""
            >
              <option value="" disabled>Seleziona appalto</option>
              <option value="appalto-milano">Appalto Milano</option>
              <option value="appalto-torino">Appalto Torino</option>
              <option value="appalto-bologna">Appalto Bologna</option>
            </select>
          </div>

          <div>
            <label htmlFor="mobile-title" className="mb-1 block text-sm font-medium text-slate-800">
              Titolo *
            </label>
            <input
              id="mobile-title"
              type="text"
              placeholder="Es. Transenna danneggiata"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
            />
          </div>

          <div>
            <label htmlFor="mobile-description" className="mb-1 block text-sm font-medium text-slate-800">
              Descrizione *
            </label>
            <textarea
              id="mobile-description"
              rows={4}
              placeholder="Descrivi il problema riscontrato"
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
            />
          </div>

          <div>
            <label htmlFor="mobile-priority" className="mb-1 block text-sm font-medium text-slate-800">
              Priorità
            </label>
            <select
              id="mobile-priority"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
              defaultValue="media"
            >
              <option value="media">Media</option>
              <option value="bassa">Bassa</option>
              <option value="alta">Alta</option>
            </select>
          </div>

          <div>
            <label htmlFor="mobile-attachments" className="mb-1 block text-sm font-medium text-slate-800">
              Foto / Allegati
            </label>
            <input
              id="mobile-attachments"
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-red-600 file:px-4 file:py-2 file:text-white hover:file:bg-red-700"
              onChange={handleFileChange}
            />
          </div>

          {message && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {message}
            </p>
          )}

          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-red-600 py-3 font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Invia Segnalazione
          </button>
        </form>
      </div>
    </div>
  );
}
