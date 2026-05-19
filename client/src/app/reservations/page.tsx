'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { reservationApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Calendar,
  Hospital,
  Loader2,
  XCircle,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Heart,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function ReservationsPage() {
  const { isAuthenticated } = useAuth();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchReservations = async () => {
    try {
      const { data } = await reservationApi.getMy();
      setReservations(data.data || []);
    } catch {
      toast.error('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchReservations();
  }, [isAuthenticated]);

  const handleCancel = async (id: string) => {
    setCancelling(id);
    try {
      await reservationApi.cancel(id, 'Cancelled by user');
      toast.success('Reservation cancelled');
      fetchReservations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel reservation');
    } finally {
      setCancelling(null);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'CONFIRMED': return 'success';
      case 'COMPLETED': return 'default';
      case 'CANCELLED': return 'destructive';
      default: return 'outline';
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
            <div className="ml-4 text-sm text-muted-foreground">/ My Reservations</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-heading font-bold text-secondary mb-2">My Reservations</h1>
              <p className="text-muted-foreground">Manage your hospital resource reservations</p>
            </div>
            <Link href="/hospitals">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Reservation
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : reservations.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No reservations yet</p>
                <Link href="/hospitals">
                  <Button>Browse Hospitals to Reserve</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reservations.map((res: any) => (
                <Card key={res._id || res.id}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          res.status === 'CONFIRMED' ? 'bg-green-100' :
                          res.status === 'PENDING' ? 'bg-yellow-100' :
                          res.status === 'CANCELLED' ? 'bg-red-100' : 'bg-gray-100'
                        }`}>
                          {res.status === 'CONFIRMED' ? <CheckCircle className="h-5 w-5 text-green-600" /> :
                           res.status === 'PENDING' ? <Clock className="h-5 w-5 text-yellow-600" /> :
                           res.status === 'CANCELLED' ? <XCircle className="h-5 w-5 text-red-600" /> :
                           <AlertCircle className="h-5 w-5 text-gray-600" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium">{res.hospital?.name || 'Hospital'}</h3>
                            <Badge variant={getStatusVariant(res.status)}>{res.status}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 space-y-1">
                            <p>Resource: {res.resourceType || 'N/A'}</p>
                            <p>Date: {formatDate(res.createdAt)}</p>
                            {res.notes && <p>Notes: {res.notes}</p>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/hospitals/${res.hospital?._id || res.hospital?.id}`}>
                          <Button variant="outline" size="sm">
                            <Hospital className="mr-1 h-3 w-3" />
                            View Hospital
                          </Button>
                        </Link>
                        {(res.status === 'PENDING' || res.status === 'CONFIRMED') && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancel(res._id || res.id)}
                            disabled={cancelling === (res._id || res.id)}
                          >
                            {cancelling === (res._id || res.id) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <XCircle className="mr-1 h-3 w-3" />
                            )}
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
