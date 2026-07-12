import {FormEvent, ReactNode, useEffect, useState} from 'react';
import {LockKeyhole} from 'lucide-react';
import {bootstrapModelServices} from '../modelService';

type AuthStatus = {
  enabled: boolean;
  authenticated: boolean;
};

export default function AuthGate({children}: {children: ReactNode}) {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/backend/api/v1/auth/status', {credentials: 'include'})
      .then(async response => {
        if (!response.ok) throw new Error('认证服务不可用');
        return response.json() as Promise<AuthStatus>;
      })
      .then(async nextStatus => {
        if (!nextStatus.enabled || nextStatus.authenticated) await bootstrapModelServices();
        setStatus(nextStatus);
      })
      .catch(() => setStatus({enabled: false, authenticated: true}));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/backend/api/v1/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({password}),
      });
      if (!response.ok) throw new Error('密码错误，请重试');
      await bootstrapModelServices();
      setStatus({enabled: true, authenticated: true});
      setPassword('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '登录失败');
    } finally {
      setSubmitting(false);
    }
  }

  if (!status) {
    return <div className="flex min-h-screen items-center justify-center bg-[#212121] text-sm text-zinc-400">正在连接…</div>;
  }

  if (!status.enabled || status.authenticated) return children;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#171717] px-6 text-zinc-100">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#212121] p-7 shadow-2xl">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-zinc-900">
          <LockKeyhole size={20} />
        </div>
        <h1 className="font-display text-2xl font-semibold">登录 Aura</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">输入部署管理员设置的访问密码。</p>
        <label className="mt-6 block text-sm text-zinc-300" htmlFor="aura-password">访问密码</label>
        <input
          id="aura-password"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          className="mt-2 w-full rounded-xl border border-white/10 bg-[#171717] px-4 py-3 outline-none transition focus:border-white/30"
          required
        />
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-5 w-full rounded-xl bg-white px-4 py-3 font-medium text-zinc-900 transition hover:bg-zinc-200 disabled:cursor-wait disabled:opacity-60"
        >
          {submitting ? '正在登录…' : '登录'}
        </button>
      </form>
    </main>
  );
}
