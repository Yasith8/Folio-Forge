import type { ResumeDto } from '@folioforge/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Icon } from '../components/ui/Icon';
import { toast } from '../components/ui/Toaster';
import { api, ApiError, queryKeys } from '../lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  resume: Pick<ResumeDto, 'id' | 'isPublic' | 'viewCount'>;
  username: string;
  flush: () => Promise<boolean>;
}

export function PublishDialog({ open, onClose, resume, username, flush }: Props) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/u/${username}`;

  const toggle = useMutation({
    mutationFn: async (isPublic: boolean) => {
      if (isPublic && !(await flush()))
        throw new Error('Fix the issues shown in the editor before publishing.');
      return api.setPublic(resume.id, isPublic);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.resume(resume.id), updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.resumes });
      toast.success(
        updated.isPublic ? `Published at /u/${username}.` : 'Your portfolio page is now private.',
      );
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError || error instanceof Error ? error.message : 'Could not update.',
      ),
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      toast.error('Copy failed. Select the link and copy it manually.');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={resume.isPublic ? 'Your portfolio is public' : 'Publish as a portfolio page'}
      description={
        resume.isPublic
          ? 'Anyone with the link can see this resume as a web page. Edits appear there as soon as they are saved.'
          : 'This resume becomes a public web page with project cards and your links. Only one resume can be public: publishing this one makes any other private.'
      }
      size="md"
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          {resume.isPublic ? (
            <Button variant="danger" busy={toggle.isPending} onClick={() => toggle.mutate(false)}>
              Make private
            </Button>
          ) : (
            <Button variant="primary" busy={toggle.isPending} onClick={() => toggle.mutate(true)}>
              Publish
            </Button>
          )}
        </>
      }
    >
      <div className="rounded-md border border-line bg-surface-2 p-3">
        <p className="text-xs text-muted">Your link</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate text-sm">{url}</code>
          {resume.isPublic && (
            <>
              <Button size="sm" icon={<Icon name="copy" size={16} />} onClick={() => void copy()}>
                {copied ? 'Copied' : 'Copy link'}
              </Button>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-accent underline underline-offset-2"
              >
                Open <Icon name="external" size={14} />
              </a>
            </>
          )}
        </div>
        {resume.isPublic && (
          <p className="mt-2 text-sm text-muted">
            {resume.viewCount} {resume.viewCount === 1 ? 'view' : 'views'} so far (your own visits
            are not counted).
          </p>
        )}
      </div>
    </Dialog>
  );
}
