/**
 * End-to-end check of the required-document checklist across entity types.
 *
 * For each service profile an applicant submits a registration, attaches files
 * against specific checklist headings, uploads one file that belongs to no
 * heading, and then both the customer view and the admin view must report the
 * same uploaded/pending rows with every file sitting under the heading it was
 * actually filed against — never under a different one, and never satisfying a
 * requirement it does not name.
 *
 * Needs the backend running on :5000.
 *   ADMIN_EMAIL=admin@cloudcrest.com npx tsx src/scripts/test-document-checklist.ts
 */
import { db } from "../config/db.js";
import { users, roles } from "../models/schema.js";
import { eq } from "drizzle-orm";
import { createSessionToken } from "../utils/auth.js";

const BASE = "http://localhost:5000";

let failures = 0;
function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`   ✓ ${label}`);
  } else {
    failures++;
    console.log(`   ✗ ${label}`);
    if (detail !== undefined) console.log("      got:", JSON.stringify(detail, null, 2));
  }
}

/**
 * A session cookie for an account, minted the same way the login endpoints mint
 * it. The OTP endpoints are rate-limited per address, which this run would trip
 * immediately; signing the token directly exercises exactly the session the
 * request and admin routes read.
 */
async function sessionFor(userId: number, email: string, roleId: number | null, roleName: string) {
  const token = await createSessionToken({ userId, email, roleId, roleName });
  return `auth_token=${token}`;
}

/** Find, or create, the customer account the applications are filed under. */
async function customerSession(email: string) {
  const [customerRole] = await db.select().from(roles).where(eq(roles.name, "Customer")).limit(1);
  const [created] = await db
    .insert(users)
    .values({
      firstName: "Checklist",
      lastName: "Tester",
      email,
      phone: "+919000000001",
      passwordHash: "test-account-no-password-login",
      roleId: customerRole?.id ?? null,
      status: "active",
    })
    .returning();
  return sessionFor(created.id, created.email, created.roleId, "Customer");
}

function pdf(text: string): Blob {
  return new Blob([`%PDF-1.4\n% ${text}\n`], { type: "application/pdf" });
}

/** One service, with the checklist its wizard files and the fields it collects. */
type Profile = {
  name: string;
  serviceSlug: string;
  serviceTitle: string;
  authority: string;
  form: string;
  checklist: string[];
  /** Indexes of the checklist rows the applicant will attach a file to. */
  upload: number[];
  formData: Record<string, unknown>;
};

