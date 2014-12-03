# Web Localizr

## Install WebLocalizr

 * install [node.js](http://nodejs.org/)
 * Run `npm install -g weblocalizr`


## Prepare your application

Add this HTML code to your webpage header:

```
  <script>
    window.webLocalizr = {
      /**
       * URL of service which loads and saves dictionaries
       */
      // apiBase: "https://localhost:30443",

      /**
       * regular expression for translation detection
       */
      // translationRegex: /考(.+?)(?:項(.*?))?(?:場(.+?))?終/g,
    };
  </script>
  <script src="https://localhost:30443/javascripts/inject.js"></script>
```

Your translation function on server-side should not translate texts, but
should mark translatable texts with defined characters.

 * 考 — remarks — This starting translation. MSGID follows
 * 項 — section — *optional* After this mark follows JSON parsable string containing arguments (for pluralization etc..)
 * 場 — place — *optional* After this mark follow pathname for usable dictionary.
 * 終 — end — Last character closing translation mark

This regular expression defined in `inject.js` is used: `/考(.+?)(?:項(.*?))?(?:場(.+?))?終/g`

You can provide custom regular expression in `window.reTranslationMarks` variable **before** `inject.js` is loaded. Capturing groups MUST be in same order.

Please modify your application to respect this **only** when translation service is in use.

## Starting developer's server

 * Go to directory, where dictionaries are saved
 * run `weblocalizr`


## Using WebLocalizr

  * `Ctrl` — Show dictionary keys (MSGID) with translation status marks:
     * ■ — no translation in dictionaries
     * ▣ — some translations missing
     * □ — all translations present

  * `Ctrl` + `click` — Show translator's dialog
    Allows edit and save messages.
  * `Ctrl` + `Shift` — Show page translated in alternative language (cs <-> en)
  * `Ctrl` + `Alt` — Hide translatable texts.
    Allows quickly see forgotten texts not marked in source code.
