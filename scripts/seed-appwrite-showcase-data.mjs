import { randomBytes, scryptSync } from "node:crypto";
import { Client, Databases, Query, Users } from "node-appwrite";
import { loadScriptEnv } from "./lib/load-env.mjs";

const env = loadScriptEnv();
const args = parseArgs(process.argv.slice(2));
const targetEmail = requireArg(args, "email").toLowerCase();
const targetLenderId = requireArg(args, "lender-id");

if (!args.apply) {
  throw new Error(
    "This command writes showcase records. Review the target and rerun with --apply.",
  );
}

const config = {
  endpoint: requireEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT"),
  projectId: requireEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID"),
  apiKey: requireEnv("APPWRITE_SETUP_API_KEY"),
  databaseId: requireEnv("NEXT_PUBLIC_APPWRITE_DATABASE_ID"),
  collections: {
    lenders: requireEnv("NEXT_PUBLIC_APPWRITE_LENDERS_COLLECTION_ID"),
    borrowers: requireEnv("NEXT_PUBLIC_APPWRITE_BORROWERS_COLLECTION_ID"),
    collectors: requireEnv("NEXT_PUBLIC_APPWRITE_COLLECTORS_COLLECTION_ID"),
    loans: requireEnv("NEXT_PUBLIC_APPWRITE_LOANS_COLLECTION_ID"),
    payments: requireEnv("NEXT_PUBLIC_APPWRITE_PAYMENTS_COLLECTION_ID"),
  },
};

const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);
const databases = new Databases(client);
const users = new Users(client);

await main();

async function main() {
  const { lender, user } = await requireLinkedLender();
  const anchorDate = todayInColombo();
  const showcase = createShowcaseData(anchorDate);
  const counts = { borrowers: 0, collectors: 0, loans: 0, payments: 0 };

  console.log("Showcase seed target verified:");
  console.log(`- Lender: ${lender.company_name} (${lender.$id})`);
  console.log(`- Login email: ${user.email}`);
  console.log(`- Anchor date: ${anchorDate} (Asia/Colombo)`);

  for (const collector of showcase.collectors) {
    await upsertCollector(lender.$id, collector);
    counts.collectors += 1;
  }

  for (const borrower of showcase.borrowers) {
    const searchText = createBorrowerSearchText(borrower);
    await upsertDocument(config.collections.borrowers, borrower.id, {
      lender_id: lender.$id,
      name: borrower.name,
      business_name: borrower.businessName,
      contact: borrower.contact,
      address: borrower.address,
      search_text: searchText,
      status: borrower.status ?? "active",
      created_at: toIso(addDateOnlyDays(anchorDate, borrower.createdDaysOffset ?? -90)),
    });
    counts.borrowers += 1;

    for (const loan of borrower.loans) {
      const totalPaid = roundMoney(
        loan.payments.reduce((total, payment) => total + payment.amount, 0),
      );
      const remainingAmount = roundMoney(Math.max(loan.amount - totalPaid, 0));
      const status =
        loan.status ?? (remainingAmount === 0 ? "completed" : "active");

      await upsertDocument(config.collections.loans, loan.id, {
        lender_id: lender.$id,
        borrower_id: borrower.id,
        amount: loan.amount,
        interest_rate: loan.interestRate,
        daily_payment: loan.dailyPayment,
        total_paid: totalPaid,
        remaining_amount: remainingAmount,
        start_date: toIso(addDateOnlyDays(anchorDate, loan.startOffset)),
        end_date: toIso(addDateOnlyDays(anchorDate, loan.endOffset)),
        status,
        qr_code: loan.id,
        search_text: searchText,
        created_at: toIso(addDateOnlyDays(anchorDate, loan.createdOffset)),
      });
      counts.loans += 1;

      for (const payment of loan.payments) {
        const paymentDate = toColomboIso(
          addDateOnlyDays(anchorDate, payment.dayOffset),
          payment.time,
        );
        await upsertDocument(config.collections.payments, payment.id, {
          lender_id: lender.$id,
          loan_id: loan.id,
          collector_id: payment.collectorId,
          date: paymentDate,
          amount: payment.amount,
          method: payment.method,
          created_at: paymentDate,
        });
        counts.payments += 1;
      }
    }
  }

  console.log("Showcase data is ready:");
  console.log(`- ${counts.borrowers} borrowers`);
  console.log(`- ${counts.collectors} collectors`);
  console.log(`- ${counts.loans} loans`);
  console.log(`- ${counts.payments} payments`);
  console.log(
    "Existing records and lender login credentials were not changed. Set collector passwords from the lender UI before demonstrating collector login.",
  );
}

