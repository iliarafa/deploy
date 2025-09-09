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
