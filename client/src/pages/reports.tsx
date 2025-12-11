import { useState } from "react";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { type Task, type MaterialRequest } from "@shared/schema";
import { Calendar, Package, CheckCircle, AlertCircle, Download, FileText, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Reports() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

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

  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const headers = ["ID", "Title", "Category", "Priority", "Status", "Location", "Apartment", "Assigned To", "Start Date", "End Date"];
      const taskRows = tasks.map(task => [
        task.id,
        task.title,
        task.category,
        task.priority,
        task.status,
        task.location || "",
        task.apartmentNumber || "",
        task.assignedTo || "",
        new Date(task.startDate).toLocaleDateString(),
        task.endDate ? new Date(task.endDate).toLocaleDateString() : ""
      ]);

      const materialHeaders = ["ID", "Material Type", "Description", "Quantity", "Unit", "Status", "Priority", "Delivery Location", "Delivery Date"];
      const materialRows = materialRequests.map(mr => [
        mr.id,
        mr.materialType,
        mr.description,
        mr.quantity,
        mr.unit,
        mr.status,
        mr.priority,
        mr.deliveryLocation,
        mr.deliveryDate ? new Date(mr.deliveryDate).toLocaleDateString() : ""
      ]);

      let csvContent = "TASKS REPORT\n";
      csvContent += headers.join(",") + "\n";
      taskRows.forEach(row => {
        csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",") + "\n";
      });

      csvContent += "\n\nMATERIAL REQUESTS REPORT\n";
      csvContent += materialHeaders.join(",") + "\n";
      materialRows.forEach(row => {
        csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",") + "\n";
      });

      csvContent += "\n\nSUMMARY STATISTICS\n";
      csvContent += `Total Tasks,${taskStats.total}\n`;
      csvContent += `Completed Tasks,${taskStats.completed}\n`;
      csvContent += `In Progress Tasks,${taskStats.inProgress}\n`;
      csvContent += `Pending Tasks,${taskStats.pending}\n`;
      csvContent += `Completion Rate,${completionRate.toFixed(1)}%\n`;
      csvContent += `\nTotal Material Requests,${materialStats.total}\n`;
      csvContent += `Delivered,${materialStats.delivered}\n`;
      csvContent += `In Transit,${materialStats.inTransit}\n`;
      csvContent += `Pending Materials,${materialStats.pending}\n`;
      csvContent += `Delivery Rate,${materialDeliveryRate.toFixed(1)}%\n`;

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `reports_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast({
        title: "Export Successful",
        description: "CSV report has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to generate CSV report",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFontSize(20);
      doc.text("Reports & Analytics", pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(12);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: "center" });

      doc.setFontSize(14);
      doc.text("Summary Statistics", 14, 42);
      
      autoTable(doc, {
        startY: 48,
        head: [["Metric", "Value"]],
        body: [
          ["Total Tasks", taskStats.total.toString()],
          ["Completed Tasks", taskStats.completed.toString()],
          ["In Progress Tasks", taskStats.inProgress.toString()],
          ["Pending Tasks", taskStats.pending.toString()],
          ["Completion Rate", `${completionRate.toFixed(1)}%`],
          ["", ""],
          ["Total Material Requests", materialStats.total.toString()],
          ["Delivered", materialStats.delivered.toString()],
          ["In Transit", materialStats.inTransit.toString()],
          ["Pending Materials", materialStats.pending.toString()],
          ["Delivery Rate", `${materialDeliveryRate.toFixed(1)}%`],
        ],
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246] },
      });

      let currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

      doc.setFontSize(14);
      doc.text("Tasks", 14, currentY);
      
      autoTable(doc, {
        startY: currentY + 6,
        head: [["Title", "Category", "Priority", "Status", "Location", "Assigned To"]],
        body: tasks.map(task => [
          task.title,
          task.category,
          task.priority,
          task.status,
          task.location || "-",
          task.assignedTo || "-"
        ]),
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 25 },
          2: { cellWidth: 22 },
          3: { cellWidth: 25 },
          4: { cellWidth: 30 },
          5: { cellWidth: 30 },
        },
      });

      currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.text("Material Requests", 14, currentY);
      
      autoTable(doc, {
        startY: currentY + 6,
        head: [["Material Type", "Description", "Qty", "Unit", "Status", "Priority"]],
        body: materialRequests.map(mr => [
          mr.materialType,
          mr.description.substring(0, 30) + (mr.description.length > 30 ? "..." : ""),
          mr.quantity.toString(),
          mr.unit,
          mr.status,
          mr.priority
        ]),
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 },
      });

      doc.save(`reports_${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: "Export Successful",
        description: "PDF report has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF report",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral">
      <Header />
      <MobileNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-20 md:mb-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">Reports & Analytics</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={isExporting} data-testid="button-export-reports">
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? "Exporting..." : "Export All Reports"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV} data-testid="menu-export-csv">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} data-testid="menu-export-pdf">
                <FileText className="w-4 h-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
