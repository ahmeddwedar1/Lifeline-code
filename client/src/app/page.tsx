'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import {
  AlertTriangle,
  Heart,
  Building2,
  Ambulance,
  Activity,
  Clock,
  Shield,
  Users,
  ArrowRight,
  ChevronRight,
  Menu,
  X,
  Droplets,
} from 'lucide-react';

const stats = [
  { value: '200+', label: 'Hospitals', icon: Building2 },
  { value: '10,000+', label: 'Emergencies Handled', icon: Activity },
  { value: '5,000+', label: 'Available Beds', icon: Heart },
  { value: '1,000+', label: 'Ambulances', icon: Ambulance },
];

const quickActions = [
  {
    title: 'Report Emergency',
    description: 'Get immediate medical assistance',
    icon: AlertTriangle,
    color: 'bg-red-600',
    hoverColor: 'hover:bg-red-700',
    href: '/emergency/report',
  },
  {
    title: 'Find Hospital',
    description: 'Search available hospitals near you',
    icon: Building2,
    color: 'bg-blue-600',
    hoverColor: 'hover:bg-blue-700',
    href: '/hospitals',
  },
  {
    title: 'Request Blood',
    description: 'Find blood donors and stock',
    icon: Droplets,
    color: 'bg-green-600',
    hoverColor: 'hover:bg-green-700',
    href: '/blood',
  },
  {
    title: 'Track Ambulance',
    description: 'Real-time ambulance tracking',
    icon: Ambulance,
    color: 'bg-orange-600',
    hoverColor: 'hover:bg-orange-700',
    href: '/ambulance/track',
  },
];

const features = [
  {
    title: 'Real-Time Emergency Response',
    description: 'Instant emergency reporting with GPS location, automated severity assessment, and priority-based dispatch.',
    icon: Clock,
  },
  {
    title: 'Resource Management',
    description: 'Real-time bed availability, blood stock, and equipment tracking across all connected hospitals.',
    icon: Shield,
  },
  {
    title: 'Smart Coordination',
    description: 'AI-powered hospital recommendations based on proximity, capacity, and expertise match.',
    icon: Users,
  },
  {
    title: 'Unified Platform',
    description: 'Seamless communication between patients, hospitals, ambulances, and emergency responders.',
    icon: Activity,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5 } },
};

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user) {
      const roleRoutes: Record<string, string> = {
        PUBLIC_USER: '/dashboard',
        DOCTOR: '/staff/dashboard',
        HOSPITAL: '/staff/dashboard',
        ADMIN: '/admin/dashboard',
      };
      router.push(roleRoutes[user.role] || '/dashboard');
    }
  }, [isAuthenticated, user, router]);

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg emergency-gradient flex items-center justify-center">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-heading font-bold text-secondary">LifeLine</span>
            </Link>

            <div className="hidden md:flex items-center gap-4">
              <Link href="/hospitals">
                <Button variant="ghost">Hospitals</Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button>Get Started</Button>
              </Link>
            </div>

            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-white">
            <div className="px-4 py-3 space-y-2">
              <Link href="/hospitals" className="block">
                <Button variant="ghost" className="w-full justify-start">Hospitals</Button>
              </Link>
              <Link href="/login" className="block">
                <Button variant="ghost" className="w-full justify-start">Sign In</Button>
              </Link>
              <Link href="/register" className="block">
                <Button className="w-full">Get Started</Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 emergency-gradient opacity-5" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(230,57,70,0.1),transparent_70%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <Badge variant="destructive" className="mb-4 px-4 py-1.5 text-sm">
              Trusted by 200+ Healthcare Facilities
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-secondary mb-6 leading-tight">
              LifeLine{' '}
              <span className="text-primary">Emergency Medical<br />Resource Management</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Real-time healthcare coordination platform connecting patients, hospitals, and emergency services.
              When every second counts, LifeLine delivers.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" variant="emergency" className="text-base px-8">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/hospitals">
                <Button size="lg" variant="outline" className="text-base px-8">
                  Find Hospitals
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-12 border-y border-border bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div key={stat.label} variants={itemVariants} className="text-center">
                  <Icon className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-3xl font-heading font-bold text-secondary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-heading font-bold text-secondary text-center mb-12"
          >
            Quick Actions
          </motion.h2>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <motion.div key={action.title} variants={itemVariants}>
                  <Link href={action.href}>
                    <Card className={`${action.color} text-white border-none card-hover cursor-pointer overflow-hidden relative`}>
                      <CardContent className="p-6">
                        <Icon className="h-10 w-10 mb-4 opacity-90" />
                        <h3 className="text-lg font-heading font-bold mb-1">{action.title}</h3>
                        <p className="text-sm opacity-90">{action.description}</p>
                        <ChevronRight className="absolute bottom-4 right-4 h-5 w-5 opacity-60" />
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-heading font-bold text-secondary mb-4">
              Why Choose LifeLine?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our platform integrates everything needed for modern emergency medical coordination.
            </p>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div key={feature.title} variants={itemVariants}>
                  <Card className="h-full card-hover">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 rounded-lg emergency-gradient flex items-center justify-center mb-4">
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-lg font-heading font-bold text-secondary mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section className="py-16 emergency-gradient">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-heading font-bold text-white mb-4">
              Ready to Make a Difference?
            </h2>
            <p className="text-white/80 mb-8 text-lg">
              Join thousands of healthcare providers and save lives with LifeLine.
            </p>
            <Link href="/register">
              <Button size="lg" variant="secondary" className="text-base px-8">
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <footer className="bg-secondary text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg emergency-gradient flex items-center justify-center">
                  <Heart className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-heading font-bold">LifeLine</span>
              </div>
              <p className="text-white/60 text-sm">
                Emergency Medical Resource Management System
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Quick Links</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li><Link href="/hospitals" className="hover:text-white transition-colors">Hospitals</Link></li>
                <li><Link href="/emergency/report" className="hover:text-white transition-colors">Report Emergency</Link></li>
                <li><Link href="/blood" className="hover:text-white transition-colors">Blood Request</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Contact</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li>Emergency: 911</li>
                <li>Support: support@lifeline.com</li>
                <li>24/7 Helpline: 1-800-LIFELINE</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm text-white/40">
            &copy; {new Date().getFullYear()} LifeLine. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
