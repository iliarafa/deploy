import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";
import { NAV_OPTIONS, getVisibleShortcuts } from "@/lib/nav";
import { type UserRole } from "@shared/roles";
import { type NavShortcutId } from "@shared/schema";

export default function MobileNav() {
  const [location] = useLocation();
  const { user, isLoading: authLoading } = useAuth();

  // Fetch user navigation preferences
  const { data: navPrefs, isLoading: navPrefsLoading } = useQuery({
    queryKey: ["/api/me/nav-preferences"],
    enabled: !authLoading && !!user,
  });

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location?.startsWith(path)) return true;
    return false;
  };

  // Show loading state or return early if no user
  if (authLoading || navPrefsLoading || !user) {
    return (
      <nav className="md:hidden bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-50 w-full">
        <div className="flex justify-around py-2 bg-white">
          {/* Always show Today while loading */}
          <Link 
            href="/"
            className={`flex flex-col items-center py-2 px-4 ${
              isActive("/") ? "text-primary" : "text-gray-500"
            }`} 
            data-testid="nav-today"
          >
            <NAV_OPTIONS.today.icon className="w-5 h-5" />
            <span className="text-xs mt-1">{NAV_OPTIONS.today.label}</span>
          </Link>
          {/* Loading placeholders */}
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex flex-col items-center py-2 px-4 opacity-30">
              <div className="w-5 h-5 bg-gray-300 rounded animate-pulse" />
              <div className="w-8 h-2 bg-gray-300 rounded mt-1 animate-pulse" />
            </div>
          ))}
        </div>
      </nav>
    );
  }

  // Get user's navigation shortcuts with defaults - defensive coding
  const userShortcuts = Array.isArray(navPrefs?.navShortcuts) ? navPrefs.navShortcuts : [];
  const visibleShortcuts = getVisibleShortcuts(userShortcuts, user.role as UserRole);

  // Always start with "Today", then add user's visible shortcuts
  const navigationItems: NavShortcutId[] = ["today", ...visibleShortcuts];

  return (
    <nav className="md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 fixed bottom-0 left-0 right-0 z-50 w-full">
      <div className="flex justify-around py-2 bg-white dark:bg-gray-800">
        {navigationItems.map((shortcutId) => {
          const option = NAV_OPTIONS[shortcutId];
          if (!option) return null;

          const IconComponent = option.icon;
          const testId = shortcutId === "today" ? "nav-today" : 
                       shortcutId === "colab" ? "nav-colab" :
                       shortcutId === "vacancies" ? "nav-vacancies" :
                       `nav-${shortcutId}`;

          return (
            <Link 
              key={shortcutId} 
              href={option.path}
              className={`flex flex-col items-center py-2 px-4 ${
                isActive(option.path) ? "text-primary" : "text-gray-500 dark:text-gray-400"
              }`}
              data-testid={testId}
            >
              <IconComponent className="w-5 h-5" />
              <span className="text-xs mt-1">{option.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
