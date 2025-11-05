import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Calendar,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Users,
  MapPin,
  DollarSign,
  Receipt,
} from "lucide-react";
import { getAuthToken, eventAPI } from "@/lib/api";

interface Event {
  _id: string;
  name: string;
  location?: string;
  clientId?: {
    _id: string;
    name: string;
    phone: string;
  };
  dateFrom: string;
  dateTo: string;
  notes?: string;
  budget?: number;
  estimate?: number;
  createdAt: string;
}

interface Client {
  _id: string;
  name: string;
  phone: string;
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("ALL");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    clientId: "",
    dateFrom: "",
    dateTo: "",
    notes: "",
    budget: "",
    estimate: "",
  });

  useEffect(() => {
    fetchEvents();
    fetchClients();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [searchTerm, fromDate, toDate, selectedClientId]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (selectedClientId && selectedClientId !== "ALL")
        params.clientId = selectedClientId;

      const res = await eventAPI.getAll(params);
      const data = res.data;
      if (data.events) setEvents(data.events);
    } catch (error: any) {
      console.error("Error fetching events:", error);
      if (error.response?.status === 503) {
        toast.error("Database connection unavailable. Please try again later.");
      } else if (error.message?.includes("Network Error")) {
        toast.error("Network connection error. Please check your connection.");
      } else {
        toast.error("Failed to fetch events");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients", {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.clients) {
        setClients(data.clients);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
      if (error.message?.includes("503") || error.response?.status === 503) {
        toast.error(
          "Database connection unavailable. Clients list may be incomplete.",
        );
      } else if (error.message?.includes("Failed to fetch")) {
        toast.error("Network connection error. Please check your connection.");
      } else {
        toast.error("Failed to fetch clients");
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      location: "",
      clientId: "",
      dateFrom: "",
      dateTo: "",
      notes: "",
      budget: "",
      estimate: "",
    });
    setEditingEvent(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (event: Event) => {
    setFormData({
      name: event.name,
      location: event.location || "",
      clientId: event.clientId?._id || "",
      dateFrom: new Date(event.dateFrom).toISOString().slice(0, 16),
      dateTo: new Date(event.dateTo).toISOString().slice(0, 16),
      notes: event.notes || "",
      budget: event.budget?.toString() || "",
      estimate: event.estimate?.toString() || "",
    });
    setEditingEvent(event);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.dateFrom || !formData.dateTo) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (new Date(formData.dateFrom) > new Date(formData.dateTo)) {
      toast.error("Start date cannot be after end date");
      return;
    }

    setLoading(true);
    try {
      const url = editingEvent
        ? `/api/events/${editingEvent._id}`
        : "/api/events";
      const method = editingEvent ? "PUT" : "POST";

      const payload = {
        ...formData,
        clientId:
          formData.clientId && formData.clientId !== "NONE"
            ? formData.clientId
            : undefined,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        estimate: formData.estimate ? parseFloat(formData.estimate) : undefined,
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(
          `Event ${editingEvent ? "updated" : "created"} successfully`,
        );
        setShowModal(false);
        resetForm();
        fetchEvents();
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to save event" }));
        toast.error(errorData.error || "Failed to save event");
      }
    } catch (error) {
      console.error("Error saving event:", error);
      toast.error("Failed to save event");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });

      if (response.ok) {
        toast.success("Event deleted successfully");
        fetchEvents();
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to delete event" }));
        toast.error(errorData.error || "Failed to delete event");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFromDate("");
    setToDate("");
    setSelectedClientId("ALL");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEventStatus = (event: Event) => {
    const now = new Date();
    const startDate = new Date(event.dateFrom);
    const endDate = new Date(event.dateTo);

    if (now < startDate)
      return { status: "upcoming", color: "bg-blue-100 text-blue-800" };
    if (now >= startDate && now <= endDate)
      return { status: "ongoing", color: "bg-green-100 text-green-800" };
    return { status: "completed", color: "bg-gray-100 text-gray-800" };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Event Management</h1>
        </div>
       
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search Events</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="fromDate">From Date</Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="toDate">To Date</Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="clientFilter">Client</Label>
              <Select
                value={selectedClientId}
                onValueChange={setSelectedClientId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All clients</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client._id} value={client._id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(searchTerm ||
            fromDate ||
            toDate ||
            (selectedClientId && selectedClientId !== "ALL")) && (
            <div className="mt-4">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No events found. Create your first event to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => {
                  const eventStatus = getEventStatus(event);
                  return (
                    <TableRow key={event._id}>
                      <TableCell className="font-medium">
                        {event.name}
                      </TableCell>
                      <TableCell>
                        {event.clientId ? (
                          <div>
                            <div className="font-medium">
                              {event.clientId.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {event.clientId.phone}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            No client
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {event.location ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            No location
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {event.budget ? (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />₹
                            {event.budget.toLocaleString()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            No budget
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(event.dateFrom)}</TableCell>
                      <TableCell>{formatDate(event.dateTo)}</TableCell>
                      <TableCell>
                        <Badge className={eventStatus.color}>
                          {eventStatus.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(event)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(event._id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              (window.location.href = `/event-details/${event._id}?tab=workers`)
                            }
                          >
                            <Users className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              (window.location.href = `/event-details/${event._id}?tab=expenses`)
                            }
                          >
                            <Receipt className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              window.open(
                                `/attendance?eventId=${event._id}`,
                                "_blank",
                              )
                            }
                          >
                            <Users className="h-3 w-3 mr-1" />
                            Attendance
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? "Edit Event" : "Create New Event"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Event Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter event name"
                required
              />
            </div>

            <div>
              <Label htmlFor="client">Client</Label>
              <Select
                value={formData.clientId}
                onValueChange={(value) =>
                  setFormData({ ...formData, clientId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No client</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client._id} value={client._id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="Enter event location"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dateFrom">Start Date & Time *</Label>
                <Input
                  id="dateFrom"
                  type="datetime-local"
                  value={formData.dateFrom}
                  onChange={(e) =>
                    setFormData({ ...formData, dateFrom: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="dateTo">End Date & Time *</Label>
                <Input
                  id="dateTo"
                  type="datetime-local"
                  value={formData.dateTo}
                  onChange={(e) =>
                    setFormData({ ...formData, dateTo: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budget">Budget (₹)</Label>
                <Input
                  id="budget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) =>
                    setFormData({ ...formData, budget: e.target.value })
                  }
                  placeholder="Enter budget amount"
                />
              </div>

              <div>
                <Label htmlFor="estimate">Estimate (₹)</Label>
                <Input
                  id="estimate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.estimate}
                  onChange={(e) =>
                    setFormData({ ...formData, estimate: e.target.value })
                  }
                  placeholder="Enter estimate amount"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Additional notes about the event"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading
                  ? "Saving..."
                  : editingEvent
                    ? "Update Event"
                    : "Create Event"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
