"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import MobileNav from "@/components/layout/MobileNav";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Map pathnames to Arabic page titles
const PAGE_TITLES: Record<string, string> = {
  "/": "الرئيسية",
  "/orders": "الطلبات",
  "/financials": "الماليات",
  "/suppliers": "الموردين",
  "/notifications": "الإشعارات",
  "/settings": "الإعدادات",
};

function getPageTitle(pathname: string): string {
  // Exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];

  // Check if path starts with a known route
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (path !== "/" && pathname.startsWith(path)) return title;
  }

  return "لوحة التحكم";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? undefined);
    });
  }, []);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — on the RIGHT side (RTL) */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Mobile navigation drawer */}
      <MobileNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Main content area */}
      <main className="flex-1 flex flex-col min-h-screen">
        <Topbar
          title={pageTitle}
          userEmail={userEmail}
          onMobileMenuToggle={() => setMobileNavOpen(true)}
        />

        <div className="flex-1 p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
