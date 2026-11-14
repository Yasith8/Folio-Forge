import {
  createResumeInputSchema,
  TEMPLATES,
  type CreateResumeInput,
  type ResumeSummary,
} from '@folioforge/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { Button, buttonClasses } from '../components/ui/Button';
import { ConfirmDialog, Dialog } from '../components/ui/Dialog';
import { TextField } from '../components/ui/Field';
import { Icon } from '../components/ui/Icon';
import { FullPageSpinner } from '../components/ui/Spinner';
import { toast } from '../components/ui/Toaster';
import { useCurrentUser } from '../hooks/useAuth';
import { api, ApiError, queryKeys } from '../lib/api';
import { saveBlob } from '../lib/download';
import { timeAgo } from '../lib/format';

const errorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Something went wrong. Try again.';

function NewResumeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateResumeInput>({
    resolver: zodResolver(createResumeInputSchema),
    defaultValues: { title: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const resume = await api.createResume(values);
      await queryClient.invalidateQueries({ queryKey: queryKeys.resumes });
      reset();
      onClose();
      navigate(`/resumes/${resume.id}`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New resume"
      description="Name it after the roles you will send it to."
    >
      <form onSubmit={onSubmit} noValidate>
        <TextField
          id="new-resume-title"
          label="Resume name"
          placeholder="Frontend roles"
          autoFocus
          registration={register('title')}
          error={errors.title?.message}
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" busy={isSubmitting}>
            Create resume
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ResumeCard({
  resume,
  username,
  onDelete,
}: {
  resume: ResumeSummary;
  username: string;
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const duplicate = useMutation({
    mutationFn: () => api.duplicateResume(resume.id),
    onSuccess: (copy) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.resumes });
      toast.success(`Created “${copy.title}”.`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const exportJson = useMutation({
    mutationFn: () => api.downloadJson(resume.id),
    onSuccess: ({ blob, filename }) => saveBlob(blob, filename),
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <li className="flex flex-col rounded-lg border border-line bg-surface p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-lg leading-snug font-semibold">
          <Link to={`/resumes/${resume.id}`} className="hover:underline focus-visible:underline">
            {resume.title}
          </Link>
        </h2>
        {resume.isPublic && (
          <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
            Public
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">
        {TEMPLATES[resume.template].label} template, edited {timeAgo(resume.updatedAt)}
      </p>
      {resume.isPublic && (
        <p className="mt-2 text-sm">
          <a
            href={`/u/${username}`}
            target="_blank"
            rel="noreferrer"
            className="text-accent underline underline-offset-2"
          >
            /u/{username}
          </a>
          <span className="text-muted">
            {' '}
            ({resume.viewCount} {resume.viewCount === 1 ? 'view' : 'views'})
          </span>
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2 pt-1">
        <Link to={`/resumes/${resume.id}`} className={buttonClasses('primary', 'sm')}>
          Edit
        </Link>
        <Button
          size="sm"
          busy={duplicate.isPending}
          onClick={() => duplicate.mutate()}
          aria-label={`Duplicate ${resume.title}`}
        >
          Duplicate
        </Button>
        <Button
          size="sm"
          busy={exportJson.isPending}
          onClick={() => exportJson.mutate()}
          aria-label={`Download ${resume.title} as JSON Resume`}
        >
          JSON
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-danger"
          onClick={onDelete}
          aria-label={`Delete ${resume.title}`}
        >
          Delete
        </Button>
      </div>
    </li>
  );
}

export function DashboardPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const {
    data: resumes,
    isPending,
    isError,
    refetch,
  } = useQuery({ queryKey: queryKeys.resumes, queryFn: api.listResumes });
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<ResumeSummary | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteResume(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.resumes });
      toast.success(`Deleted “${toDelete?.title}”.`);
      setToDelete(null);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const importJson = useMutation({
    mutationFn: async (file: File) => {
      let data: unknown;
      try {
        data = JSON.parse(await file.text());
      } catch {
        throw new Error('That file is not valid JSON. Choose a JSON Resume (.json) file.');
      }
      return api.importResume(data);
    },
    onSuccess: ({ resume, warnings }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.resumes });
      toast.success(
        warnings.length
          ? `Imported “${resume.title}” with ${warnings.length} adjustment${warnings.length === 1 ? '' : 's'}: ${warnings[0]}`
          : `Imported “${resume.title}”.`,
      );
      navigate(`/resumes/${resume.id}`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : errorMessage(error)),
  });

  return (
    <div className="min-h-full">
      <AppHeader />
      <main id="main" className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1
              data-route-focus
              tabIndex={-1}
              className="font-display text-3xl font-semibold focus:outline-none"
            >
              Your resumes
            </h1>
            <p className="mt-1 text-muted">
              Keep one per kind of role, and publish one as your portfolio.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) importJson.mutate(file);
                event.target.value = '';
              }}
            />
            <Button
              icon={<Icon name="upload" />}
              busy={importJson.isPending}
              onClick={() => fileInput.current?.click()}
            >
              Import JSON Resume
            </Button>
            <Button variant="primary" icon={<Icon name="plus" />} onClick={() => setCreating(true)}>
              New resume
            </Button>
          </div>
        </div>

        <div className="mt-8">
          {isPending && <FullPageSpinner label="Loading resumes" />}
          {isError && (
            <div
              role="alert"
              className="rounded-md border border-danger bg-danger-soft p-4 text-sm text-danger"
            >
              Your resumes could not be loaded.{' '}
              <button type="button" className="underline" onClick={() => void refetch()}>
                Try again
              </button>
            </div>
          )}
          {resumes && resumes.length === 0 && (
            <div className="rounded-lg border border-dashed border-line bg-surface p-10 text-center">
              <h2 className="font-display text-xl font-semibold">Start your first resume</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Create one from scratch, or import a JSON Resume file from another tool.
              </p>
              <Button variant="primary" className="mt-5" onClick={() => setCreating(true)}>
                New resume
              </Button>
            </div>
          )}
          {resumes && resumes.length > 0 && user && (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resumes.map((resume) => (
                <ResumeCard
                  key={resume.id}
                  resume={resume}
                  username={user.username}
                  onDelete={() => setToDelete(resume)}
                />
              ))}
            </ul>
          )}
        </div>
      </main>

      <NewResumeDialog open={creating} onClose={() => setCreating(false)} />
      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete “${toDelete?.title ?? ''}”?`}
        description="The resume and its saved versions will be removed. This cannot be undone."
        confirmLabel="Delete resume"
        destructive
        busy={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </div>
  );
}
