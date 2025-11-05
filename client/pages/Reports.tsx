import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  FileText,
  Users,
  Package,
  Download,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { getAuthToken } from '@/lib/api';

interface DashboardSummary {
  summary: {
    totalSales: number;
    totalReturns: number;
    netRevenue: number;
    netProfit: number;
    totalInvoices: number;
    totalProducts: number;
    totalClients: number;
    totalWorkers: number;
  };
  lowStockProducts: any[];
  recentInvoices: any[];
  topProducts: any[];
  dailySales: any[];
  dateRange: {
    startDate: string;
    endDate: string;
    range: string;
  };
}

interface TimeseriesData {
  x: string;
  sales: number;
  profit: number;
  invoices: number;
}

export default function Reports() {
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [timeseriesData, setTimeseriesData] = useState<TimeseriesData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRange, setSelectedRange] = useState('today');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [granularity, setGranularity] = useState('day');

  useEffect(() => {
    fetchDashboardData();
    fetchTimeseriesData();
  }, [selectedRange, customFromDate, customToDate]);

  useEffect(() => {
    fetchTimeseriesData();
  }, [granularity]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('range', selectedRange);
      
      if (selectedRange === 'custom' && customFromDate && customToDate) {
        params.append('from', customFromDate);
        params.append('to', customToDate);
      }

      const response = await fetch(`/api/reports/summary?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch dashboard data' }));
        toast.error(errorData.error || 'Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeseriesData = async () => {
    try {
      const params = new URLSearchParams();
      params.append('gran', granularity);
      
      if (selectedRange === 'custom' && customFromDate && customToDate) {
        params.append('from', customFromDate);
        params.append('to', customToDate);
      }

      const response = await fetch(`/api/reports/timeseries?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTimeseriesData(data);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch timeseries data' }));
        toast.error(errorData.error || 'Failed to fetch timeseries data');
      }
    } catch (error) {
      console.error('Error fetching timeseries data:', error);
      toast.error('Failed to fetch timeseries data');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const exportToCSV = () => {
    if (!timeseriesData.length) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Date', 'Sales', 'Profit', 'Invoices'];
    const csvContent = [
      headers.join(','),
      ...timeseriesData.map(row => [
        row.x,
        row.sales,
        row.profit,
        row.invoices
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mannat-reports-${selectedRange}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Report exported successfully');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Analytics & Reports</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => { fetchDashboardData(); fetchTimeseriesData(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Report Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="range">Time Period</Label>
              <Select value={selectedRange} onValueChange={setSelectedRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedRange === 'custom' && (
              <>
                <div>
                  <Label htmlFor="fromDate">From Date</Label>
                  <Input
                    id="fromDate"
                    type="date"
                    value={customFromDate}
                    onChange={(e) => setCustomFromDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="toDate">To Date</Label>
                  <Input
                    id="toDate"
                    type="date"
                    value={customToDate}
                    onChange={(e) => setCustomToDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="granularity">Chart Granularity</Label>
              <Select value={granularity} onValueChange={setGranularity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          {dashboardData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(dashboardData.summary.totalSales)}</div>
                  <p className="text-xs text-muted-foreground">
                    Returns: {formatCurrency(dashboardData.summary.totalReturns)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(dashboardData.summary.netRevenue)}</div>
                  <p className="text-xs text-muted-foreground">
                    Profit: {formatCurrency(dashboardData.summary.netProfit)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(dashboardData.summary.totalInvoices)}</div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardData.dateRange.range.charAt(0).toUpperCase() + dashboardData.dateRange.range.slice(1)} period
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Business Stats</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm">Clients:</span>
                      <span className="font-medium">{formatNumber(dashboardData.summary.totalClients)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Products:</span>
                      <span className="font-medium">{formatNumber(dashboardData.summary.totalProducts)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Workers:</span>
                      <span className="font-medium">{formatNumber(dashboardData.summary.totalWorkers)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Sales & Profit Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Sales & Profit Trends</CardTitle>
              <CardDescription>
                Track your sales and profit over time with {granularity} granularity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {timeseriesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={timeseriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="x" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'sales' || name === 'profit' ? formatCurrency(Number(value)) : formatNumber(Number(value)),
                        name === 'sales' ? 'Sales' : name === 'profit' ? 'Profit' : 'Invoices'
                      ]}
                    />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Sales"
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="profit" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="Profit"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="invoices" 
                      stroke="#ffc658" 
                      strokeWidth={2}
                      name="Invoices"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-40 text-muted-foreground">
                  No data available for the selected period
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Products and Low Stock */}
          {dashboardData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Products */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Top Selling Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData.topProducts.length > 0 ? (
                    <div className="space-y-3">
                      {dashboardData.topProducts.map((product, index) => (
                        <div key={product._id} className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{product.product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Sold: {formatNumber(product.totalQty)} units
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(product.totalRevenue)}</div>
                            <Badge variant="secondary">#{index + 1}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No sales data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Low Stock Alert */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Low Stock Alert
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData.lowStockProducts.length > 0 ? (
                    <div className="space-y-3">
                      {dashboardData.lowStockProducts.map((product) => (
                        <div key={product._id} className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">{product.category}</div>
                          </div>
                          <Badge variant="destructive">
                            {formatNumber(product.stockQty || product.stock)} left
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      All products are well stocked
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Invoices */}
          {dashboardData && dashboardData.recentInvoices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Recent Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData.recentInvoices.map((invoice) => (
                    <div key={invoice._id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <div className="font-medium">
                          {invoice.clientId?.name || 'Unknown Client'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(invoice.createdAt).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(invoice.totals.grandTotal)}</div>
                        <Badge variant={invoice.status === 'final' ? 'default' : 'secondary'}>
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
