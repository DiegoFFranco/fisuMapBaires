const fetch = require('node-fetch');

exports.handler = async (event) => {
  const gists = {
    'fisuras': 'ca1084559d9fc6c5a91a6175d424bd2c',
    'limpieza': '52640ef61feae0ba47fa5c1b50a4bb03',
    'trapitos': '4b5ae0b59d4cbbad161f0234906cb1cd',
    'narcomenudeo': '363f43d4842fa35a3357ae2c474a6fff',
    'casas-tomadas': '9a74c688f462688e1d712989c275d853',
    'comercios-fisuras': '3a1ca4ff9425fbac6d887aba7e414f98',
    'via-publica': '79af8d490561594d4bd4f739ae5e9356'
  };

  const githubToken = 'TU_GITHUB_TOKEN'; // Tu token de GitHub

  for (const layer in gists) {
    const gistId = gists[layer];
    const fileName = `${layer}-temporal.geojson`;
    await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `token ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: {
          [fileName]: {
            content: '{"type":"FeatureCollection","features":[]}'
          }
        }
      })
    });
  }

  return {
    statusCode: 200,
    body: 'Puntos borrados'
  };
};