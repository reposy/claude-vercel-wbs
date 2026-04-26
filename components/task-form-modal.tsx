'use client';

import {
  Alert,
  Button,
  CloseButton,
  Dialog,
  Field,
  Input,
  NativeSelect,
  Portal,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react';
import { useEffect, useState, useTransition } from 'react';
import { createTask, updateTask } from '@/lib/actions/tasks';
import { validateTaskInput, type TaskInput, type ValidationError } from '@/lib/validation/task';
import type { Task } from '@/lib/db/schema';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task;
  initialParentId?: string | null;
  parentTitle?: string;
};

export function TaskFormModal({ open, onOpenChange, task, initialParentId, parentTitle }: Props) {
  const isEdit = !!task;
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [assignee, setAssignee] = useState(task?.assignee ?? '');
  const [status, setStatus] = useState(task?.status ?? 'todo');
  const [progress, setProgress] = useState(String(task?.progress ?? 0));
  const [startDate, setStartDate] = useState(task?.startDate ?? '');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isPending, startTransition] = useTransition();

  // open이 false→true로 가거나 모달이 다른 task로 reuse될 때 폼 상태를 reset.
  // Why: Dialog.Root는 항상 mount된 상태로 두어야 Chakra가 body의 scroll-lock cleanup을 정상 실행함
  // (조건부 mount는 cleanup useEffect 우회 → body에 pointer-events:none 영구 잔류 → 행 클릭 죽음).
  // 또한 모달이 페이지 단위로 hoist되어 여러 task에 reuse되므로 task?.id / initialParentId 변경 시도 reset.
  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setAssignee(task?.assignee ?? '');
    setStatus(task?.status ?? 'todo');
    setProgress(String(task?.progress ?? 0));
    setStartDate(task?.startDate ?? '');
    setDueDate(task?.dueDate ?? '');
    setErrors([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task?.id, initialParentId]);

  const errorOf = (field: ValidationError['field']) => errors.find((e) => e.field === field)?.message;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input: TaskInput = {
      title: title.trim(),
      description: description.trim() || null,
      assignee: assignee.trim() || null,
      status,
      progress: Number.parseInt(progress, 10) || 0,
      startDate: startDate || null,
      dueDate: dueDate || null,
      parentId: task?.parentId ?? initialParentId ?? null,
    };
    const localErrors = validateTaskInput(input, { selfId: task?.id });
    if (localErrors.length) {
      setErrors(localErrors);
      return;
    }
    setErrors([]);
    startTransition(async () => {
      const result = isEdit && task
        ? await updateTask(task.id, input)
        : await createTask(input);
      if (result.ok) {
        onOpenChange(false);
      } else {
        setErrors(result.errors);
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(d) => onOpenChange(d.open)} size="md">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <form onSubmit={handleSubmit}>
              <Dialog.Header>
                <Dialog.Title>{isEdit ? '작업 수정' : '작업 추가'}</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="4">
                  {errorOf('general') && (
                    <Alert.Root status="error">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Description>{errorOf('general')}</Alert.Description>
                      </Alert.Content>
                    </Alert.Root>
                  )}

                  {parentTitle && (task?.parentId || initialParentId) && (
                    <Text fontSize="sm" color="fg.muted">
                      상위 작업:{' '}
                      <Text as="span" fontWeight="medium" color="fg">
                        {parentTitle}
                      </Text>
                    </Text>
                  )}

                  <Field.Root invalid={!!errorOf('title')} required>
                    <Field.Label>
                      제목 <Field.RequiredIndicator />
                    </Field.Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 기획 회의" autoFocus />
                    {errorOf('title') && <Field.ErrorText>{errorOf('title')}</Field.ErrorText>}
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>설명</Field.Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>담당자</Field.Label>
                    <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="예: 김PM" />
                  </Field.Root>

                  <Field.Root invalid={!!errorOf('status')}>
                    <Field.Label>상태</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="todo">할 일</option>
                        <option value="doing">진행 중</option>
                        <option value="done">완료</option>
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                    {errorOf('status') && <Field.ErrorText>{errorOf('status')}</Field.ErrorText>}
                  </Field.Root>

                  <Field.Root invalid={!!errorOf('progress')}>
                    <Field.Label>진행률 (%)</Field.Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={progress}
                      onChange={(e) => setProgress(e.target.value)}
                    />
                    {errorOf('progress') && <Field.ErrorText>{errorOf('progress')}</Field.ErrorText>}
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>시작일</Field.Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </Field.Root>

                  <Field.Root invalid={!!errorOf('dueDate')}>
                    <Field.Label>목표 기한</Field.Label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    {errorOf('dueDate') && <Field.ErrorText>{errorOf('dueDate')}</Field.ErrorText>}
                  </Field.Root>
                </Stack>
              </Dialog.Body>
              <Dialog.Footer>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                  취소
                </Button>
                <Button type="submit" colorPalette="blue" disabled={isPending}>
                  {isEdit ? '저장' : '추가'}
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
