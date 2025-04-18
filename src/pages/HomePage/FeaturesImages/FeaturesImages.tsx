import { useEffect } from 'react';
import { Container, Image, SimpleGrid, Text, ThemeIcon, Title } from '@mantine/core';
import AppStatusIcons from '@/assets/images/appStatusIcons';
import logoBugs from '@/assets/images/appStatusIcons/bug.png';
import logoFixed from '@/assets/images/appStatusIcons/bugFixed.png';
import logoImportant from '@/assets/images/appStatusIcons/important.png';
import logoInfo from '@/assets/images/appStatusIcons/information.png';
import logoFeature from '@/assets/images/appStatusIcons/newFeature.png';
import logoUpdate from '@/assets/images/appStatusIcons/update.png';
import { useAppDispatch, useAppSelector } from '@/hooks/rtkhooks';
import { fetchSystemAnnouncement } from '@/store/reducers/systemAnnouncementSlice';
import classes from './FeaturesImages.module.css';

type IconKey = keyof typeof AppStatusIcons;

function setImage(status: string) {
  switch (status) {
    case 'info':
      return logoInfo;
    case 'bugs':
      return logoBugs;
    case 'fixed':
      return logoFixed;
    case 'update':
      return logoUpdate;
    case 'important':
      return logoImportant;
    case 'feature':
      return logoFeature;
    default:
      return '';
  }
}

export function FeaturesImages() {
  const dispatch = useAppDispatch();
  const { sysAnnouncements } = useAppSelector((state) => state.systemAnnouncements);

  useEffect(() => {
    dispatch(fetchSystemAnnouncement());
  }, [dispatch]);

  const items = sysAnnouncements.map((item) => (
    <div className={classes.item} key={item.id}>
      <ThemeIcon variant="light" className={classes.itemIcon} size={84} radius="md">
        <Image src={setImage(item.status)} />
      </ThemeIcon>

      <div>
        <Text fw={700} fz="lg" className={classes.itemTitle}>
          {item.title}
        </Text>
        <Text c="dimmed">{item.description}</Text>
        <Text c="dimmed">{item.date}</Text>
      </div>
    </div>
  ));

  return (
    <Container size={700} className={classes.wrapper}>
      <Text className={classes.supTitle}>システムからのお知らせ</Text>

      <Container size={660} p={0}>
        <Text c="dimmed" className={classes.description}>
          システムの不具合、新機能、重要なお知らせなどを掲載しております。
        </Text>
      </Container>

      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing={50} mt={30}>
        {items}
      </SimpleGrid>
    </Container>
  );
}
