import { describeItem, isListSection, type ValidationIssue } from '@folioforge/shared';
import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Spinner } from '../components/ui/Spinner';
import { useEditorStore, type EditorDoc } from './store';
import type { Autosave } from './useAutosave';
import { fieldId, focusWhenReady, useEditorUi } from './uiStore';

interface ResolvedIssue {
  where: string;
  message: string;
  reveal: () => void;
}

/** Turns "content.sections.2.items.0.position" into "Experience, Untitled position" plus a way to jump there. */
export function resolveIssue(
  issue: ValidationIssue,
  doc: EditorDoc,
  onShowContent: () => void,
): ResolvedIssue {
  const parts = issue.path.split('.');
  const ui = useEditorUi.getState();
  const go = (id: string, expand: string[]) => () => {
    onShowContent();
    expand.forEach((e) => ui.setExpanded(e, true));
    focusWhenReady(id);
  };
  if (parts[0] === 'title')
    return {
      where: 'Resume name',
      message: issue.message,
      reveal: () => focusWhenReady('resume-title'),
    };
  if (parts[0] === 'theme')
    return { where: 'Design', message: issue.message, reveal: () => undefined };
  if (parts[1] === 'basics') {
    const field = parts.slice(2).join('.') || 'name';
    return {
      where: 'Personal info',
      message: issue.message,
      reveal: go(fieldId('basics', field.replace(/\.(username)$/, '.url')), ['basics']),
    };
  }
  const section = doc.content.sections[Number(parts[2])];
  if (!section) return { where: 'Resume', message: issue.message, reveal: () => undefined };
  if (parts[3] === 'items' && isListSection(section)) {
    const item = section.items[Number(parts[4])];
    if (item) {
      const field = parts[5] ?? '';
      return {
        where: `${section.title || 'Section'}, ${describeItem(section.type, item)}`,
        message: issue.message,
        reveal: go(fieldId(item.id, field), [section.id, item.id]),
      };
    }
  }
  return {
    where: section.title || 'Section',
    message: issue.message,
    reveal: go(fieldId(section.id, parts[3] ?? 'title'), [section.id]),
  };
}

export function SaveIndicator({
  autosave,
  onShowContent,
}: {
  autosave: Autosave;
  onShowContent: () => void;
}) {
  const { status } = autosave;
  const [open, setOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const doc = useEditorStore((s) => s.doc);

  let content;
  switch (status.kind) {
    case 'saved':
      content = (
        <span
          className="text-muted"
          title={status.at ? `Saved at ${status.at.toLocaleTimeString()}` : undefined}
        >
          Saved
        </span>
      );
      break;
    case 'pending':
      content = <span className="text-muted">Unsaved changes</span>;
      break;
    case 'saving':
      content = (
        <span className="inline-flex items-center gap-1.5 text-muted">
          <Spinner size={12} /> Saving…
        </span>
      );
      break;
    case 'invalid':
      content = (
        <button
          type="button"
          className="font-medium text-danger underline underline-offset-2"
          onClick={() => setOpen(true)}
        >
          Not saved: fix {status.issues.length} {status.issues.length === 1 ? 'issue' : 'issues'}
        </button>
      );
      break;
    case 'error':
      content = (
        <span className="inline-flex items-center gap-2 text-danger">
          {status.message}
          <button type="button" className="underline" onClick={() => void autosave.flush()}>
            Retry
          </button>
        </span>
      );
      break;
    case 'conflict':
      content = (
        <button
          type="button"
          className="font-medium text-danger underline underline-offset-2"
          onClick={() => setOpen(true)}
        >
          Changed elsewhere: choose a version
        </button>
      );
      break;
  }

  const issues =
    status.kind === 'invalid' && doc
      ? status.issues.map((i) => resolveIssue(i, doc, onShowContent))
      : [];
  const resolve = async (action: () => Promise<void>) => {
    setResolving(true);
    try {
      await action();
      setOpen(false);
    } finally {
      setResolving(false);
    }
  };

  return (
    <>
      <div
        className="text-sm"
        role={
          status.kind === 'invalid' || status.kind === 'error' || status.kind === 'conflict'
            ? 'alert'
            : undefined
        }
      >
        {content}
      </div>
      <Dialog
        open={open && status.kind === 'invalid'}
        onClose={() => setOpen(false)}
        title="Fix these to keep saving"
        description="Your last valid version is saved. These fields need attention before new changes can be saved."
        size="md"
      >
        <ul className="max-h-80 space-y-2 overflow-auto">
          {issues.map((issue, index) => (
            <li key={index}>
              <button
                type="button"
                className="w-full rounded-md border border-line p-2 text-left text-sm hover:bg-surface-2"
                onClick={() => {
                  setOpen(false);
                  issue.reveal();
                }}
              >
                <span className="block font-medium">{issue.where}</span>
                <span className="block text-danger">{issue.message}</span>
              </button>
            </li>
          ))}
        </ul>
      </Dialog>
      <Dialog
        open={open && status.kind === 'conflict'}
        onClose={() => setOpen(false)}
        title="This resume changed in another tab"
        description="Someone (probably you, in another tab or device) saved a newer version. Choose which one to keep."
        footer={
          <>
            <Button busy={resolving} onClick={() => void resolve(autosave.reloadLatest)}>
              Load the newer version
            </Button>
            <Button
              variant="primary"
              busy={resolving}
              onClick={() => void resolve(autosave.overwrite)}
            >
              Keep my changes
            </Button>
          </>
        }
      />
    </>
  );
}
