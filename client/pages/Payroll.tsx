import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Plus,
  Search,
  RefreshCw,
  DollarSign,
  Calendar as CalendarIcon,
  Users,
  Calculator,
  Download,
  Eye,
} from 'lucide-react';
import { payrollAPI, workerAPI } from '@/lib/api';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

interface Worker {
  _id: string;
  name: string;
  phone: string;
  dailyRate: number;
  halfDayRate: number;
}

interface PayrollRecord {
  _id: string;
  workerId: Worker;
  month: string;
  year: number;
  fullDays: number;
  halfDays: number;
  absentDays: number;
  totalWorkingDays: number;
  totalAmount: number;
  advanceAmount: number;
  netAmount: number;
  status: 'draft' | 'approved' | 'paid';
  createdAt: string;
  updatedAt: string;
}

interface PayrollCalculation {
  workerId: string;
  month: string;
  year: number;
  fullDays: number;
  halfDays: number;
  absentDays: number;
  totalWorkingDays: number;
  fullDayAmount: number;
  halfDayAmount: number;
  totalAmount: number;
  dailyRate: number;
  halfDayRate: number;
}

interface PayrollFormData {
  workerId: string;
  month: Date;
  advanceAmount: string;
}

const initialFormData: PayrollFormData = {
  workerId: '',
  month: new Date(),
  advanceAmount: '0',
};

