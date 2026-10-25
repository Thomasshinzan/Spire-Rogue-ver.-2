class DungeonScene {
  constructor(game) {
    this.game = game;
    this.currentEventId = null;

    this.combatManager = new CombatManager(game, this);

    document.getElementById("map-proceed-btn")?.addEventListener("click", () => this.proceedFromMap());
    document.getElementById("camp-rest-btn")?.addEventListener("click", () => this.restAtCamp());
    document.getElementById("camp-deck-btn")?.addEventListener("click", () => this.game.deckScene.show());
    document.getElementById("camp-artifact-btn")?.addEventListener("click", () => this.game.showArtifactsScene(true));
    document.getElementById("event-action-btn")?.addEventListener("click", () => this.handleEventAction());
    document.getElementById("event-leave-btn")?.addEventListener("click", () => this.leaveEvent());
  }

  updateUI() {
    this.combatManager.ui.updateUI();
  }

  returnFromArtifacts() {
    this.combatManager.returnFromArtifacts();
  }

  showMap() {
    this.game.saveData(); 
    this.game.switchScene("scene-map");
    const floorData = this.game.data.floors[this.game.currentFloor - 1];
    
    const mapInfo = document.getElementById("map-info");
    const mapDesc = document.getElementById("map-desc");
    const proceedBtn = document.getElementById("map-proceed-btn");
    
    if (mapInfo) {
      mapInfo.textContent = `[第${this.game.currentFloor}階層] ${floorData.name} (HP: ${this.game.player.hp}/${this.game.player.maxHp})`;
    }
    
    if (floorData.type === "combat") {
      mapDesc.textContent = "敵の気配がする...";
      proceedBtn.textContent = "戦闘開始";
    } else if (floorData.type === "camp") {
      mapDesc.textContent = "魔物がいない安全な場所のようだ。";
      proceedBtn.textContent = "キャンプ地へ";
    } else if (floorData.type === "event") {
      mapDesc.textContent = "何か不思議なものが待ち受けている...";
      proceedBtn.textContent = "近づく";
    }
  }

  proceedFromMap() {
    const floorData = this.game.data.floors[this.game.currentFloor - 1];
    if (floorData.type === "combat") {
      this.combatManager.startCombat(floorData);
    } else if (floorData.type === "camp") {
      this.showCamp();
    } else if (floorData.type === "event") {
      this.showEvent(floorData.eventId);
    }
  }

  showCamp() {
    this.game.switchScene("scene-camp");
  }

  async restAtCamp() {
    const healAmount = Math.floor(this.game.player.maxHp * 0.3);
    this.game.player.hp = Math.min(this.game.player.maxHp, this.game.player.hp + healAmount);
    await this.game.showAlert(`焚き火で休息し、HPが ${healAmount} 回復した！`);
    
    this.game.currentFloor++;
    this.showMap(); 
  }

  showEvent(eventId) {
    this.game.switchScene("scene-event");
    const title = document.getElementById("event-title");
    const desc = document.getElementById("event-desc");
    const actionBtn = document.getElementById("event-action-btn");
    const leaveBtn = document.getElementById("event-leave-btn");

    this.currentEventId = eventId;

    if (eventId === "spring") {
      title.textContent = "清らかな泉";
      desc.innerHTML = "美しく澄んだ泉が湧き出ている。<br>一口飲めば、何かが起こるかもしれない...";
      actionBtn.textContent = "水を飲む";
      leaveBtn.textContent = "立ち去る";
    }
  }

  async handleEventAction() {
    if (this.currentEventId === "spring") {
      // ★ アクション実行前に確認ダイアログを挟む（キャンセル可能）
      const confirmed = await this.game.showConfirm("泉の水を飲みますか？\n(HP回復、最大HP増加、またはダメージの可能性があります)");
      if (!confirmed) return;

      const rand = Math.random();
      if (rand < 0.4) {
        this.game.player.hp = this.game.player.maxHp;
        await this.game.showAlert("泉の水は甘く、傷が完全に癒えた！\n(HP全回復)");
      } else if (rand < 0.8) {
        this.game.player.maxHp += 5;
        this.game.player.hp += 5;
        await this.game.showAlert("身体の底から不思議な力が湧いてくる！\n(最大HP+5)");
      } else {
        this.game.player.hp -= 10;
        await this.game.showAlert("水は冷たく濁っていた...毒だ！\n(10ダメージ)");
      }
      
      if (this.game.player.hp <= 0) {
        this.showResult("gameover");
      } else {
        this.game.currentFloor++;
        this.showMap();
      }
    }
  }

  async leaveEvent() {
    // ★ 立ち去る際も確認を入れる
    const confirmed = await this.game.showConfirm("何もせずに立ち去りますか？");
    if (!confirmed) return;

    this.game.currentFloor++;
    this.showMap();
  }

  showResult(type) {
    this.combatManager.isFinished = true; 
    const modal = document.getElementById("result-modal");
    const title = document.getElementById("result-title");
    const message = document.getElementById("result-message");

    if (type === "victory") {
      title.textContent = "VICTORY!";
      title.className = "victory-title";
      message.innerHTML = "全階層を踏破しました！<br>おめでとうございます！";
    } else if (type === "gameover") {
      title.textContent = "GAME OVER";
      title.className = "gameover-title";
      message.innerHTML = "あなたは倒れました...<br>塔の登頂に失敗しました。";
    }

    modal.classList.remove("hidden");
  }
}
