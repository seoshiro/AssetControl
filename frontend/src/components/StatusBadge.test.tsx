import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StatusBadge, { getStatusLabel, statusConfig } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders AVAILABLE in Russian', () => {
    render(<StatusBadge status="AVAILABLE" />);
    expect(screen.getByText('Доступно')).toBeInTheDocument();
  });

  it('renders IN_USE in Russian', () => {
    render(<StatusBadge status="IN_USE" />);
    expect(screen.getByText('В использовании')).toBeInTheDocument();
  });

  it('renders REPAIR in Russian', () => {
    render(<StatusBadge status="REPAIR" />);
    expect(screen.getByText('На ремонте')).toBeInTheDocument();
  });

  it('renders WRITTEN_OFF and LOST as danger statuses', () => {
    expect(statusConfig.WRITTEN_OFF.classes).toContain('status-danger');
    expect(statusConfig.LOST.classes).toContain('status-danger');
  });

  it('renders overdue issuance as danger status', () => {
    render(<StatusBadge status="OVERDUE" />);
    expect(screen.getByText('Просрочено')).toHaveClass('status-danger');
  });

  it('keeps unknown status readable instead of hiding it', () => {
    render(<StatusBadge status="CUSTOM_STATUS" />);
    expect(screen.getByText('CUSTOM_STATUS')).toHaveClass('status-muted');
  });

  it('returns labels through helper for table formatters', () => {
    expect(getStatusLabel('DONE')).toBe('Готово');
    expect(getStatusLabel('UNKNOWN')).toBe('UNKNOWN');
  });
});
