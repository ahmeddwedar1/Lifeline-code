'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { emergencyApi, ambulanceApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Heart,
  Loader2,
  AlertTriangle,
  Navigation,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Search,
} from 'lucide-react';
import { formatDate, getSeverityColor } from '@/lib/utils';

export default function StaffEmergenciesPage() {
  const { isAuthenticated } = useAuth(['DOCTOR', 'HOSPITAL']);

  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [search, setSearch] = useState('');

  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState<any>(null);
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [dispatching, setDispatching] = useState(false);

  const fetchEmergencies = async () => {
    setLoading(true);
    try {
      const params: any = { sort: '-priorityScore' };
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;
      if (search) params.query = search;

      const { data } = await emergencyApi.getAll(params);
      setEmergencies(data.data || []);
    } catch {
      toast.error('Failed to load emergencies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchEmergencies();
  }, [isAuthenticated, statusFilter, severityFilter]);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await emergencyApi.updateStatus(id, status);
      toast.success(`Emergency updated to ${status}`);
      fetchEmergencies();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleOpenDispatch = async (em: any) => {
    setSelectedEmergency(em);
    try {
      const { data } = await ambulanceApi.getAll({ status: 'AVAILABLE' });
      setAmbulances(data.data || []);
      setDispatchOpen(true);
    } catch {
      toast.error('Failed to load available ambulances');
    }
  };

  const handleDispatchAmbulance = async (ambulanceId: string) => {
    if (!selectedEmergency) return;
    setDispatching(true);
    try {
      await ambulanceApi.dispatch(ambulanceId, selectedEmergency._id || selectedEmergency.id);
      await emergencyApi.updateStatus(selectedEmergency._id || selectedEmergency.id, 'DISPATCHED');
      toast.success('Ambulance dispatched successfully');
      setDispatchOpen(false);
      fetchEmergencies();
    } catch {
      toast.error('Failed to dispatch ambulance');
    } finally {
      setDispatching(false);
    }
  };

  const handleOverridePriority = async (id: string, score: number) => {
    try {
      await emergencyApi.overridePriority(id, { priorityScore: score });
      toast.success('Priority score updated');
      fetchEmergencies();
    } catch {
      toast.error('Failed to update priority');
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/staff/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg emergency-gradient flex items-center justify-center">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-heading font-bold text-secondary">Staff</span>
            </Link>
            <div className="ml-4 text-sm text-muted-foreground">/ Emergency Management</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="mb-8">
            <h1 className="text-3xl font-heading font-bold text-secondary mb-2">Emergency Management</h1>
            <p className="text-muted-foreground">View and manage all emergency cases</p>
          </div>

          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Search patient name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchEmergencies()}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Status:</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Status</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="TRIAGE">Triage</SelectItem>
                      <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Severity:</label>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="All Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Severity</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={fetchEmergencies}>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : emergencies.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No emergencies found</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Symptoms</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Reported</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emergencies.map((em: any) => (
                      <TableRow key={em._id || em.id}>
                        <TableCell className="font-medium">{em.patientName || 'Unknown'}</TableCell>
                        <TableCell>
                          <Badge variant={em.severity === 'CRITICAL' ? 'destructive' : em.severity === 'URGENT' ? 'warning' : 'default'}>
                            {em.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{em.priorityScore || 'N/A'}</span>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                          {em.symptoms || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{em.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {em.location
                            ? `${em.location.latitude?.toFixed(4)}, ${em.location.longitude?.toFixed(4)}`
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {em.createdAt ? formatDate(em.createdAt) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 flex-wrap">
                            {em.status === 'PENDING' && (
                              <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(em._id || em.id, 'TRIAGE')}>
                                <Activity className="h-3 w-3 mr-1" /> Triage
                              </Button>
                            )}
                            {em.status === 'TRIAGE' && (
                              <Button size="sm" variant="outline" onClick={() => handleOpenDispatch(em)}>
                                <Navigation className="h-3 w-3 mr-1" /> Dispatch
                              </Button>
                            )}
                            {em.status === 'DISPATCHED' && (
                              <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(em._id || em.id, 'IN_PROGRESS')}>
                                <Clock className="h-3 w-3 mr-1" /> Start
                              </Button>
                            )}
                            {em.status === 'IN_PROGRESS' && (
                              <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(em._id || em.id, 'COMPLETED')}>
                                <CheckCircle className="h-3 w-3 mr-1" /> Complete
                              </Button>
                            )}
                            {['PENDING', 'TRIAGE'].includes(em.status) && (
                              <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleUpdateStatus(em._id || em.id, 'CANCELLED')}>
                                <XCircle className="h-3 w-3 mr-1" /> Cancel
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </main>

      <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispatch Ambulance</DialogTitle>
          </DialogHeader>
          {ambulances.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No available ambulances</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {ambulances.map((a: any) => (
                <Card key={a._id || a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleDispatchAmbulance(a._id || a.id)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{a.vehicleNumber || `Ambulance #${(a._id || a.id).slice(-4)}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.currentLocation
                          ? `${a.currentLocation.latitude?.toFixed(4)}, ${a.currentLocation.longitude?.toFixed(4)}`
                          : 'Location unknown'}
                      </p>
                    </div>
                    <Badge variant="success">Available</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDispatchOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
