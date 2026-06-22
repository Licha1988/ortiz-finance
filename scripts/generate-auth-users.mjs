import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const pairs = process.argv.slice(2);

if (pairs.length === 0) {
  console.log("Uso:");
  console.log("  node scripts/generate-auth-users.mjs usuario:contraseña [usuario2:contraseña2 ...]");
  console.log("");
  console.log("Ejemplo:");
  console.log("  node scripts/generate-auth-users.mjs lisandro:clave1 bruno:clave2 gerente:clave3");
  process.exit(1);
}

const users = [];

for (const pair of pairs) {
  const separator = pair.indexOf(":");
  if (separator <= 0 || separator === pair.length - 1) {
    console.error(`Formato inválido: "${pair}". Usá usuario:contraseña`);
    process.exit(1);
  }

  const username = pair.slice(0, separator).trim();
  const password = pair.slice(separator + 1);

  if (!username || !password) {
    console.error(`Formato inválido: "${pair}". Usá usuario:contraseña`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  users.push({ username, passwordHash });
}

const authSecret = randomBytes(32).toString("hex");
const usersJson = JSON.stringify(users);
const usersJsonForLocal = usersJson.replace(/\$/g, "\\$");

console.log("# Copiá estas variables a .env.local (dev) o al panel de Vercel (prod)\n");
console.log(`AUTH_SECRET=${authSecret}`);
console.log(
  "# .env.local: escapá cada $ del hash (dotenv local rompe bcrypt sin esto):",
);
console.log(`AUTH_USERS=${usersJsonForLocal}`);
console.log(`# Vercel (JSON sin escapar): AUTH_USERS=${usersJson}`);
