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

export default function Header() {
  const [location] = useLocation();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { user, isAuthenticated, logout, hasPermission } = useAuth();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location?.startsWith(path)) return true;
    return false;
  };

  // Check if user has full navigation access (admin and managers only)
  const hasFullNavAccess = user && (user.role === 'admin' || user.role === 'project_manager');

  return (
    <>
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Hammer className="text-primary text-xl" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Deploy</h1>
              </div>
            </div>
            
            {/* Role-based Navigation */}
            <nav className="hidden md:flex space-x-4">
              <Link href="/">
                <span className={`text-sm pb-2 cursor-pointer ${
                  isActive("/") 
                    ? "text-primary border-b-2 border-primary" 
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                }`}>
                  Today
                </span>
              </Link>
              
              <Link href="/calendar">
                <span className={`text-sm pb-2 cursor-pointer ${
                  isActive("/calendar") 
                    ? "text-primary border-b-2 border-primary" 
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                }`}>
                  Calendar
                </span>
              </Link>
              
              {/* Log tab for workers only */}
              {user && user.role === 'worker' && (
                <Link href="/log">
                  <span className={`text-sm pb-2 cursor-pointer ${
                    isActive("/log") 
                      ? "text-primary border-b-2 border-primary" 
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                  }`}>
                    Log
                  </span>
                </Link>
              )}
              
              {/* Temporarily hidden - Colab tab for workers and managers */}
              {false && user && (user.role === 'worker' || user.role === 'project_manager' || user.role === 'admin') && (
                <Link href="/colab">
                  <span 
                    className={`text-sm pb-2 cursor-pointer ${
                      isActive("/colab") 
                        ? "text-primary border-b-2 border-primary" 
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                    }`}
                    data-testid="nav-colab"
                  >
                    Colab
                  </span>
                </Link>
              )}
              
              {hasFullNavAccess && hasPermission('view_all_tasks') && (
                <Link href="/tasks">
                  <span className={`text-sm pb-2 cursor-pointer ${
                    isActive("/tasks") 
                      ? "text-primary border-b-2 border-primary" 
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                  }`}>
                    Tasks
                  </span>
                </Link>
              )}
              
              {hasFullNavAccess && hasPermission('view_all_materials') && (
                <Link href="/materials">
                  <span className={`text-sm pb-2 cursor-pointer ${
                    isActive("/materials") 
                      ? "text-primary border-b-2 border-primary" 
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                  }`}>
                    Mats
                  </span>
                </Link>
              )}
              
              {hasFullNavAccess && hasPermission('view_reports') && (
                <Link href="/reports">
                  <span className={`text-sm pb-2 cursor-pointer ${
                    isActive("/reports") 
                      ? "text-primary border-b-2 border-primary" 
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                  }`}>
                    Reports
                  </span>
                </Link>
              )}
              
              {hasFullNavAccess && (
                <Link href="/admin">
                  <span className={`text-sm pb-2 cursor-pointer ${
                    isActive("/admin") 
                      ? "text-primary border-b-2 border-primary" 
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                  }`}>
                    Admin
                  </span>
                </Link>
              )}
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
                    <DropdownMenuItem data-testid="menu-settings">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
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
