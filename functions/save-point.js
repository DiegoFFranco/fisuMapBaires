exports.handler = async (event) => {
  const { lat, lng, imageUrl, layer, description } = JSON.parse(event.body);
  console.log(`Punto recibido: Lat ${lat}, Lng ${lng}, Foto: ${imageUrl}, Capa: ${layer}, Descripción: ${description}`);
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Punto guardado, pronto aparecerá en el mapa" })
  };
};