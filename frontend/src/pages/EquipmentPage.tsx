import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DownloadSimple, Eye, Plus, Toolbox } from '@phosphor-icons/react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { PageContainer, PageHeader, TablePanel } from '../components/PageLayout';
import { EmptyState, FilterBar, SearchInput } from '../components/ui';
import { formatDate } from '../i18n/format';

interface Equipment {
  id: number;
  name: string;
  inventoryNumber: string;
  serialNumber?: string | null;
  status: string;
  purchaseDate: string;
  category: { name: string };
  location?: { name: string } | null;
  currentHolder?: { fullName: string } | null;
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const { canManage, canViewReports } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const fetchEquipment = () => {
    setLoading(true);
    api
      .get('/equipment', { params: { search: search || undefined, status: status || undefined, limit: 100 } })
      .then((res) => setEquipment(res.data.data || res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = window.setTimeout(fetchEquipment, 250);
    return () => window.clearTimeout(t);
  }, [search, status]);

  const exportCsv = async () => {
    const response = await api.get('/reports/equipment.csv', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'equipment.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <PageContainer>
      <PageHeader
        title={t('equipment.title')}
        description={t('equipment.description')}
        actions={
          <>
          {canViewReports && <button onClick={exportCsv} className="btn-secondary"><DownloadSimple className="h-4 w-4" weight="regular" /> CSV</button>}
          {canManage && <Link to="/equipment/new" className="btn-primary"><Plus className="h-4 w-4" weight="regular" /> {t('common.add')}</Link>}
          </>
        }
      />

      <FilterBar>
        <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-[1fr_220px]">
          <SearchInput placeholder={t('equipment.searchPlaceholder')} value={search} onChange={setSearch} />
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t('common.allStatuses')}</option>
            {['AVAILABLE', 'IN_USE', 'REPAIR', 'RESERVED', 'WRITTEN_OFF', 'LOST'].map((item) => (
              <option key={item} value={item}>{t(`status.${item}`)}</option>
            ))}
          </select>
        </div>
      </FilterBar>

      <TablePanel>
        <table className="table min-w-[920px] table-fixed">
          <thead>
            <tr>
              <th className="w-[28%]">{t('equipment.asset')}</th>
              <th className="w-[16%]">{t('equipment.category')}</th>
              <th className="w-[14%]">{t('common.status')}</th>
              <th className="w-[24%]">{t('equipment.ownerLocation')}</th>
              <th className="w-[10%]">{t('equipment.purchase')}</th>
              <th className="w-[16%] text-right">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8">{t('common.loading')}</td></tr>
            ) : equipment.length === 0 ? (
              <tr><td colSpan={6} className="p-6"><EmptyState title={t('equipment.notFound')} description={t('equipment.notFoundDescription')} /></td></tr>
            ) : equipment.map((item) => (
              <tr key={item.id}>
                <td className="min-w-0">
                  <button onClick={() => navigate(`/equipment/${item.id}`)} className="block max-w-full truncate text-left font-bold text-surface-950 hover:text-primary-800">{item.name}</button>
                  <p className="truncate font-mono text-xs text-surface-500">{item.inventoryNumber} · {item.serialNumber || t('common.noSerial')}</p>
                </td>
                <td><span className="block truncate">{item.category?.name}</span></td>
                <td><StatusBadge status={item.status} /></td>
                <td className="min-w-0">
                  <p className="truncate font-medium">{item.currentHolder?.fullName || t('common.notAttached')}</p>
                  <p className="truncate text-xs text-surface-500">{item.location?.name || t('equipment.locationNotSpecified')}</p>
                </td>
                <td>{formatDate(item.purchaseDate)}</td>
                <td>
                  <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                    <button className="btn-secondary px-2" title={t('common.open')} onClick={() => navigate(`/equipment/${item.id}`)}><Eye className="h-4 w-4" weight="regular" /></button>
                    {canManage && (
                      <>
                        <button className="btn-secondary px-2" title={t('equipment.repair')} onClick={() => navigate(`/repairs?equipmentId=${item.id}`)}><Toolbox className="h-4 w-4" weight="regular" /></button>
                        <button className="btn-secondary px-3" onClick={() => navigate(`/equipment/${item.id}/edit`)}>{t('common.edit')}</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>
    </PageContainer>
  );
}
