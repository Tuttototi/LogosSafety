import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, ArrowRight } from "lucide-react";

function getOAuthUrl() {
  const kimiAuthUrl = import.meta.env.VITE_KIMI_AUTH_URL;
  const appID = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${kimiAuthUrl}/api/oauth/authorize`);
  url.searchParams.set("client_id", appID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "profile");
  url.searchParams.set("state", state);

  return url.toString();
}

export default function Login() {
  const devAuthEnabled =
    import.meta.env.DEV &&
    import.meta.env.VITE_DEV_AUTH_ENABLED === "true";

  return (
    <div className="min-h-screen bg-[#f4f2ee] p-4 sm:p-6 lg:p-8 flex items-center justify-center">
      <div className="w-full max-w-5xl overflow-hidden rounded-[32px] border border-red-100 bg-white shadow-[0_25px_80px_rgba(0,0,0,0.12)]">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="bg-[#b91c1c] px-8 py-10 sm:px-10 lg:px-12 lg:py-14 text-white">
            <div className="flex justify-center">
              <div className="flex h-16 w-52 items-center justify-center rounded-2xl bg-white px-4 shadow-sm">
                <img
                  src="/assets/LogoLogos.png"
                  alt="Logos"
                  className="max-h-11 w-full object-contain"
                />
              </div>
            </div>
            <h1 className="mt-6 text-center text-3xl font-semibold tracking-tight sm:text-4xl lg:text-left">
              Accesso a Logos Safety
            </h1>
            <p className="mt-3 max-w-xl text-center text-sm leading-6 text-red-50 sm:text-base lg:text-left">
              Gestisci sicurezza, conformità e attività operative da un unico punto di accesso.
            </p>

            <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Flusso operativo diretto</p>
                  <p className="mt-1 text-sm text-red-50">
                    Accedi rapidamente per entrare nel pannello operativo e proseguire con le attività richieste.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center bg-white px-6 py-10 sm:px-8 lg:px-10">
            <div className="w-full max-w-md space-y-6">
              <div className="text-center lg:text-left">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-600">
                  Area riservata
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  Entra nel portale
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Seleziona il metodo di accesso più adatto e prosegui con il lavoro.
                </p>
              </div>

              <div className="space-y-3">
                {devAuthEnabled && (
                  <div className="space-y-3">
                    <Button
                      className="w-full justify-between gap-2 rounded-2xl py-6 text-base"
                      size="lg"
                      onClick={() => {
                        window.location.href = "/api/dev/login?identity=admin";
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        Accesso locale Admin UAT
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      className="w-full justify-between gap-2 rounded-2xl py-6 text-base"
                      size="lg"
                      variant="outline"
                      onClick={() => {
                        window.location.href = "/api/dev/login?identity=segnalatore";
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        Accesso locale Segnalatore UAT
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <Button
                  className="w-full justify-between gap-2 rounded-2xl border-red-200 py-6 text-base text-red-700 hover:bg-red-50"
                  variant={devAuthEnabled ? "outline" : "default"}
                  size="lg"
                  onClick={() => {
                    window.location.href = getOAuthUrl();
                  }}
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Accedi con Kimi
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Per assistenza o accessi non autorizzati, contatta il referente di sicurezza interno.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
