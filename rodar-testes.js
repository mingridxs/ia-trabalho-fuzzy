// Executa os testes da seção 6 no terminal:  node rodar-testes.js
const Fuzzy = require('./fuzzy.js');
const Testes = require('./testes.js');

const resultados = Testes.executar(Fuzzy);
console.log(Testes.comoTexto(resultados));
process.exit(resultados.every((r) => r.ok) ? 0 : 1);
