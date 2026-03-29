import Tesseract from 'tesseract.js';
import type { PaymentFields } from '@/types';
import { emptyFields } from '@/types';
import { preprocessImage as advancedPreprocess, detectDocument } from './imageProcessor';

export interface OCRProgress {
  status: string;
  progress: number;
}

export class OCRService {
  private worker: Tesseract.Worker | null = null;

  async initialize(): Promise<void> {
    if (this.worker) return;
    
    this.worker = await Tesseract.createWorker('rus', 1, {
      logger: (m) => console.log('Tesseract:', m.status, Math.round(m.progress * 100) + '%')
    });
  }

  async recognize(
    imageData: string,
    onProgress?: (progress: OCRProgress) => void
  ): Promise<{ text: string; confidence: number; fields: Partial<PaymentFields>; processedImage?: string }> {
    if (!this.worker) {
      await this.initialize();
    }

    onProgress?.({ status: 'Улучшение изображения...', progress: 10 });
    
    const processedImage = await this.preprocessImage(imageData);

    onProgress?.({ status: 'Распознавание текста...', progress: 30 });

    const result = await this.worker!.recognize(processedImage, {}, {
      text: true
    });

    const text = result.data.text;
    const confidence = result.data.confidence;

    onProgress?.({ status: 'Извлечение реквизитов...', progress: 95 });

    const fields = this.extractFields(text);

    return { text, confidence, fields, processedImage };
  }

  private async preprocessImage(imageData: string): Promise<string> {
    try {
      console.log('Starting advanced image preprocessing...');
      const startTime = Date.now();
      
      const result = await advancedPreprocess(imageData);
      
      console.log(`Preprocessing done in ${Date.now() - startTime}ms`);
      return result;
    } catch (err) {
      console.error('Advanced preprocessing failed, using basic:', err);
      return this.basicPreprocess(imageData);
    }
  }
  
  private basicPreprocess(imageData: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        let width = img.width;
        let height = img.height;
        
        const maxDimension = 2000;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round(height * maxDimension / width);
            width = maxDimension;
          } else {
            width = Math.round(width * maxDimension / height);
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        const imageData_obj = ctx.getImageData(0, 0, width, height);
        const data = imageData_obj.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          
          let adjusted = gray;
          if (gray < 128) {
            adjusted = Math.max(0, gray - 30);
          } else {
            adjusted = Math.min(255, gray + 20);
          }
          
          const contrast = 1.3;
          adjusted = ((adjusted - 128) * contrast) + 128;
          adjusted = Math.max(0, Math.min(255, adjusted));
          
          data[i] = data[i + 1] = data[i + 2] = adjusted;
        }
        
