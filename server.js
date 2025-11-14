const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Serve toda a pasta /public
app.use(express.static(path.join(__dirname, 'public')));

// Rota principal → abre sua dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'time_manager', 'index_html.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em: http://localhost:${PORT}`);
});
