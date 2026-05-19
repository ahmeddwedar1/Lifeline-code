'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export function useAuth(requiredRole?: string | string[]) {
  const { user, token, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      router.push('/login');
      return;
    }

    if (requiredRole && user) {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!roles.includes(user.role)) {
        router.push('/unauthorized');
      }
    }
  }, [isAuthenticated, token, user, requiredRole, router]);

  return {
    user,
    isAuthenticated,
    logout,
    role: user?.role,
    isAdmin: user?.role === 'ADMIN',
    isDoctor: user?.role === 'DOCTOR' || user?.role === 'HOSPITAL',
    isPublic: user?.role === 'PUBLIC_USER',
  };
}
