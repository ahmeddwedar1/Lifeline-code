'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { emergencyApi, reservationApi, bloodApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import {
  Heart,
  AlertTriangle,
  Building2,
  Droplets,
  Ambulance,
  ArrowRight,
  Calendar,
  Clock,
  Loader2,
  Activity,
  User,
  Bell,
  Hospital,
} from 'lucide-react';
import { formatDate, getSeverityColor } from '@/lib/utils';

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth('PUBLIC_USER');
  const { logout } = useAuthStore();
  const router = useRouter();

  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [bloodRequests, setBloodRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      try {
        const [emergRes, reservRes, bloodRes] = await Promise.all([
          emergencyApi.getMy().catch(() => ({ data: { data: [] } })),
          reservationApi.getMy().catch(() => ({ data: { data: [] } })),
          bloodApi.getRequests({ limit: 5 }).catch(() => ({ data: { data: [] } })),
        ]);

        setEmergencies(emergRes.data.data || []);
        setReservations(reservRes.data.data || []);
        setBloodRequests(bloodRes.data.data || []);
      } catch {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  const quickActions = [
    { label: 'Report Emergency', icon: AlertTriangle, href: '/emergency/report', color: 'bg-red-600', hover: 'hover:bg-red-700' },
    { label: 'Find Hospitals', icon: Building2, href: '/hospitals', color: 'bg-blue-600', hover: 'hover:bg-blue-700' },
    { label: 'Request Blood', icon: Droplets, href: '/blood', color: 'bg-green-600', hover: 'hover:bg-green-700' },
    { label: 'My Reservations', icon: Calendar, href: '/reservations', color: 'bg-purple-600', hover: 'hover:bg-purple-700' },
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
    toast.success('Logged out successfully');
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg emergency-gradient flex items-center justify-center">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-heading font-bold text-secondary">LifeLine</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/notifications">
                <Button variant="ghost" size="icon">
                  <Bell className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/profile">
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="mb-8 bg-gradient-to-r from-primary/5 to-transparent border-primary/10">
            <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-heading font-bold text-secondary">
                  Welcome, {user?.fullName || 'User'}
                </h1>
                <p className="text-muted-foreground mt-1">
                  Here&apos;s your healthcare dashboard overview
                </p>
              </div>
              <Link href="/emergency/report">
                <Button variant="emergency">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Report Emergency
                </Button>
              </Link>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-heading font-bold">{emergencies.length}</div>
                  <div className="text-xs text-muted-foreground">My Emergencies</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-heading font-bold">{reservations.length}</div>
                  <div className="text-xs text-muted-foreground">My Reservations</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Droplets className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-heading font-bold">{bloodRequests.length}</div>
                  <div className="text-xs text-muted-foreground">Blood Requests</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-heading font-bold">Active</div>
                  <div className="text-xs text-muted-foreground">Account Status</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.label} href={action.href}>
                  <Card className={`${action.color} text-white border-none card-hover cursor-pointer`}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <Icon className="h-6 w-6" />
                      <span className="font-medium text-sm">{action.label}</span>
                      <ArrowRight className="h-4 w-4 ml-auto" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Recent Emergencies</CardTitle>
                <Link href="/emergency/report">
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {emergencies.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No emergencies reported yet</p>
                ) : (
                  <div className="space-y-3">
                    {emergencies.slice(0, 5).map((em: any) => (
                      <div key={em._id || em.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getSeverityColor(em.severity) }}
                          />
                          <div>
                            <p className="text-sm font-medium">{em.patientName || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">
                              {em.symptoms?.slice(0, 50)}{em.symptoms?.length > 50 ? '...' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={em.severity === 'CRITICAL' ? 'destructive' : em.severity === 'URGENT' ? 'warning' : 'default'}>
                            {em.severity}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(em.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Recent Reservations</CardTitle>
                <Link href="/reservations">
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {reservations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No reservations yet</p>
                ) : (
                  <div className="space-y-3">
                    {reservations.slice(0, 5).map((res: any) => (
                      <div key={res._id || res.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Hospital className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{res.hospital?.name || 'Hospital'}</p>
                            <p className="text-xs text-muted-foreground">
                              {res.resourceType} - {formatDate(res.createdAt)}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            res.status === 'CONFIRMED'
                              ? 'success'
                              : res.status === 'PENDING'
                              ? 'warning'
                              : res.status === 'CANCELLED'
                              ? 'destructive'
                              : 'default'
                          }
                        >
                          {res.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
