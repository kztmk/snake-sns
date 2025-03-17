import { MantineProvider } from '@mantine/core';

import '@mantine/core/styles.css';

import { BrowserRouter } from 'react-router';
import Routes from './routes';
import { theme } from './themes';

function App() {
  return (
    <MantineProvider theme={theme}>
      <BrowserRouter>
        <Routes />
      </BrowserRouter>
    </MantineProvider>
  );
}

export default App;
