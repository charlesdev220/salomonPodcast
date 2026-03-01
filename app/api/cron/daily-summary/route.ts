import { NextResponse } from 'next/server';

export async function GET() {
    // NOTA: El procesamiento pesado (Descarga de video y Gemini)
    // ahora se realiza en GitHub Actions todos los días (.github/workflows).
    //
    // Este endpoint se adaptará en el futuro para devolver los datos 
    // recientes guardados en Google Sheets al frontend (la interfaz de Next.js).

    return NextResponse.json({
        status: "ok",
        message: "Endpoint de salud. El procesamiento pesado fue movido a GitHub Actions.",
        data: "Esperando implementación de lectura de Google Sheets..."
    });
}
