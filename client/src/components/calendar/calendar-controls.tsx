import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Search, Users, X, Calendar, LayoutGrid } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { type User } from "@shared/schema";

interface CalendarControlsProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  view: "month" | "week" | "day";
  setView: (view: "month" | "week" | "day") => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedUsers: string[];
  setSelectedUsers: (users: string[]) => void;
  layoutMode: "calendar" | "timeline";
  setLayoutMode: (mode: "calendar" | "timeline") => void;
}

const USER_COLORS: Record<string, string> = {
  "German": "bg-blue-500",
  "Marcelo": "bg-green-500",
  "Luis C": "bg-purple-500",
  "Jose": "bg-orange-500",
  "Miguel": "bg-pink-500",
  "Luis G": "bg-cyan-500",
};

function getUserColor(name: string): string {
  const firstName = name?.split(" ")[0] || "";
  return USER_COLORS[firstName] || "bg-slate-500";
}

function getUserInitials(name: string): string {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export default function CalendarControls({
  currentDate,
  setCurrentDate,
  view,
  setView,
  searchTerm,
  setSearchTerm,
  selectedUsers,
  setSelectedUsers,
  layoutMode,
  setLayoutMode,
}: CalendarControlsProps) {
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const toggleUser = (username: string) => {
    if (selectedUsers.includes(username)) {
      setSelectedUsers(selectedUsers.filter(u => u !== username));
    } else {
      setSelectedUsers([...selectedUsers, username]);
    }
  };

  const clearUserFilter = () => {
    setSelectedUsers([]);
  };

  const activeUsers = users.filter(u => u.isActive);

  return (
    <Card className="mb-6 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth("prev")}
                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToToday}
                className="h-8 px-3 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth("next")}
                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
              {(["month", "week", "day"] as const).map((v) => (
                <Button
                  key={v}
                  variant="ghost"
                  size="sm"
                  onClick={() => setView(v)}
                  className={`h-7 px-3 text-xs font-medium capitalize transition-all
                    ${view === v 
                      ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-200 shadow-sm' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                >
                  {v}
                </Button>
              ))}
            </div>
            
            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLayoutMode("calendar")}
                className={`h-7 px-2 sm:px-2.5 text-xs font-medium transition-all gap-1
                  ${layoutMode === "calendar" 
                    ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-200 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                data-testid="button-layout-calendar"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Calendar</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLayoutMode("timeline")}
                className={`h-7 px-2 sm:px-2.5 text-xs font-medium transition-all gap-1
                  ${layoutMode === "timeline" 
                    ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-200 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                data-testid="button-layout-timeline"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Timeline</span>
              </Button>
            </div>
            
            <div className="relative flex-1 lg:flex-initial lg:w-48">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-sm bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`h-8 gap-1 sm:gap-2 border-slate-200 dark:border-slate-600 
                    ${selectedUsers.length > 0 ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700' : ''}`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-xs font-medium">Filter by User</span>
                  {selectedUsers.length > 0 && (
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300">
                      {selectedUsers.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Team Members
                </div>
                <DropdownMenuSeparator />
                {activeUsers.map((user) => {
                  const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
                  const isSelected = selectedUsers.includes(displayName);
                  
                  return (
                    <DropdownMenuCheckboxItem
                      key={user.id}
                      checked={isSelected}
                      onCheckedChange={() => toggleUser(displayName)}
                      className="gap-2"
                    >
                      <Avatar className="h-5 w-5 flex-shrink-0">
                        <AvatarFallback className={`${getUserColor(displayName)} text-white text-[8px]`}>
                          {getUserInitials(displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{displayName}</span>
                    </DropdownMenuCheckboxItem>
                  );
                })}
                {selectedUsers.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <button
                      onClick={clearUserFilter}
                      className="flex w-full items-center gap-2 px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                    >
                      <X className="w-3 h-3" />
                      Clear filter
                    </button>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {selectedUsers.length > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400">Showing:</span>
            <div className="flex flex-wrap gap-1.5">
              {selectedUsers.map(user => (
                <Badge 
                  key={user}
                  variant="secondary" 
                  className="h-6 gap-1.5 pl-1.5 pr-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700"
                >
                  <Avatar className="h-4 w-4">
                    <AvatarFallback className={`${getUserColor(user)} text-white text-[7px]`}>
                      {getUserInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{user}</span>
                  <button
                    onClick={() => toggleUser(user)}
                    className="ml-0.5 hover:text-blue-900 dark:hover:text-blue-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
