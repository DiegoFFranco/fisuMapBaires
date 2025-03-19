let latitude, longitude;
let currentMarker = null;
let isEditing = false;
let currentImages = [];
let currentImageIndex = -1;

// Inicializar el mapa
const map = L.map('mapContainer').setView([-34.6, -58.4], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// Definir los íconos
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

// Configuración de capas (eliminamos las URLs de Gists porque ahora usamos Firestore)
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

// Crear los grupos de clusters para cada capa
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

// Crear el contenido del popup
function createPopupContent(title, user, description, address, layer, imageUrls) {
  const isLightBackground = ['yellow', 'pink'].includes(layersConfig[layer].color);
  const popupColor = layersConfig[layer].color;
  // Limpiar la descripción para eliminar URLs de imágenes embebidas
  const cleanDescription = description.replace(/{{https:\/\/i\.imgur\.com\/\w+\.(?:jpg|png|jpeg|gif)}}/g, '').trim();
  return `
    <div class="custom-popup ${isLightBackground ? 'light-text' : 'dark-text'}" style="background-color: ${popupColor};">
      <span class="title">${title}</span>
      <div class="detail"><b>Usuario:</b> ${user}</div>
      <div class="detail"><b>Descripción:</b> ${cleanDescription || 'Sin descripción'}</div>
      <div class="detail"><b>Dirección:</b> ${address || 'Sin dirección'}</div>
    </div>
    <style>.leaflet-popup-tip { background-color: ${popupColor}; }</style>
  `;
}

// Mostrar detalles de las imágenes
function showDetails(imageUrls, layer) {
  if (!isEditing) {
    document.getElementById('pointDetails').style.display = 'block';
    const photoContainer = document.getElementById('photoContainer');
    photoContainer.innerHTML = '';
    imageUrls.forEach((url, index) => {
      const img = document.createElement('img');
      img.src = url;
      img.onclick = () => showOverlay(url, layer, imageUrls, index);
      photoContainer.appendChild(img);
    });
  }
}

// Ocultar el overlay de imágenes
function hideOverlay() {
  document.getElementById('imageOverlay').style.display = 'none';
}

// Mostrar el overlay de imágenes con navegación
function showOverlay(url, layer, imageUrls, index) {
  currentImages = imageUrls;
  currentImageIndex = index;
  const overlay = document.getElementById('imageOverlay');
  overlay.innerHTML = `
    <span class="nav-arrow prev" onclick="navigateImages(-1, '${layer}'); event.stopPropagation();">◄</span>
    <img src="${url}" style="border-color: ${layersConfig[layer].color}">
    <span class="nav-arrow next" onclick="navigateImages(1, '${layer}'); event.stopPropagation();">►</span>
  `;
  overlay.style.display = 'flex';
}

// Navegar entre imágenes en el overlay
function navigateImages(direction, layer) {
  currentImageIndex += direction;
  if (currentImageIndex < 0) currentImageIndex = currentImages.length - 1;
  if (currentImageIndex >= currentImages.length) currentImageIndex = 0;
  const overlay = document.getElementById('imageOverlay');
  overlay.innerHTML = `
    <span class="nav-arrow prev" onclick="navigateImages(-1, '${layer}'); event.stopPropagation();">◄</span>
    <img src="${currentImages[currentImageIndex]}" style="border-color: ${layersConfig[layer].color}">
    <span class="nav-arrow next" onclick="navigateImages(1, '${layer}'); event.stopPropagation();">►</span>
  `;
}

// Ocultar los detalles
function hideDetails() {
  document.getElementById('pointDetails').style.display = 'none';
}

// Cargar puntos desde Firestore
async function loadPoints() {
  for (const layer in layersConfig) {
    try {
      const colRef = collection(db, layer);
      const snapshot = await getDocs(colRef);
      clusterGroups[layer].clearLayers();
      let totalPoints = 0;

      const features = snapshot.docs.map(doc => {
        const data = doc.data();
        totalPoints++;
        return {
          type: data.type,
          geometry: data.geometry,
          properties: {
            ...data.properties,
            id: doc.id
          }
        };
      });

      const geojson = {
        type: 'FeatureCollection',
        features: features
      };

      L.geoJSON(geojson, {
        pointToLayer: (feature, latlng) => L.marker(latlng, { icon: icons[layer] }),
        onEachFeature: (feature, layerFeature) => {
          const { name, description, user, address, imageUrls } = feature.properties;
          layerFeature.bindPopup(createPopupContent(name, user, description, address, layer, imageUrls || []), { className: '' });
          layerFeature.on('click', (e) => {
            showDetails(imageUrls || [], layer);
            L.DomEvent.stopPropagation(e);
          });
        }
      }).addTo(clusterGroups[layer]);

      document.getElementById(`${layer}Count`).textContent = `(${totalPoints})`;
      if (document.getElementById(`${layer}Check`).checked) {
        clusterGroups[layer].addTo(map);
      }
    } catch (error) {
      console.error(`Error al cargar puntos para ${layer} desde Firestore:`, error);
      document.getElementById(`${layer}Count`).textContent = `(0)`;
    }
  }
}

// Habilitar el clic en el mapa para agregar puntos
function enableMapClick() {
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
    } else {
      hideDetails();
    }
  });
}

