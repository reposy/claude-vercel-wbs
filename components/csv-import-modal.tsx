'use client';

import {
  Alert,
  Box,
  Button,
  CloseButton,
  Dialog,
  HStack,
  Portal,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { applyCsvImport } from '@/lib/actions/csv';
import { parseCsvFile, type ParsePreview } from '@/lib/csv/parse';
import { STATUS_LABEL } from '@/lib/csv/serialize';
import type { Task } from '@/lib/db/schema';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingTasks: Task[];
};

export function CsvImportModal({ open, onOpenChange, existingTasks }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ParsePreview | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Dialog 항상 mount 패턴: open 변화로 폼 상태 reset (task-form-modal.tsx와 동일).
  useEffect(() => {
    if (!open) {
      setPreview(null);
      setErrorMsg(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [open]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    try {
      const existingTitles = existingTasks.map((t) => t.title);
      const result = await parseCsvFile(file, existingTitles);
      setPreview(result);
    } catch (err) {
      console.error(err);
      setErrorMsg('CSV 파일을 읽는 중 오류가 발생했습니다.');
      setPreview(null);
    }
  }

  function handleApply() {
    if (!preview || preview.valid.length === 0) return;
    setErrorMsg(null);
    startTransition(async () => {
      const result = await applyCsvImport(preview.valid);
      if (result.ok) {
        onOpenChange(false);
        router.refresh();
      } else {
        setErrorMsg(result.error);
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(d) => onOpenChange(d.open)} size="lg">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>CSV 불러오기</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap="4">
                {errorMsg && (
                  <Alert.Root status="error">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>{errorMsg}</Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                )}

                <HStack gap="2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                  />
                </HStack>

                {preview && (
                  <Stack gap="3">
                    <Text fontWeight="medium">
                      {preview.counts.add}개 작업을 추가합니다. 제외 {preview.counts.exclude}건
                    </Text>

                    {preview.excluded.length > 0 && (
                      <Box>
                        <Text fontSize="sm" fontWeight="medium" mb="1">
                          제외 사유
                        </Text>
                        <Stack gap="0.5">
                          {preview.excluded.map((e) => (
                            <Text fontSize="sm" key={`ex-${e.rowNumber}`} color="fg.muted">
                              {e.rowNumber}행: {e.reason}
                            </Text>
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {preview.warnings.length > 0 && (
                      <Box>
                        <Text fontSize="sm" fontWeight="medium" mb="1">
                          경고
                        </Text>
                        <Stack gap="0.5">
                          {preview.warnings.map((w) => (
                            <Text fontSize="sm" key={`wn-${w.rowNumber}`} color="fg.muted">
                              {w.title}: {w.reason}
                            </Text>
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {preview.valid.length > 0 && (
                      <Box maxH="320px" overflowY="auto" borderWidth="1px" borderRadius="md">
                        <Table.Root size="sm" variant="line">
                          <Table.Header>
                            <Table.Row>
                              <Table.ColumnHeader>제목</Table.ColumnHeader>
                              <Table.ColumnHeader>담당자</Table.ColumnHeader>
                              <Table.ColumnHeader>상태</Table.ColumnHeader>
                              <Table.ColumnHeader>상위 작업</Table.ColumnHeader>
                            </Table.Row>
                          </Table.Header>
                          <Table.Body>
                            {preview.valid.map((r, i) => (
                              <Table.Row key={i}>
                                <Table.Cell>{r.title}</Table.Cell>
                                <Table.Cell>{r.assignee ?? ''}</Table.Cell>
                                <Table.Cell>{STATUS_LABEL[r.status]}</Table.Cell>
                                <Table.Cell>{r.parentTitle ?? '(최상위)'}</Table.Cell>
                              </Table.Row>
                            ))}
                          </Table.Body>
                        </Table.Root>
                      </Box>
                    )}
                  </Stack>
                )}
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                취소
              </Button>
              <Button
                colorPalette="blue"
                onClick={handleApply}
                disabled={!preview || preview.valid.length === 0 || isPending}
              >
                적용
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
