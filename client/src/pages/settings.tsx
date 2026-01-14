import { useState, useEffect, useCallback } from "react";

// Simple debounce utility
function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User, Globe, Bell, Monitor, Shield, Key, Save, SettingsIcon, UserCog, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import type { UserSettings, UpdateUserSettings } from "@shared/schema";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";

const navOptions = [
  { id: "tasks", label: "Tasks", description: "Task management and assignments" },
  { id: "materials", label: "Materials", description: "Material requests and inventory" },
  { id: "issues", label: "Report", description: "Issue reporting and tracking" },
  { id: "colab", label: "Colab", description: "Team collaboration messages" },
  { id: "calendar", label: "Calendar", description: "Schedule and calendar view" },
  { id: "admin", label: "Admin", description: "Administrative functions" },
  { id: "log", label: "Log", description: "Activity logs and history" },
] as const;

const languages = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
] as const;

const landingPages = [
  { value: "today", label: "Today's Dashboard" },
  { value: "tasks", label: "Tasks" },
  { value: "calendar", label: "Calendar" },
  { value: "materials", label: "Materials" },
] as const;

export function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");
  const [passwordExpiryValue, setPasswordExpiryValue] = useState(90);

  // Fetch user settings
  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ["/api/me/settings"],
    enabled: !!user,
  });

  // Update local password expiry value when settings load
  useEffect(() => {
    if (settings?.passwordExpiryDays) {
      setPasswordExpiryValue(settings.passwordExpiryDays);
    }
  }, [settings?.passwordExpiryDays]);

  // Debounced update for password expiry
  const debouncedPasswordExpiryUpdate = useCallback(
    debounce((value: number) => {
      handleSettingUpdate({ passwordExpiryDays: value });
    }, 500),
    []
  );

  // Update settings mutation
  const updateSettingsMutation = useMutation<UserSettings, Error, Partial<UpdateUserSettings>>({
    mutationFn: async (updates: Partial<UpdateUserSettings>) => {
      const response = await apiRequest("PATCH", "/api/me/settings", updates);
      return await response.json();
    },
    onSuccess: (updatedSettings: UserSettings) => {
      queryClient.setQueryData(["/api/me/settings"], updatedSettings);
      // Also invalidate nav-preferences so MobileNav refreshes
      queryClient.invalidateQueries({ queryKey: ["/api/me/nav-preferences"] });
      // Sync theme with context if changed
      if (updatedSettings.theme && updatedSettings.theme !== theme) {
        setTheme(updatedSettings.theme as "light" | "dark");
      }
      toast({
        title: "Settings updated",
        description: "Your preferences have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSettingUpdate = (updates: Partial<UpdateUserSettings>) => {
    updateSettingsMutation.mutate(updates);
  };

  const handleNavShortcutsChange = (shortcutId: string, enabled: boolean) => {
    if (!settings) return;
    
    const currentShortcuts = (settings.navShortcuts || []) as string[];
    let newShortcuts: string[];
    
    if (enabled) {
      // Add shortcut if not already present and under limit
      if (!currentShortcuts.includes(shortcutId) && currentShortcuts.length < 4) {
        newShortcuts = [...currentShortcuts, shortcutId];
      } else {
        return; // Don't update if already present or limit reached
      }
    } else {
      // Remove shortcut
      newShortcuts = currentShortcuts.filter((id: string) => id !== shortcutId);
    }
    
    handleSettingUpdate({ navShortcuts: newShortcuts as any });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <div className="text-center py-8">Loading settings...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <div className="text-center py-8">Failed to load settings.</div>
      </div>
    );
  }

  const isAdmin = user?.role === "admin";

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Back to Dashboard */}
      <Link href="/">
        <Button variant="ghost" className="gap-2 text-gray-600 hover:text-gray-900 -ml-2 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </Link>

      <div className="flex items-center gap-2 mb-6">
        <SettingsIcon className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" data-testid="tab-general">
            <User className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="display" data-testid="tab-display">
            <Monitor className="h-4 w-4 mr-2" />
            Display
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin" data-testid="tab-admin">
              <UserCog className="h-4 w-4 mr-2" />
              Admin
            </TabsTrigger>
          )}
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Language & Region
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={settings.language || "en"}
                  onValueChange={(value) => handleSettingUpdate({ language: value as "en" | "es" })}
                  disabled={updateSettingsMutation.isPending}
                >
                  <SelectTrigger data-testid="select-language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultLandingPage">Default Landing Page</Label>
                <Select
                  value={settings.defaultLandingPage || "today"}
                  onValueChange={(value) => handleSettingUpdate({ defaultLandingPage: value as any })}
                  disabled={updateSettingsMutation.isPending}
                >
                  <SelectTrigger data-testid="select-landing-page">
                    <SelectValue placeholder="Select default page" />
                  </SelectTrigger>
                  <SelectContent>
                    {landingPages.map((page) => (
                      <SelectItem key={page.value} value={page.value}>
                        {page.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Navigation Shortcuts</CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose up to 4 shortcuts for your bottom navigation bar.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 mb-4">
                {((settings.navShortcuts || []) as string[]).map((shortcut: string) => {
                  const option = navOptions.find((opt) => opt.id === shortcut);
                  return (
                    <Badge key={shortcut} variant="secondary" data-testid={`badge-shortcut-${shortcut}`}>
                      {option?.label || shortcut}
                    </Badge>
                  );
                })}
                {((settings.navShortcuts || []) as string[]).length === 0 && (
                  <span className="text-sm text-muted-foreground">No shortcuts selected</span>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {navOptions.filter(option => {
                  // Hide admin shortcut from non-admin users
                  if (option.id === "admin" && user?.role !== "admin") {
                    return false;
                  }
                  return true;
                }).map((option) => {
                  const isSelected = ((settings.navShortcuts || []) as string[]).includes(option.id);
                  const canSelect = !isSelected && ((settings.navShortcuts || []) as string[]).length < 4;
                  
                  return (
                    <div 
                      key={option.id} 
                      className="flex items-center space-x-2 p-3 border rounded-lg"
                    >
                      <Switch
                        id={`nav-${option.id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => handleNavShortcutsChange(option.id, checked)}
                        disabled={(!isSelected && !canSelect) || updateSettingsMutation.isPending}
                        data-testid={`switch-nav-${option.id}`}
                      />
                      <div className="flex-1">
                        <Label 
                          htmlFor={`nav-${option.id}`} 
                          className="text-sm font-medium cursor-pointer"
                        >
                          {option.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {((settings.navShortcuts || []) as string[]).length >= 4 && (
                <p className="text-sm text-muted-foreground text-center">
                  Maximum of 4 shortcuts reached. Disable a shortcut to add a new one.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "emailNotifications", label: "Email Notifications", description: "Receive notifications via email" },
                { key: "taskNotifications", label: "Task Notifications", description: "Get notified about task updates and assignments" },
                { key: "issueNotifications", label: "Issue Notifications", description: "Receive alerts for new issues and status changes" },
                { key: "materialNotifications", label: "Material Request Notifications", description: "Get notified about material requests and deliveries" },
                { key: "calendarNotifications", label: "Calendar Notifications", description: "Receive reminders for scheduled events" },
                { key: "colabNotifications", label: "Colab Notifications", description: "Get notified about new messages and mentions" },
              ].map((notification) => (
                <div key={notification.key} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">{notification.label}</Label>
                    <p className="text-xs text-muted-foreground">{notification.description}</p>
                  </div>
                  <Switch
                    checked={settings[notification.key as keyof UserSettings] as boolean || false}
                    onCheckedChange={(checked) => handleSettingUpdate({ [notification.key]: checked })}
                    disabled={updateSettingsMutation.isPending}
                    data-testid={`switch-${notification.key.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Display Tab */}
        <TabsContent value="display" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Appearance & Layout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select
                  value={settings.theme || "light"}
                  onValueChange={(value) => handleSettingUpdate({ theme: value as "light" | "dark" })}
                  disabled={updateSettingsMutation.isPending}
                >
                  <SelectTrigger data-testid="select-theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Calendar View</Label>
                <Select
                  value={settings.calendarView || "month"}
                  onValueChange={(value) => handleSettingUpdate({ calendarView: value as "month" | "week" | "day" })}
                  disabled={updateSettingsMutation.isPending}
                >
                  <SelectTrigger data-testid="select-calendar-view">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Month View</SelectItem>
                    <SelectItem value="week">Week View</SelectItem>
                    <SelectItem value="day">Day View</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Task List View</Label>
                <Select
                  value={settings.taskListView || "card"}
                  onValueChange={(value) => handleSettingUpdate({ taskListView: value as "card" | "list" })}
                  disabled={updateSettingsMutation.isPending}
                >
                  <SelectTrigger data-testid="select-task-view">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">Card View</SelectItem>
                    <SelectItem value="list">List View</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Show Completed Tasks</Label>
                  <p className="text-xs text-muted-foreground">Display completed tasks in lists</p>
                </div>
                <Switch
                  checked={settings.showCompletedTasks || false}
                  onCheckedChange={(checked) => handleSettingUpdate({ showCompletedTasks: checked })}
                  disabled={updateSettingsMutation.isPending}
                  data-testid="switch-show-completed-tasks"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="passwordExpiry">Password Expiry (Days)</Label>
                <Input
                  id="passwordExpiry"
                  type="number"
                  min="1"
                  max="365"
                  value={passwordExpiryValue}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 90;
                    setPasswordExpiryValue(value);
                    debouncedPasswordExpiryUpdate(value);
                  }}
                  disabled={updateSettingsMutation.isPending}
                  data-testid="input-password-expiry"
                />
                <p className="text-xs text-muted-foreground">
                  How often you'll be required to change your password
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Require Password Change</Label>
                  <p className="text-xs text-muted-foreground">Force password change on next login</p>
                </div>
                <Switch
                  checked={settings.requirePasswordChange || false}
                  onCheckedChange={(checked) => handleSettingUpdate({ requirePasswordChange: checked })}
                  disabled={updateSettingsMutation.isPending}
                  data-testid="switch-require-password-change"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Two-Factor Authentication</Label>
                  <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                </div>
                <Switch
                  checked={settings.twoFactorEnabled || false}
                  onCheckedChange={(checked) => handleSettingUpdate({ twoFactorEnabled: checked })}
                  disabled={updateSettingsMutation.isPending}
                  data-testid="switch-two-factor"
                />
              </div>

              <Separator />

              <Button variant="outline" className="w-full" data-testid="button-change-password">
                <Key className="h-4 w-4 mr-2" />
                Change Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Tab (only visible to admins) */}
        {isAdmin && (
          <TabsContent value="admin" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  System Configuration
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Administrative settings that affect the entire system
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  <UserCog className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>System-wide administrative settings will be implemented here.</p>
                  <p className="text-sm">This includes user management, system policies, and global configurations.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Save indicator */}
      {updateSettingsMutation.isPending && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <Save className="h-4 w-4 animate-spin" />
          Saving...
        </div>
      )}
    </div>
  );
}