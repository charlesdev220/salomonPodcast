const { google } = require('googleapis');
require('dotenv').config();

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

async function getAuthClient() {
    try {
        const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (!clientEmail || !privateKey) {
            throw new Error('Faltan credenciales en el archivo .env (GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_PRIVATE_KEY)');
        }

        const auth = new google.auth.JWT({
            email: clientEmail,
            key: privateKey,
            scopes: SCOPES
        });

        return auth;
    } catch (error) {
        console.error('Error inicializando el cliente de Google Sheets:', error.message);
        throw error;
    }
}

/**
 * Añade una nueva fila a la hoja de cálculo.
 * @param {Array<string|number>} values - Arreglo con los valores de las columnas
 */
async function appendRow(values) {
    try {
        const authClient = await getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });
        const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

        if (!spreadsheetId) {
            throw new Error('Falta GOOGLE_SHEETS_ID en tu archivo .env');
        }

        // Se inserta en 'Hoja 1' (Sheet1)
        await sheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId,
            range: 'A1', // Inicia la búsqueda desde A1 hacia abajo
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [values],
            },
        });

        console.log('✅ Fila añadida correctamente a Google Sheets.');
    } catch (error) {
        console.error('❌ Error guardando en la hoja:', error.message);
        throw error;
    }
}

async function testConnection() {
    try {
        const authClient = await getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });
        const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

        if (!spreadsheetId) {
            console.error('Falta GOOGLE_SHEETS_ID en tu archivo .env');
            return;
        }

        console.log(`Intentando conectar y leer la hoja con ID: ${spreadsheetId}...`);
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'A1:C10',
        });

        console.log('✅ Conexión existosa. Datos de prueba recibidos:');
        console.table(res.data.values || "La hoja parece estar vacía.");

        // Para inicializar los encabezados si la hoja está vacía
        if (!res.data.values || res.data.values.length === 0) {
            await appendRow(["Fecha", "Video ID", "Título", "Resumen (Podcast)", "Inversiones (JSON)", "Análisis Extendido (JSON)"]);
        }

    } catch (error) {
        console.error('❌ Error leyendo la hoja:', error.message);
    }
}

if (require.main === module) {
    testConnection();
}

async function checkIfVideoExists(videoId) {
    try {
        const authClient = await getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });
        const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

        if (!spreadsheetId) {
            throw new Error('Falta GOOGLE_SHEETS_ID en tu archivo .env');
        }

        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'B:B', // Asumiendo que Video ID está en la columna B
        });

        const rows = res.data.values;
        if (!rows || rows.length === 0) {
            return false;
        }

        // rows es un array de arrays: [['Video ID'], ['12345'], ['67890']]
        const exists = rows.some(row => row[0] === videoId);
        return exists;
    } catch (error) {
        console.error('❌ Error verificando si el video existe:', error.message);
        throw error;
    }
}

module.exports = { getAuthClient, appendRow, checkIfVideoExists };
