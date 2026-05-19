'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { searchApi, reservationApi, resourceApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import {
  Hospital,
  MapPin,
  Phone,
  Mail,
  Star,
  Bed,
  Loader2,
  ArrowLeft,
  Building2,
  Stethoscope,
  Thermometer,
  Wind,
  Droplets,
  Syringe,
  Calendar,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Resource {
  _id: string;
  type: string;
  total: number;
  available: number;
  status: string;
}

interface BloodStock {
  bloodType: string;
  units: number;
  status: string;
}

export default function HospitalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const id = params.id as string;

  const [hospital, setHospital] = useState<any>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [bloodStock, setBloodStock] = useState<BloodStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [reserveForm, setReserveForm] = useState({ resourceType: '', notes: '' });
  const [reserving, setReserving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hospitalRes, resourcesRes] = await Promise.all([
          searchApi.getHospitalDetails(id),
          resourceApi.getByHospital(id).catch(() => ({ data: { data: [] } })),
        ]);

        const hospitalData = hospitalRes.data.data || hospitalRes.data;
        setHospital(hospitalData);
        setResources(resourcesRes.data.data || []);
        setBloodStock(hospitalData.bloodStock || []);
      } catch {
        toast.error('Failed to load hospital details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleReserve = async () => {
    if (!reserveForm.resourceType) {
      toast.error('Please select a resource type');
      return;
    }

    setReserving(true);
    try {
      await reservationApi.create({
        hospitalId: id,
        resourceType: reserveForm.resourceType,
        notes: reserveForm.notes,
      });
      toast.success('Resource reserved successfully!');
      setReserveOpen(false);
      setReserveForm({ resourceType: '', notes: '' });
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to reserve resource';
      toast.error(message);
    } finally {
      setReserving(false);
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'icu': return <Thermometer className="h-5 w-5" />;
      case 'nicu': return <Wind className="h-5 w-5" />;
      case 'ventilator': return <Wind className="h-5 w-5" />;
      case 'blood': return <Droplets className="h-5 w-5" />;
      default: return <Bed className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Hospital className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Hospital not found</p>
          <Link href="/hospitals"><Button variant="outline">Back to Hospitals</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg emergency-gradient flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-heading font-bold text-secondary">LifeLine</span>
            </Link>
            <div className="ml-4 text-sm text-muted-foreground">/ Hospitals / {hospital.name}</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Link href="/hospitals" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Hospitals
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Hospital className="h-7 w-7 text-primary" />
                        </div>
                        <div>
                          <h1 className="text-2xl font-heading font-bold text-secondary">{hospital.name}</h1>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-sm font-medium">{(hospital.rating || 4.0).toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <span>
                        {hospital.address?.street ? `${hospital.address.street}, ` : ''}
                        {hospital.address?.city || 'City'}, {hospital.address?.state || 'State'} {hospital.address?.zip || ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{hospital.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{hospital.email || 'N/A'}</span>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div>
                    <h3 className="text-sm font-semibold text-secondary mb-2">Specializations</h3>
                    <div className="flex flex-wrap gap-2">
                      {(hospital.specializations || []).map((spec: string) => (
                        <Badge key={spec} variant="secondary">{spec}</Badge>
                      ))}
                      {(!hospital.specializations || hospital.specializations.length === 0) && (
                        <span className="text-sm text-muted-foreground">No specializations listed</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resource Availability</CardTitle>
                </CardHeader>
                <CardContent>
                  {resources.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No resource data available</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {resources.map((resource) => {
                        const usagePercent = resource.total > 0
                          ? Math.round(((resource.total - resource.available) / resource.total) * 100)
                          : 0;
                        return (
                          <Card key={resource._id} className="bg-muted/30">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  resource.available > 0 ? 'bg-green-100' : 'bg-red-100'
                                }`}>
                                  {getResourceIcon(resource.type)}
                                </div>
                                <div>
                                  <p className="text-sm font-medium capitalize">{resource.type}</p>
                                  <p className="text-xs text-muted-foreground">{resource.available}/{resource.total} available</p>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${usagePercent}%` }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{usagePercent}% utilized</p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Blood Stock</CardTitle>
                </CardHeader>
                <CardContent>
                  {bloodStock.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No blood stock data available</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Blood Type</TableHead>
                          <TableHead>Units Available</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bloodStock.map((stock: any) => (
                          <TableRow key={stock.bloodType}>
                            <TableCell className="font-medium">{stock.bloodType}</TableCell>
                            <TableCell>{stock.units}</TableCell>
                            <TableCell>
                              <Badge variant={stock.units > 10 ? 'success' : stock.units > 0 ? 'warning' : 'destructive'}>
                                {stock.units > 10 ? 'Available' : stock.units > 0 ? 'Low' : 'Out of Stock'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-heading font-bold text-secondary mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Button
                      className="w-full"
                      onClick={() => {
                        if (!isAuthenticated) {
                          toast.error('Please sign in to reserve resources');
                          router.push('/login');
                          return;
                        }
                        setReserveOpen(true);
                      }}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Reserve Resource
                    </Button>
                    <Link href="/emergency/report">
                      <Button variant="destructive" className="w-full">
                        Report Emergency at this Hospital
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-heading font-bold text-secondary mb-4">Contact Information</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium">Address</p>
                      <p className="text-muted-foreground">
                        {hospital.address?.street ? `${hospital.address.street}, ` : ''}
                        {hospital.address?.city || 'N/A'}, {hospital.address?.state || ''}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Phone</p>
                      <p className="text-muted-foreground">{hospital.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-muted-foreground">{hospital.email || 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </main>

      <Dialog open={reserveOpen} onOpenChange={setReserveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reserve Resource</DialogTitle>
            <DialogDescription>
              Reserve a bed or resource at {hospital.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Resource Type *</label>
              <Select value={reserveForm.resourceType} onValueChange={(v) => setReserveForm({ ...reserveForm, resourceType: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select resource type" />
                </SelectTrigger>
                <SelectContent>
                  {resources.map((r) => (
                    <SelectItem key={r._id} value={r.type} disabled={r.available <= 0}>
                      {r.type} ({r.available} available)
                    </SelectItem>
                  ))}
                  {resources.length === 0 && (
                    <SelectItem value="bed" disabled>No resources available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-border bg-transparent px-3 py-2 text-sm"
                placeholder="Any additional notes..."
                value={reserveForm.notes}
                onChange={(e) => setReserveForm({ ...reserveForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReserveOpen(false)}>Cancel</Button>
            <Button onClick={handleReserve} disabled={reserving}>
              {reserving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reserving...</> : 'Confirm Reservation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
