import { useEffect, useState } from 'react';
import { IconBrandX, IconMessage, IconX } from '@tabler/icons-react';
import { Button, Container, Group, Image, Modal, Text, Tooltip } from '@mantine/core';
import { VerticalTimeline, VerticalTimelineElement } from '@/components/VerticalTimeline';
import { MediaDataType, XPostDataType } from '@/types/xAccounts';
import { getBlobFromCache } from '@/utils/db';

interface ThreadPostsProps {
  open: boolean;
  onClose: () => void;
  posts: XPostDataType[];
  onConfirm: (threadPosts: XPostDataType[]) => void;
}

const ThreadPosts: React.FC<ThreadPostsProps> = (props) => {
  const { open, onClose, posts, onConfirm } = props;
  const [xPosts, setXPosts] = useState<XPostDataType[]>([]); // 初期値を空配列に変更
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true); // ローディング状態を追加

  useEffect(() => {
    setIsLoading(true); // ローディング開始
    setXPosts(posts);
    setIsLoading(false); // ローディング終了
  }, [posts]);

  useEffect(() => {
    const loadMediaUrls = async () => {
      const urls: Record<string, string> = {};
      for (const post of props.posts) {
        if (post.media) {
          const mediaList = JSON.parse(post.media);
          for (const media of mediaList) {
            if (media.fileId) {
              const cachedBlob = await getBlobFromCache(media.fileId);
              if (cachedBlob) {
                urls[media.fileId] = URL.createObjectURL(cachedBlob);
              }
            }
          }
        }
      }
      setMediaUrls(urls);
    };

    loadMediaUrls();

    return () => {
      // Cleanup object URLs to prevent memory leaks
      Object.values(mediaUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [props.posts]);

  const handleDeleteClick = (id: string) => {
    setXPosts((prevPosts) => prevPosts.filter((post) => post.id !== id));
  };

  const showMediaNumber = (media: string | undefined) => {
    if (!media) return '';
    const mediaList = JSON.parse(media);
    if (mediaList.length === 0) return '';
    if (mediaList.length > 0) {
      return (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span>メディア:</span>
          {mediaList.map((image: MediaDataType, index: number) => (
            <Tooltip
              key={index}
              label={
                mediaUrls[image.fileId] ? (
                  <Image
                    src={mediaUrls[image.fileId]}
                    alt={image.fileName || `画像 ${index + 1}`}
                    width={200}
                  />
                ) : (
                  '画像を読み込み中...'
                )
              }
              withArrow
            >
              <span title={image.fileName || `画像 ${index + 1}`}>🌟</span>
            </Tooltip>
          ))}
        </div>
      );
    }
  };

  useEffect(() => {
    console.log('ThreadPosts received posts:', posts);
    console.log('ThreadPosts xPosts state:', xPosts);
  }, [posts, xPosts]);

  if (isLoading) {
    return <Text>読み込み中...</Text>; // ローディング中の表示
  }

  const handleCancelClick = () => {
    setXPosts([]);
    onClose();
  };

  // スレッド投稿を作成する関数
  const handleCreateThread = () => {
    onConfirm(xPosts);
    setXPosts([]);
    onClose();
  };

  return (
    <Modal
      opened={open}
      onClose={() => onClose()}
      title="スレッド投稿作成"
      size="lg" // サイズを一段小さく変更
      styles={{
        content: {
          height: '80vh', // 縦の高さを80%に設定
          borderLeft: '4px solid #9b59b6',
        },
      }}
    >
      <Container size="lg" p="md">
        <Group justify="center" mt="xl" w="100%" gap="md">
          <Button
            variant="outline"
            color="gray"
            onClick={handleCancelClick}
            size="md"
            w={150}
            leftSection={<IconX size={18} />}
            type="button"
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            size="md"
            w={150}
            leftSection={<IconBrandX size={18} />}
            onClick={handleCreateThread}
          >
            作成
          </Button>
        </Group>
        <VerticalTimeline>
          {xPosts.map((post) => (
            <VerticalTimelineElement
              id={post.id || ''}
              key={post.id}
              className="vertical-timeline-element--work"
              date={post.postSchedule}
              icon={<IconBrandX />}
              onDelete={() => handleDeleteClick(post.id || '')}
              iconStyle={{ background: '#9b59b6', color: '#fff' }}
            >
              <h3 className="vertical-timeline-element-title">{post.contents}</h3>
              {showMediaNumber(post.media)}
            </VerticalTimelineElement>
          ))}
        </VerticalTimeline>
      </Container>
    </Modal>
  );
};

export default ThreadPosts;
