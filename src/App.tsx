import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/dates/styles.css';

import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router';
import Routes from './routes';
import store from './store';
import { theme } from './themes';

function App() {
  return (
    <Provider store={store}>
      <MantineProvider theme={theme}>
        <Notifications position="top-center" zIndex={100000000} />
        <BrowserRouter>
          <Routes />
        </BrowserRouter>
      </MantineProvider>
    </Provider>
  );
}

export default App;
