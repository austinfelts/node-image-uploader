module.exports = {
  variants: {
    products: {
      keepNames: true,
      separator: '/',
      resize: {
        'products/small': '40x40>',
        'products/thumbnails': '140x140>',
        'products/pictures': '450x450>'
      }
    },
    products_back: {
      keepNames: true,
      separator: '/',
      resize: {
        'products_back/small': '40x40>',
        'products_back/thumbnails': '140x140>',
        'products_back/pictures': '450x450>'
      }
    },
    media: {
      keepNames: true,
      separator: '/',
      resize: {
        media: '100%'
      }
    },
    marquee: {
      keepNames: true,
      separator: '/',
      resize: {
        categories: '100%'
      }
    }
  },

  storage: {
    Rackspace: {
      username: process.env.RACKSPACE_USERNAME,
      apiKey: process.env.RACKSPACE_APIKEY,
      authUrl: process.env.RACKSPACE_AUTHURL,
      container: process.env.RACKSPACE_CONTAINER,
      region: process.env.RACKSPACE_REGION
    },
    Local: {
      path: process.env.IMAGES_OUTGOING
    }
  },

  debug: process.env.DEBUGGING
}
