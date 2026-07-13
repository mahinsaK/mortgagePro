"use client";

import { Search, Send, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  sendAllBorrowersSmsAction,
  sendManualSmsAction,
  sendSelectedSmsAction,
} from "@/backend/actions/sms-actions";

type Recipient = {
  id: string;
  name: string;
  businessName: string;
  phoneNumber: string;
};

type SmsWorkbenchProps = {
  count?: string;
  message?: string;
  phone?: string;
  status?: string;
};

const templates = [
  {
    label: "Loan welcome",
    description: "For new loan customers",
    message:
      "Welcome. Your loan has been created successfully. Thank you for choosing us.",
  },
  {
    label: "Payment reminder",
    description: "For daily or upcoming payments",
    message: "Hello, this is a reminder about your scheduled loan payment.",
  },
  {
    label: "Loan completed",
    description: "For completed loan accounts",
    message:
      "Thank you. Your loan has been completed successfully. We appreciate your business.",
  },
];

export function SmsWorkbench({ count, message, phone, status }: SmsWorkbenchProps) {
  const [customNumber, setCustomNumber] = useState("");
  const [customNumberError, setCustomNumberError] = useState("");
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Recipient[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState("");
  const selectedRecipientsPayload = useMemo(
    () => JSON.stringify(selectedRecipients),
    [selectedRecipients],
  );

  async function searchBorrowers() {
    const query = searchQuery.trim();

    if (query.length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      setSearchError("Type at least 2 characters.");
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setSearchError("");

    try {
      const response = await fetch(
        `/api/sms/borrowers/search?q=${encodeURIComponent(query)}`,
      );

      if (!response.ok) {
        throw new Error("Borrower search failed.");
      }

      const data = (await response.json()) as { recipients?: Recipient[] };
      setSearchResults(data.recipients ?? []);
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "Borrower search failed.",
      );
    } finally {
      setIsSearching(false);
    }
  }

  function addRecipient(recipient: Recipient) {
    setSelectedRecipients((currentRecipients) => {
      if (
        currentRecipients.some(
          (currentRecipient) =>
            currentRecipient.id === recipient.id ||
            phoneIdentity(currentRecipient.phoneNumber) ===
              phoneIdentity(recipient.phoneNumber),
        )
      ) {
        return currentRecipients;
      }

      return [...currentRecipients, recipient];
    });
  }

  function removeRecipient(recipientId: string) {
    setSelectedRecipients((currentRecipients) =>
      currentRecipients.filter((recipient) => recipient.id !== recipientId),
    );
  }

  function addCustomNumber() {
    const value = customNumber.trim();
    const digits = phoneIdentity(value);

    if (digits.length < 7 || digits.length > 15) {
      setCustomNumberError("Enter a phone number containing 7 to 15 digits.");
      return;
    }

    if (
      selectedRecipients.some(
        (recipient) => phoneIdentity(recipient.phoneNumber) === digits,
      )
    ) {
      setCustomNumberError("That phone number is already selected.");
      return;
    }

    addRecipient({
      id: `custom-${digits}`,
      name: "Custom number",
      businessName: "",
      phoneNumber: value.startsWith("+") ? `+${digits}` : digits,
    });
    setCustomNumber("");
    setCustomNumberError("");
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-lg border border-[#dfe5ec] bg-white p-5 shadow-sm">
          <div className="mb-5">
            <p className="text-sm font-medium text-[#657386]">Selected SMS</p>
            <h2 className="mt-1 text-lg font-semibold">Message recipients</h2>
          </div>

          <StatusBanner count={count} message={message} phone={phone} status={status} />

          <div className="grid gap-5">
            <label className="text-sm font-medium text-[#2d3745]">
              Search borrowers
              <div className="mt-2 flex gap-2">
                <div className="flex h-11 flex-1 items-center rounded-md border border-[#cfd8e3] px-3 transition focus-within:border-[#1d4ed8] focus-within:ring-2 focus-within:ring-[#dbeafe]">
                  <Search
                    aria-hidden="true"
                    className="mr-2 shrink-0 text-[#657386]"
                    size={18}
                  />
                  <input
                    className="h-full w-full border-0 bg-transparent text-sm outline-none"
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void searchBorrowers();
                      }
                    }}
                    placeholder="Borrower name or contact number"
                    type="search"
                    value={searchQuery}
                  />
                </div>
                <button
                  className="h-11 rounded-md border border-[#cfd8e3] px-4 text-sm font-semibold text-[#2d3745] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:text-[#9aa6b2]"
                  disabled={isSearching}
                  onClick={() => void searchBorrowers()}
                  type="button"
                >
                  {isSearching ? "Searching" : "Search"}
                </button>
              </div>
            </label>

            <SearchResults
              error={searchError}
              hasSearched={hasSearched}
              onAdd={addRecipient}
              recipients={searchResults}
              selectedRecipients={selectedRecipients}
            />

            <label className="text-sm font-medium text-[#2d3745]">
              Add a custom phone number
              <div className="mt-2 flex gap-2">
                <input
                  className="h-11 min-w-0 flex-1 rounded-md border border-[#cfd8e3] px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
                  onChange={(event) => {
                    setCustomNumber(event.target.value);
                    setCustomNumberError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCustomNumber();
                    }
                  }}
                  placeholder="+94 77 123 4567"
                  type="tel"
                  value={customNumber}
                />
                <button
                  className="h-11 rounded-md border border-[#cfd8e3] bg-white px-4 text-sm font-semibold text-[#2d3745] transition hover:bg-[#f8fafc]"
                  onClick={addCustomNumber}
                  type="button"
                >
                  Add
                </button>
              </div>
              {customNumberError ? (
                <span className="mt-2 block text-sm font-medium text-[#b91c1c]">
                  {customNumberError}
                </span>
              ) : null}
            </label>

            <SelectedRecipients
              onRemove={removeRecipient}
              recipients={selectedRecipients}
            />

            <form action={sendSelectedSmsAction} className="grid gap-4">
              <input
                name="recipients"
                type="hidden"
                value={selectedRecipientsPayload}
              />
              <label className="text-sm font-medium text-[#2d3745]">
                Message
                <textarea
                  className="mt-2 min-h-40 w-full resize-y rounded-md border border-[#cfd8e3] px-3 py-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
                  maxLength={480}
                  name="message"
                  onChange={(event) => setMessageText(event.target.value)}
                  placeholder="Type the customer message"
                  required
                  value={messageText}
                />
              </label>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  className="inline-flex h-11 items-center gap-2 rounded-md border border-[#cfd8e3] px-4 text-sm font-semibold text-[#2d3745] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:text-[#9aa6b2]"
                  disabled={!messageText.trim()}
                  formAction={sendAllBorrowersSmsAction}
                  onClick={(event) => {
                    if (!confirm("Send this SMS to all borrowers?")) {
                      event.preventDefault();
                    }
                  }}
                  title="Sends this message to every borrower under this lender account."
                  type="submit"
                >
                  <Users aria-hidden="true" size={17} />
                  Send all borrowers
                </button>
                <button
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-[#15191f] px-5 text-sm font-semibold text-white transition hover:bg-[#2d3745] disabled:cursor-not-allowed disabled:bg-[#9aa6b2]"
                  disabled={
                    selectedRecipients.length === 0 || !messageText.trim()
                  }
                  type="submit"
                >
                  <Send aria-hidden="true" size={17} />
                  Send selected
                </button>
              </div>
            </form>
          </div>
        </section>

        <QuickSmsPanel />
      </div>

      <TemplateCards onSelect={setMessageText} />
    </div>
  );
}

