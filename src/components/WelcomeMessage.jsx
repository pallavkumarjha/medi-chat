import { FiMessageSquare, FiHelpCircle, FiShield, FiInfo } from 'react-icons/fi';

const WelcomeMessage = () => (
  <div className="welcome-message">
    <div className="welcome-icon">
      <FiMessageSquare color='white' size={32} />
    </div>
    <h2 className="welcome-title">Welcome to Medi-Chat</h2>
    <p className="welcome-subtitle">Your AI Healthcare Assistant, knowledgeable about NABH standards.</p>
  </div>
);

export default WelcomeMessage;
