import cx from 'clsx';
import { Button, Container, Overlay, Text, Title } from '@mantine/core';
import { useNavigate } from 'react-router';

import classes from './Hero.module.css';

export function Hero() {
  const navigate  = useNavigate();

  return (
    <div className={classes.wrapper}>
      <Overlay color="#000" opacity={0.65} zIndex={1} />

      <div className={classes.inner}>
        <Title className={classes.title}>
          Automated AI code reviews for{' '}
          <Text component="span" inherit className={classes.highlight}>
            any stack
          </Text>
        </Title>

        <Container size={640}>
          <Text size="lg" className={classes.description}>
            Build more reliable software with AI companion. AI is also trained to detect lazy
            developers who do nothing and just complain on Twitter.
          </Text>
        </Container>

        <div className={classes.controls}>
          <Button className={classes.control} variant="white" size="lg" onClick={()=> navigate('/dashboard')}>
            Get started
          </Button>
          <Button className={cx(classes.control, classes.secondaryControl)} size="lg">
            Live demo
          </Button>
        </div>
      </div>
    </div>
  );
}
