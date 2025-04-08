import { Link as RouterLink } from 'react-router';
import { Group, Text, UnstyledButton, UnstyledButtonProps } from '@mantine/core';
import LogoImage from '@/assets/images/torai_icon512.png';
import classes from './Logo.module.css';

type LogoProps = {
  to?: string;
  showText?: boolean;
} & UnstyledButtonProps;

const Logo = ({ to, showText = true, ...others }: LogoProps) => {
  // RouterLinkラッパーコンポーネントを作成
  const LinkComponent = ({ to, ...props }: any) => <RouterLink to={to || '/'} {...props} />;

  return (
    <UnstyledButton className={classes.logo} component={LinkComponent} to={to || '/'} {...others}>
      <Group gap="xs">
        <img
          src={LogoImage}
          height={showText ? 32 : 24}
          width={showText ? 32 : 24}
          alt="design sparx logo"
        />
        {showText && <Text fw={700}>虎威</Text>}
      </Group>
    </UnstyledButton>
  );
};

export default Logo;
