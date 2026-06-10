import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import LanguageSwitcher from './LanguageSwitcher';
import i18n, { LANGUAGE_STORAGE_KEY } from '../i18n';

describe('LanguageSwitcher', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('ru');
  });

  it('uses Russian as the default interface language', () => {
    render(<LanguageSwitcher />);
    expect(i18n.language).toBe('ru');
    expect(screen.getByText('RU')).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches from Russian to English and saves localStorage', async () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByText('EN'));

    await waitFor(() => {
      expect(i18n.language).toBe('en');
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
      expect(screen.getByText('EN')).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('switches from English back to Russian and saves localStorage', async () => {
    await i18n.changeLanguage('en');
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByText('RU'));

    await waitFor(() => {
      expect(i18n.language).toBe('ru');
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ru');
      expect(screen.getByText('RU')).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
