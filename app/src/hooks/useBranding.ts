import { useEffect, useMemo } from "react";
import { trpc } from "@/providers/trpc";

export type BrandingColors = {
  primaryColor: string;
  primaryHover: string;
  accentColor: string;
  sidebarBg: string;
  sidebarText: string;
  sidebarActiveBg: string;
  sidebarActiveText: string;
  topbarBg: string;
  canvasBg: string;
  statusGreen: string;
  statusYellow: string;
  statusRed: string;
};

export function useBranding() {
  const { data, isLoading } = trpc.branding.get.useQuery();
  const utils = trpc.useUtils();

  const mutation = trpc.branding.upsert.useMutation({
    onSuccess: () => {
      utils.branding.get.invalidate();
    },
  });

  // Apply CSS custom properties to document root
  useEffect(() => {
    if (!data) return;
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", data.primaryColor ?? "#1E40AF");
    root.style.setProperty("--brand-primary-hover", data.primaryHover ?? "#1E3A8A");
    root.style.setProperty("--brand-accent", data.accentColor ?? "#3B82F6");
    root.style.setProperty("--brand-sidebar-bg", data.sidebarBg ?? "#FFFFFF");
    root.style.setProperty("--brand-sidebar-text", data.sidebarText ?? "#4B5563");
    root.style.setProperty("--brand-sidebar-active-bg", data.sidebarActiveBg ?? "#1E40AF");
    root.style.setProperty("--brand-sidebar-active-text", data.sidebarActiveText ?? "#FFFFFF");
    root.style.setProperty("--brand-topbar-bg", data.topbarBg ?? "#FFFFFF");
    root.style.setProperty("--brand-canvas-bg", data.canvasBg ?? "#F0F2F5");
    root.style.setProperty("--brand-status-green", data.statusGreen ?? "#059669");
    root.style.setProperty("--brand-status-yellow", data.statusYellow ?? "#D97706");
    root.style.setProperty("--brand-status-red", data.statusRed ?? "#DC2626");

    // Apply canvas bg
    document.body.style.backgroundColor = data.canvasBg ?? "#F0F2F5";

    // Apply favicon
    if (data.faviconUrl) {
      let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.type = "image/png";
      link.href = data.faviconUrl;
    }
  }, [data]);

  const colors: BrandingColors = useMemo(() => ({
    primaryColor: data?.primaryColor ?? "#1E40AF",
    primaryHover: data?.primaryHover ?? "#1E3A8A",
    accentColor: data?.accentColor ?? "#3B82F6",
    sidebarBg: data?.sidebarBg ?? "#FFFFFF",
    sidebarText: data?.sidebarText ?? "#4B5563",
    sidebarActiveBg: data?.sidebarActiveBg ?? "#1E40AF",
    sidebarActiveText: data?.sidebarActiveText ?? "#FFFFFF",
    topbarBg: data?.topbarBg ?? "#FFFFFF",
    canvasBg: data?.canvasBg ?? "#F0F2F5",
    statusGreen: data?.statusGreen ?? "#059669",
    statusYellow: data?.statusYellow ?? "#D97706",
    statusRed: data?.statusRed ?? "#DC2626",
  }), [data]);

  // Safety override: ensure correct app name
  const branding = data
    ? { ...data, appName: data.appName === "Nexus Safety" ? "Logos Safety" : (data.appName || "Logos Safety") }
    : undefined;

  return {
    branding,
    isLoading,
    colors,
    update: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}
