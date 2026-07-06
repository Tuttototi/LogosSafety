import { useState, useRef, useEffect } from "react";
import { Palette, Image, Type, Upload, RotateCcw, Save, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBranding } from "@/hooks/useBranding";
import { toast } from "sonner";

const defaultColors = {
  appName: "Logos Safety",
  primaryColor: "#1E40AF",
  primaryHover: "#1E3A8A",
  accentColor: "#3B82F6",
  sidebarBg: "#FFFFFF",
  sidebarText: "#4B5563",
  sidebarActiveBg: "#1E40AF",
  sidebarActiveText: "#FFFFFF",
  topbarBg: "#FFFFFF",
  canvasBg: "#F0F2F5",
  statusGreen: "#059669",
  statusYellow: "#D97706",
  statusRed: "#DC2626",
};

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-8 h-8 rounded-md border border-gray-200 overflow-hidden flex-shrink-0">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute -top-1 -left-1 w-10 h-10 cursor-pointer p-0 border-0"
        />
      </div>
      <div className="flex-1">
        <Label className="text-xs font-medium text-gray-700">{label}</Label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-xs mt-0.5"
        />
      </div>
    </div>
  );
}

export default function BrandingPanel() {
  const { branding, update, isUpdating } = useBranding();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    appName: branding?.appName ?? defaultColors.appName,
    primaryColor: branding?.primaryColor ?? defaultColors.primaryColor,
    primaryHover: branding?.primaryHover ?? defaultColors.primaryHover,
    accentColor: branding?.accentColor ?? defaultColors.accentColor,
    sidebarBg: branding?.sidebarBg ?? defaultColors.sidebarBg,
    sidebarText: branding?.sidebarText ?? defaultColors.sidebarText,
    sidebarActiveBg: branding?.sidebarActiveBg ?? defaultColors.sidebarActiveBg,
    sidebarActiveText: branding?.sidebarActiveText ?? defaultColors.sidebarActiveText,
    topbarBg: branding?.topbarBg ?? defaultColors.topbarBg,
    canvasBg: branding?.canvasBg ?? defaultColors.canvasBg,
    statusGreen: branding?.statusGreen ?? defaultColors.statusGreen,
    statusYellow: branding?.statusYellow ?? defaultColors.statusYellow,
    statusRed: branding?.statusRed ?? defaultColors.statusRed,
    logoUrl: branding?.logoUrl ?? "",
    faviconUrl: branding?.faviconUrl ?? "",
    logoWidth: branding?.logoWidth ?? 140,
  });

  // Sync form when branding data loads
  useEffect(() => {
    if (branding) {
      // The query result initializes an editable local draft when it arrives.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        appName: branding.appName ?? defaultColors.appName,
        primaryColor: branding.primaryColor ?? defaultColors.primaryColor,
        primaryHover: branding.primaryHover ?? defaultColors.primaryHover,
        accentColor: branding.accentColor ?? defaultColors.accentColor,
        sidebarBg: branding.sidebarBg ?? defaultColors.sidebarBg,
        sidebarText: branding.sidebarText ?? defaultColors.sidebarText,
        sidebarActiveBg: branding.sidebarActiveBg ?? defaultColors.sidebarActiveBg,
        sidebarActiveText: branding.sidebarActiveText ?? defaultColors.sidebarActiveText,
        topbarBg: branding.topbarBg ?? defaultColors.topbarBg,
        canvasBg: branding.canvasBg ?? defaultColors.canvasBg,
        statusGreen: branding.statusGreen ?? defaultColors.statusGreen,
        statusYellow: branding.statusYellow ?? defaultColors.statusYellow,
        statusRed: branding.statusRed ?? defaultColors.statusRed,
        logoUrl: branding.logoUrl ?? "",
        faviconUrl: branding.faviconUrl ?? "",
        logoWidth: branding.logoWidth ?? 140,
      });
    }
  }, [branding]);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    update({
      appName: form.appName,
      logoUrl: form.logoUrl || null,
      logoWidth: form.logoWidth,
      faviconUrl: form.faviconUrl || null,
      primaryColor: form.primaryColor,
      primaryHover: form.primaryHover,
      accentColor: form.accentColor,
      sidebarBg: form.sidebarBg,
      sidebarText: form.sidebarText,
      sidebarActiveBg: form.sidebarActiveBg,
      sidebarActiveText: form.sidebarActiveText,
      topbarBg: form.topbarBg,
      canvasBg: form.canvasBg,
      statusGreen: form.statusGreen,
      statusYellow: form.statusYellow,
      statusRed: form.statusRed,
    });
    toast.success("Branding aggiornato con successo");
  };

  const handleReset = () => {
    setForm({ ...defaultColors, logoUrl: "", faviconUrl: "", logoWidth: 140 });
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, logoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleFaviconFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, faviconUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-600" />
            Branding e personalizzazione
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Personalizza logo, colori aziendali, favicon e nome dell applicazione
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1">
            <RotateCcw className="w-3.5 h-3.5" />
            Ripristina default
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isUpdating} className="gap-1">
            <Save className="w-3.5 h-3.5" />
            {isUpdating ? "Salvataggio..." : "Salva"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Logo + Favicon + App Name */}
        <div className="space-y-6">
          {/* App Name */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Type className="w-4 h-4 text-gray-500" />
                Nome applicazione
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Input
                value={form.appName}
                onChange={(e) => handleChange("appName", e.target.value)}
                placeholder="Nome applicazione"
                className="text-sm"
              />
            </CardContent>
          </Card>

          {/* Logo Upload */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Image className="w-4 h-4 text-gray-500" />
                Logo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {/* Preview */}
              <div
                className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex items-center justify-center"
                style={{ backgroundColor: form.canvasBg }}
              >
                {form.logoUrl ? (
                  <img
                    src={form.logoUrl}
                    alt="Logo preview"
                    className="max-h-16 object-contain"
                    style={{ maxWidth: form.logoWidth }}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Palette className="w-6 h-6" style={{ color: form.primaryColor }} />
                    <span className="text-sm font-semibold" style={{ color: form.sidebarText }}>
                      {form.appName}
                    </span>
                  </div>
                )}
              </div>

              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoFile}
                className="hidden"
              />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  className="gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Carica logo
                </Button>
                {form.logoUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleChange("logoUrl", "")}
                    className="text-red-500"
                  >
                    Rimuovi
                  </Button>
                )}
              </div>

              {form.logoUrl && (
                <div className="space-y-1">
                  <Label className="text-xs">Larghezza logo (px)</Label>
                  <Input
                    type="number"
                    value={form.logoWidth}
                    onChange={(e) => handleChange("logoWidth", String(Number(e.target.value)))}
                    className="h-8 text-xs w-24"
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Oppure inserisci URL</Label>
                <Input
                  value={form.logoUrl}
                  onChange={(e) => handleChange("logoUrl", e.target.value)}
                  placeholder="https://..."
                  className="h-8 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Favicon Upload */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4 text-gray-500" />
                Favicon
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="flex items-center gap-4">
                {form.faviconUrl ? (
                  <img
                    src={form.faviconUrl}
                    alt="Favicon preview"
                    className="w-10 h-10 rounded border border-gray-200 object-contain"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded border border-gray-200 flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: form.primaryColor }}
                  >
                    {form.appName.charAt(0)}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/png,image/x-icon,image/svg+xml"
                    onChange={handleFaviconFile}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => faviconInputRef.current?.click()}
                    className="gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Carica favicon
                  </Button>
                  {form.faviconUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleChange("faviconUrl", "")}
                      className="text-red-500"
                    >
                      Rimuovi
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Oppure inserisci URL</Label>
                <Input
                  value={form.faviconUrl}
                  onChange={(e) => handleChange("faviconUrl", e.target.value)}
                  placeholder="https://..."
                  className="h-8 text-xs"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Colors */}
        <div className="space-y-6">
          {/* Primary Colors */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Palette className="w-4 h-4 text-blue-500" />
                Colori primari
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <ColorField label="Colore primario" value={form.primaryColor} onChange={(v) => handleChange("primaryColor", v)} />
              <ColorField label="Colore primario (hover)" value={form.primaryHover} onChange={(v) => handleChange("primaryHover", v)} />
              <ColorField label="Colore accento" value={form.accentColor} onChange={(v) => handleChange("accentColor", v)} />
            </CardContent>
          </Card>

          {/* Sidebar Colors */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-500" />
                Colori sidebar
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <ColorField label="Sfondo sidebar" value={form.sidebarBg} onChange={(v) => handleChange("sidebarBg", v)} />
              <ColorField label="Testo sidebar" value={form.sidebarText} onChange={(v) => handleChange("sidebarText", v)} />
              <ColorField label="Sfondo voce attiva" value={form.sidebarActiveBg} onChange={(v) => handleChange("sidebarActiveBg", v)} />
              <ColorField label="Testo voce attiva" value={form.sidebarActiveText} onChange={(v) => handleChange("sidebarActiveText", v)} />
            </CardContent>
          </Card>

          {/* Layout Colors */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Palette className="w-4 h-4 text-gray-500" />
                Colori layout
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <ColorField label="Sfondo topbar" value={form.topbarBg} onChange={(v) => handleChange("topbarBg", v)} />
              <ColorField label="Sfondo canvas" value={form.canvasBg} onChange={(v) => handleChange("canvasBg", v)} />
            </CardContent>
          </Card>

          {/* Status Colors */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Palette className="w-4 h-4 text-emerald-500" />
                Colori stato (semafori)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <ColorField label="Stato OK (verde)" value={form.statusGreen} onChange={(v) => handleChange("statusGreen", v)} />
              <ColorField label="Stato attenzione (giallo)" value={form.statusYellow} onChange={(v) => handleChange("statusYellow", v)} />
              <ColorField label="Stato critico (rosso)" value={form.statusRed} onChange={(v) => handleChange("statusRed", v)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
