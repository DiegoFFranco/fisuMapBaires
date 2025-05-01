let latitude, longitude;
let currentMarker = null;
let isEditing = false;
let currentImages = [];
let currentImageIndex = -1;
let lastUsedCategory = null;
let lastCreatedLayer = null;
let previousSelectedLayers = [];
let hasAddedPoint = false;
let currentPointId = null;
let imageCache = new Map(); // Caché para thumbnails
let fullUrls = new Map(); // Almacenar URLs full temporalmente

function truncateUrl(url, maxLength = 30) {
  if (url.length > maxLength) {
    return url.substring(0, maxLength - 3) + '...';
  }
  return url;
}

const map = L.map('mapContainer').setView([-34.6, -58.4], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

const iconBase = 'img/marker-icon-2x-';
const shadowBase = 'img/marker-shadow.png';

const icons = {
  'fisuras': L.icon({ iconUrl: `${iconBase}red.png`, shadowUrl: shadowBase, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] }),
  'limpieza': L.icon({ iconUrl: `${iconBase}green.png`, shadowUrl: shadowBase, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] }),
  'trapitos': L.icon({ iconUrl: `${iconBase}yellow.png`, shadowUrl: shadowBase, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] }),
  'narcomenudeo': L.icon({ iconUrl: `${iconBase}violet.png`, shadowUrl: shadowBase, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] }),
  'casas-tomadas': L.icon({ iconUrl: `${iconBase}orange.png`, shadowUrl: shadowBase, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] }),
  'comercios-fisuras': L.icon({ iconUrl: `${iconBase}brown.png`, shadowUrl: shadowBase, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] }),
  'via-publica': L.icon({ iconUrl: `${iconBase}grey.png`, shadowUrl: shadowBase, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] }),
  'comisarias': L.icon({ iconUrl: `${iconBase}blue.png`, shadowUrl: shadowBase, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] })
};

const layersConfig = {
  'fisuras': { color: 'red' },
  'limpieza': { color: 'green' },
  'trapitos': { color: 'yellow' },
  'narcomenudeo': { color: 'purple' },
  'casas-tomadas': { color: 'orange' },
  'comercios-fisuras': { color: 'brown' },
  'via-publica': { color: 'gray' },
  'comisarias': { color: 'blue' }
};

const clusterGroups = {};
Object.keys(layersConfig).forEach(layer => {
  clusterGroups[layer] = L.markerClusterGroup({
    iconCreateFunction: cluster => {
      return L.divIcon({
        html: `<span style="background-color: ${layersConfig[layer].color}; font-size: 16px; padding: 5px; color: white;">${cluster.getChildCount()}</span>`,
        className: 'marker-cluster',
        iconSize: L.point(40, 40)
      });
    }
  });
});

// Función para precargar thumbnails
function preloadThumbnails(images) {
    images.slice(0, 5).forEach(image => {
        if (!imageCache.has(image.thumbnail)) {
            const img = new Image();
            img.src = image.thumbnail;
            imageCache.set(image.thumbnail, img);
        }
    });
}

// Función para limpiar caché y URLs full
function clearImageCache(pointId) {
    if (pointId !== currentPointId) {
        imageCache.clear();
        fullUrls.clear();
        currentPointId = null;
        currentImages = [];
        currentImageIndex = -1;
    }
}

