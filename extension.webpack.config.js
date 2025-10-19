const rules = [
  {
    test: /\.js$/,
    resourceQuery: /raw/, // only applies when you import with '?raw'
    type: 'asset/source'
  }
];

module.exports = {
  module: {
    rules
  }
};