// Deshabilitar el clic en el mapa
function disableMapClick() {
  map.off('click');
  if (currentMarker) {
    map.removeLayer(currentMarker);
    currentMarker = null;
  }
}

// Geocodificar una dirección
async function geocodeAddress() {
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

// Obtener la ubicación actual del usuario
function getCurrentLocation() {
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

// Actualizar la capa en modo edición
function updateEditorLayer() {
  if (isEditing) {
    const selectedLayer = document.getElementById('layerSelect').value;
    Object.keys(clusterGroups).forEach(layer => {
      if (layer === selectedLayer) {
        clusterGroups[layer].addTo(map);
      } else {
        map.removeLayer(clusterGroups[layer]);
      }
    });
    if (currentMarker && latitude && longitude) {
      map.removeLayer(currentMarker);
      currentMarker = L.marker([latitude, longitude], { icon: icons[selectedLayer] }).addTo(map);
    }
  }
}

// Alternar entre modo visor y edición
function toggleMode(lastCreatedLayer = null) {
  if (isEditing) {
    isEditing = false;
    document.getElementById('modeTitle').textContent = 'fisuMapBaires - Modo Visor';
    document.getElementById('pointForm').style.display = 'none';
    document.getElementById('addPointBtn').textContent = 'Agregar Punto';
    document.getElementById('pointDetails').style.display = 'none';
    document.getElementById('layerControls').style.display = 'block';
    disableMapClick();
    enableMapClick();
    document.getElementById('addressInput').value = '';
    document.getElementById('userInput').value = '';
    document.getElementById('titleInput').value = '';
    document.getElementById('descriptionInput').value = '';
    document.getElementById('photoInput').value = '';
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
    } else {
      updateLayers();
    }
  } else {
    isEditing = true;
    document.getElementById('modeTitle').textContent = 'fisuMapBaires - Modo Edición';
    document.getElementById('pointForm').style.display = 'block';
    document.getElementById('addPointBtn').textContent = 'Volver a Visor';
    document.getElementById('pointDetails').style.display = 'none';
    document.getElementById('layerControls').style.display = 'none';
    enableMapClick();
    updateEditorLayer();
  }
}

// Guardar un punto en Firestore
async function submitPoint() {
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  document.getElementById('savingMessage').style.display = 'block';

  const layer = document.getElementById('layerSelect').value;
  const user = document.getElementById('userInput').value || 'Anónimo';
  const title = document.getElementById('titleInput').value;
  const description = document.getElementById('descriptionInput').value;
  const address = document.getElementById('addressInput').value;
  const photoInput = document.getElementById('photoInput');
  const files = photoInput.files;

  if (!latitude || !longitude) {
    alert('Hacé clic en el mapa, buscá una dirección o usá tu ubicación actual.');
    submitBtn.disabled = false;
    document.getElementById('savingMessage').style.display = 'none';
    return;
  }

  if (!title) {
    alert('Ingresá un título para el punto.');
    submitBtn.disabled = false;
    document.getElementById('savingMessage').style.display = 'none';
    return;
  }

  if (files.length > 5) {
    alert('Máximo 5 fotos permitidas.');
    submitBtn.disabled = false;
    document.getElementById('savingMessage').style.display = 'none';
    return;
  }

  let imageUrls = [];
  if (files.length > 0) {
    for (const file of files) {
      const validTypes = ['image/jpeg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        alert(`Formato no soportado: ${file.name}. Usá JPG o PNG.`);
        submitBtn.disabled = false;
        document.getElementById('savingMessage').style.display = 'none';
        return;
      }
      const formData = new FormData();
      formData.append('image', file);
      try {
        const response = await fetch('https://api.imgur.com/3/image', {
          method: 'POST',
          headers: { Authorization: 'Client-ID 724f0aaea5b4c6b' },
          body: formData
        });
        if (!response.ok) throw new Error(`Error en Imgur: ${response.status}`);
        const data = await response.json();
        if (data.success) imageUrls.push(data.data.link);
      } catch (e) {
        console.error('Error en Imgur:', e);
        alert(`Error subiendo una foto: ${e.message}. Revisá los formatos e intentá de nuevo.`);
        submitBtn.disabled = false;
        document.getElementById('savingMessage').style.display = 'none';
        return;
      }
    }
  } else {
    imageUrls.push('https://i.imgur.com/bLBkpWR.png'); // Imagen por defecto
  }

  const pointData = {
    type: "Feature",
    geometry: { type: "Point", coordinates: [longitude, latitude] },
    properties: {
      name: title,
      description: description,
      user: user,
      address: address || 'Sin dirección',
      imageUrls: imageUrls,
      timestamp: serverTimestamp()
    }
  };

  console.log('Punto enviado:', pointData);

  try {
    const colRef = collection(db, layer);
    await addDoc(colRef, pointData);
    console.log('Punto guardado en Firestore:', pointData);

    const marker = L.marker([latitude, longitude], { icon: icons[layer] });
    marker.bindPopup(createPopupContent(title, user, description, address, layer, imageUrls), { className: '' });
    marker.on('click', (e) => {
      showDetails(imageUrls, layer);
      L.DomEvent.stopPropagation(e);
    });
    clusterGroups[layer].addLayer(marker);
    if (!map.hasLayer(clusterGroups[layer])) {
      clusterGroups[layer].addTo(map);
    }

    const countElement = document.getElementById(`${layer}Count`);
    const currentCount = parseInt(countElement.textContent.replace(/[()]/g, '')) || 0;
    countElement.textContent = `(${currentCount + 1})`;

    alert('Punto enviado con éxito');
    toggleMode(layer);
    marker.openPopup();
    showDetails(imageUrls, layer);
  } catch (error) {
    console.error('Error al guardar en Firestore:', error);
    alert(`Error al enviar: ${error.message}`);
  }
  submitBtn.disabled = false;
  document.getElementById('savingMessage').style.display = 'none';
}

// Actualizar las capas visibles
function updateLayers() {
  Object.keys(clusterGroups).forEach(layer => {
    const checkbox = document.getElementById(`${layer}Check`);
    if (checkbox.checked) {
      if (!map.hasLayer(clusterGroups[layer])) {
        clusterGroups[layer].addTo(map);
      }
    } else {
      map.removeLayer(clusterGroups[layer]);
    }
  });
}

// Seleccionar todas las capas
function selectAllLayers() {
  Object.keys(clusterGroups).forEach(layer => {
    const checkbox = document.getElementById(`${layer}Check`);
    checkbox.checked = true;
    clusterGroups[layer].addTo(map);
  });
}

// Deseleccionar todas las capas
function deselectAllLayers() {
  Object.keys(clusterGroups).forEach(layer => {
    const checkbox = document.getElementById(`${layer}Check`);
    checkbox.checked = false;
    map.removeLayer(clusterGroups[layer]);
  });
  hideDetails();
}

// Escuchar cambios en el selector de capas
document.getElementById('layerSelect').addEventListener('change', updateEditorLayer);

// Inicializar la carga de puntos y habilitar el clic en el mapa
loadPoints();
enableMapClick();