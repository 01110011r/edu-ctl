"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, LogOut, Menu } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { navItems } from "@/lib/nav";
import { Sidebar } from "@/components/shared/Sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const roleLabels = {
  admin: "Administrator",
  teacher: "Ustoz",
  student: "Talaba",
} as const;

function getInitials(fullName: string) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .toUpperCase();
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    const currentItem = navItems.find(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`)
    );
    if (currentItem && !currentItem.allowedRoles.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [loading, user, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const currentItem =
    navItems.find(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`)
    ) ?? navItems[0];
  const isAllowed = currentItem.allowedRoles.includes(user.role);

  if (!isAllowed) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-border lg:block">
        <Sidebar role={user.role} />
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-2">
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    aria-label="Menyuni ochish"
                  />
                }
              >
                <Menu />
              </SheetTrigger>
              <SheetContent side="left" className="w-60 p-0">
                <SheetTitle className="sr-only">Navigatsiya menyusi</SheetTitle>
                <Sidebar
                  role={user.role}
                  onNavigate={() => setDrawerOpen(false)}
                />
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-semibold leading-7">
              {currentItem.label}
            </h1>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg outline-none"
                  aria-label="Foydalanuvchi menyusi"
                />
              }
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {getInitials(user.full_name)}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium">
                  {user.full_name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {roleLabels[user.role]}
                </span>
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2">
              <DropdownMenuLabel className="px-2 py-2">
                <span className="block text-sm font-medium text-foreground">
                  {user.full_name}
                </span>
                <span className="block text-xs font-normal">
                  {user.email}
                </span>
                <span className="mt-1 block text-xs font-normal">
                  {roleLabels[user.role]}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={logout}
                className="cursor-pointer"
              >
                <LogOut />
                Chiqish
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
