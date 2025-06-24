import { useState, useRef, useEffect } from 'react';
import { FiSend, FiUser, FiMessageSquare, FiAlertCircle } from 'react-icons/fi';
import { combineDocuments, llm, retriever } from './utils/embeddingUtils';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnablePassthrough, RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';

import './App.css';
import { formatConvHistory } from './utils/formatConvHistory';

const standaloneQuestionTemplate = `Given some conversation history (if any) and a question,
 convert the question to a standalone question.
 conversation history: {conv_history}
 question: {question}
 standalone question:`

const standaloneQuestionPrompt = PromptTemplate.fromTemplate(standaloneQuestionTemplate)

const answerTemplate = `
Prompt:
As a medical assistant knowledgeable about NABH standards, 
your goal is to provide accurate answers to questions raised by the end user. 
You should rely on the context provided and refer to the conversation history when 
necessary to ensure the correctness of your responses. Avoid fabricating information; 
if uncertain, humbly seek advice from a human and maintain a friendly demeanor throughout. 
Your role is to assist as a reliable source of information while maintaining a 
supportive and approachable tone. Remember to prioritize accuracy and clarity in your responses.
context: {context}
question: {question}
conversation history: {conv_history}
answer: `

const answerPrompt = PromptTemplate.fromTemplate(answerTemplate);

const standaloneQuestionChain = standaloneQuestionPrompt.pipe(llm).pipe(new StringOutputParser());
const retrieverChain = RunnableSequence.from([
  prevResult => prevResult.standalone_question,
  retriever,
  combineDocuments
])
const answerChain = answerPrompt.pipe(llm).pipe(new StringOutputParser())

const chain = RunnableSequence.from([
  {
    standalone_question: standaloneQuestionChain,
    original_input: new RunnablePassthrough()
  },
  {
    context: retrieverChain,
    question: ({ original_input }) => original_input.question,
    conv_history: ({ original_input }) => original_input.conv_history,
  },
  answerChain
])

const Message = ({ message, isUser }) => (
  <div className={`message ${isUser ? 'user' : 'bot'}`}>
    <div className="message-avatar">
      {isUser ? <FiUser /> : <FiMessageSquare />}
    </div>
    <div className="message-content">
      {message.text.split('\n').map((paragraph, i) => (
        <p key={i} className="message-text">
          {paragraph || <br />}
        </p>
      ))}
      <span className="message-time">
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  </div>
);

const TypingIndicator = () => (
  <div className="typing-indicator">
    <div className="typing-dots">
      <div className="typing-dot"></div>
      <div className="typing-dot"></div>
      <div className="typing-dot"></div>
    </div>
    <span className="typing-text">Thinking...</span>
  </div>
);

const WelcomeMessage = () => (
  <div className="welcome-message">
    <div className="welcome-icon">
      <FiMessageSquare size={24} />
    </div>
    <h2 className="welcome-title">Welcome to Medi-Chat</h2>
    <p className="welcome-subtitle">How can I assist you with your medical questions today?</p>
  </div>
);

function App() {
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      text: 'Hello! I\'m your Medi-Chat assistant. How can I help you with your medical questions today?', 
      sender: 'bot',
      timestamp: new Date(Date.now() - 60000)
    },
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    inputRef.current?.focus();
    document.body.style.opacity = '1';
    document.body.style.transition = 'opacity 0.3s ease-in-out';
    
    return () => {
      document.body.style.opacity = '0';
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
    console.log(messages);
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    const response = await getResponse()

    const botResponse = {
      id: Date.now() + 1,
      text: response,
      sender: 'bot',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, botResponse]);
    setIsLoading(false);
  };

  const getResponse = async () => {
    try {
      const response = await chain.invoke({
        question: inputMessage,
        conv_history: formatConvHistory(messages)
      });
      return response
    } catch (error) {
      console.error('Error getting question response:', error);
    }
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
        <WelcomeMessage />
        
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
      <div className="chat-input-container">
        <div className="input-wrapper">
          <div className="input-header">
            <span className="input-label">Message</span>
            <span className="input-char-count">{inputMessage.length}/500</span>
          </div>
          
          <form onSubmit={handleSendMessage} className="message-form">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value.slice(0, 500))}
              placeholder="Type your medical question here..."
              className="message-input"
              disabled={isLoading}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage(e)}
              maxLength={500}
              aria-label="Type your message"
            />
            <button 
              type="submit" 
              className="send-button"
              disabled={!inputMessage.trim() || isLoading}
              aria-label="Send message"
            >
              <FiSend />
            </button>
          </form>
          
          <div className="disclaimer">
            <FiAlertCircle size={14} />
            <span>For medical emergencies, please contact a healthcare professional immediately.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
