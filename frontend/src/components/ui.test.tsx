import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmptyState, ErrorState, LoadingState, RoleBadge, SearchInput, StatCard } from './ui';
import { PageHeader } from './PageLayout';
import i18n from '../i18n';

describe('shared UI components', () => {
  beforeEach(() => {
    i18n.changeLanguage('ru');
  });

  it('translates INVENTORY_MANAGER role instead of exposing a raw enum', () => {
    render(<RoleBadge role="INVENTORY_MANAGER" />);
    expect(screen.getByText('Инв. менеджер')).toBeInTheDocument();
    expect(screen.queryByText('INVENTORY_MANAGER')).not.toBeInTheDocument();
  });

  it('falls back to USER when role is empty', () => {
    render(<RoleBadge role={null} />);
    expect(screen.getByText('Пользователь')).toBeInTheDocument();
  });

  it('translates role badge labels in English', async () => {
    await i18n.changeLanguage('en');
    render(<RoleBadge role="REPAIR_COORDINATOR" />);
    expect(screen.getByText('Repair coordinator')).toBeInTheDocument();
  });

  it('renders PageHeader section label through i18n', async () => {
    const { rerender } = render(<PageHeader title="Demo" />);
    expect(screen.getByText('панель управления')).toBeInTheDocument();

    await i18n.changeLanguage('en');
    rerender(<PageHeader title="Demo" />);
    expect(screen.getByText('control panel')).toBeInTheDocument();
  });

  it('renders empty state title and description', () => {
    render(<EmptyState title="Нет данных" description="Добавьте первую запись" />);
    expect(screen.getByText('Нет данных')).toBeInTheDocument();
    expect(screen.getByText('Добавьте первую запись')).toBeInTheDocument();
  });

  it('renders loading label for async pages', () => {
    render(<LoadingState label="Загружаем отчёты" />);
    expect(screen.getByText('Загружаем отчёты')).toBeInTheDocument();
  });

  it('renders error message visibly', () => {
    render(<ErrorState message="Не удалось загрузить данные" />);
    expect(screen.getByText('Не удалось загрузить данные')).toHaveClass('text-red-800');
  });

  it('calls SearchInput change with typed text', () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} placeholder="Поиск" />);
    fireEvent.change(screen.getByPlaceholderText('Поиск'), { target: { value: 'laptop' } });
    expect(onChange).toHaveBeenCalledWith('laptop');
  });

  it('renders dashboard stat value and meta text', () => {
    render(<StatCard title="Оборудование" value={36} meta="активов в базе" />);
    expect(screen.getByText('Оборудование')).toBeInTheDocument();
    expect(screen.getByText('36')).toBeInTheDocument();
    expect(screen.getByText('активов в базе')).toBeInTheDocument();
  });
});
