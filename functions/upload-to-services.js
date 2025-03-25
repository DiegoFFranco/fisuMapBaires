const services = [
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
      if (!data.success) {
        console.log(`Error en ImgBB: ${JSON.stringify(data)}`);
        throw new Error('ImgBB upload failed');
      }
      return {
        thumbnail: data.data.thumb.url,
        medium: data.data.medium ? data.data.medium.url : data.data.url,
        full: data.data.url
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