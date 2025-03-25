const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { image, filename } = JSON.parse(event.body);
    const buffer = Buffer.from(image.split(',')[1], 'base64');

    const services = [
      {
        name: 'postimage',
        fn: async (buf, name) => {
          const form = new FormData();
          form.append('source', buf, name);
          const res = await fetch('https://postimage.me/api/1/upload', {
            method: 'POST',
            body: form,
            headers: {
              'X-API-Key': process.env.POSTIMAGE_API_KEY,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
              'Accept': 'application/json, text/plain, */*',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': 'https://postimage.me/', // Simula que vienes del sitio
              ...form.getHeaders()
            }
          });
          const rawResponse = await res.text();
          console.log(`Respuesta cruda de Postimage.me: ${rawResponse.substring(0, 500)}`);
          const data = JSON.parse(rawResponse);
          if (!data.success) throw new Error('Postimage upload failed');
          return {
            thumbnail: data.image.thumb.url,
            medium: data.image.medium ? data.image.medium.url : data.image.url,
            full: data.image.url
          };
        }
      }
      // Quitaste las claves de los otros servicios, así que solo dejamos Postimage por ahora
    ];

    for (const service of services) {
      try {
        console.log(`Intentando subir a ${service.name}...`);
        const result = await service.fn(buffer, filename);
        console.log(`Éxito en ${service.name}`);
        return { statusCode: 200, body: JSON.stringify(result) };
      } catch (error) {
        console.log(`Fallo en ${service.name}: ${error.message}`);
      }
    }

    throw new Error('Todos los servicios fallaron');
  } catch (error) {
    console.error('Error general:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};