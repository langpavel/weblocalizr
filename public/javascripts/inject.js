/*****************************************************************************
 * WebLocalizr Translation Helper
 * author: Pavel Lang <langpavel@phpskelet.org>
 *****************************************************************************/

// this regular expression
// 考 - remarks
// 項 - section
// 場 - place
// 終 - end
var reTranslationMarks = window.reTranslationMarks || /考(.+?)(?:項(.*?))?(?:場(.+?))?終/g;


console.log('IPEX translation dev-tool injected :-)');

var observer = new MutationObserver(function(mutationList) {
  mutationList.forEach(function(mutation) {
    //console.log(mutation.type, mutation);
    handleMutationType[mutation.type](mutation);
  });
});


var handleMutationType = {
  attributes: function(mutation) {
    lookForTranslations(mutation.target, onTranslationFound);
  },

  characterData: function(mutation) {
    lookForTranslations(mutation.target, onTranslationFound);
  },

  childList: function(mutation) {
    var count = mutation.addedNodes.length;
    while (count) {
      count--;
      var node = mutation.addedNodes[count];
      // only text nodes
      lookForTranslations(node, onTranslationFound);
    }
  }
};


var setNodeText = function(node, text) {
  if (node.nodeType === 2)
    node.value = text;
  else
    node.textContent = text;
};


var getNodeText = function(node) {
  return (node.nodeType === 2) ? node.value : node.textContent;
};


/*
 * Track found translation nodes
 */
var translatedNodes = {
  nodes_: [],
  originalTexts_: [],
  set: function(node, texts) {
    translateElementTargets.registerTexts(node, texts);
    if (this.nodes_.indexOf(node) >= 0)
      return false;
    this.nodes_.push(node);
    this.originalTexts_.push(getNodeText(node));
    return true;
  },
  restore: function() {
    var i, l = this.nodes_.length;
    for (i = 0; i < l; i++) {
      setNodeText(this.nodes_[i], this.originalTexts_[i]);
    };
  }
};


var onTranslationFound = function(node, translated, texts) {
  translatedNodes.set(node, texts);
  setNodeText(node, translated);
};


var lookForTranslations = function(node, translationFoundCallback) {
  switch (node.nodeType) {
    case 1: // element
      var i, l = node.attributes.length;
      for (var i = 0; i < l; i++) {
        lookForTranslations(node.attributes[i], translationFoundCallback);
      };

      var i, l = node.childNodes.length;
      for (var i = 0; i < l; i++) {
        lookForTranslations(node.childNodes[i], translationFoundCallback);
      };
      break;
    case 2: // attribute
    case 3: // text
      var text = getNodeText(node);
      if (!text.trim())
        return;
      var texts = {};
      var translated = translateMarkedTexts(text, texts);
      if (Object.keys(texts).length)
        translationFoundCallback(node, translated, texts);
      break;
  }
};


// language/module/string - translation
var languages = {
};


var getPageLanguage = function() {
  return document.documentElement.getAttribute('lang');
};

var currentLang_ = null;
var getCurrentLang = function() {
  return currentLang_ || (currentLang_ = getPageLanguage());
};


var apiCall = function(path, options, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      var response = xhr.response;
      try {
        response = JSON.parse(response);
      } catch(err) {
        // do nothing
      }
      if (xhr.status >= 400) {
        // error
        callback(response);
      } else {
        // ok
        callback(null, response);
      }
    }
  };
  xhr.open(options.method || 'GET', 'https://localhost:30443/' + path);
  var data = options.data;
  if (typeof data == 'object') {
    data = JSON.stringify(data);
    xhr.setRequestHeader("Content-type", "application/json");
  }

  xhr.send(data);
};


var saveTranslation = function(lang, module, key, translation, callback) {
  translation = translation.trim();
  module = module || '/common';
  console.log('Trying to save translation', lang, module, key, translation);

  var data = {};
  data[key] = translation;

  apiCall('api/lang/'+lang+module, {
    method: 'POST',
    data: data
  }, function(err, translations) {
    if (!err) {
      languages[lang][module] = translations;
      retranslate();
    }
    callback && callback(err, translations);
  });

  //languages[lang][module][key] = translation;
  //retranslate();
};


var loadLanguageModule = function(lang, module, callback) {
  module = module || '/common';
  modules = languages[lang] || (languages[lang] = {});
  modules[module] = {}; // empty while loading
  apiCall('api/lang/'+lang+module, {}, function(err, translations) {
    if (translations) {
      languages[lang][module] = translations;
    }
    callback && callback(err, translations);
  });
};


