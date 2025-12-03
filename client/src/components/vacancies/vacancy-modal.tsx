import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ObjectUploader } from "@/components/ui/object-uploader";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVacancySchema } from "@shared/schema";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format } from "date-fns";

interface VacancyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const vacancyFormSchema = insertVacancySchema.extend({
  property: z.string().min(1, "Property is required"),
  apartmentNumber: z.string().min(1, "Apartment number is required"),
});

type VacancyFormData = z.infer<typeof vacancyFormSchema>;

export default function VacancyModal({ isOpen, onClose }: VacancyModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  const form = useForm<VacancyFormData>({
    resolver: zodResolver(vacancyFormSchema),
    defaultValues: {
      property: "",
      apartmentNumber: "",
      startDate: undefined,
      endDate: undefined,
      images: [],
      notes: "",
      status: "vacant",
    },
  });

  const createVacancyMutation = useMutation({
    mutationFn: async (data: VacancyFormData) => {
      const vacancyData = {
        ...data,
        images: uploadedImages,
      };
      return apiRequest("POST", "/api/vacancies", vacancyData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vacancies"] });
      toast({
        title: "Success",
        description: "Vacancy record created successfully",
      });
      form.reset();
      setUploadedImages([]);
      onClose();
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.errors?.[0]?.message || "Failed to create vacancy record. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = async () => {
    const response = await apiRequest('POST', '/api/objects/upload');
    const data = await response.json() as { uploadURL: string };
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = (result: { successful: { uploadURL?: string }[] }) => {
    if (result.successful && result.successful.length > 0) {
      const imageUrls = result.successful.map(file => file.uploadURL || '');
      setUploadedImages(prev => [...prev, ...imageUrls.filter(url => url)]);
      
      // Update images in backend with proper ACL
      imageUrls.forEach(async (imageUrl) => {
        if (imageUrl) {
          try {
            await apiRequest("PUT", "/api/vacancy-images", { imageURL: imageUrl });
          } catch (error) {
            console.error('Error updating image ACL:', error);
          }
        }
      });
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data: VacancyFormData) => {
    createVacancyMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Vacancy</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="property"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-property">
                        <SelectValue placeholder="Select property" />
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
              name="apartmentNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apartment Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 3A, 401, Penthouse" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="datetime-local" 
                      {...field}
                      value={field.value ? format(new Date(field.value), "yyyy-MM-dd'T'HH:mm") : ""}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                      data-testid="input-start-date"
                    />
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
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="datetime-local" 
                      {...field}
                      value={field.value ? format(new Date(field.value), "yyyy-MM-dd'T'HH:mm") : ""}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                      data-testid="input-end-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Images</FormLabel>
              <ObjectUploader
                maxNumberOfFiles={10}
                maxFileSize={10485760}
                onGetUploadParameters={handleImageUpload}
                onComplete={handleUploadComplete}
                buttonClassName="w-full"
              >
                📷 Add Images
              </ObjectUploader>
              
              {uploadedImages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">{uploadedImages.length} image(s) uploaded:</p>
                  <div className="space-y-1">
                    {uploadedImages.map((image, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                        <span className="truncate flex-1">Image {index + 1}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeImage(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Condition notes, repairs needed, special circumstances..." 
                      rows={3} 
                      {...field} 
                      value={field.value || ""} 
                    />
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
                disabled={createVacancyMutation.isPending}
                className="bg-green-800 hover:bg-green-900"
                data-testid="button-record-vacancy"
              >
                {createVacancyMutation.isPending ? "Recording..." : "Record Vacancy"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}