"use client";
import { useRouter } from 'next/navigation';

export default function Landing() {
    const router = useRouter();

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