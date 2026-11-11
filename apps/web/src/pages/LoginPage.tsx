import { loginInputSchema, type LoginInput } from '@folioforge/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';
import { api, ApiError, queryKeys } from '../lib/api';
import { AuthLayout, FormError } from './AuthLayout';

const DEMO = { email: 'demo@folioforge.dev', password: 'demo-password-123' };

/** Only allow redirects to paths inside this app. */
function safeNext(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export function LoginPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [serverError, setServerError] = useState<string>();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(undefined);
    try {
      const user = await api.login(values);
      queryClient.setQueryData(queryKeys.me, user);
      navigate(safeNext(params.get('next')), { replace: true });
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Sign-in failed. Try again.');
    }
  });

  return (
    <AuthLayout
      title="Sign in"
      intro="Pick up where you left off."
      footer={
        <>
          New here?{' '}
          <Link to="/signup" className="font-medium text-accent underline underline-offset-2">
            Create an account
          </Link>
        </>
      }
    >
      <FormError message={serverError} />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <TextField
          id="login-email"
          label="Email"
          type="email"
          autoComplete="email"
          registration={register('email')}
          error={errors.email?.message}
        />
        <TextField
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          registration={register('password')}
          error={errors.password?.message}
        />
        <Button type="submit" variant="primary" className="w-full" busy={isSubmitting}>
          Sign in
        </Button>
      </form>
      <div className="mt-4 rounded-md bg-surface-2 p-3 text-sm">
        <p className="text-muted">
          Exploring? Use the demo account:{' '}
          <span className="font-medium text-ink">{DEMO.email}</span> /{' '}
          <span className="font-medium text-ink">{DEMO.password}</span>
        </p>
        <Button
          size="sm"
          className="mt-2"
          onClick={() => {
            setValue('email', DEMO.email, { shouldValidate: true });
            setValue('password', DEMO.password, { shouldValidate: true });
          }}
        >
          Fill in demo login
        </Button>
      </div>
    </AuthLayout>
  );
}
