require('dotenv').config();
const { GoogleGenAI, Type, Schema } = require('@google/genai');
const { execSync } = require('child_process');
const fs = require('fs');

const { appendRow } = require('./google_sheets');

const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || 'UCiGMIk8oeayv91jjTgm-CIw';
const RSS_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

async function getLatestVideo() {
    if (process.env.YOUTUBE_URL) {
        console.log("🔍 Buscando en URL específica:", process.env.YOUTUBE_URL);
        const response = await fetch(process.env.YOUTUBE_URL);
        if (!response.ok) throw new Error("No se pudo obtener la página de YouTube.");
        const text = await response.text();
        const videoIdMatch = text.match(/"videoId":"([^"]+)"/);
        const titleMatch = text.match(/"title":\{"runs":\[\{"text":"([^"]+)"\}\]/);
        if (!videoIdMatch || !titleMatch) throw new Error("No se encontraron videos en la URL.");
        return { videoId: videoIdMatch[1], title: titleMatch[1] };
    }

    const response = await fetch(RSS_FEED_URL);
    if (!response.ok) throw new Error("No se pudo obtener el RSS de YouTube.");
    const text = await response.text();
    const videoIdMatch = text.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const entries = text.split('<entry>');
    if (!videoIdMatch) throw new Error("No se encontraron videos.");

    let title = 'Desconocido';
    if (entries.length > 1) {
        const tMatch = entries[1].match(/<title>([^<]+)<\/title>/);
        if (tMatch) title = tMatch[1];
    }
    return { videoId: videoIdMatch[1], title };
}

async function main() {
    try {
        console.log("🔍 Buscando el último video de Alejandro Salomon...");
        const { videoId, title } = await getLatestVideo();
        console.log(`Video encontrado: ${title} (${videoId})`);

        const audioFile = `${videoId}.mp3`;

        console.log("⬇️  Descargando el audio completo usando yt-dlp...");
        const cookiesArg = fs.existsSync('cookies.txt') ? '--cookies cookies.txt' : '';
        const extractorArgs = '--extractor-args "youtube:player_client=ios,android,web"';

        try {
            console.log("Intentando descargar (intento 1)...");
            execSync(`yt-dlp --js-runtimes node ${cookiesArg} ${extractorArgs} -x --audio-format mp3 -o "full_${audioFile}" "https://www.youtube.com/watch?v=${videoId}"`, { stdio: 'inherit' });
        } catch (e) {
            console.log("⚠️ Falló con las cookies dadas. Las cookies pueden estar oxidadas/ilegibles. Intentando sin cookies...");
            execSync(`yt-dlp --js-runtimes node ${extractorArgs} -x --audio-format mp3 -o "full_${audioFile}" "https://www.youtube.com/watch?v=${videoId}"`, { stdio: 'inherit' });
        }

        console.log("✂️  Recortando los primeros 35 minutos del audio...");
        execSync(`ffmpeg -i "full_${audioFile}" -t 00:35:00 -c copy "${audioFile}"`, { stdio: 'inherit' });

        if (fs.existsSync(`full_${audioFile}`)) {
            fs.unlinkSync(`full_${audioFile}`);
        }

        if (!fs.existsSync(audioFile)) {
            throw new Error(`El archivo de audio ${audioFile} no se generó.`);
        }

        const stats = fs.statSync(audioFile);
        const fileSizeInMB = stats.size / (1024 * 1024);
        console.log(`📦 Tamaño del archivo generado: ${fileSizeInMB.toFixed(2)} MB`);

        // Un audio de 40 minutos equivale típicamente a 35-45 MB (a 128-160 kbps).
        const maxMB = 50;
        if (fileSizeInMB > maxMB) {
            throw new Error(`El archivo descargado es demasiado grande (${fileSizeInMB.toFixed(2)} MB). Supera el límite de ${maxMB} MB (equivalente a 40 min).`);
        }

        console.log("🚀 Subiendo audio a Gemini...");
        const apiKey = process.env.GEMINI_API_KEY;
        const ai = new GoogleGenAI({ apiKey });

        const uploadResponse = await ai.files.upload({
            file: audioFile,
            mimeType: 'audio/mp3'
        });

        console.log(`✅ Archivo subido exitosamente a google. Esperando procesamiento...`);
        let fileObj = await ai.files.get({ name: uploadResponse.name });
        while (fileObj.state === 'PROCESSING') {
            process.stdout.write('.');
            await new Promise(resolve => setTimeout(resolve, 5000));
            fileObj = await ai.files.get({ name: uploadResponse.name });
        }
        if (fileObj.state === 'FAILED') throw new Error('Falló el procesamiento del audio en Google.');

        console.log("\n🧠 Analizando y generando el podcast / resumen con Schema estricto...");
        const prompt = `
        Eres Alejandro Salomon (Emprendeduro). Analiza el video fuente "${title}" y genera un JSON con la siguiente estructura exacta.
        IMPORTANTE: Devuelve ÚNICAMENTE el código JSON, sin textos explicativos ni markdown.

        TONO Y ESTILO (OBLIGATORIO):
        El campo "resumen_ejecutivo" debe ser un monólogo en primera persona, MADRO, ENERGÉTICO y FILOSÓFICO.
        - Usa muletillas y frases típicas: "¡Qué onda, emprendeduros!", "Nadie me preguntó", "chango de tu existencia", "cabrones", "güeyes", "esto es un juego", "surfeando la ola del tiempo", "universo-pecera".
        - Mezcla la sabiduría financiera con su visión de la realidad preescrita y la meditación.
        - Utiliza el ejemplo que te doy como estándar de calidad y tono: "¡Qué onda, emprendeduros! Bienvenidos a 'Nadie me preguntó'. Hoy vamos a platicar de una realidad que les va a volar la cabeza... Olvídate de la ansiedad y las depresiones, esto es un juego... simplemente estamos surfeando la ola de tiempo..."

        Estructura JSON:
        {
          "resumen_ejecutivo": "Monólogo extenso (MÁXIMO 800 PALABRAS) que sea el guion principal del podcast con la voz de Salomon, integrando las noticias del vídeo con su filosofía personal.",
          "script": "Versión corta y resumida (MÁXIMO 200 PALABRAS) centrada solo en los puntos de acción más urgentes.",
          "vision_mercado": "Resumen técnico de la visión macro, crypto y sentimiento de inversión.",
          "inversiones": [
            { "inversor": "Quién menciona la inversión", "ticker_o_activo": "Activo", "postura": "Buy/Sell/Short...", "precios_y_targets": "Niveles mencionados" }
          ],
          "puntos_claves_salomon": ["Opiniones fuertes y predicciones personales de Salomon"],
          "graficos_companeros": ["Detalle técnico de los gráficos de Rodrigo/Farhan"],
          "temas_importantes": ["Noticias clave discutidas"],
          "apuestas_especificas": ["Movimientos del 1% o trades de alto riesgo"]
        }`;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                resumen_ejecutivo: {
                    type: Type.STRING,
                    description: "Monólogo extenso (MÁXIMO 800 PALABRAS) que sea el guion principal del podcast con la voz de Salomon, integrando las noticias del vídeo con su filosofía personal."
                },
                script: {
                    type: Type.STRING,
                    description: "Versión corta y resumida (MÁXIMO 200 PALABRAS) centrada solo en los puntos de acción más urgentes."
                },
                vision_mercado: {
                    type: Type.STRING,
                    description: "Resumen técnico de la visión macro, crypto y sentimiento de inversión."
                },
                inversiones: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            inversor: { type: Type.STRING, description: "Quién menciona la inversión" },
                            ticker_o_activo: { type: Type.STRING, description: "Activo" },
                            postura: { type: Type.STRING, description: "Buy/Sell/Short..." },
                            precios_y_targets: { type: Type.STRING, description: "Niveles mencionados" }
                        },
                        required: ["inversor", "ticker_o_activo", "postura", "precios_y_targets"]
                    }
                },
                puntos_claves_salomon: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING, description: "Opiniones fuertes y predicciones personales de Salomon" }
                },
                graficos_companeros: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING, description: "Detalle técnico de los gráficos de Rodrigo/Farhan" }
                },
                temas_importantes: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING, description: "Noticias clave discutidas" }
                },
                apuestas_especificas: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING, description: "Movimientos del 1% o trades de alto riesgo" }
                }
            },
            required: ["resumen_ejecutivo", "script", "vision_mercado", "inversiones", "puntos_claves_salomon", "graficos_companeros", "temas_importantes", "apuestas_especificas"]
        };

        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { fileData: { fileUri: fileObj.uri, mimeType: fileObj.mimeType } },
                prompt
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        });

        // Como usamos JSON mode nativo, la salida ya es un string puro sin markdown
        const jsonString = result.text.trim();
        const data = JSON.parse(jsonString);

        console.log("\n================ E X T R A C C I O N ================\n");
        console.log("Resumen Ejecutivo:", data.resumen_ejecutivo);
        console.log("Script Corto:", data.script);
        console.log("Visión del Mercado:", data.vision_mercado);
        console.log("Inversiones:", JSON.stringify(data.inversiones, null, 2));
        console.log("Apuestas Específicas:", data.apuestas_especificas);
        console.log("Gráficos Compañeros:", data.graficos_companeros);
        console.log("\n===========================================================");

        console.log('📝 Guardando resultados en Google Sheets...');
        const hoy = new Date().toISOString().split('T')[0];
        // Estructura: Fecha, Video ID, Título, Resumen, Inversiones(JSON), Analisis Extra(JSON)
        await appendRow([
            hoy,
            videoId,
            title,
            data.resumen_ejecutivo,
            JSON.stringify(data.inversiones),
            JSON.stringify({
                script: data.script,
                vision_mercado: data.vision_mercado,
                puntos_claves_salomon: data.puntos_claves_salomon,
                graficos_companeros: data.graficos_companeros,
                temas_importantes: data.temas_importantes,
                apuestas_especificas: data.apuestas_especificas
            })
        ]);

    } catch (error) {
        console.error("❌ ERROR CRÍTICO:", error);
        process.exit(1);
    } finally {
        // Limpiar archivos locales si existen
        try {
            console.log("🧹 Limpiando archivos temporales locales...");
            const files = fs.readdirSync('.');
            for (const file of files) {
                if (file.endsWith('.mp3') || file.endsWith('.webm')) {
                    fs.unlinkSync(file);
                }
            }
        } catch (e) { }
    }
}

main();