export default function Payroll() {
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [calculation, setCalculation] = useState<PayrollCalculation | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<PayrollFormData>(initialFormData);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        month: format(monthFilter, 'yyyy-MM'),
        status: statusFilter === 'all' ? '' : statusFilter,
      };
      
      const response = await payrollAPI.getAll(params);
      setPayrolls(response.data.payrolls || []);
      setPagination(response.data.pagination || { page: 1, limit: 10, total: 0, pages: 0 });
    } catch (error: any) {
      console.error('Fetch payrolls error:', error);
      toast.error('Failed to load payroll records');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    try {
      const response = await workerAPI.getAll({ limit: 100 });
      setWorkers(response.data.workers || []);
    } catch (error) {
      console.error('Fetch workers error:', error);
    }
  };

  useEffect(() => {
    fetchPayrolls();
  }, [pagination.page, searchTerm, monthFilter, statusFilter]);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const calculatePayroll = async () => {
    if (!formData.workerId) {
      toast.error('Please select a worker');
      return;
    }

    setIsCalculating(true);
    try {
      const monthStr = format(formData.month, 'yyyy-MM');
      const response = await payrollAPI.calculate(formData.workerId, monthStr);
      setCalculation(response.data);
    } catch (error: any) {
      console.error('Calculate payroll error:', error);
      toast.error(error.response?.data?.error || 'Failed to calculate payroll');
      setCalculation(null);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!calculation) {
      toast.error('Please calculate payroll first');
      return;
    }

    const advanceAmount = parseFloat(formData.advanceAmount) || 0;
    const netAmount = calculation.totalAmount - advanceAmount;

    const payrollData = {
      workerId: formData.workerId,
      month: format(formData.month, 'yyyy-MM'),
      daysFull: calculation.fullDays,
      daysHalf: calculation.halfDays,
      advances: advanceAmount,
      totalPay: calculation.totalAmount,
      notes: ''
    };

    try {
      await payrollAPI.create(payrollData);
      toast.success('Payroll record created successfully');
      
      setIsDialogOpen(false);
      setFormData(initialFormData);
      setCalculation(null);
      fetchPayrolls();
    } catch (error: any) {
      console.error('Create payroll error:', error);
      if (error.response?.status === 409) {
        toast.error('Payroll already exists for this worker and month');
      } else {
        toast.error(error.response?.data?.error || 'Failed to create payroll');
      }
    }
  };

  const resetDialog = () => {
    setIsDialogOpen(false);
    setFormData(initialFormData);
    setCalculation(null);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'approved': return 'default';
      case 'paid': return 'outline';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-yellow-600';
      case 'approved': return 'text-blue-600';
      case 'paid': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
          <p className="text-gray-600">Calculate and manage worker payroll</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Generate Payroll
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Generate Payroll</DialogTitle>
              <DialogDescription>
                Calculate payroll for a worker based on their attendance.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="workerId">Worker *</Label>
                    <Select
                      value={formData.workerId}
                      onValueChange={(value) => {
                        setFormData({ ...formData, workerId: value });
                        setCalculation(null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select worker" />
                      </SelectTrigger>
                      <SelectContent>
                        {workers.map((worker) => (
                          <SelectItem key={worker._id} value={worker._id}>
                            {worker.name} - ₹{worker.dailyRate}/day
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Month *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.month && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.month ? format(formData.month, "MMMM yyyy") : <span>Pick a month</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.month}
                          onSelect={(date) => {
                            if (date) {
                              setFormData({ ...formData, month: startOfMonth(date) });
                              setCalculation(null);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                {/* Calculate Button */}
                <div className="flex justify-center">
                  <Button 
                    type="button" 
                    onClick={calculatePayroll}
                    disabled={!formData.workerId || isCalculating}
                    className="w-full"
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    {isCalculating ? 'Calculating...' : 'Calculate Payroll'}
                  </Button>
                </div>
                
                {/* Calculation Results */}
                {calculation && (
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold">Payroll Calculation</h4>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>Worker:</strong> {workers.find(w => w._id === formData.workerId)?.name}</p>
                        <p><strong>Month:</strong> {format(formData.month, 'MMMM yyyy')}</p>
                        <p><strong>Daily Rate:</strong> ₹{calculation.dailyRate}</p>
                        <p><strong>Half Day Rate:</strong> ₹{calculation.halfDayRate}</p>
                      </div>
                      
                      <div>
                        <p><strong>Full Days:</strong> {calculation.fullDays}</p>
                        <p><strong>Half Days:</strong> {calculation.halfDays}</p>
                        <p><strong>Absent Days:</strong> {calculation.absentDays}</p>
                        <p><strong>Total Working Days:</strong> {calculation.totalWorkingDays}</p>
                      </div>
                    </div>
                    
                    <div className="border-t pt-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p>Full Day Amount: ₹{(calculation.fullDayAmount || 0).toFixed(2)}</p>
                          <p>Half Day Amount: ₹{(calculation.halfDayAmount || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="font-bold text-lg">Total: ₹{(calculation.totalAmount || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Advance Amount */}
                {calculation && (
                  <div>
                    <Label htmlFor="advanceAmount">Advance Amount (₹)</Label>
                    <Input
                      id="advanceAmount"
                      type="number"
                      value={formData.advanceAmount}
                      onChange={(e) => setFormData({ ...formData, advanceAmount: e.target.value })}
                      placeholder="Enter advance amount"
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}
                
                {/* Net Amount */}
                {calculation && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Net Payable Amount:</span>
                      <span className="font-bold text-lg text-green-700">
                        ₹{((calculation.totalAmount || 0) - (parseFloat(formData.advanceAmount) || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!calculation}>
                  Generate Payroll
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search workers..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-48">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(monthFilter, "MMMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={monthFilter}
                  onSelect={(date) => date && setMonthFilter(startOfMonth(date))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={fetchPayrolls}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payroll Records ({pagination.total})
          </CardTitle>
          <CardDescription>
            Payroll records for {format(monthFilter, "MMMM yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : payrolls.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No payroll records found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : `No payroll generated for ${format(monthFilter, "MMMM yyyy")}.`
                }
              </p>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Generate Payroll
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Advance</TableHead>
                    <TableHead>Net Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrolls.map((payroll) => (
                    <TableRow key={payroll._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium">{payroll.workerId?.name}</div>
                            <div className="text-sm text-gray-500">{payroll.workerId?.phone}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(payroll.year, parseInt(payroll.month.split('-')[1]) - 1), 'MMMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Full: {payroll.fullDays}</div>
                          <div>Half: {payroll.halfDays}</div>
                          <div>Absent: {payroll.absentDays}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">₹{(payroll.totalAmount || 0).toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        {payroll.advanceAmount > 0 ? (
                          <span className="text-red-600">��{(payroll.advanceAmount || 0).toFixed(2)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-green-600">₹{(payroll.netAmount || 0).toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={getStatusBadgeVariant(payroll.status)}
                          className={getStatusColor(payroll.status)}
                        >
                          {payroll.status.charAt(0).toUpperCase() + payroll.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} records
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === pagination.pages}
                      onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
