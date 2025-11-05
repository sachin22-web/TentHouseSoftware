import { useEffect, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Home,
  Users,
  Package,
  FileText,
  Warehouse,
  Calendar,
  UserCheck,
  CreditCard,
  DollarSign,
  BarChart3,
  Menu,
  LogOut,
  Tent,
  Receipt,
  ClipboardList,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { eventAPI } from "@/lib/api";

const sidebarItems = [
  {
    title: "Dashboard",
    icon: Home,
    href: "/dashboard",
  },
  {
    title: "Clients",
    icon: Users,
    href: "/clients",
  },
  {
    title: "Products",
    icon: Package,
    href: "/products",
  },
  {
    title: "Bills",
    icon: Receipt,
    href: "/invoices",
    badge: "Quick",
  },
  {
    title: "Stock",
    icon: Warehouse,
    href: "/stock",
  },
  {
    title: "B2B",
    icon: Boxes,
    href: "/b2b",
  },
  {
    title: "Issue Tracker",
    icon: ClipboardList,
    href: "/issue-tracker",
  },
  {
    title: "Events",
    icon: Calendar,
    href: "/events",
  },
  {
    title: "Workers",
    icon: UserCheck,
    href: "/workers",
  },
  {
    title: "Attendance",
    icon: CreditCard,
    href: "/attendance",
  },
  {
    title: "Payroll",
    icon: DollarSign,
    href: "/payroll",
  },
  {
    title: "Reports",
    icon: BarChart3,
    href: "/reports",
  },
];

function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const location = useLocation();
  const path = location.pathname;
  const match =
    path.match(/admin\/events\/(.+?)\//) || path.match(/event-details\/(.+?)$/);
  const currentEventId = match?.[1];
  const [hasAgreement, setHasAgreement] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        if (!currentEventId) {
          setHasAgreement(false);
          return;
        }
        const res = await eventAPI.getById(currentEventId);
        if (!active) return;
        setHasAgreement(Boolean(res.data?.agreementSnapshot?.items?.length));
      } catch (e) {
        setHasAgreement(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [currentEventId]);

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b px-6 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600">
          <Tent className="h-4 w-4 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Mannat Tent House</span>
          <span className="text-xs text-muted-foreground">Admin Portal</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onLinkClick}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                    : "text-gray-700 hover:bg-gray-100",
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
                {item.badge && (
                  <span
                    className={cn(
                      "ml-auto rounded-full px-2 py-0.5 text-xs font-medium",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-blue-100 text-blue-700",
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="mt-4 space-y-1">
            <Link
              to={
                currentEventId
                  ? `/admin/events/${currentEventId}/agreement`
                  : `#`
              }
              onClick={(e) => {
                if (!currentEventId) {
                  e.preventDefault();
                  toast.info("Open an event to access Terms & Conditions");
                } else if (onLinkClick) onLinkClick();
              }}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                path.includes("/admin/events/") && path.endsWith("/agreement")
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                  : !currentEventId
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-gray-700 hover:bg-gray-100",
              )}
            >
              <FileText className="h-4 w-4" />
              <span>Terms & Conditions</span>
            </Link>
            {currentEventId && hasAgreement && (
              <Link
                to={`/admin/events/${currentEventId}/agreement/preview`}
                onClick={onLinkClick}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-gray-700 hover:bg-gray-100",
                  path.includes("/admin/events/") &&
                    path.endsWith("/agreement/preview")
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                    : undefined,
                )}
              >
                <FileText className="h-4 w-4" />
                <span>Agreement Preview</span>
              </Link>
            )}
            <Link
              to={
                currentEventId
                  ? `/admin/events/${currentEventId}/dispatch`
                  : `#`
              }
              onClick={(e) => {
                if (!currentEventId) {
                  e.preventDefault();
                  toast.info("Open an event to access Stock Out");
                } else if (onLinkClick) onLinkClick();
              }}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                !currentEventId
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-100",
              )}
            >
              <Warehouse className="h-4 w-4" />
              <span>Stock Out</span>
            </Link>
            <Link
              to={
                currentEventId ? `/admin/events/${currentEventId}/return` : `#`
              }
              onClick={(e) => {
                if (!currentEventId) {
                  e.preventDefault();
                  toast.info("Open an event to access Stock In");
                } else if (onLinkClick) onLinkClick();
              }}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                !currentEventId
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-100",
              )}
            >
              <Warehouse className="h-4 w-4" />
              <span>Stock In</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar for desktop */}
      <div className="hidden w-64 border-r bg-white lg:block">
        <SidebarContent />
      </div>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent onLinkClick={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
              </Sheet>

              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {sidebarItems.find((item) => item.href === location.pathname)
                    ?.title || "Dashboard"}
                </h1>
                <p className="text-sm text-gray-500">
                  Manage your tent house business
                </p>
              </div>
            </div>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                      {admin?.name?.charAt(0)?.toUpperCase() || "A"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {admin?.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {admin?.phone}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
