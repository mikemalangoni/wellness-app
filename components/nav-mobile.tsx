"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Moon, Waves, Brain, Dumbbell, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Sleep", href: "/sleep", icon: Moon },
  { label: "Gut", href: "/gut", icon: Waves },
  { label: "Mind", href: "/mind", icon: Brain },
  { label: "Body", href: "/body", icon: Dumbbell },
  { label: "Log", href: "/log", icon: PenLine },
];

export function NavMobile() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t bg-background md:hidden">
      {nav.map(({ label, href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors",
            pathname === href
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
