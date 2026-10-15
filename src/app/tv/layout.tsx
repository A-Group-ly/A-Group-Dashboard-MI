import { AccessProvider } from "@/components/providers/AccessProvider";
import { DashboardDataProvider } from "@/components/providers/DashboardDataProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";

/** TV mode: no sidebar or menus, just the wallboard. Still behind sign-in (proxy.ts) and the API's own checks. */
export default function TvLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccessProvider>
      <DashboardDataProvider>
        <ToastProvider>{children}</ToastProvider>
      </DashboardDataProvider>
    </AccessProvider>
  );
}
