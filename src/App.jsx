import { FiMessageSquare } from 'react-icons/fi';
import { getResponse } from './utils/langchain';
import { useChat } from './hooks/useChat';
import Message from './components/Message';
import TypingIndicator from './components/TypingIndicator';
import WelcomeMessage from './components/WelcomeMessage';
import ChatInput from './components/ChatInput';
import './App.css';

function App() {
  const {
    messages,
    setMessages,
    inputMessage,
    setInputMessage,
    isLoading,
    setIsLoading,
    messagesEndRef,
    inputRef,
  } = useChat();

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    const response = await getResponse(messages, inputMessage);

    const botResponse = {
      id: Date.now() + 1,
      text: response,
      sender: 'bot',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, botResponse]);
    setIsLoading(false);
  };

  return (
    <div className="chat-container">
      {/* Header */}
      <header className="chat-header">
        <div className="chat-logo">
          <div className="chat-logo-icon">
            <FiMessageSquare />
          </div>
          <div>
            <h1 className="chat-title">Medi-Chat</h1>
            <p className="chat-subtitle">AI Healthcare Assistant</p>
          </div>
        </div>
        <div className="chat-status">
          <span className="status-indicator"></span>
          <span>Online</span>
        </div>
      </header>

      {/* Messages Container */}
      <div className="messages-container">
        {messages.length === 1 && <WelcomeMessage />}

        <div className="messages-list">
          {messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              isUser={message.sender === 'user'}
            />
          ))}

          {isLoading && <TypingIndicator />}

          <div ref={messagesEndRef} className="message-end" />
        </div>
      </div>

      {/* Input Area */}
      <ChatInput
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        handleSendMessage={handleSendMessage}
        isLoading={isLoading}
        inputRef={inputRef}
      />
    </div>
  );
}

export default App;
