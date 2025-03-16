exports.handler = async (event) => {
  const { latitude, longitude, imageUrls, layer, user, title, description } = JSON.parse(event.body);
  console.log(`Punto recibido: Lat ${latitude}, Lng ${longitude}, Fotos: ${imageUrls}, Capa: ${layer}, Usuario: ${user}, Título: ${title}, Descripción: ${description}`);

  const newFeature = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [longitude, latitude] },
    properties: { layer, user, title, description, imageUrls }
  };

  const geojson = {
    type: 'FeatureCollection',
    features: [newFeature]
  };

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Punto recibido. Copiá este GeoJSON en points.geojson:',
      geojson
    })
  };
};