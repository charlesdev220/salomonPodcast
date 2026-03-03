"use client";

import React, { useState, useRef, useEffect } from 'react';
import styles from './PostCard.module.css';

interface Inversion {
    ticker?: string;
    ticker_o_activo?: string;
    postura: string;
    targets?: string;
    precios_y_targets?: string;
    inversor?: string;
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
                <details className={styles.accordion}>
                    <summary className={styles.accordionSummary}>Ver Resumen en Texto</summary>
                    <div className={styles.accordionContent}>
                        <p>"{post.script}"</p>
                    </div>
                </details>

                {/* Audio Player manteniéndose fuera del acordeón */}
                <div className={styles.audioPlayer}>
                    <button
                        className={styles.playBtn}
                        onClick={togglePlay}
                        title={isPlaying ? "Pausar Podcast" : "Reproducir Podcast"}
                    >
                        {isPlaying ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="6" y="4" width="4" height="16"></rect>
                                <rect x="14" y="4" width="4" height="16"></rect>
                            </svg>
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                        )}
                    </button>
                    <div className={styles.waveform} style={{ opacity: isPlaying ? 0.8 : 0.3 }}></div>
                    <span style={{ fontSize: '0.75rem', color: isPlaying ? 'var(--accent-color)' : 'var(--text-secondary)' }}>
                        {isPlaying ? 'Reproduciendo...' : 'Voz de IA Integrada'}
                    </span>
                </div>
            </div>

            {post.inversiones && post.inversiones.length > 0 && (
                <div className={styles.investmentsSection}>
                    <h3 className={styles.sectionTitle}>Inversiones Extraídas</h3>
                    <div className={styles.gridGraphical}>
                        {post.inversiones.map((inv, idx) => {
                            let postureClass = styles.Neutral;
                            let icon = (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                            );

                            if (inv.postura.toLowerCase().includes('alcista')) {
                                postureClass = styles.Alcista;
                                icon = (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                                        <polyline points="16 7 22 7 22 13"></polyline>
                                    </svg>
                                );
                            } else if (inv.postura.toLowerCase().includes('bajista')) {
                                postureClass = styles.Bajista;
                                icon = (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline>
                                        <polyline points="16 17 22 17 22 11"></polyline>
                                    </svg>
                                );
                            }

                            return (
                                <div key={idx} className={`${styles.assetCard} ${postureClass}`}>
                                    <div className={styles.assetHeader}>
                                        <div className={styles.tickerHeader}>
                                            <div className={styles.assetIconWrapper}>
                                                {icon}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span className={styles.ticker}>{inv.ticker_o_activo || inv.ticker || 'N/A'}</span>
                                            </div>
                                        </div>
                                        <span className={styles.posturaText}>{inv.postura}</span>
                                    </div>
                                    <div className={styles.assetInfo}>
                                        <div className={styles.investorBadge}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                            {inv.inversor || 'Salomon'}
                                        </div>
                                        <p className={styles.targets}>{inv.precios_y_targets || inv.targets || 'Sin detalles'}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {post.analisisDetallado && (
                <div className={styles.extendedAnalysis}>
                    {post.analisisDetallado.puntos_claves_salomon && post.analisisDetallado.puntos_claves_salomon.length > 0 && (
                        <details className={styles.analysisAccordion}>
                            <summary className={styles.accordionSummary}>Puntos Claves (Alejandro Salomon)</summary>
                            <div className={styles.accordionContent}>
                                <ul className={styles.analysisList}>
                                    {post.analisisDetallado.puntos_claves_salomon.map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        </details>
                    )}

                    {post.analisisDetallado.graficos_companeros && post.analisisDetallado.graficos_companeros.length > 0 && (
                        <details className={styles.analysisAccordion}>
                            <summary className={styles.accordionSummary}>Análisis de Gráficos Secuenciales</summary>
                            <div className={styles.accordionContent}>
                                <ol className={styles.sequentialList}>
                                    {post.analisisDetallado.graficos_companeros.map((item, i) => (
                                        <li key={i}>{item.replace(/^\d+\.\s*/, '')}</li>
                                    ))}
                                </ol>
                            </div>
                        </details>
                    )}

                    {post.analisisDetallado.temas_importantes && post.analisisDetallado.temas_importantes.length > 0 && (
                        <details className={styles.analysisAccordion}>
                            <summary className={styles.accordionSummary}>Temas Importantes de la Sesión</summary>
                            <div className={styles.accordionContent}>
                                <ul className={styles.analysisList}>
                                    {post.analisisDetallado.temas_importantes.map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        </details>
                    )}

                    {post.analisisDetallado.inversiones_1_porciento && post.analisisDetallado.inversiones_1_porciento.length > 0 && (
                        <details className={styles.analysisAccordion}>
                            <summary className={styles.accordionSummary}>Apuestas Salomundo (La cartera del 1%)</summary>
                            <div className={styles.accordionContent}>
                                <ul className={styles.analysisList}>
                                    {post.analisisDetallado.inversiones_1_porciento.map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        </details>
                    )}
                </div>
            )}
        </article>
    );
}
