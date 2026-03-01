"use client";

import React, { useState, useRef, useEffect } from 'react';
import styles from './PostCard.module.css';

interface Inversion {
    ticker: string;
    postura: 'Alcista' | 'Bajista' | 'Neutral' | string;
    targets: string;
}

export interface PostProps {
    date: string;
    videoId: string;
    title: string;
    script: string;
    inversiones: Inversion[];
    analisisDetallado?: {
        puntos_claves_salomon?: string[];
        graficos_companeros?: string[];
        temas_importantes?: string[];
        inversiones_1_porciento?: string[];
    };
}

export default function PostCard({ post }: { post: PostProps }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const synthRef = useRef<SpeechSynthesis | null>(null);

    useEffect(() => {
        // Safe check for browser environment
        if (typeof window !== 'undefined') {
            synthRef.current = window.speechSynthesis;
        }

        return () => {
            if (synthRef.current) {
                synthRef.current.cancel(); // Detener al salir del componente
            }
        };
    }, []);

    const togglePlay = () => {
        if (!synthRef.current) return;

        if (isPlaying) {
            synthRef.current.cancel();
            setIsPlaying(false);
        } else {
            // Cancelar cualquier cosa previamante reproduciendose
            synthRef.current.cancel();

            const utterance = new SpeechSynthesisUtterance(post.script);
            utterance.lang = 'es-MX'; // Mexican Spanish (Closest to Salomon's accent range natively)
            utterance.rate = 1.05;    // A bit faster for dynamism

            // Try to pick a decent voice if available
            const voices = synthRef.current.getVoices();
            const esVoice = voices.find(v => v.lang.includes('es-MX')) || voices.find(v => v.lang.includes('es'));
            if (esVoice) utterance.voice = esVoice;

            utterance.onend = () => setIsPlaying(false);
            utterance.onerror = () => setIsPlaying(false);

            synthRef.current.speak(utterance);
            setIsPlaying(true);
        }
    };

    return (
        <article className={styles.card}>
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title}>{post.title}</h2>
                    <span className={styles.date}>{post.date}</span>
                </div>
                <a
                    href={`https://youtube.com/watch?v=${post.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkIcon}
                    title="Ver video original"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
                        <path d="m10 15 5-3-5-3z" />
                    </svg>
                </a>
            </div>

            <div className={styles.script}>
                <p>"{post.script}"</p>

                {/* Audio Player */}
                <div className={styles.audioPlayer}>
                    <button
                        className={styles.playBtn}
                        onClick={togglePlay}
                        title={isPlaying ? "Pausar Podcast" : "Reproducir Podcast"}
                    >
                        {isPlaying ? (
                            // Pause Icon
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="6" y="4" width="4" height="16"></rect>
                                <rect x="14" y="4" width="4" height="16"></rect>
                            </svg>
                        ) : (
                            // Play Icon
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                        )}
                    </button>
                    {/* Visual waveform animated via CSS state if needed */}
                    <div className={styles.waveform} style={{ opacity: isPlaying ? 0.8 : 0.3 }}></div>
                    <span style={{ fontSize: '0.75rem', color: isPlaying ? 'var(--accent-color)' : 'var(--text-secondary)' }}>
                        {isPlaying ? 'Reproduciendo...' : 'Voz de IA Integrada'}
                    </span>
                </div>
            </div>

            {post.inversiones && post.inversiones.length > 0 && (
                <div>
                    <h3 className={styles.sectionTitle}>Inversiones Extraídas</h3>
                    <div className={styles.grid}>
                        {post.inversiones.map((inv, idx) => {
                            let postureClass = styles.Neutral;
                            if (inv.postura.toLowerCase().includes('alcista')) postureClass = styles.Alcista;
                            else if (inv.postura.toLowerCase().includes('bajista')) postureClass = styles.Bajista;

                            return (
                                <div key={idx} className={styles.assetBadge}>
                                    <div className={styles.badgeHeader}>
                                        <span className={styles.ticker}>{inv.ticker}</span>
                                        <span className={`${styles.posturaText} ${postureClass}`}>
                                            {inv.postura}
                                        </span>
                                    </div>
                                    <p className={styles.targets}>{inv.targets}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {post.analisisDetallado && (
                <div className={styles.extendedAnalysis}>
                    {post.analisisDetallado.puntos_claves_salomon && post.analisisDetallado.puntos_claves_salomon.length > 0 && (
                        <div className={styles.analysisBlock}>
                            <h3 className={styles.sectionTitle}>Puntos Claves (Alejandro Salomon)</h3>
                            <ul className={styles.analysisList}>
                                {post.analisisDetallado.puntos_claves_salomon.map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {post.analisisDetallado.graficos_companeros && post.analisisDetallado.graficos_companeros.length > 0 && (
                        <div className={styles.analysisBlock}>
                            <h3 className={styles.sectionTitle}>Análisis de Gráficos Secuenciales</h3>
                            <ol className={styles.sequentialList}>
                                {post.analisisDetallado.graficos_companeros.map((item, i) => (
                                    // Limpiamos los numeros iniciales generados por la LLM si existen (e.j "1. Grafico X")
                                    <li key={i}>{item.replace(/^\d+\.\s*/, '')}</li>
                                ))}
                            </ol>
                        </div>
                    )}

                    {post.analisisDetallado.temas_importantes && post.analisisDetallado.temas_importantes.length > 0 && (
                        <div className={styles.analysisBlock}>
                            <h3 className={styles.sectionTitle}>Temas Importantes de la Sesión</h3>
                            <ul className={styles.analysisList}>
                                {post.analisisDetallado.temas_importantes.map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {post.analisisDetallado.inversiones_1_porciento && post.analisisDetallado.inversiones_1_porciento.length > 0 && (
                        <div className={styles.analysisBlock}>
                            <h3 className={styles.sectionTitle}>Apuestas Salomundo (La cartera del 1%)</h3>
                            <ul className={styles.analysisList}>
                                {post.analisisDetallado.inversiones_1_porciento.map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </article>
    );
}
