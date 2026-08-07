export function createAppwriteSchema(collections) {
  return [
    {
      id: collections.lenders,
      name: "Lenders",
      attributes: [
        stringAttr("appwrite_user_id", 64, true),
        stringAttr("company_name", 160, true),
        stringAttr("email", 160, true),
        stringAttr("contact_info", 1000, false),
        enumAttr("status", ["active", "inactive"], true),
        stringAttr("currency", 8, false, "USD"),
        datetimeAttr("created_at", true),
      ],
      indexes: [
        keyIndex("idx_appwrite_user_id", ["appwrite_user_id"]),
        keyIndex("idx_lender_status", ["status"]),
      ],
    },
    {
      id: collections.borrowers,
      name: "Borrowers",
      attributes: [
        stringAttr("lender_id", 64, true),
        stringAttr("name", 160, true),
        stringAttr("business_name", 160, false),
        stringAttr("contact", 160, false),
        stringAttr("address", 500, false),
        stringAttr("search_text", 2000, false),
        enumAttr("status", ["active", "inactive"], true),
        datetimeAttr("created_at", true),
      ],
      indexes: [
        keyIndex("idx_borrower_lender_id", ["lender_id"]),
        keyIndex("idx_borrower_status", ["status"]),
        keyIndex("idx_borrower_lender_created", ["lender_id", "created_at"]),
        fulltextIndex("idx_borrower_name", ["name"]),
        fulltextIndex("idx_borrower_business_name", ["business_name"]),
        fulltextIndex("idx_borrower_contact", ["contact"]),
        fulltextIndex("idx_borrower_address", ["address"]),
        fulltextIndex("idx_borrower_search_text", ["search_text"]),
      ],
    },
    {
      id: collections.collectors,
      name: "Collectors",
      attributes: [
        stringAttr("lender_id", 64, true),
        stringAttr("name", 160, true),
        stringAttr("contact_info", 1000, false),
        stringAttr("password_hash", 256, false),
        enumAttr("status", ["active", "inactive"], true),
        datetimeAttr("created_at", true),
      ],
      indexes: [
        keyIndex("idx_collector_lender_id", ["lender_id"]),
        keyIndex("idx_collector_name", ["name"]),
        keyIndex("idx_collector_status", ["status"]),
        keyIndex("idx_collector_lender_status", ["lender_id", "status"]),
        keyIndex("idx_collector_lender_created", ["lender_id", "created_at"]),
      ],
    },
    {
      id: collections.loans,
      name: "Loans",
      attributes: [
        stringAttr("lender_id", 64, true),
        stringAttr("borrower_id", 64, true),
        floatAttr("amount", true, 0),
        floatAttr("interest_rate", true, 0),
        floatAttr("daily_payment", true, 0),
        floatAttr("total_paid", false, 0, undefined, 0),
        floatAttr("remaining_amount", false, 0, undefined, 0),
        datetimeAttr("start_date", true),
        datetimeAttr("end_date", true),
        enumAttr("status", ["active", "completed", "overdue", "cancelled"], true),
        stringAttr("qr_code", 12000, true),
        stringAttr("search_text", 2000, false),
        datetimeAttr("created_at", true),
      ],
      indexes: [
        keyIndex("idx_loan_lender_id", ["lender_id"]),
        keyIndex("idx_loan_borrower_id", ["borrower_id"]),
        keyIndex("idx_loan_status", ["status"]),
        keyIndex("idx_loan_lender_status", ["lender_id", "status"]),
        keyIndex("idx_loan_lender_status_end", ["lender_id", "status", "end_date"]),
        keyIndex("idx_loan_lender_borrower", ["lender_id", "borrower_id"]),
        keyIndex("idx_loan_lender_created", ["lender_id", "created_at"]),
        fulltextIndex("idx_loan_search_text", ["search_text"]),
      ],
    },
    {
      id: collections.payments,
      name: "Payments",
      attributes: [
        stringAttr("lender_id", 64, true),
        stringAttr("loan_id", 64, true),
        stringAttr("collector_id", 64, true),
        datetimeAttr("date", true),
        floatAttr("amount", true, 0),
        enumAttr("method", ["cash", "transfer", "card", "check", "other"], true),
        datetimeAttr("created_at", true),
      ],
      indexes: [
        keyIndex("idx_payment_lender_id", ["lender_id"]),
        keyIndex("idx_payment_loan_id", ["loan_id"]),
        keyIndex("idx_payment_collector_id", ["collector_id"]),
        keyIndex("idx_payment_date", ["date"]),
        keyIndex("idx_payment_lender_date", ["lender_id", "date"]),
        keyIndex("idx_payment_lender_collector", ["lender_id", "collector_id"]),
      ],
    },
    {
      id: collections.authRateLimits,
      name: "Authentication Rate Limits",
      attributes: [
        stringAttr("scope", 48, true),
        stringAttr("subject_hash", 64, true),
        integerAttr("attempt_count", true, 0),
        datetimeAttr("window_started_at", true),
        datetimeAttr("blocked_until", false),
        datetimeAttr("updated_at", true),
      ],
      indexes: [
        keyIndex("idx_rate_limit_scope", ["scope"]),
        keyIndex("idx_rate_limit_updated", ["updated_at"]),
        keyIndex("idx_rate_limit_blocked", ["blocked_until"]),
      ],
    },
    {
      id: collections.securityEvents,
      name: "Security Events",
      attributes: [
        stringAttr("event_type", 64, true),
        enumAttr(
          "outcome",
          ["success", "failure", "blocked", "denied", "error"],
          true,
        ),
        enumAttr(
          "principal_type",
          ["lender", "collector", "anonymous", "system"],
          true,
        ),
        stringAttr("principal_hash", 64, false),
        stringAttr("lender_id", 64, false),
        stringAttr("ip_hash", 64, false),
        stringAttr("request_id", 64, true),
        stringAttr("reason_code", 64, false),
        stringAttr("metadata", 2000, false),
        datetimeAttr("created_at", true),
      ],
      indexes: [
        keyIndex("idx_security_event_created", ["created_at"]),
        keyIndex("idx_security_event_type", ["event_type"]),
        keyIndex("idx_security_event_outcome", ["outcome"]),
        keyIndex("idx_security_event_type_created", ["event_type", "created_at"]),
      ],
    },
    {
      id: collections.smsAccounts,
      name: "SMS Accounts",
      attributes: [
        stringAttr("lender_id", 64, true),
        enumAttr("status", ["active", "suspended"], true),
        integerAttr("monthly_quota", true, 0),
        datetimeAttr("created_at", true),
        datetimeAttr("updated_at", true),
      ],
      indexes: [
        keyIndex("idx_sms_account_lender", ["lender_id"]),
        keyIndex("idx_sms_account_status", ["status"]),
      ],
    },
    {
      id: collections.smsSenderRequests,
      name: "SMS Sender Requests",
      attributes: [
        stringAttr("lender_id", 64, true),
        stringAttr("sender_id", 11, true),
        stringAttr("normalized_sender_id", 11, true),
        enumAttr("status", ["pending", "approved", "rejected"], true),
        stringAttr("rejection_reason", 500, false),
        datetimeAttr("requested_at", true),
      ],
      indexes: [
        keyIndex("idx_sms_sender_normalized", ["normalized_sender_id"]),
        keyIndex("idx_sms_sender_lender_status", ["lender_id", "status"]),
        keyIndex("idx_sms_sender_status_requested", [
          "lender_id",
          "status",
          "requested_at",
        ]),
      ],
    },
    {
      id: collections.smsTemplates,
      name: "SMS Templates",
      attributes: [
        stringAttr("lender_id", 64, true),
        stringAttr("name", 80, true),
        stringAttr("normalized_name", 80, true),
        stringAttr("message", 480, true),
        datetimeAttr("created_at", true),
        datetimeAttr("updated_at", true),
      ],
      indexes: [
        keyIndex("idx_sms_template_lender", ["lender_id"]),
        keyIndex("idx_sms_template_lender_name", [
          "lender_id",
          "normalized_name",
        ]),
        keyIndex("idx_sms_template_lender_created", [
          "lender_id",
          "created_at",
        ]),
      ],
    },
    {
      id: collections.smsMonthlyUsage,
      name: "SMS Monthly Usage",
      attributes: [
        stringAttr("lender_id", 64, true),
        stringAttr("month_key", 7, true),
        integerAttr("sent_recipients", true, 0),
        integerAttr("failed_recipients", true, 0),
        integerAttr("sent_units", true, 0),
        integerAttr("reserved_units", true, 0),
        integerAttr("batch_count", true, 0),
        datetimeAttr("created_at", true),
        datetimeAttr("updated_at", true),
      ],
      indexes: [
        keyIndex("idx_sms_usage_lender_month", ["lender_id", "month_key"]),
        keyIndex("idx_sms_usage_month", ["month_key"]),
      ],
    },
    {
      id: collections.smsSendLogs,
      name: "SMS Send Logs",
      attributes: [
        stringAttr("lender_id", 64, true),
        stringAttr("month_key", 7, true),
        stringAttr("request_id", 64, true),
        stringAttr("sender_id", 11, true),
        integerAttr("character_count", true, 1, 480),
        integerAttr("units_per_recipient", true, 1, 15),
        integerAttr("requested_recipients", true, 1),
        integerAttr("sent_recipients", true, 0),
        integerAttr("failed_recipients", true, 0),
        integerAttr("reserved_units", true, 0),
        integerAttr("used_units", true, 0),
        enumAttr(
          "status",
          ["processing", "sent", "partial", "failed", "review_required"],
          true,
        ),
        stringAttr("purpose", 64, true),
        datetimeAttr("created_at", true),
        datetimeAttr("completed_at", false),
      ],
      indexes: [
        keyIndex("idx_sms_log_lender_created", ["lender_id", "created_at"]),
        keyIndex("idx_sms_log_lender_month", ["lender_id", "month_key"]),
        keyIndex("idx_sms_log_status", ["status"]),
      ],
    },
  ];
}

function stringAttr(key, size, required, xdefault) {
  return { type: "string", key, size, required, xdefault };
}

function floatAttr(key, required, min, max, xdefault) {
  return { type: "float", key, required, min, max, xdefault };
}

function integerAttr(key, required, min, max, xdefault) {
  return { type: "integer", key, required, min, max, xdefault };
}

function enumAttr(key, elements, required, xdefault) {
  return { type: "enum", key, elements, required, xdefault };
}

function datetimeAttr(key, required, xdefault) {
  return { type: "datetime", key, required, xdefault };
}

function keyIndex(key, attributes) {
  return { key, type: "key", attributes };
}

function fulltextIndex(key, attributes) {
  return { key, type: "fulltext", attributes };
}
