import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ContentCard, PageContainer, PageHeader, TablePanel } from '../components/PageLayout';
import { EmptyState, ErrorState, SearchInput } from '../components/ui';

interface Employee {
  id: number;
  fullName: string;
  department: string | { name: string };
  position: string;
  equipment?: unknown[];
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const { canManage } = useAuth();
  const navigate = useNavigate();

  const fetchEmployees = () => {
    api
      .get('/employees')
      .then((res) => setEmployees(res.data.data || res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить сотрудника?')) return;
    try {
      setError('');
      await api.delete(`/employees/${id}`);
      fetchEmployees();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка удаления');
    }
  };

  const filtered = employees.filter((emp) =>
    emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (typeof emp.department === 'string' ? emp.department : emp.department?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    emp.position.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <PageContainer><div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600" />
      </div></PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Сотрудники"
        actions={canManage && (
          <Link to="/employees/new" className="btn-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Добавить
          </Link>
        )}
      />

      {error && <ErrorState message={error} />}

      <ContentCard className="max-w-2xl">
        <SearchInput placeholder="Поиск по ФИО, отделу, должности..." value={search} onChange={setSearch} />
      </ContentCard>

      <TablePanel>
        <table className="table min-w-[760px] table-fixed">
          <thead>
            <tr>
              <th>ФИО</th>
              <th>Отдел</th>
              <th>Должность</th>
              {canManage && <th className="text-right">Действия</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 4 : 3} className="p-6">
                  <EmptyState title="Сотрудники не найдены" description="Попробуйте изменить поисковый запрос." />
                </td>
              </tr>
            ) : (
              filtered.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="icon-tile flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                        {emp.fullName.charAt(0)}
                      </div>
                      <span className="truncate font-medium text-surface-900">{emp.fullName}</span>
                    </div>
                  </td>
                  <td><span className="block truncate">{typeof emp.department === 'string' ? emp.department : emp.department?.name}</span></td>
                  <td><span className="block truncate">{emp.position}</span></td>
                  {canManage && (
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/employees/${emp.id}/edit`)}
                          className="rounded-md p-1 text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-950"
                          title="Редактировать"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id)}
                          className="rounded-md p-1 text-surface-500 transition-colors hover:bg-surface-100 hover:text-[var(--status-danger-text)]"
                          title="Удалить"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TablePanel>
    </PageContainer>
  );
}