async function requireLinkedLender() {
  const matchingUsers = await users.list({
    queries: [Query.equal("email", targetEmail)],
    total: false,
  });
  const user = matchingUsers.users[0];

  if (!user || user.email.toLowerCase() !== targetEmail) {
    throw new Error(`No Appwrite user exists for ${targetEmail}.`);
  }

  const lender = await databases.getDocument({
    databaseId: config.databaseId,
    collectionId: config.collections.lenders,
    documentId: targetLenderId,
  });

  if (
    String(lender.appwrite_user_id ?? "") !== user.$id ||
    String(lender.email ?? "").toLowerCase() !== targetEmail
  ) {
    throw new Error(
      "The supplied lender profile is not linked to the supplied email. No records were written.",
    );
  }

  return { lender, user };
}

async function upsertCollector(lenderId, collector) {
  const data = {
    lender_id: lenderId,
    name: collector.name,
    contact_info: JSON.stringify({
      area: collector.area,
      phone: collector.phone,
    }),
    status: "active",
    created_at: toIso(addDateOnlyDays(todayInColombo(), -75)),
  };

  try {
    const existing = await databases.getDocument({
      databaseId: config.databaseId,
      collectionId: config.collections.collectors,
      documentId: collector.id,
      queries: [Query.select(["$id", "lender_id"])],
    });

    if (String(existing.lender_id ?? "") !== lenderId) {
      throw new Error(
        `Refusing to update collector ${collector.id}; it belongs to another lender.`,
      );
    }

    await databases.updateDocument({
      databaseId: config.databaseId,
      collectionId: config.collections.collectors,
      documentId: collector.id,
      data,
    });
  } catch (error) {
    if (error?.code !== 404) throw error;

    await databases.createDocument({
      databaseId: config.databaseId,
      collectionId: config.collections.collectors,
      documentId: collector.id,
      data: {
        ...data,
        password_hash: hashCollectorPassword(randomBytes(24).toString("base64url")),
      },
    });
  }
}

async function upsertDocument(collectionId, documentId, data) {
  try {
    await databases.createDocument({
      databaseId: config.databaseId,
      collectionId,
      documentId,
      data,
    });
  } catch (error) {
    if (error?.code !== 409) throw error;

    const existing = await databases.getDocument({
      databaseId: config.databaseId,
      collectionId,
      documentId,
      queries: [Query.select(["$id", "lender_id"])],
    });

    if (String(existing.lender_id ?? "") !== targetLenderId) {
      throw new Error(
        `Refusing to update ${collectionId}.${documentId}; it belongs to another lender.`,
      );
    }

    await databases.updateDocument({
      databaseId: config.databaseId,
      collectionId,
      documentId,
      data,
    });
  }
}

