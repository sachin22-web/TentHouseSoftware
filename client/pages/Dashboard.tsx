import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  Package,
  Users,
  Receipt,
  AlertTriangle,
  ArrowUpRight,
  Calendar,
} from "lucide-react";
import { reportsAPI, eventAPI } from "@/lib/api";

interface DashboardData {
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
  lowStockProducts: Array<{
    _id: string;
    name: string;
    stockQty: number;
    category: string;
  }>;
  recentInvoices: Array<{
    _id: string;
    number: string;
    clientId: { name: string } | null;
    totals: { grandTotal: number };
    createdAt: string;
  }>;
  topProducts: Array<{
    product: { name: string };
    totalQty: number;
    totalRevenue: number;
  }>;
  dailySales: Array<{
    _id: string;
    sales: number;
    count: number;
  }>;
}

type UpcomingEvent = {
  _id: string;
  name?: string;
  dateFrom?: string;
  dateTo?: string;
  clientId?: { name?: string } | string | null;
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("today");
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await reportsAPI.getDashboard({ range });

      // Validate and sanitize the response data
      const rawData = response.data;
      const validatedData = {
        ...rawData,
        recentInvoices: rawData.recentInvoices || [],
        lowStockProducts: rawData.lowStockProducts || [],
        topProducts: rawData.topProducts || [],
        dailySales: rawData.dailySales || [],
        summary: rawData.summary || {
          totalSales: 0,
          totalReturns: 0,
          netRevenue: 0,
          netProfit: 0,
          totalInvoices: 0,
          totalProducts: 0,
          totalClients: 0,
          totalWorkers: 0,
        },
      };

      setData(validatedData);
    } catch (error: any) {
      console.error("Dashboard error:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingEvents = async () => {
    try {
      const nowIso = new Date().toISOString();
      const resp = await eventAPI.getAll({
        fromDate: nowIso,
        page: 1,
        limit: 100,
      });
      const events: UpcomingEvent[] = Array.isArray(resp.data?.events)
        ? resp.data.events
        : [];
      const now = Date.now();
      // keep only events starting in the future or currently ongoing
      const future = events.filter((e) => {
        const start = new Date(e.dateFrom || e.dateTo || 0).getTime();
        const end = new Date(e.dateTo || e.dateFrom || 0).getTime();
        return start >= now || end >= now;
      });
      // sort by nearest upcoming start date
      const sorted = future.sort((a, b) => {
        const ad = new Date(a.dateFrom || a.dateTo || 0).getTime();
        const bd = new Date(b.dateFrom || b.dateTo || 0).getTime();
        return ad - bd;
      });
      setUpcomingEvents(sorted);
      const total = resp.data?.pagination?.total ?? sorted.length;
      setUpcomingCount(Number(total) || 0);
    } catch (err) {
      console.error("Upcoming events fetch error:", err);
      setUpcomingCount(0);
      setUpcomingEvents([]);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchUpcomingEvents();
  }, [range]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load dashboard data</p>
        <Button onClick={fetchDashboardData} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  const stats = [
    {
      title: "Total Sales",
      value: `₹${data.summary.totalSales.toLocaleString()}`,
      icon: DollarSign,
      change: "+12.5%",
      changeType: "positive" as const,
      subtitle: "from last period",
    },
    {
      title: "Net Revenue",
      value: `₹${data.summary.netRevenue.toLocaleString()}`,
      icon: TrendingUp,
      change: "+8.2%",
      changeType: "positive" as const,
      subtitle: "from last period",
    },
    {
      title: "Upcoming Events",
      value: upcomingCount.toString(),
      icon: Calendar,
      changeType: "positive" as const,
      subtitle: "scheduled from today",
    },
    {
      title: "Net Profit",
      value: `₹${data.summary.netProfit.toLocaleString()}`,
      icon: TrendingUp,
      change: "+5.4%",
      changeType: "positive" as const,
      subtitle: "from last period",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Welcome back! Here's what's happening with your business.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.subtitle && (
                <p className="text-xs text-muted-foreground">
                  {stat.change && (
                    <span
                      className={
                        stat.changeType === "positive"
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {stat.change}
                    </span>
                  )}
                  {stat.change ? " " : ""}
                  {stat.subtitle}
                </p>
              )}

              {stat.title === "Upcoming Events" && (
                <div className="mt-3 space-y-2 max-h-40 overflow-y-auto pr-1">
                  {upcomingEvents && upcomingEvents.length > 0 ? (
                    upcomingEvents.slice(0, 20).map((ev) => {
                      const startRaw = ev.dateFrom || "";
                      const endRaw = ev.dateTo || "";
                      const startStr = startRaw
                        ? new Date(startRaw).toLocaleDateString()
                        : "";
                      const endStr =
                        endRaw && endRaw !== startRaw
                          ? new Date(endRaw).toLocaleDateString()
                          : "";
                      const dateStr = endStr
                        ? `${startStr} - ${endStr}`
                        : startStr || "-";
                      return (
                        <div
                          key={ev._id}
                          className="flex items-center justify-between"
                        >
                          <div className="min-w-0">
                            <Link
                              to={`/event-details/${ev._id}`}
                              className="text-sm font-medium truncate text-blue-700 hover:underline"
                            >
                              {ev.name || "Untitled Event"}
                            </Link>
                            {typeof ev.clientId === "object" && ev.clientId && (
                              <p className="text-xs text-gray-500 truncate">
                                {(ev.clientId as any).name}
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 whitespace-nowrap">
                            {dateStr}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-gray-500">No upcoming events</p>
                  )}
                  <div className="flex justify-end pt-1">
                    <Link
                      to="/events"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View All
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>Latest billing activity</CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/invoices">
                View All <ArrowUpRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentInvoices && data.recentInvoices.length > 0 ? (
                data.recentInvoices.slice(0, 5).map((invoice) => (
                  <div
                    key={invoice._id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-sm">{invoice.number}</p>
                      <p className="text-xs text-gray-500">
                        {invoice.clientId?.name || "Unknown Client"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">
                        ₹{invoice.totals.grandTotal.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(invoice.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No recent invoices found
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Low Stock Alert
              </CardTitle>
              <CardDescription>
                Products running low on inventory
              </CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/stock">
                View Stock <ArrowUpRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.lowStockProducts && data.lowStockProducts.length > 0 ? (
                data.lowStockProducts.map((product) => (
                  <div
                    key={product._id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-gray-500">
                        {product.category}
                      </p>
                    </div>
                    <Badge variant="destructive">{product.stockQty} left</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  All products have sufficient stock
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks you might want to perform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="h-20 flex-col gap-2">
              <Link to="/invoices">
                <Receipt className="h-5 w-5" />
                Create Invoice
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col gap-2">
              <Link to="/clients">
                <Users className="h-5 w-5" />
                Add Client
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col gap-2">
              <Link to="/products">
                <Package className="h-5 w-5" />
                Add Product
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col gap-2">
              <Link to="/attendance">
                <Calendar className="h-5 w-5" />
                Mark Attendance
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Business Overview */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.totalClients}
            </div>
            <p className="text-xs text-muted-foreground">Active customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.totalProducts}
            </div>
            <p className="text-xs text-muted-foreground">In inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Workers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.totalWorkers}
            </div>
            <p className="text-xs text-muted-foreground">Team members</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
