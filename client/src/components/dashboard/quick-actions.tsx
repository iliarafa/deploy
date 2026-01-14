import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Package, ClipboardCheck, AlertTriangle, Home, ChevronRight, Building } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import TaskModal from "@/components/tasks/task-modal";
import MaterialRequestModal from "@/components/materials/material-request-modal";
import InspectionModal from "@/components/inspections/inspection-modal";
import VacancyModal from "@/components/vacancies/vacancy-modal";
import { type Vacancy } from "@shared/schema";
import { differenceInDays } from "date-fns";

export default function QuickActions() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [isVacancyModalOpen, setIsVacancyModalOpen] = useState(false);

  const canViewVacancies = user?.role === "admin" || user?.role === "project_manager";

  const { data: vacancies = [], isLoading: vacanciesLoading } = useQuery<Vacancy[]>({
    queryKey: ["/api/vacancies"],
    enabled: !authLoading && canViewVacancies,
  });

  const activeVacancies = vacancies.filter(v => v.status === "vacant" || v.status === "pending");

  const actionItems = [
    { 
      id: "task", 
      label: "New Task", 
      icon: Plus, 
      onClick: () => setIsTaskModalOpen(true) 
    },
    { 
      id: "materials", 
      label: "Request Materials", 
      icon: Package, 
      onClick: () => setIsMaterialModalOpen(true) 
    },
    { 
      id: "inspection", 
      label: "Schedule Inspection", 
      icon: ClipboardCheck, 
      onClick: () => setIsInspectionModalOpen(true) 
    },
    { 
      id: "issue", 
      label: "Report Issue", 
      icon: AlertTriangle, 
      onClick: () => setLocation("/issues"),
      testId: "button-report-issue"
    },
  ];

  return (
    <div className="space-y-4">
      {/* Quick Actions - 2x2 Grid */}
      <Card className="bg-white dark:bg-slate-800 shadow-sm border-gray-100 dark:border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-gray-900 dark:text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-3">
            {actionItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                data-testid={item.testId}
                className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-100 dark:border-slate-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-slate-600 transition-all group"
              >
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg mb-2 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                  <item.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Vacancies Table - Admin/PM Only */}
      {canViewVacancies && (
        <Card className="bg-white dark:bg-slate-800 shadow-sm border-gray-100 dark:border-slate-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-gray-900 dark:text-white">
                <Building className="w-4 h-4 text-blue-600" />
                Vacancies
              </CardTitle>
              <button 
                onClick={() => setLocation("/vacancies")}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center"
              >
                View All <ChevronRight className="w-3 h-3 ml-0.5" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {vacanciesLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : activeVacancies.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No active vacancies</p>
            ) : (
              <div className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-700">
                      <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                      <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                    {activeVacancies.slice(0, 4).map((vacancy) => {
                      const daysVacant = vacancy.startDate 
                        ? differenceInDays(new Date(), new Date(vacancy.startDate))
                        : 0;
                      return (
                        <tr 
                          key={vacancy.id}
                          onClick={() => setLocation("/vacancies")}
                          className="hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                        >
                          <td className="py-2">
                            <div className="font-medium text-gray-900 dark:text-white">{vacancy.apartmentNumber}</div>
                            <div className="text-xs text-gray-500 truncate max-w-[100px]">{vacancy.property}</div>
                          </td>
                          <td className="py-2">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              vacancy.status === "vacant" 
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" 
                                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            }`}>
                              {vacancy.status}
                            </span>
                          </td>
                          <td className="py-2 text-right">
                            <span className="text-gray-600 dark:text-gray-400">{daysVacant}d</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {activeVacancies.length > 4 && (
                  <p className="text-xs text-gray-400 text-center pt-2 border-t border-gray-50 dark:border-slate-700 mt-2">
                    +{activeVacancies.length - 4} more units
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <TaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
      />
      
      <MaterialRequestModal 
        isOpen={isMaterialModalOpen} 
        onClose={() => setIsMaterialModalOpen(false)} 
      />
      
      <InspectionModal 
        isOpen={isInspectionModalOpen} 
        onClose={() => setIsInspectionModalOpen(false)} 
      />
      
      <VacancyModal 
        isOpen={isVacancyModalOpen} 
        onClose={() => setIsVacancyModalOpen(false)} 
      />
    </div>
  );
}