function createPopupContentDynamic(title, user, description, address, layer, imageUrls, status, horarios, id) {
  console.log(`Punto ${id} - Generando popup dinámico`, { title, user, description, address, layer, imageUrls, status, horarios });

  // Actualizar `fullUrls` con las URLs completas
  fullUrls.set(id, imageUrls.map(img => img.full));

  // Crear el contenedor principal del popup
  const container = L.DomUtil.create('div', 'custom-popup');
  container.style.backgroundColor = layersConfig[layer].color;

  // Agregar contenido estático
  const titleElement = L.DomUtil.create('span', 'title', container);
  titleElement.textContent = title;

  const userElement = L.DomUtil.create('div', 'detail', container);
  userElement.innerHTML = `<b>Usuario:</b> ${user}`;

  const descriptionElement = L.DomUtil.create('div', 'detail', container);
  descriptionElement.innerHTML = `<b>Descripción:</b> ${description || 'Sin descripción'}`;

  const addressElement = L.DomUtil.create('div', 'detail', container);
  addressElement.innerHTML = `<b>Dirección:</b> ${address || 'Sin dirección'}`;

  const statusElement = L.DomUtil.create('div', 'detail', container);
  statusElement.innerHTML = `<b>Estado:</b> ${status}`;

  // Agregar contenedor de imágenes
  if (imageUrls.length > 0) {
    const imageContainer = L.DomUtil.create('div', 'popup-image-container', container);

    const imgElement = L.DomUtil.create('img', 'popup-image', imageContainer);
    imgElement.src = imageUrls[0].thumbnail;
    imgElement.alt = 'Imagen del punto';
    imgElement.dataset.index = 0;

    const counterElement = L.DomUtil.create('div', 'popup-image-counter', imageContainer);
    counterElement.textContent = `1 de ${imageUrls.length}`;

    if (imageUrls.length > 1) {
      const prevButton = L.DomUtil.create('span', 'popup-image-nav prev', imageContainer);
      prevButton.textContent = '◄';
      prevButton.onclick = () => navigatePopupImages(-1, id, layer, container);

      const nextButton = L.DomUtil.create('span', 'popup-image-nav next', imageContainer);
      nextButton.textContent = '►';
      nextButton.onclick = () => navigatePopupImages(1, id, layer, container);
    }
  } else {
    const noImageElement = L.DomUtil.create('div', 'popup-no-image', container);
    noImageElement.textContent = 'No hay imágenes disponibles';
  }

  return container;
}

function createPopupContent(title, user, description, address, layer, imageUrls, status, horarios, id) {
  console.log(`Punto ${id} - Generando popup`, { title, user, description, address, layer, imageUrls, status, horarios });

  // Actualizar `currentPointId` y `currentImages`
  currentPointId = id;
  currentImages = imageUrls;
  currentImageIndex = imageUrls.length > 0 ? 0 : -1;

  // Actualizar `fullUrls` con las URLs completas
  fullUrls.set(id, imageUrls.map(img => img.full));

  let imageContent = '';
  if (imageUrls.length > 0) {
    imageContent = `
      <div class="popup-image-container">
        <img class="popup-image" src="${imageUrls[0].thumbnail}" alt="Imagen del punto" data-index="0" data-layer="${layer}" data-id="${id}">
        <div class="popup-image-counter">1 de ${imageUrls.length}</div>
        ${imageUrls.length > 1 ? `
          <span class="popup-image-nav prev" onclick="navigatePopupImages(-1, '${id}', '${layer}')">◄</span>
          <span class="popup-image-nav next" onclick="navigatePopupImages(1, '${id}', '${layer}')">►</span>
        ` : ''}
      </div>
    `;
  } else {
    imageContent = `<div class="popup-no-image">No hay imágenes disponibles</div>`;
  }

  let popupContent = `
    <div class="custom-popup" style="background-color: ${layersConfig[layer].color};">
      <span class="title">${title}</span>
      <div class="detail"><b>Usuario:</b> ${user}</div>
      <div class="detail"><b>Descripción:</b> ${description || 'Sin descripción'}</div>
      <div class="detail"><b>Dirección:</b> ${address || 'Sin dirección'}</div>
      <div class="detail"><b>Estado:</b> ${status}</div>
      ${imageContent}
    </div>
  `;
  return popupContent;
}

function attachPopupImageEvents(popup, imageUrls, layer, pointId) {
  const imgElement = popup.querySelector('.popup-image');
  if (imgElement) {
    imgElement.onclick = () => {
      console.log(`Punto ${pointId} - Clic en imagen del popup [index: ${currentImageIndex}]: ${currentImages[currentImageIndex]?.full}`);
      showOverlay(imageUrls, layer, currentImageIndex, pointId);
    };
    console.log(`Punto ${pointId} - Evento de clic asignado a imagen del popup [index: ${currentImageIndex}]`);
  } else {
    console.error(`Punto ${pointId} - No se encontró la imagen para asignar evento de clic`);
  }
}

