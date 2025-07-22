import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusIcon, CheckCircleIcon, KeyIcon, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { License } from "@shared/schema";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import LicenseForm from "@/components/licenses/license-form";

export default function Licenses() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Handle URL parameters for dashboard filtering
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const filterParam = urlParams.get('filter');
    const statusParam = urlParams.get('status');

    if (filterParam === 'expiring') {
      setStatusFilter('expiring');
    } else if (statusParam) {
      setStatusFilter(statusParam);
    }
  }, []);

  // Fetch licenses
  const { data: licenses = [], isLoading } = useQuery({
    queryKey: ['/api/licenses'],
    queryFn: async () => {
      const response = await fetch('/api/licenses');
      if (!response.ok) throw new Error('Failed to fetch licenses');
      return response.json();
    },
  });

  // License mutation
  const licensesMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/licenses', data);
    },
    onSuccess: () => {
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/licenses'] });
      toast({
        title: "License added",
        description: "The license has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "There was an error adding the license. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleLicenseSubmit = (data: any) => {
    licensesMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Licenses</h1>
          <p className="text-sm text-gray-600">Manage software licenses and subscriptions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                Add License
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95%] max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add License</DialogTitle>
                <DialogDescription>
                  Enter the details for the software license
                </DialogDescription>
              </DialogHeader>
              <LicenseForm 
                onSubmit={handleLicenseSubmit} 
                isLoading={licensesMutation.isPending} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Licenses Management</CardTitle>
          <CardDescription>Track and manage software licenses and subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : licenses && licenses.length > 0 ? (
            <div className="grid gap-4">
              {licenses.map((license) => (
                <div key={license.id} className="border rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex flex-col md:flex-row justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{license.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                        <KeyIcon className="h-4 w-4" />
                        <span className="font-mono">{license.key.substring(0, 16)}...</span>
                      </div>

                      <div className="mt-4 grid gap-x-4 gap-y-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500">Product</p>
                          <p>{license.name}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Company</p>
                          <p>{license.company || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Seats</p>
                          <p>{license.seats || 'Unlimited'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Purchase Date</p>
                          <p>{formatDate(license.purchaseDate)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Expiration</p>
                          <p>{formatDate(license.expirationDate)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Cost</p>
                          <p>{license.purchaseCost ? `$${license.purchaseCost}` : 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 md:mt-0 flex flex-col md:items-end gap-2">
                      <Badge 
                        className={license.status === 'active' ? 'bg-green-100 text-green-800' : 
                                license.status === 'expired' ? 'bg-red-100 text-red-800' : 
                                'bg-yellow-100 text-yellow-800'}
                      >
                        {license.status.charAt(0).toUpperCase() + license.status.slice(1)}
                      </Badge>
                      <div className="flex gap-2 mt-2">
                        <Link href={`/licenses/${license.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <CheckCircleIcon className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">License Management Ready</h3>
              <p className="text-gray-500 mb-4">
                Click the "Add License" button above to start tracking your software licenses.
              </p>
              <div className="flex justify-center">
                <Link href="/">
                  <Button variant="outline">Return to Dashboard</Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}