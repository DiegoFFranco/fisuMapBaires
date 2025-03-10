exports.handler = async (event) => {
  const { lat, lng, imageUrl, layer } = JSON.parse(event.body);

  // Aquí simula guardar los datos con la capa; luego lo conectamos al mapa final
  console.log(`Punto recibido: Lat ${lat}, Lng ${lng}, Foto: ${imageUrl}, Capa: ${layer}`);

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Punto guardado, pronto aparecerá en el mapa' })
  };
};