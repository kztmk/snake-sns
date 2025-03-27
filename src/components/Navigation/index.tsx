import { useEffect } from 'react';

import { ActionIcon, Box, Flex, Group, ScrollArea, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconBook2,
  IconBrandAuth0,
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
  IconUserCircle,
  IconUserCode,
  IconUserPlus,
  IconUserShield,
  IconX,
} from '@tabler/icons-react';

import { SidebarState } from '@/layouts/MainLayout/Sidebar/SidebarState';
import { Logo} from '@/components';
import UserProfileButton from '@/components/UserProfileButton';
import { LinksGroup } from '@/components/Navigation/Links/';
import UserProfileData from '../data/UserProfile.json';


import classes from './Navigation.module.css';

const mockdata = [
  {
    title: 'Dashboard',
    links: [
      { label: 'Default', icon: IconChartBar, link: '#' },
      {
        label: 'Analytics',
        icon: IconChartInfographic,
        link: '#',
      },
      { label: 'SaaS', icon: IconChartArcs3, link: '#' },
    ],
  },
  {
    title: 'Apps',
    links: [
      { label: 'Profile', icon: IconUserCircle, link: '/dashboard/x-accounts' },
      { label: 'Settings', icon: IconUserCode, link: '#' },
      { label: 'Chat', icon: IconMessages, link: '#' },
      { label: 'Projects', icon: IconBriefcase, link: '#' },
      { label: 'Orders', icon: IconListDetails, link: '#' },
      {
        label: 'Invoices',
        icon: IconFileInvoice,
        links: [
          {
            label: 'List',
            link: '#',
          },
          {
            label: 'Details',
            link: '#',
          },
        ],
      },
      { label: 'Tasks', icon: IconListDetails, link: '#' },
      { label: 'Calendar', icon: IconCalendar, link: '#' },
      {
        label: 'File Manager',
        icon: IconFiles,
        link: '#',
      },
    ],
  },
  {
    title: 'Auth',
    links: [
      { label: 'Sign In', icon: IconLogin2, link: '#' },
      { label: 'Sign Up', icon: IconUserPlus, link: '#' },
      {
        label: 'Reset Password',
        icon: IconRotateRectangle,
        link: '#',
      },
      { label: 'Clerk', icon: IconUserShield, link: '#' },
      { label: 'Auth0', icon: IconBrandAuth0, link: '#' },
    ],
  },
  {
    title: 'Pages',
    links: [
      { label: 'Pricing', icon: IconReceipt2, link: '#' },
      { label: 'Blank Page', icon: IconLayersSubtract, link: '#' },
    ],
  },
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

const Navigation = ({
  onClose,
  onSidebarStateChange,
  sidebarState,
}: NavigationProps) => {
  const tablet_match = useMediaQuery('(max-width: 768px)');

  const links = mockdata.map((m) => (
    <Box key={m.title} pl={0} mb={sidebarState === 'mini' ? 0 : 'md'}>
      {sidebarState !== 'mini' && (
        <Text
          tt="uppercase"
          size="xs"
          pl="md"
          fw={500}
          mb="sm"
          className={classes.linkHeader}
        >
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
          {links}
        </div>
      </ScrollArea>

      <div className={classes.footer}>
        <UserProfileButton
          email={UserProfileData.email}
          image={UserProfileData.avatar}
          name={UserProfileData.name}
          showText={sidebarState !== 'mini'}
        />
      </div>
    </div>
  );
};

export default Navigation;
