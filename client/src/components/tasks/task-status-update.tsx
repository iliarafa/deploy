import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Task } from "@shared/schema";
import { CheckCircle, Clock, PlayCircle } from "lucide-react";

interface TaskStatusUpdateProps {
  task: Task;
  compact?: boolean;
}

const statusOptions = [
  { value: "pending", label: "Pending", icon: Clock, color: "bg-yellow-100 text-yellow-800" },
  { value: "in-progress", label: "In Progress", icon: PlayCircle, color: "bg-blue-100 text-blue-800" },
  { value: "completed", label: "Completed", icon: CheckCircle, color: "bg-green-100 text-green-800" },
];

export default function TaskStatusUpdate({ task, compact = false }: TaskStatusUpdateProps) {
  const [selectedStatus, setSelectedStatus] = useState(task.status);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return apiRequest("PUT", `/api/tasks/${task.id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/worker-tasks"] });
      toast({
        title: "Status Updated",
        description: `Task status changed to ${selectedStatus}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Could not update task status",
        variant: "destructive",
      });
      setSelectedStatus(task.status); // Reset to original status
    },
  });

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus);
    updateStatusMutation.mutate(newStatus);
  };

  const currentStatusOption = statusOptions.find(opt => opt.value === selectedStatus);
  const StatusIcon = currentStatusOption?.icon || Clock;

  if (compact) {
    return (
      <Select value={selectedStatus} onValueChange={handleStatusChange} disabled={updateStatusMutation.isPending}>
        <SelectTrigger className="w-32" data-testid="status-select-compact">
          <div className="flex items-center gap-2">
            <StatusIcon className="w-4 h-4" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => {
            const Icon = option.icon;
            return (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {option.label}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Badge className={currentStatusOption?.color} data-testid="current-status-badge">
          <StatusIcon className="w-3 h-3 mr-1" />
          {currentStatusOption?.label}
        </Badge>
        {updateStatusMutation.isPending && (
          <div className="text-sm text-gray-500">Updating...</div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Update Status</label>
        <Select value={selectedStatus} onValueChange={handleStatusChange} disabled={updateStatusMutation.isPending}>
          <SelectTrigger data-testid="status-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => {
              const Icon = option.icon;
              return (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {option.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}