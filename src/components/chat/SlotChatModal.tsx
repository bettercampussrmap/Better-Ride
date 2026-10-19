import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Users,
  Clock,
  ShieldCheck,
  AlertCircle,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  Navigation,
  Car,
} from 'lucide-react';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase';
import { SlotWithDetails, Message } from '../../types/database';
import { formatTime12, formatDateForDisplay, formatMessageTime } from '../../lib/date-utils';
import { useToast } from '../ui/Toast';
import { toValidUuid, isValidUuid } from '../../lib/uuid-utils';
import { fetchMessagesForSlot, postMessageToSlot } from '../../lib/rides-service';

interface SlotChatModalProps {
  slot: SlotWithDetails | null;
  currentUserId: string;
  onClose: () => void;
}

export const SlotChatModal: React.FC<SlotChatModalProps> = ({
  slot,
  currentUserId,
  onClose,
}) => {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMemberList, setShowMemberList] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const quickPillMessages = [
    '📍 At Main Gate security cabin',
    '🛺 Auto driver asking ₹350, ready to share',
    '⏱️ Ready to leave in 5 mins',
    '👜 1 trolley bag with me',
  ];

  // Load message history & subscribe to Supabase Realtime channel
  useEffect(() => {
    if (!slot) return;

    if (!isSupabaseConfigured()) {
      const saved = localStorage.getItem(`local_chat_${slot.id}`);
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
        } catch {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    // 1. Fetch existing messages for this slot
    const fetchMessages = async () => {
      try {
        const loadedMessages = await fetchMessagesForSlot(slot.id);
        if (isMounted) {
          setMessages(loadedMessages);
          setTimeout(scrollToBottom, 100);
        }
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Error connecting to messages');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMessages();

    // 2. Setup slot-specific Supabase Realtime channel
    const channelName = `slot-chat-${slot.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `slot_id=eq.${slot.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;

          // Fetch sender profile if not populated
          let senderProfile = slot.members.find((m) => m.user_id === newMsg.user_id)?.profile;
          if (!senderProfile) {
            const { data: profData } = await supabase
              .from('profiles')
              .select('id, display_name, email, avatar_url')
              .eq('id', newMsg.user_id)
              .maybeSingle();
            if (profData) senderProfile = profData as any;
          }

          const messageWithProfile: Message = {
            ...newMsg,
            profile: senderProfile,
          };

          if (isMounted) {
            setMessages((prev) => {
              // Deduplicate by message ID
              if (prev.some((m) => m.id === messageWithProfile.id)) {
                return prev;
              }
              return [...prev, messageWithProfile];
            });
            setTimeout(scrollToBottom, 50);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Realtime channel error for slot:', slot.id);
        }
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [slot?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  if (!slot) return null;

  const handleSendMessage = async (textToSend?: string) => {
    if (sending) return; // Prevent double sending
    const raw = textToSend !== undefined ? textToSend : inputText;
    const trimmed = raw.trim();
    if (!trimmed) return;

    if (trimmed.length > 1000) {
      showToast('error', 'Message too long', 'Maximum length is 1000 characters.');
      return;
    }

    setSending(true);

    if (!isSupabaseConfigured()) {
      const localMsg: Message = {
        id: `local-msg-${Date.now()}`,
        slot_id: slot.id,
        user_id: currentUserId,
        content: trimmed,
        created_at: new Date().toISOString(),
        profile: {
          id: currentUserId,
          display_name: 'You (Student)',
          email: 'bettercampus.srmap@gmail.com',
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };

      const updated = [...messages, localMsg];
      setMessages(updated);
      localStorage.setItem(`local_chat_${slot.id}`, JSON.stringify(updated));
      setInputText('');
      setSending(false);
      setTimeout(scrollToBottom, 50);
      textareaRef.current?.focus();
      return;
    }

    try {
      const saved = await postMessageToSlot(slot.id, currentUserId, trimmed);
      if (saved) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === saved.id)) return prev;
          return [...prev, saved];
        });
      }
      setInputText('');
      setTimeout(scrollToBottom, 50);
    } catch (err: any) {
      console.warn('Send message error:', err);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const timeLabel = `${formatTime12(slot.start_time)} – ${formatTime12(slot.end_time)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#FFFEFA] border border-[#245C3A]/25 w-full sm:max-w-2xl h-full sm:h-[88vh] sm:max-h-[720px] rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-[#171A17]">
        {/* Header - Mobile friendly */}
        <div className="px-4 py-3.5 border-b border-gray-100 bg-white flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onClose}
              className="p-1.5 -ml-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors sm:hidden cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="w-9 h-9 rounded-xl bg-[#245C3A]/10 text-[#245C3A] flex items-center justify-center font-bold shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-[#183F2A] truncate">
                  {timeLabel}
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200 shrink-0">
                  Live
                </span>
              </div>
              <p className="text-[11px] text-[#245C3A] font-medium truncate">
                To {slot.destination}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Member list toggle button */}
            <button
              onClick={() => setShowMemberList(!showMemberList)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                showMemberList
                  ? 'bg-[#183F2A] text-white border-[#183F2A]'
                  : 'bg-[#F1F7F0] text-[#183F2A] border-[#245C3A]/20 hover:bg-[#245C3A]/10'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{slot.memberCount} members</span>
            </button>

            {/* Desktop Close button */}
            <button
              onClick={onClose}
              className="hidden sm:flex p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Member Details Drawer */}
        {showMemberList && (
          <div className="bg-[#F1F7F0] border-b border-[#245C3A]/15 px-4 py-3 shrink-0 animate-in slide-in-from-top-2 duration-150 max-h-48 overflow-y-auto">
            <h4 className="text-[11px] font-bold text-[#183F2A] mb-2 uppercase tracking-wider">
              Students in this auto / cab group ({slot.memberCount}):
            </h4>
            <div className="space-y-1.5">
              {slot.members.map((m) => {
                const name = m.profile?.display_name || m.profile?.email?.split('@')[0] || 'Student';
                const isMe = m.user_id === currentUserId || m.user_id === toValidUuid(currentUserId);
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#245C3A]/15 text-xs text-[#183F2A] shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {m.profile?.avatar_url ? (
                        <img
                          src={m.profile.avatar_url}
                          alt={name}
                          className="w-6 h-6 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#245C3A] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                          {name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-semibold truncate">
                        {name} {isMe && '(You)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] shrink-0 text-[#737B73]">
                      {m.ride_pref && (
                        <span className="bg-[#F1F7F0] px-2 py-0.5 rounded font-medium text-[#183F2A]">
                          {m.ride_pref === 'auto' ? '🛺 Auto' : m.ride_pref === 'cab' ? '🚕 Cab' : '✨ Flexible'}
                        </span>
                      )}
                      {m.pickup_note && (
                        <span className="truncate max-w-[120px] italic hidden sm:inline">
                          "{m.pickup_note}"
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-[#FFFEFA]">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-[#737B73] text-xs gap-2">
              <div className="w-6 h-6 border-2 border-[#245C3A] border-t-transparent rounded-full animate-spin" />
              <span>Loading slot group chat...</span>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-red-600 gap-2">
              <AlertCircle className="w-8 h-8" />
              <p className="font-semibold text-sm">Could not load messages</p>
              <p className="text-xs text-gray-500 max-w-xs">{error}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#737B73] space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F1F7F0] border border-[#245C3A]/15 flex items-center justify-center text-[#245C3A]">
                <Sparkles className="w-6 h-6 text-[#E6A15A]" />
              </div>
              <h4 className="text-sm font-bold text-[#183F2A]">Welcome to your Ride Group!</h4>
              <p className="text-xs max-w-xs leading-relaxed">
                Coordinate with your SRM-AP travel buddies! Say hello, ask who has found an auto, or specify where you are waiting near the gate.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe =
                msg.user_id === currentUserId ||
                msg.user_id === toValidUuid(currentUserId);
              const senderName =
                msg.profile?.display_name ||
                msg.profile?.email?.split('@')[0] ||
                (isMe ? 'You' : 'Student');
              const avatar = msg.profile?.avatar_url;

              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMe && (
                    <div className="w-7 h-7 rounded-full bg-[#245C3A] text-white flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0 shadow-xs ring-1 ring-white">
                      {avatar ? (
                        <img src={avatar} alt={senderName} className="w-full h-full object-cover" />
                      ) : (
                        senderName.charAt(0).toUpperCase()
                      )}
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 text-xs shadow-2xs ${
                      isMe
                        ? 'bg-[#245C3A] text-white rounded-br-xs'
                        : 'bg-white border border-gray-200 text-[#171A17] rounded-bl-xs'
                    }`}
                  >
                    {!isMe && (
                      <p className="font-bold text-[11px] text-[#183F2A] mb-0.5">
                        {senderName}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words leading-relaxed text-xs">
                      {msg.content}
                    </p>
                    <div
                      className={`text-[9px] mt-1 flex items-center justify-end font-mono ${
                        isMe ? 'text-emerald-100' : 'text-gray-400'
                      }`}
                    >
                      <span>{formatMessageTime(msg.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar & Quick Replies */}
        <div className="p-3 bg-white border-t border-gray-100 shrink-0 space-y-2">
          {/* Quick preset chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {quickPillMessages.map((pill) => (
              <button
                key={pill}
                type="button"
                onClick={() => handleSendMessage(pill)}
                className="px-2.5 py-1 rounded-xl text-[10px] font-medium bg-[#F1F7F0] hover:bg-[#245C3A]/15 text-[#183F2A] border border-[#245C3A]/15 whitespace-nowrap transition-colors cursor-pointer shrink-0"
              >
                {pill}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message your ride group... (Enter to send)"
              maxLength={1000}
              disabled={sending}
              className="flex-1 resize-none bg-[#F1F7F0] border border-[#245C3A]/20 rounded-2xl px-3.5 py-2.5 text-xs text-[#171A17] focus:outline-none focus:ring-2 focus:ring-[#245C3A] focus:bg-white placeholder-gray-400 transition-all max-h-24"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="p-3 rounded-2xl bg-[#245C3A] hover:bg-[#183F2A] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer shrink-0 active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
