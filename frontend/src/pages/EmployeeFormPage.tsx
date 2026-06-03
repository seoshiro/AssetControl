import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { ContentCard, PageContainer, PageHeader } from '../components/PageLayout';
import { ErrorState } from '../components/ui';

export default function EmployeeFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    department: '',
    position: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      api.get(`/employees/${id}`).then((res) => {
        const data = res.data;
        setForm({
          fullName: data.fullName,
          department: data.department?.name || data.department,
          position: data.position,
          email: data.email || '',
          phone: data.phone || '',
        });
      });
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEdit) {
        await api.put(`/employees/${id}`, form);
      } else {
        await api.post('/employees', form);
      }
      navigate('/employees');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <PageContainer>
      <PageHeader title={isEdit ? 'Редактировать сотрудника' : 'Новый сотрудник'} description="Профиль сотрудника для закрепления оборудования и истории выдач." />

      <div className="max-w-2xl">
        <ContentCard>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <ErrorState message={error} />}

            <div>
              <label htmlFor="fullName" className="label">ФИО *</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                className="input"
                placeholder="Иванов Иван Иванович"
                value={form.fullName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="label">Email</label>
                <input id="email" name="email" type="email" className="input" value={form.email} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="phone" className="label">Телефон</label>
                <input id="phone" name="phone" type="text" className="input" value={form.phone} onChange={handleChange} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="department" className="label">Отдел *</label>
                <input
                  id="department"
                  name="department"
                  type="text"
                  className="input"
                  placeholder="IT отдел"
                  value={form.department}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="position" className="label">Должность *</label>
                <input
                  id="position"
                  name="position"
                  type="text"
                  className="input"
                  placeholder="Разработчик"
                  value={form.position}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/employees')}
                className="btn-secondary"
              >
                Отмена
              </button>
            </div>
          </form>
        </ContentCard>
      </div>
    </PageContainer>
  );
}
