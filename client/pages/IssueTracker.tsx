import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Package, History, ArrowLeft } from 'lucide-react';
import { getAuthToken } from '@/lib/api';

interface Client {
  _id: string;
  name: string;
}

interface IssueSummary {
  productId: string;
  name: string;
  category: string;
  issued: number;
  returned: number;
  remaining: number;
  updatedAt: string;
}

interface IssueTransaction {
  id: string;
  productName: string;
  productCategory: string;
  qty: number;
  type: 'issue' | 'return';
  ref: string;
  at: string;
}

export default function IssueTracker() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [issueSummary, setIssueSummary] = useState<IssueSummary[]>([]);
  const [issueHistory, setIssueHistory] = useState<IssueTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<IssueSummary | null>(null);
  const [returnQty, setReturnQty] = useState(1);
  const [returnNote, setReturnNote] = useState('');

  // Fetch clients on component mount
  useEffect(() => {
    fetchClients();
  }, []);

  // Fetch issue summary when client is selected
  useEffect(() => {
    if (selectedClientId) {
      fetchIssueSummary();
    } else {
      setIssueSummary([]);
    }
  }, [selectedClientId]);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.clients) {
        setClients(data.clients);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to fetch clients');
    }
  };

  const fetchIssueSummary = async () => {
    if (!selectedClientId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/issue/summary?clientId=${selectedClientId}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setIssueSummary(data);
    } catch (error) {
      console.error('Error fetching issue summary:', error);
      toast.error('Failed to fetch issue summary');
    } finally {
      setLoading(false);
    }
  };

  const fetchIssueHistory = async (productId?: string) => {
    if (!selectedClientId) return;

    setLoading(true);
    try {
      const url = productId
        ? `/api/issue/history?clientId=${selectedClientId}&productId=${productId}`
        : `/api/issue/history?clientId=${selectedClientId}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setIssueHistory(data);
    } catch (error) {
      console.error('Error fetching issue history:', error);
      toast.error('Failed to fetch issue history');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnItems = async () => {
    if (!selectedItem || !selectedClientId) return;

    if (returnQty <= 0 || returnQty > selectedItem.remaining) {
      toast.error(`Invalid quantity. Must be between 1 and ${selectedItem.remaining}`);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/issue/return', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          clientId: selectedClientId,
          productId: selectedItem.productId,
          qty: returnQty,
          note: returnNote
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Items returned successfully');
        setShowReturnModal(false);
        setSelectedItem(null);
        setReturnQty(1);
        setReturnNote('');
        fetchIssueSummary(); // Refresh the summary
      } else {
        const result = await response.json().catch(() => ({ error: 'Failed to return items' }));
        toast.error(result.error || 'Failed to return items');
      }
    } catch (error) {
      console.error('Error returning items:', error);
      toast.error('Failed to return items');
    } finally {
      setLoading(false);
    }
  };

  const openReturnModal = (item: IssueSummary) => {
    setSelectedItem(item);
    setReturnQty(1);
    setReturnNote('');
    setShowReturnModal(true);
  };

  const openHistoryModal = (item?: IssueSummary) => {
    setSelectedItem(item || null);
    setShowHistoryModal(true);
    fetchIssueHistory(item?.productId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const selectedClient = clients.find(c => c._id === selectedClientId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Package className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Issue Tracker</h1>
      </div>

      {/* Client Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Client</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full max-w-md">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client._id} value={client._id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Issue Summary Table */}
      {selectedClientId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              Items Issued to {selectedClient?.name}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => openHistoryModal()}
                disabled={loading}
              >
                <History className="h-4 w-4 mr-2" />
                View All History
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : issueSummary.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No items issued to this client yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Issued</TableHead>
                    <TableHead className="text-center">Returned</TableHead>
                    <TableHead className="text-center">Remaining</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issueSummary.map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="text-center">{item.issued}</TableCell>
                      <TableCell className="text-center">{item.returned}</TableCell>
                      <TableCell className="text-center font-semibold">
                        {item.remaining}
                      </TableCell>
                      <TableCell>{formatDate(item.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openReturnModal(item)}
                            disabled={item.remaining === 0}
                          >
                            Return
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openHistoryModal(item)}
                          >
                            History
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Return Modal */}
      <Dialog open={showReturnModal} onOpenChange={setShowReturnModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return Items</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedItem && (
              <div className="p-4 bg-muted rounded-lg">
                <p><strong>Product:</strong> {selectedItem.name}</p>
                <p><strong>Category:</strong> {selectedItem.category}</p>
                <p><strong>Available to Return:</strong> {selectedItem.remaining}</p>
              </div>
            )}
            
            <div>
              <Label htmlFor="returnQty">Quantity to Return</Label>
              <Input
                id="returnQty"
                type="number"
                min="1"
                max={selectedItem?.remaining || 1}
                value={returnQty}
                onChange={(e) => setReturnQty(parseInt(e.target.value) || 1)}
              />
            </div>

            <div>
              <Label htmlFor="returnNote">Note (Optional)</Label>
              <Textarea
                id="returnNote"
                placeholder="Add a note for this return..."
                value={returnNote}
                onChange={(e) => setReturnNote(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowReturnModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleReturnItems} disabled={loading}>
                {loading ? 'Processing...' : 'Return Items'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedItem 
                ? `Transaction History - ${selectedItem.name}`
                : `All Transactions - ${selectedClient?.name}`
              }
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : issueHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transaction history found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issueHistory.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{txn.productName}</div>
                          <div className="text-sm text-muted-foreground">{txn.productCategory}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          txn.type === 'issue' 
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {txn.type === 'issue' ? 'Issued' : 'Returned'}
                        </span>
                      </TableCell>
                      <TableCell>{txn.qty}</TableCell>
                      <TableCell>{txn.ref}</TableCell>
                      <TableCell>{formatDate(txn.at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
