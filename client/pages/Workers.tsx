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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  UserCheck,
  RefreshCw,
  Phone,
  DollarSign,
  User,
} from 'lucide-react';
import { workerAPI } from '@/lib/api';

interface Worker {
  _id: string;
  name: string;
  phone: string;
  dailyRate: number;
  halfDayRate: number;
  createdAt: string;
  updatedAt: string;
}

interface WorkerFormData {
  name: string;
  phone: string;
  dailyRate: string;
  halfDayRate: string;
}

const initialFormData: WorkerFormData = {
  name: '',
  phone: '',
  dailyRate: '',
  halfDayRate: '',
};

export default function Workers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<WorkerFormData>(initialFormData);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
      };
      
      const response = await workerAPI.getAll(params);
      setWorkers(response.data.workers || []);
      setPagination(response.data.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0,
      });
    } catch (error: any) {
      console.error('Fetch workers error:', error);
      toast.error('Failed to load workers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, [pagination.page, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Worker name is required');
      return;
    }

    if (!formData.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    // Validate phone number (10 digits)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      toast.error('Please enter a valid 10-digit Indian phone number');
      return;
    }

    if (!formData.dailyRate || parseFloat(formData.dailyRate) <= 0) {
      toast.error('Daily rate must be greater than 0');
      return;
    }

    if (!formData.halfDayRate || parseFloat(formData.halfDayRate) <= 0) {
      toast.error('Half day rate must be greater than 0');
      return;
    }

    if (parseFloat(formData.halfDayRate) >= parseFloat(formData.dailyRate)) {
      toast.error('Half day rate must be less than daily rate');
      return;
    }

    const workerData = {
      ...formData,
      dailyRate: parseFloat(formData.dailyRate),
      halfDayRate: parseFloat(formData.halfDayRate),
    };

    try {
      if (editingWorker) {
        await workerAPI.update(editingWorker._id, workerData);
        toast.success('Worker updated successfully');
      } else {
        await workerAPI.create(workerData);
        toast.success('Worker added successfully');
      }
      
      setIsDialogOpen(false);
      setFormData(initialFormData);
      setEditingWorker(null);
      fetchWorkers();
    } catch (error: any) {
      console.error('Save worker error:', error);
      if (error.response?.status === 409) {
        toast.error('A worker with this phone number already exists');
      } else {
        toast.error(error.response?.data?.error || 'Failed to save worker');
      }
    }
  };

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setFormData({
      name: worker.name || '',
      phone: worker.phone || '',
      dailyRate: (worker.dailyRate ?? 0).toString(),
      halfDayRate: (worker.halfDayRate ?? 0).toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await workerAPI.delete(id);
      toast.success('Worker deleted successfully');
      fetchWorkers();
    } catch (error: any) {
      console.error('Delete worker error:', error);
      if (error.response?.status === 409) {
        toast.error('Cannot delete worker. There are attendance records associated with this worker.');
      } else {
        toast.error(error.response?.data?.error || 'Failed to delete worker');
      }
    }
  };

  const resetDialog = () => {
    setIsDialogOpen(false);
    setFormData(initialFormData);
    setEditingWorker(null);
  };

  const formatPhoneNumber = (phone: string) => {
    if (phone.length === 10) {
      return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
    }
    return phone;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workers</h1>
          <p className="text-gray-600">Manage your workforce and daily rates</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Worker
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingWorker ? 'Edit Worker' : 'Add New Worker'}
              </DialogTitle>
              <DialogDescription>
                {editingWorker 
                  ? 'Update the worker information below.'
                  : 'Enter the details for the new worker.'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="name">Worker Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter worker name"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, phone: value });
                    }}
                    placeholder="Enter 10-digit phone number"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Enter 10-digit Indian mobile number (without +91)
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dailyRate">Daily Rate (₹) *</Label>
                    <Input
                      id="dailyRate"
                      type="number"
                      value={formData.dailyRate}
                      onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })}
                      placeholder="Enter daily rate"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="halfDayRate">Half Day Rate (₹) *</Label>
                    <Input
                      id="halfDayRate"
                      type="number"
                      value={formData.halfDayRate}
                      onChange={(e) => setFormData({ ...formData, halfDayRate: e.target.value })}
                      placeholder="Enter half day rate"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
                
                <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
                  <p><strong>Note:</strong> Half day rate should be less than daily rate.</p>
                  <p>These rates will be used for attendance and payroll calculations.</p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetDialog}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingWorker ? 'Update Worker' : 'Add Worker'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search Workers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone number..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Button variant="outline" onClick={fetchWorkers}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Workers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Workers ({pagination.total})
          </CardTitle>
          <CardDescription>
            Manage your workforce and their daily rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : workers.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No workers found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm 
                  ? 'Try adjusting your search criteria.'
                  : 'Get started by adding your first worker.'
                }
              </p>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Worker
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
                    <TableHead>Contact</TableHead>
                    <TableHead>Daily Rate</TableHead>
                    <TableHead>Half Day Rate</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workers.map((worker) => (
                    <TableRow key={worker._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium">{worker.name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{formatPhoneNumber(worker.phone)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">₹{worker.dailyRate.toFixed(2)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">₹{worker.halfDayRate.toFixed(2)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(worker.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(worker)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Worker</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{worker.name}"? This action cannot be undone.
                                  <div className="mt-2 text-amber-600">
                                    ⚠️ This will also affect attendance records and payroll calculations.
                                  </div>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(worker._id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
                    {pagination.total} workers
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
