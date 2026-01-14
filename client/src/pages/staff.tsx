import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { type Task, type User } from "@shared/schema";
import { ArrowLeft, User as UserIcon, Clock, MapPin, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useLocation, Link } from "wouter";
import { getCategoryColor } from "@/lib/calendar-utils";
import { formatTime } from "@/lib/date-utils";
import { useState } from "react";
import TaskDetailModal from "@/components/tasks/task-detail-modal";

export default function Staff() {
  const [, setLocation] = useLocation();
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const isAdminOrPM = currentUser?.role === "admin" || currentUser?.role === "project_manager";

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !authLoading && isAdminOrPM,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: !authLoading,
  });

  // Redirect non-admin/PM users
  if (!authLoading && !isAdminOrPM) {
    setLocation("/");
    return null;
  }

  const workers = users.filter(u => u.isApproved && u.role === "worker");
  
  // Get today's date range
  const today = new Date();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  // Map workers to their current/today's tasks
  const workersWithTasks = workers.map(worker => {
    const displayName = `${worker.firstName || ''} ${worker.lastName || ''}`.trim() || worker.username;
    
    // Get tasks assigned to this worker for today
    const workerTasks = tasks.filter(task => {
      const taskStart = new Date(task.startDate);
      const taskEnd = task.endDate ? new Date(task.endDate) : taskStart;
      const isToday = taskStart < dayEnd && taskEnd >= dayStart;
      
      // Check if assigned to this worker
      const assignedTo = task.assignedTo?.toLowerCase() || "";
      const workerName = displayName.toLowerCase();
      const username = worker.username.toLowerCase();
      
      return isToday && (assignedTo.includes(workerName) || assignedTo.includes(username));
    });

    // Current task = in-progress, or first pending
    const currentTask = workerTasks.find(t => t.status === "in-progress") || 
                       workerTasks.find(t => t.status === "pending");
    
    const completedToday = workerTasks.filter(t => t.status === "completed").length;
    const pendingToday = workerTasks.filter(t => t.status === "pending" || t.status === "in-progress").length;

    return {
      ...worker,
      displayName,
      currentTask,
      todaysTasks: workerTasks,
      completedToday,
      pendingToday,
    };
  });

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const isLoading = usersLoading || tasksLoading;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Header />
      <MobileNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mb-20 md:mb-0">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="mb-3 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="w-full">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Active Staff</h1>
            <p className="text-sm text-gray-500">Workers and their current task assignments</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading staff...</p>
          </div>
        ) : workers.length === 0 ? (
          <Card className="bg-white shadow-sm">
            <CardContent className="py-12 text-center">
              <UserIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No Active Workers</h3>
              <p className="text-gray-500">There are no approved workers in the system.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workersWithTasks.map((worker) => (
              <Card key={worker.id} className="bg-white dark:bg-slate-800 shadow-sm border-gray-100 dark:border-slate-700">
                <CardContent className="p-4">
                  {/* Worker Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">{worker.displayName}</h3>
                      <p className="text-xs text-gray-500">@{worker.username}</p>
                    </div>
                    {worker.currentTask ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-medium">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400 rounded-full text-xs font-medium">
                        Idle
                      </span>
                    )}
                  </div>

                  {/* Current Task */}
                  {worker.currentTask ? (
                    <div 
                      className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-100 dark:border-slate-600 hover:border-blue-200 dark:hover:border-blue-500 transition-colors cursor-pointer"
                      onClick={() => handleTaskClick(worker.currentTask!)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${getCategoryColor(worker.currentTask.category).split(' ')[0]}`}></div>
                        <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                          {worker.currentTask.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {worker.currentTask.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {worker.currentTask.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(worker.currentTask.startDate)}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          worker.currentTask.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {worker.currentTask.status.replace('-', ' ')}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border border-dashed border-gray-200 dark:border-slate-600 text-center">
                      <p className="text-sm text-gray-400">No current task assigned</p>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>{worker.completedToday} done today</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <AlertCircle className="w-3 h-3 text-yellow-500" />
                      <span>{worker.pendingToday} pending</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <TaskDetailModal 
        task={selectedTask}
        isOpen={isTaskModalOpen} 
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
      />
    </div>
  );
}
