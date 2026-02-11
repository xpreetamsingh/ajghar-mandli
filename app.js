const speciesArt = {
  dragon: "🐉",
  blob: "🟣",
  fox: "🦊",
};

const shopItems = [
  { id: "snack", name: "Starlight Snack", cost: 8, desc: "+20 Hunger", effect: { hunger: 20 } },
  { id: "toy", name: "Squeaky Cloud Toy", cost: 10, desc: "+20 Happiness", effect: { happiness: 20 } },
  { id: "blanket", name: "Moon Blanket", cost: 9, desc: "+20 Energy", effect: { energy: 20 } },
  { id: "potion", name: "Spark Potion", cost: 15, desc: "+15 Health", effect: { health: 15 } },
];

const state = {
  name: "",
  species: "dragon",
  stats: { hunger: 60, happiness: 60, energy: 60, health: 70 },
  coins: 15,
  inventory: [],
  started: false,
};

const el = {
  adoptPanel: document.getElementById("adoptPanel"),
  adoptForm: document.getElementById("adoptForm"),
  petName: document.getElementById("petName"),
  species: document.getElementById("species"),
  gamePanel: document.getElementById("gamePanel"),
  shopPanel: document.getElementById("shopPanel"),
  inventoryPanel: document.getElementById("inventoryPanel"),
  petArt: document.getElementById("petArt"),
  petTitle: document.getElementById("petTitle"),
  petMood: document.getElementById("petMood"),
  coins: document.getElementById("coins"),
  hungerBar: document.getElementById("hungerBar"),
  happyBar: document.getElementById("happyBar"),
  energyBar: document.getElementById("energyBar"),
  healthBar: document.getElementById("healthBar"),
  shopGrid: document.getElementById("shopGrid"),
  inventoryList: document.getElementById("inventoryList"),
};

const clamp = (n) => Math.max(0, Math.min(100, n));

const mood = () => {
  const s = state.stats;
  const avg = (s.hunger + s.happiness + s.energy + s.health) / 4;
  if (avg >= 80) return `${state.name} is thriving! ✨`;
  if (avg >= 60) return `${state.name} is doing great.`;
  if (avg >= 40) return `${state.name} needs a little care.`;
  return `${state.name} is struggling. Help soon!`;
};

function renderInventory() {
  el.inventoryList.innerHTML = "";
  if (state.inventory.length === 0) {
    el.inventoryList.innerHTML = "<li>No items yet. Visit the shop!</li>";
    return;
  }

  state.inventory.forEach((item, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `${item.name} <button data-use="${idx}">Use</button>`;
    el.inventoryList.append(li);
  });
}

function renderShop() {
  const tpl = document.getElementById("shopItemTemplate");
  el.shopGrid.innerHTML = "";

  shopItems.forEach((item) => {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.querySelector(".name").textContent = item.name;
    node.querySelector(".desc").textContent = item.desc;
    node.querySelector(".cost").textContent = `${item.cost} coins`;
    node.querySelector(".buy").dataset.buy = item.id;
    el.shopGrid.append(node);
  });
}

function render() {
  el.petArt.textContent = speciesArt[state.species];
  el.petTitle.textContent = `${state.name} the ${state.species}`;
  el.petMood.textContent = mood();
  el.coins.textContent = state.coins;
  el.hungerBar.value = state.stats.hunger;
  el.happyBar.value = state.stats.happiness;
  el.energyBar.value = state.stats.energy;
  el.healthBar.value = state.stats.health;
  renderInventory();
}

function applyTick() {
  if (!state.started) return;
  state.stats.hunger = clamp(state.stats.hunger - 3);
  state.stats.happiness = clamp(state.stats.happiness - 2);
  state.stats.energy = clamp(state.stats.energy - 2);

  if (state.stats.hunger < 20 || state.stats.energy < 20) {
    state.stats.health = clamp(state.stats.health - 3);
  }

  render();
}

function doAction(action) {
  switch (action) {
    case "feed":
      state.stats.hunger = clamp(state.stats.hunger + 20);
      state.stats.happiness = clamp(state.stats.happiness + 6);
      break;
    case "play":
      state.stats.happiness = clamp(state.stats.happiness + 20);
      state.stats.energy = clamp(state.stats.energy - 8);
      state.stats.hunger = clamp(state.stats.hunger - 6);
      break;
    case "rest":
      state.stats.energy = clamp(state.stats.energy + 24);
      state.stats.health = clamp(state.stats.health + 6);
      break;
    case "adventure": {
      if (state.stats.energy < 20 || state.stats.hunger < 20) {
        el.petMood.textContent = `${state.name} is too tired for an adventure.`;
        return;
      }
      const reward = Math.floor(4 + Math.random() * 8);
      state.coins += reward;
      state.stats.energy = clamp(state.stats.energy - 12);
      state.stats.hunger = clamp(state.stats.hunger - 10);
      state.stats.happiness = clamp(state.stats.happiness + 8);
      el.petMood.textContent = `${state.name} found ${reward} coins on an adventure!`;      
      break;
    }
    default:
      break;
  }

  render();
}

function buyItem(id) {
  const item = shopItems.find((i) => i.id === id);
  if (!item || state.coins < item.cost) return;
  state.coins -= item.cost;
  state.inventory.push(item);
  render();
}

function useItem(index) {
  const item = state.inventory[index];
  if (!item) return;
  Object.entries(item.effect).forEach(([k, v]) => {
    state.stats[k] = clamp(state.stats[k] + v);
  });
  state.inventory.splice(index, 1);
  render();
}

el.adoptForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.name = el.petName.value.trim();
  state.species = el.species.value;
  state.started = true;
  el.adoptPanel.classList.add("hidden");
  el.gamePanel.classList.remove("hidden");
  el.shopPanel.classList.remove("hidden");
  el.inventoryPanel.classList.remove("hidden");
  renderShop();
  render();
});

document.body.addEventListener("click", (event) => {
  const action = event.target.dataset.action;
  const buy = event.target.dataset.buy;
  const use = event.target.dataset.use;

  if (action) doAction(action);
  if (buy) buyItem(buy);
  if (use !== undefined) useItem(Number(use));
});

setInterval(applyTick, 15000);
