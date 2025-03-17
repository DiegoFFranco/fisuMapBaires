const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { layer, point } = JSON.parse(event.body);
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Configurá en Netlify
  const gistId = {
    'fisuras': '4b5ae0b59d4cbbad161f0234906cb1cd',
    'limpieza': '52640ef61feae0ba47fa5c1b50a4bb03',
    'trapitos': '4b5ae0b59d4cbbad161f0234906cb1cd',
    'narcomenudeo': '363f43d4842fa35a3357ae2c474a6fff',
    'casas-tomadas': '9a74c688f462688e1d712989c275d853',
    'comercios-fisuras': '3a1ca4ff9425fbac6d887aba7e414f98',
    'via-publica': '79af8d490561594d4bd4f739ae5e9356'
  }[layer];

  // Obtener GeoJSON actual
  const gistResponse = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` }
  });
  const gistData = await gistResponse.json();
  const currentGeoJSON = JSON.parse(gistData.files[`${layer}-temporal.geojson`].content || '{"type":"FeatureCollection","features":[]}');

  // Agregar nuevo punto
  currentGeoJSON.features.push(point);

  // Actualizar Gist
  await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: { Authorization: `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      files: { [`${layer}-temporal.geojson`]: { content: JSON.stringify(currentGeoJSON, null, 2) } }
    })
  });

  return { statusCode: 200, body: JSON.stringify({ message: 'Punto guardado' }) };
};