import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Hammer, Plus, Bell, User, LogOut, Settings, Shield } from "lucide-react";
import TaskModal from "@/components/tasks/task-modal";
import { LoginModal } from "@/components/auth/login-modal";
import ThemeToggle from "@/components/theme-toggle";
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NAV_OPTIONS, getVisibleShortcuts } from "@/lib/nav";
import { type NavShortcutId } from "@shared/schema";
import { type UserRole } from "@shared/roles";

interface NavPrefsResponse {
  navShortcuts: NavShortcutId[];
}

export default function Header() {
  const [location] = useLocation();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { user, isAuthenticated, logout, hasPermission, isLoading: authLoading } = useAuth();

  // Fetch user navigation preferences
  const { data: navPrefs } = useQuery<NavPrefsResponse>({
    queryKey: ["/api/me/nav-preferences"],
    enabled: !authLoading && !!user,
  });

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location?.startsWith(path)) return true;
    return false;
  };

  // Get user's navigation shortcuts with defaults
  const userShortcuts = Array.isArray(navPrefs?.navShortcuts) ? navPrefs.navShortcuts : [];
  const visibleShortcuts = user ? getVisibleShortcuts(userShortcuts, user.role as UserRole) : [];
  
  // Always start with "Today", then add user's visible shortcuts
  const navigationItems: NavShortcutId[] = ["today", ...visibleShortcuts];

  return (
    <>
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => window.history.back()}
                className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
                aria-label="Go back"
              >
                <Hammer className="text-primary text-xl" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Deploy</h1>
              </button>
            </div>
            
            {/* User's Navigation Shortcuts */}
            <nav className="hidden md:flex space-x-4">
              {navigationItems.map((shortcutId) => {
                const option = NAV_OPTIONS[shortcutId];
                if (!option) return null;

                return (
                  <Link key={shortcutId} href={option.path}>
                    <span className={`text-sm pb-2 cursor-pointer ${
                      isActive(option.path) 
                        ? "text-primary border-b-2 border-primary" 
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                    }`}>
                      {option.label}
                    </span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center space-x-2">
              {/* Role-based Action Buttons */}
              {user && (
                <Button 
                  size="sm"
                  className="bg-primary text-white hover:bg-blue-700"
                  onClick={() => setIsTaskModalOpen(true)}
                  data-testid="button-new-task"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  <span className="hidden sm:inline">New Task</span>
                  <span className="sm:hidden">Task</span>
                </Button>
              )}
              
              {user && (
                <Button variant="ghost" size="sm" data-testid="button-notifications">
                  <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </Button>
              )}
              
              {/* Theme Toggle */}
              <ThemeToggle />
              
              {/* User Menu or Login Button */}
              {isAuthenticated && user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center space-x-2" data-testid="button-user-menu">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="hidden md:flex flex-col items-start">
                        <span className="text-xs font-medium text-gray-900 dark:text-white">{user.username}</span>
                        <Badge variant="outline" className="text-xs px-1">
                          {user.role.replace('_', ' ')}
                        </Badge>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem data-testid="menu-profile" asChild>
                      <Link href="/profile">
                        <User className="w-4 h-4 mr-2" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem data-testid="menu-settings" asChild>
                      <Link href="/profile">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} data-testid="menu-logout">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  onClick={() => setIsLoginModalOpen(true)}
                  data-testid="button-login"
                >
                  Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <TaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
      />
      
      <LoginModal 
        open={isLoginModalOpen}
        onOpenChange={setIsLoginModalOpen}
      />
    </>
  );
}
