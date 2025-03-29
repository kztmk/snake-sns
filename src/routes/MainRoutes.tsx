import path from 'path';
import { child } from 'firebase/database';
import { MainLayout } from '@/layouts/MainLayout';
import Dashboard from '@/pages/Dashboard';
import ProfilePage from '@/pages/Profile';
import XAccountsList from '@/pages/XAccoutsList';
import AuthGuard from '@/utils/route-guard/AuthGuard';

const MainRoutes = {
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
        },
      ],
    },
    {
      path: 'profile',
      element: <ProfilePage />,
    },
  ],
};
export default MainRoutes;
