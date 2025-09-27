// Emoji Catcher - simple web game
// Author: generated for user
(() => {
  // --- Config ---
  const EMOJI_POOL = ['🍎','🍌','🍇','🍒','🍓','🍍','🍑','🍉','🍊','🥝','🍔','🍕','🍩','⚽️','🎲','🐶','🐱'];
  const TARGET_POOL = ['🍎','🍌','🍇','🍒','🍓','🍍','🍑','🍉','🍊','🥝'];
  const SPAWN_INTERVAL_BASE = 1200; // ms
  const SPAWN_DECREASE_PER_LEVEL = 90; // reduce ms per level
  const GRAVITY_BASE = 0.25;
  const CATCH_BONUS = 10;
  const WRONG_PENALTY = 5;
  const LEVEL_UP_SCORE = 100;

  // --- DOM ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const overlay = document.getElementById('overlay');
  const menu = document.getElementById('menu');
  const pausePanel = document.getElementById('pausePanel');
  const howPanel = document.getElementById('howPanel');
  const howBtn = document.getElementById('howBtn');
  const howClose = document.getElementById('howClose');
  const startBtn = document.getElementById('startBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const restartBtn = document.getElementById('restartBtn');
  const leftBtn = document.getElementById('leftBtn');
  const rightBtn = document.getElementById('rightBtn');
  const mobileControls = document.getElementById('mobile-controls');
  const playerNameInput = document.getElementById('playerName');

  const scoreEl = document.getElementById('score');
  const levelEl = document.getElementById('level');
  const highEl = document.getElementById('highscore');

  // --- State ---
  let W = 960, H = 540;
  let devicePixelRatio = Math.max(1, window.devicePixelRatio || 1);
  let player = { x: 0, y: 0, w: 140, h: 40, speed: 8 };
  let emojis = [];
  let spawnTimer = 0;
  let spawnInterval = SPAWN_INTERVAL_BASE;
  let gravity = GRAVITY_BASE;
  let score = 0;
  let level = 1;
  let highscore = 0;
  let targetEmoji = TARGET_POOL[Math.floor(Math.random()*TARGET_POOL.length)];
  let running = false;
  let paused = false;
  let keys = { left:false, right:false };
  let mobileMove = 0;

  // --- Helpers ---
  function resizeCanvas(){
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = Math.floor(W * devicePixelRatio);
    canvas.height = Math.floor(H * devicePixelRatio);
    ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
    player.y = H - player.h - 14;
    if(!running) renderMenu();
  }

  function randomFrom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  function saveHighscore(){
    const name = (playerNameInput.value || 'Player').trim().slice(0,20);
    const data = { name, score, date: new Date().toISOString() };
    const prev = JSON.parse(localStorage.getItem('emojiCatcher_high')) || {score:0};
    if(score > prev.score){
      localStorage.setItem('emojiCatcher_high', JSON.stringify(data));
      highscore = score;
    }
  }

  function loadHighscore(){
    const prev = JSON.parse(localStorage.getItem('emojiCatcher_high'));
    if(prev) highscore = prev.score || 0;
    highEl.textContent = 'High: ' + highscore;
  }

  // --- Game logic ---
  function spawnEmoji(){
    const emoji = randomFrom(EMOJI_POOL);
    const size = 36 + Math.random()*26;
    emojis.push({
      e: emoji,
      x: 20 + Math.random()*(W-40),
      y: -30,
      size,
      vy: 0,
      target: emoji === targetEmoji
    });
  }

  function update(dt){
    if(paused || !running) return;
    // controls
    if(keys.left) player.x -= player.speed * 1.6;
    if(keys.right) player.x += player.speed * 1.6;
    player.x += mobileMove;
    player.x = Math.max(0, Math.min(W - player.w, player.x));

    // spawn
    spawnTimer += dt;
    if(spawnTimer > spawnInterval){
      spawnTimer = 0;
      spawnEmoji();
    }

    // update emojis
    for(let i=emojis.length-1;i>=0;i--){
      const obj = emojis[i];
      obj.vy += gravity + (level-1)*0.03;
      obj.y += obj.vy * (dt/16.67);
      // check catch
      if(obj.y + obj.size/2 >= player.y){
        // check overlap in X
        if(obj.x > player.x - 10 && obj.x < player.x + player.w + 10){
          // caught
          if(obj.target){
            score += CATCH_BONUS * level;
            // small effect: increase speed slowly
          } else {
            score = Math.max(0, score - WRONG_PENALTY);
          }
          emojis.splice(i,1);
        } else if(obj.y > H + 40){
          // missed (fell)
          if(obj.target){
            score = Math.max(0, score - WRONG_PENALTY*2);
          }
          emojis.splice(i,1);
        }
      }
    }

    // level up
    const newLevel = Math.floor(score / LEVEL_UP_SCORE) + 1;
    if(newLevel !== level){
      level = newLevel;
      spawnInterval = Math.max(400, SPAWN_INTERVAL_BASE - (level-1)*SPAWN_DECREASE_PER_LEVEL);
      gravity = GRAVITY_BASE + (level-1)*0.02;
      // change target occasionally
      targetEmoji = randomFrom(TARGET_POOL);
      flashMessage('Level ' + level + ' - เป้าหมาย: ' + targetEmoji);
    }

    // update UI
    scoreEl.textContent = 'Score: ' + score;
    levelEl.textContent = 'Level: ' + level;
    highEl.textContent = 'High: ' + highscore;

  }

  // --- Rendering ---
  function clear(){
    ctx.fillStyle = '#071026';
    ctx.fillRect(0,0,W,H);
  }

  function drawRoundedRect(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
    ctx.fill();
  }

  let flashTimer=0, flashMsg='';
  function flashMessage(txt){
    flashMsg = txt;
    flashTimer = 1800;
  }

  function render(){
    clear();
    // draw target
    ctx.font = '28px system-ui, Arial';
    ctx.fillStyle = '#e6f0ff';
    ctx.fillText('เป้าหมาย: ' + targetEmoji, W - 220, 34);

    // draw emojis
    for(const obj of emojis){
      ctx.font = `${Math.floor(obj.size)}px serif`;
      ctx.fillText(obj.e, obj.x, obj.y + obj.size);
    }

    // draw player (basket)
    ctx.fillStyle = '#111827';
    drawRoundedRect(player.x, player.y, player.w, player.h, 8);
    ctx.font = '20px system-ui';
    ctx.fillStyle = '#ffd54d';
    ctx.fillText('🧺', player.x + 8, player.y + player.h - 8);

    // draw score top-left
    ctx.fillStyle = '#dbeafe';
    ctx.font = '14px system-ui';
    ctx.fillText('Score: ' + score, 10, 22);

    // flash
    if(flashTimer > 0){
      flashTimer -= 16;
      ctx.save();
      ctx.globalAlpha = Math.max(0, flashTimer/1800);
      ctx.fillStyle = '#ffecb3';
      ctx.font = '22px system-ui';
      ctx.fillText(flashMsg, W/2 - ctx.measureText(flashMsg).width/2, H/2 - 20);
      ctx.restore();
    }
  }

  function renderMenu(){
    // draw a placeholder canvas background so the menu looks integrated
    clear();
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(20,20,W-40,H-40);
  }

  // --- Game loop ---
  let lastTime = performance.now();
  function loop(now){
    const dt = now - lastTime;
    lastTime = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  // --- Input ---
  window.addEventListener('keydown', e => {
    if(e.key === 'ArrowLeft' || e.key === 'a'){ keys.left = true; }
    if(e.key === 'ArrowRight' || e.key === 'd'){ keys.right = true; }
    if(e.key === 'Escape'){ togglePause(); }
  });
  window.addEventListener('keyup', e => {
    if(e.key === 'ArrowLeft' || e.key === 'a'){ keys.left = false; }
    if(e.key === 'ArrowRight' || e.key === 'd'){ keys.right = false; }
  });

  // touch / mouse drag for player
  let dragging = false;
  canvas.addEventListener('pointerdown', e => {
    dragging = true;
    movePlayerToPointer(e);
  });
  window.addEventListener('pointermove', e => {
    if(dragging) movePlayerToPointer(e);
  });
  window.addEventListener('pointerup', () => dragging = false);

  function movePlayerToPointer(e){
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    player.x = Math.max(0, Math.min(W - player.w, x - player.w/2));
  }

  // mobile buttons
  leftBtn.addEventListener('pointerdown', () => { mobileMove = -6; });
  leftBtn.addEventListener('pointerup', () => { mobileMove = 0; });
  leftBtn.addEventListener('pointerleave', () => { mobileMove = 0; });
  rightBtn.addEventListener('pointerdown', () => { mobileMove = 6; });
  rightBtn.addEventListener('pointerup', () => { mobileMove = 0; });
  rightBtn.addEventListener('pointerleave', () => { mobileMove = 0; });

  // --- Controls / UI handlers ---
  function startGame(){
    // init
    emojis = [];
    spawnTimer = 0;
    spawnInterval = SPAWN_INTERVAL_BASE;
    gravity = GRAVITY_BASE;
    score = 0;
    level = 1;
    targetEmoji = randomFrom(TARGET_POOL);
    running = true;
    paused = false;
    menu.style.display = 'none';
    pausePanel.classList.add('hidden');
    howPanel.classList.add('hidden');
    overlay.style.pointerEvents = 'none';
    overlay.querySelectorAll('#overlay > *').forEach(el => el.classList.add('hidden'));
    if(window.innerWidth <= 700) mobileControls.classList.remove('hidden'); else mobileControls.classList.add('hidden');
    lastTime = performance.now();
  }

  function togglePause(){
    if(!running) return;
    paused = !paused;
    if(paused){
      pausePanel.classList.remove('hidden');
      overlay.style.pointerEvents = 'auto';
    } else {
      pausePanel.classList.add('hidden');
      overlay.style.pointerEvents = 'none';
    }
  }

  function endGame(){
    running = false;
    saveHighscore();
    overlay.style.pointerEvents = 'auto';
    // show menu again with results
    menu.style.display = 'block';
    overlay.querySelector('#menu h2').textContent = 'Game Over • คะแนน ' + score;
    overlay.querySelector('#menu small').textContent = 'Highscore ถูกบันทึกในเครื่อง (ถ้าเป็นสูงสุด)';
    overlay.querySelector('#menu .menu-buttons button:nth-child(1)').textContent = 'เล่นอีกครั้ง';
  }

  // buttons
  startBtn.addEventListener('click', () => {
    startGame();
  });
  howBtn.addEventListener('click', () => {
    howPanel.classList.remove('hidden');
    overlay.style.pointerEvents = 'auto';
  });
  howClose.addEventListener('click', () => {
    howPanel.classList.add('hidden');
    overlay.style.pointerEvents = 'none';
  });

  resumeBtn.addEventListener('click', () => togglePause());
  restartBtn.addEventListener('click', () => {
    startGame();
  });

  // friendly auto-end: after long time without playing
  let inactivity = 0;
  setInterval(()=> {
    if(running && !paused){ inactivity += 1; if(inactivity > 60*10){ // 10 min
      endGame();
    }} else inactivity = 0;
  },1000);

  // simulate auto end if score drops negative a lot
  setInterval(()=> {
    if(running && score <= -50) endGame();
  },2000);

  // --- Init ---
  function init(){
    // responsive canvas container sizing
    function fitCanvas(){
      const maxW = Math.min(window.innerWidth - 24, 960);
      const targetW = Math.max(320, maxW);
      canvas.style.width = targetW + 'px';
      canvas.style.height = Math.round(targetW * 9 / 16) + 'px';
      resizeCanvas();
    }
    window.addEventListener('resize', fitCanvas);
    fitCanvas();

    // player start pos
    player.x = (W - player.w) / 2;
    player.y = H - player.h - 14;

    loadHighscore();
    renderMenu();
    requestAnimationFrame(loop);
  }

  init();

  // expose for debug
  window.EmojiCatcher = {
    endGame, startGame, togglePause
  };

})();
