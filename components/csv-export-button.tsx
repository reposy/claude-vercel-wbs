'use client';

import { Button } from '@chakra-ui/react';
import { useCallback } from 'react';
import { buildCsvFilename, serializeTasksToCsv } from '@/lib/csv/serialize';
import type { Task } from '@/lib/db/schema';

type Props = { tasks: Task[] };

export function CsvExportButton({ tasks }: Props) {
  const handleClick = useCallback(() => {
    const csv = serializeTasksToCsv(tasks);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildCsvFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [tasks]);

  return (
    <Button size="sm" variant="outline" onClick={handleClick} disabled={tasks.length === 0}>
      CSV 내보내기
    </Button>
  );
}