        ctx.putImageData(imageData_obj, 0, 0);
        
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.src = imageData;
    });
  }

  private extractFields(text: string): Partial<PaymentFields> {
    const fields: Partial<PaymentFields> = { ...emptyFields };

    const cleanedText = this.cleanOCRText(text);
    console.log('=== RAW OCR TEXT ===');
    console.log(text.substring(0, 3000));
    console.log('=== CLEANED TEXT ===');
    console.log(cleanedText.substring(0, 3000));

    // Извлекаем из всего текста (до разделения на блоки)
    fields.number = this.extractPaymentNumber(cleanedText) || '';
    fields.date = this.extractDate(cleanedText) || '';
    fields.amount = this.extractAmount(cleanedText) || '';
    fields.amountRub = this.extractAmountWords(cleanedText) || '';
    fields.уин = this.extractUIN(cleanedText) || '';
    fields.очередность = this.extractQueue(cleanedText) || '';

    // Разделяем на блоки для плательщика и получателя
    const payerData = this.extractPayerData(cleanedText);
    const recipientData = this.extractRecipientData(text);

    fields.payerInn = payerData.inn;
    fields.payerKpp = payerData.kpp;
    fields.payerAccount = payerData.account;
    fields.payer = payerData.name;
    fields.payerBank = payerData.bank;
    fields.payerBik = payerData.bik;

    fields.recipientInn = recipientData.inn;
    fields.recipientKpp = recipientData.kpp;
    fields.recipientAccount = recipientData.account;
    fields.recipient = recipientData.name;
    fields.recipientBank = recipientData.bank;
    fields.recipientBik = recipientData.bik;

    // Назначение платежа - ищем между "Получатель" и "Назначение платежа"
    fields.paymentPurpose = this.extractPaymentPurpose(text) || '';

    console.log('Payer:', JSON.stringify(payerData));
    console.log('Recipient:', JSON.stringify(recipientData));
    console.log('Payment purpose:', fields.paymentPurpose);

    return fields;
  }

  private cleanOCRText(text: string): string {
    let cleaned = text
      .replace(/[|]/g, ' ')
      .replace(/[━─_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[«»„""'']/g, '"')
      .replace(/[oO](?=\d{20})/g, '0')
      .replace(/l(?=\d)/g, '1')
      .trim();
    
    return cleaned;
  }

  private extractPaymentNumber(text: string): string | null {
    const patterns = [
      /(?:ПОРУЧЕНИЕ)[^\d]*(\d+)/i,
      /(?:поручение)[^\d]*(\d+)/i,
      /ПОРУ\s*ЧЕНИ[ЕЯ][^\d]*(\d+)/i,
      /[№N]\s*(\d+)/,
      /(?:номер|no)\s*[:.]?\s*(\d{4,8})/i,
      /(?:№)\s*(\d{1,8})/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        console.log('Found number with pattern:', pattern, '->', match[1]);
        return match[1];
      }
    }
    return null;
  }

  private extractDate(text: string): string | null {
    const patterns = [
      /(\d{2})\.(\d{2})\.(\d{4})/,
      /(\d{2})\.(\d{2})\.(\d{2})(?!\d)/,
      /(\d{2})\/(\d{2})\/(\d{4})/,
      /(?:от\s*)?(\d{2})[\.\/](\d{2})[\.\/](\d{2,4})/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let day = match[1];
        let month = match[2];
        let year = match[3];
        if (year.length === 2) year = '20' + year;
        console.log('Found date with pattern:', pattern, '->', `${day}.${month}.${year}`);
        return `${day}.${month}.${year}`;
      }
    }
    return null;
  }

  private extractAmount(text: string): string | null {
    // Сначала ищем сумму в начале текста (до блока плательщика)
    const lines = text.split('\n');
    const headerEndIndex = lines.findIndex(l => 
      l.toLowerCase().includes('плательщик') || 
      l.toLowerCase().includes('получатель')
    );
    
    const headerLines = headerEndIndex > 0 ? lines.slice(0, headerEndIndex) : lines.slice(0, 10);
    const headerText = headerLines.join('\n');
    
    // Ищем сумму в заголовке с разными разделителями: = , . или -
    const headerAmountMatch = headerText.match(/(?:сумма|итого)[^\d]*(\d{1,12}(?:\s\d{3})*)[=\-,\.](\d{2})/i);
    if (headerAmountMatch) {
      const num = parseInt(headerAmountMatch[1].replace(/\s/g, ''));
      const kopeks = headerAmountMatch[2];
      console.log('Found amount in header:', num.toLocaleString('ru-RU') + ',' + kopeks);
      return num.toLocaleString('ru-RU') + ',' + kopeks.padStart(2, '0');
    }
    
    // Если не нашли, ищем сумму в формате XXXXXX= или XXXXXX-XX
    const eqAmountMatch = headerText.match(/(\d{1,12})[=\-](\d{2})/);
    if (eqAmountMatch) {
      const num = parseInt(eqAmountMatch[1]);
      if (num >= 100) {
        console.log('Found amount with separator:', num.toLocaleString('ru-RU') + ',' + eqAmountMatch[2]);
        return num.toLocaleString('ru-RU') + ',' + eqAmountMatch[2].padStart(2, '0');
      }
    }
    
    // Fallback: ищем все суммы и берем самую большую
    const allAmounts: { num: number; formatted: string }[] = [];
    const amountMatches = text.matchAll(/(\d{1,12}(?:\s\d{3})*)[=\-,\.](\d{2})/g);
    for (const match of amountMatches) {
      const amountStr = match[1].replace(/\s/g, '');
      const kopeks = match[2];
      const num = parseInt(amountStr);
      if (num >= 100 && num <= 100000000000) {
        allAmounts.push({ 
          num, 
          formatted: num.toLocaleString('ru-RU') + ',' + kopeks.padStart(2, '0') 
        });
      }
    }
    
    if (allAmounts.length > 0) {
      const maxAmount = allAmounts.reduce((max, curr) => curr.num > max.num ? curr : max);
      console.log('Found max amount:', maxAmount.formatted);
      return maxAmount.formatted;
    }
    
    return null;
  }

  private extractAmountWords(text: string): string | null {
    const match = text.match(/(?:[а-яА-ЯёЁ]+\s+){1,10}(?:рубл(?:ей|я)\s+\d+\s*коп(?:еек|ей)?)/i);
    if (match) return match[0].trim().substring(0, 200);
    
    const rubOnly = text.match(/([а-яА-ЯёЁ]+\s+рубл(?:ей|я))/i);
    if (rubOnly) return rubOnly[1].trim().substring(0, 200);
    return null;
  }

  private extractPayerData(text: string): { inn: string; kpp: string; account: string; name: string; bank: string; bik: string } {
    const result = { inn: '', kpp: '', account: '', name: '', bank: '', bik: '' };
    
    const payerStartIndex = text.toLowerCase().indexOf('плательщик');
    const recipientStartIndex = text.toLowerCase().indexOf('получатель');
    
    const beforePayer = text.substring(0, payerStartIndex >= 0 ? payerStartIndex : text.length);
    const betweenSections = text.substring(payerStartIndex >= 0 ? payerStartIndex : 0, recipientStartIndex >= 0 ? recipientStartIndex : text.length);
    
    console.log('=== BEFORE PAYER ===');
    console.log(beforePayer);
    console.log('=== BETWEEN SECTIONS ===');
    console.log(betweenSections);
    
    // ИНН - берём из "до" секции
    const allInns = [...beforePayer.matchAll(/инн[^\d]*(\d{10,13})/gi)];
    if (allInns.length > 0) result.inn = allInns[0][1];
    
    // КПП
    const kppMatch = beforePayer.match(/кпп[^\d]*(\d{9})/i);
    if (kppMatch) result.kpp = kppMatch[1];
    
    // ООО - с кавычками
    const oooMatch = beforePayer.match(/ооо[^\w"]*"([^"]+)"/i);
    if (oooMatch) result.name = 'ООО "' + oooMatch[1].trim() + '"';
    
    // АО, ЗАО - ищем в beforePayer и betweenSections
    const searchArea = beforePayer + ' ' + betweenSections;
    if (!result.name) {
      const aoMatch = searchArea.match(/зао[^\w"]*"([^"]+)"/i);
      if (aoMatch) result.name = 'ЗАО "' + aoMatch[1].trim() + '"';
    }
    if (!result.name) {
      const aoMatch = searchArea.match(/ао[^\w"]*"([^"]+)"/i);
      if (aoMatch) result.name = 'АО "' + aoMatch[1].trim() + '"';
    }
    if (!result.name) {
      const oooMatch = searchArea.match(/ооо[^\w"]*"([^"]+)"/i);
      if (oooMatch) result.name = 'ООО "' + oooMatch[1].trim() + '"';
    }
    
    // Счёт (с учётом OCR-артефактов)
    const accountMatch = beforePayer.match(/сч[.,\s]*№?\s*(\d{20,21})/i);
    if (accountMatch) result.account = accountMatch[1];
    
    // БИК - ищем везде, с учётом артефактов OCR [Бик [
    const allBiks = [...text.matchAll(/бик[^\d]*[\[]?\s*(\d{9})/gi)];
    console.log('BIK matches:', allBiks.map(m => m[1]));
    if (allBiks.length > 0) result.bik = allBiks[0][1];
    
    // Банк
    const bankMatch = text.match(/(?:пао\s+)?сбербанк/i);
    if (bankMatch) result.bank = 'ПАО Сбербанк';
    
    console.log('Payer extracted:', JSON.stringify(result));
    return result;
  }

  private extractRecipientData(text: string): { inn: string; kpp: string; account: string; name: string; bank: string; bik: string } {
    const result = { inn: '', kpp: '', account: '', name: '', bank: '', bik: '' };
    
    // Ищем все ИНН и берём последний (он для получателя)
    const allInns = [...text.matchAll(/инн[^\d]*(\d{10,13})/gi)];
    console.log('All INNs:', allInns.map(m => m[1]));
    if (allInns.length > 0) result.inn = allInns[allInns.length - 1][1];
    
    // КПП после последнего ИНН
    if (result.inn) {
      const lastInnMatch = allInns[allInns.length - 1];
      const textAfterInn = text.substring(lastInnMatch.index! + lastInnMatch[0].length, lastInnMatch.index! + lastInnMatch[0].length + 200);
      const kppMatch = textAfterInn.match(/кпп[^\d]*(\d{9})/i);
      if (kppMatch) result.kpp = kppMatch[1];
    }
    
    // БИК получателя - между "Банк Плательщика" и "Банк Получателя" (или последний БИК)
    const allBiks = [...text.matchAll(/бик[^\d]*[\[]?\s*(\d{9})/gi)];
    console.log('All BIKs:', allBiks.map(m => m[1]));
    if (allBiks.length >= 2) {
      // Берём второй БИК (банк получателя)
      result.bik = allBiks[1][1];
    } else if (allBiks.length === 1) {
      result.bik = allBiks[0][1];
    }
    
    // Банк Получателя
    if (result.bik === '044525225') {
      result.bank = 'ПАО Сбербанк';
    }
    
    // ООО после "Банк Получателя"
    const bankRecipientIndex = text.indexOf('Банк Получателя');
    if (bankRecipientIndex >= 0) {
      const afterBank = text.substring(bankRecipientIndex);
      
      // ООО с кавычками
      const oooMatch = afterBank.match(/ооо["\s]+"([^"]+)"/i);
      if (oooMatch) {
        result.name = 'ООО "' + oooMatch[1].trim() + '"';
      }
      
      // ООО без кавычек или с неправильными (ограничиваем до 30 символов)
      if (!result.name) {
        const oooSimple = afterBank.match(/ооо["\s]*([А-ЯЁа-яё][^"\n]{2,30})/i);
        if (oooSimple) {
          result.name = 'ООО "' + oooSimple[1].trim().replace(/["\s]+$/, '') + '"';
        }
      }
      
      // Полное название ООО (Общество с ограниченной ответственностью)
      if (!result.name) {
        // Ищем "Общество с ограниченной ответственностью" и затем название в кавычках
        const fullOooMatch = afterBank.match(/общен?ство\s+с\s+ограниченной\s+ответственностью[\s\S]{0,100}"([^"]{2,50})"/i);
        if (fullOooMatch) {
          result.name = 'ООО "' + fullOooMatch[1].trim() + '"';
          console.log('Found full OOO name:', result.name);
        }
      }
      
      // ИП (ограничиваем до 3 слов ФИО)
      const ipMatch = afterBank.match(/индивидуальный\s+предприниматель\s+([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){1,2})/i);
      if (ipMatch) {
        result.name = 'ИП ' + ipMatch[1].trim();
      }
      
      // Счёт (с учётом OCR артефактов)
      const accountMatch = afterBank.match(/сч[.\s]*№?\s*[^\d]*(\d{20,21})/i);
      if (accountMatch) result.account = accountMatch[1];
    }
    
    console.log('Recipient extracted:', JSON.stringify(result));
    return result;
  }
  
  private getLineStartIndex(text: string, lineIndex: number): number {
    const lines = text.split('\n');
    let charIndex = 0;
    for (let i = 0; i < lineIndex && i < lines.length; i++) {
      charIndex += lines[i].length + 1;
    }
    return charIndex;
  }

  private extractINN(text: string): string {
    const match = text.match(/\b(\d{10,12})\b/);
    return match ? match[1] : '';
  }

  private extractKPP(text: string): string {
    const match = text.match(/\b(\d{9})\b/);
    return match ? match[1] : '';
  }

  private extractBIK(text: string): string {
    const match = text.match(/\b(\d{9})\b/);
    return match ? match[1] : '';
  }

  private extractAccount(text: string): string {
    const match = text.match(/(\d{20})/);
    return match ? match[1] : '';
  }

  private extractBankName(text: string): string | null {
    const match = text.match(/(?:ПАО\s+)?СБЕРБАНК[А-Яа-яЁё\s]*/i);
    if (match) return match[0].trim();
    
    const ufkMatch = text.match(/УФК[А-Яа-яЁё\s]*/i);
    if (ufkMatch) return ufkMatch[0].trim();
    
    return null;
  }

  private extractOrganizationName(text: string): string | null {
    const lines = text.split('\n');
    
    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.match(/^(?:инн|кпп|бик|банк|ч\.|$)/i)) continue;
      
      const words = cleanLine.split(/\s+/);
      if (words.length >= 2 && words.length <= 4) {
        const validWords = words.filter(w => /^[А-ЯЁ][а-яё]+$/.test(w));
        if (validWords.length >= 2 && cleanLine.length > 8 && cleanLine.length < 60) {
          return cleanLine;
        }
      }
    }
    
    return null;
  }

  private extractPaymentPurpose(text: string): string | null {
    const lines = text.split('\n');
    const lowerLines = lines.map(l => l.toLowerCase());
    
    console.log('Purpose: total lines =', lines.length);
    
    // МЕТОД 1 (самый надёжный): между "Получатель" и "Назначение платежа"
    const startIdx = lowerLines.findIndex(l => /^получатель$/.test(l.trim()));
    const endIdx = lowerLines.findIndex(l => l.includes('назначение платежа'));
    if (startIdx >= 0 && endIdx > startIdx) {
      const purposeLines: string[] = [];
      for (let i = startIdx + 1; i < endIdx; i++) {
        const trimmed = lines[i].trim();
        if (!trimmed || trimmed.length < 3) continue;
        if (/^[-_=—]+$/.test(trimmed)) continue;
        if (/^(вид\s*оп|очеред|инн|кпп|бик|банк|сч|уин)/i.test(trimmed)) continue;
        purposeLines.push(trimmed);
      }
      if (purposeLines.length > 0) {
        const result = purposeLines.join(' ').substring(0, 500);
        console.log('Purpose method 1: between markers, found:', result.substring(0, 100));
        return result;
      }
    }
    
    // МЕТОД 2: до "Назначение платежа" (до 5 строк)
    const purposeLabelIndex = lowerLines.findIndex(l => l.includes('назначение платежа'));
    if (purposeLabelIndex >= 0) {
      const purposeLines: string[] = [];
      for (let i = purposeLabelIndex - 5; i < purposeLabelIndex; i++) {
        if (i < 0) continue;
        const trimmed = lines[i].trim();
        if (!trimmed || trimmed.length < 3) continue;
        if (/^[-_=—]+$/.test(trimmed)) continue;
        if (/^(вид\s*оп|очеред|инн|кпп|бик|банк|сч|уин)/i.test(trimmed)) continue;
        purposeLines.push(trimmed);
      }
      if (purposeLines.length > 0) {
        const result = purposeLines.join(' ').substring(0, 500);
        console.log('Purpose method 2: before label, found:', result.substring(0, 100));
        return result;
      }
    }
    
    // МЕТОД 3 (менее надёжный): строки с типичными словами назначения
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (/^(оплат[ае]|перечисл|возврат|взнос|поступлен|задолжен|аванс|оплата\s+за)/i.test(trimmed)) {
        console.log('Purpose method 3: typical words, found:', trimmed.substring(0, 100));
        return trimmed.substring(0, 500);
      }
    }
    
    // МЕТОД 4 (fallback): после наименования
    const result = this.extractPurposeAfterName(text);
    if (result) {
      console.log('Purpose method 4: after name, found:', result.substring(0, 100));
      return result;
    }
    
    console.log('Purpose: no method worked');
    return null;
  }

  private extractPurposeAfterName(text: string): string | null {
    const lines = text.split('\n');
    const purposeLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed || trimmed.length < 3) continue;
      if (/^[-_=—]+$/.test(trimmed)) continue;
      if (/^(инн|кпп|бик|банк|сч|очеред|уин|вид\s*оп)/i.test(trimmed)) break;
      if (/^(подпис|отметк|банк)/i.test(trimmed)) break;
      
      purposeLines.push(trimmed);
      if (purposeLines.length >= 10) break;
    }
    
    if (purposeLines.length > 0) {
      return purposeLines.join(' ').substring(0, 500);
    }
    return null;
  }

  private extractUIN(text: string): string | null {
    const match = text.match(/уин[:\s]*(\d+)/i);
    return match ? match[1] : null;
  }

  private extractQueue(text: string): string | null {
    const match = text.match(/очередность[:\s]*(\d)/i);
    return match ? match[1] : null;
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

export const ocrService = new OCRService();
