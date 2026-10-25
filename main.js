class ArtifactScene {
  constructor(game) {
    this.game = game;
    this.selectedId = null;
    document.getElementById("back-to-combat-from-artifacts-btn")?.addEventListener("click", () => {
      if (this.game.returnSceneId) {
        this.game.switchScene(this.game.returnSceneId);
        if (this.game.returnSceneId === "scene-combat") this.game.dungeonScene.updateUI();
      } else {
        this.game.dungeonScene.returnFromArtifacts();
      }
    });
  }

  show() {
    this.game.switchScene("scene-artifacts");
    this.selectedId = null;
    this.render();
  }

  render() {
    const listContainer = document.getElementById("artifact-list");
    if(!listContainer) return;

    listContainer.innerHTML = "";
    const player = this.game.player;

    if (player.artifacts.length === 0) {
      listContainer.innerHTML = `<p style="color:#aaa; padding:10px;">所持しているアーティファクトはありません。</p>`;
    } else {
      player.artifacts.forEach(id => {
        const data = this.game.data.artifacts[id];
        if(!data) return;

        const isEquipped = player.equippedArtifacts.includes(id);
        const itemEl = document.createElement("div");
        itemEl.className = "list-card";
        itemEl.innerHTML = `
          <div class="card-info" style="width:100%;">
            <span class="card-name" style="color:${isEquipped ? '#ffcc55' : '#e0e0e0'}; font-size: 1.1em;">
              ${isEquipped ? '★ ' : ''}${data.name}
            </span>
          </div>
        `;

        itemEl.addEventListener("click", () => {
          this.selectedId = id;
          this.renderDetail();
        });

        listContainer.appendChild(itemEl);
      });
    }

    this.renderDetail();
  }

  renderDetail() {
    const detailContainer = document.getElementById("artifact-detail");
    if (!detailContainer) return;

    if (!this.selectedId) {
      detailContainer.innerHTML = `<p style="color:#aaa;">リストから選択してください</p>`;
      return;
    }

    const data = this.game.data.artifacts[this.selectedId];
    const isEquipped = this.game.player.equippedArtifacts.includes(this.selectedId);

    detailContainer.innerHTML = `
      <h3 style="color:#ffaa55; margin-bottom:12px; font-size:1.4em;">${data.name}</h3>
      <p style="color:#ccc; font-size:1em; margin-bottom:24px; line-height:1.4;">${data.description}</p>
      <button id="toggle-equip-btn" style="padding: 12px 24px; font-size:1.1em; font-weight:bold; border:none; border-radius:8px; width:100%; cursor:pointer; color:white; background-color:${isEquipped ? '#883333' : '#44aa44'};">
        ${isEquipped ? '装備を外す' : '装備する'}
      </button>
    `;

    document.getElementById("toggle-equip-btn").addEventListener("click", () => {
      this.game.player.toggleArtifact(this.selectedId);
      this.render(); 
      this.game.saveData(); 
    });
  }
}

class Game {
  constructor(data) {
    this.data = data;
    
    if (this.data.cards) {
      Object.keys(this.data.cards).forEach(key => this.data.cards[key].id = key);
    }
    if (this.data.artifacts) {
      Object.keys(this.data.artifacts).forEach(key => this.data.artifacts[key].id = key);
    }
    if (this.data.enemyTemplates) {
      Object.keys(this.data.enemyTemplates).forEach(key => this.data.enemyTemplates[key].id = key);
    }

    this.maxFloor = data.floors.length;
    this.currentSlot = null; 
    
    // グローバルデータ管理を廃止し、スロットごとに管理
    this.maxUnlockedChapter = 1;
    
    this.deckScene = new DeckScene(this);
    this.dungeonScene = new DungeonScene(this);
    this.artifactScene = new ArtifactScene(this);

    const titleContent = document.querySelector("#scene-title .title-content");
    if (titleContent && !document.getElementById("nav-deck-build-btn")) {
      const deckBtn = document.createElement("button");
      deckBtn.id = "nav-deck-build-btn";
      deckBtn.className = "main-btn";
      deckBtn.style.backgroundColor = "#4466aa";
      deckBtn.textContent = "カード図鑑・デッキ確認";
      titleContent.appendChild(deckBtn);
    }

    document.getElementById("nav-deck-build-btn")?.addEventListener("click", () => {
      this.deckScene.show();
    });

    document.getElementById("nav-start-game-btn")?.addEventListener("click", () => {
      this.showSaveSlotsScene();
    });

    document.getElementById("back-to-title-from-slots-btn")?.addEventListener("click", () => {
      this.showTitleScene();
    });

    document.getElementById("back-to-slots-from-chapter-btn")?.addEventListener("click", () => {
      this.showSaveSlotsScene();
    });

    document.getElementById("back-to-title-from-hub-btn")?.addEventListener("click", () => {
      this.saveData(); 
      if (this.returnSceneId) {
        this.switchScene(this.returnSceneId);
      } else {
        this.showTitleScene();
      }
    });
    
    document.getElementById("restart-btn")?.addEventListener("click", () => this.restart());

    this.initGame();
  }

