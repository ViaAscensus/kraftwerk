/* Kraftwerk – gemeinsame App-Funktionen: Service Worker und Installationshinweis. */
(function(){
  if('serviceWorker' in navigator){
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(function(){});
    });
  }

  var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  var deferred = null;

  function boxes(){ return document.querySelectorAll('[data-kw-install]'); }
  function show(html, onClick){
    boxes().forEach(function(b){
      b.hidden = false;
      b.innerHTML = html;
      if(onClick){ var btn = b.querySelector('button'); if(btn) btn.addEventListener('click', onClick); }
    });
  }

  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault(); deferred = e;
    if(standalone) return;
    show('<button type="button" class="kw-install-btn">Kraftwerk als App installieren</button>', async function(){
      if(!deferred) return;
      deferred.prompt();
      try{ await deferred.userChoice; }catch(_){}
      deferred = null;
      boxes().forEach(function(b){ b.hidden = true; });
    });
  });
  window.addEventListener('appinstalled', function(){ boxes().forEach(function(b){ b.hidden = true; }); });

  // iPhone/iPad: kein Installationsdialog, nur der Weg über „Teilen“
  document.addEventListener('DOMContentLoaded', function(){
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if(ios && !standalone){
      show('<span class="kw-install-ios">Als App installieren: in Safari auf <strong>Teilen</strong> tippen, dann <strong>Zum Home-Bildschirm</strong>.</span>');
    }
  });
})();
