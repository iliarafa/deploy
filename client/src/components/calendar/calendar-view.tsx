import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { type Task } from "@shared/schema";
import { getDaysInMonth, getFirstDayOfMonth } from "@/lib/calendar-utils";
import { formatDate } from "@/lib/date-utils";
import { getCategoryColor } from "@/lib/calendar-utils";
import TaskDetailModal from "@/components/tasks/task-detail-modal";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Repeat, RotateCcw } from "lucide-react";

interface CalendarViewProps {
  currentDate: Date;
  view: "month" | "week" | "day";
  searchTerm: string;
  onCreateTask?: (date: Date, time?: string) => void;
}

export default function CalendarView({ 
  currentDate, 
  view, 
  searchTerm,
  onCreateTask
}: CalendarViewProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const { isLoading: authLoading } = useAuth();
  
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: !authLoading, // Wait for authentication verification before fetching
  });

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTasksForDate = (date: Date) => {
    return filteredTasks.filter(task => {
      const taskDate = new Date(task.startDate);
      return taskDate.toDateString() === date.toDateString();
    });
  };

  // Helper functions for week view
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
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    
    // Previous month days
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, prevMonthDays - i);
      days.push(
        <div key={`prev-${prevMonthDays - i}`} className="h-24 md:h-32 border border-gray-100 rounded-lg p-2 text-gray-400">
          <div className="text-sm">{prevMonthDays - i}</div>
        </div>
      );
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const tasksForDay = getTasksForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      
      days.push(
        <div 
          key={day} 
          className={`h-24 md:h-32 border rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer ${
            isToday ? 'bg-blue-50 dark:bg-slate-700 border-primary' : 'border-gray-200 dark:border-slate-700'
          }`}
          onClick={(e) => {
            // Only create task if clicking on empty space (not on existing tasks)
            if (onCreateTask && e.target === e.currentTarget) {
              onCreateTask(date);
            }
          }}
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
            {day}
          </div>
          <div className="space-y-1">
            {tasksForDay.slice(0, 3).map((task, index) => {
              const statusClasses = task.status === 'completed' ? 'task-completed-pulse' :
                                  task.priority === 'urgent' ? 'task-urgent-shake' : '';
              const glowClass = task.status === 'pending' ? 'status-glow-pending' :
                              task.status === 'in-progress' ? 'status-glow-progress' :
                              task.status === 'completed' ? 'status-glow-completed' : '';
              
              // Determine if task is recurring
              const isRecurringTemplate = task.isRecurringTemplate && task.recurrenceType && task.recurrenceType !== 'none';
              const isRecurringInstance = task.parentTaskId && !task.isRecurringTemplate;
              
              return (
                <div 
                  key={task.id} 
                  className={`task-element task-animate-enter task-animate-hover ${getCategoryColor(task.category)} ${statusClasses} ${glowClass} text-xs px-2 py-1 rounded truncate cursor-pointer transform-gpu flex items-center gap-1`}
                  data-testid={`task-chip-${task.id}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTaskClick(task);
                  }}
                >
                  {isRecurringTemplate && (
                    <Repeat className="w-2.5 h-2.5 flex-shrink-0" title="Recurring Template" />
                  )}
                  {isRecurringInstance && (
                    <RotateCcw className="w-2.5 h-2.5 flex-shrink-0" title="Recurring Instance" />
                  )}
                  <span className="truncate">{task.title}</span>
                </div>
              );
            })}
            {tasksForDay.length > 3 && (
              <div className="text-xs text-gray-500 px-2">
                +{tasksForDay.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Next month days to fill the grid
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, day);
      days.push(
        <div key={`next-${day}`} className="h-24 md:h-32 border border-gray-100 rounded-lg p-2 text-gray-400">
          <div className="text-sm">{day}</div>
        </div>
      );
    }
    
    return days;
  };

  const renderWeekView = () => {
    const startOfWeek = getStartOfWeek(currentDate);
    const weekDates = getWeekDates(startOfWeek);
    const timeSlots = [];
    
    // Generate time slots from 6 AM to 10 PM
    for (let hour = 6; hour <= 22; hour++) {
      const timeLabel = new Date(2024, 0, 1, hour, 0).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
      
      timeSlots.push(
        <div key={hour} className="border-b border-gray-100">
          <div className="flex">
            {/* Time label */}
            <div className="w-16 md:w-20 text-xs text-gray-500 p-2 text-right border-r border-gray-100">
              {timeLabel}
            </div>
            
            {/* Days */}
            {weekDates.map((date, dayIndex) => {
              const tasksForDay = getTasksForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              
              return (
                <div 
                  key={dayIndex} 
                  className={`flex-1 min-h-[60px] border-r border-gray-100 dark:border-slate-700 p-1 relative hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer ${
                    isToday ? 'bg-blue-50 dark:bg-slate-700' : ''
                  }`}
                  onClick={() => {
                    if (onCreateTask) {
                      const timeString = `${hour.toString().padStart(2, '0')}:00`;
                      onCreateTask(date, timeString);
                    }
                  }}
                >
                  {tasksForDay
                    .filter(task => {
                      const taskHour = new Date(task.startDate).getHours();
                      return taskHour === hour;
                    })
                    .map((task, taskIndex) => {
                      const statusClasses = task.status === 'completed' ? 'task-completed-pulse' :
                                          task.priority === 'urgent' ? 'task-urgent-shake' : '';
                      const glowClass = task.status === 'pending' ? 'status-glow-pending' :
                                      task.status === 'in-progress' ? 'status-glow-progress' :
                                      task.status === 'completed' ? 'status-glow-completed' : '';
                      
                      // Determine if task is recurring
                      const isRecurringTemplate = task.isRecurringTemplate && task.recurrenceType && task.recurrenceType !== 'none';
                      const isRecurringInstance = task.parentTaskId && !task.isRecurringTemplate;
                      
                      return (
                        <div
                          key={task.id}
                          className={`task-element task-animate-enter task-animate-hover ${getCategoryColor(task.category)} ${statusClasses} ${glowClass} absolute left-1 right-1 z-10 text-xs px-2 py-1 rounded truncate shadow-sm cursor-pointer transform-gpu`}
                          style={{
                            top: `${(new Date(task.startDate).getMinutes() / 60) * 60}px`,
                            animationDelay: `${taskIndex * 0.1}s`
                          }}
                          title={`${task.title} - ${formatTime(new Date(task.startDate))}`}
                          data-testid={`task-week-${task.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTaskClick(task);
                          }}
                        >
                          <div className="flex items-center gap-1 font-medium">
                            {isRecurringTemplate && (
                              <Repeat className="w-2.5 h-2.5 flex-shrink-0" title="Recurring Template" />
                            )}
                            {isRecurringInstance && (
                              <RotateCcw className="w-2.5 h-2.5 flex-shrink-0" title="Recurring Instance" />
                            )}
                            <span className="truncate">{task.title}</span>
                          </div>
                          <div className="text-[10px] opacity-75">
                            {formatTime(new Date(task.startDate))}
                          </div>
                        </div>
                      );
                    })
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
    
    // Generate time slots from 6 AM to 10 PM with 30-minute intervals
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeSlot = new Date(2024, 0, 1, hour, minute);
        const timeLabel = timeSlot.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
        
        const slotKey = `${hour}-${minute}`;
        const isHourStart = minute === 0;
        
        timeSlots.push(
          <div key={slotKey} className={`border-b ${isHourStart ? 'border-gray-200' : 'border-gray-100'}`}>
            <div className="flex">
              {/* Time label */}
              <div className="w-20 md:w-24 text-xs text-gray-500 p-3 text-right border-r border-gray-100">
                {isHourStart && timeLabel}
              </div>
              
              {/* Single day column */}
              <div 
                className="flex-1 min-h-[40px] p-2 relative hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
                onClick={() => {
                  if (onCreateTask) {
                    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                    onCreateTask(currentDate, timeString);
                  }
                }}
              >
                {tasksForDay
                  .filter(task => {
                    const taskDate = new Date(task.startDate);
                    const taskHour = taskDate.getHours();
                    const taskMinute = taskDate.getMinutes();
                    
                    // Check if task falls within this 30-minute slot
                    return taskHour === hour && taskMinute >= minute && taskMinute < minute + 30;
                  })
                  .map((task, taskIndex) => {
                    const statusClasses = task.status === 'completed' ? 'task-completed-pulse' :
                                        task.priority === 'urgent' ? 'task-urgent-shake' : '';
                    const glowClass = task.status === 'pending' ? 'status-glow-pending' :
                                    task.status === 'in-progress' ? 'status-glow-progress' :
                                    task.status === 'completed' ? 'status-glow-completed' : '';
                    
                    // Determine if task is recurring
                    const isRecurringTemplate = task.isRecurringTemplate && task.recurrenceType && task.recurrenceType !== 'none';
                    const isRecurringInstance = task.parentTaskId && !task.isRecurringTemplate;
                    
                    const taskDate = new Date(task.startDate);
                    const taskMinute = taskDate.getMinutes();
                    const offsetFromSlotStart = taskMinute - minute;
                    
                    return (
                      <div
                        key={task.id}
                        className={`task-element task-animate-enter task-animate-hover ${getCategoryColor(task.category)} ${statusClasses} ${glowClass} absolute left-2 right-2 z-10 text-sm px-3 py-2 rounded-lg shadow-sm border border-white/20 cursor-pointer transform-gpu`}
                        style={{
                          top: `${(offsetFromSlotStart / 30) * 40}px`,
                          animationDelay: `${taskIndex * 0.1}s`
                        }}
                        title={`${task.title} - ${formatTime(new Date(task.startDate))}`}
                        data-testid={`task-day-${task.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTaskClick(task);
                        }}
                      >
                        <div className="flex items-center gap-2 font-semibold">
                          {isRecurringTemplate && (
                            <Repeat className="w-3 h-3 flex-shrink-0" title="Recurring Template" />
                          )}
                          {isRecurringInstance && (
                            <RotateCcw className="w-3 h-3 flex-shrink-0" title="Recurring Instance" />
                          )}
                          <span className="truncate">{task.title}</span>
                        </div>
                        <div className="text-xs opacity-90 mt-1">
                          {formatTime(new Date(task.startDate))}
                          {task.assignedTo && ` • ${task.assignedTo}`}
                        </div>
                        {task.location && (
                          <div className="text-xs opacity-75 mt-1">
                            📍 {task.location}
                          </div>
                        )}
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

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (isLoading) {
    return (
      <Card className="mb-6 dark:bg-slate-800">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="text-gray-500 dark:text-gray-300">Loading calendar...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 dark:bg-slate-800">
      <CardContent className="pt-6">
        {view === "month" && (
          <>
            {/* Calendar Header */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {weekDays.map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {renderMonthView()}
            </div>
          </>
        )}

        {view === "week" && (
          <>
            {/* Week Header with Dates */}
            <div className="flex border-b border-gray-200 dark:border-slate-700 mb-2">
              <div className="w-16 md:w-20 text-xs text-gray-500 dark:text-slate-400 p-2 text-right border-r border-gray-100 dark:border-slate-700">
                Time
              </div>
              {getWeekDates(getStartOfWeek(currentDate)).map((date, index) => {
                const isToday = date.toDateString() === new Date().toDateString();
                const dayName = weekDays[date.getDay()];
                
                return (
                  <div 
                    key={index} 
                    className={`flex-1 text-center p-3 border-r border-gray-100 dark:border-slate-700 ${
                      isToday ? 'bg-blue-50 dark:bg-slate-700 text-primary font-semibold' : 'text-gray-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-sm font-medium">{dayName}</div>
                    <div className={`text-lg ${isToday ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>
                      {date.getDate()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">
                      {date.toLocaleDateString([], { month: 'short' })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Week Grid */}
            <div className="max-h-[600px] overflow-y-auto">
              {renderWeekView()}
            </div>
          </>
        )}

        {view === "day" && (
          <>
            {/* Day Header */}
            <div className="text-center border-b border-gray-200 dark:border-slate-700 pb-4 mb-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {currentDate.toLocaleDateString([], { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric' 
                })}
              </div>
              <div className="text-sm text-gray-500 dark:text-slate-400">
                {getTasksForDate(currentDate).length} task{getTasksForDate(currentDate).length !== 1 ? 's' : ''} scheduled
              </div>
            </div>

            {/* Day Grid */}
            <div className="max-h-[700px] overflow-y-auto">
              {renderDayView()}
            </div>
          </>
        )}
      </CardContent>
      
      <TaskDetailModal 
        task={selectedTask}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTask(null);
        }}
      />
    </Card>
  );
}
