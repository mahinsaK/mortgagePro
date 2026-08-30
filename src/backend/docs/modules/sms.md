# Lender SMS Workflow

MortgagePro uses a shared server-side Text.lk API token, but every SMS send uses
the active sender ID approved for the authenticated lender. Sender IDs, quotas,
templates, usage, and history are stored in server-only Appwrite collections.

## Configuration

Application runtime variables:

```txt
TEXTLK_API_TOKEN
TEXTLK_API_URL
APPWRITE_SMS_ACCOUNTS_COLLECTION_ID=sms_accounts
APPWRITE_SMS_SENDER_REQUESTS_COLLECTION_ID=sms_sender_requests
APPWRITE_SMS_TEMPLATES_COLLECTION_ID=sms_templates
APPWRITE_SMS_MONTHLY_USAGE_COLLECTION_ID=sms_monthly_usage
APPWRITE_SMS_SEND_LOGS_COLLECTION_ID=sms_send_logs
```

There is no `TEXTLK_SENDER_ID`. The server resolves the sender from the current
lender's approved request and never accepts it from a form.

## Appwrite collections

- `sms_accounts`: one lender account with `active`/`suspended` status, the
  monthly application quota, and automatic payment-message settings.
- `sms_sender_requests`: globally unique sender requests and their
  `pending`/`approved`/`rejected` status.
- `sms_templates`: up to 20 lender-owned, editable messages.
- `sms_monthly_usage`: Asia/Colombo monthly sent, failed, and reserved counters.
- `sms_send_logs`: sanitized batch summaries. It never stores message content or
  recipient phone numbers.

All five collections have empty client permissions and `documentSecurity` set
to `false`. Only server API-key clients access them.

## Sender approval and quota administration

The application lets a lender request a 3–11 character sender ID. It must start
with a letter and contain only ASCII letters and numbers. Case is preserved for
Text.lk, while a lowercase copy guarantees global uniqueness.

Administration is manual in Appwrite Console:

1. Confirm the requested sender is approved in the shared Text.lk account.
2. Open `sms_sender_requests` and change the request status to `approved` or
   `rejected`. Add `rejection_reason` when useful.
3. Open the lender document in `sms_accounts`, set `monthly_quota`, and keep its
   status `active` (or use `suspended` to stop sends).

An approved sender must be deleted before the lender can request a different
sender ID. Deleting it removes prior approved sender records and turns off
automatic payment SMS so an older sender cannot silently become active again.

## Automatic payment receipts

The lender can turn automatic payment messages on or off from the SMS page and
select one of their saved templates. Supported placeholders are
`{{borrowerName}}`, `{{amount}}`, `{{remainingBalance}}`, `{{paymentDate}}`, and
`{{companyName}}`.

The receipt attempt starts only after a new collector payment and loan-balance
transaction commits. A duplicate payment request does not send another SMS.
When the setting is off, the borrower phone is unusable, SMS quota is
unavailable, or Text.lk fails, the financial payment remains recorded. Deleting
the selected template automatically turns the workflow off.

## Sending and quota safety

`sms-sending-service.ts` performs the protected workflow:

1. Validate and deduplicate recipient numbers and validate the 1–480 code-point
   message.
2. Resolve the authenticated lender's active account and newest approved sender.
3. Reserve all requested units in an Appwrite transaction and create a
   deterministic processing batch.
4. Send to Text.lk in bounded groups of 20 recipients.
5. Transactionally finalize successful/failed recipient counters, consume units
   only for successes, and release units for failures.

The browser supplies a one-time request ID, and the lender plus request ID
produce a deterministic batch ID. Replayed submissions are not sent again. If
Text.lk completes but Appwrite finalization cannot be confirmed, the batch is
marked `review_required`, its reservation remains, and the app tells the lender
not to resend.

Quota estimation follows Text.lk encoding rules. GSM-7 messages use 160 encoded
characters for one unit and 153 per part when concatenated; GSM-7 extension
characters consume two encoded positions. Sinhala, Tamil, emoji, and other
non-GSM messages use UTF-16/Unicode: 70 code units for one unit and 67 per
concatenated part. Spaces and line breaks count. When Text.lk returns
`sms_count`, final usage records that provider-reported value; otherwise the
same local estimate is used. Months use the Asia/Colombo calendar and unused
units do not roll over.

## Templates and reporting

The first sender request creates the Loan welcome, Payment reminder, and Loan
completed starter templates. Lenders can create, rename, edit, use, and delete
up to 20 templates. Names are unique per lender.

The SMS page is ordered for daily work: Quick SMS, sender and automatic-payment
settings, recipients, templates, current-month usage, an expandable 12-month
report, and recent sanitized batch summaries. Templates and history remain
available when sending is not configured or is suspended.

## Borrower recipients

Borrower search and bulk recipient lookup remain tenant scoped. Search returns
at most eight matching lender-owned borrowers. `Send all borrowers` resolves
the lender's current borrower numbers on the server; it does not trust a
browser-supplied lender ID.
