import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import dotenv from "dotenv";
import fs from "fs";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { appendRow, checkIfVideoExists } = require('./google_sheets.js');

dotenv.config();

const YOUTUBE_STREAMS_URL = "https://www.youtube.com/@AlejandroSalomonEmprendeduro/streams";
const NOTEBOOK_ID = "470bfac9-d23d-4341-adb4-6c73e3b0ce06"; // Cuaderno "Alejandro Salomon"

async function getLatestVideo() {
    console.log(`🔍 Buscando el último video en: ${YOUTUBE_STREAMS_URL}`);
    const response = await fetch(YOUTUBE_STREAMS_URL);
    if (!response.ok) throw new Error("No se pudo obtener la página de YouTube.");
    const text = await response.text();

    // Extraer el primer videoId y título del HTML de la página de streams
    const videoIdMatch = text.match(/"videoId":"([^"]+)"/);
    const titleMatch = text.match(/"title":\{"runs":\[\{"text":"([^"]+)"\}\]/);

    if (!videoIdMatch || !titleMatch) {
        throw new Error("No se encontraron videos en la URL de streams.");
    }

    return { videoId: videoIdMatch[1], title: titleMatch[1] };
}

async function main() {
    const mcpCommand = process.env.NOTEBOOKLM_MCP_PATH || "notebooklm-mcp";
    console.log(`🚀 Iniciando MCP con el comando: ${mcpCommand}`);

    const transport = new StdioClientTransport({
        command: mcpCommand,
    });

    const client = new Client(
        { name: "salomon-analyzer", version: "1.0.0" },
        { capabilities: {} }
    );

    try {
        await client.connect(transport);
        console.log("🔍 Buscando el último video...");
        const { videoId, title } = await getLatestVideo();
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log(`🎯 Video encontrado: ${title} (${videoUrl})`);

        console.log("🛡️ Verificando si el video ya existe en el Excel...");
        const exists = await checkIfVideoExists(videoId);
        if (exists) {
            console.log(`✅ El video "${title}" (${videoId}) ya ha sido procesado anteriormente. Saltando...`);
            process.exit(0);
        }

        console.log("➕ Añadiendo video como fuente en NotebookLM...");
        const addResult = await client.callTool({
            name: "notebook_add_url",
            arguments: {
                notebook_id: NOTEBOOK_ID,
                url: videoUrl
            }
        });

        console.log("⏳ Esperando un momento para que NotebookLM procese la fuente...");
        // NotebookLM suele ser rápido con YouTube, pero daremos 10 segundos
        await new Promise(resolve => setTimeout(resolve, 10000));

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
        }
        `;

        console.log("🧠 Consultando a NotebookLM...");
        const queryResult = await client.callTool({
            name: "notebook_query",
            arguments: {
                notebook_id: NOTEBOOK_ID,
                query: prompt
            }
        });

        const rawText = queryResult.content[0].text;

        try {
            const outerData = JSON.parse(rawText);

            // Si hay un error en la respuesta de NotebookLM
            if (outerData.status === 'error') {
                throw new Error(`NotebookLM Error: ${outerData.error || outerData.message}`);
            }

            let finalData = outerData;

            // Si NotebookLM encapsuló la respuesta en un campo 'answer'
            if (outerData.answer) {
                try {
                    // Intentar limpiar markdown del string answer si existe
                    const cleanAnswer = outerData.answer.replace(/```json\n?|\n?```/g, '').trim();
                    finalData = JSON.parse(cleanAnswer);
                } catch (e) {
                    console.log("⚠️ El campo 'answer' no es un JSON válido, usando objeto exterior.");
                }
            }

            console.log("\n================ RESULTADO (JSON) ================\n");
            console.log(JSON.stringify(finalData, null, 2));
            console.log("\n==================================================\n");

            console.log('📝 Guardando resultados en Google Sheets...');
            const hoy = new Date().toISOString().split('T')[0];
            // Estructura: Fecha, Video ID, Título, Resumen, Inversiones(JSON), Analisis Extra(JSON)
            await appendRow([
                hoy,
                videoId,
                title,
                finalData.resumen_ejecutivo || "Sin resumen",
                JSON.stringify(finalData.inversiones || []),
                JSON.stringify({
                    script_podcast: finalData.script || "",
                    vision_mercado: finalData.vision_mercado || "",
                    puntos_claves_salomon: finalData.puntos_claves_salomon || [],
                    graficos_companeros: finalData.graficos_companeros || [],
                    temas_importantes: finalData.temas_importantes || [],
                    apuestas_especificas: finalData.apuestas_especificas || []
                })
            ]);

            // Opcional: Guardar en archivo
            fs.writeFileSync('ultimo_resumen.json', JSON.stringify(finalData, null, 2));
            console.log("✅ Proceso completado exitosamente.");

        } catch (e) {
            console.log("❌ Error al procesar los datos o guardar en Sheets:");
            console.error(e.message);
            if (rawText.length < 500) {
                console.log("Respuesta raw de NotebookLM:", rawText);
            }
        }

    } catch (error) {
        console.error("❌ ERROR:", error);
    } finally {
        process.exit(0);
    }
}

main();
