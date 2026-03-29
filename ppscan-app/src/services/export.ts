import type { PaymentOrder, ExportOptions } from '@/types';
import { db } from './database';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Platform } from '@/utils/platform';

export class ExportService {
  private cleanField(value: string | undefined | null): string {
    if (value == null) return '';
    return value
      .replace(/\r\n/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\t/g, ' ')
      .replace(/"/g, '""')
      .trim();
  }

  async exportToCSV(options: ExportOptions): Promise<string> {
    const payments = await this.getFilteredPayments(options);
    
    const headers = [
      'ID',
      'Дата сканирования',
      'Статус',
      'Номер поручения',
      'Дата поручения',
      'Сумма',
      'Сумма прописью',
      'Плательщик',
      'ИНН плательщика',
      'КПП плательщика',
      'Банк плательщика',
      'Счет плательщика',
      'БИК плательщика',
      'Получатель',
      'ИНН получателя',
      'КПП получателя',
      'Банк получателя',
      'Счет получателя',
      'БИК получателя',
      'Назначение платежа',
      'Очередность',
      'УИН',
      'RAW текст'
    ];

    const rows = payments.map(p => [
      this.cleanField(p.id?.toString()),
      this.formatDate(p.createdAt),
      p.status === 'verified' ? 'Проверено' : 'На проверке',
      this.cleanField(p.fields.number),
      this.cleanField(p.fields.date),
      this.cleanField(p.fields.amount),
      this.cleanField(p.fields.amountRub),
      this.cleanField(p.fields.payer),
      this.cleanField(p.fields.payerInn),
      this.cleanField(p.fields.payerKpp),
      this.cleanField(p.fields.payerBank),
      this.cleanField(p.fields.payerAccount),
      this.cleanField(p.fields.payerBik),
      this.cleanField(p.fields.recipient),
      this.cleanField(p.fields.recipientInn),
      this.cleanField(p.fields.recipientKpp),
      this.cleanField(p.fields.recipientBank),
      this.cleanField(p.fields.recipientAccount),
      this.cleanField(p.fields.recipientBik),
      this.cleanField(p.fields.paymentPurpose),
      this.cleanField(p.fields.очередность),
      this.cleanField(p.fields.уин),
      this.cleanField(p.rawText || '')
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    return '\ufeff' + csvContent;
  }

  private formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private async getFilteredPayments(options: ExportOptions): Promise<PaymentOrder[]> {
    let payments: PaymentOrder[];

    if (options.dateFrom && options.dateTo) {
      payments = await db.getPaymentsByDateRange(options.dateFrom, options.dateTo);
    } else {
      payments = await db.getAllPayments();
    }

    if (options.status && options.status !== 'all') {
      payments = payments.filter(p => p.status === options.status);
    }

    return payments;
  }

  async exportAndDownload(options: ExportOptions): Promise<string> {
    const csv = await this.exportToCSV(options);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `payments_${timestamp}.csv`;

    if (Platform.isAndroid()) {
      const base64 = btoa(unescape(encodeURIComponent(csv)));
      const fileUri = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Documents
      });

      return `Файл сохранён: ${fileUri.uri}`;
    } else {
      this.downloadFile(csv, filename, 'text/csv;charset=utf-8');
      return `Файл скачан: ${filename}`;
    }
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }
}

export const exportService = new ExportService();
