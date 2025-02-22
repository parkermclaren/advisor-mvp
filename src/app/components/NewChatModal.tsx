import { Send } from "lucide-react";
import { useRef } from "react";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
}

export default function NewChatModal({ isOpen, onClose, onSubmit }: NewChatModalProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = inputRef.current?.value.trim();
    if (message) {
      onSubmit(message);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <textarea
              ref={inputRef}
              placeholder="Ask your academic advisor..."
              rows={1}
              className="w-full px-6 py-5 bg-white/25 backdrop-blur-2xl border border-white/50 
                       rounded-2xl text-gray-800 placeholder-gray-500/90 focus:outline-none 
                       focus:ring-2 focus:ring-white/40 focus:border-transparent text-lg 
                       shadow-[0_8px_32px_0_rgba(255,255,255,0.15)] backdrop-saturate-[1.3]
                       resize-none overflow-hidden min-h-[3.75rem] max-h-[20rem]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
                if (e.key === 'Escape') {
                  onClose();
                }
              }}
            />
            <button
              type="submit"
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 text-deep-blue 
                       hover:text-deep-blue/80 transition-colors
                       bg-white/50 hover:bg-white/60 backdrop-blur-xl rounded-xl shadow-sm"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 