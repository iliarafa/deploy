import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { type Task, type MaterialRequest } from "@shared/schema";
import { Calendar, Package, CheckCircle, AlertCircle, Clock, TrendingUp, Download } from "lucide-react";

export default function Reports() {
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: materialRequests = [] } = useQuery<MaterialRequest[]>({
    queryKey: ["/api/material-requests"],
  });

  // Task statistics
  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === "completed").length,
    inProgress: tasks.filter(t => t.status === "in-progress").length,
    pending: tasks.filter(t => t.status === "pending").length,
  };

  // Material request statistics
  const materialStats = {
    total: materialRequests.length,
    delivered: materialRequests.filter(r => r.status === "delivered").length,
    inTransit: materialRequests.filter(r => r.status === "in-transit").length,
    pending: materialRequests.filter(r => r.status === "pending").length,
  };

  // Category breakdown
  const categoryBreakdown = tasks.reduce((acc, task) => {
    acc[task.category] = (acc[task.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Priority breakdown
  const priorityBreakdown = tasks.reduce((acc, task) => {
    acc[task.priority] = (acc[task.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const completionRate = taskStats.total > 0 ? (taskStats.completed / taskStats.total) * 100 : 0;
  const materialDeliveryRate = materialStats.total > 0 ? (materialStats.delivered / materialStats.total) * 100 : 0;

  return (
    <div className="min-h-screen bg-neutral">
      <Header />
      <MobileNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-20 md:mb-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">Reports & Analytics</h1>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export All Reports
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taskStats.total}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taskStats.completed}</div>
              <p className="text-xs text-muted-foreground">
                {completionRate.toFixed(1)}% completion rate
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Material Requests</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{materialStats.total}</div>
              <p className="text-xs text-muted-foreground">
                {materialDeliveryRate.toFixed(1)}% delivery rate
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Items</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taskStats.pending + materialStats.pending}</div>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Task Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Task Progress Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Overall Completion</span>
                  <span className="text-sm text-gray-600">{completionRate.toFixed(1)}%</span>
                </div>
                <Progress value={completionRate} className="h-2" />
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Completed</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">{taskStats.completed}</Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">In Progress</span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">{taskStats.inProgress}</Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">Pending</span>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">{taskStats.pending}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Material Request Status */}
          <Card>
            <CardHeader>
              <CardTitle>Material Request Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Delivery Rate</span>
                  <span className="text-sm text-gray-600">{materialDeliveryRate.toFixed(1)}%</span>
                </div>
                <Progress value={materialDeliveryRate} className="h-2" />
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Delivered</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">{materialStats.delivered}</Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">In Transit</span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">{materialStats.inTransit}</Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">Pending</span>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">{materialStats.pending}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Task Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Task Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(categoryBreakdown).map(([category, count]) => (
                  <div key={category} className="flex justify-between items-center">
                    <span className="text-sm font-medium capitalize">{category}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
                {Object.keys(categoryBreakdown).length === 0 && (
                  <div className="text-center text-gray-500 py-4">No task categories available</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Priority Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Priority Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(priorityBreakdown).map(([priority, count]) => {
                  const getPriorityColor = (priority: string) => {
                    switch (priority) {
                      case "urgent": return "bg-red-100 text-red-800";
                      case "high": return "bg-orange-100 text-orange-800";
                      case "standard": return "bg-blue-100 text-blue-800";
                      default: return "bg-gray-100 text-gray-800";
                    }
                  };
                  
                  return (
                    <div key={priority} className="flex justify-between items-center">
                      <span className="text-sm font-medium capitalize">{priority}</span>
                      <Badge className={getPriorityColor(priority)}>{count}</Badge>
                    </div>
                  );
                })}
                {Object.keys(priorityBreakdown).length === 0 && (
                  <div className="text-center text-gray-500 py-4">No priority data available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
