import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from './Sidebar';
import { renderWithRouter } from '../test/testUtils';
import i18n from '../i18n';

const authState = vi.hoisted(() => ({
  value: {
    user: { id: 1, username: 'admin', role: 'ADMIN' },
    logout: vi.fn(),
    isAdmin: true,
    canAudit: true,
    canViewReports: true,
    canViewFinance: true,
    canViewRepairPickup: true,
    canManageFinance: true,
    isRepairCoordinator: false,
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => authState.value,
}));

function setRole(role: string) {
  authState.value = {
    user: { id: 1, username: role.toLowerCase(), role },
    logout: vi.fn(),
    isAdmin: role === 'ADMIN',
    canAudit: ['ADMIN', 'AUDITOR'].includes(role),
    canViewReports: ['ADMIN', 'MANAGER', 'INVENTORY_MANAGER', 'AUDITOR', 'VIEWER'].includes(role),
    canViewFinance: ['ADMIN', 'MANAGER', 'INVENTORY_MANAGER', 'AUDITOR', 'VIEWER'].includes(role),
    canViewRepairPickup: ['ADMIN', 'MANAGER', 'INVENTORY_MANAGER', 'REPAIR_COORDINATOR', 'AUDITOR'].includes(role),
    canManageFinance: ['ADMIN', 'MANAGER'].includes(role),
    isRepairCoordinator: role === 'REPAIR_COORDINATOR',
  };
}

describe('Sidebar role navigation', () => {
  beforeEach(() => {
    setRole('ADMIN');
    i18n.changeLanguage('ru');
  });

  it('shows admin-only navigation to ADMIN', () => {
    renderWithRouter(<Sidebar />);
    expect(screen.getByText('Пользователи')).toBeInTheDocument();
    expect(screen.getByText('Резервная копия')).toBeInTheDocument();
    expect(screen.getByText('Журнал действий')).toBeInTheDocument();
  });

  it('hides admin-only navigation from EMPLOYEE', () => {
    setRole('EMPLOYEE');
    renderWithRouter(<Sidebar />);
    expect(screen.queryByText('Пользователи')).not.toBeInTheDocument();
    expect(screen.queryByText('Резервная копия')).not.toBeInTheDocument();
    expect(screen.queryByText('Журнал действий')).not.toBeInTheDocument();
    expect(screen.queryByText('Отчёты')).not.toBeInTheDocument();
  });

  it('shows audit log to AUDITOR without admin tools', () => {
    setRole('AUDITOR');
    renderWithRouter(<Sidebar />);
    expect(screen.getByText('Журнал действий')).toBeInTheDocument();
    expect(screen.queryByText('Пользователи')).not.toBeInTheDocument();
  });

  it('shows profile name and role badge', () => {
    setRole('MANAGER');
    renderWithRouter(<Sidebar />);
    expect(screen.getByText('manager')).toBeInTheDocument();
    expect(screen.getAllByText('Менеджер').length).toBeGreaterThan(0);
  });

  it('keeps main read sections visible for VIEWER', () => {
    setRole('VIEWER');
    renderWithRouter(<Sidebar />);
    expect(screen.getByText('Панель')).toBeInTheDocument();
    expect(screen.getByText('Оборудование')).toBeInTheDocument();
    expect(screen.getByText('Отчёты')).toBeInTheDocument();
    expect(screen.getByText('Финансы')).toBeInTheDocument();
    expect(screen.queryByText('Audit log')).not.toBeInTheDocument();
  });

  it('shows repair pickup tasks to REPAIR_COORDINATOR without reports or finance', () => {
    setRole('REPAIR_COORDINATOR');
    renderWithRouter(<Sidebar />);
    expect(screen.getByText('Мои задачи ремонта')).toBeInTheDocument();
    expect(screen.queryByText('Отчёты')).not.toBeInTheDocument();
    expect(screen.queryByText('Финансы')).not.toBeInTheDocument();
    expect(screen.queryByText('Журнал действий')).not.toBeInTheDocument();
  });

  it('shows finance to AUDITOR but keeps admin tools hidden', () => {
    setRole('AUDITOR');
    renderWithRouter(<Sidebar />);
    expect(screen.getByText('Финансы')).toBeInTheDocument();
    expect(screen.getByText('Мои задачи ремонта')).toBeInTheDocument();
    expect(screen.queryByText('Пользователи')).not.toBeInTheDocument();
  });

  it('changes navigation labels when language is English', async () => {
    await i18n.changeLanguage('en');
    setRole('VIEWER');
    renderWithRouter(<Sidebar />);
    expect(screen.getByText('Equipment')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.queryByText('Оборудование')).not.toBeInTheDocument();
  });
});
