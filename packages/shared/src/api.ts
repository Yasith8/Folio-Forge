import { z } from 'zod';
import { emailField, requiredText, text } from './fields';
import { resumeContentSchema, type ResumeContent } from './resume';
import { resumeThemeSchema, type ResumeTheme, type TemplateId } from './theme';

/* ------------------------------------------------------------------ */
/* Auth                                                               */
/* ------------------------------------------------------------------ */

export const usernameSchema = z
  .string()
  .min(3, 'Use at least 3 characters')
  .max(30, 'Use 30 characters or fewer')
  .regex(
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
    'Use lowercase letters, numbers and hyphens, starting and ending with a letter or number',
  );

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(128, 'Use 128 characters or fewer');

export const signupInputSchema = z.object({
  displayName: requiredText(80, 'Add your name', 'Name'),
  email: emailField.refine((v) => v.length > 0, 'Add your email'),
  username: usernameSchema,
  password: passwordSchema,
});

export const loginInputSchema = z.object({
  email: emailField.refine((v) => v.length > 0, 'Add your email'),
  password: z.string().min(1, 'Add your password').max(128),
});

export type SignupInput = z.infer<typeof signupInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;

/* ------------------------------------------------------------------ */
/* Resumes                                                            */
/* ------------------------------------------------------------------ */

export const resumeTitleSchema = requiredText(80, 'Give this resume a name', 'Resume name');

export const createResumeInputSchema = z.object({ title: resumeTitleSchema });

export const updateResumeInputSchema = z.object({
  title: resumeTitleSchema,
  content: resumeContentSchema,
  theme: resumeThemeSchema,
  /** The revision the client last saw. Saves are rejected if someone else saved in between. */
  revision: z.number().int().positive(),
});

export const createVersionInputSchema = z.object({ label: text(80, 'Label').optional() });

export const publishInputSchema = z.object({ isPublic: z.boolean() });

export const importResumeInputSchema = z.object({
  title: resumeTitleSchema.optional(),
  data: z.unknown(),
});

export type CreateResumeInput = z.infer<typeof createResumeInputSchema>;
export type UpdateResumeInput = z.infer<typeof updateResumeInputSchema>;
export type CreateVersionInput = z.infer<typeof createVersionInputSchema>;
export type PublishInput = z.infer<typeof publishInputSchema>;
export type ImportResumeInput = z.infer<typeof importResumeInputSchema>;

/* ------------------------------------------------------------------ */
/* Response shapes                                                    */
/* ------------------------------------------------------------------ */

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
}

export interface ResumeSummary {
  id: string;
  title: string;
  template: TemplateId;
  isPublic: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeDto {
  id: string;
  title: string;
  content: ResumeContent;
  theme: ResumeTheme;
  isPublic: boolean;
  viewCount: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeVersionDto {
  id: string;
  label: string;
  createdAt: string;
}

export interface ImportResumeResponse {
  resume: ResumeDto;
  warnings: string[];
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: ValidationIssue[];
  };
}

export function formatZodIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }));
}
