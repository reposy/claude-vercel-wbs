'use client';

import { Alert, Button, CloseButton, Dialog, Portal, Stack, Text } from '@chakra-ui/react';
import { useState, useTransition } from 'react';
import { deleteTask } from '@/lib/actions/tasks';
import type { Task } from '@/lib/db/schema';
import type { ValidationError } from '@/lib/validation/task';

type Props = {
  task: Task;
  childCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TaskDeleteDialog({ task, childCount, open, onOpenChange }: Props) {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const message =
    childCount > 0
      ? `이 작업과 하위 작업 ${childCount}개가 모두 삭제됩니다. 계속할까요?`
      : '이 작업을 삭제합니다. 계속할까요?';
  const generalError = errors.find((e) => e.field === 'general')?.message;

  function handleConfirm() {
    setErrors([]);
    startTransition(async () => {
      const result = await deleteTask(task.id);
      if (result.ok) {
        onOpenChange(false);
      } else {
        setErrors(result.errors);
      }
    });
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(d) => onOpenChange(d.open)}
      role="alertdialog"
      size="sm"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
            <Dialog.Header>
              <Dialog.Title>작업 삭제</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap="3">
                <Text>{message}</Text>
                {generalError && (
                  <Alert.Root status="error">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>{generalError}</Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                )}
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                취소
              </Button>
              <Button colorPalette="red" onClick={handleConfirm} disabled={isPending}>
                삭제
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
