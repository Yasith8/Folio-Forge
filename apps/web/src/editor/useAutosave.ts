import { formatZodIssues, updateResumeInputSchema, type ValidationIssue } from '@folioforge/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, queryKeys } from '../lib/api';
import { selectIsDirty, useEditorStore } from './store';

export type SaveStatus =
  | { kind: 'saved'; at?: Date }
  | { kind: 'pending' }
  | { kind: 'saving' }
  | { kind: 'invalid'; issues: ValidationIssue[] }
  | { kind: 'error'; message: string }
  | { kind: 'conflict' };

export interface Autosave {
  status: SaveStatus;
  /** Saves immediately. Resolves to false if the document is invalid or the save failed. */
  flush: () => Promise<boolean>;
  /** Conflict resolution: keep this tab's version and overwrite the server copy. */
  overwrite: () => Promise<void>;
  /** Conflict resolution: discard local changes and load the server copy. */
  reloadLatest: () => Promise<void>;
}

/**
 * Debounced autosave.
 *
 * Every edit bumps `changeId` in the editor store. After `delay` ms without
 * further edits the document is validated with the shared Zod schema and sent
 * with the revision it was based on. Only one request is in flight at a time;
 * edits made during a save trigger another save afterwards. A 409 means the
 * server copy changed elsewhere, and saving pauses until the user decides.
 */
export function useAutosave(delay = 800): Autosave {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SaveStatus>({ kind: 'saved' });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const blocked = useRef(false);
  const scheduleRef = useRef<() => void>(() => undefined);

  const save = useCallback(async (): Promise<boolean> => {
    clearTimeout(timer.current);
    while (inFlight.current) await inFlight.current;

    const state = useEditorStore.getState();
    const { doc, resumeId, changeId, revision } = state;
    if (!doc || !resumeId) return true;
    if (!selectIsDirty(state)) {
      setStatus((s) => (s.kind === 'saved' ? s : { kind: 'saved', at: new Date() }));
      return true;
    }
    if (blocked.current) return false;

    const parsed = updateResumeInputSchema.safeParse({ ...doc, revision });
    if (!parsed.success) {
      setStatus({ kind: 'invalid', issues: formatZodIssues(parsed.error) });
      return false;
    }

    setStatus({ kind: 'saving' });
    const run = (async () => {
      try {
        const saved = await api.updateResume(resumeId, parsed.data);
        const now = useEditorStore.getState();
        if (now.resumeId !== resumeId) return true; // The user opened another resume meanwhile.
        now.markSaved(changeId, saved.revision);
        queryClient.setQueryData(queryKeys.resume(resumeId), saved);
        void queryClient.invalidateQueries({ queryKey: queryKeys.resumes, exact: true });
        if (useEditorStore.getState().changeId !== changeId) scheduleRef.current();
        else setStatus({ kind: 'saved', at: new Date() });
        return true;
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          blocked.current = true;
          setStatus({ kind: 'conflict' });
        } else if (error instanceof ApiError && error.status === 400 && error.details.length) {
          setStatus({ kind: 'invalid', issues: error.details });
        } else {
          setStatus({
            kind: 'error',
            message: error instanceof ApiError ? error.message : 'Could not save your changes.',
          });
          // Transient failure (network, server restart): retry later.
          timer.current = setTimeout(() => void save(), 5_000);
        }
        return false;
      } finally {
        inFlight.current = null;
      }
    })();
    inFlight.current = run;
    return run;
  }, [queryClient]);

  useEffect(() => {
    scheduleRef.current = () => {
      clearTimeout(timer.current);
      if (!blocked.current) setStatus({ kind: 'pending' });
      timer.current = setTimeout(() => void save(), delay);
    };
  }, [save, delay]);

  useEffect(
    () =>
      useEditorStore.subscribe((state, previous) => {
        if (state.resumeId !== previous.resumeId) blocked.current = false;
        if (state.changeId === previous.changeId) return;
        if (!selectIsDirty(state)) {
          clearTimeout(timer.current);
          setStatus({ kind: 'saved' });
          return;
        }
        scheduleRef.current();
      }),
    [],
  );

  // Warn before closing the tab with unsaved changes; save when leaving the editor.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (selectIsDirty(useEditorStore.getState())) event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      clearTimeout(timer.current);
      void save();
    };
  }, [save]);

  const overwrite = useCallback(async () => {
    const { resumeId } = useEditorStore.getState();
    if (!resumeId) return;
    const latest = await api.getResume(resumeId);
    useEditorStore.getState().setRevision(latest.revision);
    blocked.current = false;
    await save();
  }, [save]);

  const reloadLatest = useCallback(async () => {
    const { resumeId } = useEditorStore.getState();
    if (!resumeId) return;
    const latest = await api.getResume(resumeId);
    blocked.current = false;
    queryClient.setQueryData(queryKeys.resume(resumeId), latest);
    useEditorStore.getState().load(latest);
    setStatus({ kind: 'saved', at: new Date() });
  }, [queryClient]);

  return { status, flush: save, overwrite, reloadLatest };
}
