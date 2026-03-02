require('dotenv').config();
const { GoogleGenAI, Type, Schema } = require('@google/genai');
const { execSync } = require('child_process');
const fs = require('fs');

const { appendRow } = require('./google_sheets');

const CHANNEL_ID = 'UCiGMIk8oeayv91jjTgm-CIw';
const RSS_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

async function getLatestVideo() {
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

        console.log("⬇️  Descargando el audio usando yt-dlp...");
        const cookiesArg = fs.existsSync('cookies.txt') ? '--cookies cookies.txt' : '';
        execSync(`yt-dlp --js-runtimes node ${cookiesArg} -x --audio-format mp3 -o "${audioFile}" "https://www.youtube.com/watch?v=${videoId}"`, { stdio: 'inherit' });

        if (!fs.existsSync(audioFile)) {
            throw new Error(`El archivo de audio ${audioFile} no se generó.`);
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
        Eres un asistente financiero de alto nivel. Analiza este podcast de YouTube de Alejandro Salomon (Emprendeduro) y extrae la información requerida de manera sumamente precisa y detallada. Escucha pacientemente para el Script final.
        `;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                script: {
                    type: Type.STRING,
                    description: "Monólogo extenso estilo podcast para audio de IA, animado al estilo Salomon. ADEMÁS de la tesis principal, DEBES mencionar orgánicamente detallando todo en tu discurso conversacional SIN comillas dobles internas: 1) Los puntos claves, 2) Gráficos expuestos, 3) Temas críticos, y 4) Apuestas del 1%."
                },
                inversiones: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            ticker: { type: Type.STRING },
                            postura: { type: Type.STRING },
                            targets: { type: Type.STRING }
                        }
                    }
                },
                puntos_claves_salomon: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING, description: "Puntos detallados antes de que entren los compañeros" }
                },
                graficos_companeros: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING, description: "Análisis extremadamente detallado de fechas, targets y narrativas" }
                },
                temas_importantes: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                },
                inversiones_1_porciento: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            },
            required: ["script", "inversiones", "puntos_claves_salomon", "graficos_companeros", "temas_importantes", "inversiones_1_porciento"]
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
        console.log("Guion del Podcast:", data.script);
        console.log("Inversiones:", data.inversiones);
        console.log("Puntos Claves:", data.puntos_claves_salomon);
        console.log("\n===========================================================");

        console.log('📝 Guardando resultados en Google Sheets...');
        const hoy = new Date().toISOString().split('T')[0];
        // Estructura: Fecha, Video ID, Título, Resumen, Inversiones(JSON), Analisis Extra(JSON)
        await appendRow([
            hoy,
            videoId,
            title,
            data.script,
            JSON.stringify(data.inversiones),
            JSON.stringify({
                puntos_claves_salomon: data.puntos_claves_salomon,
                graficos_companeros: data.graficos_companeros,
                temas_importantes: data.temas_importantes,
                inversiones_1_porciento: data.inversiones_1_porciento
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
