import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IssueForm } from "@/components/issues/issue-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CheckCircle, Users, MapPin, Calendar } from "lucide-react";

interface Issue {
  id: number;
  description: string;
  urgency: string;
  category: string;
  property?: string;
  apartmentNumber?: string;
  affectedParties?: string[];
  preferredTimeline?: string;
  contactMethod?: string;
  attachments?: string[];
  status: string;
  reportedBy: number;
  assignedTo?: string;
  createdAt: string;
  resolvedAt?: string;
  notes?: string;
}

const urgencyColors = {
  emergency: "destructive",
  high: "secondary",
  normal: "outline",
} as const;

const urgencyIcons = {
  emergency: AlertTriangle,
  high: AlertTriangle,
  normal: CheckCircle,
} as const;

const statusColors = {
  pending: "secondary",
  acknowledged: "default",
  in_progress: "default",
  resolved: "outline",
  closed: "outline",
} as const;

export default function IssuesPage() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch user's issues
  const { data: issues = [], isLoading } = useQuery<Issue[]>({
    queryKey: ["/api/issues"],
  });

  // Create issue mutation
  const createIssueMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/issues", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
      toast({
        title: "Issue Reported",
        description: "Your issue has been successfully submitted for review.",
      });
      setShowForm(false);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getUrgencyDisplay = (urgency: string) => {
    const colors = {
      emergency: "🔴 Emergency",
      high: "🟡 High",
      normal: "🟢 Normal",
    };
    return colors[urgency as keyof typeof colors] || urgency;
  };

  const getCategoryDisplay = (category: string) => {
    const categories = {
      maintenance: "Maintenance & Repairs",
      tenant_relations: "Tenant Relations",
      security: "Security & Safety",
      administrative: "Administrative",
      utilities: "Utilities",
      other: "Other",
    };
    return categories[category as keyof typeof categories] || category;
  };

  const getTimelineDisplay = (timeline?: string) => {
    const timelines = {
      asap: "ASAP",
      week: "Within 1 week",
      month: "Within 1 month",
      no_timeline: "No specific timeline",
    };
    return timeline ? timelines[timeline as keyof typeof timelines] || timeline : "Not specified";
  };

  if (showForm) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="mb-4">
          <Button
            variant="outline"
            onClick={() => setShowForm(false)}
            data-testid="button-back-to-issues"
          >
            ← Back to Issues
          </Button>
        </div>
        <IssueForm
          onSubmit={handleSubmitIssue}
          isLoading={createIssueMutation.isPending}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Issue Reporting</h1>
          <p className="text-muted-foreground">
            Report and track property management issues
          </p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          data-testid="button-report-issue"
        >
          Report New Issue
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : issues.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Issues Reported</h3>
            <p className="text-muted-foreground mb-4">
              You haven't reported any issues yet.
            </p>
            <Button 
              onClick={() => setShowForm(true)}
              data-testid="button-report-first-issue"
            >
              Report Your First Issue
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => {
            const UrgencyIcon = urgencyIcons[issue.urgency as keyof typeof urgencyIcons];
            
            return (
              <Card key={issue.id} data-testid={`card-issue-${issue.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        {UrgencyIcon && <UrgencyIcon className="h-5 w-5" />}
                        Issue #{issue.id}
                        <Badge 
                          variant={urgencyColors[issue.urgency as keyof typeof urgencyColors]}
                          data-testid={`badge-urgency-${issue.id}`}
                        >
                          {getUrgencyDisplay(issue.urgency)}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(issue.createdAt)}
                        </span>
                        <Badge 
                          variant={statusColors[issue.status as keyof typeof statusColors]}
                          data-testid={`badge-status-${issue.id}`}
                        >
                          {issue.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-sm" data-testid={`text-description-${issue.id}`}>
                      {issue.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Category:</span>
                      <p className="text-muted-foreground">
                        {getCategoryDisplay(issue.category)}
                      </p>
                    </div>

                    {issue.property && (
                      <div>
                        <span className="font-medium flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          Property:
                        </span>
                        <p className="text-muted-foreground">
                          {issue.property}
                          {issue.apartmentNumber && ` - Unit ${issue.apartmentNumber}`}
                        </p>
                      </div>
                    )}

                    <div>
                      <span className="font-medium flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Timeline:
                      </span>
                      <p className="text-muted-foreground">
                        {getTimelineDisplay(issue.preferredTimeline)}
                      </p>
                    </div>

                    {issue.affectedParties && issue.affectedParties.length > 0 && (
                      <div>
                        <span className="font-medium flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          Affected:
                        </span>
                        <p className="text-muted-foreground">
                          {issue.affectedParties.join(", ")}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}