import cx from 'clsx';
import { useNavigate } from 'react-router';
import { Button, Container, Overlay, Text, Title } from '@mantine/core';
import classes from './Hero.module.css';

export function Hero() {
  const navigate = useNavigate();

  return (
    <div className={classes.wrapper}>
      <Overlay color="#000" opacity={0.65} zIndex={1} />

      <div className={classes.inner}>
        <Title className={classes.title}>
          究極のX自動投稿ツール{' '}
          <Text component="span" inherit className={classes.highlight}>
            登場
          </Text>
        </Title>

        <Container size={640}>
          <Text size="lg" className={classes.description}>
            X自動投稿ツール「虎威」は、強力なツールです。
            <br />
            使いやすく、直感的なインターフェースで、誰でも簡単に利用できます。
            <br />
            さあ、あなたもX自動投稿ツールを使ってみませんか？
          </Text>
        </Container>

        <div className={classes.controls}>
          <Button
            className={classes.control}
            variant="white"
            size="lg"
            onClick={() => navigate('/dashboard')}
          >
            はじめる
          </Button>
        </div>
      </div>
    </div>
  );
}
