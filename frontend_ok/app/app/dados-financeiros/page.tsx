"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../src/utils/supabaseClient';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function DadosFinanceiros() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [sucesso, setSucesso] = useState(false);
    const [erro, setErro] = useState('');
    const [form, setForm] = useState({
        tipo_chave_pix: '',
        chave_pix: '',
        banco: '',
        agencia: '',
        conta: '',
        tipo_conta: '',
        titular_nome: '',
        titular_cpf: ''
    });

    useEffect(() => {
        supabase.auth.getUser().then(async ({ data }) => {
            setUser(data.user);
            if (data.user) {
                // Buscar dados financeiros existentes
                const resp = await fetch(`${BACKEND_URL}/api/dados-financeiros?user_id=${data.user.id}`);
                const dados = await resp.json();
                if (dados && dados.dados) {
                    setForm({ ...form, ...dados.dados });
                }
            }
            setLoading(false);
        });
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErro('');
        setSalvando(true);
        if (!user) {
            setErro('Usuário não autenticado.');
            setSalvando(false);
            return;
        }
        // Salvar dados financeiros
        const resp = await fetch(`${BACKEND_URL}/api/dados-financeiros`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.id, ...form })
        });
        if (resp.ok) {
            setSucesso(true);
        } else {
            const data = await resp.json();
            setErro(data.error || 'Erro ao salvar dados.');
        }
        setSalvando(false);
    }

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-gray-500">Carregando...</div>;
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 w-full max-w-md">
                <button
                    className="mb-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium transition-colors"
                    onClick={() => router.back()}
                >
                    Voltar
                </button>
                <h1 className="text-2xl font-bold text-blue-700 mb-4 text-center">Meus Dados Financeiros</h1>
                {sucesso && <div className="text-green-600 text-center mb-4">Dados salvos com sucesso!</div>}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <label className="font-medium text-gray-700">Tipo de chave PIX</label>
                    <select
                        className="border border-gray-300 rounded-lg px-4 py-2 bg-white"
                        value={form.tipo_chave_pix}
                        onChange={e => setForm(f => ({ ...f, tipo_chave_pix: e.target.value }))}
                    >
                        <option value="">Selecione</option>
                        <option value="cpf">CPF</option>
                        <option value="email">E-mail</option>
                        <option value="telefone">Telefone</option>
                        <option value="aleatoria">Aleatória</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Chave PIX"
                        className="border border-gray-300 rounded-lg px-4 py-2 bg-white"
                        value={form.chave_pix}
                        onChange={e => setForm(f => ({ ...f, chave_pix: e.target.value }))}
                    />
                    <label className="font-medium text-gray-700">Dados Bancários (opcional)</label>
                    <input
                        type="text"
                        placeholder="Banco"
                        className="border border-gray-300 rounded-lg px-4 py-2 bg-white"
                        value={form.banco}
                        onChange={e => setForm(f => ({ ...f, banco: e.target.value }))}
                    />
                    <input
                        type="text"
                        placeholder="Agência"
                        className="border border-gray-300 rounded-lg px-4 py-2 bg-white"
                        value={form.agencia}
                        onChange={e => setForm(f => ({ ...f, agencia: e.target.value }))}
                    />
                    <input
                        type="text"
                        placeholder="Conta"
                        className="border border-gray-300 rounded-lg px-4 py-2 bg-white"
                        value={form.conta}
                        onChange={e => setForm(f => ({ ...f, conta: e.target.value }))}
                    />
                    <input
                        type="text"
                        placeholder="Tipo de conta (corrente, poupança...)"
                        className="border border-gray-300 rounded-lg px-4 py-2 bg-white"
                        value={form.tipo_conta}
                        onChange={e => setForm(f => ({ ...f, tipo_conta: e.target.value }))}
                    />
                    <input
                        type="text"
                        placeholder="Nome do titular"
                        className="border border-gray-300 rounded-lg px-4 py-2 bg-white"
                        value={form.titular_nome}
                        onChange={e => setForm(f => ({ ...f, titular_nome: e.target.value }))}
                    />
                    <input
                        type="text"
                        placeholder="CPF do titular"
                        className="border border-gray-300 rounded-lg px-4 py-2 bg-white"
                        value={form.titular_cpf}
                        onChange={e => setForm(f => ({ ...f, titular_cpf: e.target.value }))}
                    />
                    {erro && <div className="text-red-500 text-sm font-medium text-center">{erro}</div>}
                    <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-2 transition-colors shadow-md mt-2"
                        disabled={salvando}
                    >
                        {salvando ? 'Salvando...' : 'Salvar Dados'}
                    </button>
                </form>
            </div>
        </div>
    );
} 