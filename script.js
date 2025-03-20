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

// Configuración de capas
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
function createPopupContent(title, user, description, address, layer, imageUrls, status, horarios) {
  const isLightBackground = ['yellow', 'pink', 'orange'].includes(layersConfig[layer].color);
  const popupColor = layersConfig[layer].color;
  const cleanDescription = (description || '').replace(/{{https:\/\/i\.imgur\.com\/\w+\.(?:jpg|png|jpeg|gif)}}/g, '').trim();
  let popupContent = `
    <div class="custom-popup ${isLightBackground ? 'light-text' : 'dark-text'}" style="background-color: ${popupColor};">
      <span class="title">${title}</span>
      <div class="detail"><b>Usuario:</b> ${user}</div>
      <div class="detail"><b>Descripción:</b> ${cleanDescription || 'Sin descripción'}</div>
      <div class="detail"><b>Dirección:</b> ${address || 'Sin dirección'}</div>
      <div class="detail"><b>Estado:</b> ${status}</div>
  `;

  // Agregar horarios si es comercios-fisuras
  if (layer === 'comercios-fisuras' && horarios) {
    popupContent += `
      <div class="detail"><b>Horarios:</b><br>
      - Lunes a Viernes: ${horarios.lunesAViernes.apertura || 'Cerrado'} - ${horarios.lunesAViernes.cierre || ''}<br>
      - Sábado: ${horarios.sabado.apertura || 'Cerrado'} - ${horarios.sabado.cierre || ''}<br>
      - Domingo: ${horarios.domingo.apertura || 'Cerrado'} - ${horarios.domingo.cierre || ''}</div>
    `;
  }

  popupContent += `</div><style>.leaflet-popup-tip { background-color: ${popupColor}; }</style>`;
  return popupContent;
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

// Cargar puntos desde Firestore (usando una sola colección 'points')
async function loadPoints() {
  console.log('Iniciando carga de puntos...');
  // Limpiar todos los clusters
  Object.keys(clusterGroups).forEach(layer => {
    clusterGroups[layer].clearLayers();
    document.getElementById(`${layer}Count`).textContent = `(0)`; // Resetear conteos
  });

  try {
    console.log('Conectando a Firestore...');
    const colRef = collection(db, 'points');
    console.log('Obteniendo documentos de la colección "points"...');
    const snapshot = await getDocs(colRef);
    console.log('Documentos obtenidos:', snapshot.docs.length);

    const counts = {
      'fisuras': 0,
      'limpieza': 0,
      'trapitos': 0,
      'narcomenudeo': 0,
      'casas-tomadas': 0,
      'comercios-fisuras': 0,
      'via-publica': 0,
      'comisarias': 0
    };

    const features = snapshot.docs.map(doc => {
      const data = doc.data();
      const category = data.properties?.category || 'fisuras'; // Por defecto 'fisuras' si no tiene categoría
      counts[category]++; // Incrementar el conteo para la categoría

      console.log('Procesando documento:', doc.id, data);

      return {
        type: data.type || 'Feature',
        geometry: data.geometry || { type: 'Point', coordinates: [0, 0] },
        properties: {
          name: data.properties?.name || data.name || 'Sin título',
          description: data.properties?.description || data.description || '',
          user: data.properties?.user || data.user || 'Anónimo',
          address: data.properties?.address || data.address || 'Sin dirección',
          imageUrls: data.properties?.imageUrls || data.imageUrls || [],
          category: category,
          status: data.properties?.status || 'verificado', // Por defecto verificado para puntos antiguos
          horarios: data.properties?.horarios || {}, // Por defecto {} para puntos que no tienen horarios
          id: doc.id
        }
      };
    });

    const geojson = {
      type: 'FeatureCollection',
      features: features
    };

    console.log('GeoJSON generado:', geojson);

    L.geoJSON(geojson, {
      pointToLayer: (feature, latlng) => {
        const category = feature.properties.category;
        return L.marker(latlng, { icon: icons[category] });
      },
      onEachFeature: (feature, layerFeature) => {
        const { name, description, user, address, imageUrls, category, status, horarios } = feature.properties;
        layerFeature.bindPopup(createPopupContent(name, user, description, address, category, imageUrls || [], status, horarios), { className: '' });
        layerFeature.on('click', (e) => {
          showDetails(imageUrls || [], category);
          L.DomEvent.stopPropagation(e);
        });
        // Agregar el marcador al cluster correspondiente
        clusterGroups[category].addLayer(layerFeature);
      }
    });

    // Actualizar los conteos
    Object.keys(counts).forEach(layer => {
      document.getElementById(`${layer}Count`).textContent = `(${counts[layer]})`;
      if (document.getElementById(`${layer}Check`).checked) {
        clusterGroups[layer].addTo(map);
      }
    });
  } catch (error) {
    console.error('Error al cargar puntos desde Firestore:', error);
    Object.keys(clusterGroups).forEach(layer => {
      document.getElementById(`${layer}Count`).textContent = `(0)`;
    });
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

    // Mostrar/ocultar la sección de horarios según la categoría
    const horariosSection = document.getElementById('horariosSection');
    if (selectedLayer === 'comercios-fisuras') {
      horariosSection.style.display = 'block';
      // Inicializar el estado del formulario de horarios
      toggleScheduleFields();
    } else {
      horariosSection.style.display = 'none';
    }
  }
}

// Alternar entre modo visor y edición
function toggleMode(lastCreatedLayer = null) {
  console.log('Entrando a toggleMode, isEditing:', isEditing);
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
    // Resetear la ubicación y el marcador al entrar en modo editor
    latitude = null;
    longitude = null;
    if (currentMarker) {
      map.removeLayer(currentMarker);
      currentMarker = null;
    }
    enableMapClick();
    updateEditorLayer();
  }
}

