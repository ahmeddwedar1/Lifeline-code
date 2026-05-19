'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { adminApi, searchApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Heart,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Search,
  Building2,
  Bed,
  MapPin,
  Phone,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function AdminHospitalsPage() {
  const { isAuthenticated } = useAuth('ADMIN');

  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '', phone: '', email: '',
    address: { street: '', city: '', state: '', zip: '' },
    specializations: '',
  });
  const [saving, setSaving] = useState(false);

  const [bedOpen, setBedOpen] = useState(false);
  const [bedHospitalId, setBedHospitalId] = useState<string | null>(null);
  const [bedForm, setBedForm] = useState({ totalBeds: '', availableBeds: '' });
  const [savingBeds, setSavingBeds] = useState(false);

  const fetchHospitals = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      if (search) params.query = search;
      const { data } = await searchApi.searchHospitals(params);
      setHospitals(data.data || []);
    } catch {
      toast.error('Failed to load hospitals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchHospitals();
  }, [isAuthenticated]);

  const handleOpenEdit = (hospital: any = null) => {
    if (hospital) {
      setEditingId(hospital._id || hospital.id);
      setEditForm({
        name: hospital.name || '',
        phone: hospital.phone || '',
        email: hospital.email || '',
        address: {
          street: hospital.address?.street || '',
          city: hospital.address?.city || '',
          state: hospital.address?.state || '',
          zip: hospital.address?.zip || '',
        },
        specializations: (hospital.specializations || []).join(', '),
      });
    } else {
      setEditingId(null);
      setEditForm({ name: '', phone: '', email: '', address: { street: '', city: '', state: '', zip: '' }, specializations: '' });
    }
    setEditOpen(true);
  };

  const handleSaveHospital = async () => {
    if (!editForm.name || !editForm.address.city) {
      toast.error('Name and city are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: editForm.name,
        phone: editForm.phone || undefined,
        email: editForm.email || undefined,
        address: editForm.address,
        specializations: editForm.specializations ? editForm.specializations.split(',').map((s) => s.trim()) : [],
      };

      if (editingId) {
        await adminApi.updateHospital(editingId, payload);
        toast.success('Hospital updated');
      } else {
        await adminApi.createHospital(payload);
        toast.success('Hospital created');
      }

      setEditOpen(false);
      fetchHospitals();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save hospital');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hospital? This action cannot be undone.')) return;
    try {
      await adminApi.deleteHospital(id);
      toast.success('Hospital deleted');
      fetchHospitals();
    } catch {
      toast.error('Failed to delete hospital');
    }
  };

  const handleOpenBeds = (hospital: any) => {
    setBedHospitalId(hospital._id || hospital.id);
    setBedForm({
      totalBeds: hospital.totalBeds?.toString() || '0',
      availableBeds: hospital.availableBeds?.toString() || '0',
    });
    setBedOpen(true);
  };

  const handleSaveBeds = async () => {
    if (!bedHospitalId) return;
    setSavingBeds(true);
    try {
      await adminApi.updateHospitalBeds(bedHospitalId, {
        totalBeds: parseInt(bedForm.totalBeds),
        availableBeds: parseInt(bedForm.availableBeds),
      });
      toast.success('Bed count updated');
      setBedOpen(false);
      fetchHospitals();
    } catch {
      toast.error('Failed to update beds');
    } finally {
      setSavingBeds(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg emergency-gradient flex items-center justify-center">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-heading font-bold text-secondary">Admin</span>
            </Link>
            <div className="ml-4 text-sm text-muted-foreground">/ Hospitals</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-heading font-bold text-secondary mb-2">Hospital Management</h1>
              <p className="text-muted-foreground">CRUD operations for hospitals and bed management</p>
            </div>
            <Button onClick={() => handleOpenEdit()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Hospital
            </Button>
          </div>

          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search hospitals..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchHospitals()}
                  />
                </div>
                <Button variant="outline" onClick={fetchHospitals}>
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
          ) : hospitals.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No hospitals found</p>
                <Button onClick={() => handleOpenEdit()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Hospital
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Total Beds</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Specializations</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hospitals.map((h: any) => (
                      <TableRow key={h._id || h.id}>
                        <TableCell className="font-medium">{h.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {h.address?.city || 'N/A'}, {h.address?.state || ''}
                        </TableCell>
                        <TableCell className="text-sm">{h.phone || 'N/A'}</TableCell>
                        <TableCell>{h.totalBeds || 0}</TableCell>
                        <TableCell>
                          <Badge variant={(h.availableBeds || 0) > 0 ? 'success' : 'destructive'}>
                            {h.availableBeds || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {(h.specializations || []).slice(0, 2).map((s: string) => (
                              <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                            ))}
                            {(h.specializations?.length || 0) > 2 && (
                              <Badge variant="outline" className="text-xs">+{h.specializations.length - 2}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleOpenBeds(h)}>
                              <Bed className="h-3 w-3 mr-1" /> Beds
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleOpenEdit(h)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDelete(h._id || h.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Hospital' : 'Add Hospital'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update hospital information' : 'Register a new hospital'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Street</label>
              <Input value={editForm.address.street} onChange={(e) => setEditForm({ ...editForm, address: { ...editForm.address, street: e.target.value } })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">City *</label>
                <Input value={editForm.address.city} onChange={(e) => setEditForm({ ...editForm, address: { ...editForm.address, city: e.target.value } })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">State</label>
                <Input value={editForm.address.state} onChange={(e) => setEditForm({ ...editForm, address: { ...editForm.address, state: e.target.value } })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ZIP</label>
                <Input value={editForm.address.zip} onChange={(e) => setEditForm({ ...editForm, address: { ...editForm.address, zip: e.target.value } })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Specializations (comma-separated)</label>
              <Input value={editForm.specializations} onChange={(e) => setEditForm({ ...editForm, specializations: e.target.value })} placeholder="Cardiology, Neurology, ..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveHospital} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bedOpen} onOpenChange={setBedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Bed Count</DialogTitle>
            <DialogDescription>Update total and available bed numbers</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Total Beds</label>
              <Input type="number" min={0} value={bedForm.totalBeds} onChange={(e) => setBedForm({ ...bedForm, totalBeds: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Available Beds</label>
              <Input type="number" min={0} value={bedForm.availableBeds} onChange={(e) => setBedForm({ ...bedForm, availableBeds: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBedOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveBeds} disabled={savingBeds}>
              {savingBeds ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Update Beds'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
