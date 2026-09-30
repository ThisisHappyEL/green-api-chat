import { useState, useEffect, useRef } from 'react';
import type { AuthData } from '../App';
import { greenApi } from '../api/greenApi';

interface ChatProps {
  authData: AuthData;
  onLogout: () => void;
}

interface Message {
  id: string;
  text: string;
  sender: 'me' | 'them';
  timestamp: string;
}

export const Chat = ({ authData, onLogout }: ChatProps) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStartChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    setActiveChat(cleanNumber);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat) return;

    const messageText = inputText.trim();
    setInputText('');

    try {
      setIsLoading(true);
      const res = await greenApi.sendMessage(
        authData.idInstance,
        authData.apiTokenInstance,
        activeChat,
        messageText
      );

      const newMessage: Message = {
        id: res.idMessage,
        text: messageText,
        sender: 'me',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, newMessage]);
    } catch (error) {
      console.error(error);
      alert('Не удалось отправить сообщение');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const pollMessages = async () => {
      while (isMounted) {
        try {
          const data = await greenApi.receiveNotification(
            authData.idInstance,
            authData.apiTokenInstance
          );

          if (data && data.body) {
            // console.log('⚡ Пришло событие от GREEN-API:', data.body); Отладка
            const { receiptId, body } = data;

            const isTextMessage = body.messageData?.typeMessage === 'textMessage';
            const isIncoming = body.typeWebhook === 'incomingMessageReceived';
            const isOutgoingFromPhone = body.typeWebhook === 'outgoingMessageReceived';

            if (isTextMessage && (isIncoming || isOutgoingFromPhone)) {
              const incomingText = body.messageData?.textMessageData?.textMessage || '';
              const senderChatId = body.senderData?.chatId || '';
              const senderPhone = senderChatId.replace(/\D/g, '');

              if (activeChat && (senderPhone.includes(activeChat) || activeChat.includes(senderPhone))) {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: body.idMessage || `${receiptId}-${Date.now()}`,
                    text: incomingText,
                    sender: 'them',
                    timestamp: new Date().toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                  },
                ]);
              }
            }

            await greenApi.deleteNotification(
              authData.idInstance,
              authData.apiTokenInstance,
              receiptId
            );
          }
        } catch (error) {
          console.error('Ошибка при получении сообщения:', error);
          await new Promise((res) => setTimeout(res, 3000));
        }

        await new Promise((res) => setTimeout(res, 300));
      }
    };

    pollMessages();

    return () => {
      isMounted = false;
    };
  }, [authData, activeChat]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-white">
      {/* Левая колонка (Сайдбар) */}
      <div className="w-80 border-r border-slate-200 flex flex-col bg-white">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h1 className="font-bold text-slate-800 text-lg">Чаты</h1>
            <span className="text-xs text-slate-500">ID: {authData.idInstance}</span>
          </div>
          <button
            onClick={onLogout}
            title="Выйти"
            className="text-xs text-rose-500 hover:text-rose-700 font-medium border border-rose-200 hover:border-rose-400 px-2 py-1 rounded transition-colors"
          >
            Выход
          </button>
        </div>

        <div className="p-4 border-b border-slate-100">
          <form onSubmit={handleStartChat} className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Новый чат
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="79991234567"
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
              >
                +
              </button>
            </div>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeChat ? (
            <div className="p-3 bg-blue-50 border-l-4 border-blue-500 cursor-pointer flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center font-bold text-blue-700">
                {activeChat.slice(-2)}
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-semibold text-slate-800">+{activeChat}</div>
                <div className="text-xs text-slate-500 truncate">Чат активен</div>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-slate-400 mt-10">
              Введите номер телефона сверху, чтобы начать переписку
            </div>
          )}
        </div>
      </div>

      {/* Правая область (Чат) */}
      <div className="flex-1 flex flex-col h-full bg-[#8ec5fc]/30">
        {activeChat ? (
          <>
            <div className="h-16 bg-white border-b border-slate-200 px-6 flex items-center shadow-sm">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 mr-3">
                {activeChat.slice(-2)}
              </div>
              <div>
                <h2 className="font-semibold text-slate-800 text-sm">+{activeChat}</h2>
                <span className="text-xs text-slate-400">онлайн</span>
              </div>
            </div>

            {/* Сообщения */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <span className="bg-white/80 backdrop-blur-sm text-slate-500 text-xs px-3 py-1.5 rounded-full shadow-sm">
                    Сообщений пока нет. Напишите первым!
                  </span>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === 'me' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-md px-4 py-2 rounded-2xl text-sm shadow-sm relative ${
                        msg.sender === 'me'
                          ? 'bg-[#d9fdd3] text-slate-800 rounded-tr-none'
                          : 'bg-white text-slate-800 rounded-tl-none'
                      }`}
                    >
                      <p className="break-words">{msg.text}</p>
                      <span className="text-[10px] text-slate-400 float-right ml-2 mt-1">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Ввод сообщения */}
            <div className="p-4 bg-white border-t border-slate-200">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Введите сообщение..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-full focus:outline-none focus:border-blue-500 text-sm"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputText.trim()}
                  className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-6 py-2 rounded-full text-sm font-medium transition-colors"
                >
                  {isLoading ? '...' : 'Отправить'}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Выберите или создайте чат слева
          </div>
        )}
      </div>
    </div>
  );
};