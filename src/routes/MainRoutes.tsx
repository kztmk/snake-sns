import { MainLayout } from '@/layouts/MainLayout';
import Dashboard from '@/pages/Dashboard';
import AuthGuard  from '@/utils/route-guard/AuthGuard';
import path from 'path';

const MainRoutes =  {
    path: '/',
    element: (
        <AuthGuard>
            <MainLayout />
        </AuthGuard>
    ),
    children: [
        {
            path: '/dashboard',
            element: <Dashboard />,
        },
    ],
};
export default MainRoutes;