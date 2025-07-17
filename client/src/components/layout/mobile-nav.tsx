import { Link, useLocation } from "wouter";
import { Calendar, CheckSquare, Package, BarChart3 } from "lucide-react";

export default function MobileNav() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location?.startsWith(path)) return true;
    return false;
  };

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
        <Link href="/tasks">
          <a className={`flex flex-col items-center py-2 px-4 ${
            isActive("/tasks") ? "text-primary" : "text-gray-500"
          }`}>
            <CheckSquare className="w-5 h-5" />
            <span className="text-xs mt-1">Tasks</span>
          </a>
        </Link>
        <Link href="/materials">
          <a className={`flex flex-col items-center py-2 px-4 ${
            isActive("/materials") ? "text-primary" : "text-gray-500"
          }`}>
            <Package className="w-5 h-5" />
            <span className="text-xs mt-1">Materials</span>
          </a>
        </Link>
        <Link href="/reports">
          <a className={`flex flex-col items-center py-2 px-4 ${
            isActive("/reports") ? "text-primary" : "text-gray-500"
          }`}>
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs mt-1">Reports</span>
          </a>
        </Link>
      </div>
    </nav>
  );
}
