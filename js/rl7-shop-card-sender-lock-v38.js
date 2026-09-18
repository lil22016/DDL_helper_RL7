/* RL7 v38 — sender cannot answer their own interactive shop/request card */
(function(){'use strict';
if(window.__RL7_SHOP_SENDER_LOCK_V38__)return;
window.__RL7_SHOP_SENDER_LOCK_V38__=1;
function lock(root){
  (root||document).querySelectorAll('#page-chat-room .message-row.self').forEach(function(row){
    row.querySelectorAll('.rl7-action-card').forEach(function(card){
      var actions=card.querySelector('.rl7-card-actions');
      if(!actions)return;
      actions.setAttribute('data-sender-locked','1');
      actions.querySelectorAll('button').forEach(function(btn){
        btn.disabled=true; btn.setAttribute('aria-disabled','true'); btn.tabIndex=-1;
      });
      actions.style.display='none';
    });
  });
}
function block(e){
  var btn=e.target&&e.target.closest&&e.target.closest('#page-chat-room .message-row.self .rl7-action-card .rl7-card-actions button');
  if(!btn)return;
  e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();
}
document.addEventListener('click',block,true);
document.addEventListener('pointerup',block,true);
document.addEventListener('touchend',block,{capture:true,passive:false});
function boot(){
  lock(document);
  new MutationObserver(function(){lock(document)}).observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();