  unlockChapter(chapter) {
    if (chapter > this.maxUnlockedChapter) {
      this.maxUnlockedChapter = chapter;
      this.saveData(); // 現在のスロットに解放状況を保存
    }
  }

  showSaveSlotsScene() {
    this.switchScene("scene-save-slots");
    const container = document.getElementById("save-slots-container");
    if (!container) return;
    container.innerHTML = "";

    for (let i = 1; i <= 3; i++) {
      const saveJson = localStorage.getItem(`spireRogueSave_slot${i}`);
      const slotEl = document.createElement("div");
      slotEl.className = "save-slot";

      if (saveJson) {
        let floorStr = "不明";
        let hpStr = "0/0";
                try {
          const saveData = JSON.parse(saveJson);
          hpStr = `${saveData.player.hp}/${saveData.player.maxHp}`;
          
          // 章の開始直後（第9、第17階層など）または全クリア状態の表記を「第◯章までクリア」に変更
          if (saveData.currentFloor > 1 && (saveData.currentFloor - 1) % 8 === 0) {
            const clearedChapter = (saveData.currentFloor - 1) / 8;
            floorStr = `第${clearedChapter}章までクリア`;
          } else if (saveData.currentFloor > this.maxFloor) {
            const clearedChapter = Math.floor((saveData.currentFloor - 1) / 8);
            floorStr = `第${clearedChapter}章までクリア`;
          } else {
            floorStr = `第${saveData.currentFloor}階層`;
          }
        } catch(e) {}

        slotEl.classList.add("active");
        
        slotEl.innerHTML = `
          <div class="save-slot-info">スロット ${i} - ${floorStr}</div>
          <div class="save-slot-info" style="font-size: 0.9em; color:#aaa;">HP: ${hpStr}</div>
          <div class="save-slot-actions">
            <button class="slot-btn btn-load">ロード</button>
            <button class="slot-btn btn-delete">削除</button>
          </div>
        `;
        
        slotEl.querySelector(".btn-load").addEventListener("click", async () => {
          this.currentSlot = i;
          this.loadData(i);
          await this.showAlert(`スロット ${i} のデータを読み込みました！`);
          
          // ロードしたデータが章の開始直後なら、章選択画面（引き継ぎ）へ
          if (this.currentFloor > this.maxFloor || (this.currentFloor - 1) % 8 === 0) {
            this.showChapterSelectScene(true); 
          } else {
            // 章の途中の場合はそのまま再開
            this.dungeonScene.showMap(); 
          }
        });
        
        slotEl.querySelector(".btn-delete").addEventListener("click", async () => {
          const confirmed = await this.showConfirm(`スロット ${i} のデータを削除しますか？\n(この操作は取り消せません)`);
          if (confirmed) {
            localStorage.removeItem(`spireRogueSave_slot${i}`);
            this.showSaveSlotsScene(); 
          }
        });
      } else {
        slotEl.innerHTML = `
          <div class="save-slot-info" style="color:#777;">スロット ${i} - 空きデータ</div>
          <div class="save-slot-actions">
            <button class="slot-btn btn-new">新しく始める</button>
          </div>
        `;
        slotEl.querySelector(".btn-new").addEventListener("click", () => {
          this.currentSlot = i;
          this.maxUnlockedChapter = 1; // 進行度をリセット
          this.startGameFromChapter(1, false); // 章選択を出さず直接第1章からスタート
        });
      }
      container.appendChild(slotEl);
    }
  }

  showChapterSelectScene(isCarryOver = false) {
    this.switchScene("scene-chapter-select");
    const container = document.getElementById("chapter-select-container");
    if (!container) return;
    container.innerHTML = "";

    const maxChapters = Math.ceil(this.maxFloor / 8);

    for (let c = 1; c <= maxChapters; c++) {
      // 選択したセーブスロットが到達したことのある章まで解放
      const isUnlocked = c <= this.maxUnlockedChapter;
      const btn = document.createElement("button");
      btn.className = `chapter-btn ${isUnlocked ? 'unlocked' : ''}`;
      
      btn.textContent = `第${c}章から開始`;
      
      if (!isUnlocked) {
        btn.disabled = true;
        btn.textContent += " (未解放)";
      } else {
        btn.addEventListener("click", async () => {
          const actionText = isCarryOver ? "現在のデータを引き継いで" : "新しく";
          const confirmed = await this.showConfirm(`第${c}章から${actionText}開始しますか？`);
          if (confirmed) {
            this.startGameFromChapter(c, isCarryOver);
          }
        });
      }
      container.appendChild(btn);
    }
  }

