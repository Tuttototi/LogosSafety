import { SegnalatoreApp } from "@/components/reports/SegnalatoreApp/index";

type SegnalatoreMobileAppProps = {
  role?: string;
};

export function SegnalatoreMobileApp({ role }: Readonly<SegnalatoreMobileAppProps>) {
  return <SegnalatoreApp variant="mobile" role={role} />;
}
