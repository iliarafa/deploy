import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Vacancy } from "@shared/schema";
import { Building, MapPin, Calendar, Clock, Home } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import VacancyModal from "@/components/vacancies/vacancy-modal";

export default function Vacancies() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isVacancyModalOpen, setIsVacancyModalOpen] = useState(false);

  const { data: vacancies = [], isLoading } = useQuery<Vacancy[]>({
    queryKey: ["/api/vacancies"],
  });

  const closeVacancyMutation = useMutation({
    mutationFn: async (vacancyId: number) => {
      return apiRequest("PUT", `/api/vacancies/${vacancyId}`, { status: "closed" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vacancies"] });
      toast({
        title: "Success",
        description: "Vacancy closed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to close vacancy",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "vacant": return "bg-red-100 text-red-800";
      case "occupied": return "bg-green-100 text-green-800";
      case "maintenance": return "bg-yellow-100 text-yellow-800";
      case "closed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleCloseVacancy = (vacancyId: number) => {
    closeVacancyMutation.mutate(vacancyId);
  };

  // Filter open vacancies (not closed)
  const openVacancies = vacancies.filter(vacancy => vacancy.status !== "closed");
  const closedVacancies = vacancies.filter(vacancy => vacancy.status === "closed");

  const formatDateTime = (date: string | Date | null) => {
    if (!date) return "Not set";
    try {
      return format(new Date(date), "MMM dd, yyyy 'at' h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div className="min-h-screen bg-neutral">
      <Header />
      <MobileNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-20 md:mb-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">Vacancy Log</h1>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-sm">
              {openVacancies.length} Open Vacanc{openVacancies.length !== 1 ? 'ies' : 'y'}
            </Badge>
            <Button 
              onClick={() => setIsVacancyModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-record-vacancy"
            >
              + Record Vacancy
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading vacancies...</div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Open Vacancies Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Home className="w-5 h-5" />
                Open Vacancies ({openVacancies.length})
              </h2>
              
              {openVacancies.length === 0 ? (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Home className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Open Vacancies</h3>
                      <p className="text-gray-500">All properties are currently occupied or closed.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {openVacancies.map((vacancy) => (
                    <Card key={vacancy.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Building className="w-4 h-4" />
                            Property {vacancy.property}
                          </CardTitle>
                          <Badge className={getStatusColor(vacancy.status)} data-testid={`status-${vacancy.id}`}>
                            {vacancy.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>Apartment {vacancy.apartmentNumber}</span>
                        </div>
                        
                        {vacancy.startDate && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>Start: {formatDateTime(vacancy.startDate)}</span>
                          </div>
                        )}
                        
                        {vacancy.endDate && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>End: {formatDateTime(vacancy.endDate)}</span>
                          </div>
                        )}
                        
                        {vacancy.notes && (
                          <div className="text-sm text-gray-600">
                            <strong>Notes:</strong> {vacancy.notes}
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-500">
                          Recorded: {formatDateTime(vacancy.createdAt)}
                        </div>
                        
                        <div className="pt-2">
                          <Button
                            onClick={() => handleCloseVacancy(vacancy.id)}
                            disabled={closeVacancyMutation.isPending}
                            variant="outline"
                            size="sm"
                            className="w-full"
                            data-testid={`button-close-vacancy-${vacancy.id}`}
                          >
                            {closeVacancyMutation.isPending ? "Closing..." : "Close Vacancy"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Closed Vacancies Section */}
            {closedVacancies.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  Recently Closed ({closedVacancies.length})
                </h2>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {closedVacancies.slice(0, 6).map((vacancy) => (
                    <Card key={vacancy.id} className="opacity-75">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Building className="w-4 h-4" />
                            Property {vacancy.property}
                          </CardTitle>
                          <Badge className={getStatusColor(vacancy.status)}>
                            {vacancy.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>Apartment {vacancy.apartmentNumber}</span>
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          Recorded: {formatDateTime(vacancy.createdAt)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <VacancyModal 
        isOpen={isVacancyModalOpen} 
        onClose={() => setIsVacancyModalOpen(false)} 
      />
    </div>
  );
}