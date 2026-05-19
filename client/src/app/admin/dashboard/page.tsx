'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { adminApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Heart,
  Loader2,
  Users,
  Building2,
  AlertTriangle,
  Activity,
  Bell,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  BarChart3,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

const COLORS = ['#E63946', '#F4A261', '#2DC653', '#457B9D', '#1D3557'];

export default function AdminDashboardPage() {
  const { user, isAuthenticated } = useAuth('ADMIN');
  const { logout } = useAuthStore();
  const router = useRouter();

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchStats = async () => {
      try {
        const [statsRes, logsRes] = await Promise.all([
          adminApi.getStats(),
          adminApi.getAuditLogs({ limit: 10 }).catch(() => ({ data: { data: [] } })),
        ]);

        setStats(statsRes.data.data || statsRes.data);
        setAuditLogs(logsRes.data.data || []);
      } catch {
        toast.error('Failed to load admin stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isAuthenticated]);

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

  const statCards = [
    { label: 'Total Users', value: stats?.userCounts?.total || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Hospitals', value: stats?.hospitalCount || 0, icon: Building2, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Active Emergencies', value: stats?.emergencyStats?.active || 0, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
    { label: 'Total Emergencies', value: stats?.emergencyStats?.total || 0, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  const emergenciesByDay = stats?.emergenciesByDay || [];
  const resourceUtilization = stats?.resourceUtilization || [];
  const emergencyStatusDist = stats?.emergencyStatusDistribution || [];
  const userCounts = stats?.userCounts || {};

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg emergency-gradient flex items-center justify-center">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-heading font-bold text-secondary">Admin Dashboard</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/admin/users"><Button variant="ghost" size="sm">Users</Button></Link>
              <Link href="/admin/hospitals"><Button variant="ghost" size="sm">Hospitals</Button></Link>
              <Link href="/admin/reports"><Button variant="ghost" size="sm">Reports</Button></Link>
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
            <p className="text-muted-foreground">System Administration Overview</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map((stat) => {
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
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Emergencies Per Day
                </CardTitle>
              </CardHeader>
              <CardContent>
                {emergenciesByDay.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={emergenciesByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#DEE2E6" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#E63946" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Emergency Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                {emergencyStatusDist.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No data available</p>
                ) : (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={emergencyStatusDist}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                        >
                          {emergencyStatusDist.map((_: any, idx: number) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Resource Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                {resourceUtilization.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={resourceUtilization} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#DEE2E6" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="type" type="category" tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="available" fill="#2DC653" radius={[0, 4, 4, 0]} name="Available" />
                      <Bar dataKey="used" fill="#E63946" radius={[0, 4, 4, 0]} name="Used" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Users by Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(userCounts).map(([role, count]) => {
                    if (role === 'total') return null;
                    const total = (userCounts.total || 1);
                    const percent = Math.round(((count as number) / total) * 100);
                    return (
                      <div key={role}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium capitalize">{role.replace(/_/g, ' ').toLowerCase()}</span>
                          <span className="text-muted-foreground">{count as number} ({percent}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log: any) => (
                    <div key={log._id || log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{log.user?.fullName || log.userId || 'System'}</span>
                          {' '}{log.action || log.event}{' '}
                          {log.details && <span className="text-muted-foreground">- {log.details}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {log.createdAt ? formatDate(log.createdAt) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
