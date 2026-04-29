ymaps.ready(init);

async function init() {
    const map = new ymaps.Map('map', {
        center: [64.56, 39.82], zoom: 13, controls: ['zoomControl']
    });

    const response = await fetch('/api/objects');
    const houses = await response.json();

    const layers = { hM: [], hP: [], tB: [], pL: [], pK: [] };
    let currentPhotoIndex = 1;
    const totalPhotos = 14;

    houses.forEach(house => {
        // Балун дома
        const hContent = `
            <div style="font-family: sans-serif; width: 220px; color: #333;">
                <h3 style="margin: 0 0 5px 0; color: #008000; font-size: 16px;">${house.address}</h3>
                <img src="${house.photo}" style="width: 100%; border-radius: 8px; border: 2px solid #008000; margin-bottom: 8px;" onerror="this.src='/vanya.jpg'">
                <div style="font-size: 13px; line-height: 1.4; background: #f0f0f0; padding: 8px; border-radius: 5px;">
                    <b>Год постройки:</b> ${house.year}<br>
                    <b>Квартир:</b> ${house.flats}<br>
                    <b>Площадь:</b> ${house.area}
                </div>
            </div>`;

        // 1. Контуры
        const poly = new ymaps.Polygon([house.polygonCoords], { balloonContent: hContent }, {
            strokeColor: '#008000', fillColor: '#00800033', strokeWidth: 2
        });
        layers.hP.push(poly);

        // 2. Метки домов (Неон + Увеличение)
        const marker = new ymaps.Placemark(house.coords, {
            iconCaption: house.isOffice ? 'Офис УК' : '',
            balloonContent: hContent
        }, {
            preset: house.isOffice ? 'islands#greenGovernmentIcon' : 'islands#greenHomeCircleIcon',
            iconScale: 1, iconOutlineWidth: 0, iconOutlineColor: '#00ff00'
        });

        marker.events.add('mouseenter', (e) => e.get('target').options.set({iconScale: 1.4, iconOutlineWidth: 4}));
        marker.events.add('mouseleave', (e) => e.get('target').options.set({iconScale: 1, iconOutlineWidth: 0}));
        layers.hM.push(marker);

        // 3. Инфраструктура
        house.infra.forEach(item => {
            let preset = 'islands#dotIcon', color = '#008000', balloon = `
                <div style="font-family: Arial; width: 180px; text-align:center;">
                    <b style="color:#008000;">${item.title}</b><br>
                    <img src="${item.photo}" style="width:100%; border-radius:5px; margin:5px 0; border: 1px solid #ccc;" onerror="this.src='/vanya.jpg'">
                    <p style="font-size:12px; margin:5px 0;">${item.desc}</p>`;

            if (item.type === 'trash_bin') {
                preset = 'islands#trashIcon';
                color = item.load > 70 ? '#FF0000' : '#008000';
                balloon += `<div style="background:#eee; padding:5px; border-radius:5px;">Загрузка: <b style="color:${color}">${item.load}%</b></div>`;
            } else if (item.type === 'parking') {
                preset = 'islands#parkingIcon'; color = '#00AAFF';
                balloon += `Занято: <b>${item.occ} / ${item.cap}</b>`;
            } else if (item.type === 'playground') {
                preset = 'islands#greenFamilyIcon';
            }
            balloon += `</div>`;

            const mark = new ymaps.Placemark(item.coords, { balloonContent: balloon }, { preset, iconColor: color });
            if (item.type === 'trash_bin') layers.tB.push(mark);
            if (item.type === 'playground') layers.pL.push(mark);
            if (item.type === 'parking') layers.pK.push(mark);
        });
    });

    const refresh = () => {
        const cfg = {
            hM: document.getElementById('v-h').checked, hP: document.getElementById('v-p').checked,
            tB: document.getElementById('v-t').checked, pL: document.getElementById('v-pl').checked,
            pK: document.getElementById('v-pk').checked
        };
        Object.keys(layers).forEach(k => layers[k].forEach(obj => cfg[k] ? map.geoObjects.add(obj) : map.geoObjects.remove(obj)));
    };

    // Панель сверху справа
    const gui = document.createElement('div');
    gui.style = "position:absolute; top:10px; right:10px; background:white; padding:15px; border-radius:12px; z-index:1000; box-shadow:0 4px 20px rgba(0,0,0,0.2); font-family:sans-serif; width:180px; border-top:4px solid #008000;";
    gui.innerHTML = `
        <h4 style="margin:0 0 10px 0; color:#008000; text-align:center;">Объекты УК</h4>
        <label style="display:block; cursor:pointer;"><input type="checkbox" id="v-h" checked> Дома</label>
        <label style="display:block; cursor:pointer;"><input type="checkbox" id="v-p"> Контуры</label>
        <label style="display:block; cursor:pointer;"><input type="checkbox" id="v-t"> Баки</label>
        <label style="display:block; cursor:pointer;"><input type="checkbox" id="v-pl"> Площадки</label>
        <label style="display:block; cursor:pointer;"><input type="checkbox" id="v-pk"> Парковки</label>`;
    document.body.appendChild(gui);

    // Кнопка СЕКРЕТ бело-зеленая
    const sBtn = document.createElement('button');
    sBtn.style = "position:absolute; top:215px; right:65px; width:70px; height:70px; background:#fff; color:#008000; border:3px solid #008000; border-radius:50%; cursor:pointer; font-weight:bold; font-size:10px; z-index:1000; box-shadow:0 4px 15px rgba(0,128,0,0.3); transition: 0.3s; text-transform:uppercase;";
    sBtn.innerText = "СЕКРЕТ";
    sBtn.onmouseenter = () => sBtn.style.transform = "scale(1.1)";
    sBtn.onmouseleave = () => sBtn.style.transform = "scale(1)";
    document.body.appendChild(sBtn);

    // Бело-зеленое модальное окно
    const modal = document.createElement('div');
    modal.id = "ivan-modal";
    modal.style = "display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.9); z-index:10000; align-items:center; justify-content:center;";
    modal.innerHTML = `
        <div style="background:#fff; padding:30px; border: 5px solid #008000; border-radius:25px; position:relative; text-align:center; color:#008000; box-shadow: 0 10px 50px rgba(0,0,0,0.2); max-width:85%;">
            <span onclick="document.getElementById('ivan-modal').style.display='none'" style="position:absolute; top:5px; right:20px; cursor:pointer; font-size:50px; font-weight:bold;">&times;</span>
            <h1 style="letter-spacing:8px; margin-bottom:20px;">СЕКРЕТ</h1>
            <div style="display:flex; align-items:center; justify-content:center; gap:20px;">
                <button id="prev" style="background:#008000; border:none; color:#fff; font-size:30px; cursor:pointer; width:50px; height:50px; border-radius:50%;">&larr;</button>
                <img id="m-img" src="/vanya.jpg" style="max-height:60vh; border: 4px solid #008000; border-radius:15px; max-width:75%;">
                <button id="next" style="background:#008000; border:none; color:#fff; font-size:30px; cursor:pointer; width:50px; height:50px; border-radius:50%;">&rarr;</button>
            </div>
            <p style="font-size:22px; margin-top:25px; font-weight:bold; font-family: serif;">Самые хорошие воспоминания в группе 301э</p>
            <p id="p-count" style="color:#666; font-family: monospace; margin-top:10px;">1 / 1</p>
        </div>`;
    document.body.appendChild(modal);

    const mImg = document.getElementById('m-img');
    const update = () => { 
        mImg.src = `/${currentPhotoIndex}.jpg`; 
        mImg.onerror = () => { mImg.src = '/vanya.jpg'; }; // Заглушка, если файла нет
        document.getElementById('p-count').innerText = `${currentPhotoIndex} / ${totalPhotos}`; 
    };
    document.getElementById('next').onclick = () => { currentPhotoIndex = currentPhotoIndex % totalPhotos + 1; update(); };
    document.getElementById('prev').onclick = () => { currentPhotoIndex = currentPhotoIndex === 1 ? totalPhotos : currentPhotoIndex - 1; update(); };
    sBtn.onclick = () => { modal.style.display = 'flex'; update(); };

    ['v-h','v-p','v-t','v-pl','v-pk'].forEach(id => document.getElementById(id).onchange = refresh);
    refresh();
    map.setBounds(map.geoObjects.getBounds(), { zoomMargin: 100 });
}

