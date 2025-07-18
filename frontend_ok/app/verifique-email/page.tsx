"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function VerifiqueEmail() {
    const router = useRouter();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center gap-6 border border-gray-100">
                <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="Verifique seu e-mail" className="w-20 h-20 mb-2 drop-shadow" />
                <h1 className="text-2xl font-bold text-orange-600 text-center mb-1">Verifique seu e-mail</h1>
                <p className="text-gray-600 text-center text-base mb-2">
                    Um e-mail de confirmação foi enviado para você.<br />
                    Por favor, acesse sua caixa de entrada e clique no link de confirmação para ativar sua conta.
                </p>
                <span className="text-xs text-orange-400 font-semibold mb-2">Não encontrou? Veja na caixa de spam ou lixo eletrônico.</span>

                <button
                    onClick={() => router.push("/app")}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg px-6 py-3 transition-colors shadow-md w-full"
                >
                    Voltar ao Login
                </button>
            </div>
        </div>
    );
} 