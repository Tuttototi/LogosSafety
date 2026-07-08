import { SegnalatoreApp } from "@/components/reports/SegnalatoreApp";

type SegnalatoreMobileAppProps = {
  role?: string;
};

export function SegnalatoreMobileApp({ role }: Readonly<SegnalatoreMobileAppProps>) {
  return <SegnalatoreApp variant="mobile" role={role} />;
}
