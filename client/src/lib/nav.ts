import { Calendar, CheckSquare, Package, Shield, FileText, MessageSquare, Home, Clock, AlertTriangle } from "lucide-react";
import { type NavShortcutId } from "@shared/schema";
import { type UserRole } from "@shared/roles";

// Navigation option configuration
export const NAV_OPTIONS = {
  today: { id: "today" as const, label: "Today", icon: Clock, path: "/" },
  log: { id: "log" as const, label: "Log", icon: FileText, path: "/log" },
  colab: { id: "colab" as const, label: "Colab", icon: MessageSquare, path: "/colab" },
  tasks: { id: "tasks" as const, label: "Tasks", icon: CheckSquare, path: "/tasks" },
  materials: { id: "materials" as const, label: "Materials", icon: Package, path: "/materials" },
  vacancies: { id: "vacancies" as const, label: "Vacancies", icon: Home, path: "/vacancies" },
  issues: { id: "issues" as const, label: "Report", icon: AlertTriangle, path: "/issues" },
  admin: { id: "admin" as const, label: "Admin", icon: Shield, path: "/admin" },
  calendar: { id: "calendar" as const, label: "Calendar", icon: Calendar, path: "/calendar" }
} as const;

// Role-based access rules
export const NAV_RULES: Record<NavShortcutId, { allowedRoles: UserRole[]; requiresAuth: boolean }> = {
  today: { allowedRoles: ["worker", "project_manager", "admin", "supervisor", "inspector", "client"], requiresAuth: true },
  log: { allowedRoles: ["worker"], requiresAuth: true },
  colab: { allowedRoles: ["worker", "project_manager", "admin", "supervisor", "inspector", "client"], requiresAuth: true },
  tasks: { allowedRoles: ["project_manager", "admin", "supervisor", "inspector", "client"], requiresAuth: true },
  materials: { allowedRoles: ["worker", "project_manager", "admin", "supervisor", "inspector"], requiresAuth: true },
  vacancies: { allowedRoles: ["project_manager", "admin"], requiresAuth: true },
  issues: { allowedRoles: ["worker", "project_manager", "admin", "supervisor", "inspector", "client"], requiresAuth: true },
  admin: { allowedRoles: ["admin"], requiresAuth: true },
  calendar: { allowedRoles: ["worker", "project_manager", "admin", "supervisor", "inspector", "client"], requiresAuth: true }
};

// Default navigation preferences by role
export const DEFAULT_NAV_PREFS: Record<UserRole, NavShortcutId[]> = {
  worker: ["log", "issues", "colab", "calendar"],
  project_manager: ["tasks", "materials", "issues", "colab"],
  admin: ["tasks", "materials", "issues", "admin"],
  supervisor: ["tasks", "materials", "issues", "calendar"],
  inspector: ["tasks", "materials", "issues", "calendar"],
  client: ["tasks", "calendar", "issues", "colab"]
};

// Helper function to get allowed shortcuts for a user role
export function getAllowedShortcuts(role: UserRole): NavShortcutId[] {
  return Object.keys(NAV_RULES).filter(shortcut => 
    NAV_RULES[shortcut as NavShortcutId].allowedRoles.includes(role) &&
    shortcut !== "colab" // Temporarily hide colab
  ) as NavShortcutId[];
}

// Helper function to filter and apply defaults to user preferences
export function getVisibleShortcuts(
  userPrefs: NavShortcutId[], 
  userRole: UserRole
): NavShortcutId[] {
  const allowedShortcuts = getAllowedShortcuts(userRole);
  const filteredPrefs = userPrefs.filter(shortcut => allowedShortcuts.includes(shortcut));
  
  // If user has fewer than 4 preferences, fill with role defaults
  if (filteredPrefs.length < 4) {
    const defaults = DEFAULT_NAV_PREFS[userRole];
    const needed = 4 - filteredPrefs.length;
    const missingDefaults = defaults
      .filter(defaultShortcut => !filteredPrefs.includes(defaultShortcut))
      .filter(defaultShortcut => allowedShortcuts.includes(defaultShortcut))
      .slice(0, needed);
    
    return [...filteredPrefs, ...missingDefaults];
  }
  
  return filteredPrefs.slice(0, 4); // Limit to 4 shortcuts
}