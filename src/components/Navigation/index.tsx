import { useEffect } from 'react';
import {
  IconBook2,
  IconBrandAuth0,
  IconBrandX,
  IconBrandXdeep,
  IconBriefcase,
  IconCalendar,
  IconChartArcs3,
  IconChartBar,
  IconChartInfographic,
  IconExclamationCircle,
  IconFileInvoice,
  IconFiles,
  IconLayersSubtract,
  IconLifebuoy,
  IconList,
  IconListDetails,
  IconLogin2,
  IconMessages,
  IconReceipt2,
  IconRotateRectangle,
  IconUser,
  IconUserCircle,
  IconUserCode,
  IconUserPlus,
  IconUserShield,
  IconX,
} from '@tabler/icons-react';
import { ActionIcon, Box, Flex, Group, ScrollArea, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Logo } from '@/components';
import { LinksGroup } from '@/components/Navigation/Links/';
import UserProfileButton from '@/components/UserProfileButton';
import { useAppDispatch, useAppSelector } from '@/hooks/rtkhooks';
import { SidebarState } from '@/layouts/MainLayout/Sidebar/SidebarState';
import { XAccount } from '@/types/xAccounts';
import UserProfileData from '../data/UserProfile.json';
import classes from './Navigation.module.css';

// メニュー項目の型を定義
type MenuItem = {
  label: string;
  icon: React.FC<any>; // アイコンコンポーネントの型
  link: string;
  links?: MenuItem[]; // サブメニューの場合
};

// メニュー見出しグループの型
type MenuGroup = {
  title: string;
  links: MenuItem[];
};

const mainMenu = [
  {
    title: 'Dashboard',
    links: [
      { label: 'Default', icon: IconChartBar, link: '#' },
      {
        label: 'プロフィール',
        icon: IconUserCircle,
        link: '/profile',
      },
    ],
  },
];

const docsMenu = [
  {
    title: 'Documentation',
    links: [
      {
        label: 'About',
        icon: IconExclamationCircle,
        link: '#',
      },
      {
        label: 'Getting started',
        icon: IconLifebuoy,
        link: '#',
      },
      {
        label: 'Documentation',
        icon: IconBook2,
        link: '#',
      },
      { label: 'Changelog', icon: IconList, link: '#' },
    ],
  },
];

type NavigationProps = {
  onClose: () => void;
  sidebarState: SidebarState;
  onSidebarStateChange: (state: SidebarState) => void;
};

const Navigation = ({ onClose, onSidebarStateChange, sidebarState }: NavigationProps) => {
  const tablet_match = useMediaQuery('(max-width: 768px)');

  const xAccounts = useAppSelector((state) => state.xAccounts.xAccountList);
  const user = useAppSelector((state) => state.auth.user);

  const xAccountLinks = {
    label: 'X',
    icon: IconBrandX,
    link: '/dashboard/x-accounts',
    links: xAccounts.map((xAccount: XAccount) => ({
      label: `@${xAccount.id}`,
      icon: IconBrandXdeep,
      link: `/dashboard/x-accounts/${xAccount.id}`,
    })),
  };

  const snsLinks = () => (
    <Box key="snsLinks" pl={0} mb={sidebarState === 'mini' ? 0 : 'md'}>
      {sidebarState !== 'mini' && (
        <Text tt="uppercase" size="xs" pl="md" fw={500} mb="sm" className={classes.linkHeader}>
          SNS
        </Text>
      )}
      <LinksGroup
        key="xAccount"
        {...xAccountLinks}
        isMini={sidebarState === 'mini'}
        closeSidebar={() => {
          setTimeout(() => {
            onClose();
          }, 250);
        }}
      />
    </Box>
  );

  const links = (menu: MenuGroup[]) =>
    menu.map((m) => (
      <Box key={m.title} pl={0} mb={sidebarState === 'mini' ? 0 : 'md'}>
        {sidebarState !== 'mini' && (
          <Text tt="uppercase" size="xs" pl="md" fw={500} mb="sm" className={classes.linkHeader}>
            {m.title}
          </Text>
        )}
        {m.links.map((item) => (
          <LinksGroup
            key={item.label}
            {...item}
            isMini={sidebarState === 'mini'}
            closeSidebar={() => {
              setTimeout(() => {
                onClose();
              }, 250);
            }}
          />
        ))}
      </Box>
    ));

  useEffect(() => {
    if (tablet_match) {
      onSidebarStateChange('full');
    }
  }, [onSidebarStateChange, tablet_match]);

  return (
    <div className={classes.navbar} data-sidebar-state={sidebarState}>
      <div className={classes.header}>
        <Flex justify="space-between" align="center" gap="sm">
          <Group
            justify={sidebarState === 'mini' ? 'center' : 'space-between'}
            style={{ flex: tablet_match ? 'auto' : 1 }}
          >
            <Logo className={classes.logo} showText={sidebarState !== 'mini'} />
          </Group>
          {tablet_match && (
            <ActionIcon onClick={onClose} variant="transparent">
              <IconX color="white" />
            </ActionIcon>
          )}
        </Flex>
      </div>

      <ScrollArea className={classes.links}>
        <div className={classes.linksInner} data-sidebar-state={sidebarState}>
          {links(mainMenu)}
          {snsLinks()}
          {links(docsMenu)}
        </div>
      </ScrollArea>

      <div className={classes.footer}>
        <UserProfileButton
          email={user.email ?? 'not registered'}
          image={user.avatarUrl ?? ''}
          name={user.displayName ?? '登録なし'}
          showText={sidebarState !== 'mini'}
        />
      </div>
    </div>
  );
};

export default Navigation;
