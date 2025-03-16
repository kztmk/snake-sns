import { Container, MantineProvider } from '@mantine/core';

import { theme } from './themes';

function App() {
  return (
    <MantineProvider theme={theme}>
      <Container>
        <h1>Hello, Mantine!</h1>
      </Container>
    </MantineProvider>
  );
}

export default App;
