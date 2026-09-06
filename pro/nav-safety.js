(function(){
  'use strict';
  document.addEventListener('click',function(event){
    const link=event.target.closest('a.nav-item[href]');
    if(!link)return;
    const href=link.getAttribute('href');
    if(!href||href.startsWith('#'))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign(link.href);
  },true);
})();
