import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AssetTable from "@/components/assets/asset-table";
import AssetForm from "@/components/assets/asset-form";
import CSVImport from '@/components/assets/csv-import';
import {
  PlusIcon,
  SearchIcon,
  FileDownIcon,
  UploadIcon,
  FileIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  FilterIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { downloadCSV } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Asset, AssetCategories, AssetStatus } from "@shared/schema";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "wouter";

export default function Assets() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null);

  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [importResults, setImportResults] = useState<{
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tableFilteredAssets, setTableFilteredAssets] = useState<Asset[]>([]);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [conditionFilter, setConditionFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Handle URL parameters for dashboard filtering
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const statusParam = urlParams.get('status');
    const conditionParam = urlParams.get('condition');
    const actionParam = urlParams.get('action');
    const filterParam = urlParams.get('filter');

    if (statusParam) {
      if (statusParam.includes(',')) {
        // Handle multiple statuses like "assigned,deployed"
        setStatusFilter('active'); // Custom filter for deployed assets
      } else {
        setStatusFilter(statusParam);
      }
    }

    if (conditionParam) {
      setConditionFilter(conditionParam);
    }

    if (actionParam === 'deploy') {
      setStatusFilter('pending');
    }

    if (filterParam === 'expiring') {
      // This would be for licenses, but if accessed here, show all assets
      setStatusFilter('all');
    }
  }, []);

  // ✅ Add the missing queryFn to fetch data
  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
    queryFn: async () => {
      const res = await fetch('/api/assets');
      if (!res.ok) throw new Error('Failed to fetch assets');
      return res.json();
    },
  });

  const createAssetMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/assets', data);
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate all asset-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      // Force refetch of assets
      queryClient.refetchQueries({ queryKey: ['/api/assets'] });
      setIsAddDialogOpen(false);
      toast({
        title: "Asset created",
        description: "The asset has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create asset",
        variant: "destructive",
      });
    }
  });

  const updateAssetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest('PATCH', `/api/assets/${id}`, data);
      return await response.json();
    },
    onSuccess: (updatedAsset, { id }) => {
      // Invalidate all asset-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: [`/api/assets/${id}`] });
      // Force refetch of assets
      queryClient.refetchQueries({ queryKey: ['/api/assets'] });
      setAssetToEdit(null);
      toast({
        title: "Asset updated",
        description: "The asset has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update asset",
        variant: "destructive",
      });
    }
  });

  // Cleanup Knox IDs mutation
  const cleanupKnoxMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/assets/cleanup-knox');
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Knox IDs Cleaned Up",
        description: `${data.count || 0} assets were updated to remove Knox IDs from assets that are not checked out.`
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clean up Knox IDs",
        variant: "destructive"
      });
    }
  });

  // Import assets mutation
  const importAssetsMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/assets/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Import failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });

      setImportResults({
        total: data.total || 0,
        successful: data.successful || 0,
        failed: data.failed || 0,
        errors: data.errors || []
      });

      setIsImporting(false);
      setImportProgress(100);
    },
    onError: (error) => {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import assets",
        variant: "destructive"
      });
      setIsImporting(false);
      setImportProgress(0);
    }
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/assets/${id}`);
    },
    onSuccess: () => {
      // Invalidate all asset-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      // Force refetch of assets
      queryClient.refetchQueries({ queryKey: ['/api/assets'] });
      setAssetToDelete(null);
      toast({
        title: "Asset deleted",
        description: "The asset has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete asset",
        variant: "destructive",
      });
    }
  });

  const uniqueDepartments = [...new Set(assets.map(asset => asset.department).filter(Boolean))] as string[];
  const uniqueCategories = [...new Set(assets.map(asset => asset.category).filter(Boolean))] as string[];

  // Filter assets based on search term, status, and condition
  const filteredAssets = assets.filter(asset => {
    const matchesSearch =
      asset.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.assetTag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.knoxId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.assignedTo?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === "all" || asset.category === categoryFilter;
    let matchesStatus = true;
    if (statusFilter === "active") {
      // Custom filter for active/deployed assets
      matchesStatus = asset.status === "assigned" || asset.status === "deployed";
    } else if (statusFilter !== "all") {
      matchesStatus = asset.status === statusFilter;
    }
    const matchesDepartment = departmentFilter === "all" || asset.department === departmentFilter;
    const matchesCondition = conditionFilter === "all" || asset.condition === conditionFilter;

    return matchesSearch && matchesCategory && matchesStatus && matchesDepartment && matchesCondition;
  });

  // Count assets assigned to the same Knox ID when searching by Knox ID
  const getKnoxIdCount = (knoxId: string) => {
    if (!knoxId) return 0;
    return assets.filter(asset => asset.knoxId?.toLowerCase() === knoxId.toLowerCase()).length;
  };

  const handleExport = () => {
    const assetsToExport = tableFilteredAssets.length > 0 ? tableFilteredAssets : filteredAssets;

    if (assetsToExport.length === 0) {
      toast({
        title: "Export failed",
        description: "No filtered data to export",
        variant: "destructive",
      });
      return;
    }

    const exportData = assetsToExport.map(asset => ({
      id: asset.id,
      assetTag: asset.assetTag,
      name: asset.name,
      knoxId: asset.knoxId || 'N/A',
      ipAddress: asset.ipAddress || 'N/A',
      macAddress: asset.macAddress || 'N/A',
      serialNumber: asset.serialNumber || 'N/A',
      osType: asset.osType || 'N/A',
      status: asset.status,
      category: asset.category,
      purchaseDate: asset.purchaseDate || 'N/A',
    }));

    // Generate filename with filter info
    let filename = 'assets-export';
    const activeFilters = [];
    if (searchTerm) activeFilters.push(`search-${searchTerm.substring(0, 10)}`);
    if (categoryFilter !== 'all') activeFilters.push(`cat-${categoryFilter}`);
    if (statusFilter !== 'all') activeFilters.push(`status-${statusFilter}`);
    if (departmentFilter !== 'all') activeFilters.push(`dept-${departmentFilter}`);

    if (activeFilters.length > 0) {
      filename += `-filtered-${activeFilters.join('-')}`;
    }

    filename += '.csv';

    downloadCSV(exportData, filename);
    toast({
      title: "Export successful",
      description: `${assetsToExport.length} filtered assets exported to CSV`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Assets</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Manage your inventory assets</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Asset
          </Button>
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <UploadIcon className="mr-2 h-4 w-4" />
            Import Assets
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row justify-between gap-4">
          <div className="relative max-w-md w-full">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search assets by name, tag, category, serial number, department, or Knox ID..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Right-side filters and actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Filters section */}
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <FilterIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Filters:</span>
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="deployed">Deployed</SelectItem>
                  <SelectItem value="active">Active (Assigned/Deployed)</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                  <SelectItem value="disposed">Disposed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {uniqueDepartments.map(dept => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={conditionFilter} onValueChange={setConditionFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Conditions</SelectItem>
                  <SelectItem value="Excellent">Excellent</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Bad">Bad</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={() => {
                setCategoryFilter("all");
                setStatusFilter("all");
                setDepartmentFilter("all");
                setConditionFilter("all");
                setSearchTerm("");
              }}>
                Clear Filters
              </Button>
            </div>

            {/* Page size selector */}
            <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm font-medium">Show:</span>
              <Select value={pageSize.toString()} onValueChange={(value) => {
                setPageSize(parseInt(value));
                setPage(1); // Reset to first page when changing page size
              }}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="40">40</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600 dark:text-gray-400">per page</span>
            </div>
            </div>
        </div>
      </div>

      <AssetTable
        assets={filteredAssets}
        isLoading={isLoading}
        onEdit={setAssetToEdit}
        onDelete={setAssetToDelete}
        onFilteredAssetsChange={setTableFilteredAssets}
        pageSize={pageSize}
        currentPage={page}
        onPageChange={setPage}
      />

      {/* Add Asset Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[90vw] lg:max-w-[800px] xl:max-w-[900px] max-h-[90vh] overflow-y-auto resize dialog-form-container">
          <DialogHeader>
            <DialogTitle>Add New Asset</DialogTitle>
            <DialogDescription>
              Create a new asset in the inventory system.
            </DialogDescription>
          </DialogHeader>
          <AssetForm
            onSubmit={(data) => createAssetMutation.mutate(data)}
            isLoading={createAssetMutation.isPending}
          />
        </DialogContent>
      </Dialog>



      {/* Edit Asset Dialog */}
      <Dialog open={!!assetToEdit} onOpenChange={(open) => !open && setAssetToEdit(null)}>
        <DialogContent className="sm:max-w-[90vw] lg:max-w-[800px] xl:max-w-[900px] max-h-[90vh] overflow-y-auto resize dialog-form-container">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>
              Update asset information.
            </DialogDescription>
          </DialogHeader>
          {assetToEdit && (
            <AssetForm
              defaultValues={assetToEdit}
              onSubmit={(data) => updateAssetMutation.mutate({ id: assetToEdit.id, data })}
              isLoading={updateAssetMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Import Assets Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsImportDialogOpen(false);
          setImportResults(null);
          setImportProgress(0);
        }
      }}>
        <DialogContent className="sm:max-w-[600px] dialog-form-container">
          <DialogHeader>
            <DialogTitle className="dark:text-gray-100">Import Assets</DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              Upload a CSV file to import assets in bulk. If you have an Excel file, please save it as CSV format first.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <CSVImport
              importAssetsMutation={importAssetsMutation}
              setIsImporting={setIsImporting}
              setImportProgress={setImportProgress}
              setImportResults={setImportResults}
              toast={toast}
              fileInputRef={fileInputRef}
              isImporting={isImporting}
              importProgress={importProgress}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={!!assetToDelete}
        onClose={() => setAssetToDelete(null)}
        onConfirm={() => assetToDelete && deleteAssetMutation.mutate(assetToDelete.id)}
        itemType="asset"
        itemName={assetToDelete ? `${assetToDelete.name} (${assetToDelete.assetTag})` : ""}
        isLoading={deleteAssetMutation.isPending}
      />
    </div>
  );
}