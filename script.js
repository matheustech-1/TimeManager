// TimeManager v2 — Profissional e Dinâmico
const App = {
  state: {
    tasks: JSON.parse(localStorage.getItem("tasks") || "[]"),
    logs: JSON.parse(localStorage.getItem("logs") || "[]"),
    txns: JSON.parse(localStorage.getItem("txns") || "[]"),
    balance: parseFloat(localStorage.getItem("balance") || "0"),
    timer: { running: false, seconds: 0, interval: null }
  },

  save(key) {
    const { tasks, logs, txns, balance } = this.state;
    localStorage.setItem("tasks", JSON.stringify(tasks));
    localStorage.setItem("logs", JSON.stringify(logs));
    localStorage.setItem("txns", JSON.stringify(txns));
    localStorage.setItem("balance", balance);
  },

  money(v) { return (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); },

  init() {
    this.bindTabs();
    this.render();
    this.bindEvents();
  },

  bindTabs() {
    const tabs = document.querySelectorAll(".nav-btn");
    const sections = document.querySelectorAll(".tab");
    tabs.forEach(btn => {
      btn.onclick = () => {
        tabs.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const tab = btn.dataset.tab;
        sections.forEach(sec => sec.classList.toggle("active", sec.id === tab));
      };
    });
  },

  bindEvents() {
    document.getElementById("task-form").onsubmit = e => { e.preventDefault(); this.addTask(); };
    document.getElementById("txn-form").onsubmit = e => { e.preventDefault(); this.addTxn(); };
    document.getElementById("set-balance-btn").onclick = () => this.setBalance();

    document.getElementById("timer-start").onclick = () => this.startTimer();
    document.getElementById("timer-pause").onclick = () => this.pauseTimer();
    document.getElementById("timer-stop").onclick = () => this.stopTimer();
  },

  addTask() {
    const title = document.getElementById("task-title").value.trim();
    const pr = document.getElementById("task-priority").value;
    if (!title) return;
    this.state.tasks.unshift({ id: Date.now(), title, pr, done:false, created:new Date() });
    this.save();
    this.render();
    document.getElementById("task-title").value = "";
  },

  toggleTask(id) {
    this.state.tasks = this.state.tasks.map(t => t.id===id ? {...t, done:!t.done} : t);
    this.save(); this.render();
  },

  deleteTask(id) {
    this.state.tasks = this.state.tasks.filter(t => t.id!==id);
    this.save(); this.render();
  },

  startTimer() {
    if (this.state.timer.running) return;
    this.state.timer.running = true;
    const d = document.getElementById("timer-display");
    this.state.timer.interval = setInterval(() => {
      this.state.timer.seconds++;
      d.textContent = this.format(this.state.timer.seconds);
    }, 1000);
  },

  pauseTimer() {
    clearInterval(this.state.timer.interval);
    this.state.timer.running = false;
  },

  stopTimer() {
    const sec = this.state.timer.seconds;
    if (!sec) return;
    this.state.logs.unshift({ id: Date.now(), dur: sec, created: new Date() });
    clearInterval(this.state.timer.interval);
    Object.assign(this.state.timer, { running:false, seconds:0 });
    document.getElementById("timer-display").textContent = "00:00:00";
    this.save();
    this.render();
  },

  addTxn() {
    const desc = document.getElementById("txn-desc").value.trim();
    const val = parseFloat(document.getElementById("txn-amount").value);
    const cat = document.getElementById("txn-cat").value;
    if (!desc || isNaN(val)) return;
    this.state.txns.unshift({ id: Date.now(), desc, val, cat, created:new Date() });
    this.save(); this.render();
    document.getElementById("txn-form").reset();
  },

  setBalance() {
    const val = parseFloat(document.getElementById("initial-balance").value);
    if (isNaN(val)) return;
    this.state.balance = val;
    this.save();
    this.render();
  },

  format(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  },

  render() {
    this.renderTasks();
    this.renderLogs();
    this.renderFinance();
  },

  renderTasks() {
    const ul = document.getElementById("task-list");
    ul.innerHTML = "";
    this.state.tasks.forEach(t => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div><strong>${t.title}</strong><br><small>${t.pr}</small></div>
        <div>
          <button class="btn" onclick="App.toggleTask(${t.id})">${t.done?"✔":"○"}</button>
          <button class="btn" onclick="App.deleteTask(${t.id})">🗑</button>
        </div>`;
      ul.appendChild(li);
    });
    document.getElementById("active-tasks").textContent = this.state.tasks.filter(t=>!t.done).length;
    document.getElementById("recent-tasks").innerHTML = this.state.tasks.slice(0,5).map(t=>`<li>${t.title}</li>`).join('');
  },

  renderLogs() {
    const ul = document.getElementById("time-log");
    ul.innerHTML = this.state.logs.map(l=>`<li><span>${new Date(l.created).toLocaleString()}</span><span>${Math.round(l.dur/60)} min</span></li>`).join('');
    const today = new Date().toISOString().slice(0,10);
    const secs = this.state.logs
      .filter(l => new Date(l.created).toISOString().slice(0,10) === today)
      .reduce((sum, l) => sum + l.dur, 0);
    document.getElementById("today-time").textContent = `${Math.round(secs/60)} min`}};