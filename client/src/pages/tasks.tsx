import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import TaskDetailModal from "@/components/tasks/task-detail-modal";
import TaskModal from "@/components/tasks/task-modal";
import TaskStatusUpdate from "@/components/tasks/task-status-update";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { type Task } from "@shared/schema";
import { Search, Calendar, MapPin, User, Clock, Plus, Download, FileText } from "lucide-react";
import { useState } from "react";
import { formatDate } from "@/lib/date-utils";
import { getCategoryColor } from "@/lib/calendar-utils";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function Tasks() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { hasPermission, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: !authLoading, // Wait for authentication verification before fetching
  });

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || task.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleExportTasks = () => {
    if (filteredTasks.length === 0) {
      toast({
        title: "No tasks to export",
        description: "There are no tasks matching your current filters.",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Title", "Description", "Category", "Priority", "Status", "Start Date", "End Date", "Location", "Assigned To", "Apartment"];
    const csvRows = [headers.join(",")];

    filteredTasks.forEach(task => {
      const row = [
        `"${(task.title || "").replace(/"/g, '""')}"`,
        `"${(task.description || "").replace(/"/g, '""')}"`,
        task.category || "",
        task.priority || "",
        task.status || "",
        task.startDate || "",
        task.endDate || "",
        `"${(task.location || "").replace(/"/g, '""')}"`,
        task.assignedTo || "",
        task.apartmentNumber || "",
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `tasks_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: `Exported ${filteredTasks.length} task(s) to CSV.`,
    });
  };

  const handleExportPDF = () => {
    if (filteredTasks.length === 0) {
      toast({
        title: "No tasks to export",
        description: "There are no tasks matching your current filters.",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text("Task Report", 14, 22);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Add filter info
    let filterText = "Filters: ";
    if (statusFilter !== "all") filterText += `Status: ${statusFilter}, `;
    if (categoryFilter !== "all") filterText += `Category: ${categoryFilter}, `;
    if (searchTerm) filterText += `Search: "${searchTerm}"`;
    if (filterText === "Filters: ") filterText = "Filters: None";
    doc.text(filterText, 14, 36);

    // Prepare table data
    const tableData = filteredTasks.map(task => [
      task.title || "",
      task.category || "",
      task.priority || "",
      task.status || "",
      task.startDate || "",
      task.location || "",
      task.assignedTo || "",
    ]);

    // Add table using autoTable
    (doc as any).autoTable({
      startY: 42,
      head: [["Title", "Category", "Priority", "Status", "Date", "Location", "Assigned"]],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 22 },
        2: { cellWidth: 18 },
        3: { cellWidth: 20 },
        4: { cellWidth: 22 },
        5: { cellWidth: 30 },
        6: { cellWidth: 25 },
      },
    });

    doc.save(`tasks_report_${new Date().toISOString().split("T")[0]}.pdf`);

    toast({
      title: "PDF exported",
      description: `Exported ${filteredTasks.length} task(s) to PDF.`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in-progress": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "standard": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-neutral">
      <Header />
      <MobileNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-20 md:mb-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">Task Management</h1>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-tasks"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger data-testid="select-category-filter">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                </SelectContent>
              </Select>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" data-testid="button-export-tasks">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleExportTasks} data-testid="button-export-csv">
                    <Download className="w-4 h-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF} data-testid="button-export-pdf">
                    <FileText className="w-4 h-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Task List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-8">
              <div className="text-gray-500">Loading tasks...</div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <div className="text-gray-500">No tasks found matching your criteria.</div>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <Card key={task.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{task.title}</CardTitle>
                    <Badge className={getCategoryColor(task.category)}>
                      {task.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {task.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(task.startDate)}</span>
                      {task.endDate && (
                        <>
                          <span>-</span>
                          <span>{formatDate(task.endDate)}</span>
                        </>
                      )}
                    </div>
                    
                    {task.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin className="w-4 h-4" />
                        <span>{task.location}</span>
                      </div>
                    )}
                    
                    {task.assignedTo && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <User className="w-4 h-4" />
                        <span>{task.assignedTo}</span>
                      </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-2">
                      <div className="flex gap-1 flex-wrap">
                        <Badge className={`${getStatusColor(task.status)} text-xs px-2 py-1`}>
                          {task.status}
                        </Badge>
                        <Badge className={`${getPriorityColor(task.priority)} text-xs px-2 py-1`}>
                          {task.priority}
                        </Badge>
                      </div>
                      
                      <div className="flex gap-2 flex-shrink-0">
                        <TaskStatusUpdate task={task} compact={true} />
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-xs px-3 py-1 h-8 w-24"
                          onClick={() => {
                            setSelectedTask(task);
                            setIsDetailModalOpen(true);
                          }}
                          data-testid={`button-task-details-${task.id}`}
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      <TaskDetailModal 
        task={selectedTask}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTask(null);
        }}
      />

      <TaskModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
