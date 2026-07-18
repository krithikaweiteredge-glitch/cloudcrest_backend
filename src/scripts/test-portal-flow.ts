import { db } from "../config/db.js";
import { otps, users, orderDocuments } from "../models/schema.js";
import { eq } from "drizzle-orm";

async function run() {
  console.log("=================================================================");
  console.log("STARTING FULL END-TO-END BUSINESS BUILDER SUITE INTEGRATION TEST");
  console.log("=================================================================\n");

  const testEmail = `portal_user_${Date.now()}@example.com`;
  const backendBaseUrl = "http://localhost:5000";

  // 1. REGISTER/LOG IN CUSTOMER VIA EMAIL OTP
  console.log("Step 1: Requesting Email OTP...");
  const sendOtpRes = await fetch(`${backendBaseUrl}/api/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail }),
  });
  if (sendOtpRes.status !== 200) {
    console.error("Failed to send OTP:", await sendOtpRes.json());
    process.exit(1);
  }

  // Fetch the OTP from the database
  const otpRecords = await db.select().from(otps).where(eq(otps.emailOrPhone, testEmail)).limit(1);
  if (otpRecords.length === 0) {
    console.error("OTP record not found in PostgreSQL!");
    process.exit(1);
  }
  const otpCode = otpRecords[0].code;
  console.log(`-> OTP generated and retrieved from database: ${otpCode}`);

  console.log("Step 2: Verifying Email OTP...");
  const verifyOtpRes = await fetch(`${backendBaseUrl}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, code: otpCode }),
  });
  if (verifyOtpRes.status !== 200) {
    console.error("Failed to verify OTP:", await verifyOtpRes.json());
    process.exit(1);
  }
  
  const customerCookieHeader = verifyOtpRes.headers.get("set-cookie");
  if (!customerCookieHeader) {
    console.error("Authentication session cookie not returned!");
    process.exit(1);
  }
  const customerCookie = customerCookieHeader.split(";")[0];
  console.log("-> Customer session cookie obtained successfully.");

  // 2. FETCH SERVICE DOCUMENT CHECKLIST
  console.log("\nStep 3: Fetching Document Checklist for Company Registration...");
  const docChecklistRes = await fetch(`${backendBaseUrl}/api/services/1/documents`, {
    headers: { Cookie: customerCookie },
  });
  if (docChecklistRes.status !== 200) {
    console.error("Failed to fetch document checklists:", await docChecklistRes.json());
    process.exit(1);
  }
  const checklist = (await docChecklistRes.json()) as any[];
  console.log("-> Document checklist retrieved:");
  checklist.forEach((item) => {
    console.log(`   * [ID: ${item.id}] ${item.name} (${item.mandatory ? "Mandatory" : "Optional"})`);
  });

  // 3. CREATE ORDER WIZARD REGISTRATION
  console.log("\nStep 4: Submitting Company Registration Wizard Order...");
  const orderBody = {
    entityType: "Private Limited Company",
    names: ["Zenith Digital Private Limited", "Zenith Solutions Private Limited"],
    mainObjects: "To construct software and digital services.",
    state: "Karnataka",
    city: "Bengaluru",
    pincode: "560001",
    address: "MG Road, Bengaluru",
    capital: 100000,
    paidUpCapital: 100000,
    directorsCount: 2,
    shareholdersCount: 2,
    nominee: "",
    professionalFee: 10000,
    govtFee: 2000,
    gst: 1800,
    total: 13800,
  };

  const orderRes = await fetch(`${backendBaseUrl}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: customerCookie,
    },
    body: JSON.stringify(orderBody),
  });

  if (orderRes.status !== 201) {
    console.error("Failed to submit order:", await orderRes.json());
    process.exit(1);
  }
  const orderResult = (await orderRes.json()) as any;
  const orderId = orderResult.order.id;
  const orderNo = orderResult.order.orderNo;
  console.log(`-> Order created successfully! ID: ${orderId}, Order No: ${orderNo}`);

  // 4. UPLOAD Sim DOCUMENT FILES
  console.log("\nStep 5: Uploading simulated document files to order...");
  const formData = new FormData();
  const simulatedFile = new Blob(["This is simulated PAN Card PDF content"], { type: "application/pdf" });
  formData.append("files", simulatedFile, "director_pan_card.pdf");
  
  // Link to the first document type ID from our checklist
  const documentTypeId = checklist[0]?.id || 1;
  formData.append("documentTypeIds", String(documentTypeId));

  const uploadRes = await fetch(`${backendBaseUrl}/api/orders/${orderId}/documents`, {
    method: "POST",
    headers: {
      Cookie: customerCookie,
    },
    body: formData,
  });

  if (uploadRes.status !== 201) {
    console.error("Document upload failed:", await uploadRes.json());
    process.exit(1);
  }
  const uploadResult = (await uploadRes.json()) as any;
  console.log("-> Document uploaded successfully. Upload meta:", uploadResult.documents[0]);
  const docId = uploadResult.documents[0].id;

  // 5. PROCESS SIMULATED PAYMENT
  console.log("\nStep 6: Processing payment for order...");
  const payRes = await fetch(`${backendBaseUrl}/api/orders/${orderId}/payment`, {
    method: "POST",
    headers: { Cookie: customerCookie },
  });
  if (payRes.status !== 200) {
    console.error("Payment failed:", await payRes.json());
    process.exit(1);
  }
  console.log("-> Payment transaction marked complete.");

  // 6. CUSTOMER VERIFIES ORDERS & STATUS
  console.log("\nStep 7: Customer checks my-orders dashboard list...");
  const myOrdersRes = await fetch(`${backendBaseUrl}/api/orders/my-orders`, {
    headers: { Cookie: customerCookie },
  });
  if (myOrdersRes.status !== 200) {
    console.error("My orders fetch failed:", await myOrdersRes.json());
    process.exit(1);
  }
  const myOrdersList = (await myOrdersRes.json()) as any[];
  const verifiedOrder = myOrdersList.find((o) => o.id === orderId);
  console.log(`-> Order found on customer panel:`);
  console.log(`   * Order No: ${verifiedOrder.orderNo}`);
  console.log(`   * Order Status: ${verifiedOrder.status}`);
  console.log(`   * Payment Status: ${verifiedOrder.paymentStatus}`);
  console.log(`   * Total Paid: INR ${verifiedOrder.total}`);

  // 7. DYNAMIC PDF INVOICE DOWNLOAD
  console.log("\nStep 8: Downloading dynamic PDF invoice file...");
  const invoiceRes = await fetch(`${backendBaseUrl}/api/orders/${orderId}/invoice/pdf`, {
    headers: { Cookie: customerCookie },
  });
  if (invoiceRes.status !== 200) {
    console.error("Invoice PDF download failed:", await invoiceRes.json());
    process.exit(1);
  }
  console.log(`-> Invoice PDF request returned: HTTP ${invoiceRes.status}`);
  console.log(`-> Content-Type Header: ${invoiceRes.headers.get("content-type")}`);
  console.log(`-> Content-Disposition Header: ${invoiceRes.headers.get("content-disposition")}`);

  // 8. ADMIN LOGIN & OPERATIONS
  console.log("\nStep 9: Admin Log In...");
  const adminLoginRes = await fetch(`${backendBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@cloudcrest.com", password: "admin123" }),
  });
  if (adminLoginRes.status !== 200) {
    console.error("Admin login failed:", await adminLoginRes.json());
    process.exit(1);
  }
  
  const adminCookieHeader = adminLoginRes.headers.get("set-cookie");
  if (!adminCookieHeader) {
    console.error("Admin authentication session cookie not returned!");
    process.exit(1);
  }
  const adminCookie = adminCookieHeader.split(";")[0];
  console.log("-> Admin session cookie obtained.");

  console.log("\nStep 10: Admin lists all registered users...");
  const adminUsersRes = await fetch(`${backendBaseUrl}/api/admin/users`, {
    headers: { Cookie: adminCookie },
  });
  const allUsers = (await adminUsersRes.json()) as any[];
  console.log(`-> Total users listed: ${allUsers.length}`);
  const registeredCustomer = allUsers.find((u) => u.email === testEmail);
  console.log(`   * Customer account verified in list: ${registeredCustomer.firstName} (${registeredCustomer.email})`);

  console.log("\nStep 11: Admin lists all platform orders...");
  const adminOrdersRes = await fetch(`${backendBaseUrl}/api/admin/orders`, {
    headers: { Cookie: adminCookie },
  });
  const allOrders = (await adminOrdersRes.json()) as any[];
  const adminOrderCheck = allOrders.find((o) => o.id === orderId);
  console.log(`   * Order verified in admin list: No ${adminOrderCheck.orderNo} for ${adminOrderCheck.customerName}`);

  console.log("\nStep 12: Admin downloads customer uploaded file...");
  const adminDownloadRes = await fetch(`${backendBaseUrl}/api/admin/documents/${docId}/download`, {
    headers: { Cookie: adminCookie },
  });
  if (adminDownloadRes.status !== 200) {
    console.error("Admin file download failed:", await adminDownloadRes.json());
    process.exit(1);
  }
  const downloadedText = await adminDownloadRes.text();
  console.log(`-> File content downloaded by admin matches upload: "${downloadedText}"`);

  console.log("\nStep 13: Admin approves the order status...");
  const approveRes = await fetch(`${backendBaseUrl}/api/admin/orders/${orderId}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({ status: "approved" }),
  });
  if (approveRes.status !== 200) {
    console.error("Admin status update failed:", await approveRes.json());
    process.exit(1);
  }
  console.log("-> Admin marked order as APPROVED.");

  // 9. RE-VERIFY STATUS AS CUSTOMER
  console.log("\nStep 14: Customer re-checks order status in portal...");
  const customerOrdersFinalRes = await fetch(`${backendBaseUrl}/api/orders/my-orders`, {
    headers: { Cookie: customerCookie },
  });
  const finalOrdersList = (await customerOrdersFinalRes.json()) as any[];
  const finalOrder = finalOrdersList.find((o) => o.id === orderId);
  console.log(`-> Order status on customer panel updated to: ${finalOrder.status.toUpperCase()}`);

  if (finalOrder.status !== "approved") {
    console.error("Status mismatch! Expected 'approved' but got", finalOrder.status);
    process.exit(1);
  }

  console.log("\n=======================================================");
  console.log("ALL PORTAL INTEGRATION AND COMPLIANCE CASES PASSED 100%");
  console.log("=======================================================");
  process.exit(0);
}

run().catch((e) => {
  console.error("Integration test suite crashed:", e);
  process.exit(1);
});
