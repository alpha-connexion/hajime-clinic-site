// ga-events.js - はじめクリニック: the only custom GA4 events on this site.
// Loaded with defer from every page, after the inline gtag config in <head>.
// Rules (must match privacy.html section 4): fixed labels only. Never link text, page text,
// or anything a visitor typed. Form events fire only AFTER the server accepted the submission,
// and carry a label chosen by this code, never the visitor's words.
(function(){
  var w = window;
  var recruit = /^\/recruit/.test(w.location.pathname);

  // Used by the form handlers on / , /recruit-clerk , /recruit-nurse. Silent if GA is blocked.
  w.hjTrack = function(name, params){
    try{ if(typeof w.gtag === 'function') w.gtag('event', name, params || {}); }catch(e){}
  };

  // tap_location: the closest known container (one fixed label).
  var PLACES = [['.mbar','mbar'], ['header','header'], ['footer','footer'], ['.hero','hero'],
                ['.hours-cta','hours'], ['.phone-block','contact'], ['.apply-cta','apply-cta'],
                ['.jd-lead, .thanks-card, .acc-body','note']];
  function place(a){
    for(var i = 0; i < PLACES.length; i++){ if(a.closest(PLACES[i][0])) return PLACES[i][1]; }
    return 'other';
  }

  document.addEventListener('click', function(e){
    try{
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if(!a) return;
      if(/^tel:/i.test(a.getAttribute('href') || '')){
        w.hjTrack(recruit ? 'recruit_phone_tap' : 'phone_tap', { tap_location: place(a) });
      }
    }catch(err){}
  }, true);   // capture: counted even if a later handler stops the click
})();
