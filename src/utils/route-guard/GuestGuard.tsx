import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
// project-imports
import { APP_DEFAULT_PATH } from '@/config';
import { useAppSelector } from '@/hooks/rtkhooks';
// types
import { GuardProps } from '@/types/auth';

// ==============================|| GUEST GUARD ||============================== //

const GuestGuard = ({ children }: GuardProps) => {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('GuestGuard', user?.uid, location.pathname);
    if (user?.uid) {
      navigate(location?.state?.from ? location?.state?.from : APP_DEFAULT_PATH, {
        state: {
          from: '',
        },
        replace: true,
      });
    } else {
      console.log(`user is not logged in loc:${location.pathname}`);
    }
  }, [user, navigate, location]);

  return children;
};

export default GuestGuard;
