const GAME_DATA = {
  cards: {
    strike: { 
      name: "ストライク", type: "attack", cost: 1, reward: 0, description: "敵1体に 6 ダメージを与える。",
      effects: [{ type: "damage", value: 6, target: "enemy" }]
    },
    defend: { 
      name: "防御", type: "skill", cost: 1, reward: 0,  description: "6 ブロックを得る。",
      effects: [{ type: "block", value: 6, target: "player" }]
    },
    bash: { 
      name: "強打", type: "attack", cost: 2, reward: 0, description: "6 ダメージと 弱体(2) を与える。",
      effects: [
        { type: "damage", value: 6, target: "enemy" },
        { type: "status", statusType: "vulnerable", value: 2, target: "enemy" }
      ] 
    },
    heal: {
      name: "治癒", type: "skill", cost: 1, reward: 0, description: "HPを 6 回復する。",
      effects: [{ type: "heal", value:6, target: "player" }]
    },
    iron_wave: {
      name: "アイアンウェーブ", type: "attack", cost: 1, reward: 0, description: "3 ダメージを与え、3 ブロックを得る。",
      effects: [
        { type: "damage", value: 3, target: "enemy" },
        { type: "block", value: 3, target: "player" }
      ]
    },
    cleave: {
      name: "なぎ払い", type: "attack", cost: 1, reward: 1, description: "敵全体に 3 ダメージを与える。",
      effects: [{ type: "damage_all", value: 3 }]
    },
    flash_strike: { 
      name: "閃光斬り", type: "attack", cost: 0, reward: 1, 
      isExhaust: true, 
      description: "敵1体に 3 ダメージを与える。（使用後、消滅する）",
      effects: [{ type: "damage", value: 3, target: "enemy" }]
    },
    heavy_shield: {
      name: "タワーシールド", type: "skill", cost: 2, reward: 2, description: "12 ブロックを得る。",
      effects: [{ type: "block", value: 12, target: "player" }]
    },
    shockwave: {
      name: "衝撃波", type: "attack", cost: 2, reward: 2, description: "敵全体に 3 ダメージを与え、6 ブロックを得る。",
      effects: [
        { type: "damage_all", value: 3 },
        { type: "block", value: 6, target: "player" }
      ]
    },
    quick_slash: {
      name: "クイックスラッシュ", type: "attack", cost: 2, reward: 2, description: "3 ダメージを与え、カードを 1 枚引く。",
      effects: [
        { type: "damage", value: 3, target: "enemy" },
        { type: "draw", value: 1, target: "player" }
      ]
    },
    twin_strike: {
      name: "連続斬り", type: "attack", cost: 2, reward: 2, description: "敵1体に 6 ダメージを 2 回与える。",
      effects: [
        { type: "damage", value: 6, target: "enemy" },
        { type: "damage", value: 6, target: "enemy" }
      ]
    },
    desperate_strike: {
      name: "捨て身の一撃", type: "attack", cost: 0, reward: 2,
      description: "敵1体に 12 ダメージを与え、自分も 12 ダメージを受ける。",
      effects: [
        { type: "damage", value: 12, target: "enemy" },
        { type: "damage", value: 12, target: "player" }
      ]
    },
    planning: {
      name: "計画", type: "skill", cost: 1, reward: 2,
      description: "手札をランダムに 1 枚捨てる。その後、カードを 2 枚引く。",
      effects: [
        { type: "discard", value: 1 },
        { type: "draw", value: 2, target: "player" }
      ]
    },
    mirror_shield: {
      name: "ミラーシールド", type: "skill", cost: 3, reward: 2,
      description: "このターン、受けるはずだった攻撃ダメージを無効化し、そのまま攻撃者に跳ね返す。",
      effects: [{ type: "status", statusType: "reflect", value: 1, target: "player" }]
    }
  },

  // アーティファクトのデータ
  artifacts: {
    life_drop: { 
      name: "生命の雫", description: "最大HPが 20 増加する。",
      onEquip: (player) => { player.maxHp += 20; },
      onUnequip: (player) => { player.maxHp -= 20; if (player.hp > player.maxHp) player.hp = player.maxHp; }
    },
    ancient_relic: { 
      name: "古代の遺物", description: "最大エナジーが 1 増加するが、最大HPが 10 減少する。",
      onEquip: (player) => { 
        player.maxEnergy += 1; player.energy += 1;
        player.maxHp -= 10; if (player.hp > player.maxHp) player.hp = player.maxHp;
      },
      onUnequip: (player) => { 
        player.maxEnergy -= 1; if (player.energy > player.maxEnergy) player.energy = player.maxEnergy;
        player.maxHp += 10; 
      }
    },
    guardian_shield: { 
      name: "守護者の盾", description: "各戦闘の開始時に 6 ブロックを得る。",
      onCombatStart: (player) => { player.block += 6; } // 戦闘開始時の効果
    }
  },

  enemyTemplates: {
    slime: { 
      name: "スライム", level: 1,  cost: 1, maxHp: 36, 
      pattern: [
        { intentText: "攻撃 (6ダメージ)", intent: { type: "attack", value: 6 } },
        { intentText: "防御 (6ブロック)", intent: { type: "defend", value: 6 } },
        { intentText: "強攻撃 (12ダメージ)", intent: { type: "attack", value: 12 } }
      ]
    },
    orc: { 
      name: "オーク", level: 1,  cost: 1, maxHp: 24, 
      pattern: [
        { intentText: "防御 (3ブロック)", intent: { type: "defend", value: 3 } },
        { intentText: "攻撃 (9ダメージ)", intent: { type: "attack", value: 9 } }
      ]
    },
    goblin: {
      name: "ゴブリン", level: 1,  cost: 2, maxHp: 36,
      pattern: [
        { intentText: "斬りつけ (9ダメージ)", intent: { type: "attack", value: 9 } },
        { intentText: "警戒 (9ブロック)", intent: { type: "defend", value: 9 } },
        { intentText: "強斬り (12ダメージ)", intent: { type: "attack", value: 12 } }
      ]
    },
    vampire_bat: {
      name: "吸血コウモリ", level: 1,  cost: 1, maxHp: 18,
      pattern: [
        { intentText: "超音波 (弱体2)", intent: { type: "debuff", statusType: "vulnerable", value: 2 } },
        { intentText: "吸血攻撃 (4ダメージ)", intent: { type: "attack", value: 4 } }
      ]
    },
    boss_slime: { 
      name: "ボススライム", level: 1,  cost: 11, maxHp: 110, 
      pattern: [
        { intentText: "巨大プレス (12ダメージ)", intent: { type: "attack", value: 12 } },
        { intentText: "硬化 (12ブロック)", intent: { type: "defend", value: 12 } },
        { intentText: "連続攻撃 (24ダメージ)", intent: { type: "attack", value: 24 } }
      ]
    },
    golem: {
      name: "ストーンゴーレム", level: 2,  cost: 2, maxHp: 48,
      pattern: [
        { intentText: "ためる (12ブロック)", intent: { type: "defend", value: 12 } },
        { intentText: "強打 (16ダメージ)", intent: { type: "attack", value: 16 } }
      ]
    },
    fire_bat: {
      name: "ファイアバット", level: 2,  cost: 1, maxHp: 24,
      pattern: [
        { intentText: "突進 (6ダメージ)", intent: { type: "attack", value: 6 } },
        { intentText: "超音波 (弱体3)", intent: { type: "debuff", statusType: "vulnerable", value: 3 } }
      ]
    },
    boss_dragon: {
      name: "レッドドラゴン", level: 2,  cost: 12, maxHp: 120,
      pattern: [
        { intentText: "強打 (18ダメージ)", intent: { type: "attack", value: 18 } }, 
        { intentText: "ブレス準備 (12ブロック)", intent: { type: "defend", value: 12 } },
        { intentText: "咆哮 (弱体3)", intent: { type: "debuff", statusType: "vulnerable", value: 3 } },
        { intentText: "ヘルファイア (36ダメージ)", intent: { type: "attack", value: 36 } }
      ]
    }
  },

  floors: [
    // --- 第1章 ---
    { type: "combat", cost: 1, name: "戦闘" }, // 1
    { type: "combat", cost: 2, name: "戦闘" }, // 2
    { type: "event", eventId: "spring", name: "清らかな泉" }, // 3
    { type: "combat", cost: 2, name: "戦闘" }, // 4
    { type: "combat", cost: 3, name: "戦闘" }, // 5
    { type: "combat", cost: 3, name: "戦闘" }, // 6
    { type: "camp", name: "決戦前の休息" }, // 7
    { type: "combat", cost: 11, name: "塔の主", isBoss: true }, // 8

    // --- 第2章 ---
    { type: "camp", name: "溶岩地帯のキャンプ" }, // 9
    { type: "combat", cost: 2, name: "動く石像" }, // 10
    { type: "combat", cost: 3, name: "熱を帯びた魔物たち" }, // 11
    { type: "event", eventId: "spring", name: "怪しげな泉" }, // 12
    { type: "combat", cost: 4, name: "異種族の混成部隊" }, // 13
    { type: "combat", cost: 4, name: "異種族の混成部隊" }, // 14
    { type: "camp", name: "決戦前の休息" }, // 15
    { type: "combat", cost: 12, name: "炎の支配者", isBoss: true } // 16
  ]
};
