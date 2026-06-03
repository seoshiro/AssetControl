import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { ContentCard, PageContainer, PageHeader } from '../components/PageLayout';
import { ErrorState } from '../components/ui';

export default function EquipmentFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
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
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <PageContainer>
      <PageHeader title={isEdit ? 'Редактировать оборудование' : 'Новое оборудование'} description="Карточка актива, статус, стоимость и локация." />
      <ContentCard className="max-w-4xl">
      <form onSubmit={submit} className="space-y-5">
        {error && <ErrorState message={error} />}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block"><span className="label">Название *</span><input name="name" className="input" value={form.name} onChange={change} required /></label>
          <label className="block"><span className="label">Инвентарный номер *</span><input name="inventoryNumber" className="input" value={form.inventoryNumber} onChange={change} required /></label>
          <label className="block"><span className="label">Серийный номер</span><input name="serialNumber" className="input" value={form.serialNumber} onChange={change} /></label>
          <label className="block"><span className="label">Категория *</span><select name="categoryId" className="input" value={form.categoryId} onChange={change} required><option value="">Выберите</option>{refs.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="block"><span className="label">Статус</span><select name="status" className="input" value={form.status} onChange={change}><option value="AVAILABLE">Доступно</option><option value="IN_USE">В использовании</option><option value="REPAIR">Ремонт</option><option value="RESERVED">Резерв</option><option value="WRITTEN_OFF">Списано</option><option value="LOST">Потеряно</option></select></label>
          <label className="block"><span className="label">Локация</span><select name="locationId" className="input" value={form.locationId} onChange={change}><option value="">Не указана</option>{refs.locations.map((l) => <option key={l.id} value={l.id}>{l.name} {l.room ? `(${l.room})` : ''}</option>)}</select></label>
          <label className="block"><span className="label">Дата покупки *</span><input type="date" name="purchaseDate" className="input" value={form.purchaseDate} onChange={change} required /></label>
          <label className="block"><span className="label">Стоимость, ₸</span><input type="number" name="purchasePrice" className="input" value={form.purchasePrice} onChange={change} /></label>
          <label className="block"><span className="label">Гарантия до</span><input type="date" name="warrantyUntil" className="input" value={form.warrantyUntil} onChange={change} /></label>
        </div>
        <label className="block"><span className="label">Описание</span><textarea name="description" className="input min-h-[110px]" value={form.description} onChange={change} /></label>
        <div className="flex gap-3"><button className="btn-primary" disabled={loading}>{loading ? 'Сохранение...' : 'Сохранить'}</button><button type="button" className="btn-secondary" onClick={() => navigate('/equipment')}>Отмена</button></div>
      </form>
      </ContentCard>
    </PageContainer>
  );
}
