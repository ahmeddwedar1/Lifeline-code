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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { resourceApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Heart,
  Loader2,
  Plus,
  Pencil,
  Bed,
  Thermometer,
  Wind,
  Syringe,
  Search,
  ArrowLeft,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

const resourceTypes = ['bed', 'icu', 'nicu', 'ventilator', 'blood', 'medicine', 'equipment'];

export default function StaffResourcesPage() {
  const { isAuthenticated } = useAuth(['DOCTOR', 'HOSPITAL']);

  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ type: '', total: '', available: '', status: 'AVAILABLE' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      const { data } = await resourceApi.getAll(params);
      setResources(data.data || []);
    } catch {
      toast.error('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchResources();
  }, [isAuthenticated, typeFilter, statusFilter]);

  const handleOpenEdit = (resource: any = null) => {
    if (resource) {
      setEditingId(resource._id || resource.id);
      setEditForm({
        type: resource.type || '',
        total: resource.total?.toString() || '',
        available: resource.available?.toString() || '',
        status: resource.status || 'AVAILABLE',
      });
    } else {
      setEditingId(null);
      setEditForm({ type: 'bed', total: '', available: '', status: 'AVAILABLE' });
    }
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editForm.type || !editForm.total || editForm.available === '') {
      toast.error('Please fill in all fields');
      return;
    }

    const total = parseInt(editForm.total);
    const available = parseInt(editForm.available);

    if (available > total) {
      toast.error('Available cannot exceed total');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type: editForm.type,
        total,
        available,
        status: editForm.status,
      };

      if (editingId) {
        await resourceApi.update(editingId, payload);
        toast.success('Resource updated');
      } else {
        await resourceApi.create(payload);
        toast.success('Resource created');
      }

      setEditOpen(false);
      fetchResources();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save resource');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    try {
      await resourceApi.delete(id);
      toast.success('Resource deleted');
      fetchResources();
    } catch {
      toast.error('Failed to delete resource');
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'icu': return <Thermometer className="h-4 w-4" />;
      case 'nicu': return <Wind className="h-4 w-4" />;
      case 'ventilator': return <Wind className="h-4 w-4" />;
      default: return <Bed className="h-4 w-4" />;
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
            <div className="ml-4 text-sm text-muted-foreground">/ Resources</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-heading font-bold text-secondary mb-2">Resource Management</h1>
              <p className="text-muted-foreground">Manage hospital resources and equipment</p>
            </div>
            <Button onClick={() => handleOpenEdit()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Resource
            </Button>
          </div>

          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Type:</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      {resourceTypes.map((t) => (
                        <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Status:</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Status</SelectItem>
                      <SelectItem value="AVAILABLE">Available</SelectItem>
                      <SelectItem value="OCCUPIED">Occupied</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      <SelectItem value="RESERVED">Reserved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : resources.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Bed className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No resources found</p>
                <Button onClick={() => handleOpenEdit()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Resource
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resources.map((r: any) => {
                      const usagePercent = r.total > 0
                        ? Math.round(((r.total - r.available) / r.total) * 100)
                        : 0;
                      return (
                        <TableRow key={r._id || r.id}>
                          <TableCell className="font-medium capitalize flex items-center gap-2">
                            {getResourceIcon(r.type)}
                            {r.type}
                          </TableCell>
                          <TableCell>{r.total}</TableCell>
                          <TableCell>{r.available}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${usagePercent}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{usagePercent}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={r.status === 'AVAILABLE' ? 'success' : r.status === 'OCCUPIED' ? 'destructive' : 'warning'}>
                              {r.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {r.updatedAt ? formatDate(r.updatedAt) : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(r)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(r._id || r.id)}>
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </main>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update resource details' : 'Create a new resource entry'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <Select value={editForm.type} onValueChange={(v) => setEditForm({ ...editForm, type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {resourceTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Total</label>
              <Input
                type="number"
                min={0}
                value={editForm.total}
                onChange={(e) => setEditForm({ ...editForm, total: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Available</label>
              <Input
                type="number"
                min={0}
                value={editForm.available}
                onChange={(e) => setEditForm({ ...editForm, available: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="OCCUPIED">Occupied</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="RESERVED">Reserved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
