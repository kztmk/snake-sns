// project files
import { lazy } from 'react';
import { useRoutes } from 'react-router';
import GuestPageLayout from '../layouts/Guest';
import MainRoutes from './MainRoutes';
import SignInRoutes from './SignInRoutes';

const PagesLanding = lazy(() => import('@/pages/HomePage'));
const NotFound = lazy(() => import('@/pages/NotFound404'));

const ThemeRoutes = () => {
  return useRoutes([
    {
      path: '/',
      element: <GuestPageLayout />,
      children: [
        {
          path: '/',
          element: <PagesLanding />,
        },
      ],
    },
    MainRoutes,
    SignInRoutes,
    {
      path: '*',
      element: <GuestPageLayout />,
      children: [
        {
          path: '*',
          element: <NotFound />,
        },
      ],
    },
  ]);
};

export default ThemeRoutes;
