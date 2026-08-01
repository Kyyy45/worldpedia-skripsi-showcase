'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { XIcon, LoaderCircleIcon } from 'lucide-react';
import {
  BotIcon,           type BotIconHandle,
  UserIcon,          type UserIconHandle,
  MessageCircleIcon, type MessageCircleIconHandle,
  RotateCwIcon,     type RotateCwIconHandle,
} from 'lucide-animated';
import { ArrowUp02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '@/shared/ui/button';
import {
  PromptInput,
  PromptInputTextarea,
} from '@/shared/ui/prompt-input';
import { askStream } from '../api';
import type { ChatMessage } from '@/shared/types/help.types';

// Fungsi ini mengubah teks jawaban AI (yang ditulis dalam format Markdown
// sederhana seperti **tebal** atau daftar bernomor) menjadi kode HTML,
// supaya bisa ditampilkan dengan format rapi di layar, bukan sekadar teks
// polos dengan tanda bintang/pagar yang terlihat mentah.
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 rounded text-xs font-mono">$1</code>')
    .replace(/^(\d+)\.\s(.+)/gm, '<div class="flex gap-1.5"><span class="shrink-0 font-medium">$1.</span><span>$2</span></div>')
    .replace(/^[-•]\s(.+)/gm, '<div class="flex gap-1.5"><span class="shrink-0">•</span><span>$1</span></div>')
    .replace(/^#{1,2}\s(.+)/gm, '<p class="font-semibold mt-2 mb-0.5">$1</p>')
    .replace(/\n/g, '<br/>');
}

// Empat sudut layar yang bisa jadi tempat "menempel" tombol chatbot,
// dipakai fitur seret-dan-taruh (drag and drop) di bawah.
type Corner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

// Menentukan sudut mana yang paling dekat dengan posisi terakhir kali
// tombol dilepas, berdasarkan apakah posisinya lebih dekat ke kiri/kanan
// dan atas/bawah tengah layar.
function snapToCorner(x: number, y: number): Corner {
  const mx = window.innerWidth  / 2;
  const my = window.innerHeight / 2;
  if (x >= mx && y >= my) return 'bottom-right';
  if (x <  mx && y >= my) return 'bottom-left';
  if (x >= mx && y <  my) return 'top-right';
  return 'top-left';
}

// Tiga daftar kelas CSS di bawah ini menentukan posisi dan arah susunan
// tombol serta jendela obrolan, tergantung di sudut mana widget sedang berada.
const CORNER_FIXED: Record<Corner, string> = {
  'bottom-right': 'bottom-5 right-5',
  'bottom-left':  'bottom-5 left-5',
  'top-right':    'top-5 right-5',
  'top-left':     'top-5 left-5',
};
const CORNER_FLEX: Record<Corner, string> = {
  'bottom-right': 'flex-col',
  'bottom-left':  'flex-col',
  'top-right':    'flex-col-reverse',
  'top-left':     'flex-col-reverse',
};
const CORNER_ITEMS: Record<Corner, string> = {
  'bottom-right': 'items-end',
  'bottom-left':  'items-start',
  'top-right':    'items-end',
  'top-left':     'items-start',
};

// Satu pesan dalam percakapan, ditambah `id` unik supaya React bisa
// membedakan tiap pesan saat menampilkannya dalam daftar.
interface UIMessage extends ChatMessage { id: string }

export function HelpWidget() {
  // --- Menyimpan seluruh status/keadaan widget ---
  const [isOpen,    setIsOpen]    = useState(false);   // apakah jendela obrolan sedang terbuka
  const [messages,  setMessages]  = useState<UIMessage[]>([]); // daftar semua pesan dalam percakapan
  const [input,     setInput]     = useState('');       // teks yang sedang diketik pengguna
  const [isLoading, setIsLoading] = useState(false);     // apakah sedang menunggu jawaban AI
  const [corner,    setCorner]    = useState<Corner>('bottom-right'); // sudut layar tempat widget berada
  const [isDragging, setIsDragging] = useState(false);   // apakah tombol sedang diseret
  const [ghostPos,  setGhostPos]  = useState<{ x: number; y: number } | null>(null); // posisi "bayangan" tombol saat diseret

  const pathname     = usePathname();
  const endRef       = useRef<HTMLDivElement>(null);
  const abortRef     = useRef<AbortController | null>(null);
  const headerBotRef = useRef<BotIconHandle>(null);
  const emptyBotRef  = useRef<BotIconHandle>(null);
  const fabMsgRef    = useRef<MessageCircleIconHandle>(null);
  const clearRef     = useRef<RotateCwIconHandle>(null);
  const dragState    = useRef<{ startX: number; startY: number; moved: boolean }>({
    startX: 0, startY: 0, moved: false,
  });

  // Setiap kali ada pesan baru, jendela obrolan otomatis digulir ke bawah
  // supaya pesan terbaru selalu terlihat.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- Bagian ini menangani fitur "seret tombol ke sudut lain" ---
  // Tiga fungsi berikut bekerja sama untuk membedakan antara "klik biasa"
  // (untuk membuka/menutup obrolan) dan "menyeret tombol" (untuk
  // memindahkannya ke sudut layar lain): begitu jari/mouse ditekan lalu
  // digeser lebih dari 6 piksel, aksinya dianggap sebagai seretan, bukan klik.

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (isOpen) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, moved: false };
    setGhostPos({ x: e.clientX, y: e.clientY });
  }, [isOpen]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!ghostPos && !dragState.current.moved) return;
    const dx = Math.abs(e.clientX - dragState.current.startX);
    const dy = Math.abs(e.clientY - dragState.current.startY);
    if (dx > 6 || dy > 6) {
      dragState.current.moved = true;
      setIsDragging(true);
    }
    if (dragState.current.moved) {
      setGhostPos({ x: e.clientX, y: e.clientY });
    }
  }, [ghostPos]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragState.current.moved) {
      // Kalau tadi memang diseret, tombol "menempel" ke sudut terdekat dari posisi lepasnya.
      setCorner(snapToCorner(e.clientX, e.clientY));
    } else {
      // Kalau tidak ada seretan sama sekali, berarti ini klik biasa —
      // buka atau tutup jendela obrolan.
      setIsOpen(v => !v);
    }
    setIsDragging(false);
    setGhostPos(null);
    dragState.current.moved = false;
  }, []);

  // Kirim pertanyaan ke backend, lalu tambahkan tiap potongan jawaban yang diterima secara bertahap ke pesan terakhir.
  const sendMessage = useCallback(async (value?: string) => {
    const question = (value ?? input).trim();
    if (!question || isLoading) return;

    setInput('');

    const userMsg: UIMessage = { id: crypto.randomUUID(), role: 'user',  content: question };
    const botMsg:  UIMessage = { id: crypto.randomUUID(), role: 'model', content: '', isStreaming: true };

    setMessages(prev => [...prev, userMsg, botMsg]);
    setIsLoading(true);

    const history = messages.map(m => ({ role: m.role, content: m.content }));
    abortRef.current = new AbortController();

    try {
      const stream  = await askStream({ question, history, context: pathname }, abortRef.current.signal);
      const reader  = stream.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';
      let   full    = '';

      // Membaca data yang datang bertahap dari backend, potongan demi
      // potongan, lalu menyusunnya kembali menjadi teks jawaban yang utuh.
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6)) as { text?: string; done?: boolean; error?: string };
            if (parsed.error) {
              setMessages(prev => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], content: parsed.error!, isStreaming: false }; return u; });
              return;
            }
            if (parsed.done) break;
            if (parsed.text) {
              // Setiap potongan teks baru ditambahkan ke jawaban yang
              // sudah ada, lalu tampilan pesan terakhir diperbarui.
              full += parsed.text;
              setMessages(prev => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], content: full }; return u; });
            }
          } catch {}
        }
      }

      setMessages(prev => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], isStreaming: false }; return u; });
    } catch (err) {
      const msg = err instanceof Error && err.message === 'rate_limit'
        ? 'Terlalu banyak permintaan. Tunggu sebentar sebelum bertanya lagi.'
        : 'Koneksi terputus. Silakan coba lagi.';
      setMessages(prev => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], content: msg, isStreaming: false }; return u; });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, pathname]);

  // Widget ini sengaja disembunyikan di halaman admin, karena admin sudah
  // punya halaman Help Articles sendiri untuk mengelola bantuan.
  if (pathname.startsWith('/admin')) return null;

  const fixedClass = CORNER_FIXED[corner];
  const flexClass  = CORNER_FLEX[corner];
  const itemsClass = CORNER_ITEMS[corner];

  return (
    <>
      {/* "Bayangan" tombol yang mengikuti posisi jari/mouse selama proses menyeret */}
      {isDragging && ghostPos && (
        <div
          className="fixed z-[60] pointer-events-none -translate-x-1/2 -translate-y-1/2 opacity-80"
          style={{ left: ghostPos.x, top: ghostPos.y }}
        >
          <div className="flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-2xl px-4 py-3 ring-4 ring-primary/30">
            <MessageCircleIcon size={20} className="shrink-0" />
            <span className="text-sm font-semibold">Bantuan</span>
          </div>
        </div>
      )}

      {/* Kotak putus-putus yang menandai sudut mana tombol akan menempel kalau dilepas sekarang */}
      {isDragging && ghostPos && (
        <div className={`fixed z-[55] pointer-events-none rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 transition-all duration-100 ${
          ghostPos.x >= window.innerWidth / 2
            ? ghostPos.y >= window.innerHeight / 2 ? 'bottom-0 right-0 w-1/2 h-1/2' : 'top-0 right-0 w-1/2 h-1/2'
            : ghostPos.y >= window.innerHeight / 2 ? 'bottom-0 left-0 w-1/2 h-1/2'  : 'top-0 left-0 w-1/2 h-1/2'
        }`} />
      )}

      <div className={`fixed ${fixedClass} z-50 flex ${flexClass} ${itemsClass} gap-3 print:hidden ${isDragging ? 'opacity-0' : ''}`}>

        {/* Jendela obrolan — hanya ditampilkan kalau isOpen bernilai true */}
        {isOpen && (
          <div className="flex flex-col w-[calc(100vw-2.5rem)] sm:w-[380px] h-[75dvh] sm:h-[540px] rounded-2xl border bg-background shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in-0 duration-200">

            {/* Kepala jendela: judul, tombol hapus percakapan, tombol tutup */}
            <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground shrink-0">
              <div
                className="flex items-center gap-2.5"
                onMouseEnter={() => headerBotRef.current?.startAnimation()}
              >
                <div className="flex size-8 items-center justify-center rounded-full bg-white/15">
                  <BotIcon ref={headerBotRef} size={16} className="shrink-0" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-none">Worldpedia Help</p>
                  <p className="text-[10px] opacity-70 mt-0.5">Powered by Gemini</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={() => setMessages([])}
                    onMouseEnter={() => clearRef.current?.startAnimation()}
                    aria-label="Clear chat"
                    className="p-1.5 rounded-full opacity-70 hover:opacity-100 hover:bg-white/20 transition-colors"
                  >
                    <RotateCwIcon ref={clearRef} size={14} className="shrink-0" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-full hover:bg-white/20 transition-colors"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
            </div>

            {/* Isi jendela: daftar pesan percakapan, atau tampilan awal kalau belum ada pesan */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                  <div
                    className="size-14 rounded-2xl bg-muted flex items-center justify-center"
                    onMouseEnter={() => emptyBotRef.current?.startAnimation()}
                  >
                    <BotIcon ref={emptyBotRef} size={28} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Ada pertanyaan?</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Ketik pertanyaanmu atau pilih salah satu di bawah.
                    </p>
                  </div>
                  {/* Contoh pertanyaan yang bisa langsung diklik, tidak perlu mengetik */}
                  <div className="flex flex-wrap gap-2 justify-center mt-1">
                    {['Cara daftar kursus', 'Cara bayar via Midtrans', 'Status pendaftaran saya'].map(s => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="text-[11px] px-3 py-1.5 rounded-full border hover:bg-muted transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`size-7 rounded-full flex items-center justify-center shrink-0 mt-0.5
                    ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted border'}`}>
                    {msg.role === 'user'
                      ? <UserIcon size={14} className="shrink-0" />
                      : <BotIcon  size={14} className="shrink-0 text-primary" />}
                  </div>
                  {msg.role === 'user' ? (
                    <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm leading-relaxed">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="max-w-[80%] text-sm leading-relaxed text-foreground">
                      <span
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                        className="[&_strong]:font-semibold [&_em]:italic [&_br]:block"
                      />
                      {msg.isStreaming && (
                        <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-primary/60 rounded-sm animate-pulse align-middle" />
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {/* Kaki jendela: kotak untuk mengetik pertanyaan dan tombol kirim */}
            <div className="px-3 pb-3 pt-2 border-t shrink-0">
              <PromptInput onSubmit={sendMessage} className="relative !rounded-2xl !pr-14">
                <PromptInputTextarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ketik pertanyaan... (Enter kirim)"
                  disabled={isLoading}
                  className="!min-h-[32px] !py-[7px] text-sm"
                  scrollAreaClassName="!max-h-[120px]"
                />
                <div className="absolute right-2 bottom-2">
                  <Button
                    size="icon"
                    className="size-9 rounded-full cursor-pointer"
                    disabled={isLoading || !input.trim()}
                    onClick={() => sendMessage()}
                  >
                    {isLoading
                      ? <LoaderCircleIcon className="size-4 animate-spin" />
                      : <HugeiconsIcon icon={ArrowUp02Icon} strokeWidth={2.2} className="size-4" />
                    }
                  </Button>
                </div>
              </PromptInput>
            </div>
          </div>
        )}

        {/* Tombol bulat mengambang — bisa diklik (buka/tutup) atau diseret (pindah sudut) */}
        <button
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          aria-label={isOpen ? 'Tutup bantuan' : 'Buka bantuan'}
          style={{ touchAction: 'none' }}
          className={`flex items-center justify-center bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all duration-200 select-none ${
            isDragging ? 'cursor-grabbing scale-95' : 'cursor-grab'
          } ${isOpen ? 'size-14 rounded-full' : 'gap-2 rounded-full px-5 py-3.5'}`}
          onMouseEnter={() => !isOpen && !isDragging && fabMsgRef.current?.startAnimation()}
        >
          {isOpen ? (
            <XIcon className="size-5" />
          ) : (
            <>
              <MessageCircleIcon ref={fabMsgRef} size={20} className="shrink-0" />
              <span className="text-sm font-semibold">Bantuan</span>
            </>
          )}
        </button>
      </div>
    </>
  );
}
