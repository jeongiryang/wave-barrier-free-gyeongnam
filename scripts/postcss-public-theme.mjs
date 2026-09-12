/** Public presentation always uses light; dark previews remain available in dev. */
export function publicThemeStyles({ production = process.env.NODE_ENV === 'production' } = {}) {
  return {
    postcssPlugin: 'wave-public-theme',
    Once(root) {
      if (!production) return;
      root.walkRules(rule => {
        // PostCSS splits commas outside functional selectors. Keep mixed/light rules.
        const selectors = rule.selectors.filter(selector => !/^(?:html|:root)\[data-theme=(?:"dark"|'dark'|dark)\](?=[\s.:#\[]|$)/.test(selector.trim()));
        if (!selectors.length) rule.remove();
        else if (selectors.length !== rule.selectors.length) rule.selectors = selectors;
      });
    },
  };
}
