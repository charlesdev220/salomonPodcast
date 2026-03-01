# Proyecto Salomon - Emprendeduro Podcast & AI Summarizer

Esta es la aplicación web automatizada "estilo red social financiera" diseñada para resumir, analizar y extraer las inversiones de los últimos directos de YouTube de Alejandro Salomon (Emprendeduro) utilizando Inteligencia Artificial (**Gemini 1.5/2.5 Pro**) y presentarlas al usuario final en una interfaz premium alojada en **Vercel**.

## 🔄 Flujo de Trabajo y Arquitectura

El proyecto está dividido en dos grandes "motores" para separar el procesamiento pesado de la visualización rápida:

1. **El Motor "Heavy" (GitHub Actions):**
   - Un script programado (Cron Job) se despierta cada día automáticamente.
   - Revisa si Alejandro subió un nuevo directo a su canal.
   - Si hay video, utiliza **`yt-dlp`** y **`FFmpeg`** para descargar y extraer el archivo de audio (MP3).
   - Este audio se sube e infiere enviándoselo a la API de **Gemini** (Google GenAI).
   - Gemini "escucha" el audio, extrae los tickers financieros, las posturas (Alcista/Bajista) y redacta el borrador del podcast de manera inteligente.
   - Finalmente, guarda esta extracción estructurada en la Base de Datos (Google Sheets).

2. **La Red Social (Vercel + Next.js):**
   - Sirve como la interfaz de usuario moderna y premium.
   - Cuando un usuario entra a la web, Vercel lee velozmente el documento de **Google Sheets** para mostrar el feed histórico de podcasts y las inversiones.
   - No realiza procesamiento pesado en tiempo real, lo que permite un despliegue gratuito y de respuesta inmediata.

---

## 📂 Organización del Proyecto

El proyecto sigue una estructura limpia y optimizada, dividida en distintas responsabilidades:

### 1. El motor de la Web (Next.js / Frontend)
* **`app/`**: Aquí vivirá todo el código visual de la red social (botones, colores, reproductor de audio, etc). Es el corazón del "Frontend" en Next.js App Router.
* **`public/`**: Es la caja donde se almacenan las imágenes fijas, el logo de la app o el favicon (el ícono que sale en la pestaña del navegador).
* **`.next/`**: Archivo autogenerado e "imborrable". Cada vez que corremos la app, Next.js crea esta carpeta oculta con el código web ya compilado para cargar super rápido. (No se sube a internet).
* **`next.config.ts`**: Es el panel de control y configuraciones maestras de Vercel/Next.js.

### 2. El motor de Reglas y Lenguaje (TypeScript)
* **`tsconfig.json`** y **`next-env.d.ts`**: Como acordamos usar un lenguaje moderno y estricto (TypeScript) para evitar bugs, estos archivos le dictan a la computadora cuáles son las reglas gramaticales y de tipado.
* **`eslint.config.mjs`**: Es un "policía del código" (Linter). Revisa que el código que escribamos esté estandarizado, legible y sin errores escondidos.

### 3. El gestor de Paquetes (Librerías de código)
* **`node_modules/`**: Esta carpeta contiene el código fuente de herramientas de terceros (ej. librerías de Google Gemini). Es pesada y es ignorada por Git.
* **`package.json`**: Literalmente es la "receta" del software. Describe el nombre, versión y dependencias (ej: *"Necesito Next.js 15 y Google GenAI"*).
* **`package-lock.json`**: Es el candado de la receta. Asegura y "congela" que la versión de dependencias que instalamos localmente sea la misma que compilará Vercel mañana.

### 4. Entorno de Datos y Procesamiento Servidor
* **`scripts/`**: El cuarto de máquinas. Aquí alojamos los scripts pesados de Node.js que ejecutará GitHub Actions en la nube para descargar el audio (mediante yt-dlp) y mandarlo a la IA de Gemini.
* **`.github/workflows/`**: Instrucciones YAML automatizadas que la nube de GitHub ejecuta autónomamente todos los días.
* **`.env`**: El baúl fuerte. Aquí escondemos tu clave de Gemini API (`GEMINI_API_KEY`) y en un futuro las credenciales de Google Sheets. NUNCA se sube a internet por seguridad.
* **`.gitignore`**: Vigila el versionado de código dictando a GitHub qué archivos *nunca* se deben subir (como la carpeta `node_modules` y el `.env`).

### 5. Documentación
* **`implementation_plan.md`**: El plan técnico y los pasos de arquitectura fundacionales acordados.
* **`README.md`**: Este archivo, explicando el propósito, arquitectura y uso del proyecto.

---

*Proyecto en desarrollo e iteración por Charles, co-programado con Antigravity (Google).*
