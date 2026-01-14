import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Clock, CheckCircle, Users, MapPin, Calendar, User } from "lucide-react";

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

export default function AdminIssuesPage() {
  const searchParams = useSearch();
  const urlParams = new URLSearchParams(searchParams);
  const initialUrgency = urlParams.get("urgency") || "all";
  
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>(initialUrgency);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Update filter when URL params change
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const urlUrgency = params.get("urgency");
    if (urlUrgency) {
      setUrgencyFilter(urlUrgency);
    }
  }, [searchParams]);

  // Check if user has access to this page
  if (!user || !["admin", "project_manager"].includes(user.role)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-8 px-4 pt-8">
        <div className="max-w-4xl mx-auto text-center">
          <AlertTriangle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  // Fetch all issues (admin endpoint)
  const { data: issues = [], isLoading } = useQuery<Issue[]>({
    queryKey: ["/api/admin/issues"],
  });

  // Update issue status mutation
  const updateIssueMutation = useMutation({
    mutationFn: ({ issueId, status, notes, assignedTo }: { issueId: number; status: string; notes?: string; assignedTo?: string }) => 
      apiRequest("PATCH", `/api/issues/${issueId}`, { status, notes, assignedTo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/issues"] });
      toast({
        title: "Issue Updated",
        description: "The issue status has been updated successfully.",
      });
      setSelectedIssue(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update issue. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleUpdateIssue = (issueId: number, status: string, notes?: string, assignedTo?: string) => {
    updateIssueMutation.mutate({ issueId, status, notes, assignedTo });
  };

  // Filter issues based on selected filters
  const filteredIssues = issues.filter(issue => {
    if (statusFilter !== "all" && issue.status !== statusFilter) return false;
    if (urgencyFilter !== "all" && issue.urgency !== urgencyFilter) return false;
    return true;
  });

  // Group issues by status for dashboard view
  const issueStats = {
    total: issues.length,
    pending: issues.filter(i => i.status === "pending").length,
    in_progress: issues.filter(i => i.status === "in_progress").length,
    resolved: issues.filter(i => i.status === "resolved").length,
    emergency: issues.filter(i => i.urgency === "emergency").length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-8 px-4 pt-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Issue Management</h1>
          <p className="text-muted-foreground">
            View and manage all property management issues
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{issueStats.total}</div>
              <div className="text-sm text-muted-foreground">Total Issues</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{issueStats.pending}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{issueStats.in_progress}</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{issueStats.resolved}</div>
              <div className="text-sm text-muted-foreground">Resolved</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{issueStats.emergency}</div>
              <div className="text-sm text-muted-foreground">Emergency</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by urgency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Urgencies</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Issues List */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading issues...</p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Issues Found</h3>
              <p className="text-muted-foreground">
                No issues match your current filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredIssues.map((issue) => {
              const UrgencyIcon = urgencyIcons[issue.urgency as keyof typeof urgencyIcons];
              
              return (
                <Card key={issue.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <UrgencyIcon className="w-4 h-4" />
                        <Badge variant={urgencyColors[issue.urgency as keyof typeof urgencyColors]}>
                          {issue.urgency}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {issue.category.replace('_', ' ')}
                        </Badge>
                        <Badge variant={statusColors[issue.status as keyof typeof statusColors]}>
                          {issue.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <h3 className="font-semibold text-lg mb-2">{issue.description}</h3>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        {issue.property && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>Property: {issue.property}</span>
                            {issue.apartmentNumber && <span> (Unit {issue.apartmentNumber})</span>}
                          </div>
                        )}
                        
                        {issue.affectedParties && issue.affectedParties.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>Affected: {issue.affectedParties.join(', ')}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Reported: {formatDate(issue.createdAt)}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>Reported by: User #{issue.reportedBy}</span>
                        </div>
                        
                        {issue.assignedTo && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>Assigned to: {issue.assignedTo}</span>
                          </div>
                        )}
                        
                        {issue.preferredTimeline && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Timeline: {issue.preferredTimeline.replace('_', ' ')}</span>
                          </div>
                        )}

                        {issue.notes && (
                          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                            <strong>Notes:</strong> {issue.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedIssue(issue)}
                        data-testid={`button-manage-issue-${issue.id}`}
                      >
                        Manage
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Issue Management Modal/Panel */}
        {selectedIssue && (
          <Card className="fixed inset-4 md:inset-8 z-50 bg-white dark:bg-gray-800 shadow-lg overflow-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Manage Issue #{selectedIssue.id}</CardTitle>
                <Button variant="outline" onClick={() => setSelectedIssue(null)}>
                  Close
                </Button>
              </div>
              <CardDescription>{selectedIssue.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <IssueUpdateForm
                issue={selectedIssue}
                onUpdate={handleUpdateIssue}
                isLoading={updateIssueMutation.isPending}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Issue Update Form Component
function IssueUpdateForm({ 
  issue, 
  onUpdate, 
  isLoading 
}: { 
  issue: Issue; 
  onUpdate: (id: number, status: string, notes?: string, assignedTo?: string) => void;
  isLoading: boolean;
}) {
  const [status, setStatus] = useState(issue.status);
  const [notes, setNotes] = useState(issue.notes || "");
  const [assignedTo, setAssignedTo] = useState(issue.assignedTo || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(issue.id, status, notes, assignedTo);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Status</label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Assigned To</label>
        <input
          type="text"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          placeholder="Enter assignee name"
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Notes</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add management notes..."
          rows={4}
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Updating..." : "Update Issue"}
      </Button>
    </form>
  );
}