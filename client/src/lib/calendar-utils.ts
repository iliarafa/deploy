export function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function getFirstDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
}

export function getCategoryColor(category: string): string {
  const baseClasses = "transition-all duration-300 ease-in-out";
  switch (category) {
    case "inspection":
      return `bg-green-500 hover:bg-green-600 text-white shadow-green-200 hover:shadow-green-300 ${baseClasses}`;
    case "meeting":
      return `bg-blue-500 hover:bg-blue-600 text-white shadow-blue-200 hover:shadow-blue-300 ${baseClasses}`;
    case "delivery":
      return `bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200 hover:shadow-orange-300 ${baseClasses}`;
    case "maintenance":
      return `bg-yellow-500 hover:bg-yellow-600 text-white shadow-yellow-200 hover:shadow-yellow-300 ${baseClasses}`;
    case "repair":
    case "urgent":
      return `bg-red-500 hover:bg-red-600 text-white shadow-red-200 hover:shadow-red-300 ${baseClasses}`;
    default:
      return `bg-gray-500 hover:bg-gray-600 text-white shadow-gray-200 hover:shadow-gray-300 ${baseClasses}`;
  }
}

export function getCategoryColorPastel(category: string): string {
  const baseClasses = "transition-all duration-200 ease-in-out border";
  switch (category) {
    case "inspection":
      return `bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 ${baseClasses}`;
    case "meeting":
      return `bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 ${baseClasses}`;
    case "delivery":
      return `bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 ${baseClasses}`;
    case "maintenance":
      return `bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 ${baseClasses}`;
    case "repair":
      return `bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900/50 ${baseClasses}`;
    default:
      return `bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 ${baseClasses}`;
  }
}

export function getPriorityBadge(priority: string): { bg: string; text: string } {
  switch (priority) {
    case "urgent":
      return { bg: "bg-red-500", text: "text-white" };
    case "high":
      return { bg: "bg-orange-100 dark:bg-orange-900/50", text: "text-orange-700 dark:text-orange-300" };
    case "standard":
      return { bg: "bg-blue-100 dark:bg-blue-900/50", text: "text-blue-700 dark:text-blue-300" };
    case "low":
      return { bg: "bg-slate-100 dark:bg-slate-700", text: "text-slate-600 dark:text-slate-300" };
    default:
      return { bg: "bg-slate-100 dark:bg-slate-700", text: "text-slate-600 dark:text-slate-300" };
  }
}

export function getPriorityColor(priority: string): string {
  const baseClasses = "transition-all duration-300 ease-in-out";
  switch (priority) {
    case "urgent":
      return `bg-red-500 hover:bg-red-600 text-white shadow-red-200 hover:shadow-red-300 animate-pulse hover:animate-none ${baseClasses}`;
    case "high":
      return `bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200 hover:shadow-orange-300 ${baseClasses}`;
    case "standard":
      return `bg-blue-500 hover:bg-blue-600 text-white shadow-blue-200 hover:shadow-blue-300 ${baseClasses}`;
    default:
      return `bg-gray-500 hover:bg-gray-600 text-white shadow-gray-200 hover:shadow-gray-300 ${baseClasses}`;
  }
}

export function getStatusColor(status: string): string {
  const baseClasses = "transition-all duration-500 ease-in-out";
  switch (status) {
    case "completed":
      return `bg-green-500 hover:bg-green-600 text-white shadow-green-200 hover:shadow-green-300 hover:scale-105 ${baseClasses}`;
    case "in-progress":
      return `bg-blue-500 hover:bg-blue-600 text-white shadow-blue-200 hover:shadow-blue-300 animate-pulse hover:animate-none hover:scale-105 ${baseClasses}`;
    case "pending":
      return `bg-yellow-500 hover:bg-yellow-600 text-white shadow-yellow-200 hover:shadow-yellow-300 hover:scale-105 ${baseClasses}`;
    default:
      return `bg-gray-500 hover:bg-gray-600 text-white shadow-gray-200 hover:shadow-gray-300 hover:scale-105 ${baseClasses}`;
  }
}
