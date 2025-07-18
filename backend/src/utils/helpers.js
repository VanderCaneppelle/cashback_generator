
const categorias = require('../categorias.json');


function calcularCashback(preco, categoriaNome) {
    let comissaoPercent = 8;
    if (categoriaNome && categorias[categoriaNome] !== undefined) {
        comissaoPercent = categorias[categoriaNome];
    }
    let valorComissao = (Number(preco) * comissaoPercent) / 100;
    return Number((valorComissao * 0.5).toFixed(2));
}

module.exports = {
    calcularCashback
}; 