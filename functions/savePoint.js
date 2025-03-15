const fs = require('fs').promises;
const path = require('path');

const geojsonPath = '/tmp/points.geojson';

exports.handler = async (event) => {
  const { latitude, longitude, imageUrl, layer, description } = JSON.parse(event.body);
  console.log(`Punto recibido: Lat ${latitude}, Lng ${longitude}, Foto: ${imageUrl}, Capa: ${layer}, Descripción: ${description}`);

  let geojson = { type: 'FeatureCollection', features: [] };
  try {
    const existingData = await fs.readFile(geojsonPath, 'utf8');
    geojson = JSON.parse(existingData);
  } catch (error) {
    console.log('No hay GeoJSON previo en /tmp');
  }

  const newFeature = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [longitude, latitude] },
    properties: {
      layer,
      description: imageUrl ? `${description} ${imageUrl}` : description
    }
  };

  geojson.features.push(newFeature);
  await fs.writeFile(geojsonPath, JSON.stringify(geojson));

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Punto guardado en GeoJSON' })
  };
};