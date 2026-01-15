export const spkFactory = (options: {
  name?: string;
  entry?: string;
  framework?: string;
}) => {
  const name = options.name ? `"${options.name}"` : '';
  const entry = options.entry ? `"${options.entry}"` : '';
  const framework = options.framework ? `"${options.framework}"` : '';

  return `
  {
    "name": ${name},
    "entry": ${entry},
    "framework": ${framework},
    "rootUrl": "/",
    "metadata": {
      "autoreload": true
    },
    "dependencies": {
      "mamba": [],
      "pip": []
    }
  }
`;
};
