import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
// types
import { GuardProps } from '@/types/auth';
// project-imports
import { useAppSelector } from '../../hooks/rtkhooks';

// ==============================|| AUTH GUARD ||============================== //

const AuthGuard = ({ children }: GuardProps) => {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('AuthGuard', user?.uid, location.pathname);
    if (!user?.uid) {
      console.log('navigate to login');
      navigate('login', {
        state: {
          from: location.pathname,
        },
        replace: true,
      });
    } else {
      console.log(`user is logged in locL${location.pathname}`);
    }
  }, [user, navigate, location]);

  return children;
};

export default AuthGuard;
