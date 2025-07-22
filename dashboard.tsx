
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, Users, Package, HardDrive, Activity, TrendingUp, Eye, ShoppingCart, 
  Monitor, Server, Laptop, Cpu, BarChart3, PieChart, Settings, Plus, FileText, 
  Wrench, UserPlus, AlertTriangle, CheckCircle, Clock, Shield, Zap, Database,
  Building2, Wrench as Tools, Briefcase, Star, Target, Gauge, MapPin
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const response = await fetch("/api/stats", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const { data: assets } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const response = await fetch("/api/assets", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch assets");
      return response.json();
    },
  });

  const { data: activities } = useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const response = await fetch("/api/activities", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch activities");
      return response.json();
    },
  });

  const { data: vmData } = useQuery({
    queryKey: ["vm-monitoring"],
    queryFn: async () => {
      const response = await fetch("/api/vm-monitoring", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch VM data");
      return response.json();
    },
  });

  const { data: licenses } = useQuery({
    queryKey: ["licenses"],
    queryFn: async () => {
      const response = await fetch("/api/licenses", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch licenses");
      return response.json();
    },
  });

  // Calculate contextual IT metrics
  const totalAssets = assets?.length || 0;
  const activeAssets = assets?.filter((asset: any) => asset.status === 'assigned' || asset.status === 'deployed').length || 0;
  const pendingAssets = assets?.filter((asset: any) => asset.status === 'pending').length || 0;
  const maintenanceAssets = assets?.filter((asset: any) => asset.condition === 'Bad').length || 0;
  const retiredAssets = assets?.filter((asset: any) => asset.status === 'retired' || asset.status === 'disposed').length || 0;
  
  const totalLicenses = licenses?.length || 0;
  const expiringSoon = licenses?.filter((license: any) => {
    if (!license.expiryDate) return false;
    const expiryDate = new Date(license.expiryDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow;
  }).length || 0;

  const runningVMs = vmData?.filter((vm: any) => vm.status === 'running').length || 0;
  const totalVMs = vmData?.length || 0;

  const utilizationRate = totalAssets > 0 ? Math.round((activeAssets / totalAssets) * 100) : 0;
  const availabilityRate = totalAssets > 0 ? Math.round((pendingAssets / totalAssets) * 100) : 0;

  // Asset distribution data for charts
  const assetStatusData = [
    { name: 'Active', value: activeAssets, color: '#10B981' },
    { name: 'Pending Deploy', value: pendingAssets, color: '#3B82F6' },
    { name: 'Bad Condition', value: maintenanceAssets, color: '#F59E0B' },
    { name: 'Retired', value: retiredAssets, color: '#6B7280' }
  ];

  const categoryData = assets?.reduce((acc: any, asset: any) => {
    const category = asset.category || 'Other';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {}) || {};

  const categoryChartData = Object.entries(categoryData).map(([name, value]) => ({
    name,
    value: value as number
  }));

  // Recent critical activities
  const criticalActivities = activities?.filter((activity: any) => 
    activity.action === 'checkout' || 
    activity.action === 'checkin' || 
    activity.action === 'maintenance'
  ).slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      

      <div className="p-6 space-y-6">
        {/* IT Operations Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg cursor-pointer transition-transform hover:scale-105" onClick={() => window.location.href = '/assets'}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total IT Assets</p>
                  <p className="text-3xl font-bold mt-1 hover:underline">{totalAssets}</p>
                  <div className="flex items-center mt-2 text-xs text-blue-100">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    <span>{activeAssets} currently deployed</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Laptop className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg cursor-pointer transition-transform hover:scale-105" onClick={() => window.location.href = '/assets?status=assigned,deployed'}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Asset Utilization</p>
                  <p className="text-3xl font-bold mt-1 hover:underline">{utilizationRate}%</p>
                  <div className="w-full bg-emerald-400/30 rounded-full h-1.5 mt-2">
                    <div 
                      className="bg-white rounded-full h-1.5 transition-all duration-300"
                      style={{ width: `${utilizationRate}%` }}
                    />
                  </div>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Gauge className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0 shadow-lg cursor-pointer transition-transform hover:scale-105" onClick={() => window.location.href = '/licenses?filter=expiring'}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">Licenses Expiring</p>
                  <p className="text-3xl font-bold mt-1 hover:underline">{expiringSoon}</p>
                  <div className="flex items-center mt-2 text-xs text-amber-100">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    <span>Next 30 days</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Shield className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg cursor-pointer transition-transform hover:scale-105" onClick={() => window.location.href = '/vm-monitoring?status=running'}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">VM Infrastructure</p>
                  <p className="text-3xl font-bold mt-1 hover:underline">{runningVMs}/{totalVMs}</p>
                  <div className="flex items-center mt-2 text-xs text-purple-100">
                    <Zap className="h-3 w-3 mr-1" />
                    <span>Running / Total VMs</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Server className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Operational Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-l-4 border-l-green-500 cursor-pointer transition-transform hover:scale-105" onClick={() => window.location.href = '/assets?status=pending'}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-green-700">Assets Ready for Deploy</CardTitle>
                  <CardDescription>Equipment with pending status</CardDescription>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 mb-2 hover:underline">{pendingAssets}</div>
              <Progress value={availabilityRate} className="h-2" />
              <p className="text-sm text-gray-600 mt-2">{availabilityRate}% pending deployment</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500 cursor-pointer transition-transform hover:scale-105" onClick={() => window.location.href = '/assets?condition=Bad'}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-yellow-700">Assets Needing Attention</CardTitle>
                  <CardDescription>Assets with bad condition</CardDescription>
                </div>
                <Tools className="h-8 w-8 text-yellow-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700 mb-2 hover:underline">{maintenanceAssets}</div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <AlertTriangle className="h-4 w-4" />
                <span>Bad condition - requires attention</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 cursor-pointer transition-transform hover:scale-105" onClick={() => window.location.href = '/assets?status=assigned,deployed'}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-blue-700">Active Deployments</CardTitle>
                  <CardDescription>Currently in use</CardDescription>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 mb-2 hover:underline">{activeAssets}</div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>Deployed across departments</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* IT Management Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              IT Management Actions
            </CardTitle>
            <CardDescription>Quick access to common IT operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-300 group"
                onClick={() => window.location.href = '/assets?action=deploy'}
              >
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Plus className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium">Deploy Asset</span>
              </Button>

              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-green-50 hover:border-green-300 group"
                onClick={() => window.location.href = '/assets?status=deployed'}
              >
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <span className="text-sm font-medium">Check In</span>
              </Button>

              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-purple-50 hover:border-purple-300 group"
                onClick={() => window.location.href = '/licenses'}
              >
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <span className="text-sm font-medium">License Mgmt</span>
              </Button>

              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-orange-50 hover:border-orange-300 group"
                onClick={() => window.location.href = '/vm-monitoring'}
              >
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                  <Server className="h-5 w-5 text-orange-600" />
                </div>
                <span className="text-sm font-medium">VM Monitor</span>
              </Button>

              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-teal-50 hover:border-teal-300 group"
                onClick={() => window.location.href = '/network-discovery'}
              >
                <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                  <Activity className="h-5 w-5 text-teal-600" />
                </div>
                <span className="text-sm font-medium">Network Scan</span>
              </Button>

              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-red-50 hover:border-red-300 group"
                onClick={() => window.location.href = '/reports'}
              >
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center group-hover:bg-red-200 transition-colors">
                  <BarChart3 className="h-5 w-5 text-red-600" />
                </div>
                <span className="text-sm font-medium">IT Reports</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Analytics and Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-blue-600" />
                Asset Distribution Analysis
              </CardTitle>
              <CardDescription>Current status breakdown of IT assets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={assetStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {assetStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Recent IT Operations
              </CardTitle>
              <CardDescription>Latest asset management activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {criticalActivities.length > 0 ? (
                  criticalActivities.map((activity: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        {activity.action === 'checkout' && <Package className="h-4 w-4 text-blue-600" />}
                        {activity.action === 'checkin' && <CheckCircle className="h-4 w-4 text-green-600" />}
                        {activity.action === 'maintenance' && <Tools className="h-4 w-4 text-yellow-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{activity.notes}</p>
                        <p className="text-xs text-gray-500">{format(new Date(activity.timestamp), 'MMM dd, HH:mm')}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <Activity className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">No recent activities</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Health Monitoring */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              IT Infrastructure Health
            </CardTitle>
            <CardDescription>Monitor the health and performance of your IT infrastructure</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center cursor-pointer transition-transform hover:scale-105" onClick={() => window.location.href = '/vm-monitoring?status=running'}>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-600 mb-1 hover:underline">{Math.round((runningVMs / (totalVMs || 1)) * 100)}%</div>
                <p className="text-sm text-gray-600">VM Uptime</p>
              </div>
              
              <div className="text-center cursor-pointer transition-transform hover:scale-105" onClick={() => window.location.href = '/assets?status=assigned,deployed'}>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Laptop className="h-8 w-8 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-600 mb-1 hover:underline">{utilizationRate}%</div>
                <p className="text-sm text-gray-600">Asset Utilization</p>
              </div>
              
              <div className="text-center cursor-pointer transition-transform hover:scale-105" onClick={() => window.location.href = '/licenses?status=active'}>
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="text-2xl font-bold text-yellow-600 mb-1 hover:underline">{totalLicenses - expiringSoon}</div>
                <p className="text-sm text-gray-600">Valid Licenses</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="h-8 w-8 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-600 mb-1">98.5%</div>
                <p className="text-sm text-gray-600">System Uptime</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
