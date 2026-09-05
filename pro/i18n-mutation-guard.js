(function(){
  'use strict';
  if(!location.pathname.startsWith('/pro/'))return;
  if(Element.prototype.__sbkSafeSetAttribute)return;

  const nativeSetAttribute=Element.prototype.setAttribute;
  const guarded=new Set(['placeholder','aria-label','title']);

  Element.prototype.setAttribute=function(name,value){
    const attr=String(name);
    const next=String(value);
    if(guarded.has(attr)&&this.getAttribute(attr)===next)return;
    return nativeSetAttribute.call(this,attr,next);
  };

  Object.defineProperty(Element.prototype,'__sbkSafeSetAttribute',{value:true});
})();
