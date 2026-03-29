import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { PaymentOrder, PaymentFields } from '@/types';
import { db } from '@/services/database';

export const usePaymentStore = defineStore('payments', () => {
  const payments = ref<PaymentOrder[]>([]);
  const currentPayment = ref<PaymentOrder | null>(null);
  const isLoading = ref(false);
  const searchQuery = ref('');
  const filterStatus = ref<'all' | 'pending' | 'verified'>('all');
  const dbReady = ref(false);

  const filteredPayments = computed(() => {
    let result = payments.value;

    if (filterStatus.value !== 'all') {
      result = result.filter(p => p.status === filterStatus.value);
    }

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter(p => {
        const fields = p.fields;
        return (
          fields.number.toLowerCase().includes(query) ||
          fields.payer.toLowerCase().includes(query) ||
          fields.recipient.toLowerCase().includes(query) ||
          fields.amount.includes(query)
        );
      });
    }

    return result;
  });

  const stats = computed(() => ({
    total: payments.value.length,
    pending: payments.value.filter(p => p.status === 'pending').length,
    verified: payments.value.filter(p => p.status === 'verified').length
  }));

  async function initDatabase(): Promise<void> {
    try {
      await db.open();
      dbReady.value = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  async function loadPayments(): Promise<void> {
    isLoading.value = true;
    try {
      if (!dbReady.value) {
        await initDatabase();
      }
      payments.value = await db.getAllPayments();
    } catch (error) {
      console.error('Load payments error:', error);
      payments.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function addPayment(imageData: string, fields: PaymentFields, rawText: string = ''): Promise<number> {
    try {
      if (!dbReady.value) {
        await initDatabase();
      }
      const id = await db.addPayment(imageData, fields, rawText);
      await loadPayments();
      return id;
    } catch (error) {
      console.error('Add payment error:', error);
      throw error;
    }
  }

  async function updatePayment(id: number, fields: PaymentFields, status?: 'pending' | 'verified'): Promise<void> {
    await db.updatePayment(id, fields, status);
    await loadPayments();
    if (currentPayment.value?.id === id) {
      currentPayment.value = await db.getPayment(id) || null;
    }
  }

  async function deletePayment(id: number): Promise<void> {
    await db.deletePayment(id);
    await loadPayments();
  }

  async function clearDatabase(): Promise<void> {
    await db.clearAll();
    payments.value = [];
    currentPayment.value = null;
  }

  async function loadPayment(id: number): Promise<PaymentOrder | undefined> {
    currentPayment.value = await db.getPayment(id) || null;
    return currentPayment.value;
  }

  function setFilter(status: 'all' | 'pending' | 'verified'): void {
    filterStatus.value = status;
  }

  function setSearch(query: string): void {
    searchQuery.value = query;
  }

  function clearCurrent(): void {
    currentPayment.value = null;
  }

  return {
    payments,
    currentPayment,
    isLoading,
    searchQuery,
    filterStatus,
    filteredPayments,
    stats,
    initDatabase,
    loadPayments,
    addPayment,
    updatePayment,
    deletePayment,
    loadPayment,
    clearDatabase,
    setFilter,
    setSearch,
    clearCurrent
  };
});
