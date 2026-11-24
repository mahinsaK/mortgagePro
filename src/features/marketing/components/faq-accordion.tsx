"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

export type FaqItem = {
  question: string;
  answer: string;
};

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const panelId = `faq-panel-${index}`;
        const buttonId = `faq-button-${index}`;

        return (
          <div
            className="rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-surface)] transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            key={item.question}
          >
            <h3>
              <button
                aria-controls={panelId}
                aria-expanded={isOpen}
                className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left text-[var(--foreground)]"
                id={buttonId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                type="button"
              >
                <span className="title-3">{item.question}</span>
                <ChevronDown
                  aria-hidden="true"
                  className={`shrink-0 text-[var(--mp-muted)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isOpen ? "rotate-180" : "rotate-0"
                  }`}
                  size={18}
                />
              </button>
            </h3>
            {isOpen ? (
              <div
                aria-labelledby={buttonId}
                className="border-t border-[var(--mp-border)] px-5 py-4"
                id={panelId}
                role="region"
              >
                <p className="body-6 text-[var(--mp-muted)]">{item.answer}</p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
