const BASE_URL = 'https://7201.api.green-api.com';

export interface SendMessageResponse {
  idMessage: string;
}

export interface ReceiveNotificationResponse {
  receiptId: number;
  body: {
    typeWebhook: string;
    idMessage?: string;
    senderData?: {
      chatId: string;
      senderName?: string;
    };
    messageData?: {
      typeMessage: string;
      textMessageData?: {
        textMessage: string;
      };
    };
  };
}

export const greenApi = {
  // Отправка текстового сообщения
  sendMessage: async (
  idInstance: string,
  apiTokenInstance: string,
  chatId: string,
  message: string
): Promise<SendMessageResponse> => {
  const url = `${BASE_URL}/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;
  
  // Очищаем от плюсов, пробелов и тире, берем только цифры:
  const cleanNumber = chatId.replace(/\D/g, '');
  const formattedChatId = `${cleanNumber}@c.us`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chatId: formattedChatId,
      message,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Ошибка сервера:', errorData);
    throw new Error(`Ошибка отправки: ${response.statusText}`);
  }

  return response.json();
},

  // Получение уведомления из очереди (Long Polling)
  receiveNotification: async (
    idInstance: string,
    apiTokenInstance: string
  ): Promise<ReceiveNotificationResponse | null> => {
    const url = `${BASE_URL}/waInstance${idInstance}/receiveNotification/${apiTokenInstance}`;

    const response = await fetch(url, { method: 'GET' });

    if (!response.ok) {
      throw new Error(`Ошибка получения: ${response.statusText}`);
    }

    // Если очередь пуста, сервер может вернуть пустой ответ
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  },

  // Удаление уведомления из очереди по receiptId
  deleteNotification: async (
    idInstance: string,
    apiTokenInstance: string,
    receiptId: number
  ): Promise<{ result: boolean }> => {
    const url = `${BASE_URL}/waInstance${idInstance}/deleteNotification/${apiTokenInstance}/${receiptId}`;

    const response = await fetch(url, { method: 'DELETE' });

    if (!response.ok) {
      throw new Error(`Ошибка удаления: ${response.statusText}`);
    }

    return response.json();
  },
};