var translateToLang = function(text, module, lang, infoOut) {
  lang = lang || getCurrentLang();

  text = text.trim();

  if (lang == 'NULL')
    return '';

  // C is not translated
  if (lang == 'INFO') {
    var infoEn = {};
    var infoCs = {};
    var localizations = 0;

    translateToLang(text, module, 'en', infoEn);
    translateToLang(text, module, 'cs', infoCs);

    infoEn.module && localizations++;
    infoCs.module && localizations++;

    if (localizations == 0) {
      return '■' + text + '■';
    } else if (localizations == 1) {
      return '▣' + text + '▣';
    } else {
      return '□' + text + '□';
    }
  }

  module = module || '/common';
  var pending = 0;
  var cb = function() {
    pending--;
    if (!pending) {
      retranslate();
    }
  }
  if (!languages[lang]) {
    // fill cache
    if (module != '/common') {
      pending++;
      loadLanguageModule('cs', '/common', cb);
      pending++;
      loadLanguageModule('en', '/common', cb);
    }
    pending++;
    loadLanguageModule('cs', module, cb);
    pending++;
    loadLanguageModule('en', module, cb);

    infoOut && (infoOut.notLoaded = true);

    return text;
  } else {
    var result = (languages[lang][module] && languages[lang][module][text]);
    if (result) {
      infoOut && (infoOut.module = module);
      return result;
    }

    result = (languages[lang]['/common'] && languages[lang]['/common'][text]);
    if (result) {
      infoOut && (infoOut.module = '/common');
      return result;
    }

    infoOut && (infoOut.missing = true);

    missingTranslations.mark(text, module, lang);

    return text;
  }
};


/**
 * singleton - service for dealing with missing translations
 */
var missingTranslations = {
  data_: {},

  init: function() {
    window.addEventListener("storage", function(e) {
      var match = e.key.match(/missingTranslations\.(\w+)/);
      if (match) {
        this.data_[match[1]] = JSON.parse(newValue);
      }
    });

    this.data_['cs'] = JSON.parse(window.localStorage.getItem('missingTranslations.cs'));
    this.data_['en'] = JSON.parse(window.localStorage.getItem('missingTranslations.en'));
  },

  mark: function(text, module, lang) {
    var missingLang = this.data_[lang] || (this.data_[lang] = {});
    var location = window.location.pathname + window.location.search;
    location = location.replace(/&lang=(cs|en)/g, '');
    var missingTextRecord = missingLang[text] || (missingLang[text] = {});
    var missingTextModuleLocations = missingTextRecord[module] || (missingTextRecord[module] = []);
    if (missingTextModuleLocations.indexOf(location) == -1) {
      // save
      missingTextModuleLocations.push(location);

      this.save(lang);
    }
  },

  save: function(lang) {
    var data = JSON.stringify(this.data_[lang]);
    window.localStorage.setItem('missingTranslations.' + lang, data);
  }

};

missingTranslations.init();


var doubletranslationAlert = function(doubleTranslated) {
  doubleTranslated = doubleTranslated.replace(/[■▣□考]/g,'');
  console.error("WARNING: Trying to double translate text:\n" + doubleTranslated);
  if (doubletranslationAlert.reported.indexOf(doubleTranslated) != -1) {
    return;
  }
  doubletranslationAlert.reported.push(doubleTranslated);
  alert("WARNING: Trying to double translate text:\n" + doubleTranslated);
};
doubletranslationAlert.reported = [];


var translateMarkedTexts = function(text, texts) {
  text = text.replace(reTranslationMarks, function(match, text, replaces, module) {
    texts[text] = {
      module: module || 'common'
    };
    text = translateToLang(text, module);
    return text;
  });

  var text = text.replace(reTranslationMarks, function(match, text) {
    doubletranslationAlert(text);
    return text;
  })

  return text;
};


var retranslate = function() {
  console.log('Retranslating...');
  stopObserving();
  translatedNodes.restore();
  lookForTranslations(document.documentElement, onTranslationFound);
  startObserving();
}


var startObserving = function() {
  observer.observe(document, {
    childList: true,
    attributes: true,
    characterData: true,
    subtree: true,
  });
};


var stopObserving = function() {
  observer.disconnect();
};


/* remember current modifier keys */
var ctrlPressed = false;
var shiftPressed = false;
var altPressed = false;


var enterTranslationMode = function() {
  if (ctrlPressed && shiftPressed) {
    currentLang_ = getPageLanguage() == 'en' ? 'cs' : 'en';
  } else {
    currentLang_ = altPressed ? 'NULL' : 'INFO';
  }
  retranslate();
};


var leaveTranslationMode = function() {
  currentLang_ = null; // atodetect
  retranslate();
};


var checkTranslationMode = function() {
  if (ctrlPressed)
    enterTranslationMode();
  else
    leaveTranslationMode();
};


var getClickableElementTarget = function(node, parent) {
  var ok;
  node = node || parent;
  while(true) {
    if (!node)
      return;
    if (node.nodeType != 1 || node.nodeName.toLowerCase() == 'option') {
      // TODO Attr#ownerElement is deprecated
      node = node.parentElement || node.ownerElement;
      continue; // Is this really needed?
    }

    return node;
  }
};


