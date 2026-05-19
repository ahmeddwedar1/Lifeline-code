'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { searchApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Hospital,
  MapPin,
  Phone,
  Star,
  Bed,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Building2,
  Stethoscope,
} from 'lucide-react';
import { formatDistance } from '@/lib/utils';

const specializations = [
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Oncology',
  'Emergency Medicine',
  'Radiology',
  'Surgery',
];

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function HospitalsPage() {
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [bloodType, setBloodType] = useState('');
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchHospitals = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 12 };
      if (search) params.query = search;
      if (city) params.city = city;
      if (selectedSpecializations.length) params.specializations = selectedSpecializations.join(',');
      if (bloodType) params.bloodType = bloodType;

      const { data } = await searchApi.searchHospitals(params);
      const result = data.data || data;
      setHospitals(Array.isArray(result) ? result : result.hospitals || []);
      setTotalPages(result.totalPages || 1);
    } catch {
      toast.error('Failed to load hospitals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchHospitals();
  };

  const toggleSpecialization = (spec: string) => {
    setSelectedSpecializations((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  };

  const applyFilters = () => {
    setPage(1);
    fetchHospitals();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg emergency-gradient flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-heading font-bold text-secondary">LifeLine</span>
            </Link>
            <div className="ml-4 text-sm text-muted-foreground">/ Hospitals</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="mb-8">
            <h1 className="text-3xl font-heading font-bold text-secondary mb-2">Find Hospitals</h1>
            <p className="text-muted-foreground">Search and filter hospitals by location, specialization, and availability</p>
          </div>

          <Card className="mb-8">
            <CardContent className="p-4">
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search hospitals by name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Input
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="sm:w-40"
                />
                <Select value={bloodType} onValueChange={setBloodType}>
                  <SelectTrigger className="sm:w-36">
                    <SelectValue placeholder="Blood Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    {bloodTypes.map((bt) => (
                      <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="submit">Search</Button>
              </form>

              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Specializations:</p>
                <div className="flex flex-wrap gap-2">
                  {specializations.map((spec) => (
                    <button
                      key={spec}
                      onClick={() => toggleSpecialization(spec)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        selectedSpecializations.includes(spec)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-muted-foreground border-border hover:border-primary'
                      }`}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
              </div>

              {selectedSpecializations.length > 0 && (
                <div className="mt-3 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={applyFilters}>
                    Apply Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : hospitals.length === 0 ? (
            <div className="text-center py-20">
              <Hospital className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hospitals found matching your criteria</p>
              <Button variant="outline" className="mt-4" onClick={() => { setSearch(''); setCity(''); setSelectedSpecializations([]); setBloodType(''); setPage(1); fetchHospitals(); }}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {hospitals.map((hospital: any) => (
                  <Link key={hospital._id || hospital.id} href={`/hospitals/${hospital._id || hospital.id}`}>
                    <Card className="h-full card-hover cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Hospital className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-sm font-medium">{(hospital.rating || 4.0).toFixed(1)}</span>
                          </div>
                        </div>

                        <h3 className="text-lg font-heading font-bold text-secondary mb-1">{hospital.name}</h3>

                        <div className="flex items-start gap-1 text-sm text-muted-foreground mb-1">
                          <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                          <span>{hospital.address?.city || 'City'}, {hospital.address?.state || 'State'}</span>
                        </div>

                        {hospital.distance !== undefined && (
                          <p className="text-xs text-muted-foreground mb-3">
                            {formatDistance(hospital.distance)} away
                          </p>
                        )}

                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex items-center gap-1">
                            <Bed className="h-4 w-4 text-blue-500" />
                            <span className="text-sm">
                              <strong>{hospital.availableBeds || 0}</strong> beds
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4 text-green-500" />
                            <span className="text-sm">{hospital.phone || 'N/A'}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {(hospital.specializations || []).slice(0, 3).map((spec: string) => (
                            <Badge key={spec} variant="secondary" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                          {(hospital.specializations?.length || 0) > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{hospital.specializations.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Button
                      key={p}
                      variant={page === p ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}
