import { useState } from 'react';
import { Send, Bot, User, Sparkles, HelpCircle, ArrowRight, Printer, Download, FileText } from 'lucide-react';
import useAppStore from '../store/appStore';
import useCustomerStore from '../store/customerStore';
import useSettingsStore from '../store/settingsStore';
import { processLocalQuery } from '../services/queryAI';
import { printSalesReportHTML } from '../../../../shared/utils/generateInvoice';
import './QueryAI.css';

const DEFAULT_SUGGESTIONS = [
  'Aaj ka sales kitna hai?',
  'Aaj ka net profit dikhao',
  'Aaj ka total kharcha dekho',
  'Kal ka sales aur profit',
  'Is hafte ka profit',
  'Sales report PDF download',
  'Pending payments dikhao',
  'Dukaan mein kitne ready kapde hain',
];

export default function QueryAI() {
  const { orders, expenses } = useAppStore();
  const { customers } = useCustomerStore();
  const { shopInfo } = useSettingsStore();

  const [input, setInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'bot',
      message: 'Namaste! Main aapka DARJI Smart Assistant hoon. Aap muzse dukaan ka koi bhi sawal poochh sakte hain (Hindi/English).',
      details: null,
      suggestions: DEFAULT_SUGGESTIONS,
      timestamp: new Date(),
    },
  ]);

  const handleSend = (textToSend) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg = {
      sender: 'user',
      message: query,
      timestamp: new Date(),
    };

    const response = processLocalQuery(query, { orders, expenses, customers, shopInfo });

    const botMsg = {
      sender: 'bot',
      message: response.message,
      details: response.details,
      reportData: response.reportData || null,
      suggestions: response.suggestions || DEFAULT_SUGGESTIONS,
      timestamp: new Date(),
    };

    setChatHistory(prev => [...prev, userMsg, botMsg]);
    if (!textToSend) setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDownloadReportPDF = (reportData) => {
    if (!reportData) return;
    printSalesReportHTML(reportData);
  };

  return (
    <div className="query-ai">
      <div className="query-ai__banner">
        <div className="query-ai__banner-info">
          <Sparkles className="query-ai__banner-icon" size={24} />
          <div>
            <h3>DARJI Local Query Assistant</h3>
            <p>100% offline rule-based NLU · Zero API cost · Instant financial & order answers</p>
          </div>
        </div>
        <span className="query-ai__badge">⚡ Local Engine</span>
      </div>

      <div className="query-ai__chat-card">
        <div className="query-ai__chat-history">
          {chatHistory.map((msg, index) => (
            <div key={index} className={`query-ai__message query-ai__message--${msg.sender} animate-fade-in-up`}>
              <div className="query-ai__avatar">
                {msg.sender === 'bot' ? <Bot size={18} /> : <User size={18} />}
              </div>
              <div className="query-ai__content">
                <div className="query-ai__bubble">
                  <p>{msg.message}</p>

                  {/* Details Card */}
                  {msg.details && (
                    <div className="query-ai__details">
                      {msg.details.map((d, i) => (
                        <div key={i} className="query-ai__detail-row">
                          <span className="query-ai__detail-label">{d.label}</span>
                          <span className="query-ai__detail-value">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Download PDF Action Button */}
                  {msg.reportData && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.15)' }}>
                      <button
                        onClick={() => handleDownloadReportPDF(msg.reportData)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: '#F59E0B',
                          color: '#000000',
                          border: 'none',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          fontWeight: 800,
                          fontSize: '12px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <Printer size={15} /> 📄 Download / Print Sales Report (PDF)
                      </button>
                    </div>
                  )}
                </div>

                {/* Quick suggestions */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="query-ai__suggestions">
                    {msg.suggestions.map((sug, i) => (
                      <button key={i} className="query-ai__sug-btn" onClick={() => handleSend(sug)}>
                        {sug} <ArrowRight size={12} />
                      </button>
                    ))}
                  </div>
                )}
                <span className="query-ai__time">
                  {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="query-ai__input-bar">
          <input
            type="text"
            placeholder="Poochhein (e.g. Sales report PDF, Rahul ka naap, Aaj ka sales, Ready orders)..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="query-ai__input"
          />
          <button className="query-ai__send-btn" onClick={() => handleSend()} disabled={!input.trim()}>
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
