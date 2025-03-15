const fs = require('fs').promises;
const path = require('path');

const geojsonPath = path.join(__dirname, 'points.geojson');

exports.handler = async () => {
  try {
    const data = await fs.readFile(geojsonPath, 'utf8');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: data
    };
  } catch (error) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'FeatureCollection', features: [] })
    };
  }
};