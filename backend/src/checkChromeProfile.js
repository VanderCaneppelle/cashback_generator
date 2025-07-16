const fs = require('fs');
const path = require('path');

const profilePath = path.join(__dirname, '../chrome_profile');

if (!fs.existsSync(profilePath)) {
    console.log('⚠️  Perfil do Chrome não encontrado! Rode o login manual primeiro (acessando /login-manual no backend).');
    process.exit(1);
} else {
    console.log('Perfil do Chrome encontrado. Pronto para rodar headless!');
} 