import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

type PdfUser = {
  username?: string;
  role?: string;
};

export type SummaryCard = {
  label: string;
  value: string | number;
  tone?: StatusTone;
};

type StatusTone = 'neutral' | 'green' | 'blue' | 'amber' | 'red' | 'gray';

export type PdfTableColumn<T> = {
  header: string;
  key: keyof T | string;
  width: number;
  align?: 'left' | 'right' | 'center';
  status?: boolean;
};

export type PdfReportOptions<T extends Record<string, unknown>> = {
  title: string;
  description: string;
  filters?: Record<string, unknown>;
  user?: PdfUser;
  summary: SummaryCard[];
  breakdown?: SummaryCard[];
  columns: PdfTableColumn<T>[];
  rows: T[];
  notes?: string[];
  signature?: boolean;
};

const colors = {
  ink: '#1F2933',
  muted: '#64748B',
  faint: '#F7F8FA',
  paper: '#FFFFFF',
  border: '#D8DEE6',
  header: '#203040',
  accent: '#315D7C',
  green: '#4F7D5A',
  blue: '#3F6F99',
  amber: '#9A6A1F',
  red: '#A35454',
  gray: '#6B7280',
};

const statusPalette: Record<string, { label: string; color: string; fill: string }> = {
  AVAILABLE: { label: 'Доступно', color: colors.green, fill: '#EDF5EF' },
  IN_USE: { label: 'Используется', color: colors.blue, fill: '#EDF3F8' },
  REPAIR: { label: 'Ремонт', color: colors.amber, fill: '#FAF2E3' },
  RESERVED: { label: 'Резерв', color: colors.gray, fill: '#F1F3F5' },
  WRITTEN_OFF: { label: 'Списано', color: colors.gray, fill: '#F1F3F5' },
  LOST: { label: 'Потеряно', color: colors.red, fill: '#F8EDED' },
  ACTIVE: { label: 'Активно', color: colors.blue, fill: '#EDF3F8' },
  RETURNED: { label: 'Возвращено', color: colors.green, fill: '#EDF5EF' },
  OVERDUE: { label: 'Просрочено', color: colors.red, fill: '#F8EDED' },
  OPEN: { label: 'Открыто', color: colors.amber, fill: '#FAF2E3' },
  IN_PROGRESS: { label: 'В работе', color: colors.blue, fill: '#EDF3F8' },
  DONE: { label: 'Готово', color: colors.green, fill: '#EDF5EF' },
  CANCELLED: { label: 'Отменено', color: colors.gray, fill: '#F1F3F5' },
  FOUND: { label: 'Найдено', color: colors.green, fill: '#EDF5EF' },
  MISSING: { label: 'Нет на месте', color: colors.red, fill: '#F8EDED' },
  MOVED: { label: 'Перемещено', color: colors.amber, fill: '#FAF2E3' },
  DAMAGED: { label: 'Повреждено', color: colors.red, fill: '#F8EDED' },
  LOW: { label: 'Низкий', color: colors.green, fill: '#EDF5EF' },
  MEDIUM: { label: 'Средний', color: colors.blue, fill: '#EDF3F8' },
  HIGH: { label: 'Высокий', color: colors.amber, fill: '#FAF2E3' },
  CRITICAL: { label: 'Критичный', color: colors.red, fill: '#F8EDED' },
};

const toneColor: Record<StatusTone, string> = {
  neutral: colors.accent,
  green: colors.green,
  blue: colors.blue,
  amber: colors.amber,
  red: colors.red,
  gray: colors.gray,
};

export function formatDate(value?: Date | string | null): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU');
}

export function formatDateTime(value?: Date | string | null): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU');
}

export function formatCompactDate(value?: Date | string | null): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function formatCompactDateTime(value?: Date | string | null): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMoney(value?: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  return `${number.toLocaleString('ru-RU')} ₸`;
}

