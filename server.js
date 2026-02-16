const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();
const app = express();
app.use(express.static('.'));
// 1. Configuración de CORS para permitir que tu HTML local acceda
app.use(cors());
const TOKEN= process.env.API_TOKEN;

const BASE_URL = 'https://cupra.metaversotechnologies.com/score/';
const BLOCKS = [
    'action-plan-sem', 'action-plan-sm', 'active-reception-ce', 'bonus-cm', 'brand', 
    'collaboration-ce', 'collaboration-cm', 'collaboration-sem', 'collaboration-sm', 
    'electrification', 'electrification-auto', 'explain', 'explain-ce', 'explain-cm', 
    'explain-sem', 'explain-sm', 'fivemin-challenge-ce', 'fivemin-challenge-cm', 
    'fivemin-challenge-connect-ce', 'fivemin-challenge-connect-cm', 'fivemin-challenge-connect-sem', 
    'fivemin-challenge-sem', 'fivemin-challenge-sm', 'recption', 'sm', 'social-sm', 'walkaround-cm'
];

// 2. Definir la ruta EXACTA que busca el HTML
app.get('/api/ranking', async (req, res) => {
    console.log("📥 Petición recibida: Generando ranking...");
    const userMap = {};

    try {
        const promises = BLOCKS.map(block => 
            axios.get(BASE_URL + block, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            }).catch(() => ({ data: [] }))
        );

        const results = await Promise.all(promises);

        results.forEach((response, index) => {
            const blockName = BLOCKS[index];
            if (response.data && Array.isArray(response.data)) {
                response.data.forEach(entry => {
                    const userId = `${entry.first_name} ${entry.last_name}`.trim();
                    if (!userId) return;

                    if (!userMap[userId]) {
                        userMap[userId] = {
                            fullName: userId,
                            country: entry.country || 'N/A',
                            job_role: entry.job_role || 'N/A',
                            totalScore: 0,
                            totalDuration: 0,
                            blocks: []
                        };
                    }

                    userMap[userId].totalScore += parseFloat(entry.score || 0);
                    userMap[userId].totalDuration += parseFloat(entry.duration || 0);
                    userMap[userId].blocks.push({
                        name: blockName,
                        score: entry.score,
                        duration: entry.duration
                    });
                });
            }
        });

        const ranking = Object.values(userMap).sort((a, b) => b.totalScore - a.totalScore);
        console.log(`✅ Ranking generado con ${ranking.length} usuarios.`);
        res.json(ranking);

    } catch (error) {
        console.error("❌ Error en el servidor:", error.message);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// 3. Arrancar
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 SERVIDOR CORRIENDO EN PUERTO ${PORT}`);
    console.log(`🔗 URL: http://localhost:${PORT}/api/ranking`);
    console.log(`=========================================`);
});