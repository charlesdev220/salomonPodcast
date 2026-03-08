import fs from 'fs';
import path from 'path';

const cookiePath = process.argv[2];

if (!cookiePath || !fs.existsSync(cookiePath)) {
    console.error(`❌ Debes proporcionar una ruta válida al archivo de cookies.`);
    console.log('Uso: node scripts/fix_auth.mjs [ruta_al_archivo_cookies]');
    process.exit(1);
}

const cookieContent = fs.readFileSync(cookiePath, 'utf8');
const lines = cookieContent.split('\n');
const cookies = {};
lines.forEach(line => {
    if (line.startsWith('#') || !line.trim()) return;
    const parts = line.split('\t');
    if (parts.length >= 7) {
        cookies[parts[5]] = parts[6].trim();
    }
});

const auth = {
    cookies: cookies,
    csrf_token: "",
    session_id: "",
    extracted_at: Date.now() / 1000
};

const authPath = path.join(process.env.HOME, '.notebooklm-mcp', 'auth.json');
const authDir = path.dirname(authPath);

if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
}

fs.writeFileSync(authPath, JSON.stringify(auth, null, 2));
console.log(`✅ auth.json actualizado correctamente en: ${authPath}`);
console.log(`📄 Fuente: ${cookiePath}`);
