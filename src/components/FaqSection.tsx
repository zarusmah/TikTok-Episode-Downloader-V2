import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Why do other TikTok downloaders fail on short drama links?',
      a: 'TikTok short dramas are housed under a specialized episodic micro-app architecture (`/shortdrama/episode/:id/:num`) separate from regular feed videos. Traditional downloaders expect standard `/@user/video/:id` routes and get redirected or blocked. TokDrama queries TikTok’s native drama API to resolve the exact video item IDs and streams the clean media file directly.',
    },
    {
      q: 'How does watermark removal work?',
      a: 'TikTok servers hold both the original uploaded master video stream and a rendered version with the overlaid TikTok logo watermark. Our resolver queries the upstream ByteDance CDN to extract the pristine original master MP4 stream without visual watermarks or user attribution cards.',
    },
    {
      q: 'How does saving to local storage work?',
      a: 'When you click "Save to Offline Storage", the application downloads the raw MP4 video binary and writes it into your web browser\'s IndexedDB storage. The video remains accessible right on your device even without an internet connection. You can play it offline or export it to your computer\'s downloads folder at any time.',
    },
    {
      q: 'How do I copy a short drama episode link from the TikTok app?',
      a: 'When watching a short drama episode in the TikTok app, tap the "Share" button (the arrow icon on the right side) and select "Copy Link". Paste that link directly into the input bar above.',
    },
    {
      q: 'What format are the downloaded video files?',
      a: 'All files are downloaded as standardized, universally playable MP4 (H.264 video with AAC audio) files compatible with Windows, Mac, iOS, Android, and all smart TV media players.',
    },
  ];

  return (
    <section id="faq" className="py-12 border-t border-neutral-800/80">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-rose-400 mx-auto mb-3">
          <HelpCircle className="w-4 h-4" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Frequently Asked Questions
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1">
          Everything you need to know about downloading TikTok short drama episodes and offline saving.
        </p>
      </div>

      <div className="max-w-3xl mx-auto flex flex-col gap-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl overflow-hidden transition-colors"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full flex items-center justify-between p-4.5 text-left text-sm font-semibold text-white hover:text-rose-400 transition-colors cursor-pointer gap-4"
              >
                <span>{faq.q}</span>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-neutral-500 shrink-0" />
                )}
              </button>
              {isOpen && (
                <div className="px-4.5 pb-4.5 pt-1 text-xs sm:text-sm text-neutral-400 leading-relaxed border-t border-neutral-800/40">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
