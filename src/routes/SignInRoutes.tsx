import React, { lazy } from 'react';
import Loadable from '@/components/Loader/Loaderble';
// project-imports
import BlankPage from '@/layouts/BlankPage/';
import GuestGuard from '@/utils/route-guard/GuestGuard';

// render - login
const AuthSignin = lazy(() => import('@/pages/Auth/SignIn'));
const AuthForgotPassword = Loadable(lazy(() => import('@/pages/Auth/ForgotPassword')));
const AuthResetPassword = Loadable(lazy(() => import('@/pages/Auth/ResetPassword')));
//const AuthRegister = Loadable(lazy(() => import('../pages/auth/register')));

// ==============================|| AUTH ROUTES ||============================== //

const SignInRoutes = {
  path: '/',
  children: [
    {
      path: '/',
      element: (
        <GuestGuard>
          <BlankPage />
        </GuestGuard>
      ),
      children: [
        {
          path: 'signin',
          element: <AuthSignin />,
        },
        {
          path: 'forgot-password',
          element: <AuthForgotPassword />,
        },
        {
          path: 'reset-password',
          element: <AuthResetPassword />,
        },
      ],
    },
  ],
};

export default SignInRoutes;
