import { MantineProvider } from '@mantine/core';

import '@mantine/core/styles.css';

import { BrowserRouter } from 'react-router';
import Routes from './routes';
import { theme } from './themes';
import { Provider } from 'react-redux';
import store from './store';

export default App;
function App() {
  return (
    <Provider store={store}>
      <MantineProvider theme={theme}>
        <BrowserRouter>
          <Routes />
        </BrowserRouter>
      </MantineProvider>
    </Provider>
  );
}