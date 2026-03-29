<template>
  <q-page class="page-container">
    <q-header elevated>
      <q-toolbar class="bg-primary">
        <q-btn flat round dense icon="arrow_back" @click="goBack" />
        <q-toolbar-title>{{ isNew ? 'Новое поручение' : 'Редактирование' }}</q-toolbar-title>
      </q-toolbar>
    </q-header>

    <div class="q-pa-md">
      <q-card>
        <q-card-section>
          <div class="text-subtitle1 text-grey-7 q-mb-md">Реквизиты платежного поручения</div>

          <q-expansion-item group="sections" label="Плательщик" default-opened>
            <q-input
              v-model="formFields.payer"
              label="Наименование / ФИО"
              outlined
              dense
              class="q-mb-sm"
            />
            <q-input
              v-model="formFields.payerInn"
              label="ИНН"
              outlined
              dense
              class="q-mb-sm"
              maxlength="12"
            />
            <q-input
              v-model="formFields.payerKpp"
              label="КПП"
              outlined
              dense
              class="q-mb-sm"
              maxlength="9"
            />
            <q-input
              v-model="formFields.payerAccount"
              label="Номер счета"
              outlined
              dense
              class="q-mb-sm"
              maxlength="20"
            />
            <q-input
              v-model="formFields.payerBank"
              label="Банк"
              outlined
              dense
              class="q-mb-sm"
            />
            <q-input
              v-model="formFields.payerBik"
              label="БИК"
              outlined
              dense
              class="q-mb-sm"
              maxlength="9"
            />
          </q-expansion-item>

          <q-separator class="q-my-sm" />

          <q-expansion-item group="sections" label="Получатель" default-opened>
            <q-input
              v-model="formFields.recipient"
              label="Наименование / ФИО"
              outlined
              dense
              class="q-mb-sm"
            />
            <q-input
              v-model="formFields.recipientInn"
              label="ИНН"
              outlined
              dense
              class="q-mb-sm"
              maxlength="12"
            />
            <q-input
              v-model="formFields.recipientKpp"
              label="КПП"
              outlined
              dense
              class="q-mb-sm"
              maxlength="9"
            />
            <q-input
              v-model="formFields.recipientAccount"
              label="Номер счета"
              outlined
              dense
              class="q-mb-sm"
              maxlength="20"
            />
            <q-input
              v-model="formFields.recipientBank"
              label="Банк"
              outlined
              dense
              class="q-mb-sm"
            />
            <q-input
              v-model="formFields.recipientBik"
              label="БИК"
              outlined
              dense
              class="q-mb-sm"
              maxlength="9"
            />
          </q-expansion-item>

          <q-separator class="q-my-sm" />

          <q-expansion-item group="sections" label="Платеж" default-opened>
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
              placeholder="ДД.ММ.ГГГГ"
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
              v-model="formFields.amountRub"
              label="Сумма прописью"
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
            <q-input
              v-model="formFields.paymentType"
              label="Вид платежа"
              outlined
              dense
              class="q-mb-sm"
            />
            <div class="row q-gutter-sm">
              <q-input
                v-model="formFields.очередность"
                label="Очередность"
                outlined
                dense
                class="col"
              />
              <q-input
                v-model="formFields.уин"
                label="УИН"
                outlined
                dense
                class="col"
              />
            </div>
          </q-expansion-item>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Отмена" @click="goBack" />
          <q-btn color="primary" label="Сохранить" @click="save" />
        </q-card-actions>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePaymentStore } from '@/stores/payments';
import type { PaymentFields } from '@/types';
import { emptyFields } from '@/types';

const route = useRoute();
const router = useRouter();
const store = usePaymentStore();

const formFields = ref<PaymentFields>({ ...emptyFields });
const paymentId = computed(() => route.params.id as string | undefined);
const isNew = computed(() => !paymentId.value);

onMounted(async () => {
  if (paymentId.value) {
    const payment = await store.loadPayment(parseInt(paymentId.value));
    if (payment) {
      formFields.value = { ...payment.fields };
    }
  }
});

function goBack(): void {
  router.back();
}

async function save(): Promise<void> {
  if (isNew.value) {
    await store.addPayment('', formFields.value);
  } else if (paymentId.value) {
    await store.updatePayment(parseInt(paymentId.value), formFields.value);
  }
  router.push('/');
}
</script>
