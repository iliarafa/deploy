import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { type Task } from "@shared/schema";
import { ChevronRight, Clock, MapPin, User } from "lucide-react";
import { getCategoryColor } from "@/lib/calendar-utils";
import { formatTime } from "@/lib/date-utils";
import { useAuth } from "@/contexts/auth-context";

export default function TaskList() {
  const { isLoading: authLoading } = useAuth();

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: !authLoading, // Wait for authentication verification before fetching
  });

  const today = new Date();
  const todaysTasks = tasks.filter(task => {
    const taskDate = new Date(task.startDate);
    return taskDate.toDateString() === today.toDateString();
  });

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Today's Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">
            <div className="text-gray-500">Loading tasks...</div>
          </div>
        ) : todaysTasks.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500">No tasks scheduled for today</div>
          </div>
        ) : (
          <div className="space-y-3">
            {todaysTasks.map((task, index) => {
              const statusClasses = task.status === 'completed' ? 'task-completed-pulse' :
                                  task.priority === 'urgent' ? 'task-urgent-shake' : '';
              const glowClass = task.status === 'pending' ? 'status-glow-pending' :
                              task.status === 'in-progress' ? 'status-glow-progress' :
                              task.status === 'completed' ? 'status-glow-completed' : '';
              
              return (
                <div 
                  key={task.id} 
                  className={`task-element task-animate-enter task-animate-hover ${statusClasses} ${glowClass} flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-all duration-300 ease-in-out transform-gpu cursor-pointer`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                  data-testid={`task-list-${task.id}`}
                >
                  <div className={`w-3 h-3 rounded-full mr-3 transition-all duration-300 ${getCategoryColor(task.category).replace('text-white', '').replace('bg-', 'bg-').split(' ')[0]}`}></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">{task.title}</h4>
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{formatTime(task.startDate)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                    {task.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{task.location}</span>
                      </div>
                    )}
                    {task.assignedTo && (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{task.assignedTo}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="ml-2">
                  <ChevronRight className="w-4 h-4" />
                </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
