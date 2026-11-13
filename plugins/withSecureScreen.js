// Android: set FLAG_SECURE on the main window. Screenshots and screen recordings are blocked and the
// app-switcher thumbnail is blank. Done as a config plugin so android/ is never hand-edited (CNG).
const { withMainActivity } = require("expo/config-plugins");

const MARK = "// jic-secure-screen";

module.exports = function withSecureScreen(config) {
  return withMainActivity(config, (cfg) => {
    if (cfg.modResults.language !== "kt") {
      throw new Error("withSecureScreen expects a Kotlin MainActivity.");
    }
    let contents = cfg.modResults.contents;
    if (!contents.includes(MARK)) {
      const anchor = /(super\.onCreate\([^)]*\)[^\n]*\n)/;
      if (!anchor.test(contents)) throw new Error("withSecureScreen: could not find super.onCreate in MainActivity.");
      contents = contents.replace(anchor, `$1    window.addFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE) ${MARK}\n`);
    }
    cfg.modResults.contents = contents;
    return cfg;
  });
};
