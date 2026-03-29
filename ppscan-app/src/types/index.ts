export interface PaymentFields {
  number: string;
  date: string;
  amount: string;
  amountRub: string;
  payer: string;
  payerInn: string;
  payerKpp: string;
  payerBank: string;
  payerAccount: string;
  payerBik: string;
  recipient: string;
  recipientInn: string;
  recipientKpp: string;
  recipientBank: string;
  recipientAccount: string;
  recipientBik: string;
  paymentType: string;
  paymentPurpose: string;
  очередность: string;
  уин: string;
}

export interface PaymentOrder {
  id?: number;
  imageData: string;
  rawText: string;
  createdAt: string;
  status: 'pending' | 'verified';
  fields: PaymentFields;
}

export interface OCRResult {
  text: string;
  confidence: number;
  fields: Partial<PaymentFields>;
}

export interface ExportOptions {
  format: 'csv' | 'xlsx';
  includeImage: boolean;
  dateFrom?: string;
  dateTo?: string;
  status?: 'pending' | 'verified' | 'all';
}

export const emptyFields: PaymentFields = {
  number: '',
  date: '',
  amount: '',
  amountRub: '',
  payer: '',
  payerInn: '',
  payerKpp: '',
  payerBank: '',
  payerAccount: '',
  payerBik: '',
  recipient: '',
  recipientInn: '',
  recipientKpp: '',
  recipientBank: '',
  recipientAccount: '',
  recipientBik: '',
  paymentType: '',
  paymentPurpose: '',
  очередность: '',
  уин: ''
};
