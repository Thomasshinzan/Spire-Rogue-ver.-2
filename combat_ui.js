class CombatUI {
  constructor(combatManager) {
    this.combat = combatManager;
    this.game = combatManager.game;
  }

  clearLog() {
    const logArea = document.getElementById("message-log");
    if (logArea) logArea.innerHTML = "";
  }

  logMessage(text) {
    const logArea = document.getElementById("message-log");
    if (!logArea) return;
    const p = document.createElement("p");
    p.textContent = text;
    logArea.appendChild(p);
    logArea.scrollTop = logArea.scrollHeight;
  }

  updateUI() {
    this.renderHeader();
    this.renderEnemies();
    this.renderPlayer();
    this.renderHand();
    this.renderFooter();
  }

  renderHeader() {
    const header = document.getElementById("header");
    if (header) {
      const chapter = Math.ceil(this.game.currentFloor / 8);
      header.textContent = `[第${chapter}章: ${this.game.currentFloor}/${this.game.maxFloor}階] (ターン: ${this.combat.turn})`;
    }
  }

  renderEnemies() {
    const enemyArea = document.getElementById("enemy-area");
    if (!enemyArea) return;
    
    enemyArea.innerHTML = ""; 

    this.combat.enemies.forEach((enemy, index) => {
      const isTargeted = (index === this.combat.targetEnemyIndex);
      const targetClass = isTargeted ? "targeted" : "";
      const targetLabel = isTargeted ? `<span style="color:#ff5555; font-size:0.8em;">[Target]</span> ` : "";

      let statusHtml = "";
      if (enemy.statuses["vulnerable"] > 0) {
        statusHtml = `<span style="color:#ffaa55; font-size:0.9em; margin-left:8px;">[弱体:${enemy.statuses["vulnerable"]}]</span>`;
      }

      const enemyDiv = document.createElement("div");
      enemyDiv.className = `enemy-card ${targetClass}`;
      enemyDiv.innerHTML = `
        <div class="enemy-header">
          <span class="enemy-name">${targetLabel}[ ${enemy.name} ]</span>
          <span class="hp-text">HP: <span class="val-hp">${enemy.hp}/${enemy.maxHp}</span></span>
        </div>
        <div class="enemy-intent">└ 意図: ${enemy.intentText} ${statusHtml}</div>
      `;

      enemyDiv.addEventListener("click", () => {
        this.combat.setTarget(index);
      });

      enemyArea.appendChild(enemyDiv);
    });
  }

  renderPlayer() {
    const playerArea = document.getElementById("player-area");
    if (!playerArea) return;
    const player = this.game.player;

    let statusText = "なし";
    const statusArray = [];
    if (player.statuses["vulnerable"] > 0) {
      statusArray.push(`<span style="color:#ffaa55;">弱体(${player.statuses["vulnerable"]})</span>`);
    }
    if (player.statuses["reflect"] > 0) {
      statusArray.push(`<span style="color:#aaffff; font-weight:bold;">反射</span>`);
    }
    if (statusArray.length > 0) {
      statusText = statusArray.join(" / ");
    }

    playerArea.innerHTML = `
      <div class="player-stats-row">
        <div>HP: <span class="val-hp">${player.hp}/${player.maxHp}</span></div>
        <div>ブロック: <span class="val-block">${player.block}</span></div>
      </div>
      <div class="player-stats-row">
        <div>エナジー: <span class="val-energy">${player.energy}/${player.maxEnergy}</span></div>
        <div>状態異常: ${statusText}</div>
      </div>
    `;
  }

  renderHand() {
    const handArea = document.getElementById("hand-area");
    if (!handArea) return;

    handArea.innerHTML = ""; 

    if (this.combat.deckManager) {
      this.combat.deckManager.hand.forEach((card, index) => {
        if (!card || !card.name) return; 

        const cardBtn = document.createElement("button");
        cardBtn.className = "card";
        cardBtn.innerHTML = `
          <div class="card-header">
            <span class="card-name">${card.name}</span>
            <span class="val-energy">コ:${card.cost}</span>
          </div>
          <div class="card-desc">${card.description}</div>
        `;
        
        cardBtn.addEventListener("click", () => {
          if (!cardBtn.isConnected) return; 
          this.combat.playCard(index);
        });

        handArea.appendChild(cardBtn);
      });

      const emptySlotsCount = 5 - this.combat.deckManager.hand.length;
      for (let i = 0; i < emptySlotsCount; i++) {
        const emptyDiv = document.createElement("div");
        handArea.appendChild(emptyDiv);
      }
    }

    const redrawBtn = document.createElement("button");
    redrawBtn.className = "card redraw-btn";
    redrawBtn.innerHTML = `<div>🔄 引き直し<br><span style="font-size:0.8em; color:#aaa;">(エナジー1消費)</span></div>`;
    
    redrawBtn.addEventListener("click", () => {
      if (!redrawBtn.isConnected) return;
      this.combat.redrawHand();
    });

    handArea.appendChild(redrawBtn);
  }

  renderFooter() {
    const footer = document.getElementById("footer");
    if (!footer) return;

    let artifactsHtml = "";
    const equipped = this.game.player.equippedArtifacts;
    
    if (equipped.length > 0) {
      artifactsHtml = equipped.map(id => {
        const artifactData = this.game.data.artifacts[id];
        if (!artifactData) return "";
        return `<span title="${artifactData.description}" style="background-color: #5577bb; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; white-space: nowrap;">${artifactData.name}</span>`;
      }).join("");
    } else {
      artifactsHtml = `<span style="font-size:0.8em; color:#888;">装備中の遺物なし</span>`;
    }

    const drawCount = this.combat.deckManager ? this.combat.deckManager.drawPile.length : 0;
    const discardCount = this.combat.deckManager ? this.combat.deckManager.discardPile.length : 0;

    footer.innerHTML = `
      <div style="display:flex; gap:8px; align-items:center;">
        <div class="deck-info">山札: ${drawCount}</div>
        <div class="deck-info">捨札: ${discardCount}</div>
      </div>
      
      <div style="display:flex; gap:6px; flex:1; margin: 0 8px; align-items:center; overflow-x:auto;">
        ${artifactsHtml}
      </div>

      <div style="display:flex; gap:8px;">
        <button id="end-turn-btn" style="background-color: #883333; color: white; border: none; border-radius: 4px; padding: 8px 16px; font-size: 1.1em; font-weight: bold; cursor: pointer; flex-shrink: 0;">終了</button>
      </div>
    `;
    
    document.getElementById("end-turn-btn")?.addEventListener("click", () => this.combat.endTurn());
  }
}