  startGameFromChapter(chapter, isCarryOver) {
    if (!isCarryOver) {
      this.player = new Player();
    } else {
      // 周回開始時（引き継ぎ時）はHPを全回復
      this.player.hp = this.player.maxHp;
    }
    
    this.currentFloor = (chapter - 1) * 8 + 1;
    this.saveData(); 
    this.dungeonScene.showMap();
  }

  showAlert(message) {
    return new Promise(resolve => {
      const dialog = document.getElementById("custom-dialog");
      const msgEl = document.getElementById("dialog-message");
      let okBtn = document.getElementById("dialog-ok-btn");
      const cancelBtn = document.getElementById("dialog-cancel-btn");

      const newOkBtn = okBtn.cloneNode(true);
      okBtn.parentNode.replaceChild(newOkBtn, okBtn);
      okBtn = newOkBtn;

      msgEl.innerHTML = message.replace(/\n/g, '<br>');
      cancelBtn.classList.add("hidden");
      dialog.classList.remove("hidden");

      okBtn.addEventListener("click", () => {
        dialog.classList.add("hidden");
        resolve(true);
      }, { once: true });
    });
  }

  showConfirm(message) {
    return new Promise(resolve => {
      const dialog = document.getElementById("custom-dialog");
      const msgEl = document.getElementById("dialog-message");
      let okBtn = document.getElementById("dialog-ok-btn");
      let cancelBtn = document.getElementById("dialog-cancel-btn");

      const newOkBtn = okBtn.cloneNode(true);
      okBtn.parentNode.replaceChild(newOkBtn, okBtn);
      okBtn = newOkBtn;

      const newCancelBtn = cancelBtn.cloneNode(true);
      cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
      cancelBtn = newCancelBtn;

      msgEl.innerHTML = message.replace(/\n/g, '<br>');
      cancelBtn.classList.remove("hidden");
      dialog.classList.remove("hidden");

      okBtn.addEventListener("click", () => {
        dialog.classList.add("hidden");
        resolve(true);
      }, { once: true });

      cancelBtn.addEventListener("click", () => {
        dialog.classList.add("hidden");
        resolve(false);
      }, { once: true });
    });
  }

  saveData() {
    if (!this.currentSlot) return; 
    const saveData = {
      currentFloor: this.currentFloor,
      maxUnlockedChapter: this.maxUnlockedChapter, // スロットに進行度を持たせる
      player: this.player.exportData()
    };
    localStorage.setItem(`spireRogueSave_slot${this.currentSlot}`, JSON.stringify(saveData));
  }

  loadData(slotIndex) {
    const saveJson = localStorage.getItem(`spireRogueSave_slot${slotIndex}`);
    if (saveJson) {
      try {
        const saveData = JSON.parse(saveJson);
        this.currentFloor = saveData.currentFloor || 1;
        // 古いデータには maxUnlockedChapter がないため、到達階層から計算して補完
        this.maxUnlockedChapter = saveData.maxUnlockedChapter || Math.ceil(this.currentFloor / 8);
        this.player.importData(saveData.player);
      } catch (e) {
        console.error("セーブデータの読み込みに失敗しました:", e);
      }
    }
  }

  switchScene(sceneId) {
    const currentScene = document.querySelector(".scene:not(.hidden)");
    if (currentScene && ["scene-title", "scene-map", "scene-combat", "scene-camp"].includes(currentScene.id)) {
      this.returnSceneId = currentScene.id;
    }

    document.querySelectorAll(".scene").forEach(scene => {
      scene.classList.add("hidden");
    });
    document.getElementById(sceneId).classList.remove("hidden");
  }

  initGame() {
    this.player = new Player();
    this.currentFloor = 1;
    this.maxUnlockedChapter = 1; // 初期化
    this.currentSlot = null; 

    const modal = document.getElementById("result-modal");
    if (modal) modal.classList.add("hidden");

    this.showTitleScene();
  }

  restart() {
    const modal = document.getElementById("result-modal");
    if (modal) modal.classList.add("hidden");
    this.showTitleScene();
  }

  showTitleScene() {
    this.switchScene("scene-title");
  }

  showArtifactsScene() {
    this.artifactScene.show();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof GAME_DATA === 'undefined') {
    console.error("エラー: GAME_DATA が定義されていません。");
    document.body.innerHTML = '<h2 style="color:red; text-align:center; padding:20px;">データの読み込みに失敗しました。</h2>';
    return;
  }
  const game = new Game(GAME_DATA);
});
