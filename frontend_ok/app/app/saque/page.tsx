"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../src/utils/supabaseClient';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function Saque() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [resumo, setResumo] = useState({ aprovado_real: 0, pendente_saque: 0 });
    const [dadosFinanceiros, setDadosFinanceiros] = useState<any>(null);
    const [metodo, setMetodo] = useState<string | null>(null);
    const [valor, setValor] = useState('');
    const [chavePix, setChavePix] = useState('');
    const [enviado, setEnviado] = useState(false);
    const [erro, setErro] = useState('');
    const [loading, setLoading] = useState(true);
    const [showHistorico, setShowHistorico] = useState(false);
    const [historico, setHistorico] = useState<any[]>([]);
    const [loadingHistorico, setLoadingHistorico] = useState(false);
    const [loadingFinanceiro, setLoadingFinanceiro] = useState(true);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user);
            if (data.user) {
                fetch(`${BACKEND_URL}/api/resumo-cashback?user_id=${data.user.id}`)
                    .then(res => res.json())
                    .then(res => setResumo(res));
                fetch(`${BACKEND_URL}/api/dados-financeiros?user_id=${data.user.id}`)
                    .then(res => res.json())
                    .then(res => {
                        setDadosFinanceiros(res.dados);
                        setLoadingFinanceiro(false);
                    });
            } else {
                setLoadingFinanceiro(false);
            }
            setLoading(false);
        });
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErro('');
        const valorNum = Number(valor.replace(',', '.'));
        if (!valorNum || valorNum <= 0) {
            setErro('Informe um valor válido.');
            return;
        }
        if (valorNum > resumo.aprovado_real) {
            setErro('O valor não pode ser maior que o disponível para saque.');
            return;
        }
        if (!user) {
            setErro('Usuário não autenticado.');
            return;
        }
        // Monta os dados do método escolhido
        let saquePayload: any = {
            user_id: user.id,
            valor: valorNum,
            metodo
        };
        if (metodo === 'pix') {
            saquePayload = {
                ...saquePayload,
                tipo_chave_pix: dadosFinanceiros.tipo_chave_pix,
                chave_pix: dadosFinanceiros.chave_pix
            };
        } else if (metodo === 'conta') {
            saquePayload = {
                ...saquePayload,
                banco: dadosFinanceiros.banco,
                agencia: dadosFinanceiros.agencia,
                conta: dadosFinanceiros.conta,
                tipo_conta: dadosFinanceiros.tipo_conta,
                titular_nome: dadosFinanceiros.titular_nome,
                titular_cpf: dadosFinanceiros.titular_cpf
            };
        }
        // Envia solicitação de saque
        const resp = await fetch(`${BACKEND_URL}/api/solicitar-saque`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saquePayload)
        });
        if (resp.ok) {
            setEnviado(true);
            // Atualiza o valor disponível após saque
            fetch(`${BACKEND_URL}/api/resumo-cashback?user_id=${user.id}`)
                .then(res => res.json())
                .then(res => setResumo(res));
        } else {
            const data = await resp.json();
            setErro(data.error || 'Erro ao solicitar saque.');
        }
    }

    async function handleShowHistorico() {
        if (!user) return;
        setShowHistorico(!showHistorico);
        if (!showHistorico) {
            setLoadingHistorico(true);
            const resp = await fetch(`${BACKEND_URL}/api/historico-saques?user_id=${user.id}`);
            const data = await resp.json();
            setHistorico(data.saques || []);
            setLoadingHistorico(false);
        }
    }

    if (loading || loadingFinanceiro) {
        return <div className="min-h-screen flex items-center justify-center text-gray-500">Carregando...</div>;
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-green-100 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 w-full max-w-md">
                <button
                    className="mb-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium transition-colors"
                    onClick={() => router.back()}
                >
                    Voltar
                </button>
                <h1 className="text-2xl font-bold text-green-700 mb-2 text-center">Solicitar Saque</h1>
                <p className="text-center text-gray-600 mb-6">Valor disponível para saque: <span className="font-bold text-green-700">R$ {resumo.aprovado_real?.toFixed(2) ?? '0.00'}</span></p>
                {/* Escolha do método de saque */}
                {dadosFinanceiros && (
                    <div className="flex flex-col gap-2 mb-6">
                        <span className="text-gray-700 font-medium mb-1">Como deseja receber?</span>
                        <div className="flex gap-2 justify-center w-full">
                            {dadosFinanceiros.chave_pix && (
                                <button
                                    className={`px-4 py-2 rounded-lg font-semibold border transition-colors ${metodo === 'pix' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-green-700 border-green-600 hover:bg-green-50'}`}
                                    onClick={() => setMetodo('pix')}
                                    type="button"
                                >
                                    Receber via PIX
                                </button>
                            )}
                            {(dadosFinanceiros.banco && dadosFinanceiros.agencia && dadosFinanceiros.conta && dadosFinanceiros.titular_nome && dadosFinanceiros.titular_cpf) && (
                                <button
                                    className={`px-4 py-2 rounded-lg font-semibold border transition-colors ${metodo === 'conta' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-green-700 border-green-600 hover:bg-green-50'}`}
                                    onClick={() => setMetodo('conta')}
                                    type="button"
                                >
                                    Receber via Conta
                                </button>
                            )}
                        </div>
                        {/* Mostrar dados da opção escolhida */}
                        {metodo === 'pix' && (
                            <div className="mt-2 text-sm text-gray-700 bg-green-50 border border-green-100 rounded p-2">
                                <div><b>Chave PIX:</b> {dadosFinanceiros.chave_pix}</div>
                                {dadosFinanceiros.tipo_chave_pix && <div><b>Tipo:</b> {dadosFinanceiros.tipo_chave_pix}</div>}
                            </div>
                        )}
                        {metodo === 'conta' && (
                            <div className="mt-2 text-sm text-gray-700 bg-blue-50 border border-blue-100 rounded p-2">
                                <div><b>Banco:</b> {dadosFinanceiros.banco}</div>
                                <div><b>Agência:</b> {dadosFinanceiros.agencia}</div>
                                <div><b>Conta:</b> {dadosFinanceiros.conta}</div>
                                <div><b>Tipo:</b> {dadosFinanceiros.tipo_conta}</div>
                                <div><b>Nome do titular:</b> {dadosFinanceiros.titular_nome}</div>
                                <div><b>CPF do titular:</b> {dadosFinanceiros.titular_cpf}</div>
                            </div>
                        )}
                    </div>
                )}
                {/* Só mostra o formulário se o método foi escolhido */}
                {(!dadosFinanceiros || !metodo) ? (
                    <div className="flex flex-col items-center gap-4 mb-4">
                        <div className="text-gray-500 text-center">Cadastre seus dados financeiros para solicitar saque.</div>
                        {!dadosFinanceiros && (
                            <button
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
                                onClick={() => router.push('/app/dados-financeiros')}
                            >
                                Cadastrar dados financeiros
                            </button>
                        )}
                    </div>
                ) : enviado ? (
                    <div className="text-center text-green-600 font-semibold">
                        Solicitação enviada com sucesso!<br />
                        Em breve você receberá o valor na sua chave {metodo === 'pix' ? 'PIX' : 'bancária'}.
                        <button className="mt-6 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700" onClick={() => router.back()}>Voltar</button>
                        <button
                            className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded font-medium transition-colors w-full"
                            onClick={handleShowHistorico}
                        >
                            {showHistorico ? 'Ocultar histórico de saques' : 'Ver histórico de saques'}
                        </button>
                        {showHistorico && (
                            <div className="mt-4 mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-72 overflow-y-auto">
                                {loadingHistorico ? (
                                    <div className="text-center text-gray-500">Carregando histórico...</div>
                                ) : historico.length === 0 ? (
                                    <div className="text-center text-gray-400">Nenhum saque solicitado ainda.</div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-gray-600 border-b">
                                                <th className="py-1">Valor</th>
                                                <th className="py-1">Status</th>
                                                <th className="py-1">Data</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {historico.map((s, i) => (
                                                <tr key={s.id || i} className="border-b last:border-b-0">
                                                    <td className="py-1 font-semibold text-green-700">R$ {Number(s.valor).toFixed(2)}</td>
                                                    <td className="py-1 capitalize">{s.status}</td>
                                                    <td className="py-1 text-gray-500">{new Date(s.created_at).toLocaleString('pt-BR')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <label className="font-medium text-gray-700">Valor a sacar</label>
                        <input
                            type="number"
                            min="1"
                            max={resumo.aprovado_real}
                            step="0.01"
                            placeholder="Digite o valor (R$)"
                            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-400 text-gray-800 placeholder-gray-500 bg-white"
                            value={valor}
                            onChange={e => setValor(e.target.value)}
                            required
                            disabled={resumo.pendente_saque > 0}
                        />
                        {/* Não precisa pedir chave pix/conta aqui, pois já está salva */}
                        {resumo.pendente_saque > 0 && (
                            <div className="text-red-500 text-sm font-medium text-center">Você já possui um saque pendente. Aguarde a aprovação antes de solicitar outro.</div>
                        )}
                        {erro && <div className="text-red-500 text-sm font-medium text-center">{erro}</div>}
                        <button
                            type="submit"
                            className="bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg py-2 transition-colors shadow-md mt-2"
                            disabled={resumo.aprovado_real <= 0 || resumo.pendente_saque > 0}
                        >
                            Confirmar Saque
                        </button>
                        <button
                            className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded font-medium transition-colors w-full"
                            onClick={handleShowHistorico}
                        >
                            {showHistorico ? 'Ocultar histórico de saques' : 'Ver histórico de saques'}
                        </button>
                        {showHistorico && (
                            <div className="mt-4 mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-72 overflow-y-auto">
                                {loadingHistorico ? (
                                    <div className="text-center text-gray-500">Carregando histórico...</div>
                                ) : historico.length === 0 ? (
                                    <div className="text-center text-gray-400">Nenhum saque solicitado ainda.</div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-gray-600 border-b">
                                                <th className="py-1">Valor</th>
                                                <th className="py-1">Status</th>
                                                <th className="py-1">Data</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {historico.map((s, i) => (
                                                <tr key={s.id || i} className="border-b last:border-b-0">
                                                    <td className="py-1 font-semibold text-green-700">R$ {Number(s.valor).toFixed(2)}</td>
                                                    <td className="py-1 capitalize">{s.status}</td>
                                                    <td className="py-1 text-gray-500">{new Date(s.created_at).toLocaleString('pt-BR')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
} 