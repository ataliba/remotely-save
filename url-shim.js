// Browser polyfill for "url"/"node:url" that also covers fileURLToPath,
// which the plain `url/` npm package doesn't implement. Only pulled in
// transitively (via clean-stack, used by aggregate-error) for stack-trace
// cleanup — not on any critical path, so a best-effort implementation is
// fine here.
const base = require("url/");

module.exports = {
  ...base,
  fileURLToPath(input) {
    try {
      return new URL(input).pathname;
    } catch (e) {
      return String(input);
    }
  },
};