function createShowcaseData(anchorDate) {
  const collectors = [
    {
      id: "showcaseamal4821",
      name: "Amal Perera",
      phone: "+94 77 410 4821",
      area: "Colombo Central",
    },
    {
      id: "showcasenadee7316",
      name: "Nadeesha Fernando",
      phone: "+94 71 520 7316",
      area: "Colombo South",
    },
    {
      id: "showcaseishan2945",
      name: "Ishan Silva",
      phone: "+94 76 630 2945",
      area: "Gampaha",
    },
  ];
  const collectorIds = collectors.map((collector) => collector.id);

  return {
    anchorDate,
    collectors,
    borrowers: [
      borrower({
        id: "showcase_borrower_nimal",
        name: "Nimal Perera",
        businessName: "Nimal Grocery",
        contact: "+94 77 221 1001",
        address: "18 High Level Road, Nugegoda",
        loans: [
          loan({
            id: "showcase_loan_nimal_active",
            amount: 240_000,
            interestRate: 12.5,
            dailyPayment: 6_000,
            createdOffset: -40,
            startOffset: -38,
            endOffset: 20,
            payments: paymentSeries({
              prefix: "showcase_payment_nimal",
              amount: 6_000,
              dayOffsets: [-28, -24, -20, -15, -10, -5, -1, 0],
              collectorIds,
              startHour: 8,
            }),
          }),
        ],
      }),
      borrower({
        id: "showcase_borrower_dilini",
        name: "Dilini Fernando",
        businessName: "Dilini Beauty Studio",
        contact: "+94 71 332 1002",
        address: "42 Station Road, Dehiwala",
        loans: [
          loan({
            id: "showcase_loan_dilini_today",
            amount: 150_000,
            interestRate: 10,
            dailyPayment: 5_000,
            createdOffset: -36,
            startOffset: -35,
            endOffset: 0,
            payments: paymentSeries({
              prefix: "showcase_payment_dilini",
              amount: 5_000,
              dayOffsets: [-28, -25, -22, -19, -16, -13, -10, -7, -4, -2, 0],
              collectorIds,
              startHour: 9,
            }),
          }),
        ],
      }),
      borrower({
        id: "showcase_borrower_kasun",
        name: "Kasun Silva",
        businessName: "KS Hardware",
        contact: "+94 76 443 1003",
        address: "7 Main Street, Maharagama",
        loans: [
          loan({
            id: "showcase_loan_kasun_overdue",
            amount: 180_000,
            interestRate: 14,
            dailyPayment: 6_000,
            createdOffset: -55,
            startOffset: -52,
            endOffset: -7,
            status: "overdue",
            payments: paymentSeries({
              prefix: "showcase_payment_kasun",
              amount: 6_000,
              dayOffsets: [-45, -40, -35, -30, -25, -20, -15, -10],
              collectorIds,
              startHour: 10,
            }),
          }),
        ],
      }),
      borrower({
        id: "showcase_borrower_ayesha",
        name: "Ayesha Jayasinghe",
        businessName: "Ayesha Tailors",
        contact: "+94 75 554 1004",
        address: "31 Temple Lane, Kotte",
        loans: [
          loan({
            id: "showcase_loan_ayesha_done",
            amount: 90_000,
            interestRate: 8,
            dailyPayment: 15_000,
            createdOffset: -48,
            startOffset: -45,
            endOffset: -12,
            status: "completed",
            payments: paymentSeries({
              prefix: "showcase_payment_ayesha",
              amount: 15_000,
              dayOffsets: [-42, -38, -34, -30, -26, -22],
              collectorIds,
              startHour: 11,
            }),
          }),
        ],
      }),
      borrower({
        id: "showcase_borrower_chamara",
        name: "Chamara Bandara",
        businessName: "CB Logistics",
        contact: "+94 70 665 1005",
        address: "66 Negombo Road, Wattala",
        loans: [
          loan({
            id: "showcase_loan_chamara_active",
            amount: 500_000,
            interestRate: 15,
            dailyPayment: 10_000,
            createdOffset: -25,
            startOffset: -24,
            endOffset: 35,
            payments: paymentSeries({
              prefix: "showcase_payment_chamara",
              amount: 10_000,
              dayOffsets: [-20, -17, -14, -11, -8, -5, -3, -1, 0],
              collectorIds,
              startHour: 13,
            }),
          }),
        ],
      }),
      borrower({
        id: "showcase_borrower_fathima",
        name: "Fathima Rizwan",
        businessName: "Fathima Cafe",
        contact: "+94 72 776 1006",
        address: "12 Galle Road, Mount Lavinia",
        loans: [
          loan({
            id: "showcase_loan_fathima_soon",
            amount: 110_000,
            interestRate: 9.5,
            dailyPayment: 4_000,
            createdOffset: -30,
            startOffset: -28,
            endOffset: 5,
            payments: paymentSeries({
              prefix: "showcase_payment_fathima",
              amount: 4_000,
              dayOffsets: [-18, -15, -12, -9, -6, -3, -1, 0],
              collectorIds,
              startHour: 15,
            }),
          }),
        ],
      }),
      borrower({
        id: "showcase_borrower_sahan",
        name: "Sahan Wijesinghe",
        businessName: "Sahan Mobile Care",
        contact: "",
        address: "9 Kandy Road, Kadawatha",
        loans: [
          loan({
            id: "showcase_loan_sahan_active",
            amount: 75_000,
            interestRate: 11,
            dailyPayment: 2_500,
            createdOffset: -8,
            startOffset: -7,
            endOffset: 23,
            payments: paymentSeries({
              prefix: "showcase_payment_sahan",
              amount: 2_500,
              dayOffsets: [-5, -3, -1],
              collectorIds,
              startHour: 16,
            }),
          }),
        ],
      }),
    ],
  };
}

