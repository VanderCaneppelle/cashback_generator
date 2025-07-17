/**
 * Utilitários para scraping do Mercado Livre
 */

/**
 * Função utilitária para esperar um tempo específico
 * @param {number} ms - Tempo em milissegundos
 * @returns {Promise} Promise que resolve após o tempo especificado
 */
const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Verifica se o popup está aberto usando múltiplos seletores
 * @param {Object} page - Instância do Puppeteer page
 * @returns {Promise<boolean>} true se o popup estiver aberto
 */
async function verificarPopupAberto(page) {
    try {
        const resultado = await page.evaluate(() => {
            const popupSelectors = [
                '.link-generator',
                '[role="dialog"]',
                '[data-testid="popper"]',
                '.andes-popper',
                '[data-testid="copy-button__label_link"]',
                '[data-testid="text-field__label_link"]',
                '[data-testid="share-link-input"]'
            ];

            const elementosEncontrados = [];
            popupSelectors.forEach(sel => {
                const elemento = document.querySelector(sel);
                if (elemento) {
                    elementosEncontrados.push(sel);
                }
            });

            return {
                aberto: elementosEncontrados.length > 0,
                elementos: elementosEncontrados
            };
        });

        console.log('Verificação do popup:', resultado);
        return resultado.aberto;
    } catch (error) {
        console.log('Erro ao verificar popup (possível navegação):', error.message);
        return false;
    }
}

/**
 * Garante que o popup está aberto, tentando reabrir se necessário
 * @param {Object} page - Instância do Puppeteer page
 * @param {number} maxTentativas - Número máximo de tentativas (padrão: 3)
 * @returns {Promise<boolean>} true se o popup estiver aberto após as tentativas
 */
async function garantirPopupAberto(page, maxTentativas = 3) {
    let aberto = false;
    let tentativas = 0;

    while (!aberto && tentativas < maxTentativas) {
        tentativas++;
        aberto = await verificarPopupAberto(page);

        if (!aberto) {
            console.log(`Popup fechado, tentativa ${tentativas} de reabrir...`);
            await page.click('[data-testid="generate_link_button"]');
            await esperar(2000);
        }
    }

    return aberto;
}

/**
 * Tenta pegar o valor de um campo usando múltiplos seletores
 * @param {Object} page - Instância do Puppeteer page
 * @param {Array<string>} fieldSelectors - Array de seletores CSS para tentar
 * @returns {Promise<string|null>} Valor do campo ou null se não encontrado
 */
async function pegarValorCampo(page, fieldSelectors) {
    for (const selector of fieldSelectors) {
        try {
            const valor = await page.evaluate((sel) => {
                const field = document.querySelector(sel);
                if (field && typeof field.value === 'string' && field.value.trim().length > 0) {
                    return field.value.trim();
                }
                return null;
            }, selector);

            if (valor) {
                console.log(`Valor capturado do campo ${selector}:`, valor);
                return valor;
            }
        } catch (e) {
            if (e.message.includes('Execution context was destroyed')) {
                console.log(`Navegação detectada ao tentar campo ${selector}, abortando...`);
                return null;
            }
            console.log(`Campo ${selector} não encontrado:`, e.message);
        }
    }
    return null;
}

/**
 * Seletores para campos de link de afiliado
 */
const FIELD_SELECTORS = [
    '[data-testid="text-field__label_link"]',
    '[data-testid="share-link-input"]',
    'input[readonly]',
    'textarea[readonly]',
    '.share-link-input',
    '[data-testid*="link"]'
];

/**
 * Seletores para botões de copiar link
 */
const COPY_BUTTON_SELECTORS = [
    '[data-testid="copy-button__label_link"]',
    '[data-testid="copy-button"]',
    'button[aria-label*="Link do produto"]',
    'button[aria-label*="copy"]',
    '.copy-button',
    '[data-testid*="copy"]',
    'button:contains("Copiar")',
    'button:contains("Copy")'
];

module.exports = {
    esperar,
    verificarPopupAberto,
    garantirPopupAberto,
    pegarValorCampo,
    FIELD_SELECTORS,
    COPY_BUTTON_SELECTORS
}; 