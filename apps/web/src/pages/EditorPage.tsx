import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ColorSchemeToggle } from '../components/AppHeader';
import { Button, buttonClasses, IconButton } from '../components/ui/Button';
import { inputClasses } from '../components/ui/Field';
import { Icon } from '../components/ui/Icon';
import { FullPageSpinner } from '../components/ui/Spinner';
import { toast } from '../components/ui/Toaster';
import { editorActions } from '../editor/actions';
import { ContentPanel } from '../editor/ContentPanel';
import { DesignPanel } from '../editor/DesignPanel';
import { HistoryPanel } from '../editor/HistoryPanel';
import { ResumePreview } from '../editor/Preview';
import { PublishDialog } from '../editor/PublishDialog';
import { SaveIndicator } from '../editor/SaveIndicator';
import { selectCanRedo, selectCanUndo, useEditorStore } from '../editor/store';
import { useEditorUi } from '../editor/uiStore';
import { useAutosave } from '../editor/useAutosave';
import { useCurrentUser } from '../hooks/useAuth';
import { api, ApiError, queryKeys } from '../lib/api';
import { saveBlob } from '../lib/download';

type Tab = 'content' | 'design' | 'history';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'content', label: 'Content' },
  { id: 'design', label: 'Design' },
  { id: 'history', label: 'History' },
];

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** Ctrl/⌘+Z and Ctrl/⌘+Shift+Z (or Ctrl+Y) drive the editor-wide undo stack. Focus returns to the same field afterwards. */
function useUndoShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const mod = isMac ? event.metaKey : event.ctrlKey;
      if (!mod || event.altKey) return;
      const key = event.key.toLowerCase();
      const isUndo = key === 'z' && !event.shiftKey;
      const isRedo = (key === 'z' && event.shiftKey) || (key === 'y' && !isMac);
      if (!isUndo && !isRedo) return;
      if (document.querySelector('dialog[open]')) return;
      event.preventDefault();
      const focusedId = (document.activeElement as HTMLElement | null)?.id;
      const store = useEditorStore.getState();
      if (isUndo) store.undo();
      else store.redo();
      if (focusedId) requestAnimationFrame(() => document.getElementById(focusedId)?.focus());
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

function UndoRedo() {
  const canUndo = useEditorStore(selectCanUndo);
  const canRedo = useEditorStore(selectCanRedo);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const mod = isMac ? '⌘' : 'Ctrl+';
  return (
    <div className="flex">
      <IconButton label={`Undo (${mod}Z)`} disabled={!canUndo} onClick={undo}>
        <Icon name="undo" />
      </IconButton>
      <IconButton label={`Redo (${mod}${isMac ? '⇧Z' : 'Y'})`} disabled={!canRedo} onClick={redo}>
        <Icon name="redo" />
      </IconButton>
    </div>
  );
}

