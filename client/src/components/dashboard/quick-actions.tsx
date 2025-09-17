import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, ClipboardCheck, AlertTriangle, Home } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import TaskModal from "@/components/tasks/task-modal";
import MaterialRequestModal from "@/components/materials/material-request-modal";
import InspectionModal from "@/components/inspections/inspection-modal";
import VacancyModal from "@/components/vacancies/vacancy-modal";

export default function QuickActions() {
  const [, setLocation] = useLocation();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [isVacancyModalOpen, setIsVacancyModalOpen] = useState(false);

  return (
    <>
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
    </>
  );
}
