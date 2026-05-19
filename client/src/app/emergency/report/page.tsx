'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { emergencyApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Loader2,
  MapPin,
  Navigation,
  Heart,
  Building2,
  Clock,
  Activity,
  CheckCircle,
  ArrowRight,
  User,
  Phone,
} from 'lucide-react';
import { getSeverityColor } from '@/lib/utils';

export default function ReportEmergencyPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<'form' | 'result'>('form');
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [severity, setSeverity] = useState('');
  const [location, setLocation] = useState({ latitude: '', longitude: '', address: '' });
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [result, setResult] = useState<any>(null);
  const [emergencyId, setEmergencyId] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude.toString(),
          longitude: pos.coords.longitude.toString(),
          address: `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`,
        });
        toast.success('Location detected');
        setLocating(false);
      },
      () => {
        toast.error('Failed to detect location. Please enter manually.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientName || !age || !symptoms) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!location.latitude || !location.longitude) {
      toast.error('Please provide location coordinates');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        patientName,
        age: parseInt(age),
        symptoms,
        location: {
          latitude: parseFloat(location.latitude),
          longitude: parseFloat(location.longitude),
          address: location.address,
        },
      };
      if (severity) payload.severity = severity;

      const { data } = await emergencyApi.create(payload);
      const emergency = data.data || data;
      setResult(emergency);
      setEmergencyId(emergency._id || emergency.id);
      setStatus(emergency.status || 'PENDING');
      setStep('result');
      toast.success('Emergency reported successfully');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to report emergency';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (step === 'result' && emergencyId) {
      const interval = setInterval(async () => {
        try {
          const { data } = await emergencyApi.getById(emergencyId);
          const em = data.data || data;
          setStatus(em.status);
        } catch {
          // ignore
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [step, emergencyId]);

  const statusSteps = [
    { key: 'PENDING', label: 'Reported', icon: AlertTriangle },
    { key: 'TRIAGE', label: 'Under Triage', icon: Activity },
    { key: 'DISPATCHED', label: 'Dispatched', icon: Navigation },
    { key: 'IN_PROGRESS', label: 'In Progress', icon: Clock },
    { key: 'COMPLETED', label: 'Completed', icon: CheckCircle },
  ];

  const currentStatusIndex = statusSteps.findIndex((s) => s.key === status);

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
            <div className="ml-4 text-sm text-muted-foreground">/ Report Emergency</div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {step === 'form' ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-8">
                <h1 className="text-3xl font-heading font-bold text-secondary mb-2">Report Emergency</h1>
                <p className="text-muted-foreground">Provide details for immediate medical assistance</p>
              </div>

              <Card className="border-red-200">
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Patient Name *</label>
                        <Input
                          placeholder="Full name"
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Age *</label>
                        <Input
                          type="number"
                          placeholder="Age"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          min={0}
                          max={150}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Symptoms *</label>
                      <textarea
                        className="w-full min-h-[120px] rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="Describe the symptoms in detail..."
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Severity (optional)</label>
                      <Select value={severity} onValueChange={setSeverity}>
                        <SelectTrigger>
                          <SelectValue placeholder="Auto-assess if not specified" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="NORMAL">Normal</SelectItem>
                          <SelectItem value="URGENT">Urgent</SelectItem>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">Location *</label>
                        <Button type="button" variant="outline" size="sm" onClick={getLocation} disabled={locating}>
                          {locating ? (
                            <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Detecting...</>
                          ) : (
                            <><Navigation className="mr-1 h-3 w-3" /> Auto-Detect</>
                          )}
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-2">
                        <Input
                          placeholder="Latitude"
                          value={location.latitude}
                          onChange={(e) => setLocation({ ...location, latitude: e.target.value })}
                        />
                        <Input
                          placeholder="Longitude"
                          value={location.longitude}
                          onChange={(e) => setLocation({ ...location, longitude: e.target.value })}
                        />
                      </div>
                      <Input
                        placeholder="Address description"
                        value={location.address}
                        onChange={(e) => setLocation({ ...location, address: e.target.value })}
                      />
                    </div>

                    <Button type="submit" variant="emergency" className="w-full" disabled={submitting}>
                      {submitting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                      ) : (
                        <><AlertTriangle className="mr-2 h-4 w-4" /> Report Emergency</>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-8">
                <h1 className="text-3xl font-heading font-bold text-secondary mb-2">Emergency Reported</h1>
                <p className="text-muted-foreground">Your emergency has been registered. Help is on the way.</p>
              </div>

              <Card className="border-red-200 mb-6">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <div
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold mb-4"
                      style={{ backgroundColor: getSeverityColor(result?.severity || 'NORMAL') }}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      {result?.severity || 'NORMAL'} SEVERITY
                    </div>
                    <div className="text-4xl font-heading font-bold text-secondary">
                      Priority Score: {result?.priorityScore || result?.priority || 'N/A'}
                    </div>
                    <p className="text-muted-foreground mt-2">Emergency ID: {emergencyId}</p>
                  </div>

                  <Separator className="my-6" />

                  <div className="mb-6">
                    <h3 className="text-lg font-heading font-bold text-secondary mb-4">Status Tracker</h3>
                    <div className="relative">
                      {statusSteps.map((s, index) => {
                        const Icon = s.icon;
                        const isCompleted = index <= currentStatusIndex;
                        const isCurrent = index === currentStatusIndex;

                        return (
                          <div key={s.key} className="flex items-start gap-3 mb-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              isCompleted ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                            } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="pt-1">
                              <p className={`text-sm font-medium ${isCompleted ? 'text-secondary' : 'text-muted-foreground'}`}>
                                {s.label}
                              </p>
                              {isCurrent && (
                                <p className="text-xs text-primary mt-1">Current status</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {result?.recommendedHospitals && result.recommendedHospitals.length > 0 && (
                    <>
                      <Separator className="my-6" />
                      <div>
                        <h3 className="text-lg font-heading font-bold text-secondary mb-4">Recommended Hospitals</h3>
                        <div className="space-y-3">
                          {result.recommendedHospitals.map((h: any) => (
                            <Link key={h._id || h.id} href={`/hospitals/${h._id || h.id}`}>
                              <Card className="hover:bg-muted/50 cursor-pointer card-hover">
                                <CardContent className="p-4 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Building2 className="h-5 w-5 text-primary" />
                                    <div>
                                      <p className="text-sm font-medium">{h.name}</p>
                                      <p className="text-xs text-muted-foreground">{h.distance ? `${h.distance.toFixed(1)}km away` : ''}</p>
                                    </div>
                                  </div>
                                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                </CardContent>
                              </Card>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex gap-3 mt-6">
                    <Link href="/dashboard">
                      <Button variant="outline">Back to Dashboard</Button>
                    </Link>
                    <Link href={`/hospitals`}>
                      <Button>Find Hospitals</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
