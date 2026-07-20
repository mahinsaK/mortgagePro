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
