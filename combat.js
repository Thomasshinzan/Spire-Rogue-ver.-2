class CombatManager {
  constructor(game, dungeonScene) {
    this.game = game;
    this.dungeon = dungeonScene;
    this.ui = new CombatUI(this);
    
    this.isFinished = false;
    this.isProcessing = false;
    this.turn = 1;
    this.targetEnemyIndex = 0;
    this.enemies = [];
    this.deckManager = null;

    document.getElementById("skip-reward-btn")?.addEventListener("click", () => this.finishReward());
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  startCombat(floorData) {
    this.isFinished = false;
    this.isProcessing = false;
    this.game.switchScene("scene-combat");
    this.loadFloor(floorData); 

    this.ui.clearLog();
    this.ui.logMessage(`塔の第${this.game.currentFloor}階層の探索を開始した！`);
    this.ui.updateUI(); 
  }

  loadFloor(floorData) {
    const targetCost = floorData.cost;
    const currentChapter = Math.ceil(this.game.currentFloor / 8);

    const currentChapterEnemies = Object.values(this.game.data.enemyTemplates).filter(
      enemy => enemy.level === currentChapter
    );

    let selectedEnemyIds = [];

    if (targetCost >= 10) {
      const boss = currentChapterEnemies.find(enemy => enemy.cost >= 10);
      if (boss) {
        selectedEnemyIds.push(boss.id);
      }
    } else {
      const availableEnemies = currentChapterEnemies.filter(enemy => enemy.cost < 10);
      
      let currentCost = 0;
      let attempts = 0;

      while (currentCost < targetCost && selectedEnemyIds.length < 3 && attempts < 100) {
        const randomEnemy = availableEnemies[Math.floor(Math.random() * availableEnemies.length)];
        
        if (currentCost + randomEnemy.cost <= targetCost) {
           selectedEnemyIds.push(randomEnemy.id);
           currentCost += randomEnemy.cost;
        }
        attempts++;
      }
    }

    this.enemies = selectedEnemyIds.map(id => {
      const template = this.game.data.enemyTemplates[id];
      return {
        id: template.id,
        name: template.name,
        maxHp: template.maxHp,
        hp: template.maxHp,
        pattern: template.pattern,
        statuses: {},
        patternIndex: 0,
        intentText: template.pattern[0].intentText,
        intent: template.pattern[0].intent
      };
    });

    this.targetEnemyIndex = 0;
    this.turn = 1;
    this.game.player.block = 0;
    this.game.player.energy = this.game.player.maxEnergy;
    this.game.player.statuses = {};

    this.game.player.equippedArtifacts.forEach(id => {
      const artifactData = this.game.data.artifacts[id];
      if (artifactData && artifactData.onCombatStart) {
        artifactData.onCombatStart(this.game.player);
      }
    });

    this.deckManager = new DeckManager(this.game.player.deck, this.game.data.cards);
    this.deckManager.shuffle();
    this.deckManager.draw(5);
  }

  setTarget(index) {
    if (this.isFinished || this.isProcessing) return; 
    if (this.targetEnemyIndex !== index) {
      this.targetEnemyIndex = index;
      this.ui.logMessage(`ターゲットを [${this.enemies[index].name}] に変更しました。`);
      this.ui.updateUI(); 
    }
  }

  returnFromArtifacts() {
    this.game.switchScene("scene-combat");
    this.ui.updateUI(); 
  }

  redrawHand() {
    if (this.isFinished || this.isProcessing) return; 
    const player = this.game.player;
    
    if (player.energy < 1) {
      this.ui.logMessage("エナジーが足りない！(引き直しには1必要です)");
      return;
    }
    
    player.energy -= 1;
    this.ui.logMessage("エナジーを1消費して手札を引き直した！");
    
    this.deckManager.discardHand();
    this.deckManager.draw(5);
    
    this.ui.updateUI();
  }
  
  playCard(handIndex) {
    if (this.isFinished || this.isProcessing) return; 
    const player = this.game.player;
    const card = this.deckManager.hand[handIndex];
    
    if (player.energy < card.cost) {
      this.ui.logMessage(`エナジーが足りない！ (${card.name} はコスト${card.cost}必要です)`);
      return; 
    }

    player.energy -= card.cost;
    this.ui.logMessage(`[${card.name}] を使用した！`);

    if (card.effects) {
      card.effects.forEach(effect => {
        this.applyEffect(effect);
      });
    }

    if (card.isExhaust) {
      this.ui.logMessage(`[${card.name}] は消費され、消滅した！`);
      this.deckManager.exhaust(handIndex);
    } else {
      this.deckManager.moveToDiscard(handIndex);
    }
    
    this.checkEnemyDeaths();
    this.ui.updateUI();
  }

  applyEffect(effect) {
    const player = this.game.player;
    if (effect.type === "block" && effect.target === "player") {
      player.block += effect.value;
      this.ui.logMessage(`プレイヤーは ${effect.value} ブロックを得た。`);
    } 
    else if (effect.type === "heal" && effect.target === "player") {
      const oldHp = player.hp;
      player.hp += effect.value;
      if (player.hp > player.maxHp) {
        player.hp = player.maxHp;
      }
      const actualHeal = player.hp - oldHp;
      if (actualHeal > 0) {
        this.ui.logMessage(`プレイヤーのHPが ${actualHeal} 回復した！`);
      } else {
        this.ui.logMessage(`しかしHPはすでに最大だった！`);
      }
    }
    else if (effect.type === "damage" && effect.target === "player") {
      const dmgResult = player.takeDamage(effect.value);
      let msg = `反動ダメージ！ `;
      if (dmgResult.blockedAmount > 0) {
        msg += `(ブロックで ${dmgResult.blockedAmount} 軽減) `;
      }
      if (dmgResult.actualDamage > 0) {
        msg += `プレイヤーは ${dmgResult.actualDamage} のダメージを受けた！`;
      } else {
        msg += `完全に防いだ！`;
      }
      this.ui.logMessage(msg);
    }
    else if (effect.type === "discard") {
      for (let i = 0; i < effect.value; i++) {
        if (this.deckManager.hand.length > 0) {
          const discardIndex = Math.floor(Math.random() * this.deckManager.hand.length);
          const discardedCard = this.deckManager.hand[discardIndex];
          this.deckManager.moveToDiscard(discardIndex);
          this.ui.logMessage(`手札から [${discardedCard.name}] が捨てられた。`);
        }
      }
      this.ui.updateUI();
    }
    else if (effect.type === "damage" && (effect.target === "enemy" || effect.target === "random_enemy")) {
      if (this.enemies.length > 0) {
        const targetIndex = effect.target === "random_enemy" 
          ? Math.floor(Math.random() * this.enemies.length) 
          : this.targetEnemyIndex;
          
        const targetEnemy = this.enemies[targetIndex];
        let finalDamage = effect.value;

        if (targetEnemy.statuses["vulnerable"] > 0) {
          finalDamage = Math.floor(finalDamage * 1.5);
          this.ui.logMessage(`弱体効果でダメージ増加！`);
        }

        targetEnemy.hp -= finalDamage;
        this.ui.logMessage(`${targetEnemy.name} に ${finalDamage} のダメージ！`);
      }
    }
    else if (effect.type === "damage_all") {
      if (this.enemies.length > 0) {
        this.ui.logMessage(`全体攻撃！`);
        this.enemies.forEach(targetEnemy => {
          let finalDamage = effect.value;
          if (targetEnemy.statuses["vulnerable"] > 0) {
            finalDamage = Math.floor(finalDamage * 1.5);
          }
          targetEnemy.hp -= finalDamage;
          this.ui.logMessage(`${targetEnemy.name} に ${finalDamage} のダメージ！`);
        });
      }
    }
    else if (effect.type === "status" && effect.target === "enemy") {
      if (this.enemies.length > 0) {
        const targetEnemy = this.enemies[this.targetEnemyIndex];
        if (!targetEnemy.statuses[effect.statusType]) {
          targetEnemy.statuses[effect.statusType] = 0;
        }
        targetEnemy.statuses[effect.statusType] += effect.value;
        const statusName = effect.statusType === "vulnerable" ? "弱体" : effect.statusType;
        this.ui.logMessage(`${targetEnemy.name} に ${statusName}(${effect.value}) を与えた！`);
      }
    }
    else if (effect.type === "status" && effect.target === "player") {
      if (!player.statuses[effect.statusType]) {
        player.statuses[effect.statusType] = 0;
      }
      player.statuses[effect.statusType] += effect.value;
      const statusName = effect.statusType === "reflect" ? "反射" : effect.statusType;
      this.ui.logMessage(`プレイヤーは ${statusName} の構えをとった！`);
    }
    else if (effect.type === "draw" && effect.target === "player") {
      this.deckManager.draw(effect.value);
      this.ui.logMessage(`カードを ${effect.value} 枚引いた！`);
    }
  }

  checkEnemyDeaths() {
    let targetDied = false;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].hp <= 0) {
        this.ui.logMessage(`${this.enemies[i].name} を倒した！`);
        this.enemies.splice(i, 1);

        if (i === this.targetEnemyIndex) {
          targetDied = true;
        } else if (i < this.targetEnemyIndex) {
          this.targetEnemyIndex--;
        }
      }
    }

    if (this.enemies.length === 0) {
      this.targetEnemyIndex = null;
      this.isFinished = true; 
      this.isProcessing = true; 

      this.game.saveData();

      const currentFloorData = this.game.data.floors[this.game.currentFloor - 1];

      if (currentFloorData.cost >= 10) {
        setTimeout(() => {
          this.showArtifactRewardScene(); 
          this.isProcessing = false;
        }, 1000);
      } else {
        setTimeout(() => {
          this.showRewardScene(); 
          this.isProcessing = false;
        }, 1500);
      }
    } else if (targetDied || this.targetEnemyIndex >= this.enemies.length) {
      this.targetEnemyIndex = 0;
    }
  }

  showArtifactRewardScene() {
    this.game.switchScene("scene-artifact-reward");
    const container = document.getElementById("artifact-cards");
    container.innerHTML = ""; 

    const artifacts = Object.values(this.game.data.artifacts);

    artifacts.forEach(artifact => {
      const cardEl = document.createElement("div");
      cardEl.className = "reward-card"; 
      cardEl.innerHTML = `
        <h3 style="color: #ffaa55; margin-bottom: 8px;">${artifact.name}</h3>
        <p>${artifact.description}</p>
      `;
      
      cardEl.addEventListener("click", async () => {
        const confirmed = await this.game.showConfirm(`アーティファクト「${artifact.name}」を取得しますか？`);
        if (!confirmed) return;

        this.game.player.addArtifact(artifact.id);
        
        // 階層を次に進め、章のアンロック状況を更新する
        const clearedChapter = Math.ceil(this.game.currentFloor / 8);
        this.game.currentFloor++;
        const nextChapter = Math.ceil(this.game.currentFloor / 8);
        this.game.unlockChapter(nextChapter);
        
        // ★ 報酬獲得と階層進行の状態で確実にセーブ
        this.game.saveData(); 
        
        // 最終階層ならクリア画面へ
        if (this.game.currentFloor > this.game.maxFloor) {
          this.dungeon.showResult("victory");
        } else {
          // ★ 章クリア時に「進むか」「戻るか」を選ばせる
          const proceed = await this.game.showConfirm(`第${clearedChapter}章をクリアしました！\nこのまま第${nextChapter}章へ進みますか？\n（キャンセルを押すとタイトルへ戻ります）`);
          if (proceed) {
            this.dungeon.showMap();
          } else {
            this.game.showTitleScene(); // キャンセル時はタイトルへ（セーブは既に完了している）
          }
        }
      });

      container.appendChild(cardEl);
    });
  }

  showRewardScene() {
    this.game.switchScene("scene-reward");
    const rewardContainer = document.getElementById("reward-cards");
    rewardContainer.innerHTML = ""; 

    const allCards = Object.values(this.game.data.cards);
    const currentChapter = Math.ceil(this.game.currentFloor / 8);

    const rewardPool = allCards.filter(card => {
      return card.reward > 0 && currentChapter >= card.reward;
    });
    
    const choices = [];
    const shuffledPool = [...rewardPool].sort(() => 0.5 - Math.random());
    const choiceCount = Math.min(3, shuffledPool.length);
    for (let i = 0; i < choiceCount; i++) {
      choices.push(shuffledPool[i]);
    }

    choices.forEach(card => {
      const cardEl = document.createElement("div");
      cardEl.className = "reward-card";
      cardEl.innerHTML = `
        <h3>${card.name}</h3>
        <p class="reward-cost">コスト: ${card.cost}</p>
        <p>${card.description}</p>
      `;
      
      cardEl.addEventListener("click", async () => {
        const confirmed = await this.game.showConfirm(`「${card.name}」をデッキに追加しますか？`);
        if (!confirmed) return;

        this.game.player.deck.push(card.id);
        this.finishReward();
      });

      rewardContainer.appendChild(cardEl);
    });
  }

  finishReward() {
    this.game.currentFloor++;
    const nextChapter = Math.ceil(this.game.currentFloor / 8);
    this.game.unlockChapter(nextChapter);
    
    this.game.saveData(); 
    
    this.dungeon.showMap(); 
  }

  async processEnemiesTurn() {
    if (this.isFinished || this.enemies.length === 0) return;
    const player = this.game.player;

    const currentEnemies = [...this.enemies];

    for (const enemy of currentEnemies) {
      if (enemy.hp <= 0 || !enemy.intent) continue;

      await this.wait(800);

      if (enemy.intent.type === "attack") {
        if (player.statuses["reflect"] > 0) {
          const reflectDamage = enemy.intent.value;
          enemy.hp -= reflectDamage;
          this.ui.logMessage(`[${enemy.name}] の攻撃！ しかし光の壁がすべてを反射した！`);
          this.ui.logMessage(`${enemy.name} は自身の攻撃で ${reflectDamage} のダメージを受けた！`);
          
          this.checkEnemyDeaths();
          this.ui.updateUI();
          
          if (this.isFinished) return;

        } else {
          const dmgResult = player.takeDamage(enemy.intent.value);
          let msg = `[${enemy.name}] の攻撃！ `;
          if (dmgResult.blockedAmount > 0) {
            msg += `(ブロックで ${dmgResult.blockedAmount} 軽減) `;
          }
          
          if (player.statuses["vulnerable"] > 0) {
            msg += `【弱体でダメージ増！】 `;
          }
          
          if (dmgResult.actualDamage > 0) {
            msg += `プレイヤーに ${dmgResult.actualDamage} のダメージ！`;
          } else {
            msg += `完全に防いだ！`;
          }
          this.ui.logMessage(msg);
        }
      } else if (enemy.intent.type === "defend") {
        this.ui.logMessage(`[${enemy.name}] は防御の構えをとった。`);
        
      } else if (enemy.intent.type === "debuff") {
        if (!player.statuses[enemy.intent.statusType]) {
          player.statuses[enemy.intent.statusType] = 0;
        }
        player.statuses[enemy.intent.statusType] += enemy.intent.value;
        const statusName = enemy.intent.statusType === "vulnerable" ? "弱体" : enemy.intent.statusType;
        this.ui.logMessage(`[${enemy.name}] は不気味な音波を放ち、プレイヤーに ${statusName}(${enemy.intent.value}) を与えた！`);
      }

      if (enemy.statuses["vulnerable"] > 0) {
        enemy.statuses["vulnerable"]--;
      }

      this.ui.updateUI();

      if (player.hp <= 0) {
        this.ui.logMessage("プレイヤーのHPが0になった... GAME OVER");
        this.dungeon.showResult("gameover");
        return; 
      }
    }
  }

  updateEnemyIntents() {
    this.enemies.forEach(enemy => {
      enemy.patternIndex = (enemy.patternIndex + 1) % enemy.pattern.length;
      enemy.intentText = enemy.pattern[enemy.patternIndex].intentText;
      enemy.intent = enemy.pattern[enemy.patternIndex].intent;
    });
  }

  async endTurn() {
    if (this.isFinished || this.isProcessing) return; 

    this.isProcessing = true; 
    const player = this.game.player;

    this.ui.logMessage("=== ターン終了 ===");
    this.ui.updateUI(); 

    await this.processEnemiesTurn();

    if (this.isFinished) {
      this.isProcessing = false;
      return; 
    }

    await this.wait(500);

    this.turn++;
    player.energy = player.maxEnergy; 
    player.block = 0; 

    if (player.statuses["vulnerable"] > 0) {
      player.statuses["vulnerable"]--;
    }

    if (player.statuses["reflect"] > 0) {
      player.statuses["reflect"] = 0;
    }
    
    this.updateEnemyIntents();

    this.deckManager.discardHand();
    this.deckManager.draw(5);
    
    this.ui.logMessage(`手札を捨て、新しく 5 枚補充した。`);
    this.ui.logMessage(`=== ターン ${this.turn} 開始 ===`);
    
    this.isProcessing = false; 
    this.ui.updateUI();
  }
}
