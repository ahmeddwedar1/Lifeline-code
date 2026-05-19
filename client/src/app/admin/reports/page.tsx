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
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { adminApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Heart,
  Loader2,
  Download,
  FileText,
  Calendar,
  BarChart3,
  Loader,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

const reportTypes = [
  'EMERGENCY_SUMMARY',
  'RESOURCE_UTILIZATION',
  'BLOOD_STOCK',
  'USER_ACTIVITY',
  'HOSPITAL_PERFORMANCE',
  'SYSTEM_AUDIT',
];

export default function AdminReportsPage() {
  const { isAuthenticated } = useAuth('ADMIN');

  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [reportType, setReportType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generating, setGenerating] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getReports({ limit: 20 });
      setReports(data.data || []);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchReports();
  }, [isAuthenticated]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reportType || !startDate || !endDate) {
      toast.error('Please fill in all fields');
      return;
    }

    setGenerating(true);
    try {
      const { data } = await adminApi.generateReport({
        type: reportType,
        startDate,
        endDate,
      });
      toast.success('Report generated successfully');
      setReportType('');
      setStartDate('');
      setEndDate('');
      fetchReports();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (reportId: string) => {
    try {
      const { data } = await adminApi.getReport(reportId);
      const reportData = data.data || data;

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Report downloaded');
    } catch {
      toast.error('Failed to download report');
    }
  };

  const getReportTypeLabel = (type: string) => {
    return type
      ? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : 'N/A';
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
            <div className="ml-4 text-sm text-muted-foreground">/ Reports</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="mb-8">
            <h1 className="text-3xl font-heading font-bold text-secondary mb-2">Reports</h1>
            <p className="text-muted-foreground">Generate and download system reports</p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Generate Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-sm font-medium mb-1">Report Type *</label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTypes.map((rt) => (
                        <SelectItem key={rt} value={rt}>{getReportTypeLabel(rt)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Date *</label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Date *</label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>
                <Button type="submit" disabled={generating}>
                  {generating ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    <><FileText className="mr-2 h-4 w-4" /> Generate Report</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Generated Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : reports.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No reports generated yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report Type</TableHead>
                        <TableHead>Date Range</TableHead>
                        <TableHead>Generated</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((r: any) => (
                        <TableRow key={r._id || r.id}>
                          <TableCell className="font-medium">{getReportTypeLabel(r.type)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {r.startDate ? formatDate(r.startDate) : 'N/A'} - {r.endDate ? formatDate(r.endDate) : 'N/A'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {r.createdAt ? formatDate(r.createdAt) : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={r.status === 'COMPLETED' ? 'success' : r.status === 'PENDING' ? 'warning' : 'destructive'}>
                              {r.status || 'COMPLETED'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(r._id || r.id)}
                              disabled={r.status !== 'COMPLETED'}
                            >
                              <Download className="mr-1 h-3 w-3" />
                              Download
                            </Button>
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
