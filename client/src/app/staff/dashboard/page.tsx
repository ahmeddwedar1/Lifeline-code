'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { emergencyApi, resourceApi, ambulanceApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Heart,
  AlertTriangle,
  Building2,
  Ambulance,
  Bed,
  Activity,
  Loader2,
  Bell,
  User,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  Navigation,
} from 'lucide-react';
import { formatDate, getSeverityColor } from '@/lib/utils';

export default function StaffDashboardPage() {
  const { user, isAuthenticated } = useAuth(['DOCTOR', 'HOSPITAL']);
  const { logout } = useAuthStore();
  const router = useRouter();

  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      try {
        const [emergRes, resourceRes, ambRes] = await Promise.all([
          emergencyApi.getAll({ limit: 10, sort: '-priorityScore' }).catch(() => ({ data: { data: [] } })),
          resourceApi.getAll({ limit: 5 }).catch(() => ({ data: { data: [] } })),
          ambulanceApi.getAll({ limit: 5 }).catch(() => ({ data: { data: [] } })),
        ]);

        setEmergencies(emergRes.data.data || []);
        setResources(resourceRes.data.data || []);
        setAmbulances(ambRes.data.data || []);
      } catch {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  const handleUpdateEmergencyStatus = async (id: string, status: string) => {
    try {
      await emergencyApi.updateStatus(id, status);
      toast.success(`Emergency marked as ${status}`);
      const { data } = await emergencyApi.getAll({ limit: 10, sort: '-priorityScore' });
      setEmergencies(data.data || []);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = [
    { label: 'Active Emergencies', value: emergencies.filter((e) => !['COMPLETED', 'CANCELLED'].includes(e.status)).length, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
    { label: 'Available Beds', value: resources.filter((r) => r.type === 'bed').reduce((sum, r) => sum + (r.available || 0), 0), icon: Bed, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Available Ambulances', value: ambulances.filter((a) => a.status === 'AVAILABLE').length, icon: Ambulance, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'ICU Available', value: resources.filter((r) => r.type === 'icu').reduce((sum, r) => sum + (r.available || 0), 0), icon: Activity, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg emergency-gradient flex items-center justify-center">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-heading font-bold text-secondary">Staff Dashboard</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/staff/emergencies">
                <Button variant="ghost" size="sm">Emergencies</Button>
              </Link>
              <Link href="/staff/resources">
                <Button variant="ghost" size="sm">Resources</Button>
              </Link>
              <Link href="/notifications">
                <Button variant="ghost" size="icon"><Bell className="h-5 w-5" /></Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout}>Sign Out</Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="mb-8">
            <h1 className="text-3xl font-heading font-bold text-secondary mb-2">
              Welcome, {user?.fullName}
            </h1>
            <p className="text-muted-foreground">Staff Operations Dashboard</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <div className="text-2xl font-heading font-bold">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Emergency Queue</CardTitle>
                <Link href="/staff/emergencies">
                  <Button variant="ghost" size="sm">View All <ArrowRight className="ml-1 h-3 w-3" /></Button>
                </Link>
              </CardHeader>
              <CardContent>
                {emergencies.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No emergencies in queue</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Patient</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {emergencies.slice(0, 5).map((em: any) => (
                          <TableRow key={em._id || em.id}>
                            <TableCell className="font-medium">{em.patientName || 'Unknown'}</TableCell>
                            <TableCell>
                              <Badge variant={em.severity === 'CRITICAL' ? 'destructive' : em.severity === 'URGENT' ? 'warning' : 'default'}>
                                {em.severity}
                              </Badge>
                            </TableCell>
                            <TableCell>{em.priorityScore || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{em.status}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {em.status === 'PENDING' && (
                                  <Button size="sm" variant="outline" onClick={() => handleUpdateEmergencyStatus(em._id || em.id, 'TRIAGE')}>
                                    <Activity className="h-3 w-3 mr-1" /> Triage
                                  </Button>
                                )}
                                {em.status === 'TRIAGE' && (
                                  <Button size="sm" variant="outline" onClick={() => handleUpdateEmergencyStatus(em._id || em.id, 'DISPATCHED')}>
                                    <Navigation className="h-3 w-3 mr-1" /> Dispatch
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Resource Management</CardTitle>
                <Link href="/staff/resources">
                  <Button variant="ghost" size="sm">Manage <ArrowRight className="ml-1 h-3 w-3" /></Button>
                </Link>
              </CardHeader>
              <CardContent>
                {resources.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No resources registered</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Available</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resources.slice(0, 5).map((r: any) => (
                          <TableRow key={r._id || r.id}>
                            <TableCell className="font-medium capitalize">{r.type}</TableCell>
                            <TableCell>{r.available}</TableCell>
                            <TableCell>{r.total}</TableCell>
                            <TableCell>
                              <Badge variant={r.status === 'AVAILABLE' ? 'success' : r.status === 'OCCUPIED' ? 'destructive' : 'warning'}>
                                {r.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ambulance Fleet</CardTitle>
            </CardHeader>
            <CardContent>
              {ambulances.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No ambulances registered</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Last Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ambulances.map((a: any) => (
                        <TableRow key={a._id || a.id}>
                          <TableCell className="font-medium">{a.vehicleNumber || a._id?.slice(-6) || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={a.status === 'AVAILABLE' ? 'success' : a.status === 'DISPATCHED' ? 'warning' : 'destructive'}>
                              {a.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {a.currentLocation
                              ? `${a.currentLocation.latitude?.toFixed(4)}, ${a.currentLocation.longitude?.toFixed(4)}`
                              : 'N/A'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {a.updatedAt ? formatDate(a.updatedAt) : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