export function truncateText(value: unknown, max = 160): string {
  const text = value === null || value === undefined || value === '' ? '—' : String(value);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function fontPath(fileName: string): string {
  const candidate = path.resolve(__dirname, '../../assets/fonts', fileName);
  if (fs.existsSync(candidate)) return candidate;
  return path.resolve(process.cwd(), 'assets/fonts', fileName);
}

export async function generatePdfReport<T extends Record<string, unknown>>(options: PdfReportOptions<T>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 42,
      bufferPages: true,
      info: {
        Title: options.title,
        Author: 'AssetControl',
        Subject: options.description,
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const layout = new PdfReportLayout(doc, options);
    layout.render();
    doc.end();
  });
}

class PdfReportLayout<T extends Record<string, unknown>> {
  private y: number;
  private readonly left: number;
  private readonly right: number;
  private readonly top: number;
  private readonly bottom: number;
  private readonly generatedAt = new Date();

  constructor(
    private readonly doc: PDFKit.PDFDocument,
    private readonly options: PdfReportOptions<T>
  ) {
    this.left = doc.page.margins.left;
    this.right = doc.page.width - doc.page.margins.right;
    this.top = doc.page.margins.top;
    this.bottom = doc.page.height - doc.page.margins.bottom - 34;
    this.y = this.top;

    this.doc.registerFont('NotoSans', fontPath('NotoSans-Regular.ttf'));
    this.doc.registerFont('NotoSans-Bold', fontPath('NotoSans-Bold.ttf'));
    this.doc.font('NotoSans');
  }

  render() {
    this.drawHeader();
    this.drawSectionTitle('Summary');
    this.drawSummaryCards(this.options.summary);

    if (this.options.breakdown?.length) {
      this.drawSectionTitle('Status breakdown');
      this.drawBreakdown(this.options.breakdown);
    }

    this.drawSectionTitle('Details');
    this.drawTable(this.options.columns, this.options.rows);

    if (this.options.notes?.length || this.options.signature) {
      this.drawSectionTitle('Notes');
      this.drawNotes();
    }

    this.drawFooters();
  }

  private get width() {
    return this.right - this.left;
  }

  private drawHeader() {
    const headerHeight = 132;
    this.doc.save();
    this.doc.rect(0, 0, this.doc.page.width, headerHeight + 18).fill('#FAFAF8');
    this.doc
      .moveTo(this.left, headerHeight + 18)
      .lineTo(this.right, headerHeight + 18)
      .lineWidth(0.6)
      .strokeColor(colors.border)
      .stroke();

    this.doc
      .font('NotoSans-Bold')
      .fontSize(9)
      .fillColor(colors.accent)
      .text('AssetControl / Equipment Registry', this.left, 28, { width: this.width / 2 });
    this.doc
      .font('NotoSans')
      .fontSize(8)
      .fillColor(colors.muted)
      .text(`Generated: ${formatDateTime(this.generatedAt)}`, this.left + this.width / 2, 28, { width: this.width / 2, align: 'right' });

    this.doc
      .font('NotoSans-Bold')
      .fontSize(24)
      .fillColor(colors.ink)
      .text(this.options.title, this.left, 55, { width: this.width, lineGap: 2 });
    this.doc
      .font('NotoSans')
      .fontSize(9)
      .fillColor(colors.muted)
      .text(this.options.description, this.left, 88, { width: this.width * 0.72, lineGap: 2 });

    const meta = [
      `User: ${this.options.user?.username || 'system'}`,
      `Role: ${this.options.user?.role || '—'}`,
      `Filters: ${this.formatFilters(this.options.filters)}`,
    ];
    this.doc
      .fontSize(7.5)
      .fillColor(colors.muted)
      .text(meta.join('   •   '), this.left, 122, { width: this.width, lineGap: 1 });

    this.doc.restore();
    this.y = headerHeight + 44;
  }

