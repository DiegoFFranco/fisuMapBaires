const fs = require('fs').promises;
const path = require('path');

const geojsonPath = path.join(__dirname, 'points.geojson');

exports.handler = async (event) => {
  const { lat, lng, imageUrl, layer, description } = JSON.parse(event.body);
  console.log(`Punto recibido: Lat ${lat}, Lng ${lng}, Foto: ${imageUrl}, Capa: ${layer}, Descripción: ${description}`);

  let geojson = { type: 'FeatureCollection', features: [] };
  try {
    const existingData = await fs.readFile(geojsonPath, 'utf8');
    geojson = JSON.parse(existingData);
  } catch (error) {
    console.log('No hay GeoJSON previo');
  }

  const newFeature = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: {
      layer,
      description: imageUrl ? `${description} ${imageUrl}` : description // Incluye {{URL}}
    }
  };

  geojson.features.push(newFeature);
  await fs.writeFile(geojsonPath, JSON.stringify(geojson));

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Punto guardado para uMap' })
  };
};