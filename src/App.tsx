import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import { BrowserRouter } from 'react-router';
import Routes from './routes';
import { theme } from './themes';
import { Provider } from 'react-redux';
import store from './store';


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