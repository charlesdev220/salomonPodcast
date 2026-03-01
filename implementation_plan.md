# App Emprendeduro Resumen & Podcast - Implementation Plan

Esta aplicación será una plataforma estilo red social que resumirá automáticamente, cada día, los directos del canal de YouTube de Alejandro Salomon (Emprendeduro). Extraerá la información clave sobre inversiones, creando un resumen tipo podcast, registrando el historial y valorando el portfolio actual con datos de mercado en tiempo real, utilizando un Google Sheet como base de datos central.

## Respuestas a tus dudas
1. **¿Es necesario que me descargue Antigravity?**
   No. "Antigravity" soy yo, tu asistente inteligente de programación. Ya estás interactuando conmigo y me encargaré de escribir todo el código de tu proyecto directamente en tu espacio de trabajo.
2. **¿Se puede desplegar en Vercel?**
   Sí. Vercel alojará la **interfaz gráfica (la red social)** y servirá los datos de forma rápida y gratuita. Sin embargo, para el **trabajo pesado** de descargar audios largos de YouTube y procesarlos, implementaremos **GitHub Actions**. Esto nos dará máquinas potentes y tiempo de procesamiento generoso y gratuito todos los días, separando inteligentemente el frontend del backend intensivo.

## User Review Required

> [!IMPORTANT]
> Necesitamos definir un par de cosas antes de empezar a escribir código:
> 1. **Sobre NotebookLM**: Lamento informarte que NotebookLM no tiene una API oficial pública que podamos usar en el código de forma automatizada (en un servidor como Vercel). Sin embargo, NotebookLM funciona por detrás con la **API de Gemini 1.5 Pro**. Podemos usar directamente la API de Gemini, que sí permite analizar video y audio nativamente, para replicar exactamente la misma funcionalidad de resumir y crear tu podcast. ¿Estás de acuerdo con usar la API de **Gemini** junto con una API de texto-a-voz (TTS) como alternativa?
> 2. Respecto a la base de datos de Google Sheets, la app necesitará credenciales de una "Google Service Account" para poder leer y escribir allí de forma automática. Te ayudaré a configurarlo, ¿estás de acuerdo?
> 3. ¿Quieres que el diseño de la interfaz lo haga desde cero usando un estilo moderno tipo red social financiera (premium, animaciones sutiles, modo oscuro) usando CSS puro (Vanilla CSS)?

## Tecnologías y Lenguajes

- **TypeScript / JavaScript**: Lenguaje base para frontend y backend.
- **Next.js (React)**: Framework principal para construir la interfaz y API routes (backend).
- **Vanilla CSS**: Para el diseño moderno, premium y modo oscuro (sin frameworks extra).
- **APIs, Herramientas y Librerías Externas**:
  - **GitHub Actions**: Para automatizar la descarga de video y el procesamiento pesado (Cron Job avanzado).
  - **yt-dlp y FFmpeg**: Herramientas para extraer el audio MP3 sin depender de subtítulos y evadiendo bloqueos de YouTube.
  - **Google Sheets API**: Base de datos principal.
  - **Gemini 1.5 Pro API**: Motor de IA nativo para procesar el audio y generar el podcast al estilo NotebookLM.
  - **Google Cloud TTS (o similar)**: Para generar el audio del podcast.
  - **Yahoo Finance API**: Para obtener valores bursátiles en tiempo real.

## Proposed Changes

### 1. Inicialización y UI
Crearemos un proyecto de Next.js. Implementaremos un sistema de diseño utilizando Vanilla CSS, priorizando animaciones fluidas, un modo "dark" premium y componentes parecidos a un feed de Twitter/Instagram orientado a finanzas.
- **Archivos principales**: `app/page.tsx`, `app/globals.css`.
- **Componentes**: Feed de posts, UI del reproductor de audio, Widget del portfolio/inversiones.

### 2. Procesamiento Pesado (GitHub Actions)
- **YouTube Audio Fetcher**: Un script automatizado en GitHub Actions usará `yt-dlp` y `FFmpeg` para descargar el audio (MP3) del último directo de Emprendeduro.
- **Motor de IA (Gemini API + TTS)**: Se enviará el audio a Gemini 1.5 Pro para extraer las "inversiones o apuestas" y generar el guión del podcast (emulando a NotebookLM). Luego, se utilizará Cloud TTS para renderizar el audio final.
- **Actualización de Base de Datos**: El script se conectará con la **Google Sheets API** para guardar el nuevo análisis emitido por la IA.

### 3. Frontend y UI (Next.js / Vercel)
- Vercel consumirá los datos (textos, links al audio) desde Google Sheets y servirá la web.
- **Stock API (Yahoo Finance)**: Se consultará desde el navegador o servidor de Vercel para mostrar el tracker financiero y valores bursátiles al día.

## Verification Plan
1. **Pruebas manuales**: Ejecutaremos el script interno localmente sobre uno de los videos recientes de Emprendeduro y comprobaremos que:
   - Extraiga bien las inversiones mencionadas.
   - Lea los datos representativos de tu Google Sheet simulado.
   - Genere el audio satisfactoriamente y lo renderice en la web.
2. **UI Test**: Levantaremos el entorno de desarrollo con `npm run dev` para visualizar que la web muestra el post, el reproductor de audio y el tracker financiero con los valores bursátiles actualizados, verificando que se vea premium.
