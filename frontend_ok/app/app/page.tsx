"use client";

import { useState } from "react";
import { supabase } from "../../src/utils/supabaseClient";
import { useEffect } from "react";
import Debug from "../debug";
import { useRouter } from "next/navigation";

export default function Home() {
    const [link, setLink] = useState("");
    const [produto, setProduto] = useState<{
        nome: string;
        preco: number;
        imagem?: string;
        categoria?: string;
        valor_cashback?: number;
    } | null>(null);
    const [linkAfiliado, setLinkAfiliado] = useState<string | null>(null);
    const [erro, setErro] = useState("");
    const [loading, setLoading] = useState(false);
    const [authView, setAuthView] = useState<'login' | 'signup'>("login");
    const [user, setUser] = useState<any>(null);
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState("");
    const [form, setForm] = useState({ email: "", password: "", nome: "", telefone: "" });
    const [showLinks, setShowLinks] = useState(false);
    const [meusLinks, setMeusLinks] = useState<any[]>([]);
    const [linksLoading, setLinksLoading] = useState(false);
    const [showAccountDropdown, setShowAccountDropdown] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Estamos preparando seu link...");
    const [progress, setProgress] = useState(0);
    const [produtoGerado, setProdutoGerado] = useState(false);
    const [percentualComissao, setPercentualComissao] = useState<number | null>(null);
    const [signupSuccess, setSignupSuccess] = useState(false);

    const router = useRouter();

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user);
        });
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });
        return () => { listener?.subscription.unsubscribe(); };
    }, []);

    // Função para buscar o percentual de comissão da categoria
    async function buscarPercentualComissao(categoria: string) {
        if (!categoria) return;

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
            const response = await fetch(`${backendUrl}/api/categorias`);
            const categorias = await response.json();
            const percentual = categorias[categoria] || 8; // Default 8% se não encontrar
            setPercentualComissao(percentual);
        } catch (error) {
            console.error('Erro ao buscar percentual de comissão:', error);
            setPercentualComissao(8); // Fallback para 8%
        }
    }

    async function handleAuth(e: React.FormEvent) {
        e.preventDefault();
        setAuthError("");
        setAuthLoading(true);
        if (authView === "signup") {
            const { data, error } = await supabase.auth.signUp({
                email: form.email,
                password: form.password
            });
            if (!error && data.user) {
                // Salva nome e telefone na tabela profiles
                await supabase.from('profiles').insert([
                    {
                        id: data.user.id,
                        nome: form.nome,
                        telefone: form.telefone
                    }
                ]);
                router.push("/verifique-email");
                return;
            }
            if (error) setAuthError(error.message);
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email: form.email,
                password: form.password
            });
            if (error) setAuthError(error.message);
        }
        setAuthLoading(false);
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        setUser(null);
    }

    async function handleGerarCashback(e: React.FormEvent) {
        e.preventDefault();
        setErro("");
        setLinkAfiliado(null);
        if (!link.match(/^https?:\/\/([a-z0-9-]+\.)*mercadolivre\.com\.br\//)) {
            setErro("Cole um link válido do Mercado Livre!");
            setProduto(null);
            return;
        }
        setLoading(true);
        setProgress(0);

        // Array de mensagens para mostrar durante o loading
        const messages = [
            "Estamos preparando seu link...",
            "Calculando seu cashback...",
            "Estamos contando seu dinheiro...",
            "Quase lá, só mais um pouco..."
        ];

        let messageIndex = 0;
        let progressValue = 0;

        // Intervalo para mensagens (aumentado para 3.5 segundos)
        const messageInterval = setInterval(() => {
            setLoadingMessage(messages[messageIndex]);
            messageIndex = (messageIndex + 1) % messages.length;
        }, 3500);

        // Intervalo para progresso (aumenta de 10 em 10 até 90%)
        const progressInterval = setInterval(() => {
            if (progressValue < 90) {
                progressValue += 10;
                setProgress(progressValue);
            }
        }, 1100);
        try {
            // Chama o backend para gerar o link de afiliado e buscar dados reais
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
            console.log('Backend URL:', backendUrl);
            const resp = await fetch(`${backendUrl}/api/affiliate-link`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productUrl: link })
            });
            const data = await resp.json();
            if (data.affiliateLink && data.nome && data.preco) {
                setLinkAfiliado(data.affiliateLink);
                setProduto({
                    nome: data.nome,
                    preco: Number(data.preco),
                    imagem: data.imagem,
                    categoria: data.categoria,
                    valor_cashback: data.valor_cashback
                });
                setProdutoGerado(true);

                // Busca o percentual de comissão da categoria
                if (data.categoria) {
                    await buscarPercentualComissao(data.categoria);
                }
                // Salva o link gerado no banco
                const payloadSalvarLink = {
                    user_id: user.id,
                    codigo_produto: extrairCodigoProduto(link),
                    link_gerado: data.affiliateLink,
                    preco: Number(data.preco),
                    status: 'pendente',
                    nome_produto: data.nome,
                    categoria: data.categoria || '',
                    valor_cashback: data.valor_cashback
                };
                console.log('Payload salvar-link:', payloadSalvarLink);
                const salvarResponse = await fetch(`${backendUrl}/api/salvar-link`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payloadSalvarLink)
                });

                const salvarData = await salvarResponse.json();

                // Atualiza o produto com o valor_cashback calculado pelo backend
                if (salvarData.valor_cashback) {
                    setProduto(prev => ({
                        ...prev!,
                        valor_cashback: salvarData.valor_cashback
                    }));
                }
            } else {
                setErro(data.error || "Erro ao gerar link de afiliado ou buscar dados do produto.");
                setProduto(null);
            }
        } catch (err) {
            console.error('Erro ao conectar com o backend:', err);
            setErro(`Erro ao conectar com o backend: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
            setProduto(null);
        } finally {
            clearInterval(messageInterval);
            clearInterval(progressInterval);
            setProgress(100); // Finaliza em 100% quando termina
            setTimeout(() => {
                setLoading(false);
                setLoadingMessage("Estamos preparando seu link...");
                setProgress(0);
            }, 500); // Pequeno delay para mostrar 100%
        }
    }

    async function buscarMeusLinks() {
        setLinksLoading(true);
        setShowLinks(true);
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        const resp = await fetch(`${backendUrl}/api/links?user_id=${user.id}`);
        const { data } = await resp.json();
        setMeusLinks(data || []);
        setLinksLoading(false);
    }

    function totaisPorStatus(status: string) {
        return meusLinks.filter(l => l.status === status).reduce((acc, l) => acc + Number(l.valor_cashback), 0);
    }

    function extrairCodigoProduto(url: string) {
        const match = url.match(/MLB-?\d+/i);
        return match ? match[0].replace('-', '') : null;
    }

    function limparDados() {
        setLink("");
        setProduto(null);
        setLinkAfiliado(null);
        setErro("");
        setProdutoGerado(false);
    }

    // Comissão e cashback dinâmicos (exemplo: 4% de comissão, 50% de cashback)
    const comissao = produto ? produto.preco * 0.1 : 0;
    const cashback = comissao * 0.5;

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4 relative">
                {/* Botão voltar */}
                <button
                    onClick={() => router.push("/")}
                    className="absolute top-4 left-4 text-gray-600 hover:text-gray-800 transition-colors"
                    title="Voltar à página inicial"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>

                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center gap-6 border border-gray-100">
                    <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="Login" className="w-20 h-20 mb-2 drop-shadow" />
                    <h1 className="text-2xl font-bold text-orange-600 text-center mb-1">Entrar ou cadastrar</h1>
                    <p className="text-gray-600 text-center text-base mb-2">Acesse sua conta para gerar links de cashback e economizar em todas as suas compras!</p>
                    <span className="text-xs text-orange-400 font-semibold mb-2">É rápido, fácil e seguro 🚀</span>
                    {signupSuccess ? (
                        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4 text-center w-full mb-4">
                            Cadastro realizado com sucesso!<br />
                            Um e-mail de confirmação foi enviado para você.<br />
                            Por favor, verifique sua caixa de entrada e confirme seu cadastro para acessar a plataforma.
                        </div>
                    ) : null}
                    <form onSubmit={handleAuth} className="w-full flex flex-col gap-4">
                        <input
                            type="email"
                            placeholder="E-mail"
                            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-400 text-gray-800 placeholder-gray-500 bg-white"
                            value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                            required
                            disabled={authLoading}
                        />
                        <input
                            type="password"
                            placeholder="Senha"
                            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-400 text-gray-800 placeholder-gray-500 bg-white"
                            value={form.password}
                            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                            required
                            disabled={authLoading}
                        />
                        {authView === "signup" && (
                            <>
                                <input
                                    type="text"
                                    placeholder="Nome"
                                    className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-400 text-gray-800 placeholder-gray-500 bg-white"
                                    value={form.nome}
                                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                                    required
                                    disabled={authLoading}
                                />
                                <input
                                    type="tel"
                                    placeholder="Telefone"
                                    className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-400 text-gray-800 placeholder-gray-500 bg-white"
                                    value={form.telefone}
                                    onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                                    disabled={authLoading}
                                />
                            </>
                        )}
                        <button
                            type="submit"
                            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg py-2 transition-colors shadow-md"
                            disabled={authLoading}
                        >
                            {authLoading ? "Enviando..." : authView === "signup" ? "Cadastrar" : "Entrar"}
                        </button>
                    </form>
                    {authError && <div className="text-red-500 text-sm font-medium">{authError}</div>}
                    <button
                        className="text-sm text-orange-600 mt-2 underline"
                        onClick={() => setAuthView(authView === "login" ? "signup" : "login")}
                    >
                        {authView === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Cabeçalho responsivo */}
            <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo/Nome do app */}
                        <div className="flex-shrink-0">
                            <h1 className="text-lg sm:text-xl font-bold text-orange-600">Cashback Generator</h1>
                        </div>

                        {/* Desktop Header */}
                        <div className="hidden md:flex items-center space-x-4">
                            <span className="text-sm text-gray-600">Logado como: {user.email}</span>
                            <button
                                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
                                onClick={buscarMeusLinks}
                            >
                                Meus links
                            </button>
                            <button
                                onClick={handleLogout}
                                className="text-sm text-orange-600 hover:text-orange-800 underline"
                            >
                                Sair
                            </button>
                        </div>

                        {/* Mobile Header */}
                        <div className="md:hidden flex items-center space-x-2">
                            <button
                                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg px-2 py-2 text-xs transition-colors whitespace-nowrap"
                                onClick={buscarMeusLinks}
                            >
                                Meus links
                            </button>

                            {/* Dropdown Minha Conta */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg px-2 py-2 text-xs transition-colors whitespace-nowrap"
                                >
                                    Minha conta
                                </button>

                                {showAccountDropdown && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                                        <div className="px-4 py-2 text-sm text-gray-600 border-b border-gray-100">
                                            {user.email}
                                        </div>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                        >
                                            Sair
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Conteúdo principal */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Card principal de geração de links */}
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 max-w-4xl mx-auto mb-8">
                    <h1 className="text-2xl font-bold text-orange-600 text-center mb-6">Ganhe cashback em compras no Mercado Livre!</h1>
                    <form onSubmit={handleGerarCashback} className="w-full flex flex-col items-center gap-4">
                        <div className={`transition-all duration-300 ease-in-out overflow-hidden w-full max-w-2xl ${produtoGerado ? "max-h-0 opacity-0" : "max-h-24 opacity-100"
                            }`}>
                            <input
                                type="url"
                                placeholder="Cole o link do produto do Mercado Livre"
                                className={`w-full border border-gray-300 rounded-lg px-4 py-4 focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-800 placeholder-gray-400 text-base ${loading ? "bg-gray-100 cursor-not-allowed" : "bg-gray-50"
                                    }`}
                                value={link}
                                onChange={e => setLink(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                        <div className="w-full max-w-2xl">
                            <button
                                type={produtoGerado ? "button" : "submit"}
                                onClick={produtoGerado ? limparDados : undefined}
                                className={`w-full font-semibold rounded-lg py-3 transition-colors shadow-md ${loading
                                    ? "bg-orange-400 text-white cursor-not-allowed"
                                    : produtoGerado
                                        ? "bg-blue-500 hover:bg-blue-600 text-white"
                                        : "bg-orange-500 hover:bg-orange-600 text-white"
                                    }`}
                                disabled={loading}
                            >
                                {loading ? "Gerando..." : produtoGerado ? "Gerar novo link" : "Gerar link com Cashback"}
                            </button>
                        </div>
                    </form>
                    {erro && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="text-red-600 text-sm font-medium">{erro}</div>
                        </div>
                    )}
                    {/* Loading State */}
                    {loading && (
                        <div className="w-full flex flex-col items-center gap-4 mt-6">
                            {/* Spinner */}
                            <div className="mb-4">
                                <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-orange-200 border-t-orange-600"></div>
                            </div>

                            {/* Mensagem */}
                            <div className="text-center">
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">Gerando seu link...</h3>
                                <p className="text-gray-600 animate-pulse">{loadingMessage}</p>
                            </div>

                            {/* Barra de progresso animada */}
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                                <div
                                    className="bg-orange-600 h-2 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>

                            <p className="text-sm text-gray-500">Progresso: {progress}%</p>
                        </div>
                    )}

                    {/* Product Display */}
                    {produto && !loading && (
                        <div className="w-full flex flex-col items-center gap-4 mt-6 animate-fade-in">
                            {produto.imagem && (
                                <img src={produto.imagem} alt={produto.nome} className="w-40 h-40 object-contain rounded-xl border bg-gray-100 shadow" />
                            )}
                            <div className="text-lg font-semibold text-center text-gray-900">{produto.nome}</div>
                            <div className="flex flex-col gap-2 text-sm w-full text-gray-700 bg-gray-50 rounded-lg p-4">
                                <div className="flex justify-between">
                                    <span className="font-medium">Preço estimado:</span>
                                    <span className="font-bold">R$ {produto.preco.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-green-600">Cashback aproximado:</span>
                                    <span className="font-bold text-green-600">R$ {produto.valor_cashback?.toFixed(2) ?? '0.00'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium">Seu cashback:</span>
                                    <span className="font-bold text-blue-600">{percentualComissao ? (percentualComissao / 2).toFixed(1) : 4}%</span>
                                </div>
                            </div>
                            {linkAfiliado && (
                                <a
                                    href={linkAfiliado}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold shadow-md transition-colors"
                                >
                                    Comprar com cashback
                                </a>
                            )}
                        </div>
                    )}
                </div>

                {/* Seção Meus Links */}
                {showLinks && (
                    <div className="mb-8 max-w-4xl mx-auto">
                        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Meus Links de Cashback</h2>
                                <button
                                    onClick={() => setShowLinks(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            {/* Totais */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                    <div className="text-orange-600 text-sm font-medium">Pendente</div>
                                    <div className="text-2xl font-bold text-orange-700">R$ {totaisPorStatus('pendente').toFixed(2)}</div>
                                </div>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="text-green-600 text-sm font-medium">Recebido</div>
                                    <div className="text-2xl font-bold text-green-700">R$ {totaisPorStatus('recebido').toFixed(2)}</div>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="text-blue-600 text-sm font-medium">Em Análise</div>
                                    <div className="text-2xl font-bold text-blue-700">R$ {totaisPorStatus('analise').toFixed(2)}</div>
                                </div>
                            </div>
                            {/* Lista de produtos */}
                            {linksLoading ? (
                                <div className="text-center py-8">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                                    <p className="mt-2 text-gray-500">Carregando seus links...</p>
                                </div>
                            ) : meusLinks.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="text-gray-400 text-lg">Nenhum link gerado ainda.</div>
                                    <p className="text-gray-500 mt-2">Gere seu primeiro link de cashback!</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {meusLinks.map(link => (
                                        <div key={link.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1">
                                                        {link.nome_produto || link.codigo_produto}
                                                    </h3>
                                                    <div className="text-xs text-gray-500 capitalize">{link.status}</div>
                                                </div>
                                            </div>
                                            <div className="space-y-2 mb-4">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Preço:</span>
                                                    <span className="font-semibold text-gray-900">R$ {Number(link.preco).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Cashback:</span>
                                                    <span className="font-bold text-green-600">R$ {Number(link.valor_cashback).toFixed(2)}</span>
                                                </div>
                                            </div>
                                            <a
                                                href={link.link_gerado}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full bg-green-600 hover:bg-green-700 text-white text-center font-semibold rounded-lg py-2 px-4 text-sm transition-colors block"
                                            >
                                                Link com Cashback
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            <footer className="mt-8 text-center text-xs text-gray-400 pb-4">
                Seu cashback é calculado automaticamente. Powered by Cashback Generator.
            </footer>

        </div>
    );
} 