import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

export async function getPostsFromSheets() {
    try {
        const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
        const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

        if (!clientEmail || !privateKey || !spreadsheetId) {
            console.warn('Faltan credenciales de Google Sheets. Usando datos vacíos.');
            return [];
        }

        const auth = new google.auth.JWT({
            email: clientEmail,
            key: privateKey,
            scopes: SCOPES
        });

        const sheets = google.sheets({ version: 'v4', auth });

        // Leer desde la fila 2 para saltar los encabezados (asumiendo que hay un máximo de 1000 filas por ahora)
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'A2:F1000',
        });

        const rows = res.data.values;
        if (!rows || rows.length === 0) {
            return [];
        }

        // Estructura de columnas esperada: 
        // 0: Fecha, 1: Video ID, 2: Título, 3: Resumen (Podcast), 4: Inversiones (JSON), 5: Análisis Extendido (JSON)

        // Mapear las filas y ordenarlas de ms reciente a más antiguo (asumiendo que se añaden al final)
        const posts = rows.map((row) => {
            let inversiones = [];
            let analisisDetallado = undefined;

            try {
                if (row[4]) inversiones = JSON.parse(row[4]);
            } catch (e) {
                console.error("Error parseando inversiones JSON:", e);
            }

            try {
                if (row[5]) analisisDetallado = JSON.parse(row[5]);
            } catch (e) {
                console.error("Error parseando analisisDetallado JSON:", e);
            }

            return {
                date: row[0] || 'Fecha Desconocida',
                videoId: row[1] || '',
                title: row[2] || 'Sin Título',
                script: row[3] || '',
                inversiones: inversiones,
                analisisDetallado: analisisDetallado
            };
        }).reverse(); // Invertir para que el último video procesado salga primero arriba

        return posts;

    } catch (error) {
        console.error('Error al obtener datos de Google Sheets:', error);
        return [];
    }
}
