import { AccessProvider } from "@/components/providers/AccessProvider";
import { DashboardDataProvider } from "@/components/providers/DashboardDataProvider";
import AppShell from "@/components/shell/AppShell";
import RouteGate from "@/components/shell/RouteGate";

/** Everything inside (app) requires a signed-in user (enforced by proxy.ts and again by every API route). */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccessProvider>
      <DashboardDataProvider>
        <AppShell>
          <RouteGate>{children}</RouteGate>
        </AppShell>
      </DashboardDataProvider>
    </AccessProvider>
  );
}
