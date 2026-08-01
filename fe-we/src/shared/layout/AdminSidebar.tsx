"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { BarChart3Icon, MessageCircleIcon, HomeIcon } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/shared/ui/sidebar"

// Daftar menu yang tampil di sidebar. Menambah menu baru cukup menambah
// satu baris di daftar ini — tidak perlu mengubah bagian lain di file ini.
const navItems = [
  { label: "Dashboard Analitik", href: "/admin/analytics", icon: BarChart3Icon },
  { label: "Help Articles", href: "/admin/help-articles", icon: MessageCircleIcon },
]

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // usePathname() membaca alamat halaman yang sedang aktif saat ini,
  // dipakai di bawah untuk menandai menu mana yang sedang terpilih (highlight).
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Bagian atas: logo dan nama aplikasi, sekaligus jadi tautan ke halaman dashboard */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/admin/analytics">
                <div className="flex shrink-0 items-center justify-center rounded-full border border-border/60 bg-foreground dark:bg-primary/10 p-1.5">
                  <Image src="/logo-optimized.png" alt="Worldpedia" width={18} height={20} className="h-5 w-[18px] object-contain" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Worldpedia Education</span>
                  <span className="truncate text-xs text-sidebar-foreground/60">Skripsi Showcase</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Bagian tengah: daftar menu navigasi utama */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                // Menu dianggap "aktif" (disorot) kalau alamat halaman saat
                // ini diawali dengan alamat menu tersebut.
                const isActive = pathname?.startsWith(item.href) ?? false
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tautan kembali ke halaman utama, ditempatkan menempel ke bawah lewat mt-auto */}
        <div className="mt-auto px-2 pb-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Back to Home">
                <Link href="/">
                  <HomeIcon />
                  <span>Back to Home</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>

      {/* Bagian paling bawah: keterangan kecil */}
      <SidebarFooter>
        <div className="px-2 py-1.5 text-xs text-sidebar-foreground/50">
          Demo tanpa login &middot; skripsi showcase
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
