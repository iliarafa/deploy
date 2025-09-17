import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
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
import { UserCheck, UserX, Users, Clock, Shield, Edit, UserPlus, AlertTriangle } from "lucide-react";
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
  
  // Create user form state
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'worker',
    location: '',
    isApproved: true
  });
  
  // Edit user form state
  const [editUserRole, setEditUserRole] = useState<string>('');
  const [editUserActive, setEditUserActive] = useState<boolean>(true);

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

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof createUserForm) => {
      return await apiRequest('POST', '/api/admin/users', userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Success",
        description: "User created successfully",
      });
      setShowCreateUserForm(false);
      resetCreateUserForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const resetReviewForm = () => {
    setReviewStatus('approved');
    setAssignedRole('');
    setReviewNotes('');
  };

  const resetCreateUserForm = () => {
    setCreateUserForm({
      username: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'worker',
      location: '',
      isApproved: true
    });
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
      role: editUserRole || selectedUser.role,
      isActive: editUserActive,
    };

    updateUserMutation.mutate({
      id: selectedUser.id,
      updates,
    });
  };

  const handleCreateUser = () => {
    // Basic validation
    if (!createUserForm.username || !createUserForm.email || !createUserForm.password) {
      toast({
        title: "Error",
        description: "Username, email, and password are required",
        variant: "destructive",
      });
      return;
    }

    createUserMutation.mutate(createUserForm);
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
    <div className="min-h-screen bg-neutral">
      <Header />
      <MobileNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-20 md:mb-0">
        <div className="container mx-auto space-y-6" data-testid="admin-panel">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold" data-testid="admin-panel-title">Admin</h1>
          </div>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
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
          <TabsTrigger value="issues" data-testid="tab-issue-management">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Issue Management
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    Manage existing users, roles, and permissions
                  </CardDescription>
                </div>
                <Dialog open={showCreateUserForm} onOpenChange={setShowCreateUserForm}>
                  <DialogTrigger asChild>
                    <Button data-testid="create-user-button">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>
                        Create a new user account with credentials and permissions
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="create-username">Username *</Label>
                          <Input
                            id="create-username"
                            value={createUserForm.username}
                            onChange={(e) => setCreateUserForm(prev => ({ ...prev, username: e.target.value }))}
                            placeholder="Enter username"
                            data-testid="create-username-input"
                          />
                        </div>
                        <div>
                          <Label htmlFor="create-email">Email *</Label>
                          <Input
                            id="create-email"
                            type="email"
                            value={createUserForm.email}
                            onChange={(e) => setCreateUserForm(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="Enter email"
                            data-testid="create-email-input"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="create-password">Password *</Label>
                        <Input
                          id="create-password"
                          type="password"
                          value={createUserForm.password}
                          onChange={(e) => setCreateUserForm(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Enter password"
                          data-testid="create-password-input"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="create-first-name">First Name</Label>
                          <Input
                            id="create-first-name"
                            value={createUserForm.firstName}
                            onChange={(e) => setCreateUserForm(prev => ({ ...prev, firstName: e.target.value }))}
                            placeholder="Enter first name"
                            data-testid="create-first-name-input"
                          />
                        </div>
                        <div>
                          <Label htmlFor="create-last-name">Last Name</Label>
                          <Input
                            id="create-last-name"
                            value={createUserForm.lastName}
                            onChange={(e) => setCreateUserForm(prev => ({ ...prev, lastName: e.target.value }))}
                            placeholder="Enter last name"
                            data-testid="create-last-name-input"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="create-role">Role</Label>
                        <Select value={createUserForm.role} onValueChange={(value) => setCreateUserForm(prev => ({ ...prev, role: value }))}>
                          <SelectTrigger id="create-role" data-testid="create-role-select">
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
                      
                      <div>
                        <Label htmlFor="create-location">Location</Label>
                        <Input
                          id="create-location"
                          value={createUserForm.location}
                          onChange={(e) => setCreateUserForm(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="Enter location"
                          data-testid="create-location-input"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="create-approved"
                          checked={createUserForm.isApproved}
                          onChange={(e) => setCreateUserForm(prev => ({ ...prev, isApproved: e.target.checked }))}
                          data-testid="create-approved-checkbox"
                        />
                        <Label htmlFor="create-approved">Approve user immediately</Label>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowCreateUserForm(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleCreateUser}
                          disabled={createUserMutation.isPending}
                          data-testid="submit-create-user"
                        >
                          {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
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
                                onClick={() => {
                                  setSelectedUser(user);
                                  setEditUserRole(user.role);
                                  setEditUserActive(user.isActive);
                                }}
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
                                  <Select value={editUserRole} onValueChange={setEditUserRole}>
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
                                    checked={editUserActive}
                                    onChange={(e) => setEditUserActive(e.target.checked)}
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

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Issue Management</CardTitle>
              <CardDescription>
                View and manage all property management issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Advanced Issue Management</h3>
                <p className="text-muted-foreground mb-4">
                  Access the full issue management interface to view, filter, and manage all reported issues.
                </p>
                <Button 
                  onClick={() => window.open('/admin/issues', '_blank')}
                  className="bg-primary hover:bg-primary/90 text-white"
                  data-testid="button-open-issue-management"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Open Issue Management
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </div>
      </main>
    </div>
  );
}