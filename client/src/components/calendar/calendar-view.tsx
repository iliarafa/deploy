import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { type Task, type User as SchemaUser } from "@shared/schema";
import { getDaysInMonth, getFirstDayOfMonth, getCategoryColorPastel, getPriorityBadge, getWorkerColorPastel, getWorkerSolidColor, getAllWorkerColors, initializeWorkerColors } from "@/lib/calendar-utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import TaskDetailModal from "@/components/tasks/task-detail-modal";
import { useState, useMemo, type MouseEvent } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Repeat, RotateCcw, Clock, MapPin, User as UserIcon, CheckCircle2 } from "lucide-react";
import { format, isSameDay } from "date-fns";

interface CalendarViewProps {
  currentDate: Date;
  view: "month" | "week" | "day";
  searchTerm: string;
  selectedUsers: string[];
  onCreateTask?: (date: Date, time?: string) => void;
  layoutMode?: "calendar" | "timeline";
}

const USER_COLORS: Record<string, string> = {
  "German": "bg-blue-500",
  "Marcelo": "bg-green-500",
  "Luis C": "bg-purple-500",
  "Jose": "bg-orange-500",
  "Miguel": "bg-pink-500",
  "Luis G": "bg-cyan-500",
};

function getUserColor(name: string): string {
  const firstName = name?.split(" ")[0] || "";
  return USER_COLORS[firstName] || "bg-slate-500";
}

