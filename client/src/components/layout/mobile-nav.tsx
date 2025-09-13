import { Link, useLocation } from "wouter";
import { Calendar, CheckSquare, Package, BarChart3, Shield, FileText, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function MobileNav() {
  const [location] = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location?.startsWith(path)) return true;
    return false;
  };

  // Check if user has full navigation access (admin and managers only)
  const hasFullNavAccess = user && (user.role === 'admin' || user.role === 'project_manager');

  return (
    <nav className="md:hidden bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-50">
      <div className="flex justify-around py-2">
        <Link href="/">
          <a className={`flex flex-col items-center py-2 px-4 ${
            isActive("/") ? "text-primary" : "text-gray-500"
          }`}>
            <Calendar className="w-5 h-5" />
            <span className="text-xs mt-1">Calendar</span>
          </a>
        </Link>
        {/* Log tab for workers only */}
        {user && user.role === 'worker' && (
          <Link href="/log">
            <a className={`flex flex-col items-center py-2 px-4 ${
              isActive("/log") ? "text-primary" : "text-gray-500"
            }`}>
              <FileText className="w-5 h-5" />
              <span className="text-xs mt-1">Log</span>
            </a>
          </Link>
        )}
        {/* Colab tab for workers and managers */}
        {user && (user.role === 'worker' || user.role === 'project_manager' || user.role === 'admin') && (
          <Link href="/colab">
            <a 
              className={`flex flex-col items-center py-2 px-4 ${
                isActive("/colab") ? "text-primary" : "text-gray-500"
              }`}
              data-testid="nav-colab"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-xs mt-1">Colab</span>
            </a>
          </Link>
        )}
        {hasFullNavAccess && (
          <Link href="/tasks">
            <a className={`flex flex-col items-center py-2 px-4 ${
              isActive("/tasks") ? "text-primary" : "text-gray-500"
            }`}>
              <CheckSquare className="w-5 h-5" />
              <span className="text-xs mt-1">Tasks</span>
            </a>
          </Link>
        )}
        {hasFullNavAccess && (
          <Link href="/materials">
            <a className={`flex flex-col items-center py-2 px-4 ${
              isActive("/materials") ? "text-primary" : "text-gray-500"
            }`}>
              <Package className="w-5 h-5" />
              <span className="text-xs mt-1">Materials</span>
            </a>
          </Link>
        )}
        {hasFullNavAccess && (
          <Link href="/reports">
            <a className={`flex flex-col items-center py-2 px-4 ${
              isActive("/reports") ? "text-primary" : "text-gray-500"
            }`}>
              <BarChart3 className="w-5 h-5" />
              <span className="text-xs mt-1">Reports</span>
            </a>
          </Link>
        )}
        {hasFullNavAccess && (
          <Link href="/admin">
            <a className={`flex flex-col items-center py-2 px-4 ${
              isActive("/admin") ? "text-primary" : "text-gray-500"
            }`}>
              <Shield className="w-5 h-5" />
              <span className="text-xs mt-1">Admin</span>
            </a>
          </Link>
        )}
      </div>
    </nav>
  );
}