const PROFILES: Profile[] = [
  {
    name: "Private Limited Company",
    serviceSlug: "company-private-limited",
    serviceTitle: "Private Limited Company Incorporation",
    authority: "MCA",
    form: "SPICe+ (INC-32)",
    checklist: [
      "PAN & Aadhaar of all directors",
      "Passport-size photographs",
      "Address proof (utility bill < 2 mo)",
      "Registered office proof",
      "Rent agreement + NOC (if rented)",
      "Digital Signature Certificate (DSC)",
      "MoA & AoA drafts",
    ],
    upload: [0, 3, 6],
    formData: {
      name1: "Northwind Technologies Private Limited",
      name2: "Northwind Digital Private Limited",
      suffix: "Private Limited",
      entityClass: "Private Limited Company",
      directors: 2,
      shareholders: 2,
      totalCapital: 1000000,
      paidCapital: 100000,
      industryType: "Information Technology",
      address: "402 Tech Park, Baner Road",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411045",
      objects: "Development and licensing of enterprise software.",
      directorDetails: [
        { fullName: "Asha Menon", designation: "Director", din: "New DIN", pan: "ABCDE1234F" },
        { fullName: "Rohit Verma", designation: "Director", din: "09876543", pan: "ZYXWV9876K" },
      ],
    },
  },
  {
    name: "One Person Company",
    serviceSlug: "company-opc",
    serviceTitle: "One Person Company (OPC) Incorporation",
    authority: "MCA",
    form: "SPICe+ (INC-32)",
    checklist: [
      "PAN & Aadhaar of all directors",
      "Passport-size photographs",
      "Registered office proof",
      "Digital Signature Certificate (DSC)",
      "MoA & AoA drafts",
      "INC-3 Nominee Consent Form",
    ],
    upload: [0, 5],
    formData: {
      name1: "Solo Ventures (OPC) Private Limited",
      entityClass: "One Person Company",
      directors: 1,
      nominee: "Priya Nair",
      totalCapital: 500000,
      address: "7 Residency Lane",
      city: "Kochi",
      state: "Kerala",
      pincode: "682016",
      objects: "Consulting services.",
    },
  },
  {
    name: "Section 8 Company",
    serviceSlug: "company-section-8",
    serviceTitle: "Section 8 Company (Non-Profit) Incorporation",
    authority: "MCA",
    form: "SPICe+ (INC-32)",
    checklist: [
      "PAN & Aadhaar of all directors",
      "Registered office proof",
      "MoA & AoA drafts",
      "Form INC-12 / Section 8 License Approval",
    ],
    upload: [1, 2, 3],
    formData: {
      name1: "Vidya Foundation",
      entityClass: "Section 8 Company",
      directors: 3,
      natureOfActivities: "Education and literacy programmes for underserved children.",
      address: "9 Charity Road",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
      objects: "Promotion of education.",
    },
  },
  {
    name: "Limited Liability Partnership",
    serviceSlug: "llp",
    serviceTitle: "LLP Registration",
    authority: "MCA",
    form: "FiLLiP",
    checklist: [
      "PAN & Aadhaar of all partners",
      "Passport-size photographs",
      "Registered office proof",
      "Digital Signature Certificate (DSC)",
      "LLP Agreement draft",
    ],
    upload: [0, 4],
    formData: {
      name1: "Meridian Advisors LLP",
      partnersCount: 2,
      totalCapital: 200000,
      address: "3rd Floor, Cyber Heights",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500081",
      objects: "Management consultancy.",
      partnerDetails: [
        { fullName: "Kavya Reddy", designation: "Designated Partner", dpin: "New DPIN" },
        { fullName: "Imran Shaikh", designation: "Designated Partner", dpin: "01234567" },
      ],
    },
  },
  {
    name: "Sole Proprietorship",
    serviceSlug: "sole-proprietorship",
    serviceTitle: "Sole Proprietorship Registration",
    authority: "MSME / Udyam",
    form: "Udyam",
    checklist: [
      "PAN Card of Proprietor",
      "Aadhaar Card of Proprietor",
      "Passport-size photograph of Proprietor",
      "Business Premises Address Proof (Electricity Bill / Rent Agreement)",
    ],
    upload: [0, 2],
    formData: {
      proprietorName: "Checklist Tester",
      tradeName: "Checklist Traders",
      address: "12 Test Street",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      bankDetails: { accountNumber: "000111222333", ifsc: "TEST0001234" },
    },
  },
];

