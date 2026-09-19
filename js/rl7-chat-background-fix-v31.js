/* RL7 v50 — isolate chat wallpaper from global/PWA chrome + stabilize chat overlays */
(function(){
'use strict';
var installed=false, inChat=false, saved=null;
function el(id){return document.getElementById(id)}
function snapStyle(node){if(!node)return null;return node.getAttribute('style')}
function restoreStyle(node, v){if(!node)return;if(v===null||v===undefined)node.removeAttribute('style');else node.setAttribute('style',v)}
function saveGlobal(){
 if(saved)return;
 saved={body:snapStyle(document.body),html:snapStyle(document.documentElement),bg:snapStyle(el('app-bg'))};
}
function chatPage(){return el('page-chat-room')}
function mirrorChatBackdrop(){
 if(!inChat)return;
 var p=chatPage(); if(!p)return;
 saveGlobal();
 var cs=getComputedStyle(p), img=cs.backgroundImage, col=cs.backgroundColor;
 var body=document.body, html=document.documentElement, bg=el('app-bg');
 /* The iOS standalone status area is painted from the document/root background.
    Mirror the CURRENT chat wallpaper there only while chat-room is active. */
 [html,body].forEach(function(n){if(!n)return;
   n.style.backgroundColor=(col&&col!=='rgba(0, 0, 0, 0)')?col:'var(--bg-main,#111)';
   n.style.backgroundImage=(img&&img!=='none')?img:'none';
   n.style.backgroundSize='cover'; n.style.backgroundPosition='center'; n.style.backgroundRepeat='no-repeat';
 });
 if(bg){
   bg.style.backgroundColor=(col&&col!=='rgba(0, 0, 0, 0)')?col:'var(--bg-main,#111)';
   bg.style.backgroundImage=(img&&img!=='none')?img:'none';
   bg.style.backgroundSize='cover';bg.style.backgroundPosition='center';bg.style.backgroundRepeat='no-repeat';
 }
}
function enterChat(){
 inChat=true; saveGlobal();
 document.documentElement.classList.add('rl7-chat-active-v50');
 /* Do not let a stale visualViewport measurement expose the underlying bottom nav. */
 document.documentElement.style.setProperty('--chat-offset','0px');
 if(!(window.visualViewport && (window.innerHeight-window.visualViewport.height)>=120)){
   document.documentElement.style.setProperty('--chat-h','100dvh');
   document.documentElement.style.setProperty('--kbd','0px');
 }
 requestAnimationFrame(mirrorChatBackdrop);setTimeout(mirrorChatBackdrop,40);setTimeout(mirrorChatBackdrop,250);
}
function leaveChat(){
 if(!inChat)return; inChat=false;
 document.documentElement.classList.remove('rl7-chat-active-v50');
 if(saved){restoreStyle(document.body,saved.body);restoreStyle(document.documentElement,saved.html);restoreStyle(el('app-bg'),saved.bg);saved=null;}
}
function install(){
 if(installed||!window.Navigation||typeof Navigation._navigateTo!=='function')return;
 installed=true;
 var nav=Navigation._navigateTo;
 Navigation._navigateTo=function(page){
   var was=inChat;
   if(page==='chat-room') enterChat(); else if(was) leaveChat();
   var r=nav.apply(this,arguments);
   if(page==='chat-room'){requestAnimationFrame(mirrorChatBackdrop);setTimeout(mirrorChatBackdrop,80);}
   return r;
 };
 /* Wallpaper can arrive asynchronously from IndexedDB after navigation. Mirror every real apply. */
 if(typeof window.applyChatBackground==='function'){
   var apply=window.applyChatBackground;
   window.applyChatBackground=function(){var r=apply.apply(this,arguments);if(inChat){requestAnimationFrame(mirrorChatBackdrop);setTimeout(mirrorChatBackdrop,60);}return r;};
 }
 /* If app booted/restored directly with chat active. */
 var p=chatPage();if(p&&p.classList.contains('active'))enterChat();
}
var css=document.createElement('style');css.id='rl7-chat-wallpaper-isolation-v50-css';css.textContent=`
/* Chat must cover the app shell; global bottom navigation must never leak through. */
html.rl7-chat-active-v50 .bottom-nav{visibility:hidden!important;pointer-events:none!important;}
html.rl7-chat-active-v50 #page-chat-room.page-fullscreen.active{
  display:flex!important;position:fixed!important;left:0!important;right:0!important;
  top:var(--chat-offset,0px)!important;width:100vw!important;
  height:var(--chat-h,100dvh)!important;min-height:0!important;max-height:none!important;
  margin:0!important;padding:0!important;z-index:10000!important;overflow:hidden!important;
}
/* The three-dot menu was inheriting dark-wallpaper foreground variables while its glass surface could resolve white,
   producing the white-on-white giant panel seen in the screenshot. Give the menu its own coherent surface. */
html.rl7-chat-active-v50 #page-chat-room.chat-room-bg-dark .chat-menu-panel,
html.rl7-chat-active-v50 #page-chat-room .chat-room-bg-dark .chat-menu-panel,
html.rl7-chat-active-v50 #page-chat-room .chat-menu-panel{
  background:rgba(22,24,27,.92)!important;color:#fff!important;
  -webkit-backdrop-filter:blur(24px) saturate(130%)!important;backdrop-filter:blur(24px) saturate(130%)!important;
  border:1px solid rgba(255,255,255,.14)!important;
}
html.rl7-chat-active-v50 #page-chat-room .chat-menu-item,
html.rl7-chat-active-v50 #page-chat-room .chat-menu-item span,
html.rl7-chat-active-v50 #page-chat-room .chat-menu-item i{color:rgba(255,255,255,.94)!important;}
html.rl7-chat-active-v50 #page-chat-room .chat-menu-item+.chat-menu-item{border-top-color:rgba(255,255,255,.10)!important;}
html.rl7-chat-active-v50 #page-chat-room .chat-menu-item .menu-toggle{background:rgba(255,255,255,.18)!important;}
html.rl7-chat-active-v50 #page-chat-room .chat-menu-item .menu-toggle.on{background:var(--primary,#d88aa8)!important;}
html.rl7-chat-active-v50 #page-chat-room .chat-menu-item .menu-toggle::after{background:#fff!important;}
`;
document.head.appendChild(css);
setTimeout(install,0);setTimeout(install,300);setInterval(function(){if(!installed)install()},1200);
})();
