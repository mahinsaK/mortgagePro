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

- `sms_accounts`: one lender account with `active`/`suspended` status and the
  monthly application quota.
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

The newest approved request is the active sender. A pending or rejected
replacement does not disable the lender's previous approved sender.

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

Application quota units are deliberately simple and may differ from Text.lk
billing: 1–160 Unicode code points use one unit, 161–320 use two, and 321–480 use
three per successful recipient. Months use the Asia/Colombo calendar and unused
units do not roll over.

## Templates and reporting

The first sender request creates the Loan welcome, Payment reminder, and Loan
completed starter templates. Lenders can create, rename, edit, use, and delete
up to 20 templates. Names are unique per lender.

The SMS page shows current quota, used/reserved/remaining units, successful and
failed recipients, recent sanitized batch summaries, and a 12-month report.
Templates and history remain available when sending is not configured or is
suspended.

## Borrower recipients

Borrower search and bulk recipient lookup remain tenant scoped. Search returns
at most eight matching lender-owned borrowers. `Send all borrowers` resolves
the lender's current borrower numbers on the server; it does not trust a
browser-supplied lender ID.