  private drawSectionTitle(title: string) {
    this.checkPageBreak(34);
    this.doc
      .font('NotoSans-Bold')
      .fontSize(12)
      .fillColor(colors.ink)
      .text(title, this.left, this.y);
    this.doc
      .moveTo(this.left, this.y + 19)
      .lineTo(this.right, this.y + 19)
      .lineWidth(0.45)
      .strokeColor(colors.border)
      .stroke();
    this.y += 31;
  }

  private drawSummaryCards(cards: SummaryCard[]) {
    const gap = 8;
    const columns = 4;
    const cardWidth = (this.width - gap * (columns - 1)) / columns;
    const cardHeight = 58;

    cards.forEach((card, index) => {
      if (index > 0 && index % columns === 0) this.y += cardHeight + gap;
      this.checkPageBreak(cardHeight + 12);

      const x = this.left + (index % columns) * (cardWidth + gap);
      const y = this.y;
      const tone = toneColor[card.tone || 'neutral'];

      this.doc
        .roundedRect(x, y, cardWidth, cardHeight, 5)
        .fillAndStroke(colors.faint, colors.border);
      this.doc.circle(x + 13, y + 15, 3).fill(tone);
      this.doc
        .font('NotoSans-Bold')
        .fontSize(17)
        .fillColor(colors.ink)
        .text(truncateText(card.value, 24), x + 20, y + 15, { width: cardWidth - 28, height: 21 });
      this.doc
        .font('NotoSans')
        .fontSize(7.5)
        .fillColor(colors.muted)
        .text(card.label, x + 12, y + 38, { width: cardWidth - 24, height: 12 });
    });

    this.y += cardHeight + 18;
  }

  private drawBreakdown(cards: SummaryCard[]) {
    const gap = 6;
    let x = this.left;
    let y = this.y;
    const height = 24;

    cards.forEach((card) => {
      const label = `${card.label}: ${card.value}`;
      const width = Math.min(this.doc.widthOfString(label) + 24, this.width);
      if (x + width > this.right) {
        x = this.left;
        y += height + gap;
      }
      this.checkPageBreak(height + gap);
      const tone = toneColor[card.tone || 'neutral'];
      this.doc.roundedRect(x, y, width, height, 4).fillAndStroke('#FFFFFF', colors.border);
      this.doc.circle(x + 10, y + 12, 3).fill(tone);
      this.doc.font('NotoSans').fontSize(8).fillColor(colors.ink).text(label, x + 18, y + 7, { width: width - 24, height: 10 });
      x += width + gap;
    });

    this.y = y + height + 18;
  }

  private drawTable(columns: PdfTableColumn<T>[], rows: T[]) {
    const headerHeight = 26;
    const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
    const scale = this.width / tableWidth;
    const scaled = columns.map((column) => ({ ...column, width: column.width * scale }));

    const drawHeader = () => {
      this.checkPageBreak(headerHeight + 18);
      let x = this.left;
      this.doc.rect(this.left, this.y, this.width, headerHeight).fill(colors.header);
      scaled.forEach((column) => {
        this.doc
          .font('NotoSans-Bold')
          .fontSize(7.5)
          .fillColor('#FFFFFF')
          .text(column.header, x + 6, this.y + 8, { width: column.width - 12, height: headerHeight - 10 });
        x += column.width;
      });
      this.y += headerHeight;
    };

    drawHeader();

    if (!rows.length) {
      this.doc
        .rect(this.left, this.y, this.width, 32)
        .fillAndStroke('#FFFFFF', colors.border);
      this.doc.font('NotoSans').fontSize(8.5).fillColor(colors.muted).text('Нет данных для выбранных фильтров.', this.left + 8, this.y + 10);
      this.y += 44;
      return;
    }

    rows.forEach((row, rowIndex) => {
      const rowHeight = this.measureRowHeight(scaled, row);
      if (this.y + rowHeight > this.bottom) {
        this.doc.addPage();
        this.y = this.top;
        drawHeader();
      }

      const fill = rowIndex % 2 === 0 ? '#FFFFFF' : '#FAFBFC';
      this.doc.rect(this.left, this.y, this.width, rowHeight).fill(fill);
      this.doc
        .moveTo(this.left, this.y + rowHeight)
        .lineTo(this.right, this.y + rowHeight)
        .lineWidth(0.35)
        .strokeColor(colors.border)
        .stroke();

      let x = this.left;
      scaled.forEach((column) => {
        const raw = row[column.key as keyof T];
        if (column.status) {
          this.drawStatusBadge(raw, x + 6, this.y + 8, column.width - 12);
        } else {
          this.doc
            .font('NotoSans')
            .fontSize(7.3)
            .fillColor(colors.ink)
            .text(truncateText(raw, 150), x + 6, this.y + 7, {
              width: column.width - 12,
              height: rowHeight - 12,
              align: column.align || 'left',
              lineGap: 1.2,
              ellipsis: true,
            });
        }
        x += column.width;
      });

      this.y += rowHeight;
    });

    this.y += 16;
  }

