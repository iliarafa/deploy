import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { IssueForm } from "@/components/issues/issue-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function IssuesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Create issue mutation
  const createIssueMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/issues", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
      toast({
        title: "Issue Reported",
        description: "Your issue has been successfully submitted for review.",
      });
      setLocation("/");
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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Header />
      <MobileNav />
      
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mb-20 md:mb-0">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation("/")}
            className="mb-4 -ml-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-page-title">
                Report an Issue
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Submit a property issue that needs attention
              </p>
            </div>
          </div>
        </div>
        
        <IssueForm 
          onSubmit={handleSubmitIssue} 
          isLoading={createIssueMutation.isPending}
        />
      </main>
    </div>
  );
}