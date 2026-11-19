import {
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  GraduationCap,
  Users,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "./types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  allowedRoles: UserRole[];
}

export const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Bosh sahifa",
    icon: LayoutDashboard,
    allowedRoles: ["admin", "teacher", "student"],
  },
  {
    href: "/teachers",
    label: "Ustozlar",
    icon: GraduationCap,
    allowedRoles: ["admin"],
  },
  {
    href: "/students",
    label: "O'quvchilar",
    icon: UserRound,
    allowedRoles: ["admin", "teacher"],
  },
  {
    href: "/groups",
    label: "Guruhlar",
    icon: Users,
    allowedRoles: ["admin", "teacher", "student"],
  },
  {
    href: "/schedule",
    label: "Dars jadvali",
    icon: CalendarDays,
    allowedRoles: ["admin", "teacher", "student"],
  },
  {
    href: "/attendance",
    label: "Davomat",
    icon: ClipboardCheck,
    allowedRoles: ["admin", "teacher", "student"],
  },
];
