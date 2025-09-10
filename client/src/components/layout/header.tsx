import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Hammer, Plus, Bell, User, LogOut, Settings, Shield } from "lucide-react";
import TaskModal from "@/components/tasks/task-modal";
import { LoginModal } from "@/components/auth/login-modal";
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
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Hammer className="text-primary text-xl" />
                <h1 className="text-xl font-bold text-gray-900">BuildSync</h1>
              </div>
            </div>
            
            {/* Role-based Navigation */}
            <nav className="hidden md:flex space-x-8">
              <Link href="/">
                <span className={`font-medium pb-2 cursor-pointer ${
                  isActive("/") 
                    ? "text-primary border-b-2 border-primary" 
                    : "text-gray-500 hover:text-gray-700"
                }`}>
                  Calendar
                </span>
              </Link>
              
              {/* Log tab for workers only */}
              {user && user.role === 'worker' && (
                <Link href="/log">
                  <span className={`font-medium pb-2 cursor-pointer ${
                    isActive("/log") 
                      ? "text-primary border-b-2 border-primary" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}>
                    Log
                  </span>
                </Link>
              )}
              
              {hasFullNavAccess && hasPermission('view_all_tasks') && (
                <Link href="/tasks">
                  <span className={`font-medium pb-2 cursor-pointer ${
                    isActive("/tasks") 
                      ? "text-primary border-b-2 border-primary" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}>
                    Tasks
                  </span>
                </Link>
              )}
              
              {hasFullNavAccess && hasPermission('view_all_materials') && (
                <Link href="/materials">
                  <span className={`font-medium pb-2 cursor-pointer ${
                    isActive("/materials") 
                      ? "text-primary border-b-2 border-primary" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}>
                    Materials
                  </span>
                </Link>
              )}
              
              {hasFullNavAccess && hasPermission('view_reports') && (
                <Link href="/reports">
                  <span className={`font-medium pb-2 cursor-pointer ${
                    isActive("/reports") 
                      ? "text-primary border-b-2 border-primary" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}>
                    Reports
                  </span>
                </Link>
              )}
              
              {hasFullNavAccess && (
                <Link href="/admin">
                  <span className={`font-medium pb-2 cursor-pointer flex items-center gap-1 ${
                    isActive("/admin") 
                      ? "text-primary border-b-2 border-primary" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}>
                    <Shield className="w-4 h-4" />
                    Admin Panel
                  </span>
                </Link>
              )}
            </nav>

            <div className="flex items-center space-x-4">
              {/* Role-based Action Buttons */}
              {user && (
                <Button 
                  className="bg-primary text-white hover:bg-blue-700"
                  onClick={() => setIsTaskModalOpen(true)}
                  data-testid="button-new-task"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Task
                </Button>
              )}
              
              {user && (
                <Button variant="ghost" size="sm" data-testid="button-notifications">
                  <Bell className="w-5 h-5 text-gray-500" />
                </Button>
              )}
              
              {/* User Menu or Login Button */}
              {isAuthenticated && user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center space-x-2" data-testid="button-user-menu">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="hidden md:flex flex-col items-start">
                        <span className="text-sm font-medium text-gray-900">{user.username}</span>
                        <Badge variant="outline" className="text-xs">
                          {user.role.replace('_', ' ')}
                        </Badge>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem data-testid="menu-profile">
                      <User className="w-4 h-4 mr-2" />
                      Profile
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
