import React from 'react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/dates/styles.css';

import { GoogleOAuthProvider } from '@react-oauth/google';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router';
import Routes from './routes';
import store from './store';
import { theme } from './themes';

const googleClientId = import.meta.env.VITE_G_OAUTH_CLIENT_ID;

function App() {
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <Provider store={store}>
        <MantineProvider theme={theme}>
          <Notifications position="top-center" zIndex={100000000} />
          <Routes />
        </MantineProvider>
      </Provider>
    </GoogleOAuthProvider>
  );
}

export default App;
