import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { type Task, type User } from "@shared/schema";
import { ChevronRight, Clock, MapPin, User as UserIcon, Calendar as CalendarIcon, ArrowRight } from "lucide-react";
import { getCategoryColor } from "@/lib/calendar-utils";
import { formatTime } from "@/lib/date-utils";
import { useAuth } from "@/contexts/auth-context";
import QuickActions from "@/components/dashboard/quick-actions";
import PasswordChangeReminder from "@/components/notifications/password-change-reminder";
import { useState } from "react";
import TaskDetailModal from "@/components/tasks/task-detail-modal";
import { Link } from "wouter";

export default function Today() {
  const { isLoading: authLoading } = useAuth();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>();

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: !authLoading,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !authLoading,
  });

  // Create lookup map from user ID to display name
  const userLookup = users.reduce((acc, user) => {
    const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
    acc[user.id] = displayName;
    return acc;
  }, {} as Record<number, string>);

  const today = new Date();
  
  // Get start and end of today in local timezone for robust date filtering
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  
  const todaysTasks = tasks.filter(task => {
    const taskStart = new Date(task.startDate);
    const taskEnd = task.endDate ? new Date(task.endDate) : taskStart;
    
    // Check if task overlaps with today (handles multi-day tasks)
    return taskStart < dayEnd && taskEnd >= dayStart;
  });

  // Get upcoming tasks (next 3 days), sorted by start time
  const upcomingTasks = tasks
    .filter(task => {
      const taskStart = new Date(task.startDate);
      return taskStart >= dayEnd && taskStart < new Date(dayEnd.getTime() + (3 * 24 * 60 * 60 * 1000));
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 3);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedTask(undefined);
  };

  return (
    <div className="min-h-screen bg-neutral dark:bg-slate-900">
      <Header />
      <MobileNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-20 md:mb-0">
        <PasswordChangeReminder />
        
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2" data-testid="text-greeting">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}!
          </h1>
          <p className="text-gray-600 dark:text-gray-300" data-testid="text-today-count">
            {todaysTasks.length === 0 
              ? "No tasks scheduled for today. Great work staying on top of things!" 
              : `You have ${todaysTasks.length} task${todaysTasks.length === 1 ? '' : 's'} scheduled for today.`
            }
          </p>
        </div>

        {/* Today's Tasks and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Today's Tasks */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Today's Tasks
                </CardTitle>
                <Link href="/calendar">
                  <Button variant="outline" size="sm" className="text-sm" data-testid="button-view-calendar">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    View Calendar
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <div className="text-gray-500">Loading tasks...</div>
                  </div>
                ) : todaysTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <div className="text-gray-500 text-lg mb-2">No tasks scheduled for today</div>
                    <p className="text-gray-400 text-sm">Take a break or plan ahead for tomorrow!</p>
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
                          className={`task-element task-animate-enter task-animate-hover ${statusClasses} ${glowClass} flex items-center p-4 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 transition-all duration-300 ease-in-out transform-gpu cursor-pointer`}
                          style={{ animationDelay: `${index * 0.05}s` }}
                          onClick={() => handleTaskClick(task)}
                          data-testid={`today-task-${task.id}`}
                        >
                          <div className={`w-4 h-4 rounded-full mr-4 transition-all duration-300 ${getCategoryColor(task.category).replace('text-white', '').replace('bg-', 'bg-').split(' ')[0]}`}></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900 dark:text-white text-lg">{task.title}</h4>
                              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                <Clock className="w-4 h-4 mr-1" />
                                <span>{formatTime(task.startDate)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                              {task.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  <span>{task.location}</span>
                                </div>
                              )}
                              {task.assignedTo && (
                                <div className="flex items-center gap-1">
                                  <UserIcon className="w-3 h-3" />
                                  <span>{task.assignedTo}</span>
                                </div>
                              )}
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(task.category)}`}>
                                {task.category}
                              </div>
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {task.status.replace('-', ' ')}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <QuickActions />
          </div>
        </div>

        {/* Upcoming Tasks Preview */}
        {upcomingTasks.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Upcoming Tasks</CardTitle>
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="text-sm" data-testid="button-view-all-tasks">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingTasks.map((task) => (
                  <div 
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getCategoryColor(task.category).replace('text-white', '').replace('bg-', 'bg-').split(' ')[0]}`}></div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{task.title}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(task.startDate).toLocaleDateString()} at {formatTime(task.startDate)}
                        </div>
                        {task.createdBy && userLookup[task.createdBy] && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                            <UserIcon className="w-3 h-3" />
                            Created by {userLookup[task.createdBy]}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(task.category)}`}>
                      {task.category}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Task Details Modal */}
      <TaskDetailModal 
        task={selectedTask || null}
        isOpen={isTaskModalOpen} 
        onClose={handleCloseTaskModal}
      />
    </div>
  );
}