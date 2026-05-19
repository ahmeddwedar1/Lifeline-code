'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { bloodApi, searchApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Droplets,
  Loader2,
  Plus,
  Search,
  Heart,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const urgencyLevels = ['LOW', 'NORMAL', 'URGENT', 'CRITICAL'];

export default function BloodPage() {
  const { isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState('stock');

  const [stock, setStock] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const [formData, setFormData] = useState({
    bloodType: '',
    units: '',
    urgency: 'NORMAL',
    patientName: '',
    hospitalId: '',
    notes: '',
  });
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchStock = async () => {
    setLoadingStock(true);
    try {
      const { data } = await bloodApi.getStock();
      setStock(data.data || []);
    } catch {
      toast.error('Failed to load blood stock');
    } finally {
      setLoadingStock(false);
    }
  };

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const { data } = await bloodApi.getRequests();
      setRequests(data.data || []);
    } catch {
      toast.error('Failed to load blood requests');
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchStock();
    searchApi.searchHospitals({ limit: 100 }).then(({ data }) => {
      setHospitals(data.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'requests') fetchRequests();
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.bloodType || !formData.units || !formData.patientName || !formData.hospitalId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await bloodApi.createRequest({
        bloodType: formData.bloodType,
        units: parseInt(formData.units),
        urgency: formData.urgency,
        patientName: formData.patientName,
        hospitalId: formData.hospitalId,
        notes: formData.notes || undefined,
      });
      toast.success('Blood request submitted successfully');
      setFormData({ bloodType: '', units: '', urgency: 'NORMAL', patientName: '', hospitalId: '', notes: '' });
      setActiveTab('requests');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit blood request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (id: string) => {
    try {
      await bloodApi.cancelRequest(id);
      toast.success('Request cancelled');
      fetchRequests();
    } catch {
      toast.error('Failed to cancel request');
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg emergency-gradient flex items-center justify-center">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-heading font-bold text-secondary">LifeLine</span>
            </Link>
            <div className="ml-4 text-sm text-muted-foreground">/ Blood Management</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="mb-8">
            <h1 className="text-3xl font-heading font-bold text-secondary mb-2">Blood Management</h1>
            <p className="text-muted-foreground">View blood stock, manage requests, and request new blood</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="stock">Blood Stock</TabsTrigger>
              <TabsTrigger value="requests">My Requests</TabsTrigger>
              <TabsTrigger value="new">
                <Plus className="mr-1 h-4 w-4" />
                New Request
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stock">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Blood Stock Across Hospitals</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingStock ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : stock.length === 0 ? (
                    <p className="text-center text-muted-foreground py-12">No blood stock data available</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Hospital</TableHead>
                            {bloodTypes.map((bt) => (
                              <TableHead key={bt} className="text-center">{bt}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stock.map((item: any) => (
                            <TableRow key={item._id || item.hospitalId}>
                              <TableCell className="font-medium">{item.hospitalName || item.hospital?.name || 'Unknown'}</TableCell>
                              {bloodTypes.map((bt) => {
                                const btStock = item.bloodStock?.find((s: any) => s.bloodType === bt);
                                return (
                                  <TableCell key={bt} className="text-center">
                                    {btStock ? (
                                      <Badge variant={btStock.units > 10 ? 'success' : btStock.units > 0 ? 'warning' : 'destructive'}>
                                        {btStock.units}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="requests">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">My Blood Requests</CardTitle>
                  <Button size="sm" onClick={() => setActiveTab('new')}>
                    <Plus className="mr-1 h-4 w-4" /> New Request
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingRequests ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : requests.length === 0 ? (
                    <p className="text-center text-muted-foreground py-12">No blood requests yet</p>
                  ) : (
                    <div className="space-y-4">
                      {requests.map((req: any) => (
                        <Card key={req._id || req.id} className="bg-muted/30">
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                                  req.urgency === 'CRITICAL' ? 'bg-red-100' :
                                  req.urgency === 'URGENT' ? 'bg-orange-100' :
                                  req.urgency === 'NORMAL' ? 'bg-yellow-100' : 'bg-green-100'
                                }`}>
                                  <Droplets className={`h-5 w-5 ${
                                    req.urgency === 'CRITICAL' ? 'text-red-600' :
                                    req.urgency === 'URGENT' ? 'text-orange-600' :
                                    req.urgency === 'NORMAL' ? 'text-yellow-600' : 'text-green-600'
                                  }`} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{req.bloodType} - {req.units} units</span>
                                    <Badge variant={
                                      req.urgency === 'CRITICAL' ? 'destructive' :
                                      req.urgency === 'URGENT' ? 'warning' : 'default'
                                    }>{req.urgency}</Badge>
                                    <Badge variant={
                                      req.status === 'FULFILLED' ? 'success' :
                                      req.status === 'PENDING' ? 'warning' : 'destructive'
                                    }>{req.status}</Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Patient: {req.patientName} | Hospital: {req.hospital?.name || 'N/A'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{formatDate(req.createdAt)}</p>
                                </div>
                              </div>
                              {req.status === 'PENDING' && (
                                <Button variant="destructive" size="sm" onClick={() => handleCancelRequest(req._id || req.id)}>
                                  <XCircle className="mr-1 h-3 w-3" /> Cancel
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="new">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">New Blood Request</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
                    <div>
                      <label className="block text-sm font-medium mb-1">Blood Type *</label>
                      <Select value={formData.bloodType} onValueChange={(v) => setFormData({ ...formData, bloodType: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select blood type" />
                        </SelectTrigger>
                        <SelectContent>
                          {bloodTypes.map((bt) => (
                            <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Units *</label>
                      <Input
                        type="number"
                        placeholder="Number of units"
                        value={formData.units}
                        onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                        min={1}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Urgency *</label>
                      <Select value={formData.urgency} onValueChange={(v) => setFormData({ ...formData, urgency: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select urgency" />
                        </SelectTrigger>
                        <SelectContent>
                          {urgencyLevels.map((u) => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Patient Name *</label>
                      <Input
                        placeholder="Patient full name"
                        value={formData.patientName}
                        onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Hospital *</label>
                      <Select value={formData.hospitalId} onValueChange={(v) => setFormData({ ...formData, hospitalId: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select hospital" />
                        </SelectTrigger>
                        <SelectContent>
                          {hospitals.map((h: any) => (
                            <SelectItem key={h._id || h.id} value={h._id || h.id}>{h.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Notes</label>
                      <textarea
                        className="w-full min-h-[80px] rounded-md border border-border bg-transparent px-3 py-2 text-sm"
                        placeholder="Additional notes..."
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>

                    <Button type="submit" disabled={submitting}>
                      {submitting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                      ) : (
                        <><Droplets className="mr-2 h-4 w-4" /> Submit Request</>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}
