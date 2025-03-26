import { Outlet } from 'react-router';
import { Paper } from '@mantine/core';

const BlankPage = () => {
  return (
    <Paper>
      <Outlet />
    </Paper>
  );
};

export default BlankPage;
