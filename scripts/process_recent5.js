const { execSync } = require('child_process');
const { checkIfVideoExists } = require('./google_sheets');
const fs = require('fs');
require('dotenv').config();

async function main() {
    console.log('Obteniendo los últimos 5 videos usando yt-dlp... (ignoramos warnings)');
    let output = '';
    try {
        output = execSync(`yt-dlp --print "%(id)s::::%(title)s" --playlist-items 1-5 "https://www.youtube.com/@AlejandroSalomonEmprendeduro/streams" 2>/dev/null`, { encoding: 'utf-8' });
    } catch (e) {
        // Ignoramos si hay error de salida por warnings o desafíos JS
        output = e.stdout.toString() || output;
    }

    const lines = output.split('\n').filter(l => l.includes('::::'));
    console.log(`Encontrados ${lines.length} videos recientes.`);

    // Iteramos de más antiguo a más nuevo si queremos, o normal.
    // lines están en orden del más nuevo al más antiguo (1 al 5).
    // Para procesarlos cronológicamente (el más viejo primero de esos 5), le damos vuelta:
    lines.reverse();

    for (const line of lines) {
        let [id, ...titleParts] = line.split('::::');
        const title = titleParts.join('::::').trim();
        id = id.trim();

        if (!id) continue;

        console.log(`\n\n---------------------------------`);
        console.log(`🔍 Evaluando: [${id}] - ${title}`);

        const exists = await checkIfVideoExists(id);

        if (exists) {
            console.log(`✅ El video ya está guardado en Google Sheets. Se omitirá.`);
        } else {
            console.log(`⏳ El video NO ESTÁ. Procesando ahora...`);
            try {
                execSync(`node scripts/process_video.js`, {
                    stdio: 'inherit',
                    env: {
                        ...process.env,
                        TARGET_VIDEO_ID: id,
                        TARGET_VIDEO_TITLE: title
                    }
                });
            } catch (err) {
                console.error(`❌ Error al procesar el video ${id}.`);
            }
        }
    }
    console.log('\n\n====== PROCESO DE LOS ÚLTIMOS 5 VIDEOS FINALIZADO ======');
}

main();