function EditorTabs({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  const refs = useRef<Record<Tab, HTMLButtonElement | null>>({
    content: null,
    design: null,
    history: null,
  });
  // Arrow keys move between tabs (WAI-ARIA tabs pattern).
  const onKeyDown = (event: KeyboardEvent) => {
    const index = TABS.findIndex((t) => t.id === tab);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    else return;
    event.preventDefault();
    const id = TABS[next]!.id;
    onChange(id);
    refs.current[id]?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label="Editor panels"
      className="flex gap-1 border-b border-line px-4"
      onKeyDown={onKeyDown}
    >
      {TABS.map((t) => (
        <button
          key={t.id}
          ref={(el) => {
            refs.current[t.id] = el;
          }}
          role="tab"
          type="button"
          id={`tab-${t.id}`}
          aria-selected={tab === t.id}
          aria-controls={`tabpanel-${t.id}`}
          tabIndex={tab === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium ${tab === t.id ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function Editor({ resumeId }: { resumeId: string }) {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const doc = useEditorStore((s) => s.doc);
  const serverResume = queryClient.getQueryData<{ isPublic: boolean; viewCount: number }>(
    queryKeys.resume(resumeId),
  );
  const autosave = useAutosave();
  const [tab, setTab] = useState<Tab>('content');
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');
  const [publishOpen, setPublishOpen] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'json' | null>(null);
  useUndoShortcuts();
  // Re-read publish state whenever the cached resume changes (publish dialog updates it).
  const resumeQuery = useQuery({
    queryKey: queryKeys.resume(resumeId),
    queryFn: () => api.getResume(resumeId),
    enabled: false,
    initialData: serverResume as never,
  });

  if (!doc) return null;
  const titleInvalid = !doc.title.trim();

  const exportFile = async (kind: 'pdf' | 'json') => {
    setExporting(kind);
    try {
      if (!(await autosave.flush())) {
        toast.error(
          'Fix the issues listed next to “Not saved” first, so the export has your latest changes.',
        );
        return;
      }
      const file =
        kind === 'pdf' ? await api.downloadPdf(resumeId) : await api.downloadJson(resumeId);
      saveBlob(file.blob, file.filename);
      toast.success(kind === 'pdf' ? 'PDF downloaded.' : 'JSON Resume file downloaded.');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Export failed. Try again.');
    } finally {
      setExporting(null);
    }
  };

  const isPublic = resumeQuery.data?.isPublic ?? false;

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-line bg-surface">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 lg:flex-nowrap">
          <Link to="/" className={buttonClasses('ghost', 'sm')} aria-label="Back to your resumes">
            <Icon name="arrowLeft" />
            <span className="hidden sm:inline">Resumes</span>
          </Link>
          <div className="min-w-40 flex-1">
            <h1 className="sr-only">Editing {doc.title || 'resume'}</h1>
            <label htmlFor="resume-title" className="sr-only">
              Resume name
            </label>
            <input
              id="resume-title"
              value={doc.title}
              maxLength={80}
              onChange={(event) => editorActions.setTitle(event.target.value)}
              aria-invalid={titleInvalid || undefined}
              className={inputClasses(
                titleInvalid,
                'h-9 max-w-sm border-transparent bg-transparent font-display text-lg font-semibold shadow-none hover:border-line',
              )}
            />
          </div>
          <SaveIndicator
            autosave={autosave}
            onShowContent={() => {
              setTab('content');
              setMobileView('edit');
            }}
          />
          <UndoRedo />
          <Button
            size="sm"
            busy={exporting === 'json'}
            icon={<Icon name="file" size={16} />}
            onClick={() => void exportFile('json')}
          >
            <span className="hidden sm:inline">JSON</span>
            <span className="sr-only sm:hidden">Export JSON</span>
          </Button>
          <Button
            size="sm"
            icon={<Icon name="globe" size={16} />}
            onClick={() => setPublishOpen(true)}
          >
            {isPublic ? 'Published' : 'Publish'}
          </Button>
          <Button
            size="sm"
            variant="primary"
            busy={exporting === 'pdf'}
            icon={<Icon name="download" size={16} />}
            onClick={() => void exportFile('pdf')}
          >
            Download PDF
          </Button>
          <ColorSchemeToggle />
        </div>
        {/* On small screens, editing and the preview share the screen as two tabs. */}
        <div className="flex border-t border-line lg:hidden" role="group" aria-label="View">
          {(['edit', 'preview'] as const).map((view) => (
            <button
              key={view}
              type="button"
              aria-pressed={mobileView === view}
              onClick={() => setMobileView(view)}
              className={`flex-1 py-2 text-sm font-medium ${mobileView === view ? 'bg-accent-soft text-accent' : 'text-muted'}`}
            >
              {view === 'edit' ? 'Edit' : 'Preview'}
            </button>
          ))}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main
          id="main"
          className={`${mobileView === 'edit' ? 'flex' : 'hidden'} min-h-0 w-full flex-col border-r border-line bg-surface lg:flex lg:w-[min(560px,46%)]`}
        >
          <EditorTabs tab={tab} onChange={setTab} />
          <div
            id={`tabpanel-${tab}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            className="min-h-0 flex-1 overflow-y-auto p-4"
          >
            {tab === 'content' && <ContentPanel />}
            {tab === 'design' && <DesignPanel />}
            {tab === 'history' && <HistoryPanel resumeId={resumeId} flush={autosave.flush} />}
          </div>
        </main>
        <section
          aria-label="Live preview"
          className={`${mobileView === 'preview' ? 'block' : 'hidden'} workbench min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:block`}
        >
          <ResumePreview content={doc.content} theme={doc.theme} />
        </section>
      </div>

      {user && resumeQuery.data && (
        <PublishDialog
          open={publishOpen}
          onClose={() => setPublishOpen(false)}
          resume={{
            id: resumeId,
            isPublic: resumeQuery.data.isPublic,
            viewCount: resumeQuery.data.viewCount,
          }}
          username={user.username}
          flush={autosave.flush}
        />
      )}
    </div>
  );
}

export default function EditorPage() {
  const { id = '' } = useParams();
  const loadedId = useEditorStore((s) => s.resumeId);
  const query = useQuery({
    queryKey: queryKeys.resume(id),
    queryFn: () => api.getResume(id),
    // The editor store owns the document while editing; never refetch over it.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.data && useEditorStore.getState().resumeId !== id) {
      useEditorUi.getState().reset();
      useEditorStore.getState().load(query.data);
    }
  }, [id, query.data]);

  useEffect(() => {
    document.title = query.data ? `${query.data.title} – FolioForge` : 'FolioForge';
    return () => {
      document.title = 'FolioForge';
    };
  }, [query.data]);

  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <main id="main" className="grid h-full place-items-center p-8 text-center">
        <div>
          <h1 data-route-focus tabIndex={-1} className="font-display text-2xl font-semibold">
            {notFound ? 'Resume not found' : 'This resume could not be loaded'}
          </h1>
          <p className="mt-2 text-muted">
            {notFound ? 'It may have been deleted.' : 'Check your connection and try again.'}
          </p>
          <Link to="/" className={buttonClasses('primary', 'md', 'mt-6')}>
            Back to your resumes
          </Link>
        </div>
      </main>
    );
  }
  if (!query.data || loadedId !== id) return <FullPageSpinner label="Opening resume" />;
  return <Editor resumeId={id} />;
}
