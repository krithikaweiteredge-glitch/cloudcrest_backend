import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

// Define output path
const outputDir = "C:/Users/komal/.gemini/antigravity/brain/bb065483-e8aa-45db-b77a-040e9d878ab8";
const outputPath = path.join(outputDir, "mca_api_comparison.pdf");

// Ensure directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const doc = new PDFDocument({ margin: 50, size: "A4" });
const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// --- Styling Helpers ---
const PRIMARY_COLOR = "#0F172A"; // Dark Slate
const ACCENT_COLOR = "#0284C7"; // Ocean Blue
const TEXT_COLOR = "#334155"; // Cool Grey text
const BORDER_COLOR = "#E2E8F0"; // Light border
const CARD_BG = "#F8FAFC"; // Soft background

// Title Header
doc.fillColor(ACCENT_COLOR).fontSize(10).text("TECHNICAL EVALUATION REPORT", { characterSpacing: 1.5 });
doc.moveDown(0.2);
doc.fillColor(PRIMARY_COLOR).fontSize(24).font("Helvetica-Bold").text("MCA Company Name Availability API Options");
doc.moveDown(0.5);
doc.strokeColor(ACCENT_COLOR).lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
doc.moveDown(1.5);

// Executive Summary
doc.fillColor(PRIMARY_COLOR).fontSize(14).font("Helvetica-Bold").text("1. Executive Summary");
doc.moveDown(0.5);
doc.fillColor(TEXT_COLOR).fontSize(10.5).font("Helvetica").lineGap(4).text(
  "This report evaluates programmatic solutions for verifying Indian company name availability. " +
  "Since the Ministry of Corporate Affairs (MCA) does not offer a direct public REST API for name checks, " +
  "businesses must rely on alternative integration strategies. We evaluate four distinct approaches based on " +
  "cost-effectiveness, ease of setup, and compliance overhead.",
  { align: "justify" }
);
doc.moveDown(1.5);

// Comparison Table
doc.fillColor(PRIMARY_COLOR).fontSize(14).font("Helvetica-Bold").text("2. Comparative Overview");
doc.moveDown(0.8);

// Table Header
const startX = 50;
const startY = doc.y;
const colWidths = [120, 100, 100, 175];
const headers = ["Option", "Cost / Request", "Free Tier", "Best For"];

doc.font("Helvetica-Bold").fontSize(10).fillColor(PRIMARY_COLOR);

// Render Headers
let currentX = startX;
for (let i = 0; i < headers.length; i++) {
  doc.text(headers[i], currentX, startY);
  currentX += colWidths[i];
}
doc.moveDown(0.5);
doc.strokeColor(BORDER_COLOR).lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
doc.moveDown(0.5);

// Table Rows
const rows = [
  ["API Setu (Govt)", "Free (\u20B90.00)", "Unlimited", "Approved Startups & Orgs"],
  ["Google Custom Search", "~\u20B90.40 ($0.005)", "100 checks/day", "Low-budget / Agile check"],
  ["Apify Scraper", "~\u20B90.40 - \u20B90.80", "No free tier", "Programmatic portal query"],
  ["RapidAPI / Attestr", "~\u20B91.60 - \u20B92.50", "40-100 checks/month", "Out-of-the-box REST API"]
];

doc.font("Helvetica").fontSize(9.5).fillColor(TEXT_COLOR);
for (const row of rows) {
  let rowY = doc.y;
  let cellX = startX;
  for (let i = 0; i < row.length; i++) {
    doc.text(row[i], cellX, rowY, { width: colWidths[i] - 10 });
    cellX += colWidths[i];
  }
  doc.moveDown(0.8);
  doc.strokeColor(BORDER_COLOR).lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.5);
}
doc.moveDown(1.5);

// Section 3: Detailed Options
doc.fillColor(PRIMARY_COLOR).fontSize(14).font("Helvetica-Bold").text("3. Detailed Options Analysis");
doc.moveDown(0.8);

const optionsData = [
  {
    title: "Option A: API Setu (Government of India)",
    points: [
      "Cost: Completely Free (\u20B90.00 / query).",
      "Mechanism: Official direct connection to the MCA registry.",
      "Pros: Highly reliable, accurate, and completely free.",
      "Cons: Requires submitting organization documents (GST, Certificate of Incorporation, corporate domain email, authority letter) for manual approval."
    ]
  },
  {
    title: "Option B: Google Custom Search API",
    points: [
      "Cost: Free for first 100 queries/day; $5 per 1,000 queries thereafter (~\u20B90.40 per search).",
      "Mechanism: Query Google for matching index pages of corporate databases like ZaubaCorp or Tofler.",
      "Pros: Setup is under 5 minutes, extremely cheap, zero paperwork required.",
      "Cons: Indirect lookup (caches data indexed by search engines)."
    ]
  },
  {
    title: "Option C: RapidAPI / Attestr",
    points: [
      "Cost: Approx \u20B91.60 - \u20B92.50 per check (Structured in monthly subscription packages).",
      "Mechanism: REST API aggregator that proxies the MCA portal.",
      "Pros: Standard API architecture with easy dashboard monitoring and sandbox.",
      "Cons: High cost at scale (e.g. $29/mo starter fees)."
    ]
  }
];

for (const option of optionsData) {
  doc.fillColor(ACCENT_COLOR).fontSize(11).font("Helvetica-Bold").text(option.title);
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(9.5).fillColor(TEXT_COLOR);
  for (const point of option.points) {
    doc.text(`  \u2022 ${point}`, { lineGap: 2 });
  }
  doc.moveDown(0.8);
}

doc.addPage();

// Section 4: Technical Recommendation
doc.fillColor(PRIMARY_COLOR).fontSize(14).font("Helvetica-Bold").text("4. Strategic Recommendation");
doc.moveDown(0.8);

doc.fillColor(TEXT_COLOR).fontSize(10.5).font("Helvetica").lineGap(4).text(
  "Depending on the business requirements and legal standing, we recommend the following timeline:",
  { align: "justify" }
);
doc.moveDown(0.8);

// Card 1
const rectY1 = doc.y;
doc.roundedRect(50, rectY1, 495, 65, 4).fillAndStroke(CARD_BG, BORDER_COLOR);
doc.fillColor(PRIMARY_COLOR).font("Helvetica-Bold").fontSize(10.5).text("Phase 1: Short-term / MVP Integration", 65, rectY1 + 10);
doc.fillColor(TEXT_COLOR).font("Helvetica").fontSize(9.5).text(
  "Use the Google Custom Search API. It is completely free for up to 100 searches daily, requires no compliance documents to set up, and is ready to deploy in under an hour.",
  65, rectY1 + 25, { width: 465 }
);

doc.moveDown(4.5);

// Card 2
const rectY2 = doc.y;
doc.roundedRect(50, rectY2, 495, 65, 4).fillAndStroke(CARD_BG, BORDER_COLOR);
doc.fillColor(PRIMARY_COLOR).font("Helvetica-Bold").fontSize(10.5).text("Phase 2: Long-term Production scaling", 65, rectY2 + 10);
doc.fillColor(TEXT_COLOR).font("Helvetica").fontSize(9.5).text(
  "Apply for the official API Setu partner program. Although approval takes 1-2 weeks, it provides direct, free, and legally compliant access to live MCA data.",
  65, rectY2 + 25, { width: 465 }
);

doc.moveDown(4.5);

// Signoff / Footer
doc.moveDown(2);
doc.fillColor(PRIMARY_COLOR).font("Helvetica-Bold").fontSize(10).text("Prepared By:");
doc.fillColor(TEXT_COLOR).font("Helvetica").fontSize(10).text("Antigravity Coding Assistant");
doc.text("Date: July 21, 2026");

doc.end();

stream.on("finish", () => {
  console.log("PDF generated successfully at:", outputPath);
});
