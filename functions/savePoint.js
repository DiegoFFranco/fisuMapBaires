exports.handler = async (event) => {
  const { latitude, longitude, imageUrl, layer, user, title, description } = JSON.parse(event.body);
  console.log(`Punto recibido: Lat ${latitude}, Lng ${longitude}, Foto: ${imageUrl}, Capa: ${layer}, Usuario: ${user}, Título: ${title}, Descripción: ${description}`);

  const newFeature = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [longitude, latitude] },
    properties: { layer, user, title, description: imageUrl ? `${description} ${imageUrl}` : description }
  };

  const geojson = {
    type: 'FeatureCollection',
    features: [newFeature] // Solo el nuevo punto por ahora
  };

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Punto recibido. Copiá este GeoJSON en points.geojson:',
      geojson
    })
  };
};