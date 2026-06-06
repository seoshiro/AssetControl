import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, FileText, ShieldCheck, Pulse } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { ErrorState, RoleBadge } from '../components/ui';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const signIn = async (user = username, pass = password) => {
    setError('');
    setLoading(true);
    try {
      await login(user, pass);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  };

  const demo = [
    { username: 'admin', role: 'ADMIN' },
    { username: 'manager', role: 'MANAGER' },
    { username: 'inventory_manager', role: 'INVENTORY_MANAGER' },
    { username: 'repair_coordinator', role: 'REPAIR_COORDINATOR' },
    { username: 'employee', role: 'EMPLOYEE' },
    { username: 'auditor', role: 'AUDITOR' },
    { username: 'viewer', role: 'VIEWER' },
  ];

  return (
    <div className="grid min-h-screen grid-cols-1 bg-surface-50 text-surface-950 xl:grid-cols-[minmax(0,1fr)_520px]">
      <section className="flex min-w-0 flex-col justify-between p-8 xl:p-16">
        <div className="flex items-center gap-3">
          <div>
            <div className="font-display text-2xl font-semibold">AssetControl</div>
            <p className="text-xs uppercase tracking-[0.18em] text-surface-500">enterprise equipment registry</p>
          </div>
        </div>

        <div className="max-w-3xl py-12">
          <p className="section-title mb-4">internal operations system</p>
          <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight text-surface-950 xl:text-6xl">
            Учёт и контроль оборудования предприятия
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-surface-600">
            Dashboard, выдачи, ремонты, инвентаризация, audit log, уведомления и отчёты в одном локальном MVP для защиты диплома.
          </p>
          <div className="mt-8 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ['RBAC', 'контроль ролей', ShieldCheck],
              ['Audit', 'история действий', FileText],
              ['Assets', 'баланс и движение', Archive],
            ].map(([title, desc, Icon]) => (
              <div key={title as string} className="rounded-lg border border-surface-200 bg-surface-50 p-4 shadow-panel">
                <Icon className="mb-3 h-5 w-5 text-primary-700" weight="regular" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-800">{title as string}</p>
                <p className="mt-1 text-xs text-surface-500">{desc as string}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-surface-500">
          <Pulse className="h-4 w-4 text-primary-700" weight="regular" />
          Локальная демонстрация: frontend 6347, API 5847
        </div>
      </section>

      <aside className="flex items-center border-l border-surface-200 bg-surface-100 p-6 xl:p-10">
        <div className="w-full rounded-xl border border-surface-200 bg-surface-50 p-6 shadow-raised">
          <p className="section-title mb-3">secure access</p>
          <h2 className="text-2xl font-extrabold">Вход в систему</h2>
          <p className="mt-2 text-sm text-surface-500">Demo-доступ для комиссии и проверки ролей.</p>
          <form onSubmit={(e) => { e.preventDefault(); signIn(); }} className="space-y-4 mt-6">
            {error && <ErrorState message={error} />}
            <label className="block"><span className="label">Логин</span><input className="input" value={username} onChange={(e) => setUsername(e.target.value)} /></label>
            <label className="block"><span className="label">Пароль</span><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            <button className="btn-primary w-full" disabled={loading}>{loading ? 'Вход...' : 'Войти'}</button>
          </form>
          <div className="mt-6">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-surface-500">Быстрый вход</p>
            <div className="grid grid-cols-2 gap-2">
              {demo.map((account) => (
                <button key={account.username} className="btn-secondary justify-between" onClick={() => signIn(account.username, 'password123')}>
                  <span className="truncate">{account.username}</span>
                  <RoleBadge role={account.role} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
