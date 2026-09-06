(function(){
  'use strict';
  const homeLang={
    '/':'en','/no/':'no','/sv/':'sv','/de/':'de','/es/':'es','/fr/':'fr'
  };
  const lang=homeLang[location.pathname];
  if(!lang)return;

  const copy={
    en:{
      title:'Free Business Tools, Calculators & Invoicing | SoloBizKit',
      description:'Free business calculators, invoicing, PDF tools and QR generators for freelancers, self-employed professionals and small businesses. No signup required for free tools.',
      badge:'PRACTICAL TOOLS FOR FREELANCERS & SMALL BUSINESSES',
      h1:'Practical business tools for calculations, invoicing and everyday work.',
      intro:'Use free business calculators, invoice tools, PDF tools and QR generators for everyday work. Upgrade to SoloBizKit Pro when you want to manage customers, estimates, recurring invoices and payments in one workspace.',
      proof:'✓ Built for freelancers, self-employed professionals & small businesses',
      faqTitle:'Free business tools for freelancers and small businesses',
      faqIntro:'SoloBizKit brings common financial decisions, invoicing and document tasks together so individuals and small teams can move from question to finished work faster.',
      footer:'Practical tools for the numbers, documents and workflows behind a small business.',
      bottom:'Free business tools for freelancers and small businesses'
    },
    no:{
      title:'Gratis bedriftsverktøy, kalkulatorer og faktura | SoloBizKit',
      description:'Gratis bedriftskalkulatorer, fakturaverktøy, PDF-verktøy og QR-koder for frilansere, selvstendig næringsdrivende og små bedrifter.',
      badge:'PRAKTISKE VERKTØY FOR FRILANSERE OG SMÅ BEDRIFTER',
      h1:'Praktiske bedriftsverktøy for beregninger, fakturering og daglig drift.',
      intro:'Bruk gratis bedriftskalkulatorer, fakturaverktøy, PDF-verktøy og QR-koder i det daglige. Gå over til SoloBizKit Pro når du vil samle kunder, tilbud, faste fakturaer og betalinger i én arbeidsflate.',
      proof:'✓ For frilansere, selvstendig næringsdrivende og små bedrifter',
      faqTitle:'Gratis bedriftsverktøy for frilansere og små bedrifter',
      faqIntro:'SoloBizKit samler vanlige økonomiske valg, fakturering og dokumentoppgaver slik at både enkeltpersoner og små team kommer raskere fra spørsmål til ferdig arbeid.',
      footer:'Praktiske verktøy for tallene, dokumentene og arbeidsflyten i en liten bedrift.',
      bottom:'Gratis bedriftsverktøy for frilansere og små bedrifter'
    },
    sv:{
      title:'Gratis företagsverktyg, kalkylatorer och fakturering | SoloBizKit',
      description:'Gratis företagskalkylatorer, fakturaverktyg, PDF-verktyg och QR-koder för frilansare, egenföretagare och småföretag.',
      badge:'PRAKTISKA VERKTYG FÖR FRILANSARE OCH SMÅFÖRETAG',
      h1:'Praktiska företagsverktyg för beräkningar, fakturering och vardagsarbete.',
      intro:'Använd gratis företagskalkylatorer, fakturaverktyg, PDF-verktyg och QR-koder i det dagliga arbetet. Gå över till SoloBizKit Pro när du vill samla kunder, offerter, återkommande fakturor och betalningar i en arbetsyta.',
      proof:'✓ För frilansare, egenföretagare och småföretag',
      faqTitle:'Gratis företagsverktyg för frilansare och småföretag',
      faqIntro:'SoloBizKit samlar vanliga ekonomiska beslut, fakturering och dokumentuppgifter så att både individer och små team snabbare går från fråga till färdigt arbete.',
      footer:'Praktiska verktyg för siffrorna, dokumenten och arbetsflödet i ett litet företag.',
      bottom:'Gratis företagsverktyg för frilansare och småföretag'
    },
    de:{
      title:'Kostenlose Business-Tools, Rechner & Rechnungen | SoloBizKit',
      description:'Kostenlose Business-Rechner, Rechnungstools, PDF-Tools und QR-Codes für Freelancer, Selbstständige und kleine Unternehmen.',
      badge:'PRAKTISCHE TOOLS FÜR FREELANCER & KLEINE UNTERNEHMEN',
      h1:'Praktische Business-Tools für Berechnungen, Rechnungen und den Arbeitsalltag.',
      intro:'Nutze kostenlose Business-Rechner, Rechnungstools, PDF-Tools und QR-Codes im Arbeitsalltag. Wechsle zu SoloBizKit Pro, wenn du Kunden, Angebote, wiederkehrende Rechnungen und Zahlungen in einem Arbeitsbereich verwalten möchtest.',
      proof:'✓ Für Freelancer, Selbstständige und kleine Unternehmen',
      faqTitle:'Kostenlose Business-Tools für Freelancer und kleine Unternehmen',
      faqIntro:'SoloBizKit bündelt häufige Finanzentscheidungen, Rechnungen und Dokumentaufgaben, damit Einzelpersonen und kleine Teams schneller von der Frage zum fertigen Ergebnis kommen.',
      footer:'Praktische Tools für Zahlen, Dokumente und Abläufe in kleinen Unternehmen.',
      bottom:'Kostenlose Business-Tools für Freelancer und kleine Unternehmen'
    },
    es:{
      title:'Herramientas de negocio gratis, calculadoras y facturas | SoloBizKit',
      description:'Calculadoras de negocio, facturación, herramientas PDF y códigos QR gratis para autónomos, profesionales y pequeñas empresas.',
      badge:'HERRAMIENTAS PRÁCTICAS PARA AUTÓNOMOS Y PEQUEÑAS EMPRESAS',
      h1:'Herramientas prácticas de negocio para cálculos, facturación y trabajo diario.',
      intro:'Usa calculadoras de negocio, herramientas de facturación, PDF y códigos QR gratis en el día a día. Pasa a SoloBizKit Pro cuando quieras gestionar clientes, presupuestos, facturas recurrentes y pagos en un solo espacio.',
      proof:'✓ Para autónomos, profesionales y pequeñas empresas',
      faqTitle:'Herramientas de negocio gratis para autónomos y pequeñas empresas',
      faqIntro:'SoloBizKit reúne decisiones financieras, facturación y tareas de documentos para que tanto profesionales individuales como pequeños equipos pasen más rápido de la pregunta al trabajo terminado.',
      footer:'Herramientas prácticas para los números, documentos y flujos de trabajo de una pequeña empresa.',
      bottom:'Herramientas de negocio gratis para autónomos y pequeñas empresas'
    },
    fr:{
      title:'Outils professionnels gratuits, calculateurs et facturation | SoloBizKit',
      description:'Calculateurs professionnels, facturation, outils PDF et QR gratuits pour freelances, indépendants et petites entreprises.',
      badge:'OUTILS PRATIQUES POUR FREELANCES ET PETITES ENTREPRISES',
      h1:'Des outils professionnels pratiques pour les calculs, la facturation et le travail quotidien.',
      intro:'Utilisez gratuitement des calculateurs professionnels, des outils de facturation, PDF et QR au quotidien. Passez à SoloBizKit Pro pour gérer clients, devis, factures récurrentes et paiements dans un seul espace.',
      proof:'✓ Pour freelances, indépendants et petites entreprises',
      faqTitle:'Outils professionnels gratuits pour freelances et petites entreprises',
      faqIntro:'SoloBizKit regroupe les décisions financières courantes, la facturation et les tâches documentaires afin que les indépendants comme les petites équipes passent plus vite de la question au travail terminé.',
      footer:'Des outils pratiques pour les chiffres, documents et flux de travail d’une petite entreprise.',
      bottom:'Outils professionnels gratuits pour freelances et petites entreprises'
    }
  }[lang];

  function setMeta(name,value,property=false){
    const sel=property?`meta[property="${name}"]`:`meta[name="${name}"]`;
    const el=document.querySelector(sel);if(el)el.setAttribute('content',value);
  }
  function apply(){
    if(!copy)return;
    document.title=copy.title;
    setMeta('description',copy.description);
    setMeta('og:title',copy.title,true);
    setMeta('og:description',copy.description,true);
    setMeta('twitter:title',copy.title);
    setMeta('twitter:description',copy.description);

    const hero=document.querySelector('.home-hero');
    if(hero){
      const badge=hero.querySelector('.home-badge');
      const h1=hero.querySelector('h1');
      const intro=hero.querySelector('.hero-copy > p, .wrap > p');
      if(badge)badge.textContent=copy.badge;
      if(h1)h1.textContent=copy.h1;
      if(intro)intro.textContent=copy.intro;
      const proof=[...hero.querySelectorAll('.hero-proof span')];
      if(proof.length)proof[proof.length-1].textContent=copy.proof;
    }

    const faq=document.querySelector('.faqs .sectionhead, .faqwrap .sectionhead');
    if(faq){const h2=faq.querySelector('h2');const p=faq.querySelector('p');if(h2)h2.textContent=copy.faqTitle;if(p)p.textContent=copy.faqIntro;}

    const footer=document.querySelector('.sbk-global-footer');
    if(footer){
      const brandBlock=footer.querySelector('.sbk-global-footer-grid > div:first-child p');if(brandBlock)brandBlock.textContent=copy.footer;
      const bottom=[...footer.querySelectorAll('.sbk-global-bottom span')];if(bottom.length>1)bottom[bottom.length-1].textContent=copy.bottom;
    }

    document.querySelectorAll('h2,h3,p,span').forEach((el)=>{
      const text=(el.textContent||'').trim();
      if(lang==='en'&&text==='Free tools for solo businesses and freelancers')el.textContent=copy.faqTitle;
      if(lang==='en'&&text==='Free tools for the numbers and documents behind a solo business.')el.textContent=copy.footer;
      if(lang==='en'&&text==='Free tools for solo businesses')el.textContent=copy.bottom;
    });
  }

  let queued=false;
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();