import { MainLayout } from '@/layouts/MainLayout';
import Dashboard from '@/pages/Dashboard';
import AuthGuard  from '@/utils/route-guard/AuthGuard';
import { child } from 'firebase/database';
import path from 'path';

import XAccountsList from '@/pages/XAccoutsList'

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
        
        children: [
            {
                path: 'x-accounts',
                element: <XAccountsList />,
            }
        ],
    },
    ],
};
export default MainRoutes;