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
  UserCheck,
  Calendar as CalendarIcon,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Users,
} from 'lucide-react';
import { attendanceAPI, workerAPI } from '@/lib/api';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Worker {
  _id: string;
  name: string;
  phone: string;
  dailyRate: number;
  halfDayRate: number;
}

interface Attendance {
  _id: string;
  workerId: Worker;
  date: string;
  shift: 'full' | 'half' | 'absent';
  createdAt: string;
}

interface AttendanceFormData {
  workerId: string;
  date: Date;
  shift: 'full' | 'half' | 'absent';
}

const initialFormData: AttendanceFormData = {
  workerId: '',
  date: new Date(),
  shift: 'full',
};

export default function Attendance() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<AttendanceFormData>(initialFormData);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<Date>(new Date());
  const [shiftFilter, setShiftFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    pages: 0,
  });

  const fetchAttendances = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        date: format(dateFilter, 'yyyy-MM-dd'),
        shift: shiftFilter === 'all' ? '' : shiftFilter,
      };
      
      const response = await attendanceAPI.getAll(params);
      setAttendances(response.data.attendances || []);
      setPagination(response.data.pagination || {
        page: 1,
        limit: 15,
        total: 0,
        pages: 0,
      });
    } catch (error: any) {
      console.error('Fetch attendances error:', error);
      toast.error('Failed to load attendance records');
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
    fetchAttendances();
  }, [pagination.page, searchTerm, dateFilter, shiftFilter]);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.workerId) {
      toast.error('Please select a worker');
      return;
    }

    const attendanceData = {
      workerId: formData.workerId,
      date: formData.date,
      shift: formData.shift,
    };

    try {
      await attendanceAPI.mark(attendanceData);
      toast.success('Attendance marked successfully');
      
      setIsDialogOpen(false);
      setFormData({ ...initialFormData, date: formData.date });
      fetchAttendances();
    } catch (error: any) {
      console.error('Mark attendance error:', error);
      if (error.response?.status === 409) {
        toast.error('Attendance already marked for this worker on this date');
      } else {
        toast.error(error.response?.data?.error || 'Failed to mark attendance');
      }
    }
  };

  const resetDialog = () => {
    setIsDialogOpen(false);
    setFormData({ ...initialFormData, date: dateFilter });
  };

  const getShiftBadgeVariant = (shift: string) => {
    switch (shift) {
      case 'full': return 'default';
      case 'half': return 'secondary';
      case 'absent': return 'destructive';
      default: return 'default';
    }
  };

  const getShiftIcon = (shift: string) => {
    switch (shift) {
      case 'full': return <CheckCircle className="h-4 w-4" />;
      case 'half': return <Clock className="h-4 w-4" />;
      case 'absent': return <XCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const getShiftColor = (shift: string) => {
    switch (shift) {
      case 'full': return 'text-green-600';
      case 'half': return 'text-yellow-600';
      case 'absent': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Quick mark functions for bulk marking
  const markBulkAttendance = async (shift: 'full' | 'half' | 'absent') => {
    if (workers.length === 0) {
      toast.error('No workers found');
      return;
    }

    const dateStr = format(dateFilter, 'yyyy-MM-dd');
    const promises = workers.map(worker =>
      attendanceAPI.mark({
        workerId: worker._id,
        date: dateStr,
        shift: shift,
      }).catch(() => null) // Ignore errors for already marked
    );

    try {
      await Promise.all(promises);
      toast.success(`Bulk attendance marked as ${shift} for all workers`);
      fetchAttendances();
    } catch (error) {
      toast.error('Some attendance records failed to mark');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-600">Mark and manage worker attendance</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Mark Attendance
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Mark Attendance</DialogTitle>
                <DialogDescription>
                  Mark attendance for a worker on a specific date.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label htmlFor="workerId">Worker *</Label>
                    <Select
                      value={formData.workerId}
                      onValueChange={(value) => setFormData({ ...formData, workerId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select worker" />
                      </SelectTrigger>
                      <SelectContent>
                        {workers.map((worker) => (
                          <SelectItem key={worker._id} value={worker._id}>
                            {worker.name} - {worker.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.date ? format(formData.date, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.date}
                          onSelect={(date) => date && setFormData({ ...formData, date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div>
                    <Label htmlFor="shift">Attendance Status *</Label>
                    <Select
                      value={formData.shift}
                      onValueChange={(value: 'full' | 'half' | 'absent') => setFormData({ ...formData, shift: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>Full Day</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="half">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            <span>Half Day</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="absent">
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span>Absent</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Rate info */}
                  {formData.workerId && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      {(() => {
                        const worker = workers.find(w => w._id === formData.workerId);
                        if (!worker) return null;
                        
                        const rate = formData.shift === 'full' ? worker.dailyRate :
                                   formData.shift === 'half' ? worker.halfDayRate : 0;

                        return (
                          <div className="text-sm">
                            <p><strong>{worker.name}</strong></p>
                            <p>Rate for {formData.shift} day: <strong>₹{rate.toFixed(2)}</strong></p>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={resetDialog}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Mark Attendance
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters and Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters & Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
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
                    {format(dateFilter, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={(date) => date && setDateFilter(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Select value={shiftFilter} onValueChange={setShiftFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shifts</SelectItem>
                  <SelectItem value="full">Full Day</SelectItem>
                  <SelectItem value="half">Half Day</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={fetchAttendances}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-2 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">Quick Mark All for {format(dateFilter, "PPP")}:</p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => markBulkAttendance('full')}
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    <CheckCircle className="mr-1 h-4 w-4" />
                    All Full
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => markBulkAttendance('half')}
                    className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                  >
                    <Clock className="mr-1 h-4 w-4" />
                    All Half
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => markBulkAttendance('absent')}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <XCircle className="mr-1 h-4 w-4" />
                    All Absent
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Attendance Records ({pagination.total})
          </CardTitle>
          <CardDescription>
            Attendance for {format(dateFilter, "MMMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : attendances.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No attendance records found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || shiftFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : `No attendance marked for ${format(dateFilter, "MMMM d, yyyy")}.`
                }
              </p>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Mark Attendance
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
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Marked At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendances.map((attendance) => {
                    const rate = attendance.shift === 'full' ? attendance.workerId.dailyRate :
                                attendance.shift === 'half' ? attendance.workerId.halfDayRate : 0;
                    
                    return (
                      <TableRow key={attendance._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium">{attendance.workerId.name}</div>
                              <div className="text-sm text-gray-500">{attendance.workerId.phone}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(attendance.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={getStatusBadgeVariant(attendance.status)}
                            className={cn("flex items-center gap-1 w-fit", getStatusColor(attendance.status))}
                          >
                            {getStatusIcon(attendance.status)}
                            {attendance.status.charAt(0).toUpperCase() + attendance.status.slice(1)}
                            {attendance.status !== 'absent' && ' Day'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          ₹{rate.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <span className={cn("font-medium", 
                            attendance.status === 'absent' ? 'text-red-600' : 'text-green-600'
                          )}>
                            ₹{rate.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(attendance.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
