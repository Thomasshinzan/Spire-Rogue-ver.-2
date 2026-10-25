const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class Player {
  constructor() {
    // デフォルトの初期ステータスとデッキ
    this.maxHp = 80;
    this.hp = 80;
    this.maxEnergy = 3;
    this.energy = 3;
    this.block = 0;
    
    this.deck = [
      "strike", "strike", "strike", "strike",
      "defend", "defend", "defend", "defend", 
      "bash", "heal", "iron_wave"
    ]; 
    
    this.statuses = {};
    this.artifacts = [];
    this.equippedArtifacts = [];
  }

  exportData() {
    return {
      hp: this.hp,
      maxHp: this.maxHp,
      energy: this.energy,
      maxEnergy: this.maxEnergy,
      deck: [...this.deck],
      artifacts: [...this.artifacts],
      equippedArtifacts: [...this.equippedArtifacts]
    };
  }

  importData(savedData) {
    if (!savedData) return;
    this.hp = savedData.hp;
    this.maxHp = savedData.maxHp;
    this.energy = savedData.energy;
    this.maxEnergy = savedData.maxEnergy;
    this.deck = [...savedData.deck];
    this.artifacts = [...(savedData.artifacts || [])];
    this.equippedArtifacts = [...(savedData.equippedArtifacts || [])];
  }

  addArtifact(artifactId) {
    if (!this.artifacts.includes(artifactId)) {
      this.artifacts.push(artifactId);
      
      // 取得時の効果（onAcquire）があれば発動
      const artifactData = GAME_DATA.artifacts[artifactId];
      if (artifactData && artifactData.onAcquire) {
        artifactData.onAcquire(this);
      }
      
      this.toggleArtifact(artifactId);
    }
  }

  toggleArtifact(artifactId) {
    const artifactData = GAME_DATA.artifacts[artifactId];
    if (!artifactData) return;

    if (this.equippedArtifacts.includes(artifactId)) {
      this.equippedArtifacts = this.equippedArtifacts.filter(id => id !== artifactId);
      
      // 外した時の効果（onUnequip）があれば発動
      if (artifactData.onUnequip) {
        artifactData.onUnequip(this);
      }
    } else {
      this.equippedArtifacts.push(artifactId);
      
      // 装備した時の効果（onEquip）があれば発動
      if (artifactData.onEquip) {
        artifactData.onEquip(this);
      }
    }
  }

  takeDamage(amount) {
    let actualDamage = 0;
    let blockedAmount = 0;

    if (this.statuses["vulnerable"] > 0) {
      amount = Math.floor(amount * 1.5);
    }

    if (this.block >= amount) {
      blockedAmount = amount;
      this.block -= amount;
    } else {
      blockedAmount = this.block;
      actualDamage = amount - this.block;
      this.block = 0;
      this.hp -= actualDamage;
    }
    return { actualDamage, blockedAmount };
  }
}

class DeckManager {
  constructor(initialDeckIds, cardData) {
    // 存在しないカードIDがセーブデータに混入していた場合は弾く
    this.drawPile = initialDeckIds
      .filter(id => cardData[id])
      .map(id => ({ ...cardData[id] }));
    this.hand = [];
    this.discardPile = [];
  }
  
  draw(count) {
    for (let i = 0; i < count; i++) {
      if (this.drawPile.length === 0) {
        if (this.discardPile.length === 0) break;
        this.shuffle();
      }
      
      // ★ 配列からカードを抜く際、データが空(undefined)なら手札に入れない
      const drawnCard = this.drawPile.shift();
      if (drawnCard) {
        this.hand.push(drawnCard);
      }
    }
  }

  discardHand() {
    while (this.hand.length > 0) {
      const card = this.hand.pop();
      if (card) this.discardPile.push(card);
    }
  }

  shuffle() {
    // 確実に有効なカードだけを結合してシャッフルする
    this.drawPile = this.drawPile.concat(this.discardPile).filter(card => card !== undefined);
    this.discardPile = [];
    
    for (let i = this.drawPile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = this.drawPile[i];
      this.drawPile[i] = this.drawPile[j];
      this.drawPile[j] = temp;
    }
  }

  moveToDiscard(handIndex) {
    const playedCard = this.hand.splice(handIndex, 1)[0];
    if (playedCard) this.discardPile.push(playedCard);
  }

  exhaust(handIndex) {
    this.hand.splice(handIndex, 1);
  }
}

