const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const path = require('path');
const cookies = require('../ml_cookies.json');
const {
    esperar,
    verificarPopupAberto,
    garantirPopupAberto,
    pegarValorCampo,
    FIELD_SELECTORS,
    COPY_BUTTON_SELECTORS
} = require('./utils/scrapingUtils');

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

        // --- NOVO FLUXO USANDO LINKBUILDER ---
        console.log('Acessando linkbuilder do Mercado Livre...');
        await page.goto('https://www.mercadolivre.com.br/afiliados/linkbuilder', { waitUntil: 'networkidle2', timeout: 30000 });

        // Aguarda o campo de URL carregar
        console.log('Aguardando campo de URL...');
        await page.waitForSelector('#url-0', { visible: true, timeout: 15000 });
        await esperar(1000);

        // Cola o link do produto no campo
        console.log('Colando link do produto no campo...');
        await page.click('#url-0');
        await page.keyboard.down('Control');
        await page.keyboard.press('A'); // Seleciona tudo
        await page.keyboard.up('Control');
        await page.keyboard.type(productUrl);
        console.log('Link colado:', productUrl);

        // Aguarda um pouco e clica no botão "Gerar"
        await esperar(1000);
        console.log('Clicando no botão Gerar...');
        await page.waitForSelector('.button_generate-links', { visible: true, timeout: 10000 });
        await page.click('.button_generate-links');
        console.log('Clicou no botão Gerar');

        // Aguarda o link ser gerado (campo de resultado aparecer)
        console.log('Aguardando link ser gerado...');
        await page.waitForSelector('.textfield-copyLink textarea', { visible: true, timeout: 15000 });
        await esperar(2000);

        // Pega o valor do link gerado
        affiliateLink = await page.evaluate(() => {
            const field = document.querySelector('.textfield-copyLink textarea');
            return field ? field.value.trim() : null;
        });

        if (!affiliateLink) {
            throw new Error('Não foi possível obter o link de afiliado gerado.');
        }

        console.log('Link de afiliado gerado:', affiliateLink);

        // Clica no botão "Copiar" para copiar o link
        console.log('Clicando no botão Copiar...');
        await page.waitForSelector('.copy-button', { visible: true, timeout: 10000 });
        await page.click('.copy-button');
        console.log('Clicou no botão Copiar');

        // Aguarda um pouco para garantir que foi copiado
        await esperar(1000);

        // Agora vamos acessar a página do produto para pegar os dados
        console.log('Acessando página do produto para pegar dados...');
        await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30000 });

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
