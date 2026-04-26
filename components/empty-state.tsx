import { Text, VStack } from '@chakra-ui/react';

export function EmptyState({ children }: { children?: React.ReactNode }) {
  return (
    <VStack gap="6" py="20" textAlign="center">
      <Text color="fg.muted">아직 작업이 없습니다. 첫 작업을 추가해 시작하세요</Text>
      {children}
    </VStack>
  );
}
