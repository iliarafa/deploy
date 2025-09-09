import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema } from "@shared/schema";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface InspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const inspectionFormSchema = insertTaskSchema.extend({
  startDate: z.string().min(1, "Inspection date is required"),
  inspectionType: z.string().min(1, "Inspection type is required"),
});

type InspectionFormData = z.infer<typeof inspectionFormSchema>;

export default function InspectionModal({ isOpen, onClose }: InspectionModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InspectionFormData>({
    resolver: zodResolver(inspectionFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "inspection",
      priority: "standard",
      status: "pending",
      location: "",
      assignedTo: "",
      startDate: "",
      inspectionType: "",
    },
  });

  const createInspectionMutation = useMutation({
    mutationFn: async (data: InspectionFormData) => {
      const inspectionData = {
        ...data,
        title: `${data.inspectionType} Inspection - Location ${data.location}`,
        description: `${data.inspectionType} inspection scheduled for location ${data.location}. ${data.description || ''}`.trim(),
        startDate: new Date(data.startDate),
      };
      return apiRequest("POST", "/api/tasks", inspectionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Inspection scheduled successfully",
      });
      form.reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to schedule inspection",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InspectionFormData) => {
    createInspectionMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Inspection</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="inspectionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inspection Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-inspection-type">
                        <SelectValue placeholder="Select inspection type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="elevator">Elevator</SelectItem>
                      <SelectItem value="boiler">Boiler</SelectItem>
                      <SelectItem value="local law">Local Law</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-location">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="43">43</SelectItem>
                      <SelectItem value="44">44</SelectItem>
                      <SelectItem value="45">45</SelectItem>
                      <SelectItem value="51">51</SelectItem>
                      <SelectItem value="59">59</SelectItem>
                      <SelectItem value="60">60</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-assigned-to">
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="German">German</SelectItem>
                      <SelectItem value="Marcelo">Marcelo</SelectItem>
                      <SelectItem value="Luis C">Luis C</SelectItem>
                      <SelectItem value="Jose">Jose</SelectItem>
                      <SelectItem value="Miguel">Miguel</SelectItem>
                      <SelectItem value="Luis G">Luis G</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inspection Date & Time</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value || "standard"}>
                    <FormControl>
                      <SelectTrigger>
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

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Special requirements, permit numbers, etc..." rows={3} {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createInspectionMutation.isPending}
                className="bg-green-500 hover:bg-green-600"
                data-testid="button-schedule-inspection"
              >
                {createInspectionMutation.isPending ? "Scheduling..." : "Schedule Inspection"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}