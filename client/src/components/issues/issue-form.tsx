import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertCircle, Clock, Phone, Mail, Smartphone } from "lucide-react";
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
      category: "other",
      property: "",
      apartmentNumber: "",
      affectedParties: [],
      preferredTimeline: "no_timeline",
      contactMethod: "email",
    },
  });

  const handleSubmit = (data: IssueFormData) => {
    onSubmit(data);
  };

  const urgencyOptions = [
    { value: "emergency", label: "🔴 Emergency", description: "Immediate safety/security concerns" },
    { value: "high", label: "🟡 High", description: "Affects daily operations" },
    { value: "normal", label: "🟢 Normal", description: "Routine maintenance/non-urgent" },
  ];

  const categoryOptions = [
    { value: "maintenance", label: "Maintenance & Repairs" },
    { value: "tenant_relations", label: "Tenant Relations" },
    { value: "security", label: "Security & Safety" },
    { value: "administrative", label: "Administrative" },
    { value: "utilities", label: "Utilities (water, electric, etc.)" },
    { value: "other", label: "Other" },
  ];

  const timelineOptions = [
    { value: "asap", label: "ASAP (same day)" },
    { value: "week", label: "Within 1 week" },
    { value: "month", label: "Within 1 month" },
    { value: "no_timeline", label: "No specific timeline" },
  ];

  const contactOptions = [
    { value: "email", label: "Email notifications", icon: Mail },
    { value: "phone", label: "Phone call", icon: Phone },
    { value: "app", label: "In-app notifications", icon: Smartphone },
  ];

  const affectedPartiesOptions = [
    { value: "tenants", label: "Tenants" },
    { value: "staff", label: "Staff" },
    { value: "contractors", label: "Contractors" },
    { value: "public", label: "General Public" },
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
              <SelectTrigger data-testid="select-urgency">
                <SelectValue placeholder="Select urgency level" />
              </SelectTrigger>
              <SelectContent>
                {urgencyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select onValueChange={(value) => form.setValue("category", value as any)} defaultValue="other">
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="Select category" />
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

          {/* Property and Apartment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="property">Property Address</Label>
              <Select onValueChange={(value) => form.setValue("property", value)}>
                <SelectTrigger data-testid="select-property">
                  <SelectValue placeholder="Select property address" />
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
            <div className="space-y-2">
              <Label htmlFor="apartmentNumber">Unit/Apartment Number</Label>
              <Input
                id="apartmentNumber"
                data-testid="input-apartment"
                placeholder="Unit number (if applicable)"
                {...form.register("apartmentNumber")}
              />
            </div>
          </div>

          {/* Affected Parties */}
          <div className="space-y-2">
            <Label>Affected Parties</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {affectedPartiesOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={option.value}
                    data-testid={`checkbox-affected-${option.value}`}
                    onCheckedChange={(checked) => {
                      const currentParties = form.getValues("affectedParties") || [];
                      if (checked) {
                        form.setValue("affectedParties", [...currentParties, option.value as any]);
                      } else {
                        form.setValue("affectedParties", currentParties.filter(p => p !== option.value));
                      }
                    }}
                  />
                  <Label
                    htmlFor={option.value}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Preferred Timeline */}
          <div className="space-y-2">
            <Label htmlFor="timeline" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Preferred Resolution Timeline
            </Label>
            <Select onValueChange={(value) => form.setValue("preferredTimeline", value as any)} defaultValue="no_timeline">
              <SelectTrigger data-testid="select-timeline">
                <SelectValue placeholder="Select preferred timeline" />
              </SelectTrigger>
              <SelectContent>
                {timelineOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
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