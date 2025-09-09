import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Hammer, Plus, Bell, User } from "lucide-react";
import TaskModal from "@/components/tasks/task-modal";
import VacancyModal from "@/components/vacancies/vacancy-modal";
import { useState } from "react";

export default function Header() {
  const [location] = useLocation();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isVacancyModalOpen, setIsVacancyModalOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location?.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Hammer className="text-primary text-xl" />
                <h1 className="text-xl font-bold text-gray-900">BuildSync</h1>
              </div>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              <Link href="/">
                <a className={`font-medium pb-2 ${
                  isActive("/") 
                    ? "text-primary border-b-2 border-primary" 
                    : "text-gray-500 hover:text-gray-700"
                }`}>
                  Calendar
                </a>
              </Link>
              <Link href="/tasks">
                <a className={`font-medium pb-2 ${
                  isActive("/tasks") 
                    ? "text-primary border-b-2 border-primary" 
                    : "text-gray-500 hover:text-gray-700"
                }`}>
                  Tasks
                </a>
              </Link>
              <Link href="/materials">
                <a className={`font-medium pb-2 ${
                  isActive("/materials") 
                    ? "text-primary border-b-2 border-primary" 
                    : "text-gray-500 hover:text-gray-700"
                }`}>
                  Materials
                </a>
              </Link>
              <Link href="/reports">
                <a className={`font-medium pb-2 ${
                  isActive("/reports") 
                    ? "text-primary border-b-2 border-primary" 
                    : "text-gray-500 hover:text-gray-700"
                }`}>
                  Reports
                </a>
              </Link>
            </nav>

            <div className="flex items-center space-x-4">
              <Button 
                className="bg-primary text-white hover:bg-blue-700"
                onClick={() => setIsTaskModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
              <Button 
                className="bg-green-800 text-white hover:bg-green-900"
                onClick={() => setIsVacancyModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Record Vacancy
              </Button>
              <Button variant="ghost" size="sm">
                <Bell className="w-5 h-5 text-gray-500" />
              </Button>
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <TaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
      />
      <VacancyModal 
        isOpen={isVacancyModalOpen} 
        onClose={() => setIsVacancyModalOpen(false)} 
      />
    </>
  );
}
