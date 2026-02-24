var fs = require('fs');
var { PrismaClient } = require('@prisma/client');
var prisma = new PrismaClient();

var MOVIE_GROUPS = ['ACAO/AVENTURA','ANIME','CINE FERIAS','CLASSICO','COMEDIA','DOCUMENTARIO','DOCUMENTARIOS','FAROESTE','FICCAO','GUERRA','LANCAMENTOS','LANCAMENTOS LEG','LEGENDADO','MARVEL & DC','MUSICAIS','MUSICAL','NACIONAL','OSCAR 2025','PARAMOUNT+ | HBO MAX','ROMANCE/DRAMA','TERROR/SUSPENSE','TOP MENSAL','TOP SEMANAL','TURCO'];
var TV_GROUPS = ['SERIES | AMAZON PRIME','SERIES | APPLE TV','SERIES | BBC ONE','SERIES | BRASIL PARALELO','SERIES | CRUNCHYROLL','SERIES | DISCOVERY PLUS','SERIES | DISNEY + STAR','SERIES | DORAMAS','SERIES | EXCLUSIVAS','SERIES | GLOBOPLAY','SERIES | HBO MAX','SERIES | LEGENDADAS','SERIES | NETFLIX','SERIES | PARAMOUNT','SERIES | TURCAS','SERIES | VIKI ROKUTEN','NOVELAS | BRASILEIRAS','NOVELAS | MEXICANAS'];

var content = fs.readFileSync('tv_channels_narsvod_plus.m3u', 'utf8');
var lines = content.split('\n');
var items = [];
for (var i = 0; i < lines.length; i++) {
  var line = lines[i].trim();
  if (line.indexOf('#EXTINF') !== 0) continue;
  var nameMatch = line.match(/tvg-name="([^"]+)"/);
  var groupMatch = line.match(/group-title="([^"]+)"/);
  var logoMatch = line.match(/tvg-logo="([^"]+)"/);
  if (nameMatch === null || groupMatch === null) continue;
  var name = nameMatch[1];
  var group = groupMatch[1];
  var logo = logoMatch ? logoMatch[1] : null;
  var type = null;
  if (MOVIE_GROUPS.indexOf(group) >= 0) type = 'MOVIE';
  else if (TV_GROUPS.indexOf(group) >= 0) type = 'TV';
  if (type === null) continue;
  items.push({ name: name, group: group, type: type, logo: logo });
}
console.log('Total M3U:', items.length);
console.log('Filmes:', items.filter(function(i){ return i.type === 'MOVIE'; }).length);
console.log('Series:', items.filter(function(i){ return i.type === 'TV'; }).length);

prisma.title.findMany({ select: { title: true, type: true } }).then(function(existing) {
  var existingSet = new Set(existing.map(function(t){ return t.title.toLowerCase().trim() + '|' + t.type; }));
  var missing = items.filter(function(item) {
    return existingSet.has(item.name.toLowerCase().trim() + '|' + item.type) === false;
  });
  console.log('Faltando:', missing.length);
  console.log('Filmes faltando:', missing.filter(function(i){ return i.type === 'MOVIE'; }).length);
  console.log('Series faltando:', missing.filter(function(i){ return i.type === 'TV'; }).length);
  fs.writeFileSync('missing_titles.json', JSON.stringify(missing, null, 2));
  console.log('Salvo em missing_titles.json');
  prisma.$disconnect();
});