function borrower(value) {
  return { createdDaysOffset: -90, status: "active", ...value };
}

function loan(value) {
  return value;
}

function paymentSeries({
  prefix,
  amount,
  dayOffsets,
  collectorIds,
  startHour,
}) {
  const methods = ["cash", "cash", "transfer"];

  return dayOffsets.map((dayOffset, index) => ({
    id: `${prefix}_${String(index + 1).padStart(2, "0")}`,
    amount,
    collectorId: collectorIds[index % collectorIds.length],
    dayOffset,
    method: methods[index % methods.length],
    time: `${String(Math.min(startHour + (index % 3), 18)).padStart(2, "0")}:${String((index * 7) % 60).padStart(2, "0")}`,
  }));
}

function createBorrowerSearchText(borrower) {
  const baseText = [borrower.name, borrower.contact, borrower.address].join(" ");
  const normalizedWords = normalizeSearchText(baseText).split(" ").filter(Boolean);
  const digitWords = baseText.match(/\d+/g) ?? [];
  const tokens = new Set(normalizedWords);

  for (const word of [...normalizedWords, ...digitWords]) {
    for (const fragment of searchFragments(word)) tokens.add(fragment);
  }

  return Array.from(tokens).join(" ").slice(0, 2000);
}

function normalizeSearchText(value) {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, " ").trim();
}

function searchFragments(value) {
  const normalized = normalizeSearchText(value).replaceAll(" ", "");
  const fragments = new Set();
  const maxLength = Math.min(12, normalized.length);

  for (let length = 3; length <= maxLength; length += 1) {
    for (let index = 0; index <= normalized.length - length; index += 1) {
      fragments.add(normalized.slice(index, index + length));
    }
  }

  return fragments;
}

function parseArgs(values) {
  const parsed = { apply: false };

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--apply") {
      parsed.apply = true;
    } else if (value === "--email" || value === "--lender-id") {
      parsed[value.slice(2)] = values[index + 1];
      index += 1;
    }
  }

  return parsed;
}

function requireArg(values, name) {
  const value = String(values[name] ?? "").trim();
  if (!value) throw new Error(`--${name} is required.`);
  return value;
}

function requireEnv(name) {
  const value = env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function todayInColombo() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Colombo",
    year: "numeric",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDateOnlyDays(value, days) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function toIso(value) {
  return `${value}T00:00:00.000Z`;
}

function toColomboIso(date, time) {
  return new Date(`${date}T${time}:00+05:30`).toISOString();
}

function hashCollectorPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
