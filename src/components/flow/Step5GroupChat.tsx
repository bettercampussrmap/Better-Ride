import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, MapPin } from 'lucide-react';
import { SlotWithDetails, Message } from '../../types/database';
import { getSupabase } from '../../lib/supabase';
import { formatMessageTime } from '../../lib/date-utils';
import { fetchMessagesForSlot, postMessageToSlot } from '../../lib/rides-service';

interface Step5GroupChatProps {
  ride: SlotWithDetails;
  currentUserId: string;
  userName: string;
  onBack: () => void;
}

export const Step5GroupChat: React.FC<Step5GroupChatProps> = ({
  ride,
  currentUserId,
  userName,
  onBack,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickReplies = [
    "I'm at Gate 3.",
    'Auto mil gaya.',
    'Leaving in 5 minutes.',
    'Where are you?',
    'I have 1 trolley bag.',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load real messages & subscribe to Supabase Realtime channel + fast polling
  useEffect(() => {
    if (!ride) return;
    let isMounted = true;
    setLoading(true);

    const loadFreshMessages = async () => {
      try {
        const msgs = await fetchMessagesForSlot(ride.id);
        if (isMounted) {
          setMessages(msgs);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) setLoading(false);
      }
    };

    loadFreshMessages();

    // 1. Supabase Postgres Realtime listener
    const supabase = getSupabase();
    let channel: any = null;
    if (supabase) {
      channel = supabase
        .channel(`realtime_chat_${ride.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages', filter: `slot_id=eq.${ride.id}` },
          () => {
            loadFreshMessages();
            setTimeout(scrollToBottom, 60);
          }
        )
        .subscribe();
    }

    // 2. Continuous 2.5-second polling to guarantee instant synchronization across all devices
    const pollInterval = setInterval(() => {
      loadFreshMessages();
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [ride]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    setInputText('');

    // Optimistic message update
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      slot_id: ride.id,
      user_id: currentUserId,
      content: text,
      created_at: new Date().toISOString(),
      profile: {
        id: currentUserId,
        display_name: userName || 'You',
        email: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);

    const saved = await postMessageToSlot(ride.id, currentUserId, text, userName);
    if (saved) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMsg.id ? saved : m))
      );
      setTimeout(scrollToBottom, 50);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-h-[580px] bg-white rounded-xl border border-[#E4E4E7] shadow-2xs overflow-hidden animate-in fade-in duration-150">
      {/* Header bar */}
      <div className="px-3 py-2 border-b border-[#E4E4E7] flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="w-7 h-7 rounded-lg border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] flex items-center justify-center text-[#09090B] transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-[#09090B] tracking-tight">
                {ride.destination}
              </h3>
              <span className="px-1.5 py-0.2 rounded-full bg-[#09090B] text-white text-[9px] font-bold flex items-center gap-1">
                <span>👥</span>
                <span>{ride.memberCount || 1}/{ride.target_size || 4}</span>
              </span>
            </div>
            <p className="text-[10px] text-[#71717A] flex items-center gap-1 font-medium">
              <MapPin className="w-2.5 h-2.5" />
              <span>{ride.pickup_point || 'SRM AP Gate 3'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#FAFAF8]/50">
        {/* Coordination System Prompt */}
        <div className="bg-[#F4F4F5] border border-[#E4E4E7] rounded-lg p-2 text-center max-w-xs mx-auto shadow-2xs">
          <p className="text-[11px] text-[#71717A] leading-relaxed">
            Ride coordination for <strong className="text-[#09090B]">{ride.destination}</strong>. Pickup at <strong className="text-[#09090B]">{ride.pickup_point || 'SRM AP Gate 3'}</strong>. Send a message to coordinate departure!
          </p>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="w-4 h-4 border-2 border-[#09090B] border-t-transparent rounded-full animate-spin mx-auto mb-1" />
            <p className="text-[9px] font-semibold text-[#71717A]">Loading live messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-6 text-[#A1A1AA] text-xs font-medium">
            No messages yet. Send a quick update to the group!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === currentUserId;
            const senderName = msg.profile?.display_name || (isMe ? 'You' : 'Student');

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-0.5`}
              >
                <span className="text-[9px] font-bold text-[#71717A] px-1">
                  {senderName}
                </span>
                <div
                  className={`max-w-[82%] rounded-xl px-3 py-1.5 text-xs font-medium leading-relaxed shadow-2xs ${
                    isMe
                      ? 'bg-[#09090B] text-white rounded-br-xs'
                      : 'bg-white text-[#09090B] border border-[#E4E4E7] rounded-bl-xs'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[8px] text-[#A1A1AA] px-1">
                  {formatMessageTime(msg.created_at)}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer Area: Quick Replies & Input */}
      <div className="p-2.5 bg-white border-t border-[#E4E4E7] space-y-1.5 shrink-0">
        {/* Quick reply chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              type="button"
              onClick={() => handleSendMessage(reply)}
              className="px-2.5 py-1 rounded-full border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-[10px] font-semibold text-[#09090B] whitespace-nowrap transition-colors cursor-pointer shrink-0"
            >
              {reply}
            </button>
          ))}
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            placeholder="Message ride members..."
            className="flex-1 px-3 py-1.5 bg-[#F4F4F5] rounded-lg border border-transparent focus:border-[#09090B] focus:bg-white text-xs font-medium text-[#09090B] placeholder:text-[#A1A1AA] outline-none transition-all"
          />

          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim()}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              inputText.trim()
                ? 'bg-[#09090B] hover:bg-[#18181B] text-white shadow-2xs'
                : 'bg-[#F4F4F5] text-[#A1A1AA] cursor-not-allowed'
            }`}
            aria-label="Send message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
