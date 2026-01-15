import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema, type Task } from "@shared/schema";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import TaskStatusUpdate from "./task-status-update";
import { format } from "date-fns";
import { useAuth } from "@/contexts/auth-context";

interface TaskEditModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

const taskFormSchema = insertTaskSchema.extend({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  multiDay: z.boolean().optional(),
  recurrenceType: z.enum(['none', 'daily', 'weekly', 'bi-weekly', 'monthly', 'yearly']).optional(),
  recurrenceInterval: z.number().min(1).max(365).optional(),
  recurrenceEndDays: z.number().min(1).max(365).nullable().optional(),
  openEnded: z.boolean().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

export default function TaskEditModal({ task, isOpen, onClose }: TaskEditModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Only admins and project managers can see/assign users
  const canAssignUsers = currentUser?.role === 'admin' || currentUser?.role === 'project_manager';

  // Fetch users for assignment dropdown (only for admins/PMs)
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: isOpen && isAuthenticated && !authLoading && canAssignUsers,
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "inspection",
      priority: "standard",
      status: "pending",
      location: "",
      apartmentNumber: "",
      assignedTo: "",
      startDate: "",
      endDate: "",
      multiDay: false,
      recurrenceType: 'none',
      recurrenceInterval: 1,
      recurrenceEndDays: null,
      openEnded: true,
    },
  });

  // Update form when task changes
  useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        description: task.description || "",
        category: task.category,
        priority: task.priority,
        status: task.status,
        location: task.location || "",
        apartmentNumber: task.apartmentNumber || "",
        assignedTo: task.assignedTo || "",
        startDate: format(new Date(task.startDate), "yyyy-MM-dd'T'HH:mm"),
        endDate: task.endDate ? format(new Date(task.endDate), "yyyy-MM-dd'T'HH:mm") : "",
        multiDay: Boolean(task.endDate),
        recurrenceType: (task.recurrenceType as 'none' | 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'yearly') || 'none',
        recurrenceInterval: task.recurrenceInterval || 1,
        recurrenceEndDays: task.recurrenceEndDays || null,
        openEnded: task.recurrenceEndDays === null || task.recurrenceEndDays === undefined,
      });
    }
  }, [task, form]);

  const updateTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const startDate = new Date(data.startDate);
      const isRecurring = data.recurrenceType && data.recurrenceType !== 'none';
      
      // Calculate next due date for recurring tasks
      let nextDueDate: Date | undefined;
      if (isRecurring && data.recurrenceType && data.recurrenceInterval) {
        nextDueDate = new Date(startDate);
        const interval = data.recurrenceInterval;
        
        switch (data.recurrenceType) {
          case 'daily':
            nextDueDate.setDate(nextDueDate.getDate() + interval);
            break;
          case 'weekly':
            nextDueDate.setDate(nextDueDate.getDate() + (7 * interval));
            break;
          case 'bi-weekly':
            nextDueDate.setDate(nextDueDate.getDate() + (14 * interval));
            break;
          case 'monthly':
            nextDueDate.setMonth(nextDueDate.getMonth() + interval);
            break;
          case 'yearly':
            nextDueDate.setFullYear(nextDueDate.getFullYear() + interval);
            break;
        }
      }

      const taskData = {
        ...data,
        startDate,
        endDate: data.endDate ? new Date(data.endDate) : null,
        isRecurringTemplate: isRecurring || false,
        nextDueDate: nextDueDate,
        recurrenceType: isRecurring ? data.recurrenceType : undefined,
        recurrenceInterval: isRecurring ? data.recurrenceInterval : undefined,
        recurrenceEndDays: isRecurring && !data.openEnded ? data.recurrenceEndDays : null,
      };
      return apiRequest("PUT", `/api/tasks/${task?.id}`, taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.errors?.[0]?.message || "Failed to update task. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TaskFormData) => {
    updateTaskMutation.mutate(data);
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task: {task.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status Update Section */}
          <div className="border-b pb-4">
            <TaskStatusUpdate task={task} />
          </div>

          {/* Edit Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter task title" {...field} data-testid="input-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="inspection">Inspection</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="delivery">Delivery</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="repair">Repair</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-priority">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date & Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} data-testid="input-start-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date & Time (Optional)</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} data-testid="input-end-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-location">
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="43">Location 43</SelectItem>
                          <SelectItem value="44">Location 44</SelectItem>
                          <SelectItem value="45">Location 45</SelectItem>
                          <SelectItem value="51">Location 51</SelectItem>
                          <SelectItem value="59">Location 59</SelectItem>
                          <SelectItem value="60">Location 60</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="apartmentNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apartment Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter apartment number (e.g., 4A, 201)" 
                          {...field} 
                          value={field.value || ""}
                          data-testid="input-apartment-number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {canAssignUsers && (
                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned To</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-assigned-to">
                            <SelectValue placeholder="Select team member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.map((user: any) => (
                            <SelectItem key={user.id} value={user.username}>
                              {user.firstName && user.lastName 
                                ? `${user.firstName} ${user.lastName} (${user.username})`
                                : user.username
                              }
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="recurrenceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recurrence</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-recurrence-type">
                            <SelectValue placeholder="Select recurrence type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No recurrence</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("recurrenceType") !== "none" && form.watch("recurrenceType") && (
                  <FormField
                    control={form.control}
                    name="recurrenceInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Repeat every {field.value || 1} {
                            form.watch("recurrenceType") === "daily" ? "day(s)" :
                            form.watch("recurrenceType") === "weekly" ? "week(s)" :
                            form.watch("recurrenceType") === "bi-weekly" ? "bi-week(s)" :
                            form.watch("recurrenceType") === "monthly" ? "month(s)" :
                            form.watch("recurrenceType") === "yearly" ? "year(s)" : ""
                          }
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="365" 
                            placeholder="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            value={field.value || 1}
                            data-testid="input-recurrence-interval"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {form.watch("recurrenceType") !== "none" && form.watch("recurrenceType") && (
                  <div className="space-y-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                    <FormField
                      control={form.control}
                      name="openEnded"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-open-ended"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Open-ended (no end date)
                            </FormLabel>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Task will appear daily for manual activation
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />

                    {!form.watch("openEnded") && (
                      <FormField
                        control={form.control}
                        name="recurrenceEndDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End after (days)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                max="365" 
                                placeholder="30"
                                onChange={(e) => field.onChange(parseInt(e.target.value) || null)}
                                value={field.value || ""}
                                data-testid="input-recurrence-end-days"
                              />
                            </FormControl>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Stop recurring after this many days from start
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Task details..." 
                        rows={3} 
                        {...field} 
                        value={field.value || ""} 
                        data-testid="textarea-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateTaskMutation.isPending}
                  className="bg-primary hover:bg-blue-700"
                  data-testid="button-save-task"
                >
                  {updateTaskMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}