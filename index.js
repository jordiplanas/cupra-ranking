const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();
const app = express();

app.use(express.static('public'));
app.use(cors());

const TOKEN = process.env.API_TOKEN;
const BASE_URL = 'https://cupra.metaversotechnologies.com/score/';
const BLOCKS = [
    'action-plan-sem', 'action-plan-sm', 'active-reception-ce', 'bonus-cm', 'brand', 
    'collaboration-ce', 'collaboration-cm', 'collaboration-sem', 'collaboration-sm', 
    'electrification', 'electrification-auto', 'explain', 'explain-ce', 'explain-cm', 
    'explain-sem', 'explain-sm', 'fivemin-challenge-ce', 'fivemin-challenge-cm', 
    'fivemin-challenge-connect-ce', 'fivemin-challenge-connect-cm', 'fivemin-challenge-connect-sem', 
    'fivemin-challenge-sem', 'fivemin-challenge-sm', 'recption', 'sm', 'social-sm', 'walkaround-cm'
];

app.get('/api/ranking-master', async (req, res) => {
    console.log("📥 Generando Rankings...");
    const teamMap = {}; 
    const userMap = {}; 

    if (!TOKEN) {
        console.error("❌ ERROR: No se ha encontrado el API_TOKEN en el archivo .env");
        return res.status(500).json({ error: "Token no configurado" });
    }

    try {
        const promises = BLOCKS.map(block => 
            axios.get(BASE_URL + block, {
                headers: { 'Authorization': `Bearer ${TOKEN}` },
                timeout: 10000 // 10 segundos de límite
            }).catch(err => {
                console.error(`⚠️ Error en bloque ${block}:`, err.message);
                return { data: [] }; // Si un bloque falla, seguimos con el resto
            })
        );

        const results = await Promise.all(promises);

  results.forEach((response, index) => {
    const blockName = BLOCKS[index];
    const isCollaboration = blockName.toLowerCase().includes('collaboration');

    if (response.data && Array.isArray(response.data)) {
        response.data.forEach(entry => {
            // FORZAMOS CONVERSIÓN A STRING ANTES DEL TRIM
            const country = String(entry.country || 'N/A').trim();
            const groupId = String(entry.group_id || 'N/A').trim();
            const firstName = String(entry.first_name || '').trim();
            const lastName = String(entry.last_name || '').trim();
            const userName = `${firstName} ${lastName}`.trim();
            
            const score = parseFloat(entry.score || 0);
            const duration = parseFloat(entry.duration || 0);

            // Evitamos nombres vacíos
            if (!userName || userName === "") return;

            if (isCollaboration) {
                // Usamos una clave única normalizada
                const teamKey = `${country}-${groupId}`.toUpperCase();
                
                if (!teamMap[teamKey]) {
                    teamMap[teamKey] = { 
                        groupId, 
                        country, 
                        totalScore: 0, 
                        totalDuration: 0, 
                        members: {} 
                    };
                }
                teamMap[teamKey].totalScore += score;
                teamMap[teamKey].totalDuration += duration;

                // Agrupamos miembros: si el miembro ya existe, sumamos puntos
                if (!teamMap[teamKey].members[userName]) {
                    teamMap[teamKey].members[userName] = { name: userName, score: 0 };
                }
                teamMap[teamKey].members[userName].score += score;

            } else {
                // Lógica individual
                if (!userMap[userName]) {
                    userMap[userName] = { 
                        fullName: userName, 
                        country, 
                        job_role: entry.job_role || 'N/A', 
                        totalScore: 0, 
                        totalDuration: 0, 
                        blocks: [] 
                    };
                }
                userMap[userName].totalScore += score;
                userMap[userName].totalDuration += duration;
                userMap[userName].blocks.push({ name: blockName, score });
            }
        });
    }
});

        console.log(`✅ Éxito: ${Object.keys(teamMap).length} equipos y ${Object.keys(userMap).length} individuos.`);
        res.json({
            teams: Object.values(teamMap).sort((a, b) => b.totalScore - a.totalScore),
            individuals: Object.values(userMap).sort((a, b) => b.totalScore - a.totalScore)
        });

    } catch (globalError) {
        console.error("❌ ERROR GLOBAL:", globalError.message);
        res.status(500).json({ error: "Error interno procesando datos" });
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log(`Servidor en puerto ${PORT}`));