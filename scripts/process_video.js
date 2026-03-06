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
        execSync(`yt-dlp --js-runtimes node ${cookiesArg} --extractor-args "youtube:player_client=ios,android,web" --no-playlist -x --audio-format mp3 -o "full_${audioFile}" "https://www.youtube.com/watch?v=${videoId}"`, { stdio: 'inherit' });

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
        Eres un analista financiero experto escuchando el podcast de Alejandro Salomon (Emprendeduro).
        Tu objetivo crítico es extraer información sumamente precisa de inversión, sin omitir ningún dato técnico.
        ESPECÍFICAMENTE BUSCA:
        1. Las apuestas exactas (long/short, opciones, el famoso "1%") de Alejandro Salomon.
        2. La visión de mercado general: cómo ven la macro, las tasas, S&P 500 y Crypto de cara al futuro.
        3. En qué activos van a invertir, cuáles ya vendieron, o en cuáles están atrapados (tickers específicos).
        4. Las perspectivas y análisis de gráficos de sus compañeros (por ejemplo, Rodrigo), apuntando precios de resistencia, soporte y targets.
        Extrae TODO con el máximo nivel de detalle posible en español. EL MONÓLOGO (SCRIPT) DEBE TENER UN MÁXIMO DE 600 PALABRAS.
        `;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                script: {
                    type: Type.STRING,
                    description: "Monólogo corto estilo podcast para audio de IA (MÁXIMO 600 PALABRAS), animado al estilo Salomon. DEBES mencionar orgánicamente detallando todo en tu discurso conversacional, especialmente: 1) Visión del mercado, 2) Gráficos de compañeros, 3) Apuestas e inversiones puntuales de ambos."
                },
                vision_mercado: {
                    type: Type.STRING,
                    description: "Resumen muy elaborado de la visión actual del mercado, macroeconomía, crypto y sentimiento de inversión general (bullish/bearish) que tienen."
                },
                inversiones: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            inversor: { type: Type.STRING, description: "Quién menciona la inversión (Salomon, Rodrigo, etc.)" },
                            ticker_o_activo: { type: Type.STRING, description: "Ej: BTC, SPY, Oro, Tesla" },
                            postura: { type: Type.STRING, description: "Comprar, Vender, Mantener, Short, Long" },
                            precios_y_targets: { type: Type.STRING, description: "Precios de entrada, stop loss, take profit mencionados" }
                        }
                    }
                },
                puntos_claves_salomon: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING, description: "Tesis principales, opiniones fuertes y predicciones personales de Alejandro Salomon." }
                },
                graficos_companeros: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING, description: "Detalle técnico de los gráficos compartidos por sus compañeros, mencionando niveles clave, soportes, resistencias y narrativas." }
                },
                temas_importantes: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING, description: "Noticias o temas de actualidad de relevancia discutidos." }
                },
                apuestas_especificas: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING, description: "Las apuestas de alto riesgo, los trades del 1% o movimientos altamente especulativos comentados en el show." }
                }
            },
            required: ["script", "vision_mercado", "inversiones", "puntos_claves_salomon", "graficos_companeros", "temas_importantes", "apuestas_especificas"]
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
            data.script, // Ojo, esto usa el "script", asegúrate de si el user quiere el script o el resumen crudo, lo dejamos como script.
            JSON.stringify(data.inversiones),
            JSON.stringify({
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
