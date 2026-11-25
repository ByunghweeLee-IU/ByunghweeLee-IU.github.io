'use strict';
(() => {
  const audio = document.getElementById('name-pronunciation-audio');
  const button = document.querySelector('.pronunciation-play');
  if (!audio || !button) return;

  const status = document.getElementById('name-pronunciation-status');
  const fallback = document.querySelector('.pronunciation-fallback');
  const update = () => {
    const playing = !audio.paused && !audio.ended;
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', playing ? 'Pause name pronunciation' : 'Play name pronunciation');
  };
  const showFallback = () => {
    status.textContent = 'The recording could not play. Use the Open recording link to listen.';
    fallback.hidden = false;
    update();
  };

  button.addEventListener('click', async () => {
    if (!audio.paused) {
      audio.pause();
      return;
    }
    status.textContent = '';
    fallback.hidden = true;
    if (audio.ended) audio.currentTime = 0;
    try {
      await audio.play();
    } catch (error) {
      if (error.name !== 'AbortError') showFallback();
    }
  });
  ['play', 'pause', 'ended'].forEach(event => audio.addEventListener(event, update));
  audio.addEventListener('error', showFallback);
})();
