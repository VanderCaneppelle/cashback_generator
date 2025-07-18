"use client";
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Landing() {
    const router = useRouter();
    const [showComoFunciona, setShowComoFunciona] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex flex-col justify-center items-center px-4">
            <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-10 flex flex-col items-center gap-8 border border-orange-100 mt-12 mb-8 animate-fade-in">
                <div className="flex flex-col items-center gap-4">
                    <span className="inline-block bg-orange-100 text-orange-600 rounded-full px-4 py-1 text-xs font-bold tracking-widest uppercase mb-2">Novo!</span>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-orange-600 text-center leading-tight drop-shadow-lg">Ganhe dinheiro de volta em todas as suas compras no Mercado Livre!</h1>
                    <p className="text-lg md:text-xl text-gray-700 text-center max-w-xl mt-2">Transforme cada compra em economia real. Gere seu link de cashback em segundos e receba parte do valor de volta direto na sua conta!</p>
                </div>
                <div className="flex flex-col md:flex-row gap-6 w-full justify-center items-center mt-4">
                    <div className="flex flex-col gap-3 text-left">
                        <div className="flex items-center gap-2">
                            <span className="text-green-500 text-2xl">✔️</span>
                            <span className="text-gray-800 text-lg font-semibold">Cashback real e sem pegadinhas</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-green-500 text-2xl">✔️</span>
                            <span className="text-gray-800 text-lg font-semibold">Cadastro simples e fácil, Sem burocracia</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-green-500 text-2xl">✔️</span>
                            <span className="text-gray-800 text-lg font-semibold">Funciona em qualquer produto do Mercado Livre</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-green-500 text-2xl">✔️</span>
                            <span className="text-gray-800 text-lg font-semibold">100% seguro e confiável</span>
                        </div>
                    </div>
                    <div className="hidden md:block">
                        <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="Cashback" className="w-40 h-40 drop-shadow-xl" />
                    </div>
                </div>

                {/* Botão Como Funciona */}
                <button
                    onClick={() => setShowComoFunciona(!showComoFunciona)}
                    className="text-orange-600 hover:text-orange-700 font-semibold text-lg underline transition-colors"
                >
                    Como funciona?
                </button>

                {/* Seção Como Funciona */}
                {showComoFunciona && (
                    <div className="w-full bg-orange-50 rounded-2xl p-6 border border-orange-200 animate-fade-in">
                        <h2 className="text-2xl font-bold text-orange-700 mb-4 text-center">Como funciona o cashback?</h2>

                        <div className="space-y-4">
                            <div className="bg-white rounded-lg p-4 border border-orange-100">
                                <h3 className="font-bold text-orange-600 mb-2">💰 Percentual de Cashback</h3>
                                <p className="text-gray-700">Você pode ganhar <strong>até 10% de cashback</strong> em suas compras, dependendo da categoria do produto:</p>
                                <ul className="mt-2 text-sm text-gray-600 space-y-1">
                                    <li>• Beleza e Cuidado Pessoal: <strong>8%</strong></li>
                                    <li>• Calçados, Roupas e Bolsas: <strong>8%</strong></li>
                                    <li>• Esportes e Fitness: <strong>8%</strong></li>
                                    <li>• Saúde: <strong>8%</strong></li>
                                    <li>• Eletrônicos: <strong>2%</strong></li>
                                    <li>• Outras categorias: <strong>4%</strong></li>
                                </ul>
                            </div>

                            <div className="bg-white rounded-lg p-4 border border-orange-100">
                                <h3 className="font-bold text-orange-600 mb-2">📋 Processo Completo</h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</span>
                                        <div>
                                            <p className="font-semibold text-gray-800">Gere seu link de cashback</p>
                                            <p className="text-sm text-gray-600">Cole o link do produto do Mercado Livre e gere seu link personalizado</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</span>
                                        <div>
                                            <p className="font-semibold text-gray-800">Faça sua compra</p>
                                            <p className="text-sm text-gray-600">Use o link gerado para comprar normalmente no Mercado Livre</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</span>
                                        <div>
                                            <p className="font-semibold text-gray-800">Reconhecimento da compra</p>
                                            <p className="text-sm text-gray-600">Até 1 dia útil após a compra, ela é reconhecida pelo sistema e entra em análise</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">4</span>
                                        <div>
                                            <p className="font-semibold text-gray-800">Pagamento direto</p>
                                            <p className="text-sm text-gray-600">Após análise e confirmação, o PIX é feito diretamente na sua conta, sem burocracia</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg p-4 border border-orange-100">
                                <h3 className="font-bold text-orange-600 mb-2">⏱️ Prazos</h3>
                                <p className="text-gray-700">O dinheiro cai na sua conta em torno de <strong>30 dias</strong> após a confirmação da compra.</p>
                            </div>
                        </div>
                    </div>
                )}

                <button
                    onClick={() => router.push('/app')}
                    className="mt-8 bg-orange-500 hover:bg-orange-600 text-white text-2xl font-bold rounded-xl px-10 py-5 shadow-lg transition-all duration-200 animate-bounce hover:scale-105 focus:outline-none focus:ring-4 focus:ring-orange-300"
                >
                    Quero meu cashback
                </button>
            </div>
            <footer className="text-center text-gray-400 text-xs mt-8 mb-2">
                © {new Date().getFullYear()} Cashback Generator. Todos os direitos reservados.
            </footer>
        </div>
    );
} 