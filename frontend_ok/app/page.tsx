"use client";

import { useState } from "react";
import { supabase } from "../src/utils/supabaseClient";
import { useEffect } from "react";

export default function Home() {
  const [link, setLink] = useState("");
  const [produto, setProduto] = useState<{ nome: string; preco: number; imagem?: string } | null>(null);
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => { listener?.subscription.unsubscribe(); };
  }, []);

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
    try {
      // Chama o backend para gerar o link de afiliado e buscar dados reais
      const resp = await fetch("http://localhost:4000/api/affiliate-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productUrl: link })
      });
      const data = await resp.json();
      if (data.affiliateLink && data.nome && data.preco) {
        setLinkAfiliado(data.affiliateLink);
        setProduto({ nome: data.nome, preco: Number(data.preco), imagem: data.imagem });
        // Salva o link gerado no banco
        await fetch("http://localhost:4000/api/salvar-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            codigo_produto: extrairCodigoProduto(link),
            link_gerado: data.affiliateLink,
            preco: Number(data.preco),
            valor_cashback: Number((Number(data.preco) * 0.1 * 0.5).toFixed(2)),
            status: 'pendente',
            nome_produto: data.nome
          })
        });
      } else {
        setErro(data.error || "Erro ao gerar link de afiliado ou buscar dados do produto.");
        setProduto(null);
      }
    } catch (err) {
      setErro("Erro ao conectar com o backend.");
      setProduto(null);
    } finally {
      setLoading(false);
    }
  }

  async function buscarMeusLinks() {
    setLinksLoading(true);
    setShowLinks(true);
    const resp = await fetch(`http://localhost:4000/api/links?user_id=${user.id}`);
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

  // Comissão e cashback dinâmicos (exemplo: 4% de comissão, 50% de cashback)
  const comissao = produto ? produto.preco * 0.1 : 0;
  const cashback = comissao * 0.5;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center gap-6 border border-gray-100">
          <h1 className="text-2xl font-bold text-orange-600 text-center mb-2">Entrar ou cadastrar</h1>
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4 relative">
      {/* Cabeçalho com e-mail, botão Meus links e Sair */}
      <div className="w-full max-w-5xl flex justify-end items-center absolute top-8 right-0 pr-8 z-10 gap-4">
        <span className="text-sm text-gray-700">Logado como: {user.email}</span>
        <button
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg px-5 py-2 text-sm shadow transition-colors"
          onClick={buscarMeusLinks}
        >
          Meus links
        </button>
        <button onClick={handleLogout} className="text-xs text-orange-600 underline ml-2">Sair</button>
      </div>
      {/* Card de listagem de links */}
      {showLinks && (
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center gap-6 border border-gray-100 mb-8 mt-20">
          <div className="w-full bg-gray-50 rounded-xl p-4 mb-4 shadow-inner">
            <div className="flex flex-col gap-2 mb-2">
              <div className="font-bold text-gray-700">Totais:</div>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-orange-500">Pendente: <b>R$ {totaisPorStatus('pendente').toFixed(2)}</b></span>
                <span className="text-green-600">Recebido: <b>R$ {totaisPorStatus('recebido').toFixed(2)}</b></span>
                <span className="text-blue-600">Análise: <b>R$ {totaisPorStatus('analise').toFixed(2)}</b></span>
              </div>
            </div>
            {linksLoading ? (
              <div className="text-center text-gray-500">Carregando...</div>
            ) : meusLinks.length === 0 ? (
              <div className="text-center text-gray-400">Nenhum link gerado ainda.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm mt-2 border-separate border-spacing-y-1">
                  <thead>
                    <tr className="text-left text-gray-600 bg-gray-100">
                      <th className="px-2 py-1 rounded-l-lg">Produto</th>
                      <th className="px-2 py-1">Valor</th>
                      <th className="px-2 py-1">Cashback</th>
                      <th className="px-2 py-1">Status</th>
                      <th className="px-2 py-1 rounded-r-lg"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {meusLinks.map(link => (
                      <tr key={link.id} className="bg-white hover:bg-orange-50 border border-gray-200 rounded-lg">
                        <td className="pr-2 max-w-[180px] truncate font-medium text-gray-800">{link.nome_produto || link.codigo_produto}</td>
                        <td className="text-gray-700">R$ {Number(link.preco).toFixed(2)}</td>
                        <td className="text-green-700 font-semibold">R$ {Number(link.valor_cashback).toFixed(2)}</td>
                        <td className="capitalize text-xs font-semibold text-gray-500">{link.status}</td>
                        <td>
                          <a
                            href={link.link_gerado}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 underline font-semibold hover:text-green-800"
                          >
                            Comprar novamente
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <button
            className="mt-2 text-orange-600 underline text-sm hover:text-orange-800"
            onClick={() => setShowLinks(false)}
          >
            Fechar
          </button>
        </div>
      )}
      {/* Card principal */}
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center gap-6 border border-gray-100">
        <h1 className="text-2xl font-bold text-orange-600 text-center">Ganhe cashback em compras no Mercado Livre!</h1>
        <form onSubmit={handleGerarCashback} className="w-full flex flex-col gap-4">
          <input
            type="url"
            placeholder="Cole o link do produto do Mercado Livre"
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-800 placeholder-gray-400 bg-gray-50"
            value={link}
            onChange={e => setLink(e.target.value)}
            required
            disabled={loading}
          />
          <button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg py-2 transition-colors shadow-md"
            disabled={loading}
          >
            {loading ? "Gerando..." : "Gerar link com Cashback"}
          </button>
        </form>
        {erro && <div className="text-red-500 text-sm font-medium">{erro}</div>}
        {produto && (
          <div className="w-full flex flex-col items-center gap-4 mt-4 animate-fade-in">
            {produto.imagem && (
              <img src={produto.imagem} alt={produto.nome} className="w-40 h-40 object-contain rounded-xl border bg-gray-100 shadow" />
            )}
            <div className="text-lg font-semibold text-center text-gray-900">{produto.nome}</div>
            <div className="flex flex-col gap-1 text-sm w-full text-gray-700">
              <div><span className="font-medium">Preço estimado:</span> R$ {produto.preco.toFixed(2)}</div>
              <div><span className="font-medium">Comissão estimada:</span> R$ {comissao.toFixed(2)}</div>
              <div><span className="font-medium text-green-600">Cashback esperado:</span> <span className="font-bold">R$ {cashback.toFixed(2)}</span></div>
            </div>
            {linkAfiliado && (
              <a
                href={linkAfiliado}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-colors"
              >
                Comprar com cashback
              </a>
            )}
          </div>
        )}
      </div>
      <footer className="mt-8 text-xs text-gray-400">Seu cashback é calculado automaticamente. Powered by Cashback Generator.</footer>
    </div>
  );
}
