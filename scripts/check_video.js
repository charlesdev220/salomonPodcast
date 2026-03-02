require('dotenv').config();
const { checkIfVideoExists } = require('./google_sheets');

const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || 'UCiGMIk8oeayv91jjTgm-CIw';
const RSS_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

async function getLatestVideo() {
    if (process.env.YOUTUBE_URL) {
        console.log("🔍 Buscando en URL específica:", process.env.YOUTUBE_URL);
        const response = await fetch(process.env.YOUTUBE_URL);
        if (!response.ok) throw new Error("No se pudo obtener la página de YouTube.");
        const text = await response.text();
        const videoIdMatch = text.match(/"videoId":"([^"]+)"/);
        if (!videoIdMatch) throw new Error("No se encontraron videos en la URL.");
        return videoIdMatch[1];
    }

    const response = await fetch(RSS_FEED_URL);
    if (!response.ok) throw new Error("No se pudo obtener el RSS de YouTube.");
    const text = await response.text();
    const videoIdMatch = text.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    if (!videoIdMatch) throw new Error("No se encontraron videos.");
    return videoIdMatch[1];
}

async function main() {
    try {
        console.log("🔍 Buscando el último video de Alejandro Salomon...");
        const videoId = await getLatestVideo();
        console.log(`Video encontrado: (${videoId})`);

        console.log("🔍 Verificando si ya existe en Google Sheets...");
        const exists = await checkIfVideoExists(videoId);

        if (exists) {
            console.log("⚠️ El video ya fue procesado previamente. Abortando flujo.");
            // Comunicar a GitHub Actions que ya existe
            if (process.env.GITHUB_OUTPUT) {
                require('fs').appendFileSync(process.env.GITHUB_OUTPUT, `video_exists=true\n`);
            }
        } else {
            console.log("✅ El video es nuevo. Continuando flujo...");
            if (process.env.GITHUB_OUTPUT) {
                require('fs').appendFileSync(process.env.GITHUB_OUTPUT, `video_exists=false\n`);
            }
        }
    } catch (error) {
        console.error("❌ ERROR CRÍTICO al verificar video:", error);
        process.exit(1);
    }
}

main();