function SearchResults({
  error,
  hasSearched,
  onAdd,
  recipients,
  selectedRecipients,
}: {
  error: string;
  hasSearched: boolean;
  onAdd: (recipient: Recipient) => void;
  recipients: Recipient[];
  selectedRecipients: Recipient[];
}) {
  const selectedRecipientIds = new Set(
    selectedRecipients.map((recipient) => recipient.id),
  );
  const selectedPhoneNumbers = new Set(
    selectedRecipients.map((recipient) => phoneIdentity(recipient.phoneNumber)),
  );

  if (error) {
    return <p className="text-sm font-medium text-[#b91c1c]">{error}</p>;
  }

  if (!hasSearched) {
    return null;
  }

  if (recipients.length === 0) {
    return (
      <div className="rounded-md border border-[#dfe5ec] bg-[#f8fafc] p-4 text-sm text-[#657386]">
        No borrower matched that search.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {recipients.map((recipient) => {
        const isSelected =
          selectedRecipientIds.has(recipient.id) ||
          selectedPhoneNumbers.has(phoneIdentity(recipient.phoneNumber));

        return (
          <article
            className="flex items-center justify-between gap-3 rounded-md border border-[#dfe5ec] bg-[#f8fafc] p-3"
            key={recipient.id}
          >
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-[#15191f]">
                {recipient.name}
              </h3>
              <p className="mt-1 truncate text-xs text-[#657386]">
                {[recipient.phoneNumber, recipient.businessName]
                  .filter(Boolean)
                  .join(" / ")}
              </p>
            </div>
            <button
              className="h-9 shrink-0 rounded-md border border-[#cfd8e3] bg-white px-3 text-xs font-semibold text-[#2d3745] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:text-[#9aa6b2]"
              disabled={isSelected}
              onClick={() => onAdd(recipient)}
              type="button"
            >
              {isSelected ? "Added" : "Add"}
            </button>
          </article>
        );
      })}
    </div>
  );
}

function SelectedRecipients({
  onRemove,
  recipients,
}: {
  onRemove: (recipientId: string) => void;
  recipients: Recipient[];
}) {
  return (
    <div className="min-h-20 rounded-md border border-[#dfe5ec] bg-[#f8fafc] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#2d3745]">
          Selected recipients
        </p>
        <span className="text-xs font-semibold text-[#657386]">
          {recipients.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {recipients.map((recipient) => (
          <span
            className="inline-flex h-8 items-center gap-2 rounded-md border border-[#cfd8e3] bg-white px-2.5 text-xs font-semibold text-[#2d3745]"
            key={recipient.id}
          >
            {recipient.name === "Custom number"
              ? recipient.phoneNumber
              : `${recipient.name || "Recipient"} · ${recipient.phoneNumber}`}
            <button
              aria-label={`Remove ${recipient.name || recipient.phoneNumber}`}
              className="text-[#657386] transition hover:text-[#b91c1c]"
              onClick={() => onRemove(recipient.id)}
              type="button"
            >
              <X aria-hidden="true" size={14} />
            </button>
          </span>
        ))}
        {recipients.length === 0 ? (
          <span className="text-sm text-[#657386]">No selected recipients</span>
        ) : null}
      </div>
    </div>
  );
}

function TemplateCards({ onSelect }: { onSelect: (message: string) => void }) {
  return (
    <section className="rounded-lg border border-[#dfe5ec] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[#15191f]">
          Message templates
        </h2>
        <span className="text-xs font-semibold text-[#657386]">
          Click to fill
        </span>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {templates.map((template) => (
          <button
            className="rounded-md border border-[#dfe5ec] bg-white p-3 text-left transition hover:border-[#bfdbfe] hover:bg-[#f8fafc]"
            key={template.label}
            onClick={() => onSelect(template.message)}
            type="button"
          >
            <span className="flex items-start justify-between gap-3">
              <span>
                <span className="block text-sm font-semibold text-[#15191f]">
                  {template.label}
                </span>
                <span className="mt-1 block text-xs text-[#657386]">
                  {template.description}
                </span>
              </span>
              <span className="shrink-0 rounded-md bg-[#e0ecff] px-2 py-1 text-xs font-semibold text-[#1d4ed8]">
                Use
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function phoneIdentity(value: string) {
  return value.replace(/\D/g, "");
}

function QuickSmsPanel() {
  return (
    <section className="rounded-lg border border-[#dfe5ec] bg-white p-5 shadow-sm">
      <div className="mb-5">
        <p className="text-sm font-medium text-[#657386]">Quick SMS</p>
        <h2 className="mt-1 text-lg font-semibold">Single number</h2>
      </div>

      <form action={sendManualSmsAction} className="grid gap-4">
        <label className="text-sm font-medium text-[#2d3745]">
          Phone number
          <input
            className="mt-2 h-11 w-full rounded-md border border-[#cfd8e3] px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
            name="phone_number"
            placeholder="+94 77 123 4567"
            required
            type="tel"
          />
        </label>

        <label className="text-sm font-medium text-[#2d3745]">
          Message
          <textarea
            className="mt-2 min-h-32 w-full resize-y rounded-md border border-[#cfd8e3] px-3 py-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
            maxLength={480}
            name="message"
            placeholder="Type the customer message"
            required
          />
        </label>

        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#15191f] px-5 text-sm font-semibold text-white transition hover:bg-[#2d3745]"
          type="submit"
        >
          <Send aria-hidden="true" size={17} />
          Send SMS
        </button>
      </form>
    </section>
  );
}

function StatusBanner({ count, message, phone, status }: SmsWorkbenchProps) {
  if (status === "sent") {
    return (
      <div className="mb-5 rounded-md border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-medium text-[#166534]">
        Sent {count || "1"} SMS{count === "1" ? "" : " messages"}
        {phone ? `, first to ${phone}` : ""}.
      </div>
    );
  }

  if (status === "partial") {
    return (
      <div className="mb-5 rounded-md border border-[#fed7aa] bg-[#fff7ed] px-4 py-3 text-sm font-medium text-[#9a3412]">
        Sent {count || "some"} SMS messages. Some numbers failed.
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mb-5 rounded-md border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#991b1b]">
        {message || "SMS could not be sent."}
      </div>
    );
  }

  return null;
}
