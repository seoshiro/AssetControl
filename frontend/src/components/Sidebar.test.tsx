import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from './Sidebar';
import { renderWithRouter } from '../test/testUtils';

const authState = vi.hoisted(() => ({
  value: {
    user: { id: 1, username: 'admin', role: 'ADMIN' },
    logout: vi.fn(),
    isAdmin: true,
    canAudit: true,
    canViewReports: true,
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
  };
}

describe('Sidebar role navigation', () => {
  beforeEach(() => {
    setRole('ADMIN');
  });

  it('shows admin-only navigation to ADMIN', () => {
    renderWithRouter(<Sidebar />);
    expect(screen.getByText('Пользователи')).toBeInTheDocument();
    expect(screen.getByText('Backup')).toBeInTheDocument();
    expect(screen.getByText('Audit log')).toBeInTheDocument();
  });

  it('hides admin-only navigation from EMPLOYEE', () => {
    setRole('EMPLOYEE');
    renderWithRouter(<Sidebar />);
    expect(screen.queryByText('Пользователи')).not.toBeInTheDocument();
    expect(screen.queryByText('Backup')).not.toBeInTheDocument();
    expect(screen.queryByText('Audit log')).not.toBeInTheDocument();
    expect(screen.queryByText('Отчёты')).not.toBeInTheDocument();
  });

  it('shows audit log to AUDITOR without admin tools', () => {
    setRole('AUDITOR');
    renderWithRouter(<Sidebar />);
    expect(screen.getByText('Audit log')).toBeInTheDocument();
    expect(screen.queryByText('Пользователи')).not.toBeInTheDocument();
  });

  it('shows profile name and role badge', () => {
    setRole('MANAGER');
    renderWithRouter(<Sidebar />);
    expect(screen.getByText('manager')).toBeInTheDocument();
    expect(screen.getByText('MANAGER')).toBeInTheDocument();
  });

  it('keeps main read sections visible for VIEWER', () => {
    setRole('VIEWER');
    renderWithRouter(<Sidebar />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Оборудование')).toBeInTheDocument();
    expect(screen.getByText('Отчёты')).toBeInTheDocument();
    expect(screen.queryByText('Audit log')).not.toBeInTheDocument();
  });
});
