import path from 'path';
import { child } from 'firebase/database';
import { MainLayout } from '@/layouts/MainLayout';
import Activity from '@/pages/Activity';
import Dashboard from '@/pages/Dashboard';
import ProfilePage from '@/pages/Profile';
import XAccountsList from '@/pages/XAccountsList';
import XPostsList from '@/pages/XPostsList';
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
          path: '',
          element: <Activity />,
        },
        {
          path: 'x-accounts',
          element: <XAccountsList />,
        },
        {
          path: 'x-accounts/:xAccountId',
          element: <XPostsList />,
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
