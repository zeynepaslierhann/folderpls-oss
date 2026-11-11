import { DashboardShellSkeleton } from "@/components/dashboard/dashboard-shell/shell-skeleton";

/**
 * Rota yüklenirken ilk HTML parçası (spec §4.1): sayfa sunucudan akarken
 * boş krem zemin yerine kabuk hemen çizilir, iskelet yalnız içerikte.
 */
export default function DashboardLoading() {
  return <DashboardShellSkeleton />;
}
