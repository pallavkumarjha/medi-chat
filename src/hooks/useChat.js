import { useState, useEffect, useRef } from 'react';

export const useChat = () => {
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
  }, [messages]);

  return { messages, setMessages, inputMessage, setInputMessage, isLoading, setIsLoading, messagesEndRef, inputRef };
};
