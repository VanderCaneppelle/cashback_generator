const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Rota para gerar link de afiliado
app.post('/api/affiliate-link', async (req, res) => {
    const { productUrl } = req.body;
    console.log('Recebida requisição para gerar link de afiliado:', productUrl);
    if (!productUrl) {
        console.log('URL do produto não informada.');
        return res.status(400).json({ error: 'URL do produto é obrigatória.' });
    }

    let browser;
    try {
        console.log('Abrindo navegador com perfil já logado...');
        browser = await require('puppeteer').launch({
            headless: 'new',
            userDataDir: __dirname + '/../chrome_profile',
            executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-zygote',
                '--disable-gpu',
                '--window-size=1280,900',
                '--start-maximized',
                '--disable-blink-features=AutomationControlled'
            ]
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 900 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });
        console.log('Acessando produto:', productUrl);
        await page.goto(productUrl, { waitUntil: 'networkidle2' });

        // Espera 4 segundos
        console.log('Esperando 4 segundos para garantir carregamento da página...');
        await new Promise(resolve => setTimeout(resolve, 4000));

        // Clicar no botão de compartilhar
        console.log('Procurando botão de compartilhar...');
        await page.waitForSelector('[data-testid="generate_link_button"]', { timeout: 10000 });
        console.log('Botão de compartilhar encontrado, clicando...');
        await page.click('[data-testid="generate_link_button"]');
        console.log('Clique no botão de compartilhar realizado. Esperando 2 segundos...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Clicar no botão de copiar link
        console.log('Procurando botão de copiar link...');
        await page.waitForSelector('[data-testid="copy-button__label_link"]', { timeout: 10000 });
        console.log('Botão de copiar encontrado, clicando...');
        await page.click('[data-testid="copy-button__label_link"]');
        console.log('Clique no botão de copiar realizado. Esperando 1 segundo...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Tentar pegar o link do input (caso esteja visível)
        let affiliateLink = await page.evaluate(() => {
            const input = document.querySelector('input[data-testid="share-link-input"]');
            return input ? input.value : null;
        });

        // Se não achou, tentar pegar do clipboard
        if (!affiliateLink) {
            try {
                affiliateLink = await page.evaluate(() => navigator.clipboard.readText());
            } catch (e) {
                console.log('Não foi possível acessar o clipboard:', e);
            }
        }

        if (!affiliateLink) {
            console.log('Não foi possível obter o link de afiliado.');
            throw new Error('Não foi possível obter o link de afiliado.');
        }
        console.log('Link de afiliado gerado:', affiliateLink);

        // Scraping do nome do produto
        const nomeProduto = await page.evaluate(() => {
            const el = document.querySelector('h1.ui-pdp-title');
            return el ? el.innerText.trim() : null;
        });

        // Scraping do preço do produto
        const precoProduto = await page.evaluate(() => {
            const el = document.querySelector('.ui-pdp-price__second-line .andes-money-amount__fraction');
            return el ? el.innerText.replace('.', '').replace(',', '.') : null;
        });

        // Scraping da imagem principal do produto
        const imagemProduto = await page.evaluate(() => {
            const el = document.querySelector('.ui-pdp-gallery__figure img, .ui-pdp-image.ui-pdp-gallery__figure__image');
            return el ? el.src : null;
        });

        // Fechar a aba do produto
        await page.close();
        await browser.close();

        res.json({ affiliateLink, nome: nomeProduto, preco: precoProduto, imagem: imagemProduto });
    } catch (err) {
        console.log('Erro ao gerar link de afiliado:', err.message);
        if (browser) await browser.close();
        res.status(500).json({ error: 'Erro ao gerar link de afiliado: ' + err.message });
    }
});

// Rota para login manual no Mercado Livre
app.get('/login-manual', async (req, res) => {
    console.log('Iniciando login manual...');
    const browser = await require('puppeteer').launch({
        headless: false,
        userDataDir: __dirname + '/../chrome_profile',
        executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-zygote',
            '--disable-gpu'
        ]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('https://www.mercadolivre.com.br/', { waitUntil: 'networkidle2' });
    console.log('Navegador aberto na página do Mercado Livre. Faça login manualmente e feche o navegador ao terminar.');
    res.send('Navegador aberto na página do Mercado Livre. Faça login, acesse o painel de afiliados e feche o navegador ao terminar.');
    await new Promise(resolve => browser.on('disconnected', resolve));
    console.log('Navegador fechado pelo usuário. Login manual concluído.');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Backend rodando na porta ${PORT}`);
}); 