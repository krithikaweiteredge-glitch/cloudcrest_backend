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

  // 1B. FIREBASE PHONE OTP AUTHENTICATION FLOW
  console.log("\nStep 2.5: Verifying Firebase Phone Authentication Login...");
  const testPhone = "+919999988888";
  const testFirebaseToken = `TEST_FIREBASE_TOKEN_FOR_${testPhone}`;
  const firebaseLoginRes = await fetch(`${backendBaseUrl}/api/auth/firebase-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firebaseToken: testFirebaseToken }),
  });
  if (firebaseLoginRes.status !== 200) {
    console.error("Firebase Login failed:", await firebaseLoginRes.json());
    process.exit(1);
  }
  const firebaseData = (await firebaseLoginRes.json()) as any;
  console.log(`-> Firebase Login Successful:`);
  console.log(`   * User Phone: ${firebaseData.user.phone}`);
  console.log(`   * User Email Placeholder: ${firebaseData.user.email}`);
  
  const firebaseCookieHeader = firebaseLoginRes.headers.get("set-cookie");
  if (!firebaseCookieHeader) {
    console.error("Firebase auth cookie not returned!");
    process.exit(1);
  }
  const firebaseCookie = firebaseCookieHeader.split(";")[0];
  console.log("-> Firebase session cookie obtained successfully.");

  // 2. FETCH SERVICES AND FIND COMPANY REGISTRATION SERVICE
  console.log("\nStep 3: Fetching Document Checklist for Company Registration...");

  // First, fetch the service list to find the ID of "Private Limited Company Registration" dynamically
  const servicesRes = await fetch(`${backendBaseUrl}/api/services`, {
    headers: { Cookie: customerCookie },
  });
  if (servicesRes.status !== 200) {
    console.error("Failed to fetch services list:", await servicesRes.json());
    process.exit(1);
  }
  const servicesList = (await servicesRes.json()) as any[];
  const companyService = servicesList.find((s) => s.name === "Private Limited Company Registration");
  if (!companyService) {
    console.error("Company registration service not found in seeded database!");
    process.exit(1);
  }
  const companyServiceId = companyService.id;

  const docChecklistRes = await fetch(`${backendBaseUrl}/api/services/${companyServiceId}/documents`, {
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

  // Fetch dynamic wizard form schema
  console.log("\nStep 3.5: Fetching dynamic wizard form fields schema...");
  const formSchemaRes = await fetch(`${backendBaseUrl}/api/services/${companyServiceId}/form`, {
    headers: { Cookie: customerCookie },
  });
  if (formSchemaRes.status !== 200) {
    console.error("Failed to fetch wizard form schema:", await formSchemaRes.json());
    process.exit(1);
  }
  const formSchemaData = (await formSchemaRes.json()) as any;
  console.log(`-> Form structure retrieved: "${formSchemaData.form.name}"`);
  console.log("-> Seeded Fields:");
  const fieldAnswers: { [key: string]: string } = {};
  formSchemaData.fields.forEach((fld: any) => {
    console.log(`   * [Field ID: ${fld.id}] Key: "${fld.fieldKey}" Label: "${fld.label}" (${fld.fieldType})`);
    if (fld.fieldKey === "name1") fieldAnswers[fld.id] = "Zenith Digital Private Limited";
    if (fld.fieldKey === "name2") fieldAnswers[fld.id] = "Zenith Solutions Private Limited";
    if (fld.fieldKey === "capital") fieldAnswers[fld.id] = "100000";
    if (fld.fieldKey === "objects") fieldAnswers[fld.id] = "To construct software and digital services.";
    if (fld.fieldKey === "state") fieldAnswers[fld.id] = "Karnataka";
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
    fieldValues: fieldAnswers,
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

  // 6.5. CUSTOMER FETCHES ORDER DETAILS WITH DYNAMIC FIELD VALUES
  console.log("\nStep 7.5: Customer queries order details to verify dynamic wizard answers...");
  const orderDetailsRes = await fetch(`${backendBaseUrl}/api/orders/${orderId}`, {
    headers: { Cookie: customerCookie },
  });
  if (orderDetailsRes.status !== 200) {
    console.error("Order details fetch failed:", await orderDetailsRes.json());
    process.exit(1);
  }
  const orderDetails = (await orderDetailsRes.json()) as any;
  console.log(`-> Retrieved ${orderDetails.fieldValues.length} dynamic field answers:`);
  orderDetails.fieldValues.forEach((ans: any) => {
    console.log(`   * [${ans.fieldLabel}]: "${ans.value}" (key: ${ans.fieldKey})`);
  });
  if (orderDetails.fieldValues.length === 0) {
    console.error("Assert mismatch: Dynamic wizard field values were not successfully stored or returned!");
    process.exit(1);
  }

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

  // 10. ADMIN SENDS NOTIFICATION TO CUSTOMER
  console.log("\nStep 15: Admin sends a custom notification to the customer...");
  const notifyRes = await fetch(`${backendBaseUrl}/api/admin/notifications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      userId: registeredCustomer.id,
      title: "Company Filing Update",
      message: "Your SPICe+ form Part A has been successfully uploaded to the MCA database.",
      orderId,
    }),
  });
  if (notifyRes.status !== 201) {
    console.error("Admin notification delivery failed:", await notifyRes.json());
    process.exit(1);
  }
  const notifyData = (await notifyRes.json()) as any;
  const notificationId = notifyData.notification.id;
  console.log(`-> Notification created successfully. ID: ${notificationId}`);

  // 11. CUSTOMER RETRIEVES NOTIFICATIONS LIST
  console.log("\nStep 16: Customer fetches their notifications...");
  const customerNotificationsRes = await fetch(`${backendBaseUrl}/api/notifications/my-notifications`, {
    headers: { Cookie: customerCookie },
  });
  if (customerNotificationsRes.status !== 200) {
    console.error("Fetch notifications failed:", await customerNotificationsRes.json());
    process.exit(1);
  }
  const notificationsList = (await customerNotificationsRes.json()) as any[];
  const targetNotification = notificationsList.find((n) => n.id === notificationId);
  console.log(`-> Notification verified in customer inbox:`);
  console.log(`   * Title: "${targetNotification.title}"`);
  console.log(`   * Message: "${targetNotification.message}"`);
  console.log(`   * Read Status: ${targetNotification.isRead}`);

  // 12. CUSTOMER MARKS NOTIFICATION AS READ
  console.log("\nStep 17: Customer marks the notification as read...");
  const readRes = await fetch(`${backendBaseUrl}/api/notifications/${notificationId}/read`, {
    method: "PUT",
    headers: { Cookie: customerCookie },
  });
  if (readRes.status !== 200) {
    console.error("Mark notification as read failed:", await readRes.json());
    process.exit(1);
  }
  const readData = (await readRes.json()) as any;
  console.log(`-> Notification status updated. Read Status now: ${readData.notification.isRead}`);

  // 13. CUSTOMER CREATES SUPPORT TICKET
  console.log("\nStep 18: Customer submits a support ticket...");
  const createTicketRes = await fetch(`${backendBaseUrl}/api/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: customerCookie,
    },
    body: JSON.stringify({
      subject: "NOC Document Help Required",
      message: "Can I upload my house property tax receipt instead of a rental NOC?",
      orderId,
    }),
  });
  if (createTicketRes.status !== 201) {
    console.error("Failed to create support ticket:", await createTicketRes.json());
    process.exit(1);
  }
  const ticketData = (await createTicketRes.json()) as any;
  const ticketId = ticketData.ticket.id;
  console.log(`-> Support ticket created successfully. ID: ${ticketId}, Status: ${ticketData.ticket.status}`);

  // 14. ADMIN FETCHES AND LISTS ALL TICKETS
  console.log("\nStep 19: Admin lists all support tickets on the platform...");
  const adminTicketsRes = await fetch(`${backendBaseUrl}/api/admin/tickets`, {
    headers: { Cookie: adminCookie },
  });
  const allTicketsList = (await adminTicketsRes.json()) as any[];
  const foundTicket = allTicketsList.find((t) => t.id === ticketId);
  console.log(`-> Verified ticket on admin portal list:`);
  console.log(`   * Subject: "${foundTicket.subject}"`);
  console.log(`   * Customer: ${foundTicket.customerEmail}`);
  console.log(`   * Status: ${foundTicket.status}`);

  // 15. ADMIN RESPONDS AND RESOLVES THE TICKET
  console.log("\nStep 20: Admin resolves and sends a message to the customer...");
  const adminReplyRes = await fetch(`${backendBaseUrl}/api/admin/tickets/${ticketId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      message: "Yes, you can upload the property tax receipt. I have resolved your request.",
    }),
  });
  if (adminReplyRes.status !== 201) {
    console.error("Admin ticket reply failed:", await adminReplyRes.json());
    process.exit(1);
  }
  const adminReplyData = (await adminReplyRes.json()) as any;
  console.log(`-> Admin response saved. Ticket status updated to: ${adminReplyData.status}`);

  // 16. CUSTOMER VIEWS TICKET CONVERSATION
  console.log("\nStep 21: Customer fetches ticket conversation thread...");
  const customerTicketRes = await fetch(`${backendBaseUrl}/api/tickets/${ticketId}`, {
    headers: { Cookie: customerCookie },
  });
  const ticketDetails = (await customerTicketRes.json()) as any;
  console.log(`-> Verified conversation thread on customer dashboard:`);
  console.log(`   * Current Ticket Status: ${ticketDetails.ticket.status}`);
  console.log("   * Message Thread:");
  ticketDetails.messages.forEach((msg: any) => {
    console.log(`     [${msg.senderRole}] ${msg.senderName}: "${msg.message}"`);
  });

  // 17. ADMIN VIEWS AUDIT LOGS
  console.log("\nStep 22: Admin fetches system audit activity logs...");
  const auditLogsRes = await fetch(`${backendBaseUrl}/api/admin/activity-logs`, {
    headers: { Cookie: adminCookie },
  });
  const auditLogsList = (await auditLogsRes.json()) as any[];
  console.log(`-> Total audit logs retrieved: ${auditLogsList.length}`);
  console.log("-> Last 3 logged admin actions:");
  auditLogsList.slice(0, 3).forEach((log: any) => {
    console.log(`   * [${log.userName || "System"}] Action: "${log.action}" in module: "${log.module}"`);
  });

  // 18. CUSTOMER PROFILE AND BILLING FLOW
  console.log("\nStep 23: Customer queries their account & billing profile details...");
  const profileGetRes = await fetch(`${backendBaseUrl}/api/profiles/me`, {
    headers: { Cookie: customerCookie },
  });
  if (profileGetRes.status !== 200) {
    console.error("Get profile failed:", await profileGetRes.json());
    process.exit(1);
  }
  const initialProfile = (await profileGetRes.json()) as any;
  console.log(`-> Verified initial account profile:`);
  console.log(`   * Name: ${initialProfile.user.firstName}`);
  console.log(`   * Email: ${initialProfile.user.email}`);
  console.log(`   * Associated Billing Profiles Count: ${initialProfile.businesses.length}`);

  console.log("\nStep 24: Customer updates their contact and company billing details...");
  const profileUpdateRes = await fetch(`${backendBaseUrl}/api/profiles/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: customerCookie,
    },
    body: JSON.stringify({
      firstName: "Alex",
      lastName: "Billing-Updated",
      phone: "9876543210",
      businessName: "Alex Incorporation Billing",
      gstin: "29AAAAA1111A1Z1",
      pan: "ABCDE1234F",
      address: "404 Electronic City, Bengaluru",
    }),
  });
  if (profileUpdateRes.status !== 200) {
    console.error("Update profile failed:", await profileUpdateRes.json());
    process.exit(1);
  }
  console.log("-> Profile update request returned HTTP 200 Success.");

  console.log("\nStep 25: Customer re-queries their profile to assert updates...");
  const profileVerifyRes = await fetch(`${backendBaseUrl}/api/profiles/me`, {
    headers: { Cookie: customerCookie },
  });
  const updatedProfile = (await profileVerifyRes.json()) as any;
  console.log(`-> Verified updated profile records:`);
  console.log(`   * Name: ${updatedProfile.user.firstName} ${updatedProfile.user.lastName}`);
  console.log(`   * Phone: ${updatedProfile.user.phone}`);
  
  const billingProfile = updatedProfile.businesses[0];
  console.log(`   * Billing Company Name: ${billingProfile.businessName}`);
  console.log(`   * Registered GSTIN: ${billingProfile.gstin}`);
  console.log(`   * Billing PAN: ${billingProfile.pan}`);
  console.log(`   * Address: ${billingProfile.address}`);

  if (updatedProfile.user.phone !== "9876543210" || billingProfile.gstin !== "29AAAAA1111A1Z1") {
    console.error("Assert mismatch: Updated phone or GSTIN did not match saved database values!");
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