// TODO
var translateElementTargets = {
  elements_: [],
  texts_: [],
  registerTexts: function(node, texts) {
    var element = getClickableElementTarget(node);
    var index = this.elements_.indexOf(element);
    if (index == -1) {
      this.elements_.push(element);
      this.texts_.push(texts);
    } else {
      var self = this;
      Object.keys(texts).forEach(function(name) {
        self.texts_[index][name] = texts[name];
      });
    }
  },
  getTexts: function(element) {
    // normalization
    element = getClickableElementTarget(element);
    var index = this.elements_.indexOf(element);
    if (index == -1)
      return null;
    return this.texts_[index];
  }
}


// Create DOM text node
var DOMT = function(text) {
  return document.createTextNode(text);
};


// DOM element factory
var DOM = function(elementName, attributes, content) {
  var el = document.createElement(elementName);
  if (attributes) {
    Object.keys(attributes).forEach(function(name) {
      el.setAttribute(name, attributes[name]);
    });
  }
  if (content) {
    content.forEach(function(item) {
      // one level depth only!
      if (Array.isArray(item)) {
        item.forEach(function(item) {
          el.appendChild(item);
        });
      } else {
        el.appendChild(item);
      }
    });
  }
  return el;
};


// invoked when Ctrl + click on element
var beginTranslation = function(element) {
  var texts = translateElementTargets.getTexts(element);
  console.log('Translate:', texts);

  var createLangRow = function(lang, text, module) {
    var translateButton;
    var saveButton;
    var moduleSpecific;
    var textArea;
    var translationMetadata = {};
    var translated = translateToLang(text, module, lang, translationMetadata);
    var rows = Math.trunc(translated.length / 80) + 1;

    if (translationMetadata.notLoaded)
      return DOMT('Dictionary was not loaded');

    var row = DOM('tr', {}, [
      DOM('td', {}, [ DOMT(lang.toUpperCase()) ]),
      DOM('td', {}, [
        textArea = DOM('textarea', { rows: rows, style: "width: 100%;color:#000" }, [ DOMT(translated) ])
      ]),
      DOM('td', {}, [
        DOM('label', {}, [
          moduleSpecific = DOM('input', { type: 'checkbox' }, []),
          DOMT(' modul '+module.replace(/^\//, ''))
        ]),
        DOMT(' '),
        translateButton = DOM('button', {style: 'color:#000'}, [ DOMT('Translate') ]),
        DOMT(' '),
        saveButton = DOM('button', {style: 'color:#000'}, [ DOMT('Save') ])
      ])
    ]);

    moduleSpecific.checked = translationMetadata.module != '/common';

    translateButton.onclick = function() {
      var langToLang = lang + '/' + (lang == 'en' ? 'cs' : 'en') + '/';
      var tt = textArea.value;
      var translatorWindow = window.open('https://translate.google.cz/#'+langToLang+encodeURIComponent(tt), 'googleTranslate');
      translatorWindow.focus();
    };

    saveButton.onclick = function() {
      var tt = textArea.value;
      saveTranslation(lang, moduleSpecific.checked ? module : '/common', text, tt, function(err) {
        console.log(err ? 'Error saving translation' : 'Translation saved');
      });
    };

    return row;
  };

  var closeButton = DOM('button', { style: "display: float; float:right; color:#000" }, [DOMT('×')]);
  closeButton.onclick = function() {
    translatorTable.parentElement.removeChild(translatorTable);
  }

  var translatorTable =
    DOM('div', { style: 'display: block; border: 1px black solid; position:fixed; top:0; left:0; right:0; z-index:65535; background-color: rgba(0,0,0,0.7); color: #fff;' }, [
      closeButton,
      DOM('table', {  }, [
        DOM('tbody', {}, Object.keys(texts).map(function(srcString) {

          return [
            DOM('tr', {}, [
              DOM('th', {}, []),
              DOM('th', {colspan: 2, style: 'text-align: left'}, [
                DOMT(srcString),
              ])
            ]),

            createLangRow('cs', srcString, texts[srcString].module),
            createLangRow('en', srcString, texts[srcString].module),

          ];

        }))
      ])
    ]);

  document.body.appendChild(translatorTable);
  //document.body.insertBefore(translatorTable, document.body.firstElementChild)

};


var hadleModifierKeys = function(ev) {
  var change = false;
  if (ctrlPressed != ev.ctrlKey) { ctrlPressed = ev.ctrlKey; change = true; }
  if (shiftPressed != ev.shiftKey) { shiftPressed = ev.shiftKey; change = true; }
  if (altPressed != ev.altKey) { altPressed = ev.altKey; change = true; }

  if (change)
    checkTranslationMode();
};

document.addEventListener('keydown', hadleModifierKeys, true);

document.addEventListener('keyup', hadleModifierKeys, true);

document.addEventListener('click', function(ev) {
  if (ev.ctrlKey) {
    console.log('translation click', ev);
    ev.preventDefault();

    beginTranslation(ev.target);
  }
}, true);


retranslate();
