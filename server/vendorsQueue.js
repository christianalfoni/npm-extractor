var queue = {};

module.exports = {
  add: function (vendorsBundleName) {
    queue[vendorsBundleName] = true;
  },
  has: function (vendorsBundleName) {
    return Boolean(queue[vendorsBundleName]);
  },
  remove: function (vendorsBundleName) {
    delete queue[vendorsBundleName];
  }
}
