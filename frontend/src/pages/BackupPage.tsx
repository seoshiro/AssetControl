import { useState } from 'react';
import api from '../api/axios';
import { PageContainer, PageHeader } from '../components/PageLayout';
import { ErrorState } from '../components/ui';

export default function BackupPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleDownload = async () => {
    try {
      const response = await api.get('/backup/download', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup_${new Date().toISOString().split('T')[0]}.sql`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      alert('Ошибка при скачивании бэкапа');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    if (!confirm('ВНИМАНИЕ! Текущая база данных будет перезаписана данными из файла. Продолжить?')) {
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/backup/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(res.data.message || 'Восстановление прошло успешно!');
      setFile(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка при восстановлении базы данных');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader title="Резервное копирование" description="Административный экспорт и восстановление базы данных." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export card */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-tile icon-tile-md">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-surface-950">Создать копию</h2>
          </div>
          <p className="text-surface-600 mb-6 text-sm">
            Скачайте полную копию базы данных в формате SQL. Она содержит структуру всех таблиц и текущие данные.
          </p>
          <button onClick={handleDownload} className="btn-primary w-full justify-center">
            Скачать бэкап (.sql)
          </button>
        </div>

        {/* Import card */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-tile icon-tile-md">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-surface-950">Восстановить</h2>
          </div>
          <p className="text-surface-600 mb-4 text-sm">
            Загрузите файл .sql для восстановления. ВНИМАНИЕ: Текущие данные будут перезаписаны!
          </p>

          <form onSubmit={handleUpload}>
            <input
              type="file"
              accept=".sql"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              className="mb-4 block w-full text-sm text-surface-500 file:mr-4 file:rounded-md file:border file:border-surface-200 file:bg-surface-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-800 hover:file:bg-surface-100"
              required
            />

            {error && <div className="mb-3"><ErrorState message={error} /></div>}
            {message && <p className="text-green-700 text-sm mb-3">{message}</p>}

            <button
              type="submit"
              disabled={!file || loading}
              className="btn-secondary w-full justify-center disabled:opacity-50"
            >
              {loading ? 'Восстановление...' : 'Восстановить базу'}
            </button>
          </form>
        </div>
      </div>
    </PageContainer>
  );
}
