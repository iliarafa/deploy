import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { type MaterialRequest } from "@shared/schema";
import { formatDate } from "@/lib/date-utils";
import { Calendar, MapPin, Package, Hash, User, Clock, AlertTriangle, Trash2, X } from "lucide-react";

interface MaterialRequestDetailsModalProps {
  request: MaterialRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MaterialRequestDetailsModal({ request, isOpen, onClose }: MaterialRequestDetailsModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/material-requests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/material-requests'] });
      toast({
        title: "Success",
        description: "Material request deleted successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete material request",
        variant: "destructive",
      });
    },
  });

  if (!request) return null;

  // Check if user can delete this request
  const canDelete = user && (
    user.role === 'admin' || 
    user.role === 'project_manager' || 
    (user.role === 'worker' && request.userId === user.id)
  );

  const handleDelete = () => {
    deleteMutation.mutate(request.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "in-transit": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "high": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "standard": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const getMaterialTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "sheetrock": return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      case "paint": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "compound": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "electrical": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "plumbing": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "tools": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-material-details">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Material Request Details
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              data-testid="button-close-details"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge className={getMaterialTypeColor(request.materialType)} data-testid="badge-material-type">
                  <Package className="h-3 w-3 mr-1" />
                  {request.materialType}
                </Badge>
                <Badge className={getStatusColor(request.status)} data-testid="badge-status">
                  {request.status}
                </Badge>
                <Badge className={getPriorityColor(request.priority)} data-testid="badge-priority">
                  {request.priority} priority
                </Badge>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2" data-testid="text-description">
                {request.description}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Hash className="h-4 w-4" />
                  <span data-testid="text-request-id">ID: {request.id}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span data-testid="text-user-id">User: {request.userId}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quantity and Unit */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Quantity & Specifications</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Quantity</label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="text-quantity">
                    {request.quantity}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Unit</label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="text-unit">
                    {request.unit}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Information */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Delivery Information</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Delivery Date</label>
                    <p className="text-gray-900 dark:text-gray-100" data-testid="text-delivery-date">
                      {formatDate(new Date(request.deliveryDate))}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Delivery Location</label>
                    <p className="text-gray-900 dark:text-gray-100" data-testid="text-delivery-location">
                      {request.deliveryLocation}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {request.notes && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Notes</h4>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap" data-testid="text-notes">
                  {request.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Created Date */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Created</label>
                  <p className="text-gray-900 dark:text-gray-100" data-testid="text-created-date">
                    {request.createdAt ? formatDate(new Date(request.createdAt)) : 'Unknown'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              data-testid="button-close"
            >
              Close
            </Button>
            
            {canDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={deleteMutation.isPending}
                    data-testid="button-delete"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent data-testid="dialog-delete-confirm">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Delete Material Request
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this material request for "{request.description}"? 
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                      data-testid="button-confirm-delete"
                    >
                      Delete Request
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}