import { FiUser, FiMessageSquare } from 'react-icons/fi';

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

export default Message;
