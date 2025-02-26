'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Define message types
interface Message {
  id: number;
  sender: 'bot' | 'user';
  text: string;
  emoji?: string;
  typing?: boolean;
}

// Sample conversation data
const initialConversation: Message[] = [
  {
    id: 1,
    sender: 'bot',
    text: 'Hi there! I\'m MindlyQ, your personal assistant. How can I help you today? 👋',
  }
];

// Full conversation data that will be revealed gradually
const fullConversation: Message[] = [
  {
    id: 1,
    sender: 'bot',
    text: 'Hi there! I\'m MindlyQ, your personal assistant. How can I help you today? 👋',
  },
  {
    id: 2,
    sender: 'user',
    text: 'Remind me to call mom tomorrow at 6pm',
    emoji: '📞',
  },
  {
    id: 3,
    sender: 'bot',
    text: 'Got it! I\'ll remind you to call mom tomorrow at 6:00 PM. Anything else? ✅',
  },
  {
    id: 4,
    sender: 'user',
    text: 'Save this article for my research project',
    emoji: '📑',
  },
  {
    id: 5,
    sender: 'bot',
    text: 'I\'ve saved this article to your "Research Project" collection. Would you like to add any tags? 🔖',
  },
  {
    id: 6,
    sender: 'user',
    text: 'Tag it as "important" and "reference"',
    emoji: '🏷️',
  },
  {
    id: 7,
    sender: 'bot',
    text: 'Perfect! I\'ve added the tags "important" and "reference" to this article in your Research Project collection. 👍',
  }
];

export function ChatDemo() {
  const [conversation, setConversation] = useState<Message[]>(initialConversation);
  const [currentIndex, setCurrentIndex] = useState(1);
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation]);

  // Progress the conversation automatically
  useEffect(() => {
    if (currentIndex < fullConversation.length) {
      const nextMessage = fullConversation[currentIndex];
      
      // Show typing indicator for bot messages
      if (nextMessage.sender === 'bot') {
        setIsTyping(true);
        const typingTimeout = setTimeout(() => {
          setIsTyping(false);
          setConversation(prev => [...prev, nextMessage]);
          setCurrentIndex(prev => prev + 1);
        }, 1500);
        
        return () => clearTimeout(typingTimeout);
      } else {
        // For user messages, wait a bit then show
        const userMessageTimeout = setTimeout(() => {
          setConversation(prev => [...prev, nextMessage]);
          setCurrentIndex(prev => prev + 1);
        }, 2000);
        
        return () => clearTimeout(userMessageTimeout);
      }
    }
    
    // Restart the conversation after a longer pause
    if (currentIndex === fullConversation.length) {
      const resetTimeout = setTimeout(() => {
        setConversation(initialConversation);
        setCurrentIndex(1);
      }, 8000);
      
      return () => clearTimeout(resetTimeout);
    }
  }, [currentIndex, conversation]);

  // Handle user input for demo purposes
  const handleSendMessage = () => {
    if (inputText.trim()) {
      // This is just for visual effect in the demo
      setInputText('');
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl overflow-hidden border border-neutral-1/10">
      <div className="aspect-square relative bg-gradient-to-br from-accent-1/10 to-highlight-1/10 rounded-xl overflow-hidden">
        <div className="absolute top-4 left-4 right-4 bottom-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <motion.div 
                className="w-10 h-10 rounded-full bg-accent-1 flex items-center justify-center text-white font-bold mr-3"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                MQ
              </motion.div>
              <div>
                <h4 className="font-bold text-primary text-sm">MindlyQ Assistant</h4>
                <p className="text-xs text-neutral-2">Online</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <div className="w-2 h-2 rounded-full bg-accent-2 animate-pulse"></div>
              <div className="w-2 h-2 rounded-full bg-highlight-1 animate-pulse" style={{ animationDelay: "0.5s" }}></div>
              <div className="w-2 h-2 rounded-full bg-accent-1 animate-pulse" style={{ animationDelay: "1s" }}></div>
            </div>
          </div>
          
          {/* Chat Messages */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto space-y-4 pr-2"
          >
            <AnimatePresence>
              {conversation.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${message.sender === 'bot' ? 'justify-start' : 'justify-end'}`}
                >
                  {message.sender === 'bot' && (
                    <div className="w-8 h-8 rounded-full bg-accent-1 flex-shrink-0 flex items-center justify-center text-white font-bold mr-2 text-xs">
                      MQ
                    </div>
                  )}
                  
                  <div className={`rounded-lg p-3 max-w-[80%] ${
                    message.sender === 'bot' 
                      ? 'bg-accent-1/10 text-primary' 
                      : 'bg-highlight-1/20 text-primary'
                  }`}>
                    <div className="flex items-end">
                      <p className="text-sm">{message.text}</p>
                      {message.emoji && (
                        <span className="ml-2 text-lg">{message.emoji}</span>
                      )}
                    </div>
                  </div>
                  
                  {message.sender === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-highlight-1 flex-shrink-0 flex items-center justify-center text-white font-bold ml-2 text-xs">
                      U
                    </div>
                  )}
                </motion.div>
              ))}
              
              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-start"
                >
                  <div className="w-8 h-8 rounded-full bg-accent-1 flex-shrink-0 flex items-center justify-center text-white font-bold mr-2 text-xs">
                    MQ
                  </div>
                  <div className="bg-accent-1/10 rounded-lg p-3">
                    <div className="flex space-x-1">
                      <motion.div 
                        className="w-2 h-2 rounded-full bg-accent-1"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: 0 }}
                      />
                      <motion.div 
                        className="w-2 h-2 rounded-full bg-accent-1"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
                      />
                      <motion.div 
                        className="w-2 h-2 rounded-full bg-accent-1"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Input Area */}
          <div className="mt-4 pt-3 border-t border-neutral-1/10 flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-neutral-1/10 rounded-full px-4 py-2 text-sm text-neutral-2 focus:outline-none focus:ring-2 focus:ring-accent-1/50"
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <motion.div 
              className="ml-2 w-8 h-8 rounded-full bg-accent-1 flex items-center justify-center text-white cursor-pointer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSendMessage}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Background decorative elements */}
      <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-highlight-2/30 rounded-full blur-xl -z-10"></div>
      <div className="absolute -top-4 -left-4 w-32 h-32 bg-accent-1/20 rounded-full blur-xl -z-10"></div>
    </div>
  );
}
