import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { ApiUserRole } from '@/api';
import { useAuth } from '@/auth';

interface RequireRoleProps {
  role: ApiUserRole;
  children: ReactNode;
}

export default function RequireRole({ role, children }: RequireRoleProps) {
  const { user, isRestoringSession } = useAuth();

  if (isRestoringSession) {
    return (
      <div className="min-h-screen grid place-items-center bg-stone-50" dir="rtl">
        <div className="h-9 w-9 rounded-full border-4 border-stone-200 border-t-brand animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    return <Navigate to={user.role === 'Admin' ? '/owner' : '/rep'} replace />;
  }

  return children;
}
