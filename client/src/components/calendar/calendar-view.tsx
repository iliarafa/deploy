import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { type Task } from "@shared/schema";
import { getDaysInMonth, getFirstDayOfMonth } from "@/lib/calendar-utils";
import { formatDate } from "@/lib/date-utils";
import { getCategoryColor } from "@/lib/calendar-utils";

interface CalendarViewProps {
  currentDate: Date;
  view: "month" | "week" | "day";
  searchTerm: string;
}

export default function CalendarView({ 
  currentDate, 
  view, 
  searchTerm 
}: CalendarViewProps) {
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

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
          className={`h-24 md:h-32 border rounded-lg p-2 hover:bg-gray-50 cursor-pointer ${
            isToday ? 'bg-blue-50 border-primary' : 'border-gray-200'
          }`}
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
            {day}
          </div>
          <div className="space-y-1">
            {tasksForDay.slice(0, 3).map((task, index) => (
              <div 
                key={task.id} 
                className={`text-xs px-2 py-1 rounded truncate ${getCategoryColor(task.category)}`}
              >
                {task.title}
              </div>
            ))}
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

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="text-gray-500">Loading calendar...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
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
          <div className="text-center py-8">
            <div className="text-gray-500">Week view coming soon...</div>
          </div>
        )}

        {view === "day" && (
          <div className="text-center py-8">
            <div className="text-gray-500">Day view coming soon...</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
