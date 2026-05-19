'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNotificationStore } from '@/store/notificationStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@radix-ui/react-dropdown-menu';
import {
  Bell,
  Menu,
  X,
  Heart,
  Ambulance,
  LogOut,
  User,
  Settings,
  LayoutDashboard,
} from 'lucide-react';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => pathname === path;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getDashboardLink = () => {
    switch (user?.role) {
      case 'ADMIN': return '/admin/dashboard';
      case 'HOSPITAL':
      case 'DOCTOR': return '/staff/dashboard';
      default: return '/dashboard';
    }
  };

  const navLinks = [
    { href: '/', label: 'Home', public: true },
    { href: '/hospitals', label: 'Hospitals', public: true },
    { href: '/emergency/report', label: 'Emergency', public: false },
    { href: '/blood', label: 'Blood Bank', public: false },
  ];

  return (
    <nav className="bg-white border-b border-border shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <Ambulance className="h-8 w-8 text-primary" />
              <span className="text-xl font-heading font-bold text-secondary">
                Life<span className="text-primary">Line</span>
              </span>
            </Link>
            <div className="hidden md:flex ml-10 space-x-1">
              {navLinks.map((link) => {
                if (link.public || isAuthenticated) {
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive(link.href)
                          ? 'text-primary bg-red-50'
                          : 'text-muted hover:text-secondary hover:bg-gray-50'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                }
                return null;
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link href="/notifications" className="relative p-2 rounded-full hover:bg-gray-100">
                  <Bell className="h-5 w-5 text-muted" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profilePictureUrl} />
                      <AvatarFallback className="bg-primary text-white text-xs">
                        {user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 mt-2 p-1 bg-white border rounded-lg shadow-lg" align="end">
                    <DropdownMenuLabel className="px-2 py-1.5 text-sm font-medium">
                      {user?.fullName}
                      <span className="block text-xs text-muted">{user?.email}</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="my-1 h-px bg-border" />
                    <DropdownMenuItem className="px-2 py-1.5 text-sm rounded hover:bg-gray-100 cursor-pointer flex items-center gap-2" onClick={() => router.push(getDashboardLink())}>
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem className="px-2 py-1.5 text-sm rounded hover:bg-gray-100 cursor-pointer flex items-center gap-2" onClick={() => router.push('/profile')}>
                      <User className="h-4 w-4" /> Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem className="px-2 py-1.5 text-sm rounded hover:bg-gray-100 cursor-pointer flex items-center gap-2" onClick={() => router.push('/settings')}>
                      <Settings className="h-4 w-4" /> Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1 h-px bg-border" />
                    <DropdownMenuItem className="px-2 py-1.5 text-sm rounded hover:bg-red-50 cursor-pointer flex items-center gap-2 text-red-600" onClick={handleLogout}>
                      <LogOut className="h-4 w-4" /> Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                  {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/register">
                  <Button>Register</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-white">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive(link.href)
                    ? 'text-primary bg-red-50'
                    : 'text-muted hover:text-secondary hover:bg-gray-50'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
