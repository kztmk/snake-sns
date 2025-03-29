import { Box, Grid, SimpleGrid, Stack } from '@mantine/core';
import ApiKeySettings from './ApiKeys';
import BasicInfo from './BasicInfo';
import PasswordChange from './PasswordChange';

export default function ProfilePage() {
  return (
    <Stack gap="lg">
      {/* 上のBoxにBasicInfoとPasswordChangeを横に配置、狭い画面では縦に配置 */}
      <Box p="md">
        <Grid gutter="lg" styles={{ root: { '--grid-align': 'stretch' } }}>
          <Grid.Col span={{ base: 6, md: 6, sm: 12 }}>
            <Box>
              <BasicInfo />
            </Box>
          </Grid.Col>
          <Grid.Col span={{ base: 6, md: 6, sm: 12 }}>
            <Box style={{ height: '100%' }}>
              <PasswordChange />
            </Box>
          </Grid.Col>
        </Grid>
      </Box>

      {/* 下のBoxにApiKeySettingsを配置 */}
      <Box>
        <ApiKeySettings />
      </Box>
    </Stack>
  );
}