// Guardar un punto en Firestore (usando una sola colección 'points')
async function submitPoint() {
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  document.getElementById('savingMessage').style.display = 'block';

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

      // Convertir la imagen a base64
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      try {
        const base64Image = await base64Promise;
        const response = await fetch('/.netlify/functions/upload-to-imgur', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ image: base64Image })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Error al subir la imagen');
        }

        imageUrls.push(data.imageUrl);
      } catch (e) {
        console.error('Error al subir a Imgur:', e);
        alert(`Error subiendo una foto: ${e.message}. Revisá los formatos e intentá de nuevo.`);
        submitBtn.disabled = false;
        document.getElementById('savingMessage').style.display = 'none';
        return;
      }
    }
  } else {
    imageUrls.push('https://i.imgur.com/bLBkpWR.png'); // Imagen por defecto
  }

  // Construir el objeto horarios si la categoría es comercios-fisuras
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
    type: "Feature",
    geometry: { type: "Point", coordinates: [longitude, latitude] },
    properties: {
      name: title,
      description: description,
      user: user,
      userId: 'user123', // Sin autenticación por ahora
      address: address || 'Sin dirección',
      imageUrls: imageUrls,
      timestamp: serverTimestamp(),
      category: category, // Agregamos el campo category
      status: 'temporal', // Agregamos el campo status
      horarios: horarios // Incluimos horarios (será {} si no es comercios-fisuras)
    }
  };

  console.log('Punto enviado:', pointData);

  try {
    const colRef = collection(db, 'points'); // Guardamos en la colección 'points'
    await addDoc(colRef, pointData);
    console.log('Punto guardado en Firestore:', pointData);

    const marker = L.marker([latitude, longitude], { icon: icons[category] });
    marker.bindPopup(createPopupContent(title, user, description, address, category, imageUrls, 'temporal', horarios), { className: '' });
    marker.on('click', (e) => {
      showDetails(imageUrls, category);
      L.DomEvent.stopPropagation(e);
    });
    clusterGroups[category].addLayer(marker);
    if (!map.hasLayer(clusterGroups[category])) {
      clusterGroups[category].addTo(map);
    }

    const countElement = document.getElementById(`${category}Count`);
    const currentCount = parseInt(countElement.textContent.replace(/[()]/g, '')) || 0;
    countElement.textContent = `(${currentCount + 1})`;

    alert('Punto enviado con éxito');
    toggleMode(category);
    marker.openPopup();
    showDetails(imageUrls, category);
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
      if (map.hasLayer(clusterGroups[layer])) {
        map.removeLayer(clusterGroups[layer]);
      }
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

// Mostrar/ocultar campos de horarios según el checkbox "Mismo horario"
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
    // Asegurarse de que los campos de sábado y domingo se actualicen según los checkboxes
    toggleSabadoFields();
    toggleDomingoFields();
  }
}

// Deshabilitar campos de sábado si está marcado como "Cerrado"
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

// Deshabilitar campos de domingo si está marcado como "Cerrado"
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

// Escuchar cambios en el selector de capas
document.getElementById('layerSelect').addEventListener('change', updateEditorLayer);

// Agregar evento al botón de agregar punto
document.getElementById('addPointBtn').addEventListener('click', toggleMode);
document.getElementById('submitBtn').addEventListener('click', submitPoint);

// Función para inicializar la app
window.startApp = function() {
  console.log('Iniciando la app...');
  loadPoints();
  enableMapClick();
};

// Hacer las funciones accesibles globalmente para los eventos en index.html
window.selectAllLayers = selectAllLayers;
window.deselectAllLayers = deselectAllLayers;
window.updateLayers = updateLayers;
window.toggleScheduleFields = toggleScheduleFields;
window.toggleDomingoFields = toggleDomingoFields;
window.hideOverlay = hideOverlay;
window.navigateImages = navigateImages;
window.toggleSabadoFields = toggleSabadoFields;