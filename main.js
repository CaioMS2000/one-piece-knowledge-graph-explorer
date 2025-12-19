import * as cheerio from 'cheerio'
// async function request(params: Record<string, string>){
async function request(params){
    try {
        const urlParams = new URLSearchParams(params);
        const url = `https://onepiece.fandom.com/pt/api.php?${urlParams.toString()}`;
        console.log('url: ', url);
        const response = await fetch(url);
        const data = await response.json();

        return data;
    } catch (error) {
        console.error('Erro ao fazer requisição:', error);
        throw error;
    }
}

let params = {
    "action": "query",
    "list": "allcategories",
    "aclimit": 50,
    "format": "json"
};
// let data = await request(params);
let data = undefined

/*console.log('Categorias disponíveis:');
for (const cat of data.query.allcategories) {
    // console.log(`- ${cat['*']}`);
    console.log(cat);
}




console.log('\n\n\n')
params = {
    "action": "query",
    "list": "categorymembers",
    "cmtitle": "Categoria:Personagens",
    "cmlimit": 50,
    "format": "json"
}
data = await request(params)
for (const page of data.query.categorymembers) {
    console.log(page);
}


console.log('\n\n\n')
params = {
    "action": "query",
    "list": "categorymembers",
    "cmtitle": "Categoria:Galerias_de_Personagem",
    "cmlimit": 50,
    "format": "json"
}
data = await request(params)
for (const page of data.query.categorymembers) {
    console.log(page);
}
*/
// console.log('\n\n\n')
// params = {
//     "action": "query",
//     "titles": "Lista_de_Personagens_Canônicos",
//     "prop": "revisions",
//     "rvprop": "content",
//     "rvslots": "main",
//     "format": "json"
// }
// data = await request(params)
// console.log(data);
// console.log(data.query.pages);
// console.log('\n');
// console.log(Object.keys(data.query.pages));
// let pageId = Object.keys(data.query.pages)[0]
// console.log(data.query.pages[pageId]);
// console.log(data.query.pages[pageId].revisions[0].slots);
// for (const page of data.query.categorymembers) {
//     console.log(page);
// }





console.log('\n\n\n')
params = {
    "action": "parse",
    "page": "Lista_de_Personagens_Canônicos",
    "prop": "text",
    "format": "json"
};

data = await request(params);
const html = data.parse.text['*'];

// Carregar HTML com cheerio
const $ = cheerio.load(html);

const characters = [];

// Selecionar linhas da tabela
$('table.wikitable tr').each((index, row) => {
    // Pular cabeçalhos
    if ($(row).find('th').length > 0) return;
    
    const cells = $(row).find('td');
    if (cells.length >= 4) {
        console.log(cells);
        const character = {
            nome: $(cells[1]).text().trim(),
            capitulo: $(cells[2]).text().trim(),
            episodio: $(cells[3]).text().trim(),
            ano: $(cells[4]).text().trim(),
            nota: $(cells[5]).text().trim()
        };
        
        if (character.nome) {
            characters.push(character);
        }
    }
});
console.log(`Total: ${characters.length} personagens`);
console.log(characters.map(character => character.nome)); 
// One Piece Knowledge Graph Explorer
// one-piece-knowledge-graph-explorer