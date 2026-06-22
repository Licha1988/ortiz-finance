import { readFileSync, writeFileSync, existsSync } from "node:fs";
import bcrypt from "bcryptjs";

const pair = process.argv[2];

if (!pair || pair.indexOf(":") <= 0) {
  console.log("Uso:");
  console.log("  node scripts/reset-auth-password.mjs usuario:nueva-contraseña");
  console.log("");
  console.log("Ejemplo:");
  console.log("  node scripts/reset-auth-password.mjs Lisandro:mi-clave-segura");
  process.exit(1);
}

const separator = pair.indexOf(":");
const username = pair.slice(0, separator).trim();
const password = pair.slice(separator + 1);

if (!username || !password) {
  console.error("Formato inválido. Usá usuario:contraseña");
  process.exit(1);
}

const envPath = ".env.local";
if (!existsSync(envPath)) {
  console.error("No existe .env.local. Copiá .env.example y configurá auth primero.");
  process.exit(1);
}

const text = readFileSync(envPath, "utf8");
const authUsersMatch = text.match(/^AUTH_USERS=(.*)$/m);
if (!authUsersMatch) {
  console.error("AUTH_USERS no está definido en .env.local");
  process.exit(1);
}

let users;
try {
  users = JSON.parse(authUsersMatch[1].trim());
} catch {
  console.error("AUTH_USERS no es JSON válido.");
  process.exit(1);
}

if (!Array.isArray(users)) {
  console.error("AUTH_USERS debe ser un array.");
  process.exit(1);
}

const normalized = username.toLowerCase();
const index = users.findIndex(
  (user) => typeof user.username === "string" && user.username.toLowerCase() === normalized,
);

if (index < 0) {
  console.error(`Usuario "${username}" no encontrado. Usuarios actuales:`);
  users.forEach((user) => console.error(`  - ${user.username}`));
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 12);
users[index] = { ...users[index], username: users[index].username, passwordHash };

const nextUsersJson = JSON.stringify(users);
const nextUsersJsonForLocal = nextUsersJson.replace(/\$/g, "\\$");
const nextText = text.replace(/^AUTH_USERS=.*$/m, `AUTH_USERS=${nextUsersJsonForLocal}`);
writeFileSync(envPath, nextText, "utf8");

console.log(`Contraseña actualizada para "${users[index].username}".`);
console.log("Reiniciá el servidor: npm run dev");