async function runProfile(profile: Profile, cookie: string, adminCookie: string | null) {
  console.log(`\n── ${profile.name} (${profile.serviceSlug})`);

  const submit = await fetch(`${BASE}/api/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      serviceSlug: profile.serviceSlug,
      serviceTitle: profile.serviceTitle,
      authority: profile.authority,
      form: profile.form,
      contactName: "Checklist Tester",
      contactEmail: CURRENT_EMAIL,
      contactPhone: "+919000000001",
      notes: `Automated checklist test — ${profile.name}`,
      formData: { ...profile.formData, requiredDocuments: profile.checklist },
    }),
  });
  const request = await submit.json();
  check("registration created", submit.status === 201 && !!request.id, request);
  if (!request.id) return;
  const requestId = request.id;

  // Attach a file to some of the checklist rows, each tagged with its heading.
  const expectedUploaded = profile.upload.map((i) => profile.checklist[i]);
  for (const heading of expectedUploaded) {
    const body = new FormData();
    body.append("file", pdf(heading), `${heading.replace(/\W+/g, "_").slice(0, 24)}.pdf`);
    body.append("label", heading);
    const res = await fetch(`${BASE}/api/requests/${requestId}/documents`, {
      method: "POST",
      headers: { Cookie: cookie },
      body,
    });
    const json = await res.json();
    check(
      `filed under "${heading}"`,
      res.status === 201 && json.documents?.[0]?.docLabel === heading,
      json.documents?.[0]
    );
  }

  // One file that names no checklist row must not satisfy any of them.
  const extra = new FormData();
  extra.append("file", pdf("extra"), "covering-letter.pdf");
  await fetch(`${BASE}/api/requests/${requestId}/documents`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: extra,
  });

  const expectedPending = profile.checklist.filter((d) => !expectedUploaded.includes(d));

  // Customer view.
  const mine = await fetch(`${BASE}/api/requests/${requestId}`, { headers: { Cookie: cookie } });
  const detail = await mine.json();
  check(
    "customer sees the checklist it was filed against",
    JSON.stringify(detail.requiredDocuments) === JSON.stringify(profile.checklist),
    detail.requiredDocuments
  );
  const custLabels: string[] = (detail.documents ?? []).map((d: any) => d.docLabel).filter(Boolean);
  check(
    `customer: ${expectedUploaded.length} uploaded under the right headings`,
    JSON.stringify([...custLabels].sort()) === JSON.stringify([...expectedUploaded].sort()),
    custLabels
  );
  check(
    `customer: ${expectedPending.length} still pending`,
    expectedPending.every((d) => !custLabels.includes(d)),
    expectedPending
  );
  check(
    "customer: the unlabelled file satisfies nothing",
    (detail.documents ?? []).length === expectedUploaded.length + 1 &&
      custLabels.length === expectedUploaded.length,
    (detail.documents ?? []).map((d: any) => ({ name: d.name, docLabel: d.docLabel }))
  );

  if (!adminCookie) return;

  // Admin view — must agree with the customer, field for field and row for row.
  const res = await fetch(`${BASE}/api/admin/requests/${requestId}`, {
    headers: { Cookie: adminCookie },
  });
  const adminDetail = await res.json();
  check(
    "admin sees the same checklist",
    JSON.stringify(adminDetail.requiredDocuments) === JSON.stringify(detail.requiredDocuments),
    adminDetail.requiredDocuments
  );
  const adminLabels: string[] = (adminDetail.documents ?? [])
    .map((d: any) => d.docLabel)
    .filter(Boolean);
  check(
    "admin sees the same uploaded headings",
    JSON.stringify([...adminLabels].sort()) === JSON.stringify([...custLabels].sort()),
    adminLabels
  );

  // Every value the applicant submitted must survive to the admin, exactly.
  const adminFd = JSON.parse(adminDetail.formData ?? "{}");
  const missing: string[] = [];
  const walk = (obj: any, stored: any, path: string) => {
    for (const [k, v] of Object.entries(obj)) {
      const got = stored?.[k];
      if (v !== null && typeof v === "object") {
        if (got == null) missing.push(`${path}${k}`);
        else walk(v, got, `${path}${k}.`);
      } else if (JSON.stringify(got) !== JSON.stringify(v)) {
        missing.push(`${path}${k} (${JSON.stringify(got)} ≠ ${JSON.stringify(v)})`);
      }
    }
  };
  walk(profile.formData, adminFd, "");
  check("admin sees every submitted field with its exact value", missing.length === 0, missing);

  const list = await fetch(`${BASE}/api/admin/requests`, { headers: { Cookie: adminCookie } });
  const row = (await list.json()).find((x: any) => x.id === requestId);
  check(
    `admin list shows ${expectedUploaded.length}/${profile.checklist.length} attached`,
    row?.requiredCount === profile.checklist.length &&
      row?.documentsCount === expectedUploaded.length + 1,
    { requiredCount: row?.requiredCount, documentsCount: row?.documentsCount }
  );
}

let CURRENT_EMAIL = "";

async function run() {
  CURRENT_EMAIL = `doc_checklist_${Date.now()}@example.com`;
  console.log(`Applicant: ${CURRENT_EMAIL}`);
  const cookie = await customerSession(CURRENT_EMAIL);

  const adminEmail = process.env.ADMIN_EMAIL;
  const [admin] = adminEmail
    ? await db.select().from(users).where(eq(users.email, adminEmail)).limit(1)
    : [];
  const adminCookie = admin
    ? await sessionFor(admin.id, admin.email, admin.roleId, "Admin")
    : null;
  if (!adminCookie) console.log("(admin checks skipped — set ADMIN_EMAIL to an admin account)");

  for (const profile of PROFILES) {
    await runProfile(profile, cookie, adminCookie);
  }

  console.log(
    failures === 0 ? "\n✅ All checks passed.\n" : `\n❌ ${failures} check(s) failed.\n`
  );
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((err) => {
  console.error("\n💥 Test run failed:", err);
  process.exit(1);
});
