"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface TopbarProps {
  title: string;
  userEmail?: string;
  onMobileMenuToggle: () => void;
}

export default function Topbar({
  title,
  userEmail,
  onMobileMenuToggle,
}: TopbarProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("حدث خطأ أثناء تسجيل الخروج");
      return;
    }
    router.push("/login");
    router.refresh();
  }

  // Extract initials from email
  const initials = userEmail
    ? userEmail.substring(0, 2).toUpperCase()
    : "AD";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMobileMenuToggle}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="4" x2="20" y1="12" y2="12" />
          <line x1="4" x2="20" y1="6" y2="6" />
          <line x1="4" x2="20" y1="18" y2="18" />
        </svg>
      </Button>

      {/* Page title */}
      <h2 className="text-lg font-semibold">{title}</h2>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notifications */}
      <Button variant="ghost" size="icon" className="relative" asChild>
        <Link href="/notifications" aria-label="الإشعارات">
          <Bell className="h-5 w-5" />
          {/* Notification dot */}
          <span className="absolute top-2 left-2 h-2 w-2 rounded-full bg-destructive" />
        </Link>
      </Button>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 px-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm font-medium">
              {userEmail || "المدير"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">
            {userEmail}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive">
            تسجيل الخروج
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
