import type { ResumeVersionDto } from '@folioforge/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/Dialog';
import { inputClasses } from '../components/ui/Field';
import { Spinner } from '../components/ui/Spinner';
import { toast } from '../components/ui/Toaster';
import { api, ApiError, queryKeys } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { useEditorStore } from './store';
import { useEditorUi } from './uiStore';

const message = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Something went wrong. Try again.';

export function HistoryPanel({
  resumeId,
  flush,
}: {
  resumeId: string;
  flush: () => Promise<boolean>;
}) {
  const queryClient = useQueryClient();
  const labelId = useId();
  const [label, setLabel] = useState('');
  const [restoring, setRestoring] = useState<ResumeVersionDto | null>(null);
  const versions = useQuery({
    queryKey: queryKeys.versions(resumeId),
    queryFn: () => api.listVersions(resumeId),
  });

  const create = useMutation({
    mutationFn: async () => {
      // Snapshots copy what is stored on the server, so save pending edits first.
      if (!(await flush()))
        throw new Error('Fix the issues shown in the editor before saving a snapshot.');
      return api.createVersion(resumeId, label.trim() || undefined);
    },
    onSuccess: (version) => {
      setLabel('');
      void queryClient.invalidateQueries({ queryKey: queryKeys.versions(resumeId) });
      toast.success(`Saved snapshot “${version.label}”.`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : message(error)),
  });

  const restore = useMutation({
    mutationFn: async (version: ResumeVersionDto) => {
      await flush();
      return api.restoreVersion(resumeId, version.id);
    },
    onSuccess: (resume, version) => {
      queryClient.setQueryData(queryKeys.resume(resumeId), resume);
      useEditorStore.getState().load(resume);
      useEditorUi.getState().reset();
      void queryClient.invalidateQueries({ queryKey: queryKeys.versions(resumeId) });
      setRestoring(null);
      toast.success(`Restored “${version.label}”. Your previous version was saved as a snapshot.`);
    },
    onError: (error) => toast.error(message(error)),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate();
  };

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="rounded-lg border border-line bg-surface-2 p-3">
        <label htmlFor={labelId} className="mb-1 block text-sm font-semibold">
          Save a snapshot
        </label>
        <p className="mb-2 text-xs text-muted">
          Keep a named copy before big changes, e.g. before tailoring for one company.
        </p>
        <div className="flex gap-2">
          <input
            id={labelId}
            value={label}
            maxLength={80}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Before tailoring for Acme"
            className={inputClasses(false)}
          />
          <Button type="submit" variant="primary" busy={create.isPending}>
            Save
          </Button>
        </div>
      </form>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Snapshots</h3>
        {versions.isPending && <Spinner label="Loading snapshots" />}
        {versions.isError && <p className="text-sm text-danger">Snapshots could not be loaded.</p>}
        {versions.data?.length === 0 && (
          <p className="text-sm text-muted">
            No snapshots yet. Autosave keeps your latest version; snapshots let you go back.
          </p>
        )}
        <ol className="space-y-2">
          {versions.data?.map((version) => (
            <li
              key={version.id}
              className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{version.label}</p>
                <p className="text-xs text-muted">
                  <time dateTime={version.createdAt}>{formatDateTime(version.createdAt)}</time>
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setRestoring(version)}
                aria-label={`Restore ${version.label}`}
              >
                Restore
              </Button>
            </li>
          ))}
        </ol>
      </div>

      <ConfirmDialog
        open={restoring !== null}
        title={`Restore “${restoring?.label ?? ''}”?`}
        description="The resume will go back to this snapshot. Your current version is saved as a new snapshot first, so nothing is lost."
        confirmLabel="Restore snapshot"
        busy={restore.isPending}
        onCancel={() => setRestoring(null)}
        onConfirm={() => restoring && restore.mutate(restoring)}
      />
    </div>
  );
}
