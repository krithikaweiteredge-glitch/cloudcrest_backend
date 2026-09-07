import { pool } from "../config/db.js";

const description =
  "A sole proprietorship is the simplest form of business ownership in India. It is owned and managed by a single individual. There is no separate legal entity — the business and the proprietor are the same in the eyes of the law.\n\nThere is no single formal registration or incorporation process under a specific Act. Instead, a sole proprietorship gains legal recognition and operational capability through a combination of registrations and licences.";

const whoCanApply =
  "Any individual who meets the following criteria can start and operate a sole proprietorship:\n• Must be an Indian citizen and resident of India\n• Must be 18 years of age or above\n• Must possess a valid PAN and Aadhaar\n• Must be legally competent to enter into contracts";

const docs = [
  "Owner PAN",
  "Owner Aadhaar",
  "Electricity Bill",
  "Rental Agreement / NOC",
];

const tabs = JSON.stringify([
  { id: "about", title: "About", content: description, visible: true },
  { id: "who", title: "Who can Apply", content: whoCanApply, visible: true },
  { id: "documents", title: "Documents", content: "", visible: true },
  { id: "acts", title: "Acts and Rules", content: "", visible: false },
]);

async function main() {
  const { rows } = await pool.query(
    "SELECT id, slug FROM services WHERE slug = 'sole-proprietorship' OR slug LIKE 'sole-proprietorship-%'"
  );
  console.log("Found sole-proprietorship rows:", rows);

  for (const r of rows) {
    console.log(`Updating ${r.slug} (ID ${r.id})...`);
    await pool.query(
      `UPDATE services SET
        description = $1,
        who_can_apply = $2,
        acts_rules = '',
        tabs = $3,
        authority = 'Municipal & State Dept.',
        form_no = 'Trade / Labour Licences'
       WHERE id = $4`,
      [description, whoCanApply, tabs, r.id]
    );

    await pool.query("DELETE FROM document_types WHERE service_id = $1", [r.id]);
    for (const d of docs) {
      await pool.query(
        "INSERT INTO document_types (service_id, name, mandatory) VALUES ($1, $2, true)",
        [r.id, d]
      );
    }
  }

  console.log("Successfully updated sole-proprietorship in DB!");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
