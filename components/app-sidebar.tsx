"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Moon, Waves, Brain, Dumbbell, Sparkles } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

const nav = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Sleep", href: "/sleep", icon: Moon },
  { label: "Gut", href: "/gut", icon: Waves },
  { label: "Mind", href: "/mind", icon: Brain },
  { label: "Body", href: "/body", icon: Dumbbell },
  { label: "Insights", href: "/insights", icon: Sparkles },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="hidden md:flex">
      <SidebarHeader className="px-4 py-4">
        <span className="text-sm font-semibold tracking-tight">Wellness</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {nav.map(({ label, href, icon: Icon }) => (
            <SidebarMenuItem key={href}>
              <SidebarMenuButton asChild isActive={pathname === href}>
                <Link href={href}>
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
