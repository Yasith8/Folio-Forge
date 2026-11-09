import { signupInputSchema, type SignupInput } from '@folioforge/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';
import { api, ApiError, queryKeys } from '../lib/api';
import { AuthLayout, FormError } from './AuthLayout';

export function SignupPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupInputSchema),
    defaultValues: { displayName: '', email: '', username: '', password: '' },
  });
  const username = watch('username');

  const onSubmit = handleSubmit(async (values) => {
    setServerError(undefined);
    try {
      const user = await api.signup({ ...values, username: values.username.toLowerCase() });
      queryClient.setQueryData(queryKeys.me, user);
      navigate('/', { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.details.length) {
        // Field errors from the server (e.g. "username taken") go next to the field.
        let focused = false;
        for (const issue of error.details) {
          if (issue.path in values) {
            setError(
              issue.path as keyof SignupInput,
              { message: issue.message },
              { shouldFocus: !focused },
            );
            focused = true;
          }
        }
        if (!focused) setServerError(error.message);
      } else {
        setServerError(error instanceof ApiError ? error.message : 'Sign-up failed. Try again.');
      }
    }
  });

  return (
    <AuthLayout
      title="Create your account"
      intro="Your resumes stay private until you choose to publish one."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent underline underline-offset-2">
            Sign in
          </Link>
        </>
      }
    >
      <FormError message={serverError} />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <TextField
          id="signup-name"
          label="Full name"
          autoComplete="name"
          registration={register('displayName')}
          error={errors.displayName?.message}
        />
        <TextField
          id="signup-email"
          label="Email"
          type="email"
          autoComplete="email"
          registration={register('email')}
          error={errors.email?.message}
        />
        <TextField
          id="signup-username"
          label="Username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          hint={`Your public page will be at /u/${username || 'username'}`}
          registration={register('username', { setValueAs: (v: string) => v.trim().toLowerCase() })}
          error={errors.username?.message}
        />
        <TextField
          id="signup-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          registration={register('password')}
          error={errors.password?.message}
        />
        <Button type="submit" variant="primary" className="w-full" busy={isSubmitting}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
