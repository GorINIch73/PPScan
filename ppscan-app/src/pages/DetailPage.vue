<template>
  <q-page class="page-container">
    <q-header elevated>
      <q-toolbar class="bg-primary">
        <q-btn flat round dense icon="arrow_back" @click="$router.back()" />
        <q-toolbar-title>Детали поручения</q-toolbar-title>
        <q-btn flat round dense icon="edit" @click="$router.push(`/edit/${id}`)" />
        <q-btn flat round dense icon="delete" @click="confirmDelete" />
      </q-toolbar>
    </q-header>

    <div v-if="payment" class="q-pa-md">
      <q-card class="q-mb-md">
        <q-card-section class="row items-center">
          <div class="col">
            <div class="text-h6">№ {{ payment.fields.number || 'Без номера' }}</div>
            <div class="text-caption text-grey-6">{{ formatDate(payment.createdAt) }}</div>
          </div>
          <q-badge
            :color="payment.status === 'verified' ? 'positive' : 'warning'"
            :label="payment.status === 'verified' ? 'Проверено' : 'На проверке'"
            class="text-capitalize"
          />
        </q-card-section>
        
        <q-separator />

        <q-card-section>
          <div class="text-subtitle2 text-primary q-mb-sm">Плательщик</div>
          <div class="info-row">
            <span class="label">Наименование:</span>
            <span class="value">{{ payment.fields.payer || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">ИНН:</span>
            <span class="value">{{ payment.fields.payerInn || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">КПП:</span>
            <span class="value">{{ payment.fields.payerKpp || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">Счет:</span>
            <span class="value">{{ payment.fields.payerAccount || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">Банк:</span>
            <span class="value">{{ payment.fields.payerBank || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">БИК:</span>
            <span class="value">{{ payment.fields.payerBik || '-' }}</span>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-section>
          <div class="text-subtitle2 text-primary q-mb-sm">Получатель</div>
          <div class="info-row">
            <span class="label">Наименование:</span>
            <span class="value">{{ payment.fields.recipient || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">ИНН:</span>
            <span class="value">{{ payment.fields.recipientInn || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">КПП:</span>
            <span class="value">{{ payment.fields.recipientKpp || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">Счет:</span>
            <span class="value">{{ payment.fields.recipientAccount || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">Банк:</span>
            <span class="value">{{ payment.fields.recipientBank || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">БИК:</span>
            <span class="value">{{ payment.fields.recipientBik || '-' }}</span>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-section>
          <div class="text-subtitle2 text-primary q-mb-sm">Платеж</div>
          <div class="info-row">
            <span class="label">Дата:</span>
            <span class="value">{{ payment.fields.date || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">Сумма:</span>
            <span class="value text-weight-bold">{{ payment.fields.amount || '0.00' }} ₽</span>
          </div>
          <div class="info-row" v-if="payment.fields.amountRub">
            <span class="label">Прописью:</span>
            <span class="value">{{ payment.fields.amountRub }}</span>
          </div>
          <div class="info-row">
            <span class="label">Назначение:</span>
            <span class="value">{{ payment.fields.paymentPurpose || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">Очередность:</span>
            <span class="value">{{ payment.fields.очередность || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">УИН:</span>
            <span class="value">{{ payment.fields.уин || '-' }}</span>
          </div>
        </q-card-section>
      </q-card>

      <q-card v-if="payment.imageData">
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">Изображение документа</div>
          <img :src="payment.imageData" class="document-image" alt="Документ" />
        </q-card-section>
      </q-card>

      <q-card v-if="payment.rawText">
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">RAW текст</div>
          <pre class="raw-text">{{ payment.rawText }}</pre>
        </q-card-section>
      </q-card>

      <div class="row q-mt-lg q-gutter-sm">
        <q-btn
          v-if="payment.status === 'pending'"
          color="positive"
          icon="check"
          label="Подтвердить"
          class="col"
          @click="markAsVerified"
        />
        <q-btn
          color="primary"
          icon="share"
          label="Экспорт"
          class="col"
          @click="exportSingle"
        />
      </div>
    </div>

    <div v-else class="text-center q-pa-xl">
      <q-spinner-dots size="50px" color="primary" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { usePaymentStore } from '@/stores/payments';
import { exportService } from '@/services/export';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const store = usePaymentStore();

const id = computed(() => parseInt(route.params.id as string));
const payment = computed(() => store.currentPayment);

onMounted(async () => {
  await store.loadPayment(id.value);
});

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function markAsVerified(): Promise<void> {
  if (payment.value) {
    await store.updatePayment(id.value, payment.value.fields, 'verified');
    await store.loadPayment(id.value);
    $q.notify({ type: 'positive', message: 'Поручение подтверждено' });
  }
}

async function confirmDelete(): Promise<void> {
  $q.dialog({
    title: 'Удаление',
    message: 'Удалить это платежное поручение?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    await store.deletePayment(id.value);
    router.push('/');
    $q.notify({ type: 'info', message: 'Поручение удалено' });
  });
}

async function exportSingle(): Promise<void> {
  if (payment.value) {
    await exportService.exportAndDownload({
      format: 'csv',
      includeImage: false,
      status: 'all'
    });
  }
}
</script>

<style scoped>
.info-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #eee;
}

.info-row:last-child {
  border-bottom: none;
}

.info-row .label {
  color: #666;
  font-size: 14px;
}

.info-row .value {
  font-weight: 500;
  text-align: right;
  max-width: 60%;
}

.document-image {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.raw-text {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  font-size: 11px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
}
</style>
