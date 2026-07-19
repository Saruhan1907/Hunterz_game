// dashboard.js
import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let allScores = [];
let chartInstance = null;
let currentSort = { property: 'score', direction: -1 };

// WICHTIG: window.t ist jetzt global durch translate.js verfügbar
// Wir nutzen einfach die Funktion, die wir dort definiert haben.

async function loadData() {
    const spinner = document.getElementById('loading-spinner');
    const content = document.getElementById('dashboard-content');

    // 1. Spinner zeigen, Inhalt verstecken (Falls das Laden mal länger dauert)
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

        // 2. Erfolg: Spinner aus, Inhalt ein
        spinner.style.display = 'none';
        content.style.display = 'block';

    } catch (error) {
        console.error("Fehler beim Laden:", error);
        // Auch bei Fehler den Spinner wegmachen, damit der User nicht ewig wartet
        spinner.innerHTML = '<p class="text-danger">Fehler beim Laden der Daten.</p>';
    }
}

function calculateKPIs() {
    // Anzahl der Runs
    document.getElementById('total-runs').innerText = allScores.length;

    // Berechnung der Zeit in Sekunden
    const totalTimeSeconds = allScores.reduce((sum, item) => sum + (Number(item.time) || 0), 0);
    
    // Umrechnung in Minuten (abgerundet auf ganze Zahlen)
    const totalMinutes = Math.floor(totalTimeSeconds / 60);
    
    // Anzeige im Dashboard
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
    
    // Wir nehmen nur die ersten 50 Einträge für die Tabelle
    const displayScores = allScores.slice(0, 50);
    
    displayScores.forEach((item) => {
        let dateStr = item.timestamp?.toDate ? item.timestamp.toDate().toLocaleDateString('de-DE') : "-";
        const rankClass = (item.rank && item.rank <= 3) ? `rank-${item.rank}` : '';

        // Übersetzungen abrufen für Klasse und Waffe
        const translatedClass = item.characterClass ? (window.t(`game_values.${item.characterClass}`) || item.characterClass) : '-';
        const translatedWeapon = item.weapon ? (window.t(`game_values.${item.weapon}`) || item.weapon) : '-';

        tableBody.innerHTML += `
            <tr class="${rankClass}">
                <td>${item.rank || '-'}</td>
                <td>${item.name || '-'}</td>
                <td>${item.score || 0}</td>
                <td>${item.level || 1}</td>
                <td>${translatedClass}</td>
                <td>${translatedWeapon}</td>
                <td>${item.time || 0} ${window.t('dashboard.seconds')}</td> 
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

    // Wir nehmen die bereits sortierten allScores und slicen sie auf 10
    // Da wir sortData aufrufen, ist allScores bereits nach score sortiert
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
                            
                            // Übersetzungen für die Werte abrufen
                            const translatedClass = item.characterClass ? (window.t(`game_values.${item.characterClass}`) || item.characterClass) : '-';
                            const translatedWeapon = item.weapon ? (window.t(`game_values.${item.weapon}`) || item.weapon) : '-';
                            
                            // Übersetzungen für die Hover-Kategorienamen abrufen (Fallback auf Deutsch)
                            const trClass = window.t('dashboard.class') || 'Klasse';
                            const trWeapon = window.t('dashboard.weapon') || 'Waffe';

                            return [
                                `${window.t('dashboard.score')}: ${item.score || 0}`,
                                `${window.t('dashboard.level')}: ${item.level || 1}`,
                                `${trClass}: ${translatedClass}`,
                                `${trWeapon}: ${translatedWeapon}`,
                                `${window.t('dashboard.time')}: ${item.time || 0} ${window.t('dashboard.seconds')}`,
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