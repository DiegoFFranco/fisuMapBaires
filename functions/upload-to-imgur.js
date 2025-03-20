const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Solo permitir solicitudes POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método no permitido. Usa POST.' })
    };
  }

  try {
    // Obtener la imagen del cuerpo de la solicitud
    const body = JSON.parse(event.body);
    const imageBase64 = body.image;

    if (!imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No se proporcionó una imagen.' })
      };
    }

    // Hacer la solicitud a Imgur
    const response = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: {
        Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: imageBase64.split(',')[1], // Remover el prefijo "data:image/jpeg;base64,"
        type: 'base64'
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(`Error al subir a Imgur: ${data.data?.error || response.statusText}`);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ imageUrl: data.data.link })
    };
  } catch (error) {
    console.error('Error al subir a Imgur:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: `Error al subir a Imgur: ${error.message}` })
    };
  }
};