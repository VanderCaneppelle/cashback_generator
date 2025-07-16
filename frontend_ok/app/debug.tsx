"use client";

export default function Debug() {
    return (
        <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-md">
            <h3 className="font-bold mb-2">Debug Info:</h3>
            <div>Backend URL: {process.env.NEXT_PUBLIC_BACKEND_URL || 'Não configurada'}</div>
            <div>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configurada' : 'Não configurada'}</div>
            <div>Supabase Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configurada' : 'Não configurada'}</div>
        </div>
    );
} 