import { JSONFilePreset } from "lowdb/node";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });

const defaultData = {
  users: [],
  studentProfiles: [],
  adminProfiles: [],
  chatMessages: []
};

const db = await JSONFilePreset(path.join(dataDir, "smartdorm-db.json"), defaultData);

export default db;
