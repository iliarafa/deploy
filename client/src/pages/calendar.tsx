import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import CalendarView from "@/components/calendar/calendar-view";
import CalendarControls from "@/components/calendar/calendar-controls";
import TaskList from "@/components/tasks/task-list";
import QuickActions from "@/components/dashboard/quick-actions";
import TaskCategories from "@/components/dashboard/task-categories";
import RecentActivity from "@/components/dashboard/recent-activity";
import NotificationSetup from "@/components/notifications/notification-setup";
import NotificationTest from "@/components/notifications/notification-test";
import PasswordChangeReminder from "@/components/notifications/password-change-reminder";
import { useState } from "react";
import TaskModal from "@/components/tasks/task-modal";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [searchTerm, setSearchTerm] = useState("");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [prefilledDate, setPrefilledDate] = useState<Date | undefined>();
  const [prefilledTime, setPrefilledTime] = useState<string | undefined>();

  const handleCreateTask = (date: Date, time?: string) => {
    setPrefilledDate(date);
    setPrefilledTime(time);
    setIsTaskModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setPrefilledDate(undefined);
    setPrefilledTime(undefined);
  };

  return (
    <div className="min-h-screen bg-neutral dark:bg-slate-900">
      <Header />
      <MobileNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-20 md:mb-0">
        <PasswordChangeReminder />
        
        <CalendarControls
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          view={view}
          setView={setView}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
        
        {/* Calendar and Quick Actions Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <div className="lg:col-span-3">
            <CalendarView
              currentDate={currentDate}
              view={view}
              searchTerm={searchTerm}
              onCreateTask={handleCreateTask}
            />
          </div>
          
          <div className="lg:col-span-1">
            <QuickActions />
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TaskList />
          </div>
          
          <div className="space-y-6">
            <NotificationSetup />
            <NotificationTest />
            <TaskCategories />
            <RecentActivity />
          </div>
        </div>
      </main>
      
      <TaskModal 
        isOpen={isTaskModalOpen} 
        onClose={handleCloseTaskModal}
        prefilledDate={prefilledDate}
        prefilledTime={prefilledTime}
      />
    </div>
  );
}
