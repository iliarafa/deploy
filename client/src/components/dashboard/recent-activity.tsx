import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { type Task, type MaterialRequest } from "@shared/schema";
import { formatDistanceToNow } from "@/lib/date-utils";
import { useAuth } from "@/contexts/auth-context";

export default function RecentActivity() {
  const { isLoading: authLoading } = useAuth();

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: !authLoading, // Wait for authentication verification before fetching
  });

  const { data: materialRequests = [] } = useQuery<MaterialRequest[]>({
    queryKey: ["/api/material-requests"],
    enabled: !authLoading, // Wait for authentication verification before fetching
  });

  // Combine and sort activities by creation date
  const activities = [
    ...tasks.map(task => ({
      id: `task-${task.id}`,
      type: "task",
      title: task.title,
      category: task.category,
      status: task.status,
      createdAt: task.createdAt || new Date(),
    })),
    ...materialRequests.map(request => ({
      id: `material-${request.id}`,
      type: "material",
      title: request.description,
      category: request.materialType,
      status: request.status,
      createdAt: request.createdAt || new Date(),
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const getActivityColor = (status: string) => {
    switch (status) {
      case "completed":
      case "delivered":
        return "bg-green-500";
      case "in-progress":
      case "in-transit":
        return "bg-blue-500";
      case "pending":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getActivityText = (activity: any) => {
    if (activity.type === "task") {
      switch (activity.status) {
        case "completed":
          return `Task "${activity.title}" completed`;
        case "in-progress":
          return `Task "${activity.title}" started`;
        default:
          return `Task "${activity.title}" created`;
      }
    } else {
      switch (activity.status) {
        case "delivered":
          return `Material "${activity.title}" delivered`;
        case "in-transit":
          return `Material "${activity.title}" shipped`;
        default:
          return `Material "${activity.title}" requested`;
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No recent activity
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${getActivityColor(activity.status)}`}></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 line-clamp-2">
                    {getActivityText(activity)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(activity.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
