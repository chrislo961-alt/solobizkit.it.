(function(){
  'use strict';
  if(location.pathname.startsWith('/pro/')||location.pathname.startsWith('/lead/'))return;

  const STORAGE_KEY='sbk_language';
  const languages=['no','sv','de','es','fr'];
  const supported=['en',...languages];
  const htmlLang={en:'en',no:'no',sv:'sv',de:'de',es:'es',fr:'fr'};
  const base={
    'Calculators':['Kalkulatorer','Kalkylatorer','Rechner','Calculadoras','Calculateurs'],
    'Invoices':['Fakturaer','Fakturor','Rechnungen','Facturas','Factures'],
    'PDF Tools':['PDF-verktøy','PDF-verktyg','PDF-Tools','Herramientas PDF','Outils PDF'],
    'QR Codes':['QR-koder','QR-koder','QR-Codes','Códigos QR','Codes QR'],
    'Guides':['Guider','Guider','Ratgeber','Guías','Guides'],
    'About':['Om','Om','Über uns','Acerca de','À propos'],
    'All Tools':['Alle verktøy','Alla verktyg','Alle Tools','Todas las herramientas','Tous les outils'],
    'Tools':['Verktøy','Verktyg','Tools','Herramientas','Outils'],
    'Pricing':['Priser','Priser','Preise','Precios','Tarifs'],
    'Privacy':['Personvern','Integritet','Datenschutz','Privacidad','Confidentialité'],
    'Contact':['Kontakt','Kontakt','Kontakt','Contacto','Contact'],
    'Terms':['Vilkår','Villkor','Bedingungen','Términos','Conditions'],
    'Security':['Sikkerhet','Säkerhet','Sicherheit','Seguridad','Sécurité'],
    'Language':['Språk','Språk','Sprache','Idioma','Langue'],
    'Business Calculators':['Bedriftskalkulatorer','Företagskalkylatorer','Business-Rechner','Calculadoras de negocio','Calculateurs professionnels'],
    'Invoice Generator':['Fakturagenerator','Fakturagenerator','Rechnungsgenerator','Generador de facturas','Générateur de factures'],
    '24 Free PDF Tools':['24 gratis PDF-verktøy','24 gratis PDF-verktyg','24 kostenlose PDF-Tools','24 herramientas PDF gratis','24 outils PDF gratuits'],
    'QR Code Generator':['QR-kodegenerator','QR-kodgenerator','QR-Code-Generator','Generador de códigos QR','Générateur de codes QR'],
    'Profit Margin Calculator':['Fortjenestemargin-kalkulator','Vinstmarginalkalkylator','Gewinnmargen-Rechner','Calculadora de margen de beneficio','Calculateur de marge bénéficiaire'],
    'Break-Even Calculator':['Nullpunkt-kalkulator','Nollpunktskalkylator','Break-even-Rechner','Calculadora de punto de equilibrio','Calculateur de seuil de rentabilité'],
    'ROI Calculator':['ROI-kalkulator','ROI-kalkylator','ROI-Rechner','Calculadora ROI','Calculateur ROI'],
    'Business Loan Calculator':['Bedriftslån-kalkulator','Företagslånekalkylator','Geschäftskredit-Rechner','Calculadora de préstamo empresarial','Calculateur de prêt professionnel'],
    'Cash Flow Calculator':['Kontantstrøm-kalkulator','Kassaflödeskalkylator','Cashflow-Rechner','Calculadora de flujo de caja','Calculateur de trésorerie'],
    'Hourly Rate Calculator':['Timepris-kalkulator','Timpriskalkylator','Stundensatz-Rechner','Calculadora de tarifa por hora','Calculateur de taux horaire'],
    'Invoice Number Generator':['Fakturanummer-generator','Fakturanummergenerator','Rechnungsnummer-Generator','Generador de número de factura','Générateur de numéro de facture'],
    'Compress PDF':['Komprimer PDF','Komprimera PDF','PDF komprimieren','Comprimir PDF','Compresser PDF'],
    'Merge PDF':['Slå sammen PDF','Slå ihop PDF','PDF zusammenfügen','Unir PDF','Fusionner PDF'],
    'PDF to Word':['PDF til Word','PDF till Word','PDF zu Word','PDF a Word','PDF vers Word'],
    'Wi-Fi QR Code':['Wi-Fi QR-kode','Wi-Fi QR-kod','WLAN-QR-Code','Código QR Wi-Fi','Code QR Wi-Fi'],
    'Business Name Generator':['Firmanavn-generator','Företagsnamnsgenerator','Firmennamen-Generator','Generador de nombres de empresa','Générateur de nom d’entreprise'],
    'Sign PDF':['Signer PDF','Signera PDF','PDF signieren','Firmar PDF','Signer PDF'],
    'Protect PDF':['Beskytt PDF','Skydda PDF','PDF schützen','Proteger PDF','Protéger PDF'],
    'Unlock PDF':['Lås opp PDF','Lås upp PDF','PDF entsperren','Desbloquear PDF','Déverrouiller PDF'],
    'Crop PDF':['Beskjær PDF','Beskär PDF','PDF zuschneiden','Recortar PDF','Rogner PDF'],
    'Reorder PDF Pages':['Endre rekkefølge på PDF-sider','Ändra ordning på PDF-sidor','PDF-Seiten neu anordnen','Reordenar páginas PDF','Réorganiser les pages PDF'],
    'Extract PDF Pages':['Trekk ut PDF-sider','Extrahera PDF-sidor','PDF-Seiten extrahieren','Extraer páginas PDF','Extraire les pages PDF'],
    'PDF to Excel':['PDF til Excel','PDF till Excel','PDF zu Excel','PDF a Excel','PDF vers Excel'],
    'PDF to Text':['PDF til tekst','PDF till text','PDF zu Text','PDF a texto','PDF vers texte'],
    'PDF to HTML':['PDF til HTML','PDF till HTML','PDF zu HTML','PDF a HTML','PDF vers HTML'],
    'HTML to PDF':['HTML til PDF','HTML till PDF','HTML zu PDF','HTML a PDF','HTML vers PDF'],
    'PDF to JPG':['PDF til JPG','PDF till JPG','PDF zu JPG','PDF a JPG','PDF vers JPG'],
    'PDF to PNG':['PDF til PNG','PDF till PNG','PDF zu PNG','PDF a PNG','PDF vers PNG'],
    'JPG to PDF':['JPG til PDF','JPG till PDF','JPG zu PDF','JPG a PDF','JPG vers PDF'],
    'PNG to PDF':['PNG til PDF','PNG till PDF','PNG zu PDF','PNG a PDF','PNG vers PDF'],
    'Word to PDF':['Word til PDF','Word till PDF','Word zu PDF','Word a PDF','Word vers PDF'],
    'Edit PDF':['Rediger PDF','Redigera PDF','PDF bearbeiten','Editar PDF','Modifier PDF'],
    'Split PDF':['Del PDF','Dela PDF','PDF teilen','Dividir PDF','Diviser PDF'],
    'Rotate PDF':['Roter PDF','Rotera PDF','PDF drehen','Girar PDF','Faire pivoter PDF'],
    'Delete PDF Pages':['Slett PDF-sider','Ta bort PDF-sidor','PDF-Seiten löschen','Eliminar páginas PDF','Supprimer des pages PDF'],
    'Number PDF Pages':['Nummerer PDF-sider','Numrera PDF-sidor','PDF-Seiten nummerieren','Numerar páginas PDF','Numéroter les pages PDF'],
    'Watermark PDF':['Vannmerk PDF','Vattenmärk PDF','PDF mit Wasserzeichen','Marca de agua PDF','Filigraner PDF'],
    'Calculate':['Beregn','Beräkna','Berechnen','Calcular','Calculer'],
    'Calculate →':['Beregn →','Beräkna →','Berechnen →','Calcular →','Calculer →'],
    'Generate':['Generer','Generera','Generieren','Generar','Générer'],
    'Generate →':['Generer →','Generera →','Generieren →','Generar →','Générer →'],
    'Create':['Opprett','Skapa','Erstellen','Crear','Créer'],
    'Create →':['Opprett →','Skapa →','Erstellen →','Crear →','Créer →'],
    'Convert':['Konverter','Konvertera','Konvertieren','Convertir','Convertir'],
    'Convert →':['Konverter →','Konvertera →','Konvertieren →','Convertir →','Convertir →'],
    'Download':['Last ned','Ladda ner','Herunterladen','Descargar','Télécharger'],
    'Download →':['Last ned →','Ladda ner →','Herunterladen →','Descargar →','Télécharger →'],
    'Upload':['Last opp','Ladda upp','Hochladen','Subir','Téléverser'],
    'Choose file':['Velg fil','Välj fil','Datei auswählen','Elegir archivo','Choisir un fichier'],
    'Choose files':['Velg filer','Välj filer','Dateien auswählen','Elegir archivos','Choisir des fichiers'],
    'Select file':['Velg fil','Välj fil','Datei auswählen','Seleccionar archivo','Sélectionner un fichier'],
    'Select files':['Velg filer','Välj filer','Dateien auswählen','Seleccionar archivos','Sélectionner des fichiers'],
    'Remove':['Fjern','Ta bort','Entfernen','Eliminar','Supprimer'],
    'Clear':['Tøm','Rensa','Leeren','Limpiar','Effacer'],
    'Copy':['Kopier','Kopiera','Kopieren','Copiar','Copier'],
    'Open PDF tools →':['Åpne PDF-verktøy →','Öppna PDF-verktyg →','PDF-Tools öffnen →','Abrir herramientas PDF →','Ouvrir les outils PDF →'],
    'Create an invoice →':['Opprett faktura →','Skapa faktura →','Rechnung erstellen →','Crear factura →','Créer une facture →'],
    'Create a QR code →':['Lag QR-kode →','Skapa QR-kod →','QR-Code erstellen →','Crear código QR →','Créer un code QR →'],
    'Choose a calculator →':['Velg kalkulator →','Välj kalkylator →','Rechner auswählen →','Elegir calculadora →','Choisir un calculateur →'],
    'Browse every free tool':['Se alle gratisverktøy','Se alla gratisverktyg','Alle kostenlosen Tools ansehen','Ver todas las herramientas gratis','Voir tous les outils gratuits'],
    'Open business calculators':['Åpne bedriftskalkulatorer','Öppna företagskalkylatorer','Business-Rechner öffnen','Abrir calculadoras de negocio','Ouvrir les calculateurs professionnels'],
    'Your numbers':['Dine tall','Dina siffror','Deine Zahlen','Tus cifras','Vos chiffres'],
    'Results':['Resultater','Resultat','Ergebnisse','Resultados','Résultats'],
    'Result':['Resultat','Resultat','Ergebnis','Resultado','Résultat'],
    'Reset':['Nullstill','Återställ','Zurücksetzen','Restablecer','Réinitialiser'],
    'Currency':['Valuta','Valuta','Währung','Moneda','Devise'],
    'Amount':['Beløp','Belopp','Betrag','Importe','Montant'],
    'Revenue':['Omsetning','Intäkter','Umsatz','Ingresos','Chiffre d’affaires'],
    'Cost':['Kostnad','Kostnad','Kosten','Coste','Coût'],
    'Costs':['Kostnader','Kostnader','Kosten','Costes','Coûts'],
    'Profit':['Fortjeneste','Vinst','Gewinn','Beneficio','Bénéfice'],
    'Margin':['Margin','Marginal','Marge','Margen','Marge'],
    'Markup':['Påslag','Påslag','Aufschlag','Margen sobre coste','Majoration'],
    'Price':['Pris','Pris','Preis','Precio','Prix'],
    'Monthly payment':['Månedlig betaling','Månadsbetalning','Monatsrate','Pago mensual','Mensualité'],
    'Interest':['Renter','Ränta','Zinsen','Intereses','Intérêts'],
    'Total interest':['Totale renter','Total ränta','Gesamtzinsen','Intereses totales','Intérêts totaux'],
    'Fixed costs':['Faste kostnader','Fasta kostnader','Fixkosten','Costes fijos','Coûts fixes'],
    'Variable cost':['Variabel kostnad','Rörlig kostnad','Variable Kosten','Coste variable','Coût variable'],
    'Hourly rate':['Timepris','Timpris','Stundensatz','Tarifa por hora','Taux horaire'],
    'Hours':['Timer','Timmar','Stunden','Horas','Heures'],
    'Days':['Dager','Dagar','Tage','Días','Jours'],
    'Months':['Måneder','Månader','Monate','Meses','Mois'],
    'Years':['År','År','Jahre','Años','Années'],
    'File':['Fil','Fil','Datei','Archivo','Fichier'],
    'Files':['Filer','Filer','Dateien','Archivos','Fichiers'],
    'Page':['Side','Sida','Seite','Página','Page'],
    'Pages':['Sider','Sidor','Seiten','Páginas','Pages'],
    'Quality':['Kvalitet','Kvalitet','Qualität','Calidad','Qualité'],
    'Width':['Bredde','Bredd','Breite','Ancho','Largeur'],
    'Height':['Høyde','Höjd','Höhe','Alto','Hauteur'],
    'Password':['Passord','Lösenord','Passwort','Contraseña','Mot de passe'],
    'Text':['Tekst','Text','Text','Texto','Texte'],
    'Color':['Farge','Färg','Farbe','Color','Couleur'],
    'Size':['Størrelse','Storlek','Größe','Tamaño','Taille'],
    'Free small-business tools · no signup required':['Gratis småbedriftsverktøy · ingen registrering nødvendig','Gratis småföretagsverktyg · ingen registrering krävs','Kostenlose Tools für kleine Unternehmen · keine Anmeldung erforderlich','Herramientas gratis para pequeños negocios · sin registro','Outils gratuits pour petites entreprises · sans inscription'],
    'Calculate, invoice and finish business work in one place.':['Beregn, fakturer og få bedriftsarbeidet ferdig på ett sted.','Räkna, fakturera och få företagsarbetet klart på ett ställe.','Rechnen, fakturieren und Geschäftsaufgaben an einem Ort erledigen.','Calcula, factura y termina tareas de negocio en un solo lugar.','Calculez, facturez et terminez vos tâches professionnelles au même endroit.'],
    'Use clear business calculators, create client invoices, prepare PDF documents and generate QR codes without switching between a dozen sites.':['Bruk tydelige bedriftskalkulatorer, lag kundefakturaer, klargjør PDF-dokumenter og generer QR-koder uten å hoppe mellom mange nettsteder.','Använd tydliga företagskalkylatorer, skapa kundfakturor, förbered PDF-dokument och generera QR-koder utan att byta mellan många webbplatser.','Nutze verständliche Business-Rechner, erstelle Kundenrechnungen, bearbeite PDF-Dokumente und generiere QR-Codes ohne ständig die Website zu wechseln.','Usa calculadoras claras, crea facturas, prepara documentos PDF y genera códigos QR sin cambiar entre muchas webs.','Utilisez des calculateurs clairs, créez des factures, préparez des PDF et générez des codes QR sans passer d’un site à l’autre.'],
    'Start with a complete toolkit':['Start med et komplett verktøysett','Börja med ett komplett verktygspaket','Starte mit einem kompletten Toolkit','Empieza con un kit completo','Commencez avec une boîte à outils complète'],
    'Choose a category or search for the exact job you need to finish.':['Velg en kategori eller søk etter oppgaven du vil få gjort.','Välj en kategori eller sök efter uppgiften du vill slutföra.','Wähle eine Kategorie oder suche nach der Aufgabe, die du erledigen möchtest.','Elige una categoría o busca la tarea que quieres completar.','Choisissez une catégorie ou recherchez la tâche à accomplir.'],
    'Popular tools by business task':['Populære verktøy etter bedriftsoppgave','Populära verktyg efter företagsuppgift','Beliebte Tools nach Geschäftsaufgabe','Herramientas populares por tarea','Outils populaires par tâche'],
    'Need to manage the work too?':['Trenger du også å administrere arbeidet?','Behöver du även hantera arbetet?','Musst du auch die Arbeit verwalten?','¿También necesitas gestionar el trabajo?','Besoin aussi de gérer le travail ?'],
    'Explore SoloBizKit Pro':['Utforsk SoloBizKit Pro','Utforska SoloBizKit Pro','SoloBizKit Pro entdecken','Explorar SoloBizKit Pro','Découvrir SoloBizKit Pro'],
    'Open Pro':['Åpne Pro','Öppna Pro','Pro öffnen','Abrir Pro','Ouvrir Pro'],
    'Simple CRM':['Enkel CRM','Enkel CRM','Einfaches CRM','CRM sencillo','CRM simple'],
    'Estimates to invoices':['Tilbud til faktura','Offerter till fakturor','Angebote zu Rechnungen','Presupuestos a facturas','Devis vers factures'],
    'Recurring billing & payments':['Gjentakende fakturering og betalinger','Återkommande fakturering och betalningar','Wiederkehrende Rechnungen & Zahlungen','Facturación recurrente y pagos','Facturation récurrente et paiements'],
    'Search free SoloBizKit tools':['Søk i gratis SoloBizKit-verktøy','Sök bland gratis SoloBizKit-verktyg','Kostenlose SoloBizKit-Tools durchsuchen','Buscar herramientas gratis de SoloBizKit','Rechercher les outils gratuits SoloBizKit'],
    'Search tools':['Søk i verktøy','Sök verktyg','Tools durchsuchen','Buscar herramientas','Rechercher des outils'],
    'No exact match.':['Ingen treff.','Ingen exakt träff.','Kein exakter Treffer.','Sin coincidencia exacta.','Aucun résultat exact.'],
    'Try a shorter search, or':['Prøv et kortere søk, eller','Prova en kortare sökning, eller','Versuche eine kürzere Suche oder','Prueba una búsqueda más corta o','Essayez une recherche plus courte ou'],
    'browse all tools':['se alle verktøy','se alla verktyg','alle Tools ansehen','ver todas las herramientas','voir tous les outils']
  };
  const extra=window.SBK_PUBLIC_I18N_EXTRA;
  const catalog={...base};
  if(extra&&Array.isArray(extra.languages)&&extra.items){
    for(const [source,row] of Object.entries(extra.items)){
      const normalized=languages.map((lang)=>{const index=extra.languages.indexOf(lang);return index>=0&&Array.isArray(row)?row[index]:''});
      if(normalized.every(Boolean))catalog[source]=normalized;
    }
  }

  const nodeSource=new WeakMap();
  const attrSource=new WeakMap();
  let applying=false;
  function pathLanguage(){const m=location.pathname.match(/^\/(no|sv|de|es|fr)(?:\/|$)/);return m?m[1]:null}
  function savedLanguage(){try{const v=localStorage.getItem(STORAGE_KEY);return supported.includes(v)?v:null}catch(_){return null}}
  function language(){return pathLanguage()||savedLanguage()||'en'}
  function translate(source,lang){if(lang==='en')return source;const index=languages.indexOf(lang);return index>=0?(catalog[source]?.[index]||source):source}
  function preserve(raw,value){const a=raw.match(/^\s*/)?.[0]||'';const b=raw.match(/\s*$/)?.[0]||'';return a+value+b}
  function skipText(el){return !el||el.closest?.('.sbk-language-switcher')||['SCRIPT','STYLE','NOSCRIPT'].includes(el.tagName)||el.isContentEditable}
  function skipAttrs(el){return !(el instanceof Element)||el.closest?.('.sbk-language-switcher')||['SCRIPT','STYLE','NOSCRIPT'].includes(el.tagName)}

  function applyText(node,lang){
    const parent=node.parentElement;if(skipText(parent))return;
    if(!nodeSource.has(node))nodeSource.set(node,node.nodeValue||'');
    const raw=nodeSource.get(node)||'';const key=raw.trim();if(!key)return;
    const next=preserve(raw,translate(key,lang));if(node.nodeValue!==next)node.nodeValue=next;
  }
  function applyAttrs(el,lang){
    if(skipAttrs(el))return;
    let source=attrSource.get(el);if(!source){source={};attrSource.set(el,source)}
    for(const attr of ['placeholder','aria-label','title','alt']){
      if(!el.hasAttribute(attr))continue;
      if(!(attr in source))source[attr]=el.getAttribute(attr)||'';
      const raw=source[attr];const next=translate(raw.trim(),lang);
      if(next!==raw.trim())el.setAttribute(attr,preserve(raw,next));else if(lang==='en')el.setAttribute(attr,raw);
    }
    if(el.tagName==='OPTION'){
      if(!('optionText' in source))source.optionText=el.textContent||'';
      if(!el.hasAttribute('value'))el.setAttribute('value',source.optionText);
      const next=translate(source.optionText.trim(),lang);if(next!==source.optionText.trim())el.textContent=next;else if(lang==='en')el.textContent=source.optionText;
    }
  }
  function apply(root=document.body){
    if(!root||applying)return;applying=true;
    const lang=language();document.documentElement.lang=htmlLang[lang]||'en';
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);
    if(root.nodeType===Node.TEXT_NODE)applyText(root,lang);else if(root instanceof Element)applyAttrs(root,lang);
    let node;while((node=walker.nextNode())){if(node.nodeType===Node.TEXT_NODE)applyText(node,lang);else applyAttrs(node,lang)}
    applying=false;
  }
  function boot(){
    const lang=language();try{if(pathLanguage())localStorage.setItem(STORAGE_KEY,lang)}catch(_){ }
    apply();
    const observer=new MutationObserver(()=>{if(!applying)requestAnimationFrame(()=>apply())});
    observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['placeholder','aria-label','title','alt']});
    window.sbkPublicI18n={language,apply,translate:(text)=>translate(text,language()),catalog};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();