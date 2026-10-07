import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Bot, User, Wrench, AlertTriangle, Thermometer, Droplets, Wind } from 'lucide-react';

const SUGGESTIONS = [
  { icon: Thermometer, text: 'La temperatura está baja, ¿qué hago?' },
  { icon: Droplets, text: 'El compost está muy húmedo' },
  { icon: Wind, text: 'El ventilador no arranca' },
  { icon: Wrench, text: 'La cadena del agitador está floja' },
  { icon: AlertTriangle, text: 'Hay una alarma en el panel, ¿cómo la reseteo?' },
  { icon: Wrench, text: '¿Cada cuánto hay que engrasar los rodamientos?' },
];

export default function Asistente() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu asistente técnico del BioComp 1545. Puedo ayudarte con problemas de mantenimiento, alarmas, temperatura, humedad, aireación y operación del equipo. ¿En qué puedo ayudarte hoy?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const userMsg = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-6);
      const res = await base44.functions.invoke('biocompAssistant', { message: msg, history });
      const reply = res.data?.reply || 'No pude procesar tu consulta. Intentá de nuevo.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Hubo un error al consultar. Por favor intentá de nuevo.' }]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const showSuggestions = messages.length === 1;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 font-heading">Asistente BioComp</h1>
          <p className="text-xs text-gray-500">Consultas técnicas del BioComp 1545</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          En línea
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-hide">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${
              msg.role === 'user' ? 'bg-gray-200' : 'bg-emerald-600'
            }`}>
              {msg.role === 'user'
                ? <User className="w-4 h-4 text-gray-600" />
                : <Bot className="w-4 h-4 text-white" />
              }
            </div>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-emerald-600 text-white rounded-tr-sm'
                : 'bg-card border border-border text-card-foreground rounded-tl-sm shadow-sm'
            }`}>
              {msg.content.split('\n').map((line, j) => (
                <span key={j}>
                  {line}
                  {j < msg.content.split('\n').length - 1 && <br />}
                </span>
              ))}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5 flex-row">
            <div className="w-7 h-7 rounded-lg shrink-0 bg-emerald-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {showSuggestions && !loading && (
          <div className="pt-2">
            <p className="text-xs text-gray-400 mb-2 text-center">Preguntas frecuentes</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s.text)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-left text-sm text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
                >
                  <s.icon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="pt-3 border-t border-gray-100">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Describí el problema o hacé tu consulta..."
            rows={1}
            disabled={loading}
            className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400 resize-none disabled:opacity-50 bg-white"
            style={{ minHeight: 44, maxHeight: 120 }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-40 shrink-0 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-center">
          Basado en el Manual de Mantenimiento BioComp 1545 · Kollvik
        </p>
      </div>
    </div>
  );
}