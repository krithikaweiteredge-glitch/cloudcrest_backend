import { pool } from "../config/db.js";

async function main() {
  const q = `
    SELECT s.id, s.slug, s.name, s.short_title, s.authority, s.form_no, s.icon,
           s.description, s.who_can_apply, s.acts_rules, s.validity,
           s.professional_fee, s.govt_fee, s.gst_percent, s.fee_lines, s.tabs,
           s.acts_rules_pdfs, s.active, s.wizard_rules,
           sc.name AS subcategory, cat.name AS category
    FROM services s
    JOIN service_subcategories sc ON sc.id = s.subcategory_id
    JOIN service_categories cat ON cat.id = sc.category_id
    WHERE s.slug IN ('society','society-macs','society-coop','society-general','trust')
    ORDER BY s.slug;
  `;
  const { rows } = await pool.query(q);
  for (const r of rows) {
    console.log("════════════════════════════════════════");
    console.log(JSON.stringify(r, null, 2));
    const docs = await pool.query(
      "SELECT name, mandatory FROM document_types WHERE service_id=$1 ORDER BY id",
      [r.id]
    );
    console.log("DOCS:", JSON.stringify(docs.rows));
  }
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
