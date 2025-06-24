import { FiSend, FiAlertCircle } from 'react-icons/fi';

const ChatInput = ({ inputMessage, setInputMessage, handleSendMessage, isLoading }) => (
  <div className="chat-input-container">
    <div className="input-wrapper">
      <div className="input-header">
        <span className="input-label">Message</span>
        <span className="input-char-count">{inputMessage.length}/500</span>
      </div>
      
      <form onSubmit={handleSendMessage} className="message-form">
        <input
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
            <span>
                <FiSend size={18}  />
            </span>
        </button>
      </form>
      
      <div className="disclaimer">
        <FiAlertCircle size={14} />
        <span>For medical emergencies, please contact a healthcare professional immediately.</span>
      </div>
    </div>
  </div>
);

export default ChatInput;
