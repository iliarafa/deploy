import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, ClipboardCheck, AlertTriangle } from "lucide-react";
import { useState } from "react";
import TaskModal from "@/components/tasks/task-modal";
import MaterialRequestModal from "@/components/materials/material-request-modal";

export default function QuickActions() {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);

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
              onClick={() => {/* TODO: Implement schedule inspection */}}
            >
              <ClipboardCheck className="w-4 h-4 mr-3" />
              Schedule Inspection
            </Button>
            
            <Button 
              className="w-full justify-start bg-yellow-500 hover:bg-yellow-600 text-white"
              onClick={() => {/* TODO: Implement report issue */}}
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
    </>
  );
}
