/** RSC 0.5.26 restores bundled CSS metadata for server chunks only. Restore the
 * equivalent client dependency before it creates the Flight asset manifest. */
export function attachBundledClientCss(bundle) {
  const styles = Object.values(bundle).filter(asset => asset.type === 'asset' && asset.names?.includes('style.css'));
  if (styles.length !== 1) throw new Error('Expected one bundled client stylesheet for the RSC manifest.');
  for (const chunk of Object.values(bundle)) {
    if (chunk.type === 'chunk' && chunk.viteMetadata) chunk.viteMetadata.importedCss.add(styles[0].fileName);
  }
}

export function clientCssManifest() {
  return {
    name: 'wave:client-css-manifest',
    apply: 'build',
    configResolved(config) {
      const manifest = config.plugins.find(plugin => plugin.name === 'rsc:virtual:vite-rsc/assets-manifest');
      if (typeof manifest?.generateBundle !== 'function') throw new Error('RSC asset manifest hook changed; verify client CSS links before release.');
      const generate = manifest.generateBundle;
      manifest.generateBundle = { order: 'post', handler: function(options, bundle, ...args) {
        if (this.environment.name === 'client' && !this.environment.config.build.cssCodeSplit) attachBundledClientCss(bundle);
        return generate.call(this, options, bundle, ...args);
      } };
    },
  };
}
