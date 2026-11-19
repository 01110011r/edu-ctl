"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";

import { navItems } from "@/lib/nav";
import type { UserRole } from "@/lib/types";
import { cn } from "cn";

interface SidebarProps {
  role: UserRole;
  onNavigate?: () => void;
}

export function Sidebar({ role, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) =>
    item.allowedRoles.includes(role)
  );

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="size-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Edu Center</p>
          <p className="text-xs text-muted-foreground">Boshqaruv tizimi</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
