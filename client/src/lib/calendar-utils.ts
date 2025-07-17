export function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function getFirstDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
}

export function getCategoryColor(category: string): string {
  switch (category) {
    case "inspection":
      return "bg-green-500 text-white";
    case "meeting":
      return "bg-blue-500 text-white";
    case "delivery":
      return "bg-orange-500 text-white";
    case "maintenance":
      return "bg-yellow-500 text-white";
    case "repair":
    case "urgent":
      return "bg-red-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case "urgent":
      return "bg-red-500 text-white";
    case "high":
      return "bg-orange-500 text-white";
    case "standard":
      return "bg-blue-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-500 text-white";
    case "in-progress":
      return "bg-blue-500 text-white";
    case "pending":
      return "bg-yellow-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
}
