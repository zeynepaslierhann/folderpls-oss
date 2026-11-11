import type { Metadata } from "next";
import { DriveSessionProvider } from "@/lib/google-drive/drive-session";
import { DriveAutoBackupProvider } from "@/lib/storage/auto-backup-provider";
import { AppScope } from "@/components/dashboard/app-scope";

// Panel sekmesi pazarlama başlığını taşımasın: varsayılan "Dashboard"; her rota
// kendi başlığını kendi layout/page'inde verir. Şablon BURADA yeniden tanımlanır:
// Next, düz-metin bir title'dan sonra üst şablonu sıfırlar (alt rotalar "Drive" gibi
// çıplak kalırdı); nesne biçimi şablonu alt rotalara taşır -> "Drive | FolderPls".
export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s | FolderPls" },
  robots: {
    index: false,
    follow: true,
  },
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DriveSessionProvider>
      <DriveAutoBackupProvider>
        <AppScope>{children}</AppScope>
      </DriveAutoBackupProvider>
    </DriveSessionProvider>
  );
}
