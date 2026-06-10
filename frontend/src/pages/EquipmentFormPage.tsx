import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { ContentCard, PageContainer, PageHeader } from '../components/PageLayout';
import { ErrorState } from '../components/ui';

export default function EquipmentFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [refs, setRefs] = useState<{ categories: any[]; locations: any[] }>({ categories: [], locations: [] });
  const [form, setForm] = useState({
    name: '',
    inventoryNumber: '',
    serialNumber: '',
    categoryId: '',
    status: 'AVAILABLE',
    purchaseDate: '',
    purchasePrice: '',
    warrantyUntil: '',
    locationId: '',
    description: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/references/categories'), api.get('/references/locations')]).then(([c, l]) =>
      setRefs({ categories: c.data.data, locations: l.data.data })
    );
    if (isEdit) {
      api.get(`/equipment/${id}`).then((res) => {
        const data = res.data;
        setForm({
          name: data.name || '',
          inventoryNumber: data.inventoryNumber || '',
          serialNumber: data.serialNumber || '',
          categoryId: String(data.categoryId || ''),
          status: data.status || 'AVAILABLE',
          purchaseDate: data.purchaseDate?.split('T')[0] || '',
          purchasePrice: data.purchasePrice || '',
          warrantyUntil: data.warrantyUntil?.split('T')[0] || '',
          locationId: data.locationId ? String(data.locationId) : '',
          description: data.description || '',
        });
      });
    }
  }, [id, isEdit]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        categoryId: Number(form.categoryId),
        locationId: form.locationId ? Number(form.locationId) : null,
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : null,
        warrantyUntil: form.warrantyUntil || null,
      };
      if (isEdit) await api.put(`/equipment/${id}`, payload);
      else await api.post('/equipment', payload);
      navigate('/equipment');
    } catch (err: any) {
      setError(err.response?.data?.error || t('equipment.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <PageContainer>
      <PageHeader title={isEdit ? t('equipment.formEdit') : t('equipment.formNew')} description={t('equipment.formDescription')} />
      <ContentCard className="max-w-4xl">
      <form onSubmit={submit} className="space-y-5">
        {error && <ErrorState message={error} />}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block"><span className="label">{t('equipment.name')} *</span><input name="name" className="input" value={form.name} onChange={change} required /></label>
          <label className="block"><span className="label">{t('equipment.inventoryNumber')} *</span><input name="inventoryNumber" className="input" value={form.inventoryNumber} onChange={change} required /></label>
          <label className="block"><span className="label">{t('equipment.serialNumber')}</span><input name="serialNumber" className="input" value={form.serialNumber} onChange={change} /></label>
          <label className="block"><span className="label">{t('equipment.category')} *</span><select name="categoryId" className="input" value={form.categoryId} onChange={change} required><option value="">{t('common.choose')}</option>{refs.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="block"><span className="label">{t('common.status')}</span><select name="status" className="input" value={form.status} onChange={change}>{['AVAILABLE', 'IN_USE', 'REPAIR', 'RESERVED', 'WRITTEN_OFF', 'LOST'].map((status) => <option key={status} value={status}>{t(`status.${status}`)}</option>)}</select></label>
          <label className="block"><span className="label">{t('equipment.location')}</span><select name="locationId" className="input" value={form.locationId} onChange={change}><option value="">{t('common.notSpecified')}</option>{refs.locations.map((l) => <option key={l.id} value={l.id}>{l.name} {l.room ? `(${l.room})` : ''}</option>)}</select></label>
          <label className="block"><span className="label">{t('equipment.datePurchase')} *</span><input type="date" name="purchaseDate" className="input" value={form.purchaseDate} onChange={change} required /></label>
          <label className="block"><span className="label">{t('equipment.priceKzt')}</span><input type="number" name="purchasePrice" className="input" value={form.purchasePrice} onChange={change} /></label>
          <label className="block"><span className="label">{t('equipment.warrantyUntil')}</span><input type="date" name="warrantyUntil" className="input" value={form.warrantyUntil} onChange={change} /></label>
        </div>
        <label className="block"><span className="label">{t('equipment.descriptionField')}</span><textarea name="description" className="input min-h-[110px]" value={form.description} onChange={change} /></label>
        <div className="flex gap-3"><button className="btn-primary" disabled={loading}>{loading ? t('common.saving') : t('common.save')}</button><button type="button" className="btn-secondary" onClick={() => navigate('/equipment')}>{t('common.cancel')}</button></div>
      </form>
      </ContentCard>
    </PageContainer>
  );
}
