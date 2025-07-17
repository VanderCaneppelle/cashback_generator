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
            userDataDir: __dirname + '/../chrome_profile',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-zygote',
                '--disable-gpu',
                '--window-size=1280,900',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 900 });
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

        // Tentar múltiplos métodos para obter o link de afiliado
        console.log('Tentando obter link de afiliado...');
        let affiliateLink = null;

        // Método 1: Tentar encontrar botão de compartilhar
        try {
            console.log('Método1: Procurando botão de compartilhar...');
            const shareButtonSelectors = [
                '[data-testid="generate_link_button"]',
                '[data-testid=share-button]',
                'button[aria-label*="compartilhar"]',
                'button[aria-label*="share"]',
                '.ui-pdp-share-button',
                '.share-button'
            ];

            let shareButtonFound = false;
            for (const selector of shareButtonSelectors) {
                try {
                    console.log(`Tentando seletor: ${selector}`);
                    await page.waitForSelector(selector, { timeout: 3000 });
                    await page.screenshot({ path: 'screenshot2.png', fullPage: true });
                    console.log('Screenshot tirada!');
                    await page.click(selector);
                    console.log(`Botão encontrado e clicado: ${selector}`);
                    shareButtonFound = true;
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    break;
                } catch (e) {
                    console.log(`Seletor ${selector} não encontrado`);
                }
            }

            if (shareButtonFound) {
                // Tentar pegar o link do input ou clipboard
                try {
                    await page.waitForSelector('[data-testid="copy-button__label_link"]', { timeout: 5000 });
                    await page.click('[data-testid="copy-button__label_link"]');
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    affiliateLink = await page.evaluate(() => {
                        const input = document.querySelector('input[data-testid="share-link-input"]');
                        return input ? input.value : null;
                    });

                    if (!affiliateLink) {
                        try {
                            affiliateLink = await page.evaluate(() => navigator.clipboard.readText());
                        } catch (e) {
                            console.log('Não foi possível acessar o clipboard:', e);
                        }
                    }
                } catch (e) {
                    console.log('Erro ao tentar copiar link:', e.message);
                }
            }
        } catch (e) {
            console.log('Método 1 falhou:', e.message);
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