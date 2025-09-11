import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { type Task } from "@shared/schema";
import { useAuth } from "@/contexts/auth-context";

export default function TaskCategories() {
  const { isLoading: authLoading } = useAuth();

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: !authLoading, // Wait for authentication verification before fetching
  });

  const categoryStats = tasks.reduce((acc, task) => {
    acc[task.category] = (acc[task.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "inspection": return "bg-green-500";
      case "meeting": return "bg-blue-500";
      case "delivery": return "bg-orange-500";
      case "maintenance": return "bg-yellow-500";
      case "repair": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Categories</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(categoryStats).map(([category, count]) => (
            <div 
              key={category} 
              className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
            >
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${getCategoryColor(category)}`}></div>
                <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{category}</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
            </div>
          ))}
          {Object.keys(categoryStats).length === 0 && (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              No tasks available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
