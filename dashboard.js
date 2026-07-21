import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let allScores = [];
let chartInstance = null;
let currentSort = { property: 'score', direction: -1 };

// Hilfsfunktion: Wandelt Sekunden in MM:SS um
function formatTime(seconds) {
    if (!seconds && seconds !== 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

// Hilfsfunktion: Wandelt DB-Werte sauber in JSON-Übersetzungsschlüssel um
function getTranslatedValue(category, value) {
    if (!value || value === '-') return '-';
    
    // Falls in Firestore noch 'Sniper' steht, verweisen wir auf den korrekten JSON-Key 'Scharfschützengewehr'
    let valKey = value;
    if (valKey === 'Sniper') {
        valKey = 'Scharfschützengewehr';
    }

    const key = `${category}.${valKey}`;
    const translated = window.t(key);
    
    // Falls keine Übersetzung existiert, gibt window.t den Key zurück -> Fallback auf Ursprungswert
    if (translated === key) return value; 
    return translated;
}

async function loadData() {
    const spinner = document.getElementById('loading-spinner');
    const content = document.getElementById('dashboard-content');

    spinner.style.display = 'block';
    content.style.display = 'none';

    try {
        const querySnapshot = await getDocs(collection(db, "highscores"));
        allScores = [];
        querySnapshot.forEach((doc) => {
            allScores.push({ id: doc.id, ...doc.data() });
        });
        allScores.sort((a, b) => (b.score || 0) - (a.score || 0));
        allScores.forEach((item, index) => { item.rank = index + 1; });
        
        calculateKPIs();
        sortData('score', true); 
        renderChart('score');

        spinner.style.display = 'none';
        content.style.display = 'block';

    } catch (error) {
        console.error("Fehler beim Laden:", error);
        spinner.innerHTML = '<p class="text-danger">Fehler beim Laden der Daten.</p>';
    }
}

function calculateKPIs() {
    document.getElementById('total-runs').innerText = allScores.length;
    const totalTimeSeconds = allScores.reduce((sum, item) => sum + (Number(item.time) || 0), 0);
    const totalMinutes = Math.floor(totalTimeSeconds / 60);
    document.getElementById('total-time').innerText = `${totalMinutes} ${window.t('dashboard.min')}`;
}

function sortData(property, isInitial = false) {
    if (!isInitial) {
        currentSort.direction = (currentSort.property === property) ? currentSort.direction * -1 : -1;
        currentSort.property = property;
    }
    allScores.sort((a, b) => {
        let valA = a[property] || 0;
        let valB = b[property] || 0;
        if (valA < valB) return -1 * currentSort.direction;
        if (valA > valB) return 1 * currentSort.direction;
        return 0;
    });
    renderTable();
}

function renderTable() {
    const tableBody = document.getElementById('scoreTableBody');
    tableBody.innerHTML = '';
    
    const displayScores = allScores.slice(0, 100);
    
    displayScores.forEach((item) => {
        let dateStr = item.timestamp?.toDate ? item.timestamp.toDate().toLocaleDateString('de-DE') : "-";
        const rankClass = (item.rank && item.rank <= 3) ? `rank-${item.rank}` : '';

        // Saubere dynamische Übersetzung über game_values.Scharfschützengewehr
        const translatedClass = getTranslatedValue('game_values', item.characterClass);
        const translatedWeapon = getTranslatedValue('game_values', item.weapon);

        tableBody.innerHTML += `
            <tr class="${rankClass}">
                <td>${item.rank || '-'}</td>
                <td>${item.name || '-'}</td>
                <td>${item.score || 0}</td>
                <td>${item.level || 1}</td>
                <td>${translatedClass}</td>
                <td>${translatedWeapon}</td>
                <td>${formatTime(item.time || 0)}</td> 
                <td>${dateStr}</td>
            </tr>
        `;
    });
}

function changeMetric(metric, label) {
    document.getElementById('chartLabel').innerText = label;
    renderChart(metric);
}

function renderChart(metric = 'score') {
    const ctx = document.getElementById('scoreChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    const chartData = allScores.slice(0, 10); 

    const barColors = chartData.map(item => {
        if (item.rank === 1) return '#FFD700';
        if (item.rank === 2) return '#C0C0C0';
        if (item.rank === 3) return '#CD7F32';
        return '#00ffcc';
    });

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.map(item => item.name),
            datasets: [{
                label: metric.charAt(0).toUpperCase() + metric.slice(1), 
                data: chartData.map(item => item[metric] || 0),
                backgroundColor: barColors,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const item = chartData[context.dataIndex];
                            const dateStr = item.timestamp?.toDate ? item.timestamp.toDate().toLocaleDateString('de-DE') : "-";
                            
                            const translatedClass = getTranslatedValue('game_values', item.characterClass);
                            const translatedWeapon = getTranslatedValue('game_values', item.weapon);
                            
                            const trClass = window.t('dashboard.class') || 'Klasse';
                            const trWeapon = window.t('dashboard.weapon') || 'Waffe';

                            return [
                                `${window.t('dashboard.score')}: ${item.score || 0}`,
                                `${window.t('dashboard.level')}: ${item.level || 1}`,
                                `${trClass}: ${translatedClass}`,
                                `${trWeapon}: ${translatedWeapon}`,
                                `${window.t('dashboard.time')}: ${formatTime(item.time || 0)}`,
                                `${window.t('dashboard.date')}: ${dateStr}`
                            ];
                        }
                    }
                }
            }
        }
    });
}

// Expose Funktionen für HTML-Events
window.sortData = sortData;
window.changeMetric = changeMetric;
window.renderChart = renderChart;
window.loadData = loadData;

window.addEventListener('translationsLoaded', () => {
    console.log("Übersetzungen geladen, starte Dashboard...");
    loadData();
});