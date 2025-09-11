import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Mail, Phone, Calendar, Save } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { updateProfileSchema, type UpdateProfile } from "@shared/schema";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import PasswordChangeReminder from "@/components/notifications/password-change-reminder";

export default function Profile() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();

  const form = useForm<UpdateProfile>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      birthDate: user?.birthDate ? new Date(user.birthDate) : undefined,
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfile) => {
      const response = await apiRequest('PUT', '/api/users/profile', data);
      return await response.json();
    },
    onSuccess: (updatedUser) => {
      // Update the auth context with new user data
      setUser({ ...user!, ...updatedUser });
      
      // Invalidate user queries to refresh any cached data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      toast({
        title: "Profile Updated",
        description: "Your profile information has been successfully updated.",
      });
      
      // Reset form with new values
      form.reset({
        firstName: updatedUser.firstName || "",
        lastName: updatedUser.lastName || "",
        email: updatedUser.email || "",
        phone: updatedUser.phone || "",
        birthDate: updatedUser.birthDate ? new Date(updatedUser.birthDate) : undefined,
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile information",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateProfile) => {
    updateProfileMutation.mutate(data);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral">
      <Header />
      <MobileNav />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-20 md:mb-0">
        <PasswordChangeReminder />
        
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center space-x-3">
            <User className="text-primary text-2xl" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
              <p className="text-gray-600">Manage your personal information</p>
            </div>
          </div>

          {/* Profile Form */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Personal Information</CardTitle>
              <CardDescription>
                Update your personal details below. These changes will be reflected across the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Name Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Enter your first name"
                              disabled={updateProfileMutation.isPending}
                              data-testid="input-first-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Enter your last name"
                              disabled={updateProfileMutation.isPending}
                              data-testid="input-last-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center space-x-2">
                            <Mail className="w-4 h-4" />
                            <span>Email Address</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="email"
                              placeholder="your.email@example.com"
                              disabled={updateProfileMutation.isPending}
                              data-testid="input-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center space-x-2">
                            <Phone className="w-4 h-4" />
                            <span>Phone Number</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="tel"
                              placeholder="(555) 123-4567"
                              disabled={updateProfileMutation.isPending}
                              data-testid="input-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="birthDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4" />
                            <span>Birth Date (Optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="date"
                              value={field.value ? field.value.toISOString().split('T')[0] : ""}
                              onChange={(e) => {
                                const date = e.target.value ? new Date(e.target.value) : undefined;
                                field.onChange(date);
                              }}
                              disabled={updateProfileMutation.isPending}
                              data-testid="input-birth-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-4">
                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                      data-testid="button-update-profile"
                      className="flex items-center space-x-2"
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Update Profile</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Account Information Card */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Account Information</CardTitle>
              <CardDescription>
                View your account details and role information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Username</Label>
                  <p className="mt-1 text-sm text-gray-900" data-testid="text-username">{user.username}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Role</Label>
                  <p className="mt-1 text-sm text-gray-900 capitalize" data-testid="text-role">
                    {user.role.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Account Status</Label>
                  <p className="mt-1 text-sm text-gray-900" data-testid="text-status">
                    {user.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Member Since</Label>
                  <p className="mt-1 text-sm text-gray-900" data-testid="text-member-since">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}