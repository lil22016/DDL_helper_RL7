/* Adapted from lil22016/mochi src/js/bg-keep.js.
 * Best-effort media keepalive; does not guarantee background execution.
 * Call enable() from a user click. No external dependencies.
 */
(function (global) {
  'use strict';
  global.createBackgroundKeepAlive = function (options) {
    const opts = options || {};
    let enabled = false, audio = null, source = '', retry = null, heartbeat = null;
    let delay = 5000, playingSince = 0, generation = 0;
    const recoveries = new Set();
    const busy = () => !!(opts.isOtherAudioPlaying && opts.isOtherAudioPlaying());
    function report(error) {
      if (opts.onStatus) opts.onStatus({ enabled, playing: !!audio && !audio.paused,
        error: error ? String(error.message || error) : null });
    }
    function makeAudio() {
      const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
      const rate = 44100, samples = rate, buffer = new ArrayBuffer(44 + samples * 2);
      const view = new DataView(buffer);
      function word(offset, value) { for (let i = 0; i < value.length; i++) view.setUint8(offset+i, value.charCodeAt(i)); }
      word(0,'RIFF'); view.setUint32(4,36+samples*2,true); word(8,'WAVE');
      word(12,'fmt '); view.setUint32(16,16,true); view.setUint16(20,1,true);
      view.setUint16(22,1,true); view.setUint32(24,rate,true); view.setUint32(28,rate*2,true);
      view.setUint16(32,2,true); view.setUint16(34,16,true); word(36,'data');
      view.setUint32(40,samples*2,true);
      for (let i=0;i<samples;i++) view.setInt16(44+i*2,Math.round(Math.sin(2*Math.PI*220*i/rate)*(ios?0.002:0.02)*32767),true);
      source = URL.createObjectURL(new Blob([buffer],{type:'audio/wav'}));
      audio = document.createElement('audio'); audio.loop=true; audio.volume=0.05;
      audio.setAttribute('playsinline',''); audio.src=source;
      audio.addEventListener('playing', () => { playingSince=Date.now(); clearTimeout(retry); retry=null; markMedia(); report(); });
      audio.addEventListener('pause', () => { playingSince=0; schedule(); report(); });
      audio.addEventListener('error', () => { schedule(); report(new Error('Keepalive audio error')); });
    }
    // Optional: disable this if the host app manages Media Session itself.
    let ownedMetadata = null;
    function markMedia() {
      if (!enabled || busy() || opts.manageMediaSession === false || !navigator.mediaSession) return;
      try {
        if (global.MediaMetadata) {
          ownedMetadata = new MediaMetadata({title:opts.title || 'Background keepalive',artist:opts.artist || '',album:''});
          navigator.mediaSession.metadata=ownedMetadata;
        }
        navigator.mediaSession.playbackState='playing';
      } catch (_) {}
    }
    function schedule() {
      if (!enabled || busy() || retry) return;
      retry=setTimeout(() => { retry=null; play(); },delay);
      delay=Math.min(delay*2,60000);
    }
    async function play() {
      if (!enabled || !audio) return false;
      if (busy()) { audio.pause(); return false; }
      const token=generation, element=audio;
      try {
        await element.play();
        if (!enabled || token!==generation) return false;
        markMedia(); report(); return true;
      } catch (error) {
        if (enabled && token===generation) { report(error); schedule(); }
        return false;
      }
    }
    function heal() {
      if (!enabled || document.visibilityState==='hidden') return;
      clearTimeout(retry); retry=null; delay=5000;
      recoveries.forEach(clearTimeout); recoveries.clear();
      [0,600,1800].forEach(ms => {
        const timer=setTimeout(() => { recoveries.delete(timer); play(); },ms);
        recoveries.add(timer);
      });
    }
    async function enable() {
      if (enabled) return play();
      enabled=true; generation++; delay=5000;
      if (!audio) makeAudio();
      document.addEventListener('visibilitychange',heal);
      global.addEventListener('pageshow',heal);
      global.addEventListener('focus',heal);
      heartbeat=setInterval(() => {
        if (busy()) { if (audio && !audio.paused) audio.pause(); return; }
        if (audio.paused) schedule();
        else { if (playingSince && Date.now()-playingSince>90000) delay=5000; markMedia(); }
      },5000);
      return play();
    }
    function disable() {
      enabled=false; generation++;
      clearTimeout(retry); retry=null; clearInterval(heartbeat); heartbeat=null;
      recoveries.forEach(clearTimeout); recoveries.clear();
      document.removeEventListener('visibilitychange',heal);
      global.removeEventListener('pageshow',heal); global.removeEventListener('focus',heal);
      if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); audio=null; }
      if (source) URL.revokeObjectURL(source); source='';
      try { if (ownedMetadata && navigator.mediaSession && navigator.mediaSession.metadata===ownedMetadata) {
        navigator.mediaSession.playbackState='none'; navigator.mediaSession.metadata=null;
      } } catch (_) {}
      ownedMetadata=null; report();
    }
    return {enable,disable,resume:play,get enabled(){return enabled;}};
  };
})(window);