function navigatePopupImages(direction, pointId, layer, container) {
  if (pointId !== currentPointId) {
    console.warn(`Punto ${pointId} - Actualizando currentPointId para sincronizar con el popup actual.`);
    currentPointId = pointId;
    currentImages = fullUrls.get(pointId) || [];
    currentImageIndex = 0;
  }

  if (!currentImages || currentImages.length === 0) {
    console.error(`Punto ${pointId} - Estado inválido: sin imágenes disponibles`);
    return;
  }

  currentImageIndex = (currentImageIndex + direction + currentImages.length) % currentImages.length;

  const imgElement = container.querySelector('.popup-image');
  const counterElement = container.querySelector('.popup-image-counter');

  if (imgElement && counterElement) {
    imgElement.src = currentImages[currentImageIndex].thumbnail;
    imgElement.dataset.index = currentImageIndex;
    counterElement.textContent = `${currentImageIndex + 1} de ${currentImages.length}`;
    console.log(`Punto ${pointId} - Imagen actualizada en popup [index: ${currentImageIndex}]: ${currentImages[currentImageIndex].thumbnail}`);
  } else {
    console.error(`Punto ${pointId} - No se encontró el contenedor de la imagen o el contador`);
  }
}

function hideOverlay() {
  const overlay = document.getElementById('imageOverlay');
  overlay.style.display = 'none';
  overlay.innerHTML = '';
  console.log('Overlay ocultado');
}

function showOverlay(imageUrls, layer, index, pointId) {
  if (!imageUrls || imageUrls.length === 0) {
    console.error(`Punto ${pointId} - No hay imágenes disponibles para mostrar en overlay`);
    return;
  }
  if (!fullUrls.has(pointId)) {
    console.error(`Punto ${pointId} - No se encontraron URLs completas en fullUrls`);
    return;
  }

  currentImages = imageUrls;
  currentImageIndex = index;
  const overlay = document.getElementById('imageOverlay');
  const fullImageUrl = fullUrls.get(pointId)[index];

  console.log(`Punto ${pointId} - Mostrando overlay con imagen [index: ${index}]: ${fullImageUrl}`);

  const navButtons = imageUrls.length > 1 ? `
    <span class="nav-arrow prev" onclick="navigateImages(-1, '${layer}', '${pointId}'); event.stopPropagation();">◄</span>
    <span class="nav-arrow next" onclick="navigateImages(1, '${layer}', '${pointId}'); event.stopPropagation();">►</span>
  ` : '';

  overlay.innerHTML = `
    ${navButtons}
    <img src="${fullImageUrl}" style="border-color: ${layersConfig[layer].color}">
  `;
  overlay.style.display = 'flex';
}

function navigateImages(direction, layer, pointId) {
  if (!currentImages || currentImages.length === 0 || !fullUrls.has(pointId)) {
    console.log(`Punto ${pointId} - No hay imágenes para navegar en overlay`);
    return;
  }
  currentImageIndex = (currentImageIndex + direction + currentImages.length) % currentImages.length;
  const url = fullUrls.get(pointId)[currentImageIndex];
  console.log(`Punto ${pointId} - Navegando en overlay a imagen [index: ${currentImageIndex}]: ${url}`);

  const overlay = document.getElementById('imageOverlay');
  const navButtons = currentImages.length > 1 ? `
    <span class="nav-arrow prev" onclick="navigateImages(-1, '${layer}', '${pointId}'); event.stopPropagation();">◄</span>
    <span class="nav-arrow next" onclick="navigateImages(1, '${layer}', '${pointId}'); event.stopPropagation();">►</span>
  ` : '';

  overlay.innerHTML = `
    ${navButtons}
    <img src="${url}" style="border-color: ${layersConfig[layer].color}">
  `;
  console.log(`Punto ${pointId} - Mostrando imagen en overlay [index: ${currentImageIndex}]: ${url}`);
}

