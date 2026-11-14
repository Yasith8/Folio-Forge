import type {
  ApiErrorBody,
  CreateResumeInput,
  ImportResumeResponse,
  LoginInput,
  PublicUser,
  ResumeDto,
  ResumeSummary,
  ResumeVersionDto,
  SignupInput,
  UpdateResumeInput,
  ValidationIssue,
} from '@folioforge/shared';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: ValidationIssue[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
  if (body?.error)
    return new ApiError(res.status, body.error.code, body.error.message, body.error.details);
  return new ApiError(
    res.status,
    'http_error',
    `The server answered with ${res.status}. Try again.`,
  );
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network_error', 'Could not reach the server. Check your connection.');
  }
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface DownloadedFile {
  blob: Blob;
  filename: string;
}

async function download(path: string, fallbackName: string): Promise<DownloadedFile> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { credentials: 'same-origin' });
  } catch {
    throw new ApiError(0, 'network_error', 'Could not reach the server. Check your connection.');
  }
  if (!res.ok) throw await toApiError(res);
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallbackName;
  return { blob: await res.blob(), filename };
}

export const api = {
  me: () => request<{ user: PublicUser }>('GET', '/auth/me').then((r) => r.user),
  login: (input: LoginInput) =>
    request<{ user: PublicUser }>('POST', '/auth/login', input).then((r) => r.user),
  signup: (input: SignupInput) =>
    request<{ user: PublicUser }>('POST', '/auth/signup', input).then((r) => r.user),
  logout: () => request<void>('POST', '/auth/logout'),

  listResumes: () =>
    request<{ resumes: ResumeSummary[] }>('GET', '/resumes').then((r) => r.resumes),
  getResume: (id: string) =>
    request<{ resume: ResumeDto }>('GET', `/resumes/${id}`).then((r) => r.resume),
  createResume: (input: CreateResumeInput) =>
    request<{ resume: ResumeDto }>('POST', '/resumes', input).then((r) => r.resume),
  updateResume: (id: string, input: UpdateResumeInput) =>
    request<{ resume: ResumeDto }>('PUT', `/resumes/${id}`, input).then((r) => r.resume),
  deleteResume: (id: string) => request<void>('DELETE', `/resumes/${id}`),
  duplicateResume: (id: string) =>
    request<{ resume: ResumeDto }>('POST', `/resumes/${id}/duplicate`).then((r) => r.resume),
  setPublic: (id: string, isPublic: boolean) =>
    request<{ resume: ResumeDto }>('POST', `/resumes/${id}/publish`, { isPublic }).then(
      (r) => r.resume,
    ),
  importResume: (data: unknown, title?: string) =>
    request<ImportResumeResponse>('POST', '/resumes/import', { data, ...(title ? { title } : {}) }),

  listVersions: (id: string) =>
    request<{ versions: ResumeVersionDto[] }>('GET', `/resumes/${id}/versions`).then(
      (r) => r.versions,
    ),
  createVersion: (id: string, label?: string) =>
    request<{ version: ResumeVersionDto }>('POST', `/resumes/${id}/versions`, { label }).then(
      (r) => r.version,
    ),
  restoreVersion: (id: string, versionId: string) =>
    request<{ resume: ResumeDto }>('POST', `/resumes/${id}/versions/${versionId}/restore`).then(
      (r) => r.resume,
    ),

  downloadPdf: (id: string) => download(`/resumes/${id}/pdf`, 'resume.pdf'),
  downloadJson: (id: string) => download(`/resumes/${id}/export`, 'resume.json'),
};

export const queryKeys = {
  me: ['me'] as const,
  resumes: ['resumes'] as const,
  resume: (id: string) => ['resumes', id] as const,
  versions: (id: string) => ['resumes', id, 'versions'] as const,
};
