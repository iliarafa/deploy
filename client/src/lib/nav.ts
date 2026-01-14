import { Calendar, CheckSquare, Package, Shield, FileText, MessageSquare, Home, Clock, AlertTriangle, Settings } from "lucide-react";
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
  calendar: { id: "calendar" as const, label: "Calendar", icon: Calendar, path: "/calendar" },
  settings: { id: "settings" as const, label: "Settings", icon: Settings, path: "/settings" }
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
  calendar: { allowedRoles: ["worker", "project_manager", "admin", "supervisor", "inspector", "client"], requiresAuth: true },
  settings: { allowedRoles: ["worker", "project_manager", "admin", "supervisor", "inspector", "client"], requiresAuth: true }
};

// Default navigation preferences by role
export const DEFAULT_NAV_PREFS: Record<UserRole, NavShortcutId[]> = {
  worker: ["log", "issues", "colab", "calendar"],
  project_manager: ["tasks", "materials", "vacancies", "issues"],
  admin: ["tasks", "vacancies", "issues", "admin"],
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

// Helper function to filter user preferences to only allowed shortcuts
// If user has no preferences set, return role defaults; otherwise respect their choice
export function getVisibleShortcuts(
  userPrefs: NavShortcutId[], 
  userRole: UserRole,
  useDefaultsIfEmpty: boolean = true
): NavShortcutId[] {
  const allowedShortcuts = getAllowedShortcuts(userRole);
  const filteredPrefs = userPrefs.filter(shortcut => allowedShortcuts.includes(shortcut));
  
  // Only use defaults if user has never set preferences (empty array from fresh account)
  // Once user actively selects shortcuts, always respect their choice even if fewer than 4
  if (filteredPrefs.length === 0 && useDefaultsIfEmpty) {
    const defaults = DEFAULT_NAV_PREFS[userRole];
    return defaults.filter(shortcut => allowedShortcuts.includes(shortcut)).slice(0, 4);
  }
  
  return filteredPrefs.slice(0, 4); // Limit to 4 shortcuts, respect user's choice
}