import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { type Task, type User, type Issue, type Vacancy } from "@shared/schema";
import { ChevronRight, Clock, MapPin, User as UserIcon, Calendar as CalendarIcon, ArrowRight, FileCheck, Users, AlertTriangle, Home } from "lucide-react";
import { getCategoryColor } from "@/lib/calendar-utils";
import { formatTime } from "@/lib/date-utils";
import { useAuth } from "@/contexts/auth-context";
import QuickActions from "@/components/dashboard/quick-actions";
import MetricCard from "@/components/dashboard/metric-card";
import PasswordChangeReminder from "@/components/notifications/password-change-reminder";
import { useState } from "react";
import TaskDetailModal from "@/components/tasks/task-detail-modal";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";

export default function Today() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>();

  const isAdminOrPM = user?.role === "admin" || user?.role === "project_manager";

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: !authLoading,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !authLoading && isAdminOrPM,
  });

  const { data: issues = [] } = useQuery<Issue[]>({
    queryKey: ["/api/issues"],
    enabled: !authLoading && isAdminOrPM,
  });

  const { data: vacancies = [] } = useQuery<Vacancy[]>({
    queryKey: ["/api/vacancies"],
    enabled: !authLoading && isAdminOrPM,
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
  
  // Filter tasks for workers - they can only see their own tasks
  const userFilteredTasks = tasks.filter(task => {
    if (user?.role !== 'worker') return true;
    if (!task.assignedTo) return false;
    
    const taskAssignee = task.assignedTo.toLowerCase().trim();
    const username = user.username.toLowerCase();
    const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
    const firstName = (user.firstName || '').toLowerCase();
    const lastName = (user.lastName || '').toLowerCase();
    
    return taskAssignee.includes(username) || 
           taskAssignee.includes(displayName) ||
           (firstName && taskAssignee.includes(firstName)) ||
           (lastName && taskAssignee.includes(lastName)) ||
           username.includes(taskAssignee) ||
           displayName.includes(taskAssignee);
  });
  
  const todaysTasks = userFilteredTasks.filter(task => {
    const taskStart = new Date(task.startDate);
    const taskEnd = task.endDate ? new Date(task.endDate) : taskStart;
    return taskStart < dayEnd && taskEnd >= dayStart;
  });

  // Get upcoming tasks (next 3 days), sorted by start time
  const upcomingTasks = userFilteredTasks
    .filter(task => {
      const taskStart = new Date(task.startDate);
      return taskStart >= dayEnd && taskStart < new Date(dayEnd.getTime() + (3 * 24 * 60 * 60 * 1000));
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5);

  // Calculate metrics for admin/PM
  const pendingTasks = tasks.filter(t => t.status === "pending").length;
  const activeStaff = users.filter(u => u.isApproved && u.role === "worker").length;
  const criticalIssues = issues.filter(i => i.urgency === "high" && i.status !== "resolved").length;
  const activeVacancies = vacancies.filter(v => v.status === "vacant" || v.status === "pending");

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedTask(undefined);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Header />
      <MobileNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mb-20 md:mb-0">
        <PasswordChangeReminder />
        
        {/* Welcome Section - More Compact */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1" data-testid="text-greeting">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}!
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm" data-testid="text-today-count">
            {todaysTasks.length === 0 
              ? "No tasks scheduled for today." 
              : `You have ${todaysTasks.length} task${todaysTasks.length === 1 ? '' : 's'} scheduled for today.`
            }
          </p>
        </div>

        {/* Metrics Row - Admin/PM Only */}
        {isAdminOrPM && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Pending Tasks"
              value={pendingTasks}
              subtext="Requires attention"
              icon={FileCheck}
              alert={pendingTasks > 5}
              onClick={() => setLocation("/tasks?status=pending")}
            />
            <MetricCard
              title="Active Staff"
              value={activeStaff}
              subtext={`${users.filter(u => u.isApproved).length} total approved`}
              icon={Users}
              onClick={() => setLocation("/staff")}
            />
            <MetricCard
              title="Critical Issues"
              value={criticalIssues}
              subtext="High priority"
              icon={AlertTriangle}
              alert={criticalIssues > 0}
              trend={criticalIssues > 0 ? String(criticalIssues) : undefined}
              trendDirection={criticalIssues > 0 ? "down" : undefined}
              onClick={() => setLocation("/admin/issues?urgency=high")}
            />
            <MetricCard
              title="Vacancies"
              value={activeVacancies.length}
              subtext="Units available"
              icon={Home}
              onClick={() => setLocation("/vacancies")}
            />
          </div>
        )}

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Today's Tasks - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Card className="bg-white dark:bg-slate-800 shadow-sm border-gray-100 dark:border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Today's Tasks
                </CardTitle>
                <Link href="/calendar">
                  <Button variant="outline" size="sm" className="text-sm border-gray-200 hover:border-blue-500 hover:text-blue-600" data-testid="button-view-calendar">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Calendar
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <div className="text-gray-500">Loading tasks...</div>
                  </div>
                ) : todaysTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Clock className="w-6 h-6 text-green-500" />
                    </div>
                    <div className="text-gray-600 font-medium mb-1">All caught up!</div>
                    <p className="text-gray-400 text-sm">No tasks scheduled for today</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todaysTasks.slice(0, 5).map((task) => (
                      <div 
                        key={task.id} 
                        className="flex items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-100 dark:border-slate-600 hover:border-blue-200 dark:hover:border-blue-500 transition-colors cursor-pointer"
                        onClick={() => handleTaskClick(task)}
                        data-testid={`today-task-${task.id}`}
                      >
                        <div className={`w-3 h-3 rounded-full mr-3 ${getCategoryColor(task.category).split(' ')[0]}`}></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900 dark:text-white truncate">{task.title}</h4>
                            <span className="text-xs text-gray-500 ml-2">{formatTime(task.startDate)}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            {task.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {task.location}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              task.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {task.status.replace('-', ' ')}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 ml-2" />
                      </div>
                    ))}
                    {todaysTasks.length > 5 && (
                      <Link href="/tasks">
                        <Button variant="ghost" className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          View all {todaysTasks.length} tasks <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Quick Actions - Right Column */}
          <div className="lg:col-span-1">
            <QuickActions />
          </div>
        </div>

        {/* Schedule Preview - Shows upcoming tasks */}
        {upcomingTasks.length > 0 && (
          <Card className="bg-white dark:bg-slate-800 shadow-sm border-gray-100 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base text-gray-900 dark:text-white">Upcoming Schedule</CardTitle>
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="text-sm text-blue-600 hover:text-blue-700" data-testid="button-view-all-tasks">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingTasks.map((task) => (
                  <div 
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-100 dark:border-slate-600 hover:border-blue-200 transition-colors cursor-pointer"
                    onClick={() => handleTaskClick(task)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${getCategoryColor(task.category).split(' ')[0]}`}></div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white text-sm">{task.title}</div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(task.startDate), "EEE, MMM d")} at {formatTime(task.startDate)}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(task.category)}`}>
                      {task.category}
                    </span>
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
