import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IssueForm } from "@/components/issues/issue-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function IssuesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Create issue mutation
  const createIssueMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/issues", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
      toast({
        title: "Issue Reported",
        description: "Your issue has been successfully submitted for review.",
      });
      // Reset form after successful submission
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit issue. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitIssue = (data: any) => {
    createIssueMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-8 px-4 pt-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="font-bold text-[26px]" data-testid="text-page-title">Report an Issue</h1>
          <p className="text-muted-foreground">
            Submit a property management issue that needs attention
          </p>
        </div>
        
        <IssueForm 
          onSubmit={handleSubmitIssue} 
          isLoading={createIssueMutation.isPending}
        />
      </div>
    </div>
  );
}