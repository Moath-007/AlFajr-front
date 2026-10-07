import { Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
export default function AccountDetailsPage() { const { user } = useAuth(); return <Navigate replace to={user?.role === 'Admin' ? '/owner/accounts' : '/rep/accounts'} />; }
