const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "..", "data", "db.json");
const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
let updated = 0;
db.users.forEach((u) => {
  if (!u.password) {
    u.password = "password123";
    updated++;
  }
});
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf8");
console.log(`Updated ${updated} users with default password123 in data/db.json`);

