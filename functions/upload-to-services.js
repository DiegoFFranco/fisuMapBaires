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
        name: 'imgbb',
        fn: async (buf, name) => {
          const form = new FormData();
          form.append('image', buf, name);
          form.append('key', process.env.IMGBB_API_KEY);
          const res = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
          });
          const data = await res.json();
          if (!data.success) throw new Error('ImgBB upload failed');
          return {
            thumbnail: data.data.thumb.url,
            medium: data.data.medium ? data.data.medium.url : data.data.url,
            full: data.data.url
          };
        }
      },
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
              ...form.getHeaders()
            }
          });
          // Loguear respuesta cruda para debug
          const rawResponse = await res.text();
          console.log(`Respuesta cruda de Postimage.me: ${rawResponse.substring(0, 500)}`); // Limitamos a 500 caracteres por si es larga
          const data = JSON.parse(rawResponse); // Intentamos parsear manualmente
          if (!data.success) throw new Error('Postimage upload failed');
          return {
            thumbnail: data.image.thumb.url,
            medium: data.image.medium ? data.image.medium.url : data.image.url,
            full: data.image.url
          };
        }
      },
      {
        name: 'freeimage',
        fn: async (buf, name) => {
          const form = new FormData();
          form.append('source', buf, name);
          form.append('key', process.env.FREEIMAGE_API_KEY);
          const res = await fetch('https://freeimage.host/api/1/upload', {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
          });
          const data = await res.json();
          if (data.status_code !== 200) throw new Error('Freeimage upload failed');
          return {
            thumbnail: data.image.thumb.url,
            medium: data.image.medium ? data.image.medium.url : data.image.url,
            full: data.image.url
          };
        }
      },
      {
        name: 'allthepics',
        fn: async (buf, name) => {
          const form = new FormData();
          form.append('source', buf, name);
          form.append('format', 'json');
          const res = await fetch('https://allthepics.net/api/1/upload', {
            method: 'POST',
            body: form,
            headers: {
              'X-API-Key': process.env.ALLTHEPICS_API_KEY,
              ...form.getHeaders()
            }
          });
          const data = await res.json();
          if (data.status_code !== 200) throw new Error('Allthepics upload failed');
          return {
            thumbnail: data.image.thumb.url,
            medium: data.image.medium ? data.image.medium.url : data.image.url,
            full: data.image.url
          };
        }
      }
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