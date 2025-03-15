exports.handler = async (event) => {
  const { latitude, longitude, imageUrl, layer, user, title, description } = JSON.parse(event.body);
  console.log(`Punto recibido: Lat ${latitude}, Lng ${longitude}, Foto: ${imageUrl}, Capa: ${layer}, Usuario: ${user}, Título: ${title}, Descripción: ${description}`);

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Punto recibido. Editá points.geojson manualmente.' })
  };
};