import fs from 'node:fs';

const file='public-i18n-extra.js';
let code=fs.readFileSync(file,'utf8');
const rows={
  'VAT Calculator':['MVA-kalkulator','Moms-kalkylator','MwSt.-Rechner','Calculadora de IVA','Calculateur de TVA'],
  'Calculation type':['Beregningstype','Beräkningstyp','Berechnungsart','Tipo de cálculo','Type de calcul'],
  'Add VAT':['Legg til MVA','Lägg till moms','MwSt. hinzufügen','Añadir IVA','Ajouter la TVA'],
  'Remove VAT':['Fjern MVA','Ta bort moms','MwSt. herausrechnen','Quitar IVA','Retirer la TVA'],
  'Net amount':['Nettobeløp','Nettobelopp','Nettobetrag','Importe neto','Montant net'],
  'VAT-inclusive amount':['Beløp inkl. MVA','Belopp inkl. moms','Bruttobetrag inkl. MwSt.','Importe con IVA','Montant TTC'],
  'VAT rate':['MVA-sats','Momssats','MwSt.-Satz','Tipo de IVA','Taux de TVA'],
  'Custom VAT %':['Egendefinert MVA %','Anpassad moms %','Eigene MwSt. %','IVA personalizado %','TVA personnalisée %'],
  'Custom':['Egendefinert','Anpassad','Benutzerdefiniert','Personalizado','Personnalisé'],
  'Currency':['Valuta','Valuta','Währung','Moneda','Devise'],
  'Calculate VAT':['Beregn MVA','Beräkna moms','MwSt. berechnen','Calcular IVA','Calculer la TVA'],
  'USD — $':['USD — $','USD — $','USD — $','USD — $','USD — $'],
  'EUR — €':['EUR — €','EUR — €','EUR — €','EUR — €','EUR — €'],
  'GBP — £':['GBP — £','GBP — £','GBP — £','GBP — £','GBP — £'],
  'NOK — kr':['NOK — kr','NOK — kr','NOK — kr','NOK — kr','NOK — kr'],
  'SEK — kr':['SEK — kr','SEK — kr','SEK — kr','SEK — kr','SEK — kr'],
  'DKK — kr':['DKK — kr','DKK — kr','DKK — kr','DKK — kr','DKK — kr']
};

const additions=[];
for(const [source,translations] of Object.entries(rows)){
  const key=JSON.stringify(source)+':';
  if(code.includes(key))continue;
  additions.push(`${JSON.stringify(source)}:${JSON.stringify(translations)}`);
}
if(additions.length){
  const marker='\n}};';
  if(!code.endsWith(marker))throw new Error('Unexpected public-i18n-extra.js ending');
  code=code.slice(0,-marker.length)+',\n'+additions.join(',\n')+marker;
  fs.writeFileSync(file,code);
}
console.log(`VAT public translations checked (${additions.length} added).`);
