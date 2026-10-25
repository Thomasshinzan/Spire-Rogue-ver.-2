class DeckScene {
  constructor(game) {
    this.game = game; 

    document.getElementById("nav-starter-deck-btn")?.addEventListener("click", () => this.showStarterDeck());
    document.getElementById("nav-card-pool-btn")?.addEventListener("click", () => this.showCardPool());
    
    document.getElementById("back-to-hub-from-deck-btn")?.addEventListener("click", () => this.show());
    document.getElementById("back-to-hub-from-pool-btn")?.addEventListener("click", () => this.show());
  }

  show() {
    this.game.switchScene("scene-deck-hub");
  }

  showStarterDeck() {
    this.game.switchScene("scene-starter-deck");
    this.renderDeckList();
  }

  renderDeckList() {
    const container = document.getElementById("deck-list");
    const countSpan = document.getElementById("deck-count");
    if (!container || !countSpan) return;

    container.innerHTML = "";
    
    const player = this.game.player;
    const totalCards = player.deck.length;
    countSpan.textContent = totalCards;

    const cardCounts = {};
    player.deck.forEach(cardId => {
      cardCounts[cardId] = (cardCounts[cardId] || 0) + 1;
    });

    const allCards = Object.values(this.game.data.cards);
    
    const displayCards = allCards.filter(card => {
      if (!card.reward || card.reward === 0) return true;
      return cardCounts[card.id] && cardCounts[card.id] > 0;
    });

    displayCards.forEach(card => {
      const cardId = card.id;
      const count = cardCounts[cardId] || 0;
      const percentage = totalCards > 0 ? Math.round((count / totalCards) * 100) : 0;

      const cardEl = document.createElement("div");
      cardEl.className = "list-card";
      
      const isReward = card.reward > 0;
      const addBtnStyle = isReward ? "visibility: hidden;" : "background-color: #338833;";
      
      cardEl.innerHTML = `
        <div class="card-info">
          <span class="card-name">
            ${card.name} (コ:${card.cost}) 
            <span style="color:#ffcc55; margin-left:6px; font-size:0.95em;">x${count} [${percentage}%]</span>
          </span>
          <span class="card-desc">${card.description}</span>
        </div>
        <div style="display: flex; gap: 6px; flex-shrink: 0;">
          <div class="card-action action-add" style="padding: 8px 16px; ${addBtnStyle}">＋</div>
          <div class="card-action action-remove" style="padding: 8px 16px; background-color: #883333; opacity: ${count > 0 ? 1 : 0.3};">－</div>
        </div>
      `;
      
      if (!isReward) {
        cardEl.querySelector(".action-add").addEventListener("click", () => {
          this.addCard(cardId);
        });
      }
      
      cardEl.querySelector(".action-remove").addEventListener("click", async () => {
        if (count > 0) {
          if (isReward) {
            const confirmed = await this.game.showConfirm(`本当に「${card.name}」を捨てますか？\n（ダンジョンで入手したカードは一度捨てると元に戻せません）`);
            if (confirmed) {
              await this.removeCard(cardId);
            }
          } else {
            await this.removeCard(cardId);
          }
        }
      });

      container.appendChild(cardEl);
    });
  }

  showCardPool() {
    this.game.switchScene("scene-card-pool");
    this.renderPoolList();
  }

  renderPoolList() {
    const container = document.getElementById("pool-list");
    if (!container) return;
    if (container.children.length > 0) return;

    const allCardIds = Object.keys(this.game.data.cards);

    allCardIds.forEach(cardId => {
      const card = this.game.data.cards[cardId];
      const cardEl = document.createElement("div");
      cardEl.className = "list-card";
      
      cardEl.innerHTML = `
        <div class="card-info" style="width: 100%;">
          <span class="card-name" style="color: #44aa44; font-size: 1.1em;">
            ${card.name} <span style="color:#55aaff; font-size:0.85em; margin-left:8px;">コスト: ${card.cost}</span>
          </span>
          <span class="card-desc" style="margin-top: 6px;">${card.description}</span>
        </div>
      `;

      container.appendChild(cardEl);
    });
  }

  async removeCard(cardId) {
    const player = this.game.player;
    if (player.deck.length <= 1) {
      await this.game.showAlert("デッキのカードは最低1枚必要です！");
      return;
    }
    
    const index = player.deck.indexOf(cardId);
    if (index !== -1) {
      player.deck.splice(index, 1);
    }
    this.renderDeckList();
  }

  addCard(cardId) {
    const player = this.game.player;
    player.deck.push(cardId);
    this.renderDeckList();
  }
}
