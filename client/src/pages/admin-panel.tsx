import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UserCheck, UserX, Users, Clock, Shield, Edit } from "lucide-react";
import { USER_ROLES } from "@shared/roles";
import type { 
  UserRegistrationRequest, 
  User,
  ReviewRegistrationRequest,
  UpdateUser
} from "@shared/schema";

export default function AdminPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<UserRegistrationRequest | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [assignedRole, setAssignedRole] = useState<string>('');
  const [reviewNotes, setReviewNotes] = useState('');

  // Fetch registration requests
  const { data: registrationRequests, isLoading: requestsLoading } = useQuery<UserRegistrationRequest[]>({
    queryKey: ['/api/admin/registration-requests'],
  });

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });

  // Review registration request mutation
  const reviewMutation = useMutation({
    mutationFn: async (data: { id: number; review: ReviewRegistrationRequest }) => {
      return await apiRequest('PUT', `/api/admin/registration-requests/${data.id}/review`, data.review);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/registration-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Success",
        description: "Registration request reviewed successfully",
      });
      setSelectedRequest(null);
      resetReviewForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to review registration request",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: { id: number; updates: UpdateUser }) => {
      return await apiRequest('PUT', `/api/admin/users/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setSelectedUser(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    },
  });

  // Deactivate user mutation
  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest('DELETE', `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Success",
        description: "User deactivated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to deactivate user",
        variant: "destructive",
      });
    },
  });

  const resetReviewForm = () => {
    setReviewStatus('approved');
    setAssignedRole('');
    setReviewNotes('');
  };

  const handleReviewSubmit = () => {
    if (!selectedRequest) return;

    const reviewData: ReviewRegistrationRequest = {
      status: reviewStatus,
      reviewNotes: reviewNotes || undefined,
      assignedRole: reviewStatus === 'approved' ? assignedRole || selectedRequest.requestedRole : undefined,
    };

    reviewMutation.mutate({
      id: selectedRequest.id,
      review: reviewData,
    });
  };

  const handleUserUpdate = () => {
    if (!selectedUser) return;

    const updates: UpdateUser = {
      role: (document.getElementById('user-role') as HTMLInputElement)?.value || selectedUser.role,
      isActive: (document.getElementById('user-active') as HTMLInputElement)?.checked !== false,
    };

    updateUserMutation.mutate({
      id: selectedUser.id,
      updates,
    });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      approved: "default",
      rejected: "destructive"
    };
    
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-red-100 text-red-800",
      project_manager: "bg-blue-100 text-blue-800",
      supervisor: "bg-green-100 text-green-800",
      worker: "bg-gray-100 text-gray-800",
      inspector: "bg-purple-100 text-purple-800",
      client: "bg-orange-100 text-orange-800"
    };
    
    return (
      <Badge className={colors[role] || "bg-gray-100 text-gray-800"}>
        {role.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="admin-panel">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" data-testid="admin-panel-title">Admin Panel</h1>
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <span className="text-sm text-muted-foreground">Administrator Access</span>
        </div>
      </div>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="requests" data-testid="tab-registration-requests">
            <Clock className="h-4 w-4 mr-2" />
            Registration Requests
            {(registrationRequests || []).filter((r: UserRegistrationRequest) => r.status === 'pending').length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {(registrationRequests || []).filter((r: UserRegistrationRequest) => r.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-user-management">
            <Users className="h-4 w-4 mr-2" />
            User Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registration Requests</CardTitle>
              <CardDescription>
                Review and approve user registration requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : registrationRequests?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No registration requests found</p>
              ) : (
                <div className="space-y-4">
                  {registrationRequests?.map((request: UserRegistrationRequest) => (
                    <Card key={request.id} className="transition-all duration-200 hover:shadow-md">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h3 className="font-semibold" data-testid={`request-username-${request.id}`}>
                              {request.username}
                            </h3>
                            <p className="text-sm text-muted-foreground" data-testid={`request-name-${request.id}`}>
                              {request.firstName} {request.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground" data-testid={`request-email-${request.id}`}>
                              {request.email}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {getStatusBadge(request.status)}
                            {getRoleBadge(request.requestedRole)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Location:</strong> {request.location || 'Not specified'}
                          </div>
                          <div>
                            <strong>Requested:</strong> {formatDate(request.createdAt)}
                          </div>
                          {request.reviewedAt && (
                            <>
                              <div>
                                <strong>Reviewed:</strong> {formatDate(request.reviewedAt)}
                              </div>
                              {request.reviewNotes && (
                                <div className="col-span-2">
                                  <strong>Notes:</strong> {request.reviewNotes}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        
                        {request.status === 'pending' && (
                          <div className="flex gap-2 mt-4">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setAssignedRole(request.requestedRole);
                                  }}
                                  data-testid={`review-request-${request.id}`}
                                >
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Review
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Review Registration Request</DialogTitle>
                                  <DialogDescription>
                                    Review the registration request for {selectedRequest?.username}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="review-status">Decision</Label>
                                    <Select value={reviewStatus} onValueChange={(value: 'approved' | 'rejected') => setReviewStatus(value)}>
                                      <SelectTrigger id="review-status" data-testid="review-status-select">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="approved">Approve</SelectItem>
                                        <SelectItem value="rejected">Reject</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  {reviewStatus === 'approved' && (
                                    <div>
                                      <Label htmlFor="assigned-role">Assign Role</Label>
                                      <Select value={assignedRole} onValueChange={setAssignedRole}>
                                        <SelectTrigger id="assigned-role" data-testid="assigned-role-select">
                                          <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {USER_ROLES.map((role) => (
                                            <SelectItem key={role} value={role}>
                                              {role.replace('_', ' ')}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
                                  
                                  <div>
                                    <Label htmlFor="review-notes">Notes (optional)</Label>
                                    <Textarea
                                      id="review-notes"
                                      value={reviewNotes}
                                      onChange={(e) => setReviewNotes(e.target.value)}
                                      placeholder="Add any notes about this decision..."
                                      data-testid="review-notes-input"
                                    />
                                  </div>
                                  
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                                      Cancel
                                    </Button>
                                    <Button 
                                      onClick={handleReviewSubmit}
                                      disabled={reviewMutation.isPending || (reviewStatus === 'approved' && !assignedRole)}
                                      data-testid="submit-review"
                                    >
                                      {reviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage existing users, roles, and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : users?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No users found</p>
              ) : (
                <div className="space-y-4">
                  {users?.map((user: User) => (
                    <Card key={user.id} className="transition-all duration-200 hover:shadow-md">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h3 className="font-semibold" data-testid={`user-username-${user.id}`}>
                              {user.username}
                            </h3>
                            <p className="text-sm text-muted-foreground" data-testid={`user-name-${user.id}`}>
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground" data-testid={`user-email-${user.id}`}>
                              {user.email}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {getRoleBadge(user.role)}
                            <Badge variant={user.isActive ? "default" : "secondary"}>
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Location:</strong> {user.location || 'Not specified'}
                          </div>
                          <div>
                            <strong>Joined:</strong> {formatDate(user.createdAt)}
                          </div>
                          <div>
                            <strong>Last Login:</strong> {formatDate(user.lastLogin)}
                          </div>
                          <div>
                            <strong>Approved:</strong> {user.isApproved ? 'Yes' : 'No'}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setSelectedUser(user)}
                                data-testid={`edit-user-${user.id}`}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit User</DialogTitle>
                                <DialogDescription>
                                  Update user role and status for {selectedUser?.username}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="user-role">Role</Label>
                                  <Select defaultValue={selectedUser?.role}>
                                    <SelectTrigger id="user-role" data-testid="edit-user-role">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {USER_ROLES.map((role) => (
                                        <SelectItem key={role} value={role}>
                                          {role.replace('_', ' ')}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id="user-active"
                                    defaultChecked={selectedUser?.isActive}
                                    data-testid="edit-user-active"
                                  />
                                  <Label htmlFor="user-active">Active User</Label>
                                </div>
                                
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" onClick={() => setSelectedUser(null)}>
                                    Cancel
                                  </Button>
                                  <Button 
                                    onClick={handleUserUpdate}
                                    disabled={updateUserMutation.isPending}
                                    data-testid="save-user-changes"
                                  >
                                    {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          {user.isActive && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  data-testid={`deactivate-user-${user.id}`}
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  Deactivate
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Deactivate User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to deactivate {user.username}? 
                                    They will no longer be able to access the system.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deactivateUserMutation.mutate(user.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                    data-testid="confirm-deactivate-user"
                                  >
                                    Deactivate User
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}