async function loadPoints() {
  console.log('Iniciando carga de puntos...');
  Object.keys(clusterGroups).forEach(layer => {
    clusterGroups[layer].clearLayers();
    document.getElementById(`${layer}Count`).textContent = `(0)`;
  });

  try {
    const colRef = collection(db, 'points');
    const snapshot = await getDocs(colRef);
    console.log('Documentos obtenidos:', snapshot.docs.length);

    const counts = {
      'fisuras': 0, 'limpieza': 0, 'trapitos': 0, 'narcomenudeo': 0,
      'casas-tomadas': 0, 'comercios-fisuras': 0, 'via-publica': 0, 'comisarias': 0
    };

    const features = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log(`Punto ${doc.id} - Datos completos:`, JSON.stringify(data, null, 2));

      const category = data.properties?.category || 'fisuras';
      counts[category]++;

      const imageUrls = (data.properties?.imageUrls || data.imageUrls || []).map(url => ({
        thumbnail: url.thumbnail || url.full,
        full: url.full || url.thumbnail
      }));

      console.log(`Punto ${doc.id} - Imágenes procesadas:`, JSON.stringify(imageUrls.map((img, index) => ({ index, thumbnail: img.thumbnail, full: img.full })), null, 2));

      return {
        type: data.type || 'Feature',
        geometry: data.geometry || { type: 'Point', coordinates: [0, 0] },
        properties: {
          name: data.properties?.name || data.name || 'Sin título',
          description: data.properties?.description || data.description || '',
          user: data.properties?.user || data.user || 'Anónimo',
          address: data.properties?.address || data.address || 'Sin dirección',
          imageUrls: imageUrls,
          category: category,
          status: data.properties?.status || 'verificado',
          horarios: data.properties?.horarios || {},
          id: doc.id
        }
      };
    });

    const geojson = { type: 'FeatureCollection', features: features };
    console.log('GeoJSON generado:', geojson);

    L.geoJSON(geojson, {
      pointToLayer: (feature, latlng) => {
        const category = feature.properties.category;
        return L.marker(latlng, { icon: icons[category] });
      },
      /* onEachFeature: (feature, layerFeature) => {
        const { name, description, user, address, imageUrls, category, status, horarios, id } = feature.properties;
        const popupContent = createPopupContent(name, user, description, address, category, imageUrls, status, horarios, id);
        layerFeature.bindPopup(popupContent, { className: '' });
        layerFeature.on('popupopen', (e) => {
          const popupElement = e.popup._contentNode.querySelector('.custom-popup');
          if (popupElement && imageUrls.length > 0) {
            attachPopupImageEvents(popupElement, imageUrls, category, id);
          } else {
            console.log(`Punto ${id} - No se asignaron eventos de imagen (sin imágenes o popup no encontrado)`);
          }
        });
        layerFeature.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
        });
        clusterGroups[category].addLayer(layerFeature);
      } */
        onEachFeature: (feature, layerFeature) => {
          const { name, description, user, address, imageUrls, category, status, horarios, id } = feature.properties;
          const popupContent = createPopupContentDynamic(name, user, description, address, category, imageUrls, status, horarios, id);
        
          // Vincular el popup al marcador
          layerFeature.bindPopup(popupContent, { className: '' });
        
          // Agregar el marcador al clusterGroup correspondiente
          if (clusterGroups[category]) {
            clusterGroups[category].addLayer(layerFeature);
          } else {
            console.error(`Categoría no encontrada en clusterGroups: ${category}`);
          }
        }
    });

    Object.keys(counts).forEach(layer => {
      document.getElementById(`${layer}Count`).textContent = `(${counts[layer]})`;
      if (document.getElementById(`${layer}Check`).checked) {
        clusterGroups[layer].addTo(map);
      }
    });
  } catch (error) {
    console.error('Error al cargar puntos desde Firestore:', error);
    alert('Error cargando puntos. Por favor, intentá de nuevo más tarde.');
  }
}

async function geocodeAddress() {
  console.log('Botón de búsqueda clicado, ejecutando geocodeAddress...');
  const address = document.getElementById('addressInput').value;
  if (!address) {
    alert('Ingresá una dirección para buscar.');
    return;
  }
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
    const data = await response.json();
    if (data.length > 0) {
      latitude = parseFloat(data[0].lat);
      longitude = parseFloat(data[0].lon);
      if (currentMarker) map.removeLayer(currentMarker);
      const selectedLayer = document.getElementById('layerSelect').value;
      currentMarker = L.marker([latitude, longitude], { icon: icons[selectedLayer] }).addTo(map);
      map.setView([latitude, longitude], 15);
      document.getElementById('addressInput').value = data[0].display_name;
    } else {
      alert('No se encontró la dirección.');
    }
  } catch (e) {
    console.error('Error en geolocalización:', e);
    alert('Error buscando la dirección.');
  }
}

function getCurrentLocation() {
  console.log('Botón de ubicación actual clicado, ejecutando getCurrentLocation...');
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        if (currentMarker) map.removeLayer(currentMarker);
        const selectedLayer = document.getElementById('layerSelect').value;
        currentMarker = L.marker([latitude, longitude], { icon: icons[selectedLayer] }).addTo(map);
        map.setView([latitude, longitude], 15);
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await response.json();
          document.getElementById('addressInput').value = data.display_name || `Lat: ${latitude}, Lon: ${longitude}`;
        } catch (e) {
          console.error('Error en geocodificación inversa:', e);
          document.getElementById('addressInput').value = `Lat: ${latitude}, Lon: ${longitude}`;
        }
      },
      (error) => {
        console.error('Error en ubicación actual:', error);
        alert('No se pudo obtener tu ubicación. Asegurate de permitir el acceso.');
      }
    );
  } else {
    alert('Tu navegador no soporta geolocalización.');
  }
}

function updateEditorLayer() {
  if (isEditing) {
    const selectedLayer = document.getElementById('layerSelect').value;
    Object.keys(clusterGroups).forEach(layer => {
      if (map.hasLayer(clusterGroups[layer])) {
        map.removeLayer(clusterGroups[layer]);
      }
    });
    clusterGroups[selectedLayer].addTo(map);
    if (currentMarker && latitude && longitude) {
      map.removeLayer(currentMarker);
      currentMarker = L.marker([latitude, longitude], { icon: icons[selectedLayer] }).addTo(map);
    }
    const horariosSection = document.getElementById('horariosSection');
    if (selectedLayer === 'comercios-fisuras') {
      horariosSection.style.display = 'block';
      toggleScheduleFields();
    } else {
      horariosSection.style.display = 'none';
    }
  }
}

function enableMapClick() {
  map.off('click');
  map.on('click', async (event) => {
    if (isEditing) {
      latitude = event.latlng.lat;
      longitude = event.latlng.lng;
      if (currentMarker) map.removeLayer(currentMarker);
      const selectedLayer = document.getElementById('layerSelect').value;
      currentMarker = L.marker([latitude, longitude], { icon: icons[selectedLayer] }).addTo(map);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
        const data = await response.json();
        document.getElementById('addressInput').value = data.display_name || `Lat: ${latitude}, Lon: ${longitude}`;
      } catch (e) {
        console.error('Error en geocodificación inversa:', e);
        document.getElementById('addressInput').value = `Lat: ${latitude}, Lon: ${longitude}`;
      }
    }
  });
}

function toggleMode(category) {
  console.log('Entrando a toggleMode, isEditing:', isEditing);
  const addPointBtn = document.getElementById('addPointBtn');

  if (isEditing) {
    document.getElementById('pointForm').style.display = 'none';
    document.getElementById('layerControls').style.display = 'block';
    document.getElementById('selectAllBtn').style.display = 'inline-block';
    document.getElementById('deselectAllBtn').style.display = 'inline-block';
    addPointBtn.textContent = 'Agregar Punto';
    document.getElementById('horariosSection').style.display = 'none';
    isEditing = false;

    if (hasAddedPoint) {
      if (category) {
        lastCreatedLayer = category;
      }
      if (lastCreatedLayer) {
        Object.keys(clusterGroups).forEach(layer => {
          const checkbox = document.getElementById(`${layer}Check`);
          if (layer === lastCreatedLayer) {
            checkbox.checked = true;
            clusterGroups[layer].addTo(map);
          } else {
            checkbox.checked = false;
            map.removeLayer(clusterGroups[layer]);
          }
        });
      }
    } else {
      Object.keys(clusterGroups).forEach(layer => {
        const checkbox = document.getElementById(`${layer}Check`);
        if (previousSelectedLayers.includes(layer)) {
          checkbox.checked = true;
          clusterGroups[layer].addTo(map);
        } else {
          checkbox.checked = false;
          map.removeLayer(clusterGroups[layer]);
        }
      });
    }

    map.off('click');

    if (currentMarker) {
      map.removeLayer(currentMarker);
      currentMarker = null;
    }

    document.getElementById('modeTitle').textContent = 'fisuMapBaires - Modo Visor';
  } else {
    previousSelectedLayers = [];
    Object.keys(clusterGroups).forEach(layer => {
      const checkbox = document.getElementById(`${layer}Check`);
      if (checkbox.checked) {
        previousSelectedLayers.push(layer);
      }
    });
    console.log('Capas seleccionadas guardadas en previousSelectedLayers:', previousSelectedLayers);
    hasAddedPoint = false;

    document.getElementById('pointForm').style.display = 'block';
    document.getElementById('layerControls').style.display = 'none';
    document.getElementById('selectAllBtn').style.display = 'none';
    document.getElementById('deselectAllBtn').style.display = 'none';
    addPointBtn.textContent = 'Volver a Visor';

    map.closePopup();

    resetForm();

    isEditing = true;

    const selectedCategory = document.getElementById('layerSelect').value;
    Object.keys(clusterGroups).forEach(layer => {
      if (layer === selectedCategory) {
        clusterGroups[layer].addTo(map);
      } else {
        map.removeLayer(clusterGroups[layer]);
      }
    });

    enableMapClick();

    const horariosSection = document.getElementById('horariosSection');
    if (selectedCategory === 'comercios-fisuras') {
      horariosSection.style.display = 'block';
      toggleScheduleFields();
    } else {
      horariosSection.style.display = 'none';
    }

    document.getElementById('modeTitle').textContent = 'fisuMapBaires - Modo Editor';
  }
}

function showSuccessOverlay() {
  const successOverlay = document.getElementById('successOverlay');
  successOverlay.style.display = 'flex';
  setTimeout(() => {
    successOverlay.style.display = 'none';
  }, 3000);
  successOverlay.addEventListener('click', function hideOnClick() {
    successOverlay.style.display = 'none';
    successOverlay.removeEventListener('click', hideOnClick);
  });
}

async function submitPoint() {
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;

  const category = document.getElementById('layerSelect').value;
  const user = document.getElementById('userInput').value || 'Anónimo';
  const title = document.getElementById('titleInput').value;
  const description = document.getElementById('descriptionInput').value;
  const address = document.getElementById('addressInput').value;
  const photoInput = document.getElementById('photoInput');
  const files = photoInput.files;

  if (!latitude || !longitude) {
    alert('Hacé clic en el mapa, buscá una dirección o usá tu ubicación actual.');
    submitBtn.disabled = false;
    return;
  }
  if (!title) {
    alert('Ingresá un título para el punto.');
    submitBtn.disabled = false;
    return;
  }
  if (files.length > 5) {
    alert('Máximo 5 fotos permitidas.');
    submitBtn.disabled = false;
    return;
  }
  if (files.length > 0) {
    for (const file of files) {
      const validTypes = ['image/jpeg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        alert(`Formato no soportado: ${file.name}. Usá JPG o PNG.`);
        submitBtn.disabled = false;
        return;
      }
    }
  }

  document.getElementById('savingMessage').style.display = 'block';

  let imageUrls = [];
  if (files.length > 0) {
    for (const file of files) {
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      try {
        const base64Image = await base64Promise;
        const randomSuffix = Math.random().toString(36).substring(2, 5);
        const uniqueFilename = `${file.name.split('.')[0]}-${randomSuffix}.${file.name.split('.').pop()}`;

        const response = await fetch('/.netlify/functions/upload-to-services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image, filename: uniqueFilename })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Error al subir la imagen');
        }

        imageUrls.push({
          thumbnail: data.thumbnail || data.url || data.full || data,
          full: data.full || data.url || data.thumbnail || data
        });
      } catch (e) {
        console.error('Error al subir imagen:', e);
        alert(`Error subiendo una foto: ${e.message}. Revisá los formatos e intentá de nuevo.`);
        submitBtn.disabled = false;
        document.getElementById('savingMessage').style.display = 'none';
        return;
      }
    }
  } else {
    imageUrls.push({ thumbnail: 'https://i.imgur.com/bLBkpWR.png', full: 'https://i.imgur.com/bLBkpWR.png' });
  }

  let horarios = {};
  if (category === 'comercios-fisuras') {
    const sameSchedule = document.getElementById('sameSchedule').checked;
    if (sameSchedule) {
      const apertura = document.getElementById('sameApertura').value;
      const cierre = document.getElementById('sameCierre').value;
      horarios = {
        lunesAViernes: { apertura, cierre },
        sabado: { apertura, cierre },
        domingo: { apertura, cierre }
      };
    } else {
      const lvApertura = document.getElementById('lvApertura').value;
      const lvCierre = document.getElementById('lvCierre').value;
      const sabCerrado = document.getElementById('sabCerrado').checked;
      const sabApertura = sabCerrado ? '' : document.getElementById('sabApertura').value;
      const sabCierre = sabCerrado ? '' : document.getElementById('sabCierre').value;
      const domCerrado = document.getElementById('domCerrado').checked;
      const domApertura = domCerrado ? '' : document.getElementById('domApertura').value;
      const domCierre = domCerrado ? '' : document.getElementById('domCierre').value;
      horarios = {
        lunesAViernes: { apertura: lvApertura, cierre: lvCierre },
        sabado: { apertura: sabApertura, cierre: sabCierre },
        domingo: { apertura: domApertura, cierre: domCierre }
      };
    }
  }

  const pointData = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [longitude, latitude] },
    properties: {
      name: title,
      description: description,
      user: user,      
      address: address || 'Sin dirección',
      imageUrls: imageUrls,
      timestamp: serverTimestamp(),
      category: category,
      status: 'temporal',
      horarios: horarios
    }  
  };

  console.log('Punto enviado:', pointData);

  try {
    const colRef = collection(db, 'points');
    const docRef = await addDoc(colRef, pointData);
    const id = docRef.id;
    console.log('Punto guardado en Firestore con Id:', id);

    const marker = L.marker([latitude, longitude], { icon: icons[category] });
    marker.bindPopup(createPopupContent(title, user, description, address, category, imageUrls, 'temporal', horarios, id), { className: '' });
    marker.on('popupopen', (e) => {
      const popupElement = e.popup._contentNode.querySelector('.custom-popup');
      if (popupElement && imageUrls.length > 0) {
        attachPopupImageEvents(popupElement, imageUrls, category, id);
      } else {
        console.log(`Punto ${id} - No se asignaron eventos de imagen (sin imágenes o popup no encontrado)`);
      }
    });
    marker.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
    });
    clusterGroups[category].addLayer(marker);
    if (!map.hasLayer(clusterGroups[category])) {
      clusterGroups[category].addTo(map);
    }

    const countElement = document.getElementById(`${category}Count`);
    const currentCount = parseInt(countElement.textContent.replace(/[()]/g, '')) || 0;
    countElement.textContent = `(${currentCount + 1})`;

    lastUsedCategory = category;
    showSuccessOverlay();
    hasAddedPoint = true;

    toggleMode(category);
    marker.openPopup();
  } catch (error) {
    console.error('Error al guardar en Firestore:', error);
    alert(`Error al enviar: ${error.message}`);
  }

  submitBtn.disabled = false;
  document.getElementById('savingMessage').style.display = 'none';
}

function updateLayers() {
  Object.keys(clusterGroups).forEach(layer => {
    const checkbox = document.getElementById(`${layer}Check`);
    if (checkbox.checked) {
      if (!map.hasLayer(clusterGroups[layer])) {
        clusterGroups[layer].addTo(map);
      }
    } else {
      if (map.hasLayer(clusterGroups[layer])) {
        map.removeLayer(clusterGroups[layer]);
      }
    }
  });
}

function selectAllLayers() {
  Object.keys(clusterGroups).forEach(layer => {
    const checkbox = document.getElementById(`${layer}Check`);
    checkbox.checked = true;
    clusterGroups[layer].addTo(map);
  });
}

function deselectAllLayers() {
  Object.keys(clusterGroups).forEach(layer => {
    const checkbox = document.getElementById(`${layer}Check`);
    checkbox.checked = false;
    map.removeLayer(clusterGroups[layer]);
  });
}

function toggleScheduleFields() {
  const sameSchedule = document.getElementById('sameSchedule').checked;
  const sameScheduleFields = document.getElementById('sameScheduleFields');
  const differentScheduleFields = document.getElementById('differentScheduleFields');

  if (sameSchedule) {
    sameScheduleFields.style.display = 'block';
    differentScheduleFields.style.display = 'none';
  } else {
    sameScheduleFields.style.display = 'none';
    differentScheduleFields.style.display = 'block';
    toggleSabadoFields();
    toggleDomingoFields();
  }
}

function toggleSabadoFields() {
  const sabCerrado = document.getElementById('sabCerrado').checked;
  const sabApertura = document.getElementById('sabApertura');
  const sabCierre = document.getElementById('sabCierre');

  if (sabCerrado) {
    sabApertura.disabled = true;
    sabCierre.disabled = true;
    sabApertura.value = '';
    sabCierre.value = '';
  } else {
    sabApertura.disabled = false;
    sabCierre.disabled = false;
  }
}

