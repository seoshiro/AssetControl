import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { ContentCard, PageContainer, PageHeader } from '../components/PageLayout';
import { ErrorState } from '../components/ui';

export default function EmployeeFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { t } = useTranslation();

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
      setError(err.response?.data?.error || t('equipment.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <PageContainer>
      <PageHeader title={isEdit ? t('employees.formEdit') : t('employees.formNew')} description={t('employees.formDescription')} />

      <div className="max-w-2xl">
        <ContentCard>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <ErrorState message={error} />}

            <div>
              <label htmlFor="fullName" className="label">{t('employees.fullName')} *</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                className="input"
                placeholder={t('employees.fullNamePlaceholder')}
                value={form.fullName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="label">{t('common.email')}</label>
                <input id="email" name="email" type="email" className="input" value={form.email} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="phone" className="label">{t('employees.phone')}</label>
                <input id="phone" name="phone" type="text" className="input" value={form.phone} onChange={handleChange} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="department" className="label">{t('employees.department')} *</label>
                <input
                  id="department"
                  name="department"
                  type="text"
                  className="input"
                  placeholder={t('employees.departmentPlaceholder')}
                  value={form.department}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="position" className="label">{t('employees.position')} *</label>
                <input
                  id="position"
                  name="position"
                  type="text"
                  className="input"
                  placeholder={t('employees.positionPlaceholder')}
                  value={form.position}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? t('common.saving') : isEdit ? t('common.save') : t('common.create')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/employees')}
                className="btn-secondary"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </ContentCard>
      </div>
    </PageContainer>
  );
}