  private drawStatusBadge(value: unknown, x: number, y: number, maxWidth: number) {
    const key = String(value || '—');
    const status = statusPalette[key] || { label: key, color: colors.gray, fill: '#F1F3F5' };
    const label = status.label;
    const width = Math.min(Math.max(this.doc.widthOfString(label) + 16, 42), maxWidth);
    this.doc.roundedRect(x, y, width, 16, 8).fillAndStroke(status.fill, status.color);
    this.doc.font('NotoSans-Bold').fontSize(6.6).fillColor(status.color).text(label, x + 8, y + 4, { width: width - 16, height: 8, align: 'center' });
  }

  private drawNotes() {
    this.options.notes?.forEach((note) => {
      this.checkPageBreak(22);
      this.doc.font('NotoSans').fontSize(8.5).fillColor(colors.muted).text(`• ${note}`, this.left, this.y, { width: this.width, lineGap: 2 });
      this.y += 18;
    });

    if (this.options.signature) {
      this.checkPageBreak(64);
      this.y += 8;
      this.doc.font('NotoSans').fontSize(9).fillColor(colors.ink).text('Ответственный сотрудник: ________________________________', this.left, this.y);
      this.doc.text('Дата: ____________________', this.left, this.y + 28);
      this.y += 58;
    }
  }

  private drawFooters() {
    const range = this.doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      this.doc.switchToPage(i);
      const pageNumber = i - range.start + 1;
      this.doc
        .moveTo(this.left, this.doc.page.height - 42)
        .lineTo(this.right, this.doc.page.height - 42)
        .lineWidth(0.45)
        .strokeColor(colors.border)
        .stroke();
      this.doc
        .font('NotoSans')
        .fontSize(7)
        .fillColor(colors.muted)
        .text(`Generated by AssetControl • ${formatDateTime(this.generatedAt)}`, this.left, this.doc.page.height - 31, { width: this.width / 2 });
      this.doc
        .text(`Page ${pageNumber} / ${range.count}`, this.left + this.width / 2, this.doc.page.height - 31, { width: this.width / 2, align: 'right' });
    }
  }

  private measureRowHeight(columns: Array<PdfTableColumn<T>>, row: T): number {
    let maxHeight = 0;
    columns.forEach((column) => {
      if (column.status) {
        maxHeight = Math.max(maxHeight, 30);
        return;
      }
      const text = truncateText(row[column.key as keyof T], 150);
      const height = this.doc.font('NotoSans').fontSize(7.3).heightOfString(text, {
        width: column.width - 12,
        lineGap: 1.2,
      });
      maxHeight = Math.max(maxHeight, height + 16);
    });
    return Math.min(Math.max(maxHeight, 30), 66);
  }

  private checkPageBreak(requiredHeight: number) {
    if (this.y + requiredHeight <= this.bottom) return;
    this.doc.addPage();
    this.y = this.top;
  }

  private formatFilters(filters?: Record<string, unknown>): string {
    if (!filters) return 'none';
    const active = Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '');
    if (!active.length) return 'none';
    return active.map(([key, value]) => `${key}=${String(value)}`).join(', ');
  }
}
