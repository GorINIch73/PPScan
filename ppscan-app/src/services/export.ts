import type { PaymentOrder, ExportOptions } from '@/types';
import { db } from './database';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Platform } from '@/utils/platform';

export class ExportService {
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
      p.id?.toString() || '',
      this.formatDate(p.createdAt),
      p.status === 'verified' ? 'Проверено' : 'На проверке',
      p.fields.number,
      p.fields.date,
      p.fields.amount,
      p.fields.amountRub,
      p.fields.payer,
      p.fields.payerInn,
      p.fields.payerKpp,
      p.fields.payerBank,
      p.fields.payerAccount,
      p.fields.payerBik,
      p.fields.recipient,
      p.fields.recipientInn,
      p.fields.recipientKpp,
      p.fields.recipientBank,
      p.fields.recipientAccount,
      p.fields.recipientBik,
      p.fields.paymentPurpose.replace(/"/g, '""'),
      p.fields.очередность,
      p.fields.уин,
      (p.rawText || '').replace(/"/g, '""').replace(/\n/g, ' ')
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
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `payments_${timestamp}.csv`;

    if (Platform.isAndroid()) {
      const base64 = btoa(unescape(encodeURIComponent(csv)));
      const fileUri = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache
      });

      await Share.share({
        title: 'Экспорт платежей',
        text: 'Платежные поручения',
        url: fileUri.uri,
        dialogTitle: 'Сохранить как CSV'
      });

      return `Экспорт завершён`;
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
