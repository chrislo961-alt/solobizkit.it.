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
  'DKK — kr':['DKK — kr','DKK — kr','DKK — kr','DKK — kr','DKK — kr'],
  'How do I add 25% VAT?':['Hvordan legger jeg til 25 % MVA?','Hur lägger jag till 25 % moms?','Wie füge ich 25 % MwSt. hinzu?','¿Cómo añado un 25 % de IVA?','Comment ajouter 25 % de TVA ?'],
  'Why can’t I remove VAT by simply subtracting 25%?':['Hvorfor kan jeg ikke fjerne MVA ved bare å trekke fra 25 %?','Varför kan jag inte ta bort moms genom att bara dra av 25 %?','Warum kann ich die MwSt. nicht einfach durch Abzug von 25 % entfernen?','¿Por qué no puedo quitar el IVA restando simplemente un 25 %?','Pourquoi ne puis-je pas retirer la TVA en soustrayant simplement 25 % ?'],
  'Can I use another VAT rate?':['Kan jeg bruke en annen MVA-sats?','Kan jag använda en annan momssats?','Kann ich einen anderen MwSt.-Satz verwenden?','¿Puedo usar otro tipo de IVA?','Puis-je utiliser un autre taux de TVA ?']
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
