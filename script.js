/* TimeManager — script.js
   - Persistência via localStorage
   - Timer, tarefas, finanças
   - Gráficos com Chart.js (pie editável + bar automático)
*/

const App = {
  state: {
    tasks: JSON.parse(localStorage.getItem("tm_tasks") || "[]"),
    logs: JSON.parse(localStorage.getItem("tm_logs") || "[]"),
    txns: JSON.parse(localStorage.getItem("tm_txns") || "[]"),
    categories: JSON.parse(localStorage.getItem("tm_cats") || "[]"), // [{name, value}]
    balance: parseFloat(localStorage.getItem("tm_balance") || "0"),
    timer: { running: false, seconds: 0, interval: null }
  },

  // -------------------------
  // Helpers
  // -------------------------
  save() {
    localStorage.setItem("tm_tasks", JSON.stringify(this.state.tasks));
    localStorage.setItem("tm_logs", JSON.stringify(this.state.logs));
    localStorage.setItem("tm_txns", JSON.stringify(this.state.txns));
    localStorage.setItem("tm_cats", JSON.stringify(this.state.categories));
    localStorage.setItem("tm_balance", this.state.balance);
  },

  money(v) {
    const n = Number(v || 0);
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  },

  // -------------------------
  // Init
  // -------------------------
  init() {
    this.cache();
    this.bindTabs();
    this.bindEvents();
    this.renderAll();
    this.initCharts();
    this.startDailyUpdate(); // Verifica diariamente se mudou de mês
  },

  startDailyUpdate() {
    // Armazena a data de hoje para comparação
    let lastCheckedDate = localStorage.getItem("tm_last_checked_date") || new Date().toISOString().slice(0, 10);
    
    // Verifica a cada 60 segundos se mudou de mês
    setInterval(() => {
      const today = new Date().toISOString().slice(0, 10);
      const lastMonth = lastCheckedDate.slice(0, 7); // YYYY-MM
      const currentMonth = today.slice(0, 7); // YYYY-MM
      
      if (lastMonth !== currentMonth) {
        // Mudou de mês — atualiza o gráfico
        console.log("📅 Mudança de mês detectada! Atualizando gráficos...");
        this.updateBarChart();
        lastCheckedDate = today;
        localStorage.setItem("tm_last_checked_date", today);
      }
    }, 60000); // Verifica a cada 1 minuto
  },

  cache() {
    this.dom = {
      tabs: document.querySelectorAll(".nav-btn"),
      sections: document.querySelectorAll(".tab"),
      // dashboard
      todayTime: document.getElementById("today-time"),
      activeTasks: document.getElementById("active-tasks"),
      balance: document.getElementById("balance"),
      recentTasks: document.getElementById("recent-tasks"),
      // tasks
      taskForm: document.getElementById("task-form"),
      taskTitle: document.getElementById("task-title"),
      taskPriority: document.getElementById("task-priority"),
      taskList: document.getElementById("task-list"),
      // timer
      timerDisplay: document.getElementById("timer-display"),
      timerStart: document.getElementById("timer-start"),
      timerPause: document.getElementById("timer-pause"),
      timerStop: document.getElementById("timer-stop"),
      timerTaskSelect: document.getElementById("timer-task-select"),
      timeLog: document.getElementById("time-log"),
      // finance
      initialBalance: document.getElementById("initial-balance"),
      setBalanceBtn: document.getElementById("set-balance-btn"),
      txnForm: document.getElementById("txn-form"),
      txnDesc: document.getElementById("txn-desc"),
      txnAmount: document.getElementById("txn-amount"),
      txnCat: document.getElementById("txn-cat"),
      txnList: document.getElementById("txn-list"),
      financeBalance: document.getElementById("finance-balance"),
      financeIncome: document.getElementById("finance-income"),
      financeExpense: document.getElementById("finance-expense"),
      // reports / categories
      pieCanvas: document.getElementById("pie-chart"),
      barCanvas: document.getElementById("bar-chart"),
      catForm: document.getElementById("cat-form"),
      catName: document.getElementById("cat-name"),
      catValue: document.getElementById("cat-value"),
      catList: document.getElementById("cat-list"),
      catClear: document.getElementById("cat-clear")
    };
  },

  bindTabs() {
    this.dom.tabs.forEach(btn => {
      btn.addEventListener("click", () => {
        this.dom.tabs.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const tab = btn.dataset.tab;
        this.dom.sections.forEach(s => {
          if (s.id === tab) { s.classList.add("active"); s.hidden = false; }
          else { s.classList.remove("active"); s.hidden = true; }
        });
      });
    });
  },

  bindEvents() {
    // tasks
    this.dom.taskForm.addEventListener("submit", e => {
      e.preventDefault();
      this.addTask();
    });

    // timer
    this.dom.timerStart.addEventListener("click", () => this.startTimer());
    this.dom.timerPause.addEventListener("click", () => this.pauseTimer());
    this.dom.timerStop.addEventListener("click", () => this.stopTimer());

    // finance txns
    this.dom.txnForm.addEventListener("submit", e => {
      e.preventDefault();
      this.addTxn();
    });
    this.dom.setBalanceBtn.addEventListener("click", () => this.setBalance());

    // categories (editable pie)
    this.dom.catForm.addEventListener("submit", e => {
      e.preventDefault();
      this.addOrUpdateCategory();
    });
    this.dom.catClear.addEventListener("click", () => {
      this.state.categories = [];
      this.save();
      this.updateCategoryUI();
      this.updatePieChart();
    });

    // logout: removido - usar onclick no HTML em vez de addEventListener
    // const logoutBtn = document.getElementById("logoutBtn");
    // if (logoutBtn) {
    //   logoutBtn.addEventListener("click", () => {
    //     localStorage.removeItem('loggedIn');
    //     localStorage.removeItem('userEmail');
    //     
    //     if (typeof firebase !== 'undefined' && firebase.auth) {
    //       firebase.auth().signOut().then(() => {
    //         window.location.href = 'index.html';
    //       }).catch((error) => {
    //         console.log(error);
    //         window.location.href = 'index.html';
    //       });
    //     } else {
    //       window.location.href = 'index.html';
    //     }
    //   });
    // }
  },

  // -------------------------
  // Tasks
  // -------------------------
  addTask() {
    const title = this.dom.taskTitle.value.trim();
    const pr = this.dom.taskPriority.value;
    if (!title) return;
    this.state.tasks.unshift({ id: Date.now(), title, pr, done: false, created: new Date().toISOString() });
    this.save();
    this.dom.taskTitle.value = "";
    this.renderTasks();
    this.populateTimerTasks();
  },

  toggleTask(id) {
    this.state.tasks = this.state.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    this.save();
    this.renderTasks();
    this.populateTimerTasks();
  },

  deleteTask(id) {
    this.state.tasks = this.state.tasks.filter(t => t.id !== id);
    this.save();
    this.renderTasks();
    this.populateTimerTasks();
  },

  renderTasks() {
    const ul = this.dom.taskList;
    ul.innerHTML = "";
    this.state.tasks.forEach(t => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div style="min-width:0">
          <strong style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.title}</strong>
          <small class="muted">${t.pr}</small>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn" title="Marcar concluída" aria-label="Marcar concluída" data-id="${t.id}">${t.done ? "✔" : "○"}</button>
          <button class="btn" title="Excluir" aria-label="Excluir" data-id="${t.id}">🗑</button>
        </div>
      `;
      ul.appendChild(li);

      li.querySelectorAll("button").forEach(btn => {
        const id = Number(btn.dataset.id);
        if (btn.textContent === "🗑") btn.onclick = () => this.deleteTask(id);
        else btn.onclick = () => this.toggleTask(id);
      });
    });

    // dashboard counters
    document.getElementById("active-tasks").textContent = this.state.tasks.filter(t => !t.done).length;
    document.getElementById("recent-tasks").innerHTML = this.state.tasks.slice(0, 5).map(t => `<li>${t.title}</li>`).join("");
  },

  populateTimerTasks() {
    const sel = this.dom.timerTaskSelect;
    sel.innerHTML = "";
    const noneOpt = document.createElement("option");
    noneOpt.value = "";
    noneOpt.textContent = "— Selecionar tarefa (opcional) —";
    sel.appendChild(noneOpt);
    this.state.tasks.forEach(t => {
      const o = document.createElement("option");
      o.value = t.id;
      o.textContent = t.title;
      sel.appendChild(o);
    });
  },

  // -------------------------
  // Timer
  // -------------------------
  startTimer() {
    if (this.state.timer.running) return;
    this.state.timer.running = true;
    this.dom.timerStart.disabled = true;
    this.dom.timerPause.disabled = false;
    this.dom.timerStop.disabled = false;

    this.state.timer.interval = setInterval(() => {
      this.state.timer.seconds++;
      this.dom.timerDisplay.textContent = this.formatTime(this.state.timer.seconds);
    }, 1000);
  },

  pauseTimer() {
    clearInterval(this.state.timer.interval);
    this.state.timer.running = false;
    this.dom.timerStart.disabled = false;
    this.dom.timerPause.disabled = true;
  },

  stopTimer() {
    const sec = this.state.timer.seconds;
    if (!sec) return;
    const taskId = this.dom.timerTaskSelect.value || null;
    this.state.logs.unshift({ id: Date.now(), dur: sec, created: new Date().toISOString(), taskId });
    clearInterval(this.state.timer.interval);
    this.state.timer.running = false;
    this.state.timer.seconds = 0;
    this.dom.timerDisplay.textContent = "00:00:00";
    this.dom.timerStart.disabled = false;
    this.dom.timerPause.disabled = true;
    this.dom.timerStop.disabled = true;
    this.save();
    this.renderLogs();
    this.renderTasks();
  },

  formatTime(sec) {
    const h = Math.floor(sec / 3600).toString().padStart(2, "0");
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  },

  renderLogs() {
    this.dom.timeLog.innerHTML = this.state.logs.map(l => {
      const date = new Date(l.created).toLocaleString();
      const mins = Math.round(l.dur / 60);
      const task = this.state.tasks.find(t => t.id === Number(l.taskId)) || null;
      return `<li><div><strong>${task ? task.title : "Atividade"}</strong><br><small class="muted">${date}</small></div><div>${mins} min</div></li>`;
    }).join("");

    // hoje
    const today = new Date().toISOString().slice(0, 10);
    const secs = this.state.logs.filter(l => new Date(l.created).toISOString().slice(0, 10) === today).reduce((s, l) => s + l.dur, 0);
    this.dom.todayTime.textContent = `${Math.round(secs / 60)} min`;
  },

  // -------------------------
  // Finance
  // -------------------------
  addTxn() {
    const desc = this.dom.txnDesc.value.trim();
    const val = parseFloat(this.dom.txnAmount.value);
    const cat = this.dom.txnCat.value;
    if (!desc || isNaN(val)) return;
    this.state.txns.unshift({ id: Date.now(), desc, val, cat, created: new Date().toISOString() });
    this.dom.txnForm.reset();
    this.save();
    this.renderFinance();
    this.updateBarChart();
  },

  setBalance() {
    const val = parseFloat(this.dom.initialBalance.value);
    if (isNaN(val)) return;
    this.state.balance = val;
    this.save();
    this.renderFinance();
  },

  renderFinance() {
    const ul = this.dom.txnList;
    ul.innerHTML = this.state.txns.map(t => `<li><div><strong>${t.desc}</strong><br><small class="muted">${t.cat} • ${new Date(t.created).toLocaleDateString()}</small></div><div>${this.money(t.val)}</div></li>`).join("");

    const income = this.state.txns.filter(t => t.val > 0).reduce((s, t) => s + t.val, 0);
    const expense = this.state.txns.filter(t => t.val < 0).reduce((s, t) => s + t.val, 0);

    this.dom.financeBalance.textContent = this.money(this.state.balance + income + expense);
    this.dom.financeIncome.textContent = this.money(income);
    this.dom.financeExpense.textContent = this.money(Math.abs(expense));
    document.getElementById("balance").textContent = this.money(this.state.balance + income + expense);
  },

  // -------------------------
  // Categories & Pie (editável)
  // -------------------------
  addOrUpdateCategory() {
    const name = this.dom.catName.value.trim();
    const val = parseFloat(this.dom.catValue.value);
    if (!name || isNaN(val)) return;

    const idx = this.state.categories.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
    if (idx >= 0) {
      this.state.categories[idx].value = val;
    } else {
      this.state.categories.push({ name, value: val });
    }
    this.dom.catForm.reset();
    this.save();
    this.updateCategoryUI();
    this.updatePieChart();
  },

  updateCategoryUI() {
    this.dom.catList.innerHTML = "";
    if (!this.state.categories.length) {
      this.dom.catList.innerHTML = `<div class="item muted">Nenhuma categoria definida — adicione uma acima.</div>`;
      return;
    }
    this.state.categories.forEach((c, index) => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `<div>${c.name} <small class="muted">(${this.money(c.value)})</small></div>
                       <div style="display:flex;gap:8px">
                         <button class="btn" data-i="${index}" title="Editar">✏️</button>
                         <button class="btn" data-i="${index}" title="Remover">🗑</button>
                       </div>`;
      this.dom.catList.appendChild(div);

      div.querySelectorAll("button").forEach(btn => {
        const i = Number(btn.dataset.i);
        if (btn.title === "Editar") {
          btn.onclick = () => {
            this.dom.catName.value = this.state.categories[i].name;
            this.dom.catValue.value = this.state.categories[i].value;
            // focus
            this.dom.catName.focus();
          };
        } else {
          btn.onclick = () => {
            this.state.categories.splice(i, 1);
            this.save();
            this.updateCategoryUI();
            this.updatePieChart();
          };
        }
      });
    });
  },

  // -------------------------
  // Charts
  // -------------------------
  initCharts() {
    // PIE
    const pieCtx = this.dom.pieCanvas.getContext("2d");
    this.pieChart = new Chart(pieCtx, {
      type: "pie",
      data: {
        labels: this.state.categories.map(c => c.name),
        datasets: [{
          data: this.state.categories.map(c => c.value),
          backgroundColor: this.generateColors(this.state.categories.length)
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "bottom" }, tooltip: { mode: "index" } }
      }
    });

    // BAR (last 6 months)
    const barCtx = this.dom.barCanvas.getContext("2d");
    this.barChart = new Chart(barCtx, {
      type: "bar",
      data: { labels: this.getLastMonths(6), datasets: [
        { label: "Receita", data: [], stack: "a" },
        { label: "Despesa", data: [], stack: "a" },
      ]},
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } },
        plugins: { legend: { position: "bottom" } }
      }
    });

    // fill data
    this.updatePieChart();
    this.updateBarChart();
  },

  updatePieChart() {
    const data = this.state.categories;
    this.pieChart.data.labels = data.map(d => d.name);
    this.pieChart.data.datasets[0].data = data.map(d => d.value);
    this.pieChart.data.datasets[0].backgroundColor = this.generateColors(data.length);
    this.pieChart.update();
  },

  updateBarChart() {
    const months = this.getLastMonths(6);
    const incomes = months.map(m => 0);
    const expenses = months.map(m => 0);

    this.state.txns.forEach(tx => {
      const d = new Date(tx.created);
      const key = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,"0")}`;
      const idx = months.findIndex(mm => mm.key === key);
      if (idx >= 0) {
        if (tx.val >= 0) incomes[idx] += tx.val;
        else expenses[idx] += Math.abs(tx.val);
      }
    });

    this.barChart.data.labels = months.map(m => m.label);
    this.barChart.data.datasets[0].data = incomes.map(v => Number(v.toFixed(2)));
    this.barChart.data.datasets[1].data = expenses.map(v => Number(v.toFixed(2)));
    this.barChart.update();
  },

  generateColors(n) {
    const palette = [
      "#00d0ff","#008fb3","#00b894","#6c5ce7","#fd79a8","#e17055","#00cec9",
      "#fab1a0","#74b9ff","#a29bfe","#55efc4","#ffeaa7"
    ];
    if (n <= palette.length) return palette.slice(0,n);
    // repeat with slight variation
    return Array.from({length:n}).map((_,i)=>palette[i%palette.length]);
  },

  getLastMonths(count) {
    const arr = [];
    const now = new Date();
    // Começa do mês atual e volta 'count-1' meses
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("pt-BR", { month: "short", year: "numeric" });
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      arr.push({ label, key, date: d });
    }
    return arr;
  },

  // -------------------------
  // Render everything
  // -------------------------
  renderAll() {
    this.renderTasks();
    this.populateTimerTasks();
    this.renderLogs();
    this.renderFinance();
    this.updateCategoryUI();
  }
};

// expose toggle/delete so inline handlers can call App methods if needed
window.App = {
  toggleTask: id => App.toggleTask(id),
  deleteTask: id => App.deleteTask(id)
};

// Função global de logout
function logout() {
  localStorage.removeItem('loggedIn');
  localStorage.removeItem('userEmail');
  
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().signOut().then(() => {
      window.location.href = 'index.html';
    }).catch((error) => {
      console.log(error);
      window.location.href = 'index.html';
    });
  } else {
    window.location.href = 'index.html';
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => App.init());