function getUserInitials(name: string): string {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export default function CalendarView({ 
  currentDate, 
  view, 
  searchTerm,
  selectedUsers,
  onCreateTask,
  layoutMode = "calendar"
}: CalendarViewProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { isLoading: authLoading, user } = useAuth();
  const isAdminView = user?.role === 'admin' || user?.role === 'project_manager';
  
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: !authLoading,
  });

  const { data: users = [] } = useQuery<SchemaUser[]>({
    queryKey: ["/api/users"],
    enabled: !authLoading,
  });

  // Build a mapping from display name to all possible matching values (username, firstName, lastName)
  const userNameMapping = useMemo(() => {
    const mapping: Record<string, string[]> = {};
    users.forEach(u => {
      const displayName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username;
      const matchValues = [
        displayName.toLowerCase(),
        u.username.toLowerCase(),
        (u.firstName || '').toLowerCase(),
        (u.lastName || '').toLowerCase(),
      ].filter(Boolean);
      mapping[displayName] = matchValues;
    });
    return mapping;
  }, [users]);

  // Initialize worker colors when tasks load (for consistent colors across session)
  useMemo(() => {
    if (tasks.length > 0 && isAdminView) {
      const workerNames = Array.from(new Set(tasks.map(t => t.assignedTo).filter(Boolean) as string[]));
      initializeWorkerColors(workerNames);
    }
  }, [tasks, isAdminView]);

  const handleTaskClick = (task: Task, e?: MouseEvent) => {
    e?.stopPropagation();
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setIsDrawerOpen(true);
  };

  // Get current user's display name for worker filtering
  const currentUserDisplayName = useMemo(() => {
    if (!user) return '';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
  }, [user]);

  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter(task => 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Workers can only see their own tasks
    if (user?.role === 'worker') {
      filtered = filtered.filter(task => {
        if (!task.assignedTo) return false;
        const taskAssignee = task.assignedTo.toLowerCase().trim();
        const username = user.username.toLowerCase();
        const displayName = currentUserDisplayName.toLowerCase();
        const firstName = (user.firstName || '').toLowerCase();
        const lastName = (user.lastName || '').toLowerCase();
        
        // Check if task is assigned to this worker
        return taskAssignee.includes(username) || 
               taskAssignee.includes(displayName) ||
               (firstName && taskAssignee.includes(firstName)) ||
               (lastName && taskAssignee.includes(lastName)) ||
               username.includes(taskAssignee) ||
               displayName.includes(taskAssignee);
      });
    }
    
    if (selectedUsers.length > 0) {
      filtered = filtered.filter(task => {
        if (!task.assignedTo) return false;
        const taskAssignee = task.assignedTo.toLowerCase().trim();
        
        return selectedUsers.some(selectedDisplayName => {
          // Get all possible match values for this selected user (username, firstName, lastName, displayName)
          const matchValues = userNameMapping[selectedDisplayName] || [selectedDisplayName.toLowerCase()];
          
          // Check if task assignee matches any of these values
          return matchValues.some(matchValue => 
            taskAssignee.includes(matchValue) || matchValue.includes(taskAssignee)
          );
        });
      });
    }
    
    return filtered;
  }, [tasks, searchTerm, selectedUsers, userNameMapping, user, currentUserDisplayName]);

  const getTasksForDate = (date: Date) => {
    return filteredTasks.filter(task => {
      const taskDate = new Date(task.startDate);
      return isSameDay(taskDate, date);
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  };

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const getWeekDates = (startOfWeek: Date) => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const formatTime = (date: Date) => {
    return format(date, 'h:mm a');
  };

  const renderTaskChip = (task: Task, index: number, compact = true) => {
    const isRecurringTemplate = task.isRecurringTemplate && task.recurrenceType && task.recurrenceType !== 'none';
    const isRecurringInstance = task.parentTaskId && !task.isRecurringTemplate;
    const isCompleted = task.status === 'completed';
    const priorityBadge = getPriorityBadge(task.priority);
    
    // Use worker-based colors for admin/PM view, category colors for others
    const chipColorClass = isAdminView 
      ? getWorkerColorPastel(task.assignedTo)
      : getCategoryColorPastel(task.category);
    
    return (
      <div 
        key={task.id}
        onClick={(e) => handleTaskClick(task, e)}
        className={`${chipColorClass} ${isCompleted ? 'opacity-60' : ''} 
          text-xs px-2 py-1.5 rounded-md cursor-pointer flex items-center gap-1.5 group
          hover:shadow-sm transition-all duration-150`}
        data-testid={`task-chip-${task.id}`}
        style={{ animationDelay: `${index * 0.05}s` }}
      >
        {task.assignedTo && (
          <Avatar className="h-4 w-4 flex-shrink-0">
            <AvatarFallback className={`${isAdminView ? getWorkerSolidColor(task.assignedTo) : getUserColor(task.assignedTo)} text-white text-[8px] font-medium`}>
              {getUserInitials(task.assignedTo)}
            </AvatarFallback>
          </Avatar>
        )}
        {isRecurringTemplate && <Repeat className="w-2.5 h-2.5 flex-shrink-0 opacity-60" />}
        {isRecurringInstance && <RotateCcw className="w-2.5 h-2.5 flex-shrink-0 opacity-60" />}
        <span className="truncate flex-1 font-medium">{task.title}</span>
        {task.priority === 'urgent' && (
          <span className={`${priorityBadge.bg} ${priorityBadge.text} text-[9px] px-1 py-0.5 rounded font-semibold flex-shrink-0`}>
            !
          </span>
        )}
      </div>
    );
  };

  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const today = new Date();
    
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, prevMonthDays - i);
      days.push(
        <div 
          key={`prev-${prevMonthDays - i}`} 
          className="min-h-[100px] md:min-h-[120px] bg-slate-50/50 dark:bg-slate-800/30 rounded-lg p-2 border border-slate-100 dark:border-slate-700/50"
        >
          <div className="text-xs text-slate-400 dark:text-slate-500 font-medium text-right">{prevMonthDays - i}</div>
        </div>
      );
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const tasksForDay = getTasksForDate(date);
      const isToday = isSameDay(date, today);
      const overflowCount = Math.max(0, tasksForDay.length - 3);
      
      days.push(
        <div 
          key={day} 
          className={`min-h-[100px] md:min-h-[120px] rounded-lg p-2 border transition-all duration-150 cursor-pointer
            ${isToday 
              ? 'bg-blue-50/80 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 ring-1 ring-blue-200 dark:ring-blue-700' 
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
            }`}
          onClick={() => handleDayClick(date)}
          data-testid={`calendar-day-${day}`}
        >
          <div className="flex justify-end mb-1.5">
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md
              ${isToday 
                ? 'bg-blue-500 text-white' 
                : 'text-slate-500 dark:text-slate-400'
              }`}>
              {day}
            </span>
          </div>
          <div className="space-y-1">
            {tasksForDay.slice(0, 3).map((task, index) => renderTaskChip(task, index))}
            {overflowCount > 0 && (
              <button 
                className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium px-1 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDayClick(date);
                }}
              >
                +{overflowCount} more...
              </button>
            )}
          </div>
        </div>
      );
    }
    
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push(
        <div 
          key={`next-${day}`} 
          className="min-h-[100px] md:min-h-[120px] bg-slate-50/50 dark:bg-slate-800/30 rounded-lg p-2 border border-slate-100 dark:border-slate-700/50"
        >
          <div className="text-xs text-slate-400 dark:text-slate-500 font-medium text-right">{day}</div>
        </div>
      );
    }
    
    return days;
  };

  const renderWeekView = () => {
    const startOfWeek = getStartOfWeek(currentDate);
    const weekDates = getWeekDates(startOfWeek);
    const today = new Date();
    const timeSlots = [];
    
    for (let hour = 6; hour <= 22; hour++) {
      const timeLabel = format(new Date(2024, 0, 1, hour, 0), 'h a');
      
      timeSlots.push(
        <div key={hour} className="border-b border-slate-100 dark:border-slate-700">
          <div className="flex">
            <div className="w-16 md:w-20 text-[10px] text-slate-400 dark:text-slate-500 p-2 text-right border-r border-slate-100 dark:border-slate-700 font-medium">
              {timeLabel}
            </div>
            
            {weekDates.map((date, dayIndex) => {
              const tasksForDay = getTasksForDate(date);
              const isToday = isSameDay(date, today);
              
              return (
                <div 
                  key={dayIndex} 
                  className={`flex-1 min-h-[50px] border-r border-slate-100 dark:border-slate-700 p-1 relative cursor-pointer transition-colors
                    ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                  onClick={() => {
                    if (onCreateTask) {
                      onCreateTask(date, `${hour.toString().padStart(2, '0')}:00`);
                    }
                  }}
                >
                  {tasksForDay
                    .filter(task => new Date(task.startDate).getHours() === hour)
                    .map((task, taskIndex) => (
                      <div
                        key={task.id}
                        onClick={(e) => handleTaskClick(task, e)}
                        className={`${getCategoryColorPastel(task.category)} 
                          absolute left-1 right-1 z-10 text-[10px] px-1.5 py-1 rounded cursor-pointer
                          flex items-center gap-1 hover:shadow-sm transition-shadow`}
                        style={{ top: `${(new Date(task.startDate).getMinutes() / 60) * 50}px` }}
                        data-testid={`task-week-${task.id}`}
                      >
                        {task.assignedTo && (
                          <Avatar className="h-3.5 w-3.5 flex-shrink-0">
                            <AvatarFallback className={`${getUserColor(task.assignedTo)} text-white text-[7px]`}>
                              {getUserInitials(task.assignedTo)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <span className="truncate font-medium">{task.title}</span>
                      </div>
                    ))
                  }
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    
    return timeSlots;
  };

  const renderDayView = () => {
    const tasksForDay = getTasksForDate(currentDate);
    const timeSlots = [];
    
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeSlot = new Date(2024, 0, 1, hour, minute);
        const timeLabel = format(timeSlot, 'h:mm a');
        const slotKey = `${hour}-${minute}`;
        const isHourStart = minute === 0;
        
        timeSlots.push(
          <div key={slotKey} className={`border-b ${isHourStart ? 'border-slate-200 dark:border-slate-700' : 'border-slate-100 dark:border-slate-800'}`}>
            <div className="flex">
              <div className="w-20 md:w-24 text-xs text-slate-400 dark:text-slate-500 p-3 text-right border-r border-slate-100 dark:border-slate-700 font-medium">
                {isHourStart && timeLabel}
              </div>
              
              <div 
                className="flex-1 min-h-[40px] p-2 relative hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                onClick={() => onCreateTask?.(currentDate, `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`)}
              >
                {tasksForDay
                  .filter(task => {
                    const taskDate = new Date(task.startDate);
                    return taskDate.getHours() === hour && taskDate.getMinutes() >= minute && taskDate.getMinutes() < minute + 30;
                  })
                  .map((task, taskIndex) => {
                    const priorityBadge = getPriorityBadge(task.priority);
                    const taskMinute = new Date(task.startDate).getMinutes();
                    
                    return (
                      <div
                        key={task.id}
                        onClick={(e) => handleTaskClick(task, e)}
                        className={`${getCategoryColorPastel(task.category)} 
                          absolute left-2 right-2 z-10 text-sm px-3 py-2 rounded-lg cursor-pointer
                          hover:shadow-md transition-shadow`}
                        style={{ top: `${((taskMinute - minute) / 30) * 40}px` }}
                        data-testid={`task-day-${task.id}`}
                      >
                        <div className="flex items-center gap-2 font-medium">
                          {task.assignedTo && (
                            <Avatar className="h-5 w-5 flex-shrink-0">
                              <AvatarFallback className={`${getUserColor(task.assignedTo)} text-white text-[9px]`}>
                                {getUserInitials(task.assignedTo)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <span className="truncate">{task.title}</span>
                          {task.priority === 'urgent' && (
                            <Badge className={`${priorityBadge.bg} ${priorityBadge.text} text-[10px] px-1.5`}>Urgent</Badge>
                          )}
                        </div>
                        <div className="text-xs opacity-75 mt-1 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {formatTime(new Date(task.startDate))}
                          {task.location && (
                            <>
                              <MapPin className="w-3 h-3 ml-1" />
                              {task.location}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          </div>
        );
      }
    }
    
    return timeSlots;
  };

  const renderDayDrawer = () => {
    if (!selectedDate) return null;
    const tasksForDay = getTasksForDate(selectedDate);
    
    return (
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-hidden flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle className="text-xl font-semibold">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </SheetTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {tasksForDay.length} task{tasksForDay.length !== 1 ? 's' : ''} scheduled
            </p>
          </SheetHeader>
          
          <ScrollArea className="flex-1 mt-4 -mx-6 px-6">
            <div className="space-y-3 pb-6">
              {tasksForDay.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <p className="text-sm">No tasks scheduled for this day</p>
                </div>
              ) : (
                tasksForDay.map((task) => {
                  const priorityBadge = getPriorityBadge(task.priority);
                  const isCompleted = task.status === 'completed';
                  
                  return (
                    <div
                      key={task.id}
                      onClick={() => handleTaskClick(task)}
                      className={`${getCategoryColorPastel(task.category)} 
                        p-4 rounded-lg cursor-pointer hover:shadow-md transition-all
                        ${isCompleted ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        {task.assignedTo && (
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback className={`${getUserColor(task.assignedTo)} text-white text-xs font-medium`}>
                              {getUserInitials(task.assignedTo)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm truncate">{task.title}</h4>
                            {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />}
                            {task.priority === 'urgent' && (
                              <Badge className={`${priorityBadge.bg} ${priorityBadge.text} text-[10px]`}>Urgent</Badge>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs opacity-75">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(new Date(task.startDate))}
                            </span>
                            
                            {task.assignedTo && (
                              <span className="flex items-center gap-1">
                                <UserIcon className="w-3 h-3" />
                                {task.assignedTo}
                              </span>
                            )}
                            
                            {task.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {task.location}
                              </span>
                            )}
                          </div>
                          
                          {task.description && (
                            <p className="text-xs opacity-60 mt-2 line-clamp-2">{task.description}</p>
                          )}
                          
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-[10px] capitalize">{task.category}</Badge>
                            <Badge variant="outline" className="text-[10px] capitalize">{task.status}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();

  const timeSlots = [
    "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
    "6:00 PM", "7:00 PM", "8:00 PM"
  ];

  const uniqueUsers = useMemo(() => {
    const users = new Set<string>();
    let hasUnassigned = false;
    filteredTasks.forEach(task => {
      if (task.assignedTo) {
        users.add(task.assignedTo);
      } else {
        hasUnassigned = true;
      }
    });
    const sortedUsers = Array.from(users).sort();
    if (hasUnassigned) {
      sortedUsers.push("Unassigned");
    }
    return sortedUsers;
  }, [filteredTasks]);

  const getTasksForUserAndDate = (user: string, date: Date) => {
    return filteredTasks.filter(task => {
      const taskDate = new Date(task.startDate);
      if (user === "Unassigned") {
        return !task.assignedTo && isSameDay(taskDate, date);
      }
      return task.assignedTo === user && isSameDay(taskDate, date);
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  };

  const getTimePosition = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const fractionalHour = hours + minutes / 60;
    
    if (fractionalHour < 6) return 0;
    if (fractionalHour >= 20) return timeSlots.length;
    return fractionalHour - 6;
  };
  
  const getTaskDurationHours = (task: Task) => {
    if (task.endDate) {
      const start = new Date(task.startDate);
      const end = new Date(task.endDate);
      return Math.max(0.5, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
    }
    return 1;
  };

  const renderTimelineView = () => {
    const tasksForDate = getTasksForDate(currentDate);
    const usersWithTasks = uniqueUsers.length > 0 ? uniqueUsers : [];
    
    return (
      <div>
        <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
          <div className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-1">
            {format(currentDate, 'EEEE, MMMM d, yyyy')}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Timeline View - {tasksForDate.length} task{tasksForDate.length !== 1 ? 's' : ''} across {uniqueUsers.length} team member{uniqueUsers.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        <div className="hidden md:block overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="flex border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <div className="w-28 flex-shrink-0 p-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                Team
              </div>
              {timeSlots.map((slot) => (
                <div 
                  key={slot}
                  className="flex-1 min-w-[48px] p-1.5 text-center text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700"
                >
                  {slot.replace(' AM', 'a').replace(' PM', 'p')}
                </div>
              ))}
            </div>
            
            {usersWithTasks.map((user) => {
              const userTasks = getTasksForUserAndDate(user, currentDate);
              
              const taskPositions: { task: Task; startPos: number; width: number }[] = userTasks.map(task => {
                const startPos = getTimePosition(task.startDate);
                const durationHours = getTaskDurationHours(task);
                const endPos = Math.min(startPos + durationHours, timeSlots.length);
                const width = Math.max(0.5, endPos - startPos);
                return { task, startPos, width };
              });

              return (
                <div key={user} className="flex border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <div className="w-28 flex-shrink-0 p-2 border-r border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                    <Avatar className="h-5 w-5 flex-shrink-0">
                      <AvatarFallback className={`${getUserColor(user)} text-white text-[8px]`}>
                        {getUserInitials(user)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">
                      {user.split(' ')[0]}
                    </span>
                  </div>
                  
                  <div className="flex-1 flex relative min-h-[44px]">
                    {timeSlots.map((_, slotIndex) => (
                      <div 
                        key={slotIndex}
                        className="flex-1 min-w-[48px] border-r border-slate-100 dark:border-slate-700"
                      />
                    ))}
                    
                    {taskPositions.map(({ task, startPos, width: durationWidth }) => {
                      const categoryColorClasses = getCategoryColorPastel(task.category);
                      const widthPercent = (durationWidth / timeSlots.length) * 100;
                      const left = (startPos / timeSlots.length) * 100;
                      
                      return (
                        <div
                          key={task.id}
                          className={`absolute top-1 bottom-1 ${categoryColorClasses} rounded-md px-1.5 py-0.5 cursor-pointer hover:shadow-md transition-shadow overflow-hidden`}
                          style={{ 
                            left: `${left}%`, 
                            width: `${widthPercent}%`,
                            minWidth: '36px'
                          }}
                          onClick={(e) => handleTaskClick(task, e)}
                          data-testid={`timeline-task-${task.id}`}
                        >
                          <div className="text-[9px] font-medium truncate">
                            {task.title}
                          </div>
                          <div className="text-[8px] opacity-70 truncate">
                            {formatTime(new Date(task.startDate))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="md:hidden space-y-3">
          {usersWithTasks.length === 0 ? (
            <div className="p-6 text-center text-slate-500 dark:text-slate-400">
              <p className="text-sm">No tasks with assigned users for this date</p>
            </div>
          ) : (
            usersWithTasks.map((user) => {
              const userTasks = getTasksForUserAndDate(user, currentDate);
              
              return (
                <div key={user} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-800 px-3 py-2 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarFallback className={`${getUserColor(user)} text-white text-[9px]`}>
                        {getUserInitials(user)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {user}
                    </span>
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      {userTasks.length} task{userTasks.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {userTasks.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No tasks scheduled
                      </div>
                    ) : (
                      userTasks.map((task) => {
                        const categoryColorClasses = getCategoryColorPastel(task.category);
                        return (
                          <div
                            key={task.id}
                            className={`p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors`}
                            onClick={(e) => handleTaskClick(task, e)}
                            data-testid={`timeline-task-mobile-${task.id}`}
                          >
                            <div className="flex items-start gap-2">
                              <div className={`w-1 h-full min-h-[32px] rounded-full ${categoryColorClasses.includes('emerald') ? 'bg-emerald-400' : categoryColorClasses.includes('blue') ? 'bg-blue-400' : categoryColorClasses.includes('amber') ? 'bg-amber-400' : categoryColorClasses.includes('yellow') ? 'bg-yellow-400' : categoryColorClasses.includes('rose') ? 'bg-rose-400' : 'bg-slate-400'}`} />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                  {task.title}
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatTime(new Date(task.startDate))}</span>
                                  {task.endDate && (
                                    <span>- {formatTime(new Date(task.endDate))}</span>
                                  )}
                                </div>
                                {task.location && (
                                  <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                                    <MapPin className="w-3 h-3" />
                                    <span className="truncate">{task.location}</span>
                                  </div>
                                )}
                              </div>
                              <Badge variant="outline" className="text-[10px] capitalize flex-shrink-0">
                                {task.category}
                              </Badge>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {uniqueUsers.length === 0 && (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            <p className="text-sm">No tasks with assigned users for this date</p>
            <p className="text-xs mt-1">Tasks need to have an assigned team member to appear in the timeline view</p>
          </div>
        )}
      </div>
    );
  };

  // Get unique workers for the legend - must be before any conditional returns
  const workerLegendData = useMemo(() => {
    if (!isAdminView) return [];
    const workerNames = Array.from(new Set(tasks.map(t => t.assignedTo).filter(Boolean) as string[]));
    return workerNames.map(name => ({
      name,
      color: getWorkerSolidColor(name)
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks, isAdminView]);

  if (isLoading) {
    return (
      <Card className="mb-6 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="text-slate-500 dark:text-slate-400">Loading calendar...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-6 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
        <CardContent className="pt-6">
          {/* Worker Color Legend for Admin View */}
          {isAdminView && workerLegendData.length > 0 && (
            <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                Team Members
              </div>
              <div className="flex flex-wrap gap-2">
                {workerLegendData.map(({ name, color }) => (
                  <div 
                    key={name} 
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-50 dark:bg-slate-700/50 text-xs"
                  >
                    <div className={`w-3 h-3 rounded-full ${color}`} />
                    <span className="text-slate-700 dark:text-slate-300 capitalize">{name}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-50 dark:bg-slate-700/50 text-xs">
                  <div className="w-3 h-3 rounded-full bg-slate-500" />
                  <span className="text-slate-700 dark:text-slate-300">Unassigned</span>
                </div>
              </div>
            </div>
          )}
          
          {layoutMode === "timeline" ? (
            <div className="max-h-[600px] overflow-y-auto">
              {renderTimelineView()}
            </div>
          ) : (
            <>
              {view === "month" && (
                <>
                  <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
                    {weekDays.map(day => (
                      <div key={day} className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-2 uppercase tracking-wide">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {renderMonthView()}
                  </div>
                </>
              )}

              {view === "week" && (
                <>
                  <div className="flex border-b border-slate-200 dark:border-slate-700 mb-2">
                    <div className="w-16 md:w-20 text-[10px] text-slate-500 dark:text-slate-400 p-2 text-right border-r border-slate-100 dark:border-slate-700 font-medium uppercase">
                      Time
                    </div>
                    {getWeekDates(getStartOfWeek(currentDate)).map((date, index) => {
                      const isToday = isSameDay(date, today);
                      const dayName = weekDays[date.getDay()];
                      
                      return (
                        <div 
                          key={index} 
                          className={`flex-1 text-center p-2 border-r border-slate-100 dark:border-slate-700 
                            ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        >
                          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">{dayName}</div>
                          <div className={`text-lg font-semibold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {date.getDate()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <ScrollArea className="h-[500px]">
                    {renderWeekView()}
                  </ScrollArea>
                </>
              )}

              {view === "day" && (
                <>
                  <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
                    <div className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      {format(currentDate, 'EEEE, MMMM d, yyyy')}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {getTasksForDate(currentDate).length} task{getTasksForDate(currentDate).length !== 1 ? 's' : ''} scheduled
                    </div>
                  </div>
                  <ScrollArea className="h-[600px]">
                    {renderDayView()}
                  </ScrollArea>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      {renderDayDrawer()}
      
      <TaskDetailModal 
        task={selectedTask}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTask(null);
        }}
      />
    </>
  );
}
