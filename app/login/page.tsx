import { Suspense } from 'react';
import LoginForm from '@/components/LoginForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Log ind' };

export default function LoginSide() {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-grafit-900">Log ind</h1>
      <p className="mt-1 text-grafit-600">For at melde, bekræfte og kommentere.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
