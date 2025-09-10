import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { type Task } from "@shared/schema";
import { Calendar, MapPin, User, Clock } from "lucide-react";
import { formatDate } from "@/lib/date-utils";
import { getCategoryColor } from "@/lib/calendar-utils";
import { useAuth } from "@/contexts/auth-context";
import TaskDetailModal from "@/components/tasks/task-detail-modal";
import { useState } from "react";

export default function Log() {
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/worker-tasks", user?.username],
    enabled: !!user?.username,
  });

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in-progress": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "standard": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Filter active tasks (not completed)
  const activeTasks = tasks.filter(task => task.status !== "completed");

  return (
    <div className="min-h-screen bg-neutral">
      <Header />
      <MobileNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-20 md:mb-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">My Task Log</h1>
          <Badge variant="outline" className="text-sm">
            {activeTasks.length} Active Task{activeTasks.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading your tasks...</div>
          </div>
        ) : activeTasks.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Tasks</h3>
                <p className="text-gray-500">You don't have any active tasks assigned to you right now.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeTasks.map((task) => (
              <Card 
                key={task.id} 
                className="hover:shadow-md transition-shadow cursor-pointer" 
                data-testid={`log-task-${task.id}`}
                onClick={() => handleTaskClick(task)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{task.title}</CardTitle>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(task.startDate)}</span>
                        </div>
                        {task.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{task.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>Assigned to me</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <Badge className={getStatusColor(task.status)}>
                        {task.status.replace('-', ' ')}
                      </Badge>
                      <Badge variant="outline" className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                {task.description && (
                  <CardContent className="pt-0">
                    <p className="text-gray-700">{task.description}</p>
                  </CardContent>
                )}
                
                <CardContent className="pt-0 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getCategoryColor(task.category).replace('text-white', '').split(' ')[0]}`}></div>
                      <span className="text-sm font-medium text-gray-700">{task.category}</span>
                    </div>
                    {task.endDate && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>Due: {formatDate(task.endDate)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <TaskDetailModal 
        task={selectedTask}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </div>
  );
}