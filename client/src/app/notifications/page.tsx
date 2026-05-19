'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { notificationApi } from '@/lib/api';
import { useNotificationStore } from '@/store/notificationStore';
import toast from 'react-hot-toast';
import {
  Bell,
  Heart,
  Loader2,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Info,
  Calendar,
  Droplets,
  Building2,
  Clock,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'EMERGENCY': return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case 'RESERVATION': return <Calendar className="h-5 w-5 text-blue-500" />;
    case 'BLOOD': return <Droplets className="h-5 w-5 text-green-500" />;
    case 'HOSPITAL': return <Building2 className="h-5 w-5 text-purple-500" />;
    default: return <Info className="h-5 w-5 text-blue-500" />;
  }
};

export default function NotificationsPage() {
  const { isAuthenticated } = useAuth();
  const { notifications, setNotifications, markAllAsRead: storeMarkAllRead, markAsRead, unreadCount } = useNotificationStore();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      const { data } = await notificationApi.getAll();
      setNotifications(data.data || []);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchNotifications();
  }, [isAuthenticated]);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      storeMarkAllRead();
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark notifications as read');
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      markAsRead(id);
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await notificationApi.delete(id);
      setNotifications(notifications.filter((n) => n.id !== id));
      toast.success('Notification deleted');
    } catch {
      toast.error('Failed to delete notification');
    } finally {
      setDeleting(null);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg emergency-gradient flex items-center justify-center">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-heading font-bold text-secondary">LifeLine</span>
            </Link>
            <div className="ml-4 text-sm text-muted-foreground">/ Notifications</div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-heading font-bold text-secondary mb-2">Notifications</h1>
              <p className="text-muted-foreground">
                {unreadCount > 0
                  ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                  : 'No unread notifications'}
              </p>
            </div>
            {notifications.length > 0 && (
              <Button variant="outline" onClick={handleMarkAllRead}>
                <CheckCheck className="mr-2 h-4 w-4" />
                Mark All as Read
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Notifications about emergencies, reservations, and blood requests will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`cursor-pointer transition-colors ${
                    !notification.isRead ? 'border-primary/30 bg-primary/5' : ''
                  }`}
                  onClick={() => {
                    if (!notification.isRead) handleMarkRead(notification.id);
                  }}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{notification.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!notification.isRead && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(notification.id);
                            }}
                            disabled={deleting === notification.id}
                          >
                            {deleting === notification.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{formatDate(notification.createdAt)}</span>
                        <Badge variant="outline" className="text-xs">{notification.type}</Badge>
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
