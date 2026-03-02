"use client";

import {
  ChefHat,
  CookingPot,
  LayoutDashboard,
  Monitor,
  Package,
  ShieldAlert,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  Utensils,
  Heart,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavUser } from "./nav-user";

const navigation = [
  {
    label: "Tổng quan",
    items: [
      {
        title: "Dashboard",
        url: "/admin",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Vận hành",
    items: [
      {
        title: "Thực đơn",
        url: "/admin/menu",
        icon: Utensils,
      },
      {
        title: "Đơn hàng",
        url: "/admin/orders",
        icon: ShoppingCart,
      },
      {
        title: "Thiết bị POS",
        url: "/admin/terminals",
        icon: Monitor,
      },
      {
        title: "Bếp KDS",
        url: "/admin/kds-stations",
        icon: CookingPot,
      },
      {
        title: "Kho hàng",
        url: "/admin/inventory",
        icon: Package,
      },
    ],
  },
  {
    label: "Quản lý",
    items: [
      {
        title: "Nhân sự",
        url: "/admin/hr",
        icon: Users,
      },
      {
        title: "Khách hàng",
        url: "/admin/crm",
        icon: Heart,
      },
      {
        title: "Báo cáo",
        url: "/admin/reports",
        icon: BarChart3,
      },
      {
        title: "Bảo mật",
        url: "/admin/security",
        icon: ShieldAlert,
      },
      {
        title: "Cài đặt",
        url: "/admin/settings",
        icon: Settings,
      },
    ],
  },
];

interface AppSidebarProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

  // HR role only sees the Nhân sự item under Quản lý
  const hrItem = navigation
    .find((g) => g.label === "Quản lý")
    ?.items.find((item) => item.url === "/admin/hr");

  const filteredNav =
    user.role === "hr" && hrItem
      ? [{ label: "Quản lý", items: [hrItem] }]
      : navigation;

  // HR role links to /admin/hr, others link to /admin dashboard
  const homeHref = user.role === "hr" ? "/admin/hr" : "/admin";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={homeHref}>
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <ChefHat className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Com Tam Ma Tu</span>
                  <span className="text-muted-foreground truncate text-xs">
                    Hệ thống quản lý
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {filteredNav.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        item.url === "/admin"
                          ? pathname === "/admin"
                          : pathname.startsWith(item.url)
                      }
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
