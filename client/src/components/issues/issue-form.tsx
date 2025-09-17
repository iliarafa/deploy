import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Phone, Mail, Smartphone } from "lucide-react";
import { insertIssueSchema } from "@shared/schema";

// Extend the shared schema with additional validation rules
const issueFormSchema = insertIssueSchema.extend({
  description: z.string().min(10, "Please provide a detailed description (at least 10 characters)"),
}).omit({ reportedBy: true }); // reportedBy is set automatically

type IssueFormData = z.infer<typeof issueFormSchema>;

interface IssueFormProps {
  onSubmit: (data: IssueFormData) => void;
  isLoading?: boolean;
}

export function IssueForm({ onSubmit, isLoading = false }: IssueFormProps) {
  const form = useForm<IssueFormData>({
    resolver: zodResolver(issueFormSchema),
    defaultValues: {
      description: "",
      urgency: "normal",
      category: "idle_elevator",
      property: "",
      contactMethod: "email",
    },
  });

  const handleSubmit = (data: IssueFormData) => {
    onSubmit(data);
  };

  const urgencyOptions = [
    { value: "emergency", label: "emergency", color: "text-red-600 font-bold" },
    { value: "high", label: "high", color: "text-orange-500 font-bold" },
    { value: "normal", label: "normal", color: "text-green-600 font-bold" },
  ];

  const categoryOptions = [
    { value: "idle_elevator", label: "Idle Elevator" },
    { value: "no_heat_hot_water", label: "No Heat/Hot Water" },
    { value: "no_electricity", label: "No electricity" },
  ];

  const contactOptions = [
    { value: "email", label: "Email notifications", icon: Mail },
    { value: "phone", label: "Phone call", icon: Phone },
    { value: "app", label: "In-app notifications", icon: Smartphone },
  ];

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Issue Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Issue Description *</Label>
            <Textarea
              id="description"
              data-testid="input-issue-description"
              placeholder="Describe the issue in detail..."
              className="min-h-[100px]"
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
            )}
          </div>

          {/* Urgency Level */}
          <div className="space-y-2">
            <Label htmlFor="urgency">Urgency Level *</Label>
            <Select onValueChange={(value) => form.setValue("urgency", value as any)} defaultValue="normal">
              <SelectTrigger data-testid="select-urgency" className="text-left w-full [&>span]:line-clamp-none [&>span]:whitespace-nowrap [&>span]:shrink-0">
                <SelectValue placeholder="Select urgency level" />
              </SelectTrigger>
              <SelectContent>
                {urgencyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className={`${option.color} capitalize`}>{option.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select onValueChange={(value) => form.setValue("category", value as any)} defaultValue="idle_elevator">
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="Choose Category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Property */}
          <div className="space-y-2">
            <Label htmlFor="property">Property</Label>
            <Select onValueChange={(value) => form.setValue("property", value)}>
              <SelectTrigger data-testid="select-property">
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="43-09 43">43-09 43</SelectItem>
                <SelectItem value="43-05 44">43-05 44</SelectItem>
                <SelectItem value="45-59 45">45-59 45</SelectItem>
                <SelectItem value="41-41 51">41-41 51</SelectItem>
                <SelectItem value="59-29 QB">59-29 QB</SelectItem>
                <SelectItem value="39-50 60">39-50 60</SelectItem>
              </SelectContent>
            </Select>
          </div>



          {/* Contact Method */}
          <div className="space-y-2">
            <Label htmlFor="contact">Preferred Contact Method for Updates</Label>
            <Select onValueChange={(value) => form.setValue("contactMethod", value as any)} defaultValue="email">
              <SelectTrigger data-testid="select-contact-method">
                <SelectValue placeholder="Select contact method" />
              </SelectTrigger>
              <SelectContent>
                {contactOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
            data-testid="button-submit-issue"
          >
            {isLoading ? "Submitting..." : "Submit Issue Report"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}