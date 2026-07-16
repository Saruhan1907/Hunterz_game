const facts = [
    { de: "Das Herz einer Garnele liegt in ihrem Kopf.", en: "A shrimp's heart is in its head.", tr: "Karidesin kalbi kafasındadır." },
    { de: "Menschen sind morgens größer als abends.", en: "Humans are taller in the morning than at night.", tr: "İnsanlar sabahları akşamdan daha uzundur." },
    { de: "Wombat-Kot ist würfelförmig.", en: "Wombat poop is cube-shaped.", tr: "Vombat dışkısı küp şeklindedir." },
    { de: "Ein Tag auf der Venus ist länger als ein Jahr auf der Venus.", en: "A day on Venus is longer than a year on Venus.", tr: "Venüs'te bir gün, Venüs'teki bir yıldan daha uzundur." },
    { de: "Bananen sind Beeren, Erdbeeren aber nicht.", en: "Bananas are berries, but strawberries are not.", tr: "Muzlar dutsu meyvedir, čilekler değildir." },
    { de: "Kühe haben beste Freunde.", en: "Cows have best friends.", tr: "İneklerin en yakın arkadaşları vardır." },
    { de: "Otter halten Händchen beim Schlafen.", en: "Sea otters hold hands when they sleep.", tr: "Su samurları uyurken el ele tutuşurlar." },
    { de: "Ein Tag auf dem Mars dauert 24 Stunden und 37 Minuten.", en: "A day on Mars is 24 hours and 37 minutes long.", tr: "Mars'ta bir gün 24 saat 37 dakika sürer." },
    { de: "Schmetterlinge schmecken mit ihren Füßen.", en: "Butterflies taste with their feet.", tr: "Kelebekler ayaklarıyla tadına bakarlar." },
    { de: "Der Eiffelturm kann im Sommer um 15 cm wachsen.", en: "The Eiffel Tower can grow by 15 cm in summer.", tr: "Eyfel Kulesi yazın 15 cm uzayabilir." },
    { de: "Ein Oktopus hat drei Herzen.", en: "An octopus has three hearts.", tr: "Ahtapotun üç kalbi vardır." },
    { de: "Katzen verbringen 70 % ihres Lebens mit Schlafen.", en: "Cats spend 70% of their lives sleeping.", tr: "Kediler hayatlarının %70'ini uyuyarak geçirirler." },
    { de: "Honig verdirbt niemals.", en: "Honey never spoils.", tr: "Bal asla bozulmaz." },
    { de: "Goldfische haben ein Gedächtnis von über 3 Monaten.", en: "Goldfish have a memory of over 3 months.", tr: "Japon balıklarının 3 aydan fazla hafızası vardır." },
    { de: "In der Schweiz ist es illegal, nur ein Meerschweinchen zu halten.", en: "It is illegal to own just one guinea pig in Switzerland.", tr: "İsviçre'de sadece bir tane kobay beslemek yasaktır." },
    { de: "Flamingos sind nicht von Natur aus rosa.", en: "Flamingos are not naturally pink.", tr: "Flamingolar doğal olarak pembe değildir." },
    { de: "Ein Walnussbaum produziert bis zu 50 kg Nüsse pro Jahr.", en: "A walnut tree produces up to 50 kg of nuts per year.", tr: "Bir ceviz ağacı yılda 50 kg'a kadar ceviz üretir." },
    { de: "Die Zunge eines Blauwals wiegt so viel wie ein Elefant.", en: "A blue whale's tongue weighs as much as an elephant.", tr: "Mavi balinanın dili bir fil kadar ağırdır." },
    { de: "Das Auge eines Straußes ist größer als sein Gehirn.", en: "An ostrich's eye is bigger than its brain.", tr: "Deve kuşunun gözü beyninden büyüktür." },
    { de: "Es regnet Diamanten auf Jupiter und Saturn.", en: "It rains diamonds on Jupiter and Saturn.", tr: "Jüpiter ve Satürn'de elmas yağar." },
    { de: "Ein Mensch blinzelt etwa 15.000 bis 20.000 Mal am Tag.", en: "A human blinks about 15,000 to 20,000 times a day.", tr: "Bir insan günde yaklaşık 15.000 ila 20.000 kez göz kırpar." },
    { de: "Koalas haben Fingerabdrücke, die menschlichen sehr ähnlich sind.", en: "Koalas have fingerprints that are very similar to humans.", tr: "Koalaların insanlara çok benzeyen parmak izleri vardır." },
    { de: "Ein Hai hat keine Knochen.", en: "A shark has no bones.", tr: "Köpekbalığının hiç kemiği yoktur." },
    { de: "Pinguine haben Knie.", en: "Penguins have knees.", tr: "Penguenlerin dizleri vardır." },
    { de: "Der kürzeste Krieg dauerte 38 Minuten.", en: "The shortest war lasted 38 minutes.", tr: "En kısa savaş 38 dakika sürdü." },
    { de: "Ein Mensch verliert jährlich etwa 4 kg Haut.", en: "A human loses about 4 kg of skin every year.", tr: "Bir insan her yıl yaklaşık 4 kg deri döker." },
    { de: "Die Nase eines Hundes ist so einzigartig wie ein Fingerabdruck.", en: "A dog's nose print is as unique as a fingerprint.", tr: "Köpeklerin burun izi parmak izi kadar benzersizdir." },
    { de: "Elefanten können nicht springen.", en: "Elephants cannot jump.", tr: "Filler zıplayamazlar." },
    { de: "Ein durchschnittlicher Bleistift kann eine Linie von 56 km ziehen.", en: "An average pencil can draw a line 56 km long.", tr: "Ortalama bir kurşun kalem 56 km uzunluğunda bir çizgi çizebilir." },
    { de: "Lippenstifte enthalten oft Fischschuppen.", en: "Lipsticks often contain fish scales.", tr: "Rujlar genellikle balık pulu içerir." },
    { de: "Die meisten Staubpartikel im Haus sind tote Hautzellen.", en: "Most dust particles in the house are dead skin cells.", tr: "Evdeki toz parçacıklarının çoğu ölü deri hücreleridir." },
    { de: "Seekühe sind näher mit Elefanten verwandt als mit Walen.", en: "Manatees are more closely related to elephants than to whales.", tr: "Deniz inekleri balinalardan çok fillere akrabadır." },
    { de: "Ein Kuss verbrennt etwa 2 bis 3 Kalorien pro Minute.", en: "A kiss burns about 2 to 3 calories per minute.", tr: "Bir öpücük dakikada yaklaşık 2 ila 3 kalori yakar." },
    { de: "Die Erde rotiert mit 1.600 km/h.", en: "The Earth rotates at 1,600 km/h.", tr: "Dünya saatte 1.600 km hızla döner." },
    { de: "Ein durchschnittliches Wolken-Gewicht entspricht 100 Elefanten.", en: "The average weight of a cloud is equal to 100 elephants.", tr: "Ortalama bir bulutun ağırlığı 100 file eşittir." },
    { de: "Bienen können Gesichter erkennen.", en: "Bees can recognize faces.", tr: "Arılar yüzleri tanıyabilir." },
    { de: "Ein Wal hat ein Herz so groß wie ein Kleinwagen.", en: "A whale has a heart the size of a small car.", tr: "Bir balinanın kalbi küçük bir araba büyüklüğündedir." },
    { de: "Tomaten haben mehr Gene als Menschen.", en: "Tomatoes have more genes than humans.", tr: "Domateslerin insanlardan daha fazla geni vardır." },
    { de: "Enten haben magnetische Sinne.", en: "Ducks have magnetic senses.", tr: "Ördeklerin manyetik duyuları vardır." },
    { de: "Der Mond hat keine Atmosphäre.", en: "The Moon has no atmosphere.", tr: "Ay'ın atmosferi yoktur." },
    { de: "Man kann im Weltraum nicht weinen.", en: "You cannot cry in space.", tr: "Uzayda ağlayamazsınız." },
    { de: "Wale singen im Schlaf.", en: "Whales sing in their sleep.", tr: "Balinalar uykularında şarkı söylerler." },
    { de: "Spinnen haben blaues Blut.", en: "Spiders have blue blood.", tr: "Örümceklerin kanı mavidir." },
    { de: "Eine Schnecke kann 3 Jahre lang schlafen.", en: "A snail can sleep for 3 years.", tr: "Bir salyangoz 3 yıl boyunca uyuyabilir." },
    { de: "Jeder Mensch hat eine einzigartige Zunge.", en: "Every human has a unique tongue print.", tr: "Her insanın benzersiz bir dil izi vardır." },
    { de: "Ein Blitz ist 5-mal heißer als die Sonne.", en: "Lightning is 5 times hotter than the sun.", tr: "Şimşek güneşten 5 kat daha sıcaktır." },
    { de: "Eichhörnchen vergessen jedes Jahr tausende Bäume, die sie gepflanzt haben.", en: "Squirrels forget thousands of trees they planted each year.", tr: "Sincaplar her yıl ektikleri binlerce ağacı unuturlar." },
    { de: "Die Erde ist keine perfekte Kugel.", en: "The Earth is not a perfect sphere.", tr: "Dünya mükemmel bir küre değildir." },
    { de: "Einige Fische können rückwärts schwimmen.", en: "Some fish can swim backwards.", tr: "Bazı balıklar geriye doğru yüzebilir." },
    { de: "Das älteste bekannte Haustier war eine Katze.", en: "The oldest known pet was a cat.", tr: "Bilinen en eski evcil hayvan bir kediydi." }
];

let currentFactIndex = 0;

// 1. WETTER LADEN
async function fetchWeather() {
    try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=49.57&longitude=10.87&current=temperature_2m&timezone=Europe/Berlin');
        const data = await response.json();
        const tempEl = document.getElementById('weather-temp');
        if (tempEl) {
            tempEl.textContent = data.current.temperature_2m;
        }
    } catch (error) {
        console.error("Wetter-Ladefehler:", error);
        const tempEl = document.getElementById('weather-temp');
        if (tempEl) tempEl.textContent = "??.?";
    }
}

// 2. UNNÜTZES WISSEN ANZEIGEN
function showFact() {
    const lang = localStorage.getItem('lang') || 'de';
    const selectedFact = facts[currentFactIndex];
    const factResultEl = document.getElementById('fact-result');
    if (factResultEl && selectedFact) {
        factResultEl.textContent = selectedFact[lang] || selectedFact['en'];
    }
}

function fetchFact() {
    if (facts.length > 1) {
        let newIndex = currentFactIndex;
        while (newIndex === currentFactIndex) {
            newIndex = Math.floor(Math.random() * facts.length);
        }
        currentFactIndex = newIndex;
    } else {
        currentFactIndex = Math.floor(Math.random() * facts.length);
    }
    showFact();
}

// 3. QR-CODE GENERIEREN
function generateQRCode() {
    const inputVal = document.getElementById('qr-input').value.trim();
    const qrImg = document.getElementById('qr-image');
    const placeholder = document.getElementById('qr-placeholder');
    
    if (inputVal === "") {
        alert("Bitte gib einen Text oder Link ein!");
        return;
    }
    
    // API-URL zusammenbauen
    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(inputVal)}`;
    
    // Bild aktualisieren und anzeigen
    qrImg.src = apiUrl;
    qrImg.classList.remove('d-none');
    placeholder.classList.add('d-none');
}

// 4. PET IMAGE LADEN (Hund oder Katze)
async function fetchPetImage(type) {
    const imgEl = document.getElementById('pet-image');
    const spinner = document.getElementById('pet-spinner');
    
    // Spinner an, Bild kurz ausblenden
    imgEl.style.opacity = "0.3";
    spinner.classList.remove('d-none');
    
    try {
        let url = "";
        if (type === 'dog') {
            const response = await fetch('https://dog.ceo/api/breeds/image/random');
            const data = await response.json();
            url = data.message;
        } else if (type === 'cat') {
            const response = await fetch('https://api.thecatapi.com/v1/images/search');
            const data = await response.json();
            url = data[0].url;
        }
        
        if (url) {
            imgEl.src = url;
        }
    } catch (error) {
        console.error("Haustier-Ladefehler:", error);
    } finally {
        // Spinner aus, Bild wieder voll anzeigen
        imgEl.style.opacity = "1";
        spinner.classList.add('d-none');
    }
}

// INITIALISIERUNG
document.addEventListener('DOMContentLoaded', () => {
    fetchWeather();
    
    currentFactIndex = Math.floor(Math.random() * facts.length);
    showFact();
});

// SIGNAL VOM ÜBERSETZUNGSSKRIPT EMPFANGEN
window.addEventListener('languageChanged', () => {
    showFact();
});