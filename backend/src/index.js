const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const path = require('path');
const cookies = require('../ml_cookies.json');

const app = express();
app.use(cors());
app.use(express.json());

// Healthcheck route
app.get('/', (req, res) => {
    res.json({ status: 'OK', message: 'BackendCashback Generator está funcionando!' });
});

// Rota para gerar link de afiliado
app.post('/api/affiliate-link', async (req, res) => {
    const { productUrl } = req.body;
    console.log('--- Nova requisição /api/affiliate-link ---');
    console.log('URL recebida:', productUrl);

    let browser;
    try {
        console.log('Abrindo navegador...');
        browser = await puppeteer.launch({
            headless: true, // Sempre headless em produção
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-zygote',
                '--disable-gpu',
                '--window-size=1920,1080',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });
        // Adiciona os cookies do Mercado Livre antes de acessar a página
        await page.setCookie(...cookies);
        console.log('Cookies do Mercado Livre injetados!');

        console.log('Acessando produto:', productUrl);
        await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Screenshot para debug
        await page.screenshot({ path: 'screenshot.png', fullPage: true });
        console.log('Screenshot tirada!');

        // Espera adicional para garantir carregamento
        console.log('Aguardando carregamento da página...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // --- NOVO BLOCO DE SCRAPING DO LINK DE AFILIADO ---
        let affiliateLink = null;
        try {
            // 1. Espera e clica no botão de compartilhar (com verificação de popup)
            console.log('Esperando botão de compartilhar...');
            await page.waitForSelector('[data-testid="generate_link_button"]', { visible: true, timeout: 15000 });

            let popupAberto = false;
            let tentativas = 0;

            while (!popupAberto && tentativas < 3) {
                tentativas++;
                console.log(`Tentativa ${tentativas}: Clicando no botão de compartilhar...`);
                await new Promise(resolve => setTimeout(resolve, 500));
                await page.click('[data-testid="generate_link_button"]');
                console.log('Clicou no botão de compartilhar');

                // Aguarda 2 segundos e verifica se o popup está aberto
                await new Promise(resolve => setTimeout(resolve, 2000));

                popupAberto = await page.evaluate(() => {
                    // Verifica se existe algum elemento que indica que o popup está aberto
                    const popupSelectors = [
                        '.link-generator',
                        '[role="dialog"]',
                        '[data-testid="popper"]',
                        '.andes-popper',
                        '[data-testid="copy-button__label_link"]',
                        '[data-testid="text-field__label_link"]',
                        '[data-testid="share-link-input"]'
                    ];

                    return popupSelectors.some(selector => document.querySelector(selector) !== null);
                });

                console.log(`Popup aberto na tentativa ${tentativas}:`, popupAberto);

                if (!popupAberto && tentativas < 3) {
                    console.log('Popup não abriu, aguardando 2 segundos antes da próxima tentativa...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            if (!popupAberto) {
                throw new Error('Popup não abriu após 3 tentativas de clicar no botão de compartilhar.');
            }

            console.log('Popup aberto com sucesso!');

            // 2. Espera e clica no botão de copiar link (com múltiplos seletores)
            console.log('Esperando botão de copiar link...');
            let copyButtonFound = false;

            // Aguarda um pouco mais para o conteúdo do popup carregar
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Tenta múltiplos seletores para o botão de copiar
            const copySelectors = [
                '[data-testid="copy-button__label_link"]',
                '[data-testid="copy-button"]',
                'button[aria-label*="Link do produto"]',
                'button[aria-label*="copy"]',
                '.copy-button',
                '[data-testid*="copy"]',
                'button:contains("Copiar")',
                'button:contains("Copy")'
            ];

            for (const selector of copySelectors) {
                // Antes de cada seletor, garantir que o popup está aberto
                let popupAindaAberto = false;
                let tentativasPopup = 0;
                while (!popupAindaAberto && tentativasPopup < 3) {
                    tentativasPopup++;
                    popupAindaAberto = await page.evaluate(() => {
                        const popupSelectors = [
                            '.link-generator',
                            '[role="dialog"]',
                            '[data-testid="popper"]',
                            '.andes-popper'
                        ];
                        return popupSelectors.some(sel => document.querySelector(sel) !== null);
                    });
                    if (!popupAindaAberto) {
                        console.log(`Popup fechado antes do seletor ${selector}, tentativa ${tentativasPopup} de reabrir...`);
                        await page.click('[data-testid="generate_link_button"]');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
                if (!popupAindaAberto) {
                    console.log(`Não foi possível abrir o popup para o seletor ${selector} após 3 tentativas. Abortando.`);
                    break;
                }
                try {
                    console.log(`Tentando seletor para botão de copiar: ${selector}`);
                    await page.waitForSelector(selector, { visible: true, timeout: 3000 });
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await page.click(selector);
                    console.log(`Clicou no botão de copiar link usando seletor: ${selector}`);
                    copyButtonFound = true;
                    break;
                } catch (e) {
                    console.log(`Seletor ${selector} não encontrado:`, e.message);
                }
            }

            if (!copyButtonFound) {
                console.log('Nenhum botão de copiar encontrado, tentando pegar link diretamente...');
            } else {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            // 3. Pega o valor do campo de link diretamente
            affiliateLink = await page.evaluate(() => {
                const textarea = document.querySelector('[data-testid="text-field__label_link"]');
                return textarea ? textarea.value.trim() : null;
            });
            console.log('Valor capturado do campo [data-testid="text-field__label_link"]:', affiliateLink);

            if (!affiliateLink) {
                throw new Error('Não foi possível obter o link de afiliado do campo [data-testid="text-field__label_link"].');
            }
        } catch (e) {
            console.log('Erro ao tentar gerar/clicar nos botões ou acessar clipboard:', e.message);
        }

        // Método 2: Gerar link baseado na URL do produto
        if (!affiliateLink) {
            console.log('Método 2: Gerando link baseado na URL...');
            const currentUrl = page.url();
            const productId = currentUrl.match(/MLB-?\d+/i);
            if (productId) {
                // Aqui você pode adicionar seu ID de afiliado
                affiliateLink = `https://www.mercadolivre.com.br/${productId[0]}?affiliate_id=SEU_ID_AQUI`;
                console.log('Link de afiliado gerado via URL:', affiliateLink);
            }
        }

        if (!affiliateLink) {
            console.log('Não foi possível obter o link de afiliado por nenhum método.');
            throw new Error('Não foi possível obter o link de afiliado. Tente novamente.');
        }

        console.log('Link de afiliado gerado:', affiliateLink);

        // Scraping do nome do produto
        const nomeProduto = await page.evaluate(() => {
            const el = document.querySelector('h1.ui-pdp-title');
            return el ? el.innerText.trim() : null;
        });
        console.log('Nome do produto:', nomeProduto);

        // Scraping do preço do produto
        const precoProduto = await page.evaluate(() => {
            const el = document.querySelector('.ui-pdp-price__second-line .andes-money-amount__fraction');
            return el ? el.innerText.replace('.', '').replace(',', '.') : null;
        });
        console.log('Preço do produto:', precoProduto);

        // Scraping da imagem principal do produto
        const imagemProduto = await page.evaluate(() => {
            const el = document.querySelector('.ui-pdp-gallery__figure img, .ui-pdp-image.ui-pdp-gallery__figure__image');
            return el ? el.src : null;
        });
        console.log('Imagem do produto:', imagemProduto);

        // Fechar o navegador
        await page.close();
        await browser.close();

        res.json({ affiliateLink, nome: nomeProduto, preco: precoProduto, imagem: imagemProduto });
    } catch (err) {
        console.error('Erro ao gerar link de afiliado:', err);
        if (browser) await browser.close();
        res.status(500).json({ error: 'Erro ao gerar link de afiliado: ' + err.message });
    }
});

// Rota para baixar screenshot
app.get('/screenshot', (req, res) => {
    res.sendFile(path.resolve('screenshot.png'));
});

// Rota dinâmica para servir qualquer screenshot PNG
app.get('/screenshot/:filename', (req, res) => {
    const filename = req.params.filename;
    // Permite apenas nomes de arquivos seguros e .png
    if (!/^[a-zA-Z0-9._-]+\.png$/.test(filename)) {
        return res.status(400).send('Nome de arquivo inválido');
    }
    res.sendFile(path.resolve(filename));
});

app.get('/screenshot/share10', (req, res) => {
    res.sendFile(path.resolve('screenshot_after_share_10.png'));
});

app.post('/api/salvar-link', async (req, res) => {
    const { user_id, codigo_produto, link_gerado, preco, valor_cashback, status, nome_produto } = req.body;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.from('links_cashback').insert([
        { user_id, codigo_produto, link_gerado, preco, valor_cashback, status, nome_produto }
    ]);
    console.log(req.body);
    if (error) {
        console.log('Erro ao inserir no Supabase:', error);
        return res.status(500).json({ error: error.message });
    }
    res.json({ success: true, data });
});

app.get('/api/links', async (req, res) => {
    const { user_id } = req.query;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
        .from('links_cashback')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Backend rodando na porta ${PORT}`);
});
