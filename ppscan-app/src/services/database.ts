import Dexie, { type Table } from 'dexie';
import type { PaymentOrder, PaymentFields } from '@/types';
import { emptyFields } from '@/types';

export class PPScanDatabase extends Dexie {
  payments!: Table<PaymentOrder, number>;

  constructor() {
    super('ppscan');
    this.version(1).stores({
      payments: '++id, createdAt, status'
    });
  }

  async addPayment(imageData: string, fields: PaymentFields, rawText: string = ''): Promise<number> {
    console.log('Database addPayment called');
    console.log('Image data length:', imageData?.length || 0);
    
    const payment: PaymentOrder = {
      imageData: imageData || '',
      rawText: rawText || '',
      createdAt: new Date().toISOString(),
      status: 'pending',
      fields
    };
    
    console.log('Payment object prepared, adding to DB...');
    const id = await this.payments.add(payment);
    console.log('Payment added with id:', id);
    return id;
  }

  async updatePayment(id: number, fields: PaymentFields, status?: 'pending' | 'verified'): Promise<void> {
    const update: Partial<PaymentOrder> = { fields };
    if (status) {
      update.status = status;
    }
    await this.payments.update(id, update);
  }

  async deletePayment(id: number): Promise<void> {
    await this.payments.delete(id);
  }

  async getPayment(id: number): Promise<PaymentOrder | undefined> {
    return await this.payments.get(id);
  }

  async getAllPayments(): Promise<PaymentOrder[]> {
    return await this.payments.orderBy('createdAt').reverse().toArray();
  }

  async getPaymentsByStatus(status: 'pending' | 'verified'): Promise<PaymentOrder[]> {
    return await this.payments.where('status').equals(status).reverse().toArray();
  }

  async getPaymentsByDateRange(dateFrom: string, dateTo: string): Promise<PaymentOrder[]> {
    return await this.payments
      .where('createdAt')
      .between(dateFrom, dateTo, true, true)
      .reverse()
      .toArray();
  }

  async searchPayments(query: string): Promise<PaymentOrder[]> {
    const all = await this.getAllPayments();
    const lowerQuery = query.toLowerCase();
    return all.filter(p => {
      const fields = p.fields;
      return (
        fields.number.toLowerCase().includes(lowerQuery) ||
        fields.payer.toLowerCase().includes(lowerQuery) ||
        fields.recipient.toLowerCase().includes(lowerQuery) ||
        fields.amount.includes(query) ||
        fields.paymentPurpose.toLowerCase().includes(lowerQuery)
      );
    });
  }

  async getStats(): Promise<{ total: number; pending: number; verified: number }> {
    const all = await this.getAllPayments();
    return {
      total: all.length,
      pending: all.filter(p => p.status === 'pending').length,
      verified: all.filter(p => p.status === 'verified').length
    };
  }

  async clearAll(): Promise<void> {
    await this.payments.clear();
  }
}

export const db = new PPScanDatabase();
