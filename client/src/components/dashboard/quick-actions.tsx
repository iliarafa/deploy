import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

export default function QuickActions() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [isVacancyModalOpen, setIsVacancyModalOpen] = useState(false);

  // Only admin and project_manager can view vacancies list
  const canViewVacancies = user?.role === "admin" || user?.role === "project_manager";

  const { data: vacancies = [], isLoading: vacanciesLoading } = useQuery<Vacancy[]>({
    queryKey: ["/api/vacancies"],
    enabled: !authLoading && canViewVacancies,
  });

  const activeVacancies = vacancies.filter(v => v.status === "vacant" || v.status === "pending");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button 
              className="w-full justify-start bg-primary hover:bg-blue-700 text-white"
              onClick={() => setIsTaskModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-3" />
              Create New Task
            </Button>
            
            <Button 
              className="w-full justify-start bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => setIsMaterialModalOpen(true)}
            >
              <Package className="w-4 h-4 mr-3" />
              Request Materials
            </Button>
            
            <Button 
              className="w-full justify-start bg-green-500 hover:bg-green-600 text-white"
              onClick={() => setIsInspectionModalOpen(true)}
            >
              <ClipboardCheck className="w-4 h-4 mr-3" />
              Schedule Inspection
            </Button>
            
            <Button 
              className="w-full justify-start bg-green-800 hover:bg-green-900 text-white"
              onClick={() => setIsVacancyModalOpen(true)}
            >
              <Home className="w-4 h-4 mr-3" />
              Record Vacancy
            </Button>
            
            <Button 
              className="w-full justify-start bg-yellow-500 hover:bg-yellow-600 text-white"
              onClick={() => setLocation("/issues")}
              data-testid="button-report-issue"
            >
              <AlertTriangle className="w-4 h-4 mr-3" />
              Report Issue
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vacancies List Card - only visible to admin/project_manager */}
      {canViewVacancies && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Building className="w-4 h-4" />
                Vacancies
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-7 px-2"
                onClick={() => setLocation("/vacancies")}
              >
                View All <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {vacanciesLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : activeVacancies.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">No active vacancies</p>
            ) : (
              <div className="space-y-2">
                {activeVacancies.slice(0, 5).map((vacancy) => (
                  <button
                    key={vacancy.id}
                    type="button"
                    onClick={() => setLocation("/vacancies")}
                    className="w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Home className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{vacancy.property}</p>
                        <p className="text-xs text-muted-foreground">Apt {vacancy.apartmentNumber}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      vacancy.status === "vacant" 
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" 
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }`}>
                      {vacancy.status}
                    </span>
                  </button>
                ))}
                {activeVacancies.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{activeVacancies.length - 5} more
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
