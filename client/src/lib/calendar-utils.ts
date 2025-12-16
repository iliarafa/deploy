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

// Worker color palette for admin calendar view - pastel colors for task backgrounds
const WORKER_COLOR_PALETTE = [
  { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-700 dark:text-blue-300", border: "border-blue-300 dark:border-blue-700", solid: "bg-blue-500" },
  { bg: "bg-green-100 dark:bg-green-900/40", text: "text-green-700 dark:text-green-300", border: "border-green-300 dark:border-green-700", solid: "bg-green-500" },
  { bg: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-700 dark:text-purple-300", border: "border-purple-300 dark:border-purple-700", solid: "bg-purple-500" },
  { bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-700 dark:text-orange-300", border: "border-orange-300 dark:border-orange-700", solid: "bg-orange-500" },
  { bg: "bg-pink-100 dark:bg-pink-900/40", text: "text-pink-700 dark:text-pink-300", border: "border-pink-300 dark:border-pink-700", solid: "bg-pink-500" },
  { bg: "bg-cyan-100 dark:bg-cyan-900/40", text: "text-cyan-700 dark:text-cyan-300", border: "border-cyan-300 dark:border-cyan-700", solid: "bg-cyan-500" },
  { bg: "bg-indigo-100 dark:bg-indigo-900/40", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-300 dark:border-indigo-700", solid: "bg-indigo-500" },
  { bg: "bg-teal-100 dark:bg-teal-900/40", text: "text-teal-700 dark:text-teal-300", border: "border-teal-300 dark:border-teal-700", solid: "bg-teal-500" },
  { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-700 dark:text-red-300", border: "border-red-300 dark:border-red-700", solid: "bg-red-500" },
  { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-300", border: "border-amber-300 dark:border-amber-700", solid: "bg-amber-500" },
];

// Map to cache worker -> color index for consistency
const workerColorCache = new Map<string, number>();
let nextColorIndex = 0;

export function getWorkerColorIndex(workerName: string | null | undefined): number {
  if (!workerName) return -1;
  const normalizedName = workerName.toLowerCase().trim();
  
  if (workerColorCache.has(normalizedName)) {
    return workerColorCache.get(normalizedName)!;
  }
  
  const colorIndex = nextColorIndex % WORKER_COLOR_PALETTE.length;
  workerColorCache.set(normalizedName, colorIndex);
  nextColorIndex++;
  return colorIndex;
}

export function getWorkerColorPastel(workerName: string | null | undefined): string {
  const baseClasses = "transition-all duration-200 ease-in-out border";
  const colorIndex = getWorkerColorIndex(workerName);
  
  if (colorIndex === -1) {
    return `bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 ${baseClasses}`;
  }
  
  const colors = WORKER_COLOR_PALETTE[colorIndex];
  return `${colors.bg} ${colors.text} ${colors.border} hover:opacity-80 ${baseClasses}`;
}

export function getWorkerSolidColor(workerName: string | null | undefined): string {
  const colorIndex = getWorkerColorIndex(workerName);
  if (colorIndex === -1) return "bg-slate-500";
  return WORKER_COLOR_PALETTE[colorIndex].solid;
}

export function getAllWorkerColors(): { name: string; colorIndex: number; colors: typeof WORKER_COLOR_PALETTE[0] }[] {
  const result: { name: string; colorIndex: number; colors: typeof WORKER_COLOR_PALETTE[0] }[] = [];
  workerColorCache.forEach((colorIndex, name) => {
    result.push({ name, colorIndex, colors: WORKER_COLOR_PALETTE[colorIndex] });
  });
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export function initializeWorkerColors(workerNames: string[]): void {
  workerNames.forEach(name => getWorkerColorIndex(name));
}
