<template>
  <q-page class="page-container">
    <q-header elevated>
      <q-toolbar class="bg-primary">
        <q-toolbar-title>
          <q-icon name="document_scanner" class="q-mr-sm" />
          PPScan
        </q-toolbar-title>
        <q-btn flat round dense icon="file_download" @click="showExportDialog = true" />
        <q-btn flat round dense icon="delete_forever" @click="confirmClearDatabase" />
      </q-toolbar>
    </q-header>

    <div class="q-pa-md">
      <q-card class="stats-card q-mb-md">
        <q-card-section class="row q-gutter-sm">
          <div class="col text-center">
            <div class="text-h5 text-primary">{{ stats.total }}</div>
            <div class="text-caption">Всего</div>
          </div>
          <div class="col text-center">
            <div class="text-h5 text-warning">{{ stats.pending }}</div>
            <div class="text-caption">На проверке</div>
          </div>
          <div class="col text-center">
            <div class="text-h5 text-positive">{{ stats.verified }}</div>
            <div class="text-caption">Проверено</div>
          </div>
        </q-card-section>
      </q-card>

      <q-input
        v-model="searchQuery"
        dense
        outlined
        placeholder="Поиск..."
        class="q-mb-md"
        @update:model-value="store.setSearch"
      >
        <template v-slot:prepend>
          <q-icon name="search" />
        </template>
        <template v-slot:append v-if="searchQuery">
          <q-icon name="close" class="cursor-pointer" @click="searchQuery = ''; store.setSearch('')" />
        </template>
      </q-input>

      <q-btn-toggle
        v-model="filterStatus"
        spread
        no-caps
        toggle-color="primary"
        :options="[
          { label: 'Все', value: 'all' },
          { label: 'На проверке', value: 'pending' },
          { label: 'Проверено', value: 'verified' }
        ]"
        class="q-mb-md"
        @update:model-value="(v: string) => store.setFilter(v as any)"
      />

      <div v-if="store.isLoading" class="text-center q-pa-xl">
        <q-spinner-dots size="50px" color="primary" />
      </div>

      <div v-else-if="store.filteredPayments.length === 0" class="text-center q-pa-xl">
        <q-icon name="inbox" size="64px" color="grey-5" />
        <p class="text-grey-6 q-mt-md">Нет сохраненных платежных поручений</p>
        <p class="text-grey-5">Нажмите кнопку для добавления</p>
      </div>

      <q-list v-else separator>
        <q-item
          v-for="payment in store.filteredPayments"
          :key="payment.id"
          clickable
          v-ripple
          @click="$router.push(`/detail/${payment.id}`)"
        >
          <q-item-section avatar>
            <q-avatar color="grey-3" text-color="grey-7">
              <q-icon name="receipt" />
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label>№ {{ payment.fields.number || 'Без номера' }}</q-item-label>
            <q-item-label caption>
              {{ payment.fields.payer || 'Плательщик' }} → {{ payment.fields.recipient || 'Получатель' }}
            </q-item-label>
            <q-item-label caption>
              {{ payment.fields.amount || '0.00' }} ₽ · {{ formatDate(payment.createdAt) }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-badge
              :color="payment.status === 'verified' ? 'positive' : 'warning'"
              :label="payment.status === 'verified' ? 'Проверено' : 'На проверке'"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <q-page-sticky position="bottom-right" :offset="[18, 18]">
      <div class="column q-gutter-sm">
        <q-btn
          fab
          color="primary"
          icon="photo_camera"
          @click="openCamera"
        >
          <q-tooltip>Камера</q-tooltip>
        </q-btn>
        <q-btn
          fab
          color="secondary"
          icon="photo_library"
          @click="openGallery"
        >
          <q-tooltip>Галерея</q-tooltip>
        </q-btn>
      </div>
    </q-page-sticky>

    <q-dialog v-model="showExportDialog">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Экспорт данных</div>
        </q-card-section>
        <q-card-section>
          <q-select
            v-model="exportStatus"
            :options="[
              { label: 'Все записи', value: 'all' },
              { label: 'Только проверенные', value: 'verified' },
              { label: 'Только на проверке', value: 'pending' }
            ]"
            label="Статус записей"
            emit-value
            map-options
            outlined
            dense
            class="q-mb-md"
          />
          <p class="text-caption text-grey-6">Будет экспортировано в формате CSV</p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Отмена" v-close-popup />
          <q-btn color="primary" label="Экспортировать" @click="handleExport" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { usePaymentStore } from '@/stores/payments';
import { exportService } from '@/services/export';
import { ocrService } from '@/services/ocr';
import { useQuasar } from 'quasar';

const router = useRouter();
const $q = useQuasar();
const store = usePaymentStore();

const searchQuery = ref('');
const filterStatus = ref<'all' | 'pending' | 'verified'>('all');
const showExportDialog = ref(false);
const exportStatus = ref<'all' | 'pending' | 'verified'>('all');

const stats = computed(() => store.stats);

onMounted(async () => {
  await store.initDatabase();
  await store.loadPayments();
});

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

async function openCamera(): Promise<void> {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera
    });

    if (image.dataUrl) {
      router.push({ path: '/scan', query: { image: image.dataUrl } });
    }
  } catch (error: any) {
    console.error('Camera error:', error);
    if (error?.message !== 'User cancelled') {
      $q.notify({ type: 'negative', message: 'Не удалось открыть камеру' });
    }
  }
}

async function openGallery(): Promise<void> {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos
    });

    if (image.dataUrl) {
      router.push({ path: '/scan', query: { image: image.dataUrl } });
    }
  } catch (error: any) {
    console.error('Gallery error:', error);
    if (error?.message !== 'User cancelled') {
      $q.notify({ type: 'negative', message: 'Не удалось открыть галерею' });
    }
  }
}

async function handleExport(): Promise<void> {
  try {
    const message = await exportService.exportAndDownload({
      format: 'csv',
      includeImage: false,
      status: exportStatus.value
    });
    $q.notify({ type: 'positive', message });
  } catch (error) {
    console.error('Export error:', error);
    $q.notify({ type: 'negative', message: 'Ошибка экспорта' });
  }
  showExportDialog.value = false;
}

async function confirmClearDatabase(): Promise<void> {
  $q.dialog({
    title: 'Очистка базы',
    message: 'Удалить все записи? Это действие нельзя отменить.',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    await store.clearDatabase();
    $q.notify({ type: 'info', message: 'База очищена' });
  });
}
</script>

<style scoped>
.stats-card {
  background: linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%);
}
</style>
