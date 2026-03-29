<template>
  <q-page class="page-container">
    <q-header elevated>
      <q-toolbar class="bg-primary">
        <q-btn flat round dense icon="arrow_back" @click="goBack" />
        <q-toolbar-title>Сканирование</q-toolbar-title>
      </q-toolbar>
    </q-header>

    <div class="q-pa-md">
      <div v-if="capturedImage && !ocrResult" class="preview-container">
        <img :src="capturedImage" class="captured-image" alt="Снимок документа" />
        <div class="q-mt-md row q-gutter-sm">
          <q-btn
            color="grey-7"
            icon="refresh"
            label="Переснять"
            class="col"
            @click="goBack"
          />
          <q-btn
            color="primary"
            icon="text_fields"
            label="Распознать"
            class="col"
            :loading="isProcessing"
            :disable="isProcessing"
            @click="processImage"
          />
        </div>
      </div>

      <div v-if="isProcessing" class="processing-container">
        <q-card>
          <q-card-section class="text-center">
            <q-spinner-dots size="50px" color="primary" />
            <p class="text-h6 q-mt-md">{{ progress.status }}</p>
            <p class="text-grey-6">{{ Math.round(progress.progress) }}%</p>
          </q-card-section>
        </q-card>
      </div>

      <q-card v-if="ocrResult" class="q-mt-md">
        <q-card-section>
          <div class="text-h6 q-mb-md">Распознанные данные</div>
          
          <q-input
            v-model="formFields.number"
            label="Номер поручения"
            outlined
            dense
            class="q-mb-sm"
          />
          <q-input
            v-model="formFields.date"
            label="Дата"
            outlined
            dense
            class="q-mb-sm"
          />
          <q-input
            v-model="formFields.amount"
            label="Сумма"
            outlined
            dense
            class="q-mb-sm"
            suffix="₽"
          />
          <q-input
            v-model="formFields.payer"
            label="Плательщик"
            outlined
            dense
            class="q-mb-sm"
          />
          <q-input
            v-model="formFields.payerInn"
            label="ИНН плательщика"
            outlined
            dense
            class="q-mb-sm"
          />
          <q-input
            v-model="formFields.recipient"
            label="Получатель"
            outlined
            dense
            class="q-mb-sm"
          />
          <q-input
            v-model="formFields.recipientInn"
            label="ИНН получателя"
            outlined
            dense
            class="q-mb-sm"
          />
          <q-input
            v-model="formFields.paymentPurpose"
            label="Назначение платежа"
            outlined
            dense
            type="textarea"
            rows="3"
            class="q-mb-sm"
          />

          <q-banner class="q-mt-md bg-grey-2" rounded>
            <template v-slot:avatar>
              <q-icon name="info" color="grey-7" />
            </template>
            Уверенность: {{ Math.round(ocrResult.confidence) }}%
          </q-banner>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Отмена" @click="goBack" />
          <q-btn color="primary" label="Сохранить" @click="handleSave" />
        </q-card-actions>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { usePaymentStore } from '@/stores/payments';
import { ocrService } from '@/services/ocr';
import type { PaymentFields } from '@/types';
import { emptyFields } from '@/types';

function sanitizeFields(fields: Partial<PaymentFields>): PaymentFields {
  const result: PaymentFields = { ...emptyFields };
  for (const key of Object.keys(emptyFields) as (keyof PaymentFields)[]) {
    const value = fields[key];
    if (typeof value === 'string' && value.trim() !== '') {
      (result as any)[key] = value.trim();
    } else if (value !== undefined && value !== null) {
      (result as any)[key] = String(value);
    }
  }
  return result;
}

const router = useRouter();
const route = useRoute();
const $q = useQuasar();
const store = usePaymentStore();

const capturedImage = ref<string | null>(null);
const isProcessing = ref(false);
const progress = ref({ status: '', progress: 0 });
const ocrResult = ref<{ text: string; confidence: number } | null>(null);
const formFields = ref<PaymentFields>({ ...emptyFields });

function goBack(): void {
  router.push('/');
}

async function processImage(): Promise<void> {
  if (!capturedImage.value) return;

  isProcessing.value = true;
  progress.value = { status: 'Инициализация OCR...', progress: 10 };

  try {
    const result = await ocrService.recognize(capturedImage.value, (p) => {
      progress.value = p;
    });

    ocrResult.value = result;
    formFields.value = sanitizeFields(result.fields);
    
    console.log('========== OCR RESULT ==========');
    console.log('RAW TEXT:\n' + result.text);
    console.log('CONFIDENCE:', result.confidence.toFixed(2) + '%');
    console.log('EXTRACTED FIELDS:');
    console.log(JSON.stringify(result.fields, null, 2));
    console.log('========== END OCR ==========');
    
    $q.notify({ type: 'positive', message: 'Распознавание завершено' });
  } catch (error) {
    console.error('OCR error:', error);
    $q.notify({ type: 'negative', message: 'Ошибка распознавания' });
  } finally {
    isProcessing.value = false;
  }
}

async function handleSave(): Promise<void> {
  try {
    $q.loading.show({ message: 'Сохранение...' });
    console.log('Saving payment with image length:', capturedImage.value?.length);
    
    const fieldsToSave = sanitizeFields(formFields.value);
    const rawText = ocrResult.value?.text || '';
    console.log('Fields sanitized, size:', JSON.stringify(fieldsToSave).length);
    
    const id = await store.addPayment(capturedImage.value || '', fieldsToSave, rawText);
    console.log('Payment saved with id:', id);
    
    $q.notify({ type: 'positive', message: 'Сохранено!' });
    router.push('/');
  } catch (error: any) {
    console.error('Save error full:', error);
    const errorMsg = error?.message || error?.name || 'Неизвестная ошибка';
    $q.notify({ type: 'negative', message: 'Ошибка: ' + errorMsg });
  } finally {
    $q.loading.hide();
  }
}

onMounted(async () => {
  try {
    await ocrService.initialize();
    
    const imageParam = route.query.image as string;
    if (imageParam) {
      capturedImage.value = imageParam;
      setTimeout(() => processImage(), 500);
    }
  } catch (error) {
    console.error('OCR init error:', error);
  }
});
</script>

<style scoped>
.preview-container {
  text-align: center;
}

.captured-image {
  max-width: 100%;
  max-height: 400px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.processing-container {
  max-width: 300px;
  margin: 40px auto;
}
</style>
