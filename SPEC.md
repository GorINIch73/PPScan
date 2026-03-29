# PPScan - Спецификация проекта

## 1. Обзор проекта
- **Название**: PPScan
- **Тип**: Android-приложение (Capacitor + Vue.js)
- **Описание**: Мобильное приложение для сканирования и распознавания реквизитов банковских платежных поручений с возможностью хранения, управления и экспорта данных

## 2. Технологический стек

### Фронтенд
- **Framework**: Vue 3 + TypeScript
- **UI**: Quasar Framework (Material Design)
- **Сборка**: Vite

### Мобильная платформа
- **Capacitor**: 6.x
- **Android**: API 26+ (minSdk 26)

### Библиотеки
- **OCR**: Tesseract.js v5 (с поддержкой кириллицы)
- **База данных**: Dexie.js (IndexedDB wrapper)
- **Камера**: @capacitor/camera
- **Файловая система**: @capacitor/filesystem
- **Шаринг**: @capacitor/share

## 3. Структура данных

### PaymentOrder (платежное поручение)
```typescript
interface PaymentOrder {
  id?: number;
  imageData: string;           // Base64 изображение
  createdAt: string;          // ISO timestamp
  status: 'pending' | 'verified';
  fields: {
    number: string;           // Номер поручения
    date: string;             // Дата (ДД.ММ.ГГГГ)
    amount: string;           // Сумма
    amountRub: string;        // Сумма прописью
    payer: string;            // Плательщик
    payerInn: string;         // ИНН плательщика
    payerKpp: string;         // КПП плательщика
    payerBank: string;        // Банк плательщика
    payerAccount: string;     // Счет плательщика
    payerBik: string;         // БИК плательщика
    recipient: string;        // Получатель
    recipientInn: string;     // ИНН получателя
    recipientKpp: string;     // КПП получателя
    recipientBank: string;    // Банк получателя
    recipientAccount: string;  // Счет получателя
    recipientBik: string;     // БИК получателя
    paymentType: string;      // Вид платежа
    paymentPurpose: string;   // Назначение платежа
    очередность: string;      // Очередность
    уин: string;              // УИН
  };
}
```

## 4. UI/UX Дизайн

### Цветовая палитра
- **Primary**: #1976D2 (синий - банковская тематика)
- **Secondary**: #424242 (темно-серый)
- **Accent**: #4CAF50 (зеленый - успех)
- **Error**: #F44336 (красный)
- **Background**: #FAFAFA
- **Surface**: #FFFFFF

### Экраны

#### 1. Главный экран (Список)
- FAB кнопка "Сканировать"
- Список сохраненных поручений (карточки)
- Поиск и фильтрация
- Меню экспорта

#### 2. Экран сканирования
- Камера с подсветкой границ
- Кнопка снимка
- Превью с обрезкой

#### 3. Экран распознавания
- Прогресс OCR
- Превью изображения
- Распознанные поля
- Индикаторы уверенности

#### 4. Экран редактирования
- Форма с полями реквизитов
- Сохранение/отмена

#### 5. Детали поручения
- Полная информация
- Редактирование
- Удаление
- Экспорт одного документа

## 5. Функциональность

### Сканирование
- Захват изображения камерой
- Предобработка (контраст, поворот)
- OCR распознавание Tesseract.js

### Распознавание полей
- Автоматическое извлечение по regex паттернам
- Поддержка кириллицы
- Ручная корректировка

### Хранение
- IndexedDB через Dexie.js
- Хранение base64 изображений
- Метаданные в JSON

### Экспорт
- CSV (все записи)
- XLSX (с форматированием)
- Шаринг через систему

## 6. Структура проекта
```
PPScan/
├── src/
│   ├── components/        # Vue компоненты
│   ├── pages/            # Страницы (Quasar pages)
│   ├── stores/           # Pinia stores
│   ├── services/         # Сервисы (OCR, DB)
│   ├── types/            # TypeScript типы
│   └── utils/             # Утилиты
├── capacitor.config.ts
└── android/              # Android проект
```

## 7. Требования к сборке
- minSdk: 26
- targetSdk: 34
- Gradle 8.x
- Java 17+
