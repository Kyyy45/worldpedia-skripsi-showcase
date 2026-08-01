import type { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/shared/ui/sidebar";
import { AdminSidebar } from "@/shared/layout/AdminSidebar";

// Catatan: biasanya halaman admin dilindungi pemeriksaan status login
// (RoleGuard), tapi di demo ini sengaja tidak dipasang karena memang tidak
// ada proses login — lihat penjelasan di shared/lib/token.ts.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset className="min-w-0 overflow-x-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
