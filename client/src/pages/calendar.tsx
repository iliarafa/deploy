import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import CalendarView from "@/components/calendar/calendar-view";
import CalendarControls from "@/components/calendar/calendar-controls";
import TaskList from "@/components/tasks/task-list";
import QuickActions from "@/components/dashboard/quick-actions";
import TaskCategories from "@/components/dashboard/task-categories";
import RecentActivity from "@/components/dashboard/recent-activity";
import { useState } from "react";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="min-h-screen bg-neutral">
      <Header />
      <MobileNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-20 md:mb-0">
        <CalendarControls
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          view={view}
          setView={setView}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
        
        <CalendarView
          currentDate={currentDate}
          view={view}
          searchTerm={searchTerm}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TaskList />
          </div>
          
          <div className="space-y-6">
            <QuickActions />
            <TaskCategories />
            <RecentActivity />
          </div>
        </div>
      </main>
    </div>
  );
}