function toggleDomingoFields() {
  const domCerrado = document.getElementById('domCerrado').checked;
  const domApertura = document.getElementById('domApertura');
  const domCierre = document.getElementById('domCierre');

  if (domCerrado) {
    domApertura.disabled = true;
    domCierre.disabled = true;
    domApertura.value = '';
    domCierre.value = '';
  } else {
    domApertura.disabled = false;
    domCierre.disabled = false;
  }
}

function resetForm() {
  console.log('Ejecutando resetForm...');
  latitude = null;
  longitude = null;
  document.getElementById('addressInput').value = '';
  document.getElementById('userInput').value = '';
  document.getElementById('titleInput').value = '';
  document.getElementById('descriptionInput').value = '';
  document.getElementById('photoInput').value = '';

  let selectedCategory = 'fisuras';
  if (!isEditing) {
    let selectedLayersCount = 0;
    let selectedLayer = null;
    Object.keys(clusterGroups).forEach(layer => {
      const checkbox = document.getElementById(`${layer}Check`);
      if (checkbox?.checked) {
        selectedLayersCount++;
        selectedLayer = layer;
      }
    });
    if (selectedLayersCount === 1) {
      selectedCategory = selectedLayer;
    }
  } else if (lastUsedCategory) {
    selectedCategory = lastUsedCategory;
  }

  document.getElementById('layerSelect').value = selectedCategory;

  const sameSchedule = document.getElementById('sameSchedule');
  const sameApertura = document.getElementById('sameApertura');
  const sameCierre = document.getElementById('sameCierre');
  const lvApertura = document.getElementById('lvApertura');
  const lvCierre = document.getElementById('lvCierre');
  const sabCerrado = document.getElementById('sabCerrado');
  const sabApertura = document.getElementById('sabApertura');
  const sabCierre = document.getElementById('sabCierre');
  const domCerrado = document.getElementById('domCerrado');
  const domApertura = document.getElementById('domApertura');
  const domCierre = document.getElementById('domCierre');

  sameSchedule.checked = false;
  sameApertura.value = '';
  sameCierre.value = '';
  lvApertura.value = '';
  lvCierre.value = '';
  sabCerrado.checked = false;
  sabApertura.value = '';
  sabCierre.value = '';
  domCerrado.checked = false;
  domApertura.value = '';
  domCierre.value = '';

  const horariosSection = document.getElementById('horariosSection');
  if (selectedCategory === 'comercios-fisuras') {
    horariosSection.style.display = 'block';
    toggleScheduleFields();
  } else {
    horariosSection.style.display = 'none';
  }
}

const layerSelect = document.getElementById('layerSelect');
if (layerSelect) layerSelect.addEventListener('change', updateEditorLayer);

const addPointBtn = document.getElementById('addPointBtn');
if (addPointBtn) addPointBtn.addEventListener('click', () => toggleMode());

const submitBtn = document.getElementById('submitBtn');
if (submitBtn) submitBtn.addEventListener('click', submitPoint);

const searchAddressBtn = document.getElementById('searchAddressBtn');
if (searchAddressBtn) {
  searchAddressBtn.addEventListener('click', (e) => {
    e.preventDefault();
    geocodeAddress();
  });
}

const currentLocationBtn = document.getElementById('currentLocationBtn');
if (currentLocationBtn) {
  currentLocationBtn.addEventListener('click', (e) => {
    e.preventDefault();
    getCurrentLocation();
  });
}

// Limpiar caché al cerrar popup
map.on('popupclose', () => {
    clearImageCache(currentPointId);
});

window.startApp = function () {
  console.log('Iniciando la app...');
  loadPoints();
};

window.selectAllLayers = selectAllLayers;
window.deselectAllLayers = deselectAllLayers;
window.updateLayers = updateLayers;
window.toggleScheduleFields = toggleScheduleFields;
window.toggleDomingoFields = toggleDomingoFields;
window.hideOverlay = hideOverlay;
window.navigateImages = navigateImages;
window.toggleSabadoFields = toggleSabadoFields;
window.navigatePopupImages = navigatePopupImages;