import React from 'react';
import PostCard from '@/components/PostCard';
import { getPostsFromSheets } from '@/lib/google_sheets';
import { PostProps } from '@/components/PostCard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch real data from Google Sheets API directly through the server!
  const posts: PostProps[] = await getPostsFromSheets();

  return (
    <main className="container">
      <header className="header">
        <h1>Emprendeduro AI</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--bullish-color)' }}>● Sistema en línea (En vivo)</span>
        </div>
      </header>

      <section>
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <p>Aún no hay episodios procesados por la IA en la base de datos.</p>
          </div>
        ) : (
          posts.map((post, index) => (
            <PostCard key={`${post.videoId}-${index}`} post={post} />
          ))
        )}
      </section>
    </main>
  );
}
