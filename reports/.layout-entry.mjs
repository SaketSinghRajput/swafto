var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e3) {
    throw mod = 0, e3;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/@babel/runtime/helpers/typeof.js
var require_typeof = __commonJS({
  "node_modules/@babel/runtime/helpers/typeof.js"(exports, module) {
    function _typeof(o) {
      "@babel/helpers - typeof";
      return module.exports = _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
        return typeof o2;
      } : function(o2) {
        return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
      }, module.exports.__esModule = true, module.exports["default"] = module.exports, _typeof(o);
    }
    module.exports = _typeof, module.exports.__esModule = true, module.exports["default"] = module.exports;
  }
});

// node_modules/@babel/runtime/helpers/toPrimitive.js
var require_toPrimitive = __commonJS({
  "node_modules/@babel/runtime/helpers/toPrimitive.js"(exports, module) {
    var _typeof = require_typeof()["default"];
    function toPrimitive(t, r) {
      if ("object" != _typeof(t) || !t) return t;
      var e3 = t[Symbol.toPrimitive];
      if (void 0 !== e3) {
        var i = e3.call(t, r || "default");
        if ("object" != _typeof(i)) return i;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return ("string" === r ? String : Number)(t);
    }
    module.exports = toPrimitive, module.exports.__esModule = true, module.exports["default"] = module.exports;
  }
});

// node_modules/@babel/runtime/helpers/toPropertyKey.js
var require_toPropertyKey = __commonJS({
  "node_modules/@babel/runtime/helpers/toPropertyKey.js"(exports, module) {
    var _typeof = require_typeof()["default"];
    var toPrimitive = require_toPrimitive();
    function toPropertyKey(t) {
      var i = toPrimitive(t, "string");
      return "symbol" == _typeof(i) ? i : i + "";
    }
    module.exports = toPropertyKey, module.exports.__esModule = true, module.exports["default"] = module.exports;
  }
});

// node_modules/@babel/runtime/helpers/defineProperty.js
var require_defineProperty = __commonJS({
  "node_modules/@babel/runtime/helpers/defineProperty.js"(exports, module) {
    var toPropertyKey = require_toPropertyKey();
    function _defineProperty(e3, r, t) {
      return (r = toPropertyKey(r)) in e3 ? Object.defineProperty(e3, r, {
        value: t,
        enumerable: true,
        configurable: true,
        writable: true
      }) : e3[r] = t, e3;
    }
    module.exports = _defineProperty, module.exports.__esModule = true, module.exports["default"] = module.exports;
  }
});

// node_modules/@babel/runtime/helpers/objectSpread2.js
var require_objectSpread2 = __commonJS({
  "node_modules/@babel/runtime/helpers/objectSpread2.js"(exports, module) {
    var defineProperty = require_defineProperty();
    function ownKeys(e3, r) {
      var t = Object.keys(e3);
      if (Object.getOwnPropertySymbols) {
        var o = Object.getOwnPropertySymbols(e3);
        r && (o = o.filter(function(r2) {
          return Object.getOwnPropertyDescriptor(e3, r2).enumerable;
        })), t.push.apply(t, o);
      }
      return t;
    }
    function _objectSpread22(e3) {
      for (var r = 1; r < arguments.length; r++) {
        var t = null != arguments[r] ? arguments[r] : {};
        r % 2 ? ownKeys(Object(t), true).forEach(function(r2) {
          defineProperty(e3, r2, t[r2]);
        }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e3, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r2) {
          Object.defineProperty(e3, r2, Object.getOwnPropertyDescriptor(t, r2));
        });
      }
      return e3;
    }
    module.exports = _objectSpread22, module.exports.__esModule = true, module.exports["default"] = module.exports;
  }
});

// node_modules/@babel/runtime/helpers/objectWithoutPropertiesLoose.js
var require_objectWithoutPropertiesLoose = __commonJS({
  "node_modules/@babel/runtime/helpers/objectWithoutPropertiesLoose.js"(exports, module) {
    function _objectWithoutPropertiesLoose10(r, e3) {
      if (null == r) return {};
      var t = {};
      for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
        if (-1 !== e3.indexOf(n)) continue;
        t[n] = r[n];
      }
      return t;
    }
    module.exports = _objectWithoutPropertiesLoose10, module.exports.__esModule = true, module.exports["default"] = module.exports;
  }
});

// node_modules/react-native-web/node_modules/@react-native/normalize-colors/index.js
var require_normalize_colors = __commonJS({
  "node_modules/react-native-web/node_modules/@react-native/normalize-colors/index.js"(exports, module) {
    "use strict";
    function normalizeColor4(color) {
      if (typeof color === "number") {
        if (color >>> 0 === color && color >= 0 && color <= 4294967295) {
          return color;
        }
        return null;
      }
      if (typeof color !== "string") {
        return null;
      }
      const matchers = getMatchers();
      let match;
      if (match = matchers.hex6.exec(color)) {
        return parseInt(match[1] + "ff", 16) >>> 0;
      }
      const colorFromKeyword = normalizeKeyword(color);
      if (colorFromKeyword != null) {
        return colorFromKeyword;
      }
      if (match = matchers.rgb.exec(color)) {
        return (parse255(match[1]) << 24 | // r
        parse255(match[2]) << 16 | // g
        parse255(match[3]) << 8 | // b
        255) >>> // a
        0;
      }
      if (match = matchers.rgba.exec(color)) {
        if (match[6] !== void 0) {
          return (parse255(match[6]) << 24 | // r
          parse255(match[7]) << 16 | // g
          parse255(match[8]) << 8 | // b
          parse1(match[9])) >>> // a
          0;
        }
        return (parse255(match[2]) << 24 | // r
        parse255(match[3]) << 16 | // g
        parse255(match[4]) << 8 | // b
        parse1(match[5])) >>> // a
        0;
      }
      if (match = matchers.hex3.exec(color)) {
        return parseInt(
          match[1] + match[1] + // r
          match[2] + match[2] + // g
          match[3] + match[3] + // b
          "ff",
          // a
          16
        ) >>> 0;
      }
      if (match = matchers.hex8.exec(color)) {
        return parseInt(match[1], 16) >>> 0;
      }
      if (match = matchers.hex4.exec(color)) {
        return parseInt(
          match[1] + match[1] + // r
          match[2] + match[2] + // g
          match[3] + match[3] + // b
          match[4] + match[4],
          // a
          16
        ) >>> 0;
      }
      if (match = matchers.hsl.exec(color)) {
        return (hslToRgb(
          parse360(match[1]),
          // h
          parsePercentage(match[2]),
          // s
          parsePercentage(match[3])
          // l
        ) | 255) >>> // a
        0;
      }
      if (match = matchers.hsla.exec(color)) {
        if (match[6] !== void 0) {
          return (hslToRgb(
            parse360(match[6]),
            // h
            parsePercentage(match[7]),
            // s
            parsePercentage(match[8])
            // l
          ) | parse1(match[9])) >>> // a
          0;
        }
        return (hslToRgb(
          parse360(match[2]),
          // h
          parsePercentage(match[3]),
          // s
          parsePercentage(match[4])
          // l
        ) | parse1(match[5])) >>> // a
        0;
      }
      if (match = matchers.hwb.exec(color)) {
        return (hwbToRgb(
          parse360(match[1]),
          // h
          parsePercentage(match[2]),
          // w
          parsePercentage(match[3])
          // b
        ) | 255) >>> // a
        0;
      }
      return null;
    }
    function hue2rgb(p, q, t) {
      if (t < 0) {
        t += 1;
      }
      if (t > 1) {
        t -= 1;
      }
      if (t < 1 / 6) {
        return p + (q - p) * 6 * t;
      }
      if (t < 1 / 2) {
        return q;
      }
      if (t < 2 / 3) {
        return p + (q - p) * (2 / 3 - t) * 6;
      }
      return p;
    }
    function hslToRgb(h, s, l) {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const r = hue2rgb(p, q, h + 1 / 3);
      const g = hue2rgb(p, q, h);
      const b = hue2rgb(p, q, h - 1 / 3);
      return Math.round(r * 255) << 24 | Math.round(g * 255) << 16 | Math.round(b * 255) << 8;
    }
    function hwbToRgb(h, w2, b) {
      if (w2 + b >= 1) {
        const gray = Math.round(w2 * 255 / (w2 + b));
        return gray << 24 | gray << 16 | gray << 8;
      }
      const red = hue2rgb(0, 1, h + 1 / 3) * (1 - w2 - b) + w2;
      const green = hue2rgb(0, 1, h) * (1 - w2 - b) + w2;
      const blue = hue2rgb(0, 1, h - 1 / 3) * (1 - w2 - b) + w2;
      return Math.round(red * 255) << 24 | Math.round(green * 255) << 16 | Math.round(blue * 255) << 8;
    }
    var NUMBER = "[-+]?\\d*\\.?\\d+";
    var PERCENTAGE = NUMBER + "%";
    function call(...args) {
      return "\\(\\s*(" + args.join(")\\s*,?\\s*(") + ")\\s*\\)";
    }
    function callWithSlashSeparator(...args) {
      return "\\(\\s*(" + args.slice(0, args.length - 1).join(")\\s*,?\\s*(") + ")\\s*/\\s*(" + args[args.length - 1] + ")\\s*\\)";
    }
    function commaSeparatedCall(...args) {
      return "\\(\\s*(" + args.join(")\\s*,\\s*(") + ")\\s*\\)";
    }
    var cachedMatchers;
    function getMatchers() {
      if (cachedMatchers === void 0) {
        cachedMatchers = {
          rgb: new RegExp("rgb" + call(NUMBER, NUMBER, NUMBER)),
          rgba: new RegExp(
            "rgba(" + commaSeparatedCall(NUMBER, NUMBER, NUMBER, NUMBER) + "|" + callWithSlashSeparator(NUMBER, NUMBER, NUMBER, NUMBER) + ")"
          ),
          hsl: new RegExp("hsl" + call(NUMBER, PERCENTAGE, PERCENTAGE)),
          hsla: new RegExp(
            "hsla(" + commaSeparatedCall(NUMBER, PERCENTAGE, PERCENTAGE, NUMBER) + "|" + callWithSlashSeparator(NUMBER, PERCENTAGE, PERCENTAGE, NUMBER) + ")"
          ),
          hwb: new RegExp("hwb" + call(NUMBER, PERCENTAGE, PERCENTAGE)),
          hex3: /^#([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
          hex4: /^#([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
          hex6: /^#([0-9a-fA-F]{6})$/,
          hex8: /^#([0-9a-fA-F]{8})$/
        };
      }
      return cachedMatchers;
    }
    function parse255(str) {
      const int = parseInt(str, 10);
      if (int < 0) {
        return 0;
      }
      if (int > 255) {
        return 255;
      }
      return int;
    }
    function parse360(str) {
      const int = parseFloat(str);
      return (int % 360 + 360) % 360 / 360;
    }
    function parse1(str) {
      const num = parseFloat(str);
      if (num < 0) {
        return 0;
      }
      if (num > 1) {
        return 255;
      }
      return Math.round(num * 255);
    }
    function parsePercentage(str) {
      const int = parseFloat(str);
      if (int < 0) {
        return 0;
      }
      if (int > 100) {
        return 1;
      }
      return int / 100;
    }
    function normalizeKeyword(name) {
      switch (name) {
        case "transparent":
          return 0;
        // http://www.w3.org/TR/css3-color/#svg-color
        case "aliceblue":
          return 4042850303;
        case "antiquewhite":
          return 4209760255;
        case "aqua":
          return 16777215;
        case "aquamarine":
          return 2147472639;
        case "azure":
          return 4043309055;
        case "beige":
          return 4126530815;
        case "bisque":
          return 4293182719;
        case "black":
          return 255;
        case "blanchedalmond":
          return 4293643775;
        case "blue":
          return 65535;
        case "blueviolet":
          return 2318131967;
        case "brown":
          return 2771004159;
        case "burlywood":
          return 3736635391;
        case "burntsienna":
          return 3934150143;
        case "cadetblue":
          return 1604231423;
        case "chartreuse":
          return 2147418367;
        case "chocolate":
          return 3530104575;
        case "coral":
          return 4286533887;
        case "cornflowerblue":
          return 1687547391;
        case "cornsilk":
          return 4294499583;
        case "crimson":
          return 3692313855;
        case "cyan":
          return 16777215;
        case "darkblue":
          return 35839;
        case "darkcyan":
          return 9145343;
        case "darkgoldenrod":
          return 3095792639;
        case "darkgray":
          return 2846468607;
        case "darkgreen":
          return 6553855;
        case "darkgrey":
          return 2846468607;
        case "darkkhaki":
          return 3182914559;
        case "darkmagenta":
          return 2332068863;
        case "darkolivegreen":
          return 1433087999;
        case "darkorange":
          return 4287365375;
        case "darkorchid":
          return 2570243327;
        case "darkred":
          return 2332033279;
        case "darksalmon":
          return 3918953215;
        case "darkseagreen":
          return 2411499519;
        case "darkslateblue":
          return 1211993087;
        case "darkslategray":
          return 793726975;
        case "darkslategrey":
          return 793726975;
        case "darkturquoise":
          return 13554175;
        case "darkviolet":
          return 2483082239;
        case "deeppink":
          return 4279538687;
        case "deepskyblue":
          return 12582911;
        case "dimgray":
          return 1768516095;
        case "dimgrey":
          return 1768516095;
        case "dodgerblue":
          return 512819199;
        case "firebrick":
          return 2988581631;
        case "floralwhite":
          return 4294635775;
        case "forestgreen":
          return 579543807;
        case "fuchsia":
          return 4278255615;
        case "gainsboro":
          return 3705462015;
        case "ghostwhite":
          return 4177068031;
        case "gold":
          return 4292280575;
        case "goldenrod":
          return 3668254975;
        case "gray":
          return 2155905279;
        case "green":
          return 8388863;
        case "greenyellow":
          return 2919182335;
        case "grey":
          return 2155905279;
        case "honeydew":
          return 4043305215;
        case "hotpink":
          return 4285117695;
        case "indianred":
          return 3445382399;
        case "indigo":
          return 1258324735;
        case "ivory":
          return 4294963455;
        case "khaki":
          return 4041641215;
        case "lavender":
          return 3873897215;
        case "lavenderblush":
          return 4293981695;
        case "lawngreen":
          return 2096890111;
        case "lemonchiffon":
          return 4294626815;
        case "lightblue":
          return 2916673279;
        case "lightcoral":
          return 4034953471;
        case "lightcyan":
          return 3774873599;
        case "lightgoldenrodyellow":
          return 4210742015;
        case "lightgray":
          return 3553874943;
        case "lightgreen":
          return 2431553791;
        case "lightgrey":
          return 3553874943;
        case "lightpink":
          return 4290167295;
        case "lightsalmon":
          return 4288707327;
        case "lightseagreen":
          return 548580095;
        case "lightskyblue":
          return 2278488831;
        case "lightslategray":
          return 2005441023;
        case "lightslategrey":
          return 2005441023;
        case "lightsteelblue":
          return 2965692159;
        case "lightyellow":
          return 4294959359;
        case "lime":
          return 16711935;
        case "limegreen":
          return 852308735;
        case "linen":
          return 4210091775;
        case "magenta":
          return 4278255615;
        case "maroon":
          return 2147483903;
        case "mediumaquamarine":
          return 1724754687;
        case "mediumblue":
          return 52735;
        case "mediumorchid":
          return 3126187007;
        case "mediumpurple":
          return 2473647103;
        case "mediumseagreen":
          return 1018393087;
        case "mediumslateblue":
          return 2070474495;
        case "mediumspringgreen":
          return 16423679;
        case "mediumturquoise":
          return 1221709055;
        case "mediumvioletred":
          return 3340076543;
        case "midnightblue":
          return 421097727;
        case "mintcream":
          return 4127193855;
        case "mistyrose":
          return 4293190143;
        case "moccasin":
          return 4293178879;
        case "navajowhite":
          return 4292783615;
        case "navy":
          return 33023;
        case "oldlace":
          return 4260751103;
        case "olive":
          return 2155872511;
        case "olivedrab":
          return 1804477439;
        case "orange":
          return 4289003775;
        case "orangered":
          return 4282712319;
        case "orchid":
          return 3664828159;
        case "palegoldenrod":
          return 4008225535;
        case "palegreen":
          return 2566625535;
        case "paleturquoise":
          return 2951671551;
        case "palevioletred":
          return 3681588223;
        case "papayawhip":
          return 4293907967;
        case "peachpuff":
          return 4292524543;
        case "peru":
          return 3448061951;
        case "pink":
          return 4290825215;
        case "plum":
          return 3718307327;
        case "powderblue":
          return 2967529215;
        case "purple":
          return 2147516671;
        case "rebeccapurple":
          return 1714657791;
        case "red":
          return 4278190335;
        case "rosybrown":
          return 3163525119;
        case "royalblue":
          return 1097458175;
        case "saddlebrown":
          return 2336560127;
        case "salmon":
          return 4202722047;
        case "sandybrown":
          return 4104413439;
        case "seagreen":
          return 780883967;
        case "seashell":
          return 4294307583;
        case "sienna":
          return 2689740287;
        case "silver":
          return 3233857791;
        case "skyblue":
          return 2278484991;
        case "slateblue":
          return 1784335871;
        case "slategray":
          return 1887473919;
        case "slategrey":
          return 1887473919;
        case "snow":
          return 4294638335;
        case "springgreen":
          return 16744447;
        case "steelblue":
          return 1182971135;
        case "tan":
          return 3535047935;
        case "teal":
          return 8421631;
        case "thistle":
          return 3636451583;
        case "tomato":
          return 4284696575;
        case "turquoise":
          return 1088475391;
        case "violet":
          return 4001558271;
        case "wheat":
          return 4125012991;
        case "white":
          return 4294967295;
        case "whitesmoke":
          return 4126537215;
        case "yellow":
          return 4294902015;
        case "yellowgreen":
          return 2597139199;
      }
      return null;
    }
    module.exports = normalizeColor4;
  }
});

// node_modules/inline-style-prefixer/lib/utils/capitalizeString.js
var require_capitalizeString = __commonJS({
  "node_modules/inline-style-prefixer/lib/utils/capitalizeString.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = capitalizeString;
    function capitalizeString(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
  }
});

// node_modules/inline-style-prefixer/lib/utils/prefixProperty.js
var require_prefixProperty = __commonJS({
  "node_modules/inline-style-prefixer/lib/utils/prefixProperty.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = prefixProperty;
    var _capitalizeString = require_capitalizeString();
    var _capitalizeString2 = _interopRequireDefault(_capitalizeString);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function prefixProperty(prefixProperties, property, style) {
      var requiredPrefixes = prefixProperties[property];
      if (requiredPrefixes && style.hasOwnProperty(property)) {
        var capitalizedProperty = (0, _capitalizeString2.default)(property);
        for (var i = 0; i < requiredPrefixes.length; ++i) {
          var prefixedProperty = requiredPrefixes[i] + capitalizedProperty;
          if (!style[prefixedProperty]) {
            style[prefixedProperty] = style[property];
          }
        }
      }
      return style;
    }
  }
});

// node_modules/inline-style-prefixer/lib/utils/prefixValue.js
var require_prefixValue = __commonJS({
  "node_modules/inline-style-prefixer/lib/utils/prefixValue.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = prefixValue;
    function prefixValue(plugins, property, value, style, metaData) {
      for (var i = 0, len = plugins.length; i < len; ++i) {
        var processedValue = plugins[i](property, value, style, metaData);
        if (processedValue) {
          return processedValue;
        }
      }
    }
  }
});

// node_modules/inline-style-prefixer/lib/utils/addNewValuesOnly.js
var require_addNewValuesOnly = __commonJS({
  "node_modules/inline-style-prefixer/lib/utils/addNewValuesOnly.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = addNewValuesOnly;
    function addIfNew(list, value) {
      if (list.indexOf(value) === -1) {
        list.push(value);
      }
    }
    function addNewValuesOnly(list, values) {
      if (Array.isArray(values)) {
        for (var i = 0, len = values.length; i < len; ++i) {
          addIfNew(list, values[i]);
        }
      } else {
        addIfNew(list, values);
      }
    }
  }
});

// node_modules/inline-style-prefixer/lib/utils/isObject.js
var require_isObject = __commonJS({
  "node_modules/inline-style-prefixer/lib/utils/isObject.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = isObject;
    function isObject(value) {
      return value instanceof Object && !Array.isArray(value);
    }
  }
});

// node_modules/inline-style-prefixer/lib/createPrefixer.js
var require_createPrefixer = __commonJS({
  "node_modules/inline-style-prefixer/lib/createPrefixer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = createPrefixer2;
    var _prefixProperty = require_prefixProperty();
    var _prefixProperty2 = _interopRequireDefault(_prefixProperty);
    var _prefixValue = require_prefixValue();
    var _prefixValue2 = _interopRequireDefault(_prefixValue);
    var _addNewValuesOnly = require_addNewValuesOnly();
    var _addNewValuesOnly2 = _interopRequireDefault(_addNewValuesOnly);
    var _isObject = require_isObject();
    var _isObject2 = _interopRequireDefault(_isObject);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function createPrefixer2(_ref) {
      var prefixMap = _ref.prefixMap, plugins = _ref.plugins;
      return function prefix(style) {
        for (var property in style) {
          var value = style[property];
          if ((0, _isObject2.default)(value)) {
            style[property] = prefix(value);
          } else if (Array.isArray(value)) {
            var combinedValue = [];
            for (var i = 0, len = value.length; i < len; ++i) {
              var processedValue = (0, _prefixValue2.default)(plugins, property, value[i], style, prefixMap);
              (0, _addNewValuesOnly2.default)(combinedValue, processedValue || value[i]);
            }
            if (combinedValue.length > 0) {
              style[property] = combinedValue;
            }
          } else {
            var _processedValue = (0, _prefixValue2.default)(plugins, property, value, style, prefixMap);
            if (_processedValue) {
              style[property] = _processedValue;
            }
            style = (0, _prefixProperty2.default)(prefixMap, property, style);
          }
        }
        return style;
      };
    }
  }
});

// node_modules/css-in-js-utils/lib/assignStyle.js
var require_assignStyle = __commonJS({
  "node_modules/css-in-js-utils/lib/assignStyle.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports["default"] = assignStyle;
    function _typeof(obj) {
      "@babel/helpers - typeof";
      if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
        _typeof = function _typeof2(obj2) {
          return typeof obj2;
        };
      } else {
        _typeof = function _typeof2(obj2) {
          return obj2 && typeof Symbol === "function" && obj2.constructor === Symbol && obj2 !== Symbol.prototype ? "symbol" : typeof obj2;
        };
      }
      return _typeof(obj);
    }
    function _toConsumableArray(arr) {
      return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
    }
    function _nonIterableSpread() {
      throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }
    function _unsupportedIterableToArray(o, minLen) {
      if (!o) return;
      if (typeof o === "string") return _arrayLikeToArray(o, minLen);
      var n = Object.prototype.toString.call(o).slice(8, -1);
      if (n === "Object" && o.constructor) n = o.constructor.name;
      if (n === "Map" || n === "Set") return Array.from(n);
      if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
    }
    function _iterableToArray(iter) {
      if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter);
    }
    function _arrayWithoutHoles(arr) {
      if (Array.isArray(arr)) return _arrayLikeToArray(arr);
    }
    function _arrayLikeToArray(arr, len) {
      if (len == null || len > arr.length) len = arr.length;
      for (var i = 0, arr2 = new Array(len); i < len; i++) {
        arr2[i] = arr[i];
      }
      return arr2;
    }
    function filterUniqueArray(arr) {
      return arr.filter(function(val, index) {
        return arr.lastIndexOf(val) === index;
      });
    }
    function assignStyle(base) {
      for (var i = 0, len = arguments.length <= 1 ? 0 : arguments.length - 1; i < len; ++i) {
        var style = i + 1 < 1 || arguments.length <= i + 1 ? void 0 : arguments[i + 1];
        for (var property in style) {
          var value = style[property];
          var baseValue = base[property];
          if (baseValue && value) {
            if (Array.isArray(baseValue)) {
              base[property] = filterUniqueArray(baseValue.concat(value));
              continue;
            }
            if (Array.isArray(value)) {
              base[property] = filterUniqueArray([baseValue].concat(_toConsumableArray(value)));
              continue;
            }
            if (_typeof(value) === "object") {
              base[property] = assignStyle({}, baseValue, value);
              continue;
            }
          }
          base[property] = value;
        }
      }
      return base;
    }
  }
});

// node_modules/css-in-js-utils/lib/camelCaseProperty.js
var require_camelCaseProperty = __commonJS({
  "node_modules/css-in-js-utils/lib/camelCaseProperty.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports["default"] = camelCaseProperty;
    var DASH = /-([a-z])/g;
    var MS = /^Ms/g;
    var cache4 = {};
    function toUpper(match) {
      return match[1].toUpperCase();
    }
    function camelCaseProperty(property) {
      if (cache4.hasOwnProperty(property)) {
        return cache4[property];
      }
      var camelProp = property.replace(DASH, toUpper).replace(MS, "ms");
      cache4[property] = camelProp;
      return camelProp;
    }
  }
});

// node_modules/hyphenate-style-name/index.cjs.js
var require_index_cjs = __commonJS({
  "node_modules/hyphenate-style-name/index.cjs.js"(exports, module) {
    "use strict";
    var uppercasePattern3 = /[A-Z]/g;
    var msPattern2 = /^ms-/;
    var cache4 = {};
    function toHyphenLower3(match) {
      return "-" + match.toLowerCase();
    }
    function hyphenateStyleName2(name) {
      if (cache4.hasOwnProperty(name)) {
        return cache4[name];
      }
      var hName = name.replace(uppercasePattern3, toHyphenLower3);
      return cache4[name] = msPattern2.test(hName) ? "-" + hName : hName;
    }
    module.exports = hyphenateStyleName2;
  }
});

// node_modules/css-in-js-utils/lib/hyphenateProperty.js
var require_hyphenateProperty = __commonJS({
  "node_modules/css-in-js-utils/lib/hyphenateProperty.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports["default"] = hyphenateProperty;
    var _hyphenateStyleName = require_index_cjs();
    var _hyphenateStyleName2 = _interopRequireDefault(_hyphenateStyleName);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function hyphenateProperty(property) {
      return (0, _hyphenateStyleName2["default"])(property);
    }
  }
});

// node_modules/css-in-js-utils/lib/cssifyDeclaration.js
var require_cssifyDeclaration = __commonJS({
  "node_modules/css-in-js-utils/lib/cssifyDeclaration.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports["default"] = cssifyDeclaration;
    var _hyphenateProperty = require_hyphenateProperty();
    var _hyphenateProperty2 = _interopRequireDefault(_hyphenateProperty);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function cssifyDeclaration(property, value) {
      return (0, _hyphenateProperty2["default"])(property) + ":" + value;
    }
  }
});

// node_modules/css-in-js-utils/lib/cssifyObject.js
var require_cssifyObject = __commonJS({
  "node_modules/css-in-js-utils/lib/cssifyObject.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports["default"] = cssifyObject;
    var _cssifyDeclaration = require_cssifyDeclaration();
    var _cssifyDeclaration2 = _interopRequireDefault(_cssifyDeclaration);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function cssifyObject(style) {
      var css = "";
      for (var property in style) {
        var value = style[property];
        if (typeof value !== "string" && typeof value !== "number") {
          continue;
        }
        if (css) {
          css += ";";
        }
        css += (0, _cssifyDeclaration2["default"])(property, value);
      }
      return css;
    }
  }
});

// node_modules/css-in-js-utils/lib/isPrefixedProperty.js
var require_isPrefixedProperty = __commonJS({
  "node_modules/css-in-js-utils/lib/isPrefixedProperty.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports["default"] = isPrefixedProperty;
    var RE = /^(Webkit|Moz|O|ms)/;
    function isPrefixedProperty(property) {
      return RE.test(property);
    }
  }
});

// node_modules/css-in-js-utils/lib/isPrefixedValue.js
var require_isPrefixedValue = __commonJS({
  "node_modules/css-in-js-utils/lib/isPrefixedValue.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports["default"] = isPrefixedValue;
    var RE = /-webkit-|-moz-|-ms-/;
    function isPrefixedValue(value) {
      return typeof value === "string" && RE.test(value);
    }
  }
});

// node_modules/css-in-js-utils/lib/isUnitlessProperty.js
var require_isUnitlessProperty = __commonJS({
  "node_modules/css-in-js-utils/lib/isUnitlessProperty.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports["default"] = isUnitlessProperty;
    var _hyphenateProperty = require_hyphenateProperty();
    var _hyphenateProperty2 = _interopRequireDefault(_hyphenateProperty);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    var unitlessProperties = {
      borderImageOutset: true,
      borderImageSlice: true,
      borderImageWidth: true,
      fontWeight: true,
      lineHeight: true,
      opacity: true,
      orphans: true,
      tabSize: true,
      widows: true,
      zIndex: true,
      zoom: true,
      // SVG-related properties
      fillOpacity: true,
      floodOpacity: true,
      stopOpacity: true,
      strokeDasharray: true,
      strokeDashoffset: true,
      strokeMiterlimit: true,
      strokeOpacity: true,
      strokeWidth: true
    };
    var prefixedUnitlessProperties = ["animationIterationCount", "boxFlex", "boxFlexGroup", "boxOrdinalGroup", "columnCount", "flex", "flexGrow", "flexPositive", "flexShrink", "flexNegative", "flexOrder", "gridColumn", "gridColumnEnd", "gridColumnStart", "gridRow", "gridRowEnd", "gridRowStart", "lineClamp", "order"];
    var prefixes3 = ["Webkit", "ms", "Moz", "O"];
    function getPrefixedProperty(prefix, property2) {
      return prefix + property2.charAt(0).toUpperCase() + property2.slice(1);
    }
    for (i = 0, len = prefixedUnitlessProperties.length; i < len; ++i) {
      property = prefixedUnitlessProperties[i];
      unitlessProperties[property] = true;
      for (j = 0, jLen = prefixes3.length; j < jLen; ++j) {
        unitlessProperties[getPrefixedProperty(prefixes3[j], property)] = true;
      }
    }
    var property;
    var j;
    var jLen;
    var i;
    var len;
    for (_property in unitlessProperties) {
      unitlessProperties[(0, _hyphenateProperty2["default"])(_property)] = true;
    }
    var _property;
    function isUnitlessProperty(property2) {
      return unitlessProperties.hasOwnProperty(property2);
    }
  }
});

// node_modules/css-in-js-utils/lib/unprefixProperty.js
var require_unprefixProperty = __commonJS({
  "node_modules/css-in-js-utils/lib/unprefixProperty.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports["default"] = unprefixProperty;
    var RE = /^(ms|Webkit|Moz|O)/;
    function unprefixProperty(property) {
      var propertyWithoutPrefix = property.replace(RE, "");
      return propertyWithoutPrefix.charAt(0).toLowerCase() + propertyWithoutPrefix.slice(1);
    }
  }
});

// node_modules/css-in-js-utils/lib/normalizeProperty.js
var require_normalizeProperty = __commonJS({
  "node_modules/css-in-js-utils/lib/normalizeProperty.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports["default"] = normalizeProperty;
    var _camelCaseProperty = require_camelCaseProperty();
    var _camelCaseProperty2 = _interopRequireDefault(_camelCaseProperty);
    var _unprefixProperty = require_unprefixProperty();
    var _unprefixProperty2 = _interopRequireDefault(_unprefixProperty);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function normalizeProperty(property) {
      return (0, _unprefixProperty2["default"])((0, _camelCaseProperty2["default"])(property));
    }
  }
});

// node_modules/css-in-js-utils/lib/resolveArrayValue.js
var require_resolveArrayValue = __commonJS({
  "node_modules/css-in-js-utils/lib/resolveArrayValue.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports["default"] = resolveArrayValue;
    var _hyphenateProperty = require_hyphenateProperty();
    var _hyphenateProperty2 = _interopRequireDefault(_hyphenateProperty);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function resolveArrayValue(property, value) {
      return value.join(";" + (0, _hyphenateProperty2["default"])(property) + ":");
    }
  }
});

// node_modules/css-in-js-utils/lib/unprefixValue.js
var require_unprefixValue = __commonJS({
  "node_modules/css-in-js-utils/lib/unprefixValue.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports["default"] = unprefixValue;
    var RE = /(-ms-|-webkit-|-moz-|-o-)/g;
    function unprefixValue(value) {
      if (typeof value === "string") {
        return value.replace(RE, "");
      }
      return value;
    }
  }
});

// node_modules/css-in-js-utils/lib/index.js
var require_lib = __commonJS({
  "node_modules/css-in-js-utils/lib/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.unprefixValue = exports.unprefixProperty = exports.resolveArrayValue = exports.normalizeProperty = exports.isUnitlessProperty = exports.isPrefixedValue = exports.isPrefixedProperty = exports.hyphenateProperty = exports.cssifyObject = exports.cssifyDeclaration = exports.camelCaseProperty = exports.assignStyle = void 0;
    var _assignStyle = require_assignStyle();
    var _assignStyle2 = _interopRequireDefault(_assignStyle);
    var _camelCaseProperty = require_camelCaseProperty();
    var _camelCaseProperty2 = _interopRequireDefault(_camelCaseProperty);
    var _cssifyDeclaration = require_cssifyDeclaration();
    var _cssifyDeclaration2 = _interopRequireDefault(_cssifyDeclaration);
    var _cssifyObject = require_cssifyObject();
    var _cssifyObject2 = _interopRequireDefault(_cssifyObject);
    var _hyphenateProperty = require_hyphenateProperty();
    var _hyphenateProperty2 = _interopRequireDefault(_hyphenateProperty);
    var _isPrefixedProperty = require_isPrefixedProperty();
    var _isPrefixedProperty2 = _interopRequireDefault(_isPrefixedProperty);
    var _isPrefixedValue = require_isPrefixedValue();
    var _isPrefixedValue2 = _interopRequireDefault(_isPrefixedValue);
    var _isUnitlessProperty = require_isUnitlessProperty();
    var _isUnitlessProperty2 = _interopRequireDefault(_isUnitlessProperty);
    var _normalizeProperty = require_normalizeProperty();
    var _normalizeProperty2 = _interopRequireDefault(_normalizeProperty);
    var _resolveArrayValue = require_resolveArrayValue();
    var _resolveArrayValue2 = _interopRequireDefault(_resolveArrayValue);
    var _unprefixProperty = require_unprefixProperty();
    var _unprefixProperty2 = _interopRequireDefault(_unprefixProperty);
    var _unprefixValue = require_unprefixValue();
    var _unprefixValue2 = _interopRequireDefault(_unprefixValue);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    exports.assignStyle = _assignStyle2["default"];
    exports.camelCaseProperty = _camelCaseProperty2["default"];
    exports.cssifyDeclaration = _cssifyDeclaration2["default"];
    exports.cssifyObject = _cssifyObject2["default"];
    exports.hyphenateProperty = _hyphenateProperty2["default"];
    exports.isPrefixedProperty = _isPrefixedProperty2["default"];
    exports.isPrefixedValue = _isPrefixedValue2["default"];
    exports.isUnitlessProperty = _isUnitlessProperty2["default"];
    exports.normalizeProperty = _normalizeProperty2["default"];
    exports.resolveArrayValue = _resolveArrayValue2["default"];
    exports.unprefixProperty = _unprefixProperty2["default"];
    exports.unprefixValue = _unprefixValue2["default"];
  }
});

// node_modules/inline-style-prefixer/lib/plugins/crossFade.js
var require_crossFade = __commonJS({
  "node_modules/inline-style-prefixer/lib/plugins/crossFade.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = crossFade2;
    var _cssInJsUtils = require_lib();
    var CROSS_FADE_REGEX = /cross-fade\(/g;
    var prefixes3 = ["-webkit-", ""];
    function crossFade2(property, value) {
      if (typeof value === "string" && !(0, _cssInJsUtils.isPrefixedValue)(value) && value.indexOf("cross-fade(") !== -1) {
        return prefixes3.map(function(prefix) {
          return value.replace(CROSS_FADE_REGEX, prefix + "cross-fade(");
        });
      }
    }
  }
});

// node_modules/inline-style-prefixer/lib/plugins/imageSet.js
var require_imageSet = __commonJS({
  "node_modules/inline-style-prefixer/lib/plugins/imageSet.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = imageSet2;
    var _isPrefixedValue = require_isPrefixedValue();
    var _isPrefixedValue2 = _interopRequireDefault(_isPrefixedValue);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var prefixes3 = ["-webkit-", ""];
    function imageSet2(property, value) {
      if (typeof value === "string" && !(0, _isPrefixedValue2.default)(value) && value.indexOf("image-set(") > -1) {
        return prefixes3.map(function(prefix) {
          return value.replace(/image-set\(/g, prefix + "image-set(");
        });
      }
    }
  }
});

// node_modules/inline-style-prefixer/lib/plugins/logical.js
var require_logical = __commonJS({
  "node_modules/inline-style-prefixer/lib/plugins/logical.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = logical2;
    var alternativeProps = {
      marginBlockStart: ["WebkitMarginBefore"],
      marginBlockEnd: ["WebkitMarginAfter"],
      marginInlineStart: ["WebkitMarginStart", "MozMarginStart"],
      marginInlineEnd: ["WebkitMarginEnd", "MozMarginEnd"],
      paddingBlockStart: ["WebkitPaddingBefore"],
      paddingBlockEnd: ["WebkitPaddingAfter"],
      paddingInlineStart: ["WebkitPaddingStart", "MozPaddingStart"],
      paddingInlineEnd: ["WebkitPaddingEnd", "MozPaddingEnd"],
      borderBlockStart: ["WebkitBorderBefore"],
      borderBlockStartColor: ["WebkitBorderBeforeColor"],
      borderBlockStartStyle: ["WebkitBorderBeforeStyle"],
      borderBlockStartWidth: ["WebkitBorderBeforeWidth"],
      borderBlockEnd: ["WebkitBorderAfter"],
      borderBlockEndColor: ["WebkitBorderAfterColor"],
      borderBlockEndStyle: ["WebkitBorderAfterStyle"],
      borderBlockEndWidth: ["WebkitBorderAfterWidth"],
      borderInlineStart: ["WebkitBorderStart", "MozBorderStart"],
      borderInlineStartColor: ["WebkitBorderStartColor", "MozBorderStartColor"],
      borderInlineStartStyle: ["WebkitBorderStartStyle", "MozBorderStartStyle"],
      borderInlineStartWidth: ["WebkitBorderStartWidth", "MozBorderStartWidth"],
      borderInlineEnd: ["WebkitBorderEnd", "MozBorderEnd"],
      borderInlineEndColor: ["WebkitBorderEndColor", "MozBorderEndColor"],
      borderInlineEndStyle: ["WebkitBorderEndStyle", "MozBorderEndStyle"],
      borderInlineEndWidth: ["WebkitBorderEndWidth", "MozBorderEndWidth"]
    };
    function logical2(property, value, style) {
      if (Object.prototype.hasOwnProperty.call(alternativeProps, property)) {
        var alternativePropList = alternativeProps[property];
        for (var i = 0, len = alternativePropList.length; i < len; ++i) {
          style[alternativePropList[i]] = value;
        }
      }
    }
  }
});

// node_modules/inline-style-prefixer/lib/plugins/position.js
var require_position = __commonJS({
  "node_modules/inline-style-prefixer/lib/plugins/position.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = position2;
    function position2(property, value) {
      if (property === "position" && value === "sticky") {
        return ["-webkit-sticky", "sticky"];
      }
    }
  }
});

// node_modules/inline-style-prefixer/lib/plugins/sizing.js
var require_sizing = __commonJS({
  "node_modules/inline-style-prefixer/lib/plugins/sizing.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = sizing2;
    var prefixes3 = ["-webkit-", "-moz-", ""];
    var properties = {
      maxHeight: true,
      maxWidth: true,
      width: true,
      height: true,
      columnWidth: true,
      minWidth: true,
      minHeight: true
    };
    var values = {
      "min-content": true,
      "max-content": true,
      "fill-available": true,
      "fit-content": true,
      "contain-floats": true
    };
    function sizing2(property, value) {
      if (properties.hasOwnProperty(property) && values.hasOwnProperty(value)) {
        return prefixes3.map(function(prefix) {
          return prefix + value;
        });
      }
    }
  }
});

// node_modules/inline-style-prefixer/lib/plugins/transition.js
var require_transition = __commonJS({
  "node_modules/inline-style-prefixer/lib/plugins/transition.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = transition2;
    var _hyphenateProperty = require_hyphenateProperty();
    var _hyphenateProperty2 = _interopRequireDefault(_hyphenateProperty);
    var _isPrefixedValue = require_isPrefixedValue();
    var _isPrefixedValue2 = _interopRequireDefault(_isPrefixedValue);
    var _capitalizeString = require_capitalizeString();
    var _capitalizeString2 = _interopRequireDefault(_capitalizeString);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var properties = {
      transition: true,
      transitionProperty: true,
      WebkitTransition: true,
      WebkitTransitionProperty: true,
      MozTransition: true,
      MozTransitionProperty: true
    };
    var prefixMapping = {
      Webkit: "-webkit-",
      Moz: "-moz-",
      ms: "-ms-"
    };
    function prefixValue(value, propertyPrefixMap) {
      if ((0, _isPrefixedValue2.default)(value)) {
        return value;
      }
      var multipleValues = value.split(/,(?![^()]*(?:\([^()]*\))?\))/g);
      for (var i = 0, len = multipleValues.length; i < len; ++i) {
        var singleValue = multipleValues[i];
        var values = [singleValue];
        for (var property in propertyPrefixMap) {
          var dashCaseProperty = (0, _hyphenateProperty2.default)(property);
          if (singleValue.indexOf(dashCaseProperty) > -1 && dashCaseProperty !== "order") {
            var prefixes3 = propertyPrefixMap[property];
            for (var j = 0, pLen = prefixes3.length; j < pLen; ++j) {
              values.unshift(singleValue.replace(dashCaseProperty, prefixMapping[prefixes3[j]] + dashCaseProperty));
            }
          }
        }
        multipleValues[i] = values.join(",");
      }
      return multipleValues.join(",");
    }
    function transition2(property, value, style, propertyPrefixMap) {
      if (typeof value === "string" && properties.hasOwnProperty(property)) {
        var outputValue = prefixValue(value, propertyPrefixMap);
        var webkitOutput = outputValue.split(/,(?![^()]*(?:\([^()]*\))?\))/g).filter(function(val) {
          return !/-moz-|-ms-/.test(val);
        }).join(",");
        if (property.indexOf("Webkit") > -1) {
          return webkitOutput;
        }
        var mozOutput = outputValue.split(/,(?![^()]*(?:\([^()]*\))?\))/g).filter(function(val) {
          return !/-webkit-|-ms-/.test(val);
        }).join(",");
        if (property.indexOf("Moz") > -1) {
          return mozOutput;
        }
        style["Webkit" + (0, _capitalizeString2.default)(property)] = webkitOutput;
        style["Moz" + (0, _capitalizeString2.default)(property)] = mozOutput;
        return outputValue;
      }
    }
  }
});

// node_modules/styleq/dist/transform-localize-style.js
var require_transform_localize_style = __commonJS({
  "node_modules/styleq/dist/transform-localize-style.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.localizeStyle = localizeStyle2;
    var cache4 = /* @__PURE__ */ new WeakMap();
    var markerProp = "$$css$localize";
    function compileStyle(style, isRTL) {
      var compiledStyle = {};
      for (var prop in style) {
        if (prop !== markerProp) {
          var value = style[prop];
          if (Array.isArray(value)) {
            compiledStyle[prop] = isRTL ? value[1] : value[0];
          } else {
            compiledStyle[prop] = value;
          }
        }
      }
      return compiledStyle;
    }
    function localizeStyle2(style, isRTL) {
      if (style[markerProp] != null) {
        var compiledStyleIndex = isRTL ? 1 : 0;
        if (cache4.has(style)) {
          var _cachedStyles = cache4.get(style);
          var _compiledStyle = _cachedStyles[compiledStyleIndex];
          if (_compiledStyle == null) {
            _compiledStyle = compileStyle(style, isRTL);
            _cachedStyles[compiledStyleIndex] = _compiledStyle;
            cache4.set(style, _cachedStyles);
          }
          return _compiledStyle;
        }
        var compiledStyle = compileStyle(style, isRTL);
        var cachedStyles = new Array(2);
        cachedStyles[compiledStyleIndex] = compiledStyle;
        cache4.set(style, cachedStyles);
        return compiledStyle;
      }
      return style;
    }
  }
});

// node_modules/styleq/transform-localize-style.js
var require_transform_localize_style2 = __commonJS({
  "node_modules/styleq/transform-localize-style.js"(exports, module) {
    module.exports = require_transform_localize_style();
  }
});

// node_modules/styleq/dist/styleq.js
var require_styleq = __commonJS({
  "node_modules/styleq/dist/styleq.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.styleq = void 0;
    var cache4 = /* @__PURE__ */ new WeakMap();
    var compiledKey = "$$css";
    function createStyleq(options) {
      var disableCache;
      var disableMix;
      var transform;
      if (options != null) {
        disableCache = options.disableCache === true;
        disableMix = options.disableMix === true;
        transform = options.transform;
      }
      return function styleq3() {
        var definedProperties = [];
        var className = "";
        var inlineStyle = null;
        var nextCache = disableCache ? null : cache4;
        var styles9 = new Array(arguments.length);
        for (var i = 0; i < arguments.length; i++) {
          styles9[i] = arguments[i];
        }
        while (styles9.length > 0) {
          var possibleStyle = styles9.pop();
          if (possibleStyle == null || possibleStyle === false) {
            continue;
          }
          if (Array.isArray(possibleStyle)) {
            for (var _i = 0; _i < possibleStyle.length; _i++) {
              styles9.push(possibleStyle[_i]);
            }
            continue;
          }
          var style = transform != null ? transform(possibleStyle) : possibleStyle;
          if (style.$$css) {
            var classNameChunk = "";
            if (nextCache != null && nextCache.has(style)) {
              var cacheEntry = nextCache.get(style);
              if (cacheEntry != null) {
                classNameChunk = cacheEntry[0];
                definedProperties.push.apply(definedProperties, cacheEntry[1]);
                nextCache = cacheEntry[2];
              }
            } else {
              var definedPropertiesChunk = [];
              for (var prop in style) {
                var value = style[prop];
                if (prop === compiledKey) continue;
                if (typeof value === "string" || value === null) {
                  if (!definedProperties.includes(prop)) {
                    definedProperties.push(prop);
                    if (nextCache != null) {
                      definedPropertiesChunk.push(prop);
                    }
                    if (typeof value === "string") {
                      classNameChunk += classNameChunk ? " " + value : value;
                    }
                  }
                } else {
                  console.error("styleq: ".concat(prop, " typeof ").concat(String(value), ' is not "string" or "null".'));
                }
              }
              if (nextCache != null) {
                var weakMap = /* @__PURE__ */ new WeakMap();
                nextCache.set(style, [classNameChunk, definedPropertiesChunk, weakMap]);
                nextCache = weakMap;
              }
            }
            if (classNameChunk) {
              className = className ? classNameChunk + " " + className : classNameChunk;
            }
          } else {
            if (disableMix) {
              if (inlineStyle == null) {
                inlineStyle = {};
              }
              inlineStyle = Object.assign({}, style, inlineStyle);
            } else {
              var subStyle = null;
              for (var _prop in style) {
                var _value = style[_prop];
                if (_value !== void 0) {
                  if (!definedProperties.includes(_prop)) {
                    if (_value != null) {
                      if (inlineStyle == null) {
                        inlineStyle = {};
                      }
                      if (subStyle == null) {
                        subStyle = {};
                      }
                      subStyle[_prop] = _value;
                    }
                    definedProperties.push(_prop);
                    nextCache = null;
                  }
                }
              }
              if (subStyle != null) {
                inlineStyle = Object.assign(subStyle, inlineStyle);
              }
            }
          }
        }
        var styleProps2 = [className, inlineStyle];
        return styleProps2;
      };
    }
    var styleq2 = createStyleq();
    exports.styleq = styleq2;
    styleq2.factory = createStyleq;
  }
});

// node_modules/styleq/styleq.js
var require_styleq2 = __commonJS({
  "node_modules/styleq/styleq.js"(exports, module) {
    module.exports = require_styleq();
  }
});

// node_modules/postcss-value-parser/lib/parse.js
var require_parse = __commonJS({
  "node_modules/postcss-value-parser/lib/parse.js"(exports, module) {
    var openParentheses = "(".charCodeAt(0);
    var closeParentheses = ")".charCodeAt(0);
    var singleQuote = "'".charCodeAt(0);
    var doubleQuote = '"'.charCodeAt(0);
    var backslash = "\\".charCodeAt(0);
    var slash = "/".charCodeAt(0);
    var comma = ",".charCodeAt(0);
    var colon = ":".charCodeAt(0);
    var star = "*".charCodeAt(0);
    var uLower = "u".charCodeAt(0);
    var uUpper = "U".charCodeAt(0);
    var plus = "+".charCodeAt(0);
    var isUnicodeRange = /^[a-f0-9?-]+$/i;
    module.exports = function(input) {
      var tokens2 = [];
      var value = input;
      var next, quote, prev, token, escape, escapePos, whitespacePos, parenthesesOpenPos;
      var pos = 0;
      var code = value.charCodeAt(pos);
      var max = value.length;
      var stack = [{ nodes: tokens2 }];
      var balanced = 0;
      var parent;
      var name = "";
      var before = "";
      var after = "";
      while (pos < max) {
        if (code <= 32) {
          next = pos;
          do {
            next += 1;
            code = value.charCodeAt(next);
          } while (code <= 32);
          token = value.slice(pos, next);
          prev = tokens2[tokens2.length - 1];
          if (code === closeParentheses && balanced) {
            after = token;
          } else if (prev && prev.type === "div") {
            prev.after = token;
            prev.sourceEndIndex += token.length;
          } else if (code === comma || code === colon || code === slash && value.charCodeAt(next + 1) !== star && (!parent || parent && parent.type === "function" && parent.value !== "calc")) {
            before = token;
          } else {
            tokens2.push({
              type: "space",
              sourceIndex: pos,
              sourceEndIndex: next,
              value: token
            });
          }
          pos = next;
        } else if (code === singleQuote || code === doubleQuote) {
          next = pos;
          quote = code === singleQuote ? "'" : '"';
          token = {
            type: "string",
            sourceIndex: pos,
            quote
          };
          do {
            escape = false;
            next = value.indexOf(quote, next + 1);
            if (~next) {
              escapePos = next;
              while (value.charCodeAt(escapePos - 1) === backslash) {
                escapePos -= 1;
                escape = !escape;
              }
            } else {
              value += quote;
              next = value.length - 1;
              token.unclosed = true;
            }
          } while (escape);
          token.value = value.slice(pos + 1, next);
          token.sourceEndIndex = token.unclosed ? next : next + 1;
          tokens2.push(token);
          pos = next + 1;
          code = value.charCodeAt(pos);
        } else if (code === slash && value.charCodeAt(pos + 1) === star) {
          next = value.indexOf("*/", pos);
          token = {
            type: "comment",
            sourceIndex: pos,
            sourceEndIndex: next + 2
          };
          if (next === -1) {
            token.unclosed = true;
            next = value.length;
            token.sourceEndIndex = next;
          }
          token.value = value.slice(pos + 2, next);
          tokens2.push(token);
          pos = next + 2;
          code = value.charCodeAt(pos);
        } else if ((code === slash || code === star) && parent && parent.type === "function" && parent.value === "calc") {
          token = value[pos];
          tokens2.push({
            type: "word",
            sourceIndex: pos - before.length,
            sourceEndIndex: pos + token.length,
            value: token
          });
          pos += 1;
          code = value.charCodeAt(pos);
        } else if (code === slash || code === comma || code === colon) {
          token = value[pos];
          tokens2.push({
            type: "div",
            sourceIndex: pos - before.length,
            sourceEndIndex: pos + token.length,
            value: token,
            before,
            after: ""
          });
          before = "";
          pos += 1;
          code = value.charCodeAt(pos);
        } else if (openParentheses === code) {
          next = pos;
          do {
            next += 1;
            code = value.charCodeAt(next);
          } while (code <= 32);
          parenthesesOpenPos = pos;
          token = {
            type: "function",
            sourceIndex: pos - name.length,
            value: name,
            before: value.slice(parenthesesOpenPos + 1, next)
          };
          pos = next;
          if (name === "url" && code !== singleQuote && code !== doubleQuote) {
            next -= 1;
            do {
              escape = false;
              next = value.indexOf(")", next + 1);
              if (~next) {
                escapePos = next;
                while (value.charCodeAt(escapePos - 1) === backslash) {
                  escapePos -= 1;
                  escape = !escape;
                }
              } else {
                value += ")";
                next = value.length - 1;
                token.unclosed = true;
              }
            } while (escape);
            whitespacePos = next;
            do {
              whitespacePos -= 1;
              code = value.charCodeAt(whitespacePos);
            } while (code <= 32);
            if (parenthesesOpenPos < whitespacePos) {
              if (pos !== whitespacePos + 1) {
                token.nodes = [
                  {
                    type: "word",
                    sourceIndex: pos,
                    sourceEndIndex: whitespacePos + 1,
                    value: value.slice(pos, whitespacePos + 1)
                  }
                ];
              } else {
                token.nodes = [];
              }
              if (token.unclosed && whitespacePos + 1 !== next) {
                token.after = "";
                token.nodes.push({
                  type: "space",
                  sourceIndex: whitespacePos + 1,
                  sourceEndIndex: next,
                  value: value.slice(whitespacePos + 1, next)
                });
              } else {
                token.after = value.slice(whitespacePos + 1, next);
                token.sourceEndIndex = next;
              }
            } else {
              token.after = "";
              token.nodes = [];
            }
            pos = next + 1;
            token.sourceEndIndex = token.unclosed ? next : pos;
            code = value.charCodeAt(pos);
            tokens2.push(token);
          } else {
            balanced += 1;
            token.after = "";
            token.sourceEndIndex = pos + 1;
            tokens2.push(token);
            stack.push(token);
            tokens2 = token.nodes = [];
            parent = token;
          }
          name = "";
        } else if (closeParentheses === code && balanced) {
          pos += 1;
          code = value.charCodeAt(pos);
          parent.after = after;
          parent.sourceEndIndex += after.length;
          after = "";
          balanced -= 1;
          stack[stack.length - 1].sourceEndIndex = pos;
          stack.pop();
          parent = stack[balanced];
          tokens2 = parent.nodes;
        } else {
          next = pos;
          do {
            if (code === backslash) {
              next += 1;
            }
            next += 1;
            code = value.charCodeAt(next);
          } while (next < max && !(code <= 32 || code === singleQuote || code === doubleQuote || code === comma || code === colon || code === slash || code === openParentheses || code === star && parent && parent.type === "function" && parent.value === "calc" || code === slash && parent.type === "function" && parent.value === "calc" || code === closeParentheses && balanced));
          token = value.slice(pos, next);
          if (openParentheses === code) {
            name = token;
          } else if ((uLower === token.charCodeAt(0) || uUpper === token.charCodeAt(0)) && plus === token.charCodeAt(1) && isUnicodeRange.test(token.slice(2))) {
            tokens2.push({
              type: "unicode-range",
              sourceIndex: pos,
              sourceEndIndex: next,
              value: token
            });
          } else {
            tokens2.push({
              type: "word",
              sourceIndex: pos,
              sourceEndIndex: next,
              value: token
            });
          }
          pos = next;
        }
      }
      for (pos = stack.length - 1; pos; pos -= 1) {
        stack[pos].unclosed = true;
        stack[pos].sourceEndIndex = value.length;
      }
      return stack[0].nodes;
    };
  }
});

// node_modules/postcss-value-parser/lib/walk.js
var require_walk = __commonJS({
  "node_modules/postcss-value-parser/lib/walk.js"(exports, module) {
    module.exports = function walk(nodes, cb, bubble) {
      var i, max, node, result;
      for (i = 0, max = nodes.length; i < max; i += 1) {
        node = nodes[i];
        if (!bubble) {
          result = cb(node, i, nodes);
        }
        if (result !== false && node.type === "function" && Array.isArray(node.nodes)) {
          walk(node.nodes, cb, bubble);
        }
        if (bubble) {
          cb(node, i, nodes);
        }
      }
    };
  }
});

// node_modules/postcss-value-parser/lib/stringify.js
var require_stringify = __commonJS({
  "node_modules/postcss-value-parser/lib/stringify.js"(exports, module) {
    function stringifyNode(node, custom) {
      var type2 = node.type;
      var value = node.value;
      var buf;
      var customResult;
      if (custom && (customResult = custom(node)) !== void 0) {
        return customResult;
      } else if (type2 === "word" || type2 === "space") {
        return value;
      } else if (type2 === "string") {
        buf = node.quote || "";
        return buf + value + (node.unclosed ? "" : buf);
      } else if (type2 === "comment") {
        return "/*" + value + (node.unclosed ? "" : "*/");
      } else if (type2 === "div") {
        return (node.before || "") + value + (node.after || "");
      } else if (Array.isArray(node.nodes)) {
        buf = stringify(node.nodes, custom);
        if (type2 !== "function") {
          return buf;
        }
        return value + "(" + (node.before || "") + buf + (node.after || "") + (node.unclosed ? "" : ")");
      }
      return value;
    }
    function stringify(nodes, custom) {
      var result, i;
      if (Array.isArray(nodes)) {
        result = "";
        for (i = nodes.length - 1; ~i; i -= 1) {
          result = stringifyNode(nodes[i], custom) + result;
        }
        return result;
      }
      return stringifyNode(nodes, custom);
    }
    module.exports = stringify;
  }
});

// node_modules/postcss-value-parser/lib/unit.js
var require_unit = __commonJS({
  "node_modules/postcss-value-parser/lib/unit.js"(exports, module) {
    var minus = "-".charCodeAt(0);
    var plus = "+".charCodeAt(0);
    var dot = ".".charCodeAt(0);
    var exp = "e".charCodeAt(0);
    var EXP = "E".charCodeAt(0);
    function likeNumber(value) {
      var code = value.charCodeAt(0);
      var nextCode;
      if (code === plus || code === minus) {
        nextCode = value.charCodeAt(1);
        if (nextCode >= 48 && nextCode <= 57) {
          return true;
        }
        var nextNextCode = value.charCodeAt(2);
        if (nextCode === dot && nextNextCode >= 48 && nextNextCode <= 57) {
          return true;
        }
        return false;
      }
      if (code === dot) {
        nextCode = value.charCodeAt(1);
        if (nextCode >= 48 && nextCode <= 57) {
          return true;
        }
        return false;
      }
      if (code >= 48 && code <= 57) {
        return true;
      }
      return false;
    }
    module.exports = function(value) {
      var pos = 0;
      var length = value.length;
      var code;
      var nextCode;
      var nextNextCode;
      if (length === 0 || !likeNumber(value)) {
        return false;
      }
      code = value.charCodeAt(pos);
      if (code === plus || code === minus) {
        pos++;
      }
      while (pos < length) {
        code = value.charCodeAt(pos);
        if (code < 48 || code > 57) {
          break;
        }
        pos += 1;
      }
      code = value.charCodeAt(pos);
      nextCode = value.charCodeAt(pos + 1);
      if (code === dot && nextCode >= 48 && nextCode <= 57) {
        pos += 2;
        while (pos < length) {
          code = value.charCodeAt(pos);
          if (code < 48 || code > 57) {
            break;
          }
          pos += 1;
        }
      }
      code = value.charCodeAt(pos);
      nextCode = value.charCodeAt(pos + 1);
      nextNextCode = value.charCodeAt(pos + 2);
      if ((code === exp || code === EXP) && (nextCode >= 48 && nextCode <= 57 || (nextCode === plus || nextCode === minus) && nextNextCode >= 48 && nextNextCode <= 57)) {
        pos += nextCode === plus || nextCode === minus ? 3 : 2;
        while (pos < length) {
          code = value.charCodeAt(pos);
          if (code < 48 || code > 57) {
            break;
          }
          pos += 1;
        }
      }
      return {
        number: value.slice(0, pos),
        unit: value.slice(pos)
      };
    };
  }
});

// node_modules/postcss-value-parser/lib/index.js
var require_lib2 = __commonJS({
  "node_modules/postcss-value-parser/lib/index.js"(exports, module) {
    var parse = require_parse();
    var walk = require_walk();
    var stringify = require_stringify();
    function ValueParser(value) {
      if (this instanceof ValueParser) {
        this.nodes = parse(value);
        return this;
      }
      return new ValueParser(value);
    }
    ValueParser.prototype.toString = function() {
      return Array.isArray(this.nodes) ? stringify(this.nodes) : "";
    };
    ValueParser.prototype.walk = function(cb, bubble) {
      walk(this.nodes, cb, bubble);
      return this;
    };
    ValueParser.unit = require_unit();
    ValueParser.walk = walk;
    ValueParser.stringify = stringify;
    module.exports = ValueParser;
  }
});

// node_modules/@babel/runtime/helpers/extends.js
var require_extends = __commonJS({
  "node_modules/@babel/runtime/helpers/extends.js"(exports, module) {
    function _extends6() {
      return module.exports = _extends6 = Object.assign ? Object.assign.bind() : function(n) {
        for (var e3 = 1; e3 < arguments.length; e3++) {
          var t = arguments[e3];
          for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
        }
        return n;
      }, module.exports.__esModule = true, module.exports["default"] = module.exports, _extends6.apply(null, arguments);
    }
    module.exports = _extends6, module.exports.__esModule = true, module.exports["default"] = module.exports;
  }
});

// node_modules/fbjs/lib/invariant.js
var require_invariant = __commonJS({
  "node_modules/fbjs/lib/invariant.js"(exports, module) {
    "use strict";
    var validateFormat = process.env.NODE_ENV !== "production" ? function(format) {
      if (format === void 0) {
        throw new Error("invariant(...): Second argument must be a string.");
      }
    } : function(format) {
    };
    function invariant5(condition, format) {
      for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
        args[_key - 2] = arguments[_key];
      }
      validateFormat(format);
      if (!condition) {
        var error2;
        if (format === void 0) {
          error2 = new Error("Minified exception occurred; use the non-minified dev environment for the full error message and additional helpful warnings.");
        } else {
          var argIndex = 0;
          error2 = new Error(format.replace(/%s/g, function() {
            return String(args[argIndex++]);
          }));
          error2.name = "Invariant Violation";
        }
        error2.framesToPop = 1;
        throw error2;
      }
    }
    module.exports = invariant5;
  }
});

// node_modules/fbjs/lib/emptyFunction.js
var require_emptyFunction = __commonJS({
  "node_modules/fbjs/lib/emptyFunction.js"(exports, module) {
    "use strict";
    function makeEmptyFunction(arg) {
      return function() {
        return arg;
      };
    }
    var emptyFunction3 = function emptyFunction4() {
    };
    emptyFunction3.thatReturns = makeEmptyFunction;
    emptyFunction3.thatReturnsFalse = makeEmptyFunction(false);
    emptyFunction3.thatReturnsTrue = makeEmptyFunction(true);
    emptyFunction3.thatReturnsNull = makeEmptyFunction(null);
    emptyFunction3.thatReturnsThis = function() {
      return this;
    };
    emptyFunction3.thatReturnsArgument = function(arg) {
      return arg;
    };
    module.exports = emptyFunction3;
  }
});

// node_modules/fbjs/lib/warning.js
var require_warning = __commonJS({
  "node_modules/fbjs/lib/warning.js"(exports, module) {
    "use strict";
    var emptyFunction3 = require_emptyFunction();
    function printWarning(format) {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }
      var argIndex = 0;
      var message = "Warning: " + format.replace(/%s/g, function() {
        return args[argIndex++];
      });
      if (typeof console !== "undefined") {
        console.error(message);
      }
      try {
        throw new Error(message);
      } catch (x) {
      }
    }
    var warning2 = process.env.NODE_ENV !== "production" ? function(condition, format) {
      if (format === void 0) {
        throw new Error("`warning(condition, format, ...args)` requires a warning message argument");
      }
      if (!condition) {
        for (var _len2 = arguments.length, args = new Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
          args[_key2 - 2] = arguments[_key2];
        }
        printWarning.apply(void 0, [format].concat(args));
      }
    } : emptyFunction3;
    module.exports = warning2;
  }
});

// node_modules/react-native-web/dist/modules/AccessibilityUtil/isDisabled.js
var isDisabled = (props) => props.disabled || Array.isArray(props.accessibilityStates) && props.accessibilityStates.indexOf("disabled") > -1;
var isDisabled_default = isDisabled;

// node_modules/react-native-web/dist/modules/AccessibilityUtil/propsToAriaRole.js
var accessibilityRoleToWebRole = {
  adjustable: "slider",
  button: "button",
  header: "heading",
  image: "img",
  imagebutton: null,
  keyboardkey: null,
  label: null,
  link: "link",
  none: "presentation",
  search: "search",
  summary: "region",
  text: null
};
var propsToAriaRole = (_ref) => {
  var accessibilityRole = _ref.accessibilityRole, role = _ref.role;
  var _role = role || accessibilityRole;
  if (_role) {
    var inferredRole = accessibilityRoleToWebRole[_role];
    if (inferredRole !== null) {
      return inferredRole || _role;
    }
  }
};
var propsToAriaRole_default = propsToAriaRole;

// node_modules/react-native-web/dist/modules/AccessibilityUtil/propsToAccessibilityComponent.js
var roleComponents = {
  article: "article",
  banner: "header",
  blockquote: "blockquote",
  button: "button",
  code: "code",
  complementary: "aside",
  contentinfo: "footer",
  deletion: "del",
  emphasis: "em",
  figure: "figure",
  insertion: "ins",
  form: "form",
  list: "ul",
  listitem: "li",
  main: "main",
  navigation: "nav",
  paragraph: "p",
  region: "section",
  strong: "strong"
};
var emptyObject = {};
var propsToAccessibilityComponent = function propsToAccessibilityComponent2(props) {
  if (props === void 0) {
    props = emptyObject;
  }
  var roleProp = props.role || props.accessibilityRole;
  if (roleProp === "label") {
    return "label";
  }
  var role = propsToAriaRole_default(props);
  if (role) {
    if (role === "heading") {
      var level = props.accessibilityLevel || props["aria-level"];
      if (level != null) {
        return "h" + level;
      }
      return "h1";
    }
    return roleComponents[role];
  }
};
var propsToAccessibilityComponent_default = propsToAccessibilityComponent;

// node_modules/react-native-web/dist/modules/AccessibilityUtil/index.js
var AccessibilityUtil = {
  isDisabled: isDisabled_default,
  propsToAccessibilityComponent: propsToAccessibilityComponent_default,
  propsToAriaRole: propsToAriaRole_default
};
var AccessibilityUtil_default = AccessibilityUtil;

// node_modules/react-native-web/dist/modules/createDOMProps/index.js
var import_objectSpread23 = __toESM(require_objectSpread2());
var import_objectWithoutPropertiesLoose3 = __toESM(require_objectWithoutPropertiesLoose());

// node_modules/react-native-web/dist/exports/StyleSheet/index.js
var import_objectSpread22 = __toESM(require_objectSpread2());
var import_objectWithoutPropertiesLoose2 = __toESM(require_objectWithoutPropertiesLoose());

// node_modules/react-native-web/dist/exports/StyleSheet/compiler/index.js
var import_objectSpread2 = __toESM(require_objectSpread2());
var import_objectWithoutPropertiesLoose = __toESM(require_objectWithoutPropertiesLoose());

// node_modules/react-native-web/dist/exports/StyleSheet/compiler/unitlessNumbers.js
var unitlessNumbers = {
  animationIterationCount: true,
  aspectRatio: true,
  borderImageOutset: true,
  borderImageSlice: true,
  borderImageWidth: true,
  boxFlex: true,
  boxFlexGroup: true,
  boxOrdinalGroup: true,
  columnCount: true,
  flex: true,
  flexGrow: true,
  flexOrder: true,
  flexPositive: true,
  flexShrink: true,
  flexNegative: true,
  fontWeight: true,
  gridRow: true,
  gridRowEnd: true,
  gridRowGap: true,
  gridRowStart: true,
  gridColumn: true,
  gridColumnEnd: true,
  gridColumnGap: true,
  gridColumnStart: true,
  lineClamp: true,
  opacity: true,
  order: true,
  orphans: true,
  tabSize: true,
  widows: true,
  zIndex: true,
  zoom: true,
  // SVG-related
  fillOpacity: true,
  floodOpacity: true,
  stopOpacity: true,
  strokeDasharray: true,
  strokeDashoffset: true,
  strokeMiterlimit: true,
  strokeOpacity: true,
  strokeWidth: true,
  // transform types
  scale: true,
  scaleX: true,
  scaleY: true,
  scaleZ: true,
  // RN properties
  shadowOpacity: true
};
var prefixes = ["ms", "Moz", "O", "Webkit"];
var prefixKey = (prefix, key) => {
  return prefix + key.charAt(0).toUpperCase() + key.substring(1);
};
Object.keys(unitlessNumbers).forEach((prop) => {
  prefixes.forEach((prefix) => {
    unitlessNumbers[prefixKey(prefix, prop)] = unitlessNumbers[prop];
  });
});
var unitlessNumbers_default = unitlessNumbers;

// node_modules/react-native-web/dist/modules/isWebColor/index.js
var isWebColor = (color) => color === "currentcolor" || color === "currentColor" || color === "inherit" || color.indexOf("var(") === 0;
var isWebColor_default = isWebColor;

// node_modules/react-native-web/dist/exports/processColor/index.js
var import_normalize_colors = __toESM(require_normalize_colors());
var processColor = (color) => {
  if (color === void 0 || color === null) {
    return color;
  }
  var int32Color = (0, import_normalize_colors.default)(color);
  if (int32Color === void 0 || int32Color === null) {
    return void 0;
  }
  int32Color = (int32Color << 24 | int32Color >>> 8) >>> 0;
  return int32Color;
};
var processColor_default = processColor;

// node_modules/react-native-web/dist/exports/StyleSheet/compiler/normalizeColor.js
var normalizeColor2 = function normalizeColor3(color, opacity) {
  if (opacity === void 0) {
    opacity = 1;
  }
  if (color == null) return;
  if (typeof color === "string" && isWebColor_default(color)) {
    return color;
  }
  var colorInt = processColor_default(color);
  if (colorInt != null) {
    var r = colorInt >> 16 & 255;
    var g = colorInt >> 8 & 255;
    var b = colorInt & 255;
    var a = (colorInt >> 24 & 255) / 255;
    var alpha = (a * opacity).toFixed(2);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }
};
var normalizeColor_default = normalizeColor2;

// node_modules/react-native-web/dist/exports/StyleSheet/compiler/normalizeValueWithProperty.js
var colorProps = {
  backgroundColor: true,
  borderColor: true,
  borderTopColor: true,
  borderRightColor: true,
  borderBottomColor: true,
  borderLeftColor: true,
  color: true,
  shadowColor: true,
  textDecorationColor: true,
  textShadowColor: true
};
function normalizeValueWithProperty(value, property) {
  var returnValue = value;
  if ((property == null || !unitlessNumbers_default[property]) && typeof value === "number") {
    returnValue = value + "px";
  } else if (property != null && colorProps[property]) {
    returnValue = normalizeColor_default(value);
  }
  return returnValue;
}

// node_modules/react-native-web/dist/modules/canUseDom/index.js
var canUseDOM = !!(typeof window !== "undefined" && window.document && window.document.createElement);
var canUseDom_default = canUseDOM;

// node_modules/react-native-web/dist/exports/StyleSheet/compiler/createReactDOMStyle.js
var emptyObject2 = {};
var supportsCSS3TextDecoration = !canUseDom_default || window.CSS != null && window.CSS.supports != null && (window.CSS.supports("text-decoration-line", "none") || window.CSS.supports("-webkit-text-decoration-line", "none"));
var MONOSPACE_FONT_STACK = "monospace,monospace";
var SYSTEM_FONT_STACK = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
var STYLE_SHORT_FORM_EXPANSIONS = {
  borderColor: ["borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor"],
  borderBlockColor: ["borderTopColor", "borderBottomColor"],
  borderInlineColor: ["borderRightColor", "borderLeftColor"],
  borderRadius: ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"],
  borderStyle: ["borderTopStyle", "borderRightStyle", "borderBottomStyle", "borderLeftStyle"],
  borderBlockStyle: ["borderTopStyle", "borderBottomStyle"],
  borderInlineStyle: ["borderRightStyle", "borderLeftStyle"],
  borderWidth: ["borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth"],
  borderBlockWidth: ["borderTopWidth", "borderBottomWidth"],
  borderInlineWidth: ["borderRightWidth", "borderLeftWidth"],
  insetBlock: ["top", "bottom"],
  insetInline: ["left", "right"],
  marginBlock: ["marginTop", "marginBottom"],
  marginInline: ["marginRight", "marginLeft"],
  paddingBlock: ["paddingTop", "paddingBottom"],
  paddingInline: ["paddingRight", "paddingLeft"],
  overflow: ["overflowX", "overflowY"],
  overscrollBehavior: ["overscrollBehaviorX", "overscrollBehaviorY"],
  borderBlockStartColor: ["borderTopColor"],
  borderBlockStartStyle: ["borderTopStyle"],
  borderBlockStartWidth: ["borderTopWidth"],
  borderBlockEndColor: ["borderBottomColor"],
  borderBlockEndStyle: ["borderBottomStyle"],
  borderBlockEndWidth: ["borderBottomWidth"],
  //borderInlineStartColor: ['borderLeftColor'],
  //borderInlineStartStyle: ['borderLeftStyle'],
  //borderInlineStartWidth: ['borderLeftWidth'],
  //borderInlineEndColor: ['borderRightColor'],
  //borderInlineEndStyle: ['borderRightStyle'],
  //borderInlineEndWidth: ['borderRightWidth'],
  borderEndStartRadius: ["borderBottomLeftRadius"],
  borderEndEndRadius: ["borderBottomRightRadius"],
  borderStartStartRadius: ["borderTopLeftRadius"],
  borderStartEndRadius: ["borderTopRightRadius"],
  insetBlockEnd: ["bottom"],
  insetBlockStart: ["top"],
  //insetInlineEnd: ['right'],
  //insetInlineStart: ['left'],
  marginBlockStart: ["marginTop"],
  marginBlockEnd: ["marginBottom"],
  //marginInlineStart: ['marginLeft'],
  //marginInlineEnd: ['marginRight'],
  paddingBlockStart: ["paddingTop"],
  paddingBlockEnd: ["paddingBottom"]
  //paddingInlineStart: ['marginLeft'],
  //paddingInlineEnd: ['marginRight'],
};
var createReactDOMStyle = (style, isInline) => {
  if (!style) {
    return emptyObject2;
  }
  var resolvedStyle = {};
  var _loop = function _loop2() {
    var value = style[prop];
    if (
      // Ignore everything with a null value
      value == null
    ) {
      return "continue";
    }
    if (prop === "backgroundClip") {
      if (value === "text") {
        resolvedStyle.backgroundClip = value;
        resolvedStyle.WebkitBackgroundClip = value;
      }
    } else if (prop === "flex") {
      if (value === -1) {
        resolvedStyle.flexGrow = 0;
        resolvedStyle.flexShrink = 1;
        resolvedStyle.flexBasis = "auto";
      } else {
        resolvedStyle.flex = value;
      }
    } else if (prop === "font") {
      resolvedStyle[prop] = value.replace("System", SYSTEM_FONT_STACK);
    } else if (prop === "fontFamily") {
      if (value.indexOf("System") > -1) {
        var stack = value.split(/,\s*/);
        stack[stack.indexOf("System")] = SYSTEM_FONT_STACK;
        resolvedStyle[prop] = stack.join(",");
      } else if (value === "monospace") {
        resolvedStyle[prop] = MONOSPACE_FONT_STACK;
      } else {
        resolvedStyle[prop] = value;
      }
    } else if (prop === "textDecorationLine") {
      if (!supportsCSS3TextDecoration) {
        resolvedStyle.textDecoration = value;
      } else {
        resolvedStyle.textDecorationLine = value;
      }
    } else if (prop === "writingDirection") {
      resolvedStyle.direction = value;
    } else {
      var _value = normalizeValueWithProperty(style[prop], prop);
      var longFormProperties = STYLE_SHORT_FORM_EXPANSIONS[prop];
      if (isInline && prop === "inset") {
        if (style.insetInline == null) {
          resolvedStyle.left = _value;
          resolvedStyle.right = _value;
        }
        if (style.insetBlock == null) {
          resolvedStyle.top = _value;
          resolvedStyle.bottom = _value;
        }
      } else if (isInline && prop === "margin") {
        if (style.marginInline == null) {
          resolvedStyle.marginLeft = _value;
          resolvedStyle.marginRight = _value;
        }
        if (style.marginBlock == null) {
          resolvedStyle.marginTop = _value;
          resolvedStyle.marginBottom = _value;
        }
      } else if (isInline && prop === "padding") {
        if (style.paddingInline == null) {
          resolvedStyle.paddingLeft = _value;
          resolvedStyle.paddingRight = _value;
        }
        if (style.paddingBlock == null) {
          resolvedStyle.paddingTop = _value;
          resolvedStyle.paddingBottom = _value;
        }
      } else if (longFormProperties) {
        longFormProperties.forEach((longForm, i) => {
          if (style[longForm] == null) {
            resolvedStyle[longForm] = _value;
          }
        });
      } else {
        resolvedStyle[prop] = _value;
      }
    }
  };
  for (var prop in style) {
    var _ret = _loop();
    if (_ret === "continue") continue;
  }
  return resolvedStyle;
};
var createReactDOMStyle_default = createReactDOMStyle;

// node_modules/react-native-web/dist/exports/StyleSheet/compiler/hash.js
function murmurhash2_32_gc(str, seed) {
  var l = str.length, h = seed ^ l, i = 0, k;
  while (l >= 4) {
    k = str.charCodeAt(i) & 255 | (str.charCodeAt(++i) & 255) << 8 | (str.charCodeAt(++i) & 255) << 16 | (str.charCodeAt(++i) & 255) << 24;
    k = (k & 65535) * 1540483477 + (((k >>> 16) * 1540483477 & 65535) << 16);
    k ^= k >>> 24;
    k = (k & 65535) * 1540483477 + (((k >>> 16) * 1540483477 & 65535) << 16);
    h = (h & 65535) * 1540483477 + (((h >>> 16) * 1540483477 & 65535) << 16) ^ k;
    l -= 4;
    ++i;
  }
  switch (l) {
    case 3:
      h ^= (str.charCodeAt(i + 2) & 255) << 16;
    case 2:
      h ^= (str.charCodeAt(i + 1) & 255) << 8;
    case 1:
      h ^= str.charCodeAt(i) & 255;
      h = (h & 65535) * 1540483477 + (((h >>> 16) * 1540483477 & 65535) << 16);
  }
  h ^= h >>> 13;
  h = (h & 65535) * 1540483477 + (((h >>> 16) * 1540483477 & 65535) << 16);
  h ^= h >>> 15;
  return h >>> 0;
}
var hash = (str) => murmurhash2_32_gc(str, 1).toString(36);
var hash_default = hash;

// node_modules/react-native-web/dist/exports/StyleSheet/compiler/hyphenateStyleName.js
var uppercasePattern = /[A-Z]/g;
var msPattern = /^ms-/;
var cache = {};
function toHyphenLower(match) {
  return "-" + match.toLowerCase();
}
function hyphenateStyleName(name) {
  if (name in cache) {
    return cache[name];
  }
  var hName = name.replace(uppercasePattern, toHyphenLower);
  return cache[name] = msPattern.test(hName) ? "-" + hName : hName;
}
var hyphenateStyleName_default = hyphenateStyleName;

// node_modules/react-native-web/dist/modules/prefixStyles/index.js
var import_createPrefixer = __toESM(require_createPrefixer());

// node_modules/react-native-web/dist/modules/prefixStyles/static.js
var import_crossFade = __toESM(require_crossFade());
var import_imageSet = __toESM(require_imageSet());
var import_logical = __toESM(require_logical());
var import_position = __toESM(require_position());
var import_sizing = __toESM(require_sizing());
var import_transition = __toESM(require_transition());
var w = ["Webkit"];
var m = ["Moz"];
var wm = ["Webkit", "Moz"];
var wms = ["Webkit", "ms"];
var wmms = ["Webkit", "Moz", "ms"];
var static_default = {
  plugins: [import_crossFade.default, import_imageSet.default, import_logical.default, import_position.default, import_sizing.default, import_transition.default],
  prefixMap: {
    appearance: wmms,
    userSelect: wm,
    textEmphasisPosition: wms,
    textEmphasis: wms,
    textEmphasisStyle: wms,
    textEmphasisColor: wms,
    boxDecorationBreak: wms,
    clipPath: w,
    maskImage: wms,
    maskMode: wms,
    maskRepeat: wms,
    maskPosition: wms,
    maskClip: wms,
    maskOrigin: wms,
    maskSize: wms,
    maskComposite: wms,
    mask: wms,
    maskBorderSource: wms,
    maskBorderMode: wms,
    maskBorderSlice: wms,
    maskBorderWidth: wms,
    maskBorderOutset: wms,
    maskBorderRepeat: wms,
    maskBorder: wms,
    maskType: wms,
    textDecorationStyle: w,
    textDecorationSkip: w,
    textDecorationLine: w,
    textDecorationColor: w,
    filter: w,
    breakAfter: w,
    breakBefore: w,
    breakInside: w,
    columnCount: w,
    columnFill: w,
    columnGap: w,
    columnRule: w,
    columnRuleColor: w,
    columnRuleStyle: w,
    columnRuleWidth: w,
    columns: w,
    columnSpan: w,
    columnWidth: w,
    backdropFilter: w,
    hyphens: w,
    flowInto: w,
    flowFrom: w,
    regionFragment: w,
    textOrientation: w,
    tabSize: m,
    fontKerning: w,
    textSizeAdjust: w
  }
};

// node_modules/react-native-web/dist/modules/prefixStyles/index.js
var prefixAll = (0, import_createPrefixer.default)(static_default);
var prefixStyles_default = prefixAll;

// node_modules/react-native-web/dist/exports/StyleSheet/compiler/index.js
var _excluded = ["animationKeyframes"];
var cache2 = /* @__PURE__ */ new Map();
var emptyObject3 = {};
var classicGroup = 1;
var atomicGroup = 3;
var customGroup = {
  borderColor: 2,
  borderRadius: 2,
  borderStyle: 2,
  borderWidth: 2,
  display: 2,
  flex: 2,
  inset: 2,
  margin: 2,
  overflow: 2,
  overscrollBehavior: 2,
  padding: 2,
  insetBlock: 2.1,
  insetInline: 2.1,
  marginInline: 2.1,
  marginBlock: 2.1,
  paddingInline: 2.1,
  paddingBlock: 2.1,
  borderBlockStartColor: 2.2,
  borderBlockStartStyle: 2.2,
  borderBlockStartWidth: 2.2,
  borderBlockEndColor: 2.2,
  borderBlockEndStyle: 2.2,
  borderBlockEndWidth: 2.2,
  borderInlineStartColor: 2.2,
  borderInlineStartStyle: 2.2,
  borderInlineStartWidth: 2.2,
  borderInlineEndColor: 2.2,
  borderInlineEndStyle: 2.2,
  borderInlineEndWidth: 2.2,
  borderEndStartRadius: 2.2,
  borderEndEndRadius: 2.2,
  borderStartStartRadius: 2.2,
  borderStartEndRadius: 2.2,
  insetBlockEnd: 2.2,
  insetBlockStart: 2.2,
  insetInlineEnd: 2.2,
  insetInlineStart: 2.2,
  marginBlockStart: 2.2,
  marginBlockEnd: 2.2,
  marginInlineStart: 2.2,
  marginInlineEnd: 2.2,
  paddingBlockStart: 2.2,
  paddingBlockEnd: 2.2,
  paddingInlineStart: 2.2,
  paddingInlineEnd: 2.2
};
var borderTopLeftRadius = "borderTopLeftRadius";
var borderTopRightRadius = "borderTopRightRadius";
var borderBottomLeftRadius = "borderBottomLeftRadius";
var borderBottomRightRadius = "borderBottomRightRadius";
var borderLeftColor = "borderLeftColor";
var borderLeftStyle = "borderLeftStyle";
var borderLeftWidth = "borderLeftWidth";
var borderRightColor = "borderRightColor";
var borderRightStyle = "borderRightStyle";
var borderRightWidth = "borderRightWidth";
var right = "right";
var marginLeft = "marginLeft";
var marginRight = "marginRight";
var paddingLeft = "paddingLeft";
var paddingRight = "paddingRight";
var left = "left";
var PROPERTIES_FLIP = {
  [borderTopLeftRadius]: borderTopRightRadius,
  [borderTopRightRadius]: borderTopLeftRadius,
  [borderBottomLeftRadius]: borderBottomRightRadius,
  [borderBottomRightRadius]: borderBottomLeftRadius,
  [borderLeftColor]: borderRightColor,
  [borderLeftStyle]: borderRightStyle,
  [borderLeftWidth]: borderRightWidth,
  [borderRightColor]: borderLeftColor,
  [borderRightStyle]: borderLeftStyle,
  [borderRightWidth]: borderLeftWidth,
  [left]: right,
  [marginLeft]: marginRight,
  [marginRight]: marginLeft,
  [paddingLeft]: paddingRight,
  [paddingRight]: paddingLeft,
  [right]: left
};
var PROPERTIES_I18N = {
  borderStartStartRadius: borderTopLeftRadius,
  borderStartEndRadius: borderTopRightRadius,
  borderEndStartRadius: borderBottomLeftRadius,
  borderEndEndRadius: borderBottomRightRadius,
  borderInlineStartColor: borderLeftColor,
  borderInlineStartStyle: borderLeftStyle,
  borderInlineStartWidth: borderLeftWidth,
  borderInlineEndColor: borderRightColor,
  borderInlineEndStyle: borderRightStyle,
  borderInlineEndWidth: borderRightWidth,
  insetInlineEnd: right,
  insetInlineStart: left,
  marginInlineStart: marginLeft,
  marginInlineEnd: marginRight,
  paddingInlineStart: paddingLeft,
  paddingInlineEnd: paddingRight
};
var PROPERTIES_VALUE = ["clear", "float", "textAlign"];
function atomic(style) {
  var compiledStyle = {
    $$css: true
  };
  var compiledRules = [];
  function atomicCompile(srcProp, prop, value) {
    var valueString = stringifyValueWithProperty(value, prop);
    var cacheKey = prop + valueString;
    var cachedResult = cache2.get(cacheKey);
    var identifier;
    if (cachedResult != null) {
      identifier = cachedResult[0];
      compiledRules.push(cachedResult[1]);
    } else {
      var v = srcProp !== prop ? cacheKey : valueString;
      identifier = createIdentifier("r", srcProp, v);
      var order = customGroup[srcProp] || atomicGroup;
      var rules = createAtomicRules(identifier, prop, value);
      var orderedRules = [rules, order];
      compiledRules.push(orderedRules);
      cache2.set(cacheKey, [identifier, orderedRules]);
    }
    return identifier;
  }
  Object.keys(style).sort().forEach((srcProp) => {
    var value = style[srcProp];
    if (value != null) {
      var localizeableValue;
      if (PROPERTIES_VALUE.indexOf(srcProp) > -1) {
        var _left = atomicCompile(srcProp, srcProp, "left");
        var _right = atomicCompile(srcProp, srcProp, "right");
        if (value === "start") {
          localizeableValue = [_left, _right];
        } else if (value === "end") {
          localizeableValue = [_right, _left];
        }
      }
      var propPolyfill = PROPERTIES_I18N[srcProp];
      if (propPolyfill != null) {
        var ltr = atomicCompile(srcProp, propPolyfill, value);
        var rtl = atomicCompile(srcProp, PROPERTIES_FLIP[propPolyfill], value);
        localizeableValue = [ltr, rtl];
      }
      if (srcProp === "transitionProperty") {
        var values = Array.isArray(value) ? value : [value];
        var polyfillIndices = [];
        for (var i = 0; i < values.length; i++) {
          var val = values[i];
          if (typeof val === "string" && PROPERTIES_I18N[val] != null) {
            polyfillIndices.push(i);
          }
        }
        if (polyfillIndices.length > 0) {
          var ltrPolyfillValues = [...values];
          var rtlPolyfillValues = [...values];
          polyfillIndices.forEach((i2) => {
            var ltrVal = ltrPolyfillValues[i2];
            if (typeof ltrVal === "string") {
              var ltrPolyfill = PROPERTIES_I18N[ltrVal];
              var rtlPolyfill = PROPERTIES_FLIP[ltrPolyfill];
              ltrPolyfillValues[i2] = ltrPolyfill;
              rtlPolyfillValues[i2] = rtlPolyfill;
              var _ltr = atomicCompile(srcProp, srcProp, ltrPolyfillValues);
              var _rtl = atomicCompile(srcProp, srcProp, rtlPolyfillValues);
              localizeableValue = [_ltr, _rtl];
            }
          });
        }
      }
      if (localizeableValue == null) {
        localizeableValue = atomicCompile(srcProp, srcProp, value);
      } else {
        compiledStyle["$$css$localize"] = true;
      }
      compiledStyle[srcProp] = localizeableValue;
    }
  });
  return [compiledStyle, compiledRules];
}
function classic(style, name) {
  var compiledStyle = {
    $$css: true
  };
  var compiledRules = [];
  var animationKeyframes = style.animationKeyframes, rest = (0, import_objectWithoutPropertiesLoose.default)(style, _excluded);
  var identifier = createIdentifier("css", name, JSON.stringify(style));
  var selector = "." + identifier;
  var animationName;
  if (animationKeyframes != null) {
    var _processKeyframesValu = processKeyframesValue(animationKeyframes), animationNames = _processKeyframesValu[0], keyframesRules = _processKeyframesValu[1];
    animationName = animationNames.join(",");
    compiledRules.push(...keyframesRules);
  }
  var block = createDeclarationBlock((0, import_objectSpread2.default)((0, import_objectSpread2.default)({}, rest), {}, {
    animationName
  }));
  compiledRules.push("" + selector + block);
  compiledStyle[identifier] = identifier;
  return [compiledStyle, [[compiledRules, classicGroup]]];
}
function inline(originalStyle, isRTL) {
  var style = originalStyle || emptyObject3;
  var frozenProps = {};
  var nextStyle = {};
  var _loop = function _loop2() {
    var originalValue = style[originalProp];
    var prop = originalProp;
    var value = originalValue;
    if (!Object.prototype.hasOwnProperty.call(style, originalProp) || originalValue == null) {
      return "continue";
    }
    if (PROPERTIES_VALUE.indexOf(originalProp) > -1) {
      if (originalValue === "start") {
        value = isRTL ? "right" : "left";
      } else if (originalValue === "end") {
        value = isRTL ? "left" : "right";
      }
    }
    var propPolyfill = PROPERTIES_I18N[originalProp];
    if (propPolyfill != null) {
      prop = isRTL ? PROPERTIES_FLIP[propPolyfill] : propPolyfill;
    }
    if (originalProp === "transitionProperty") {
      var originalValues = Array.isArray(originalValue) ? originalValue : [originalValue];
      originalValues.forEach((val, i) => {
        if (typeof val === "string") {
          var valuePolyfill = PROPERTIES_I18N[val];
          if (valuePolyfill != null) {
            originalValues[i] = isRTL ? PROPERTIES_FLIP[valuePolyfill] : valuePolyfill;
            value = originalValues.join(" ");
          }
        }
      });
    }
    if (!frozenProps[prop]) {
      nextStyle[prop] = value;
    }
    if (prop === originalProp) {
      frozenProps[prop] = true;
    }
  };
  for (var originalProp in style) {
    var _ret = _loop();
    if (_ret === "continue") continue;
  }
  return createReactDOMStyle_default(nextStyle, true);
}
function stringifyValueWithProperty(value, property) {
  var normalizedValue = normalizeValueWithProperty(value, property);
  return typeof normalizedValue !== "string" ? JSON.stringify(normalizedValue || "") : normalizedValue;
}
function createAtomicRules(identifier, property, value) {
  var rules = [];
  var selector = "." + identifier;
  switch (property) {
    case "animationKeyframes": {
      var _processKeyframesValu2 = processKeyframesValue(value), animationNames = _processKeyframesValu2[0], keyframesRules = _processKeyframesValu2[1];
      var block = createDeclarationBlock({
        animationName: animationNames.join(",")
      });
      rules.push("" + selector + block, ...keyframesRules);
      break;
    }
    // Equivalent to using '::placeholder'
    case "placeholderTextColor": {
      var _block = createDeclarationBlock({
        color: value,
        opacity: 1
      });
      rules.push(selector + "::-webkit-input-placeholder" + _block, selector + "::-moz-placeholder" + _block, selector + ":-ms-input-placeholder" + _block, selector + "::placeholder" + _block);
      break;
    }
    // Polyfill for additional 'pointer-events' values
    // See d13f78622b233a0afc0c7a200c0a0792c8ca9e58
    // See https://reactnative.dev/docs/view#pointerevents
    case "pointerEvents": {
      var finalValue = value;
      if (value === "auto") {
        finalValue = "auto!important";
      } else if (value === "none") {
        finalValue = "none!important";
        var _block2 = createDeclarationBlock({
          pointerEvents: "none"
        });
        rules.push(selector + ">* " + _block2);
      } else if (value === "box-none") {
        finalValue = "none!important";
        var _block3 = createDeclarationBlock({
          pointerEvents: "auto"
        });
        rules.push(selector + ">* " + _block3);
      } else if (value === "box-only") {
        finalValue = "auto!important";
        var _block4 = createDeclarationBlock({
          pointerEvents: "none"
        });
        rules.push(selector + ">* " + _block4);
      }
      var _block5 = createDeclarationBlock({
        pointerEvents: finalValue
      });
      rules.push("" + selector + _block5);
      break;
    }
    // Polyfill for draft spec
    // https://drafts.csswg.org/css-scrollbars-1/
    case "scrollbarWidth": {
      if (value === "none") {
        rules.push(selector + "::-webkit-scrollbar{display:none}");
      }
      var _block6 = createDeclarationBlock({
        scrollbarWidth: value
      });
      rules.push("" + selector + _block6);
      break;
    }
    default: {
      var _block7 = createDeclarationBlock({
        [property]: value
      });
      rules.push("" + selector + _block7);
      break;
    }
  }
  return rules;
}
function createDeclarationBlock(style) {
  var domStyle = prefixStyles_default(createReactDOMStyle_default(style));
  var declarationsString = Object.keys(domStyle).map((property) => {
    var value = domStyle[property];
    var prop = hyphenateStyleName_default(property);
    if (Array.isArray(value)) {
      return value.map((v) => prop + ":" + v).join(";");
    } else {
      return prop + ":" + value;
    }
  }).sort().join(";");
  return "{" + declarationsString + ";}";
}
function createIdentifier(prefix, name, key) {
  var hashedString = hash_default(name + key);
  return process.env.NODE_ENV !== "production" ? prefix + "-" + name + "-" + hashedString : prefix + "-" + hashedString;
}
function createKeyframes(keyframes) {
  var prefixes3 = ["-webkit-", ""];
  var identifier = createIdentifier("r", "animation", JSON.stringify(keyframes));
  var steps = "{" + Object.keys(keyframes).map((stepName) => {
    var rule = keyframes[stepName];
    var block = createDeclarationBlock(rule);
    return "" + stepName + block;
  }).join("") + "}";
  var rules = prefixes3.map((prefix) => {
    return "@" + prefix + "keyframes " + identifier + steps;
  });
  return [identifier, rules];
}
function processKeyframesValue(keyframesValue) {
  if (typeof keyframesValue === "number") {
    throw new Error("Invalid CSS keyframes type: " + typeof keyframesValue);
  }
  var animationNames = [];
  var rules = [];
  var value = Array.isArray(keyframesValue) ? keyframesValue : [keyframesValue];
  value.forEach((keyframes) => {
    if (typeof keyframes === "string") {
      animationNames.push(keyframes);
    } else {
      var _createKeyframes = createKeyframes(keyframes), identifier = _createKeyframes[0], keyframesRules = _createKeyframes[1];
      animationNames.push(identifier);
      rules.push(...keyframesRules);
    }
  });
  return [animationNames, rules];
}

// node_modules/react-native-web/dist/exports/StyleSheet/dom/createCSSStyleSheet.js
function createCSSStyleSheet(id, rootNode, textContent) {
  if (canUseDom_default) {
    var root = rootNode != null ? rootNode : document;
    var element = root.getElementById(id);
    if (element == null) {
      element = document.createElement("style");
      element.setAttribute("id", id);
      if (typeof textContent === "string") {
        element.appendChild(document.createTextNode(textContent));
      }
      if (root instanceof ShadowRoot) {
        root.insertBefore(element, root.firstChild);
      } else {
        var head = root.head;
        if (head) {
          head.insertBefore(element, head.firstChild);
        }
      }
    }
    return element.sheet;
  } else {
    return null;
  }
}

// node_modules/react-native-web/dist/exports/StyleSheet/dom/createOrderedCSSStyleSheet.js
var slice = Array.prototype.slice;
function createOrderedCSSStyleSheet(sheet2) {
  var groups = {};
  var selectors = {};
  if (sheet2 != null) {
    var group;
    slice.call(sheet2.cssRules).forEach((cssRule, i) => {
      var cssText = cssRule.cssText;
      if (cssText.indexOf("stylesheet-group") > -1) {
        group = decodeGroupRule(cssRule);
        groups[group] = {
          start: i,
          rules: [cssText]
        };
      } else {
        var selectorText = getSelectorText(cssText);
        if (selectorText != null) {
          selectors[selectorText] = true;
          groups[group].rules.push(cssText);
        }
      }
    });
  }
  function sheetInsert(sheet3, group2, text) {
    var orderedGroups = getOrderedGroups(groups);
    var groupIndex = orderedGroups.indexOf(group2);
    var nextGroupIndex = groupIndex + 1;
    var nextGroup = orderedGroups[nextGroupIndex];
    var position2 = nextGroup != null && groups[nextGroup].start != null ? groups[nextGroup].start : sheet3.cssRules.length;
    var isInserted = insertRuleAt(sheet3, text, position2);
    if (isInserted) {
      if (groups[group2].start == null) {
        groups[group2].start = position2;
      }
      for (var i = nextGroupIndex; i < orderedGroups.length; i += 1) {
        var groupNumber = orderedGroups[i];
        var previousStart = groups[groupNumber].start || 0;
        groups[groupNumber].start = previousStart + 1;
      }
    }
    return isInserted;
  }
  var OrderedCSSStyleSheet = {
    /**
     * The textContent of the style sheet.
     */
    getTextContent() {
      return getOrderedGroups(groups).map((group2) => {
        var rules = groups[group2].rules;
        var marker = rules.shift();
        rules.sort();
        rules.unshift(marker);
        return rules.join("\n");
      }).join("\n");
    },
    /**
     * Insert a rule into the style sheet
     */
    insert(cssText, groupValue) {
      var group2 = Number(groupValue);
      if (groups[group2] == null) {
        var markerRule = encodeGroupRule(group2);
        groups[group2] = {
          start: null,
          rules: [markerRule]
        };
        if (sheet2 != null) {
          sheetInsert(sheet2, group2, markerRule);
        }
      }
      var selectorText = getSelectorText(cssText);
      if (selectorText != null && selectors[selectorText] == null) {
        selectors[selectorText] = true;
        groups[group2].rules.push(cssText);
        if (sheet2 != null) {
          var isInserted = sheetInsert(sheet2, group2, cssText);
          if (!isInserted) {
            groups[group2].rules.pop();
          }
        }
      }
    }
  };
  return OrderedCSSStyleSheet;
}
function encodeGroupRule(group) {
  return '[stylesheet-group="' + group + '"]{}';
}
var groupPattern = /["']/g;
function decodeGroupRule(cssRule) {
  return Number(cssRule.selectorText.split(groupPattern)[1]);
}
function getOrderedGroups(obj) {
  return Object.keys(obj).map(Number).sort((a, b) => a > b ? 1 : -1);
}
var selectorPattern = /\s*([,])\s*/g;
function getSelectorText(cssText) {
  var selector = cssText.split("{")[0].trim();
  return selector !== "" ? selector.replace(selectorPattern, "$1") : null;
}
function insertRuleAt(root, cssText, position2) {
  try {
    root.insertRule(cssText, position2);
    return true;
  } catch (e3) {
    return false;
  }
}

// node_modules/react-native-web/dist/exports/StyleSheet/dom/index.js
var defaultId = "react-native-stylesheet";
var roots = /* @__PURE__ */ new WeakMap();
var sheets = [];
var initialRules = [
  // minimal top-level reset
  "html{-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%;-webkit-tap-highlight-color:rgba(0,0,0,0);}",
  "body{margin:0;}",
  // minimal form pseudo-element reset
  "button::-moz-focus-inner,input::-moz-focus-inner{border:0;padding:0;}",
  "input::-webkit-search-cancel-button,input::-webkit-search-decoration,input::-webkit-search-results-button,input::-webkit-search-results-decoration{display:none;}"
];
function createSheet(root, id) {
  if (id === void 0) {
    id = defaultId;
  }
  var sheet2;
  if (canUseDom_default) {
    var rootNode = root != null ? root.getRootNode() : document;
    if (sheets.length === 0) {
      sheet2 = createOrderedCSSStyleSheet(createCSSStyleSheet(id));
      initialRules.forEach((rule) => {
        sheet2.insert(rule, 0);
      });
      roots.set(rootNode, sheets.length);
      sheets.push(sheet2);
    } else {
      var index = roots.get(rootNode);
      if (index == null) {
        var initialSheet = sheets[0];
        var textContent = initialSheet != null ? initialSheet.getTextContent() : "";
        sheet2 = createOrderedCSSStyleSheet(createCSSStyleSheet(id, rootNode, textContent));
        roots.set(rootNode, sheets.length);
        sheets.push(sheet2);
      } else {
        sheet2 = sheets[index];
      }
    }
  } else {
    if (sheets.length === 0) {
      sheet2 = createOrderedCSSStyleSheet(createCSSStyleSheet(id));
      initialRules.forEach((rule) => {
        sheet2.insert(rule, 0);
      });
      sheets.push(sheet2);
    } else {
      sheet2 = sheets[0];
    }
  }
  return {
    getTextContent() {
      return sheet2.getTextContent();
    },
    id,
    insert(cssText, groupValue) {
      sheets.forEach((s) => {
        s.insert(cssText, groupValue);
      });
    }
  };
}

// node_modules/react-native-web/dist/exports/StyleSheet/index.js
var import_transform_localize_style = __toESM(require_transform_localize_style2());

// node_modules/react-native-web/dist/modules/warnOnce/index.js
var warnedKeys = {};
function warnOnce(key, message) {
  if (process.env.NODE_ENV !== "production") {
    if (warnedKeys[key]) {
      return;
    }
    console.warn(message);
    warnedKeys[key] = true;
  }
}

// node_modules/react-native-web/dist/exports/StyleSheet/preprocess.js
var emptyObject4 = {};
var defaultOffset = {
  height: 0,
  width: 0
};
var createBoxShadowValue = (style) => {
  var shadowColor = style.shadowColor, shadowOffset = style.shadowOffset, shadowOpacity = style.shadowOpacity, shadowRadius = style.shadowRadius;
  var _ref = shadowOffset || defaultOffset, height = _ref.height, width = _ref.width;
  var offsetX = normalizeValueWithProperty(width);
  var offsetY = normalizeValueWithProperty(height);
  var blurRadius = normalizeValueWithProperty(shadowRadius || 0);
  var color = normalizeColor_default(shadowColor || "black", shadowOpacity);
  if (color != null && offsetX != null && offsetY != null && blurRadius != null) {
    return offsetX + " " + offsetY + " " + blurRadius + " " + color;
  }
};
var createTextShadowValue = (style) => {
  var textShadowColor = style.textShadowColor, textShadowOffset = style.textShadowOffset, textShadowRadius = style.textShadowRadius;
  var _ref2 = textShadowOffset || defaultOffset, height = _ref2.height, width = _ref2.width;
  var radius = textShadowRadius || 0;
  var offsetX = normalizeValueWithProperty(width);
  var offsetY = normalizeValueWithProperty(height);
  var blurRadius = normalizeValueWithProperty(radius);
  var color = normalizeValueWithProperty(textShadowColor, "textShadowColor");
  if (color && (height !== 0 || width !== 0 || radius !== 0) && offsetX != null && offsetY != null && blurRadius != null) {
    return offsetX + " " + offsetY + " " + blurRadius + " " + color;
  }
};
var mapBoxShadow = (boxShadow) => {
  if (typeof boxShadow === "string") {
    return boxShadow;
  }
  var offsetX = normalizeValueWithProperty(boxShadow.offsetX) || 0;
  var offsetY = normalizeValueWithProperty(boxShadow.offsetY) || 0;
  var blurRadius = normalizeValueWithProperty(boxShadow.blurRadius) || 0;
  var spreadDistance = normalizeValueWithProperty(boxShadow.spreadDistance) || 0;
  var color = normalizeColor_default(boxShadow.color) || "black";
  var position2 = boxShadow.inset ? "inset " : "";
  return "" + position2 + offsetX + " " + offsetY + " " + blurRadius + " " + spreadDistance + " " + color;
};
var createBoxShadowArrayValue = (value) => {
  return value.map(mapBoxShadow).join(", ");
};
var mapTransform = (transform) => {
  var type2 = Object.keys(transform)[0];
  var value = transform[type2];
  if (type2 === "matrix" || type2 === "matrix3d") {
    return type2 + "(" + value.join(",") + ")";
  } else {
    var normalizedValue = normalizeValueWithProperty(value, type2);
    return type2 + "(" + normalizedValue + ")";
  }
};
var createTransformValue = (value) => {
  return value.map(mapTransform).join(" ");
};
var createTransformOriginValue = (value) => {
  return value.map((v) => normalizeValueWithProperty(v)).join(" ");
};
var PROPERTIES_STANDARD = {
  borderBottomEndRadius: "borderEndEndRadius",
  borderBottomStartRadius: "borderEndStartRadius",
  borderTopEndRadius: "borderStartEndRadius",
  borderTopStartRadius: "borderStartStartRadius",
  borderEndColor: "borderInlineEndColor",
  borderEndStyle: "borderInlineEndStyle",
  borderEndWidth: "borderInlineEndWidth",
  borderStartColor: "borderInlineStartColor",
  borderStartStyle: "borderInlineStartStyle",
  borderStartWidth: "borderInlineStartWidth",
  end: "insetInlineEnd",
  marginEnd: "marginInlineEnd",
  marginHorizontal: "marginInline",
  marginStart: "marginInlineStart",
  marginVertical: "marginBlock",
  paddingEnd: "paddingInlineEnd",
  paddingHorizontal: "paddingInline",
  paddingStart: "paddingInlineStart",
  paddingVertical: "paddingBlock",
  start: "insetInlineStart"
};
var ignoredProps = {
  elevation: true,
  overlayColor: true,
  resizeMode: true,
  tintColor: true
};
var preprocess = function preprocess2(originalStyle, options) {
  if (options === void 0) {
    options = {};
  }
  var style = originalStyle || emptyObject4;
  var nextStyle = {};
  if (options.shadow === true, style.shadowColor != null || style.shadowOffset != null || style.shadowOpacity != null || style.shadowRadius != null) {
    warnOnce("shadowStyles", '"shadow*" style props are deprecated. Use "boxShadow".');
    var boxShadowValue = createBoxShadowValue(style);
    if (boxShadowValue != null) {
      nextStyle.boxShadow = boxShadowValue;
    }
  }
  if (options.textShadow === true, style.textShadowColor != null || style.textShadowOffset != null || style.textShadowRadius != null) {
    warnOnce("textShadowStyles", '"textShadow*" style props are deprecated. Use "textShadow".');
    var textShadowValue = createTextShadowValue(style);
    if (textShadowValue != null && nextStyle.textShadow == null) {
      var textShadow = style.textShadow;
      var value = textShadow ? textShadow + ", " + textShadowValue : textShadowValue;
      nextStyle.textShadow = value;
    }
  }
  for (var originalProp in style) {
    if (
      // Ignore some React Native styles
      ignoredProps[originalProp] != null || originalProp === "shadowColor" || originalProp === "shadowOffset" || originalProp === "shadowOpacity" || originalProp === "shadowRadius" || originalProp === "textShadowColor" || originalProp === "textShadowOffset" || originalProp === "textShadowRadius"
    ) {
      continue;
    }
    var originalValue = style[originalProp];
    var prop = PROPERTIES_STANDARD[originalProp] || originalProp;
    var _value = originalValue;
    if (!Object.prototype.hasOwnProperty.call(style, originalProp) || prop !== originalProp && style[prop] != null) {
      continue;
    }
    if (prop === "aspectRatio" && typeof _value === "number") {
      nextStyle[prop] = _value.toString();
    } else if (prop === "boxShadow") {
      if (Array.isArray(_value)) {
        _value = createBoxShadowArrayValue(_value);
      }
      var boxShadow = nextStyle.boxShadow;
      nextStyle.boxShadow = boxShadow ? _value + ", " + boxShadow : _value;
    } else if (prop === "fontVariant") {
      if (Array.isArray(_value) && _value.length > 0) {
        _value = _value.join(" ");
      }
      nextStyle[prop] = _value;
    } else if (prop === "textAlignVertical") {
      if (style.verticalAlign == null) {
        nextStyle.verticalAlign = _value === "center" ? "middle" : _value;
      }
    } else if (prop === "transform") {
      if (Array.isArray(_value)) {
        _value = createTransformValue(_value);
      }
      nextStyle.transform = _value;
    } else if (prop === "transformOrigin") {
      if (Array.isArray(_value)) {
        _value = createTransformOriginValue(_value);
      }
      nextStyle.transformOrigin = _value;
    } else {
      nextStyle[prop] = _value;
    }
  }
  return nextStyle;
};

// node_modules/react-native-web/dist/exports/StyleSheet/index.js
var import_styleq = __toESM(require_styleq2());

// node_modules/react-native-web/dist/exports/StyleSheet/validate.js
var import_postcss_value_parser = __toESM(require_lib2());
var invalidShortforms = {
  background: true,
  borderBottom: true,
  borderLeft: true,
  borderRight: true,
  borderTop: true,
  font: true,
  grid: true,
  outline: true,
  textDecoration: true
};
var invalidMultiValueShortforms = {
  flex: true,
  margin: true,
  padding: true,
  borderColor: true,
  borderRadius: true,
  borderStyle: true,
  borderWidth: true,
  inset: true,
  insetBlock: true,
  insetInline: true,
  marginBlock: true,
  marginInline: true,
  marginHorizontal: true,
  marginVertical: true,
  paddingBlock: true,
  paddingInline: true,
  paddingHorizontal: true,
  paddingVertical: true,
  overflow: true,
  overscrollBehavior: true,
  backgroundPosition: true
};
function error(message) {
  console.error(message);
}
function validate(obj) {
  for (var k in obj) {
    var prop = k.trim();
    var value = obj[prop];
    var isInvalid = false;
    if (value === null) {
      continue;
    }
    if (typeof value === "string" && value.indexOf("!important") > -1) {
      error('Invalid style declaration "' + prop + ":" + value + '". Values cannot include "!important"');
      isInvalid = true;
    } else {
      var suggestion = "";
      if (prop === "animation" || prop === "animationName") {
        suggestion = 'Did you mean "animationKeyframes"?';
        isInvalid = true;
      } else if (prop === "direction") {
        suggestion = 'Did you mean "writingDirection"?';
        isInvalid = true;
      } else if (invalidShortforms[prop]) {
        suggestion = "Please use long-form properties.";
        isInvalid = true;
      } else if (invalidMultiValueShortforms[prop]) {
        if (typeof value === "string" && (0, import_postcss_value_parser.default)(value).nodes.length > 1) {
          suggestion = 'Value is "' + value + '" but only single values are supported.';
          isInvalid = true;
        }
      }
      if (suggestion !== "") {
        error('Invalid style property of "' + prop + '". ' + suggestion);
      }
    }
    if (isInvalid) {
      delete obj[k];
    }
  }
}

// node_modules/react-native-web/dist/exports/StyleSheet/index.js
var _excluded2 = ["writingDirection"];
var staticStyleMap = /* @__PURE__ */ new WeakMap();
var sheet = createSheet();
var defaultPreprocessOptions = {
  shadow: true,
  textShadow: true
};
function customStyleq(styles9, options) {
  if (options === void 0) {
    options = {};
  }
  var _options = options, writingDirection = _options.writingDirection, preprocessOptions = (0, import_objectWithoutPropertiesLoose2.default)(_options, _excluded2);
  var isRTL = writingDirection === "rtl";
  return import_styleq.styleq.factory({
    transform(style) {
      var compiledStyle = staticStyleMap.get(style);
      if (compiledStyle != null) {
        return (0, import_transform_localize_style.localizeStyle)(compiledStyle, isRTL);
      }
      return preprocess(style, (0, import_objectSpread22.default)((0, import_objectSpread22.default)({}, defaultPreprocessOptions), preprocessOptions));
    }
  })(styles9);
}
function insertRules(compiledOrderedRules) {
  compiledOrderedRules.forEach((_ref) => {
    var rules = _ref[0], order = _ref[1];
    if (sheet != null) {
      rules.forEach((rule) => {
        sheet.insert(rule, order);
      });
    }
  });
}
function compileAndInsertAtomic(style) {
  var _atomic = atomic(preprocess(style, defaultPreprocessOptions)), compiledStyle = _atomic[0], compiledOrderedRules = _atomic[1];
  insertRules(compiledOrderedRules);
  return compiledStyle;
}
function compileAndInsertReset(style, key) {
  var _classic = classic(style, key), compiledStyle = _classic[0], compiledOrderedRules = _classic[1];
  insertRules(compiledOrderedRules);
  return compiledStyle;
}
var absoluteFillObject = {
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  bottom: 0
};
var absoluteFill = create({
  x: (0, import_objectSpread22.default)({}, absoluteFillObject)
}).x;
function create(styles9) {
  Object.keys(styles9).forEach((key) => {
    var styleObj = styles9[key];
    if (styleObj != null && styleObj.$$css !== true) {
      var compiledStyles;
      if (key.indexOf("$raw") > -1) {
        compiledStyles = compileAndInsertReset(styleObj, key.split("$raw")[0]);
      } else {
        if (process.env.NODE_ENV !== "production") {
          validate(styleObj);
          styles9[key] = Object.freeze(styleObj);
        }
        compiledStyles = compileAndInsertAtomic(styleObj);
      }
      staticStyleMap.set(styleObj, compiledStyles);
    }
  });
  return styles9;
}
function compose(style1, style2) {
  if (process.env.NODE_ENV !== "production") {
    var len = arguments.length;
    if (len > 2) {
      var readableStyles = [...arguments].map((a) => flatten(a));
      throw new Error("StyleSheet.compose() only accepts 2 arguments, received " + len + ": " + JSON.stringify(readableStyles));
    }
  }
  return [style1, style2];
}
function flatten() {
  for (var _len = arguments.length, styles9 = new Array(_len), _key = 0; _key < _len; _key++) {
    styles9[_key] = arguments[_key];
  }
  var flatArray = styles9.flat(Infinity);
  var result = {};
  for (var i = 0; i < flatArray.length; i++) {
    var style = flatArray[i];
    if (style != null && typeof style === "object") {
      Object.assign(result, style);
    }
  }
  return result;
}
function getSheet() {
  return {
    id: sheet.id,
    textContent: sheet.getTextContent()
  };
}
function StyleSheet(styles9, options) {
  if (options === void 0) {
    options = {};
  }
  var isRTL = options.writingDirection === "rtl";
  var styleProps2 = customStyleq(styles9, options);
  if (Array.isArray(styleProps2) && styleProps2[1] != null) {
    styleProps2[1] = inline(styleProps2[1], isRTL);
  }
  return styleProps2;
}
StyleSheet.absoluteFill = absoluteFill;
StyleSheet.absoluteFillObject = absoluteFillObject;
StyleSheet.create = create;
StyleSheet.compose = compose;
StyleSheet.flatten = flatten;
StyleSheet.getSheet = getSheet;
StyleSheet.hairlineWidth = 1;
if (canUseDom_default && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__.resolveRNStyle = StyleSheet.flatten;
}
var stylesheet = StyleSheet;
var StyleSheet_default = stylesheet;

// node_modules/react-native-web/dist/modules/createDOMProps/index.js
var _excluded3 = ["aria-activedescendant", "accessibilityActiveDescendant", "aria-atomic", "accessibilityAtomic", "aria-autocomplete", "accessibilityAutoComplete", "aria-busy", "accessibilityBusy", "aria-checked", "accessibilityChecked", "aria-colcount", "accessibilityColumnCount", "aria-colindex", "accessibilityColumnIndex", "aria-colspan", "accessibilityColumnSpan", "aria-controls", "accessibilityControls", "aria-current", "accessibilityCurrent", "aria-describedby", "accessibilityDescribedBy", "aria-details", "accessibilityDetails", "aria-disabled", "accessibilityDisabled", "aria-errormessage", "accessibilityErrorMessage", "aria-expanded", "accessibilityExpanded", "aria-flowto", "accessibilityFlowTo", "aria-haspopup", "accessibilityHasPopup", "aria-hidden", "accessibilityHidden", "aria-invalid", "accessibilityInvalid", "aria-keyshortcuts", "accessibilityKeyShortcuts", "aria-label", "accessibilityLabel", "aria-labelledby", "accessibilityLabelledBy", "aria-level", "accessibilityLevel", "aria-live", "accessibilityLiveRegion", "aria-modal", "accessibilityModal", "aria-multiline", "accessibilityMultiline", "aria-multiselectable", "accessibilityMultiSelectable", "aria-orientation", "accessibilityOrientation", "aria-owns", "accessibilityOwns", "aria-placeholder", "accessibilityPlaceholder", "aria-posinset", "accessibilityPosInSet", "aria-pressed", "accessibilityPressed", "aria-readonly", "accessibilityReadOnly", "aria-required", "accessibilityRequired", "role", "accessibilityRole", "aria-roledescription", "accessibilityRoleDescription", "aria-rowcount", "accessibilityRowCount", "aria-rowindex", "accessibilityRowIndex", "aria-rowspan", "accessibilityRowSpan", "aria-selected", "accessibilitySelected", "aria-setsize", "accessibilitySetSize", "aria-sort", "accessibilitySort", "aria-valuemax", "accessibilityValueMax", "aria-valuemin", "accessibilityValueMin", "aria-valuenow", "accessibilityValueNow", "aria-valuetext", "accessibilityValueText", "dataSet", "focusable", "id", "nativeID", "pointerEvents", "style", "tabIndex", "testID"];
var emptyObject5 = {};
var hasOwnProperty = Object.prototype.hasOwnProperty;
var isArray = Array.isArray;
var uppercasePattern2 = /[A-Z]/g;
function toHyphenLower2(match) {
  return "-" + match.toLowerCase();
}
function hyphenateString(str) {
  return str.replace(uppercasePattern2, toHyphenLower2);
}
function processIDRefList(idRefList) {
  return isArray(idRefList) ? idRefList.join(" ") : idRefList;
}
var pointerEventsStyles = StyleSheet_default.create({
  auto: {
    pointerEvents: "auto"
  },
  "box-none": {
    pointerEvents: "box-none"
  },
  "box-only": {
    pointerEvents: "box-only"
  },
  none: {
    pointerEvents: "none"
  }
});
var createDOMProps = (elementType, props, options) => {
  if (!props) {
    props = emptyObject5;
  }
  var _props = props, ariaActiveDescendant = _props["aria-activedescendant"], accessibilityActiveDescendant = _props.accessibilityActiveDescendant, ariaAtomic = _props["aria-atomic"], accessibilityAtomic = _props.accessibilityAtomic, ariaAutoComplete = _props["aria-autocomplete"], accessibilityAutoComplete = _props.accessibilityAutoComplete, ariaBusy = _props["aria-busy"], accessibilityBusy = _props.accessibilityBusy, ariaChecked = _props["aria-checked"], accessibilityChecked = _props.accessibilityChecked, ariaColumnCount = _props["aria-colcount"], accessibilityColumnCount = _props.accessibilityColumnCount, ariaColumnIndex = _props["aria-colindex"], accessibilityColumnIndex = _props.accessibilityColumnIndex, ariaColumnSpan = _props["aria-colspan"], accessibilityColumnSpan = _props.accessibilityColumnSpan, ariaControls = _props["aria-controls"], accessibilityControls = _props.accessibilityControls, ariaCurrent = _props["aria-current"], accessibilityCurrent = _props.accessibilityCurrent, ariaDescribedBy = _props["aria-describedby"], accessibilityDescribedBy = _props.accessibilityDescribedBy, ariaDetails = _props["aria-details"], accessibilityDetails = _props.accessibilityDetails, ariaDisabled = _props["aria-disabled"], accessibilityDisabled = _props.accessibilityDisabled, ariaErrorMessage = _props["aria-errormessage"], accessibilityErrorMessage = _props.accessibilityErrorMessage, ariaExpanded = _props["aria-expanded"], accessibilityExpanded = _props.accessibilityExpanded, ariaFlowTo = _props["aria-flowto"], accessibilityFlowTo = _props.accessibilityFlowTo, ariaHasPopup = _props["aria-haspopup"], accessibilityHasPopup = _props.accessibilityHasPopup, ariaHidden = _props["aria-hidden"], accessibilityHidden = _props.accessibilityHidden, ariaInvalid = _props["aria-invalid"], accessibilityInvalid = _props.accessibilityInvalid, ariaKeyShortcuts = _props["aria-keyshortcuts"], accessibilityKeyShortcuts = _props.accessibilityKeyShortcuts, ariaLabel = _props["aria-label"], accessibilityLabel = _props.accessibilityLabel, ariaLabelledBy = _props["aria-labelledby"], accessibilityLabelledBy = _props.accessibilityLabelledBy, ariaLevel = _props["aria-level"], accessibilityLevel = _props.accessibilityLevel, ariaLive = _props["aria-live"], accessibilityLiveRegion = _props.accessibilityLiveRegion, ariaModal = _props["aria-modal"], accessibilityModal = _props.accessibilityModal, ariaMultiline = _props["aria-multiline"], accessibilityMultiline = _props.accessibilityMultiline, ariaMultiSelectable = _props["aria-multiselectable"], accessibilityMultiSelectable = _props.accessibilityMultiSelectable, ariaOrientation = _props["aria-orientation"], accessibilityOrientation = _props.accessibilityOrientation, ariaOwns = _props["aria-owns"], accessibilityOwns = _props.accessibilityOwns, ariaPlaceholder = _props["aria-placeholder"], accessibilityPlaceholder = _props.accessibilityPlaceholder, ariaPosInSet = _props["aria-posinset"], accessibilityPosInSet = _props.accessibilityPosInSet, ariaPressed = _props["aria-pressed"], accessibilityPressed = _props.accessibilityPressed, ariaReadOnly = _props["aria-readonly"], accessibilityReadOnly = _props.accessibilityReadOnly, ariaRequired = _props["aria-required"], accessibilityRequired = _props.accessibilityRequired, ariaRole = _props.role, accessibilityRole = _props.accessibilityRole, ariaRoleDescription = _props["aria-roledescription"], accessibilityRoleDescription = _props.accessibilityRoleDescription, ariaRowCount = _props["aria-rowcount"], accessibilityRowCount = _props.accessibilityRowCount, ariaRowIndex = _props["aria-rowindex"], accessibilityRowIndex = _props.accessibilityRowIndex, ariaRowSpan = _props["aria-rowspan"], accessibilityRowSpan = _props.accessibilityRowSpan, ariaSelected = _props["aria-selected"], accessibilitySelected = _props.accessibilitySelected, ariaSetSize = _props["aria-setsize"], accessibilitySetSize = _props.accessibilitySetSize, ariaSort = _props["aria-sort"], accessibilitySort = _props.accessibilitySort, ariaValueMax = _props["aria-valuemax"], accessibilityValueMax = _props.accessibilityValueMax, ariaValueMin = _props["aria-valuemin"], accessibilityValueMin = _props.accessibilityValueMin, ariaValueNow = _props["aria-valuenow"], accessibilityValueNow = _props.accessibilityValueNow, ariaValueText = _props["aria-valuetext"], accessibilityValueText = _props.accessibilityValueText, dataSet = _props.dataSet, focusable = _props.focusable, id = _props.id, nativeID = _props.nativeID, pointerEvents = _props.pointerEvents, style = _props.style, tabIndex = _props.tabIndex, testID = _props.testID, domProps = (0, import_objectWithoutPropertiesLoose3.default)(_props, _excluded3);
  var disabled = ariaDisabled || accessibilityDisabled;
  var role = AccessibilityUtil_default.propsToAriaRole(props);
  var _ariaActiveDescendant = ariaActiveDescendant != null ? ariaActiveDescendant : accessibilityActiveDescendant;
  if (_ariaActiveDescendant != null) {
    domProps["aria-activedescendant"] = _ariaActiveDescendant;
  }
  var _ariaAtomic = ariaAtomic != null ? ariaActiveDescendant : accessibilityAtomic;
  if (_ariaAtomic != null) {
    domProps["aria-atomic"] = _ariaAtomic;
  }
  var _ariaAutoComplete = ariaAutoComplete != null ? ariaAutoComplete : accessibilityAutoComplete;
  if (_ariaAutoComplete != null) {
    domProps["aria-autocomplete"] = _ariaAutoComplete;
  }
  var _ariaBusy = ariaBusy != null ? ariaBusy : accessibilityBusy;
  if (_ariaBusy != null) {
    domProps["aria-busy"] = _ariaBusy;
  }
  var _ariaChecked = ariaChecked != null ? ariaChecked : accessibilityChecked;
  if (_ariaChecked != null) {
    domProps["aria-checked"] = _ariaChecked;
  }
  var _ariaColumnCount = ariaColumnCount != null ? ariaColumnCount : accessibilityColumnCount;
  if (_ariaColumnCount != null) {
    domProps["aria-colcount"] = _ariaColumnCount;
  }
  var _ariaColumnIndex = ariaColumnIndex != null ? ariaColumnIndex : accessibilityColumnIndex;
  if (_ariaColumnIndex != null) {
    domProps["aria-colindex"] = _ariaColumnIndex;
  }
  var _ariaColumnSpan = ariaColumnSpan != null ? ariaColumnSpan : accessibilityColumnSpan;
  if (_ariaColumnSpan != null) {
    domProps["aria-colspan"] = _ariaColumnSpan;
  }
  var _ariaControls = ariaControls != null ? ariaControls : accessibilityControls;
  if (_ariaControls != null) {
    domProps["aria-controls"] = processIDRefList(_ariaControls);
  }
  var _ariaCurrent = ariaCurrent != null ? ariaCurrent : accessibilityCurrent;
  if (_ariaCurrent != null) {
    domProps["aria-current"] = _ariaCurrent;
  }
  var _ariaDescribedBy = ariaDescribedBy != null ? ariaDescribedBy : accessibilityDescribedBy;
  if (_ariaDescribedBy != null) {
    domProps["aria-describedby"] = processIDRefList(_ariaDescribedBy);
  }
  var _ariaDetails = ariaDetails != null ? ariaDetails : accessibilityDetails;
  if (_ariaDetails != null) {
    domProps["aria-details"] = _ariaDetails;
  }
  if (disabled === true) {
    domProps["aria-disabled"] = true;
    if (elementType === "button" || elementType === "form" || elementType === "input" || elementType === "select" || elementType === "textarea") {
      domProps.disabled = true;
    }
  }
  var _ariaErrorMessage = ariaErrorMessage != null ? ariaErrorMessage : accessibilityErrorMessage;
  if (_ariaErrorMessage != null) {
    domProps["aria-errormessage"] = _ariaErrorMessage;
  }
  var _ariaExpanded = ariaExpanded != null ? ariaExpanded : accessibilityExpanded;
  if (_ariaExpanded != null) {
    domProps["aria-expanded"] = _ariaExpanded;
  }
  var _ariaFlowTo = ariaFlowTo != null ? ariaFlowTo : accessibilityFlowTo;
  if (_ariaFlowTo != null) {
    domProps["aria-flowto"] = processIDRefList(_ariaFlowTo);
  }
  var _ariaHasPopup = ariaHasPopup != null ? ariaHasPopup : accessibilityHasPopup;
  if (_ariaHasPopup != null) {
    domProps["aria-haspopup"] = _ariaHasPopup;
  }
  var _ariaHidden = ariaHidden != null ? ariaHidden : accessibilityHidden;
  if (_ariaHidden === true) {
    domProps["aria-hidden"] = _ariaHidden;
  }
  var _ariaInvalid = ariaInvalid != null ? ariaInvalid : accessibilityInvalid;
  if (_ariaInvalid != null) {
    domProps["aria-invalid"] = _ariaInvalid;
  }
  var _ariaKeyShortcuts = ariaKeyShortcuts != null ? ariaKeyShortcuts : accessibilityKeyShortcuts;
  if (_ariaKeyShortcuts != null) {
    domProps["aria-keyshortcuts"] = processIDRefList(_ariaKeyShortcuts);
  }
  var _ariaLabel = ariaLabel != null ? ariaLabel : accessibilityLabel;
  if (_ariaLabel != null) {
    domProps["aria-label"] = _ariaLabel;
  }
  var _ariaLabelledBy = ariaLabelledBy != null ? ariaLabelledBy : accessibilityLabelledBy;
  if (_ariaLabelledBy != null) {
    domProps["aria-labelledby"] = processIDRefList(_ariaLabelledBy);
  }
  var _ariaLevel = ariaLevel != null ? ariaLevel : accessibilityLevel;
  if (_ariaLevel != null) {
    domProps["aria-level"] = _ariaLevel;
  }
  var _ariaLive = ariaLive != null ? ariaLive : accessibilityLiveRegion;
  if (_ariaLive != null) {
    domProps["aria-live"] = _ariaLive === "none" ? "off" : _ariaLive;
  }
  var _ariaModal = ariaModal != null ? ariaModal : accessibilityModal;
  if (_ariaModal != null) {
    domProps["aria-modal"] = _ariaModal;
  }
  var _ariaMultiline = ariaMultiline != null ? ariaMultiline : accessibilityMultiline;
  if (_ariaMultiline != null) {
    domProps["aria-multiline"] = _ariaMultiline;
  }
  var _ariaMultiSelectable = ariaMultiSelectable != null ? ariaMultiSelectable : accessibilityMultiSelectable;
  if (_ariaMultiSelectable != null) {
    domProps["aria-multiselectable"] = _ariaMultiSelectable;
  }
  var _ariaOrientation = ariaOrientation != null ? ariaOrientation : accessibilityOrientation;
  if (_ariaOrientation != null) {
    domProps["aria-orientation"] = _ariaOrientation;
  }
  var _ariaOwns = ariaOwns != null ? ariaOwns : accessibilityOwns;
  if (_ariaOwns != null) {
    domProps["aria-owns"] = processIDRefList(_ariaOwns);
  }
  var _ariaPlaceholder = ariaPlaceholder != null ? ariaPlaceholder : accessibilityPlaceholder;
  if (_ariaPlaceholder != null) {
    domProps["aria-placeholder"] = _ariaPlaceholder;
  }
  var _ariaPosInSet = ariaPosInSet != null ? ariaPosInSet : accessibilityPosInSet;
  if (_ariaPosInSet != null) {
    domProps["aria-posinset"] = _ariaPosInSet;
  }
  var _ariaPressed = ariaPressed != null ? ariaPressed : accessibilityPressed;
  if (_ariaPressed != null) {
    domProps["aria-pressed"] = _ariaPressed;
  }
  var _ariaReadOnly = ariaReadOnly != null ? ariaReadOnly : accessibilityReadOnly;
  if (_ariaReadOnly != null) {
    domProps["aria-readonly"] = _ariaReadOnly;
    if (elementType === "input" || elementType === "select" || elementType === "textarea") {
      domProps.readOnly = true;
    }
  }
  var _ariaRequired = ariaRequired != null ? ariaRequired : accessibilityRequired;
  if (_ariaRequired != null) {
    domProps["aria-required"] = _ariaRequired;
    if (elementType === "input" || elementType === "select" || elementType === "textarea") {
      domProps.required = accessibilityRequired;
    }
  }
  if (role != null) {
    domProps["role"] = role === "none" ? "presentation" : role;
  }
  var _ariaRoleDescription = ariaRoleDescription != null ? ariaRoleDescription : accessibilityRoleDescription;
  if (_ariaRoleDescription != null) {
    domProps["aria-roledescription"] = _ariaRoleDescription;
  }
  var _ariaRowCount = ariaRowCount != null ? ariaRowCount : accessibilityRowCount;
  if (_ariaRowCount != null) {
    domProps["aria-rowcount"] = _ariaRowCount;
  }
  var _ariaRowIndex = ariaRowIndex != null ? ariaRowIndex : accessibilityRowIndex;
  if (_ariaRowIndex != null) {
    domProps["aria-rowindex"] = _ariaRowIndex;
  }
  var _ariaRowSpan = ariaRowSpan != null ? ariaRowSpan : accessibilityRowSpan;
  if (_ariaRowSpan != null) {
    domProps["aria-rowspan"] = _ariaRowSpan;
  }
  var _ariaSelected = ariaSelected != null ? ariaSelected : accessibilitySelected;
  if (_ariaSelected != null) {
    domProps["aria-selected"] = _ariaSelected;
  }
  var _ariaSetSize = ariaSetSize != null ? ariaSetSize : accessibilitySetSize;
  if (_ariaSetSize != null) {
    domProps["aria-setsize"] = _ariaSetSize;
  }
  var _ariaSort = ariaSort != null ? ariaSort : accessibilitySort;
  if (_ariaSort != null) {
    domProps["aria-sort"] = _ariaSort;
  }
  var _ariaValueMax = ariaValueMax != null ? ariaValueMax : accessibilityValueMax;
  if (_ariaValueMax != null) {
    domProps["aria-valuemax"] = _ariaValueMax;
  }
  var _ariaValueMin = ariaValueMin != null ? ariaValueMin : accessibilityValueMin;
  if (_ariaValueMin != null) {
    domProps["aria-valuemin"] = _ariaValueMin;
  }
  var _ariaValueNow = ariaValueNow != null ? ariaValueNow : accessibilityValueNow;
  if (_ariaValueNow != null) {
    domProps["aria-valuenow"] = _ariaValueNow;
  }
  var _ariaValueText = ariaValueText != null ? ariaValueText : accessibilityValueText;
  if (_ariaValueText != null) {
    domProps["aria-valuetext"] = _ariaValueText;
  }
  if (dataSet != null) {
    for (var dataProp in dataSet) {
      if (hasOwnProperty.call(dataSet, dataProp)) {
        var dataName = hyphenateString(dataProp);
        var dataValue = dataSet[dataProp];
        if (dataValue != null) {
          domProps["data-" + dataName] = dataValue;
        }
      }
    }
  }
  if (tabIndex === 0 || tabIndex === "0" || tabIndex === -1 || tabIndex === "-1") {
    domProps.tabIndex = tabIndex;
  } else {
    if (focusable === false) {
      domProps.tabIndex = "-1";
    }
    if (
      // These native elements are keyboard focusable by default
      elementType === "a" || elementType === "button" || elementType === "input" || elementType === "select" || elementType === "textarea"
    ) {
      if (focusable === false || accessibilityDisabled === true) {
        domProps.tabIndex = "-1";
      }
    } else if (
      // These roles are made keyboard focusable by default
      role === "button" || role === "checkbox" || role === "link" || role === "radio" || role === "textbox" || role === "switch"
    ) {
      if (focusable !== false) {
        domProps.tabIndex = "0";
      }
    } else {
      if (focusable === true) {
        domProps.tabIndex = "0";
      }
    }
  }
  if (pointerEvents != null) {
    warnOnce("pointerEvents", "props.pointerEvents is deprecated. Use style.pointerEvents");
  }
  var _StyleSheet = StyleSheet_default([style, pointerEvents && pointerEventsStyles[pointerEvents]], (0, import_objectSpread23.default)({
    writingDirection: "ltr"
  }, options)), className = _StyleSheet[0], inlineStyle = _StyleSheet[1];
  if (className) {
    domProps.className = className;
  }
  if (inlineStyle) {
    domProps.style = inlineStyle;
  }
  var _id = id != null ? id : nativeID;
  if (_id != null) {
    domProps.id = _id;
  }
  if (testID != null) {
    domProps["data-testid"] = testID;
  }
  if (domProps.type == null && elementType === "button") {
    domProps.type = "button";
  }
  return domProps;
};
var createDOMProps_default = createDOMProps;

// node_modules/react-native-web/dist/exports/createElement/index.js
import React2 from "react";

// node_modules/react-native-web/dist/modules/useLocale/index.js
import React, { createContext, useContext } from "react";

// node_modules/react-native-web/dist/modules/useLocale/isLocaleRTL.js
var rtlScripts = /* @__PURE__ */ new Set(["Arab", "Syrc", "Samr", "Mand", "Thaa", "Mend", "Nkoo", "Adlm", "Rohg", "Hebr"]);
var rtlLangs = /* @__PURE__ */ new Set([
  "ae",
  // Avestan
  "ar",
  // Arabic
  "arc",
  // Aramaic
  "bcc",
  // Southern Balochi
  "bqi",
  // Bakthiari
  "ckb",
  // Sorani
  "dv",
  // Dhivehi
  "fa",
  "far",
  // Persian
  "glk",
  // Gilaki
  "he",
  "iw",
  // Hebrew
  "khw",
  // Khowar
  "ks",
  // Kashmiri
  "ku",
  // Kurdish
  "mzn",
  // Mazanderani
  "nqo",
  // N'Ko
  "pnb",
  // Western Punjabi
  "ps",
  // Pashto
  "sd",
  // Sindhi
  "ug",
  // Uyghur
  "ur",
  // Urdu
  "yi"
  // Yiddish
]);
var cache3 = /* @__PURE__ */ new Map();
function isLocaleRTL(locale) {
  var cachedRTL = cache3.get(locale);
  if (cachedRTL) {
    return cachedRTL;
  }
  var isRTL = false;
  if (Intl.Locale) {
    try {
      var script = new Intl.Locale(locale).maximize().script;
      isRTL = rtlScripts.has(script);
    } catch (_unused) {
      var lang = locale.split("-")[0];
      isRTL = rtlLangs.has(lang);
    }
  } else {
    var _lang = locale.split("-")[0];
    isRTL = rtlLangs.has(_lang);
  }
  cache3.set(locale, isRTL);
  return isRTL;
}

// node_modules/react-native-web/dist/modules/useLocale/index.js
var defaultLocale = {
  direction: "ltr",
  locale: "en-US"
};
var LocaleContext = /* @__PURE__ */ createContext(defaultLocale);
function getLocaleDirection(locale) {
  return isLocaleRTL(locale) ? "rtl" : "ltr";
}
function LocaleProvider(props) {
  var direction = props.direction, locale = props.locale, children = props.children;
  var needsContext = direction || locale;
  return needsContext ? /* @__PURE__ */ React.createElement(LocaleContext.Provider, {
    children,
    value: {
      direction: locale ? getLocaleDirection(locale) : direction,
      locale
    }
  }) : children;
}
function useLocaleContext() {
  return useContext(LocaleContext);
}

// node_modules/react-native-web/dist/exports/createElement/index.js
var createElement = (component, props, options) => {
  var accessibilityComponent;
  if (component && component.constructor === String) {
    accessibilityComponent = AccessibilityUtil_default.propsToAccessibilityComponent(props);
  }
  var Component = accessibilityComponent || component;
  var domProps = createDOMProps_default(Component, props, options);
  var element = /* @__PURE__ */ React2.createElement(Component, domProps);
  var elementWithLocaleProvider = domProps.dir ? /* @__PURE__ */ React2.createElement(LocaleProvider, {
    children: element,
    direction: domProps.dir,
    locale: domProps.lang
  }) : element;
  return elementWithLocaleProvider;
};
var createElement_default = createElement;

// node_modules/react-native-web/dist/exports/render/index.js
import { createRoot as domCreateRoot, hydrateRoot as domHydrateRoot } from "react-dom/client";
function hydrate(element, root) {
  createSheet(root);
  return domHydrateRoot(root, element);
}
function render(element, root) {
  createSheet(root);
  var reactRoot = domCreateRoot(root);
  reactRoot.render(element);
  return reactRoot;
}

// node_modules/react-native-web/dist/exports/unmountComponentAtNode/index.js
function unmountComponentAtNode(rootTag) {
  rootTag.unmount();
  return true;
}

// node_modules/react-native-web/dist/modules/getBoundingClientRect/index.js
var getBoundingClientRect = (node) => {
  if (node != null) {
    var isElement = node.nodeType === 1;
    if (isElement && typeof node.getBoundingClientRect === "function") {
      return node.getBoundingClientRect();
    }
  }
};
var getBoundingClientRect_default = getBoundingClientRect;

// node_modules/react-native-web/dist/modules/unitlessNumbers/index.js
var unitlessNumbers2 = {
  animationIterationCount: true,
  aspectRatio: true,
  borderImageOutset: true,
  borderImageSlice: true,
  borderImageWidth: true,
  boxFlex: true,
  boxFlexGroup: true,
  boxOrdinalGroup: true,
  columnCount: true,
  flex: true,
  flexGrow: true,
  flexOrder: true,
  flexPositive: true,
  flexShrink: true,
  flexNegative: true,
  fontWeight: true,
  gridRow: true,
  gridRowEnd: true,
  gridRowGap: true,
  gridRowStart: true,
  gridColumn: true,
  gridColumnEnd: true,
  gridColumnGap: true,
  gridColumnStart: true,
  lineClamp: true,
  opacity: true,
  order: true,
  orphans: true,
  tabSize: true,
  widows: true,
  zIndex: true,
  zoom: true,
  // SVG-related
  fillOpacity: true,
  floodOpacity: true,
  stopOpacity: true,
  strokeDasharray: true,
  strokeDashoffset: true,
  strokeMiterlimit: true,
  strokeOpacity: true,
  strokeWidth: true,
  // transform types
  scale: true,
  scaleX: true,
  scaleY: true,
  scaleZ: true,
  // RN properties
  shadowOpacity: true
};
var prefixes2 = ["ms", "Moz", "O", "Webkit"];
var prefixKey2 = (prefix, key) => {
  return prefix + key.charAt(0).toUpperCase() + key.substring(1);
};
Object.keys(unitlessNumbers2).forEach((prop) => {
  prefixes2.forEach((prefix) => {
    unitlessNumbers2[prefixKey2(prefix, prop)] = unitlessNumbers2[prop];
  });
});
var unitlessNumbers_default2 = unitlessNumbers2;

// node_modules/react-native-web/dist/modules/setValueForStyles/dangerousStyleValue.js
function dangerousStyleValue(name, value, isCustomProperty) {
  var isEmpty = value == null || typeof value === "boolean" || value === "";
  if (isEmpty) {
    return "";
  }
  if (!isCustomProperty && typeof value === "number" && value !== 0 && !(unitlessNumbers_default2.hasOwnProperty(name) && unitlessNumbers_default2[name])) {
    return value + "px";
  }
  return ("" + value).trim();
}
var dangerousStyleValue_default = dangerousStyleValue;

// node_modules/react-native-web/dist/modules/setValueForStyles/index.js
function setValueForStyles(node, styles9) {
  var style = node.style;
  for (var styleName in styles9) {
    if (!styles9.hasOwnProperty(styleName)) {
      continue;
    }
    var isCustomProperty = styleName.indexOf("--") === 0;
    var styleValue = dangerousStyleValue_default(styleName, styles9[styleName], isCustomProperty);
    if (styleName === "float") {
      styleName = "cssFloat";
    }
    if (isCustomProperty) {
      style.setProperty(styleName, styleValue);
    } else {
      style[styleName] = styleValue;
    }
  }
}
var setValueForStyles_default = setValueForStyles;

// node_modules/react-native-web/dist/exports/UIManager/index.js
var getRect = (node) => {
  var height = node.offsetHeight;
  var width = node.offsetWidth;
  var left2 = node.offsetLeft;
  var top = node.offsetTop;
  node = node.offsetParent;
  while (node && node.nodeType === 1) {
    left2 += node.offsetLeft + node.clientLeft - node.scrollLeft;
    top += node.offsetTop + node.clientTop - node.scrollTop;
    node = node.offsetParent;
  }
  top -= window.scrollY;
  left2 -= window.scrollX;
  return {
    width,
    height,
    top,
    left: left2
  };
};
var measureLayout = (node, relativeToNativeNode, callback) => {
  var relativeNode = relativeToNativeNode || node && node.parentNode;
  if (node && relativeNode) {
    setTimeout(() => {
      if (node.isConnected && relativeNode.isConnected) {
        var relativeRect = getRect(relativeNode);
        var _getRect = getRect(node), height = _getRect.height, left2 = _getRect.left, top = _getRect.top, width = _getRect.width;
        var x = left2 - relativeRect.left;
        var y = top - relativeRect.top;
        callback(x, y, width, height, left2, top);
      }
    }, 0);
  }
};
var elementsToIgnore = {
  A: true,
  BODY: true,
  INPUT: true,
  SELECT: true,
  TEXTAREA: true
};
var UIManager = {
  blur(node) {
    try {
      node.blur();
    } catch (err) {
    }
  },
  focus(node) {
    try {
      var name = node.nodeName;
      if (node.getAttribute("tabIndex") == null && node.isContentEditable !== true && elementsToIgnore[name] == null) {
        node.setAttribute("tabIndex", "-1");
      }
      node.focus();
    } catch (err) {
    }
  },
  measure(node, callback) {
    measureLayout(node, null, callback);
  },
  measureInWindow(node, callback) {
    if (node) {
      setTimeout(() => {
        var _getBoundingClientRec = getBoundingClientRect_default(node), height = _getBoundingClientRec.height, left2 = _getBoundingClientRec.left, top = _getBoundingClientRec.top, width = _getBoundingClientRec.width;
        callback(left2, top, width, height);
      }, 0);
    }
  },
  measureLayout(node, relativeToNativeNode, onFail, onSuccess) {
    measureLayout(node, relativeToNativeNode, onSuccess);
  },
  updateView(node, props) {
    for (var prop in props) {
      if (!Object.prototype.hasOwnProperty.call(props, prop)) {
        continue;
      }
      var value = props[prop];
      switch (prop) {
        case "style": {
          setValueForStyles_default(node, value);
          break;
        }
        case "class":
        case "className": {
          node.setAttribute("class", value);
          break;
        }
        case "text":
        case "value":
          node.value = value;
          break;
        default:
          node.setAttribute(prop, value);
      }
    }
  },
  configureNextLayoutAnimation(config, onAnimationDidEnd) {
    onAnimationDidEnd();
  },
  // mocks
  setLayoutAnimationEnabledExperimental() {
  }
};
var UIManager_default = UIManager;

// node_modules/react-native-web/dist/exports/Platform/index.js
var Platform = {
  OS: "web",
  select: (obj) => "web" in obj ? obj.web : obj.default,
  get isTesting() {
    if (process.env.NODE_ENV === "test") {
      return true;
    }
    return false;
  },
  get Version() {
    return "0.0.0";
  }
};
var Platform_default = Platform;

// node_modules/react-native-web/dist/exports/View/index.js
var import_objectWithoutPropertiesLoose4 = __toESM(require_objectWithoutPropertiesLoose());
import * as React7 from "react";

// node_modules/react-native-web/dist/modules/forwardedProps/index.js
var defaultProps = {
  children: true,
  dataSet: true,
  dir: true,
  id: true,
  ref: true,
  suppressHydrationWarning: true,
  tabIndex: true,
  testID: true,
  // @deprecated
  focusable: true,
  nativeID: true
};
var accessibilityProps = {
  "aria-activedescendant": true,
  "aria-atomic": true,
  "aria-autocomplete": true,
  "aria-busy": true,
  "aria-checked": true,
  "aria-colcount": true,
  "aria-colindex": true,
  "aria-colspan": true,
  "aria-controls": true,
  "aria-current": true,
  "aria-describedby": true,
  "aria-details": true,
  "aria-disabled": true,
  "aria-errormessage": true,
  "aria-expanded": true,
  "aria-flowto": true,
  "aria-haspopup": true,
  "aria-hidden": true,
  "aria-invalid": true,
  "aria-keyshortcuts": true,
  "aria-label": true,
  "aria-labelledby": true,
  "aria-level": true,
  "aria-live": true,
  "aria-modal": true,
  "aria-multiline": true,
  "aria-multiselectable": true,
  "aria-orientation": true,
  "aria-owns": true,
  "aria-placeholder": true,
  "aria-posinset": true,
  "aria-pressed": true,
  "aria-readonly": true,
  "aria-required": true,
  inert: true,
  role: true,
  "aria-roledescription": true,
  "aria-rowcount": true,
  "aria-rowindex": true,
  "aria-rowspan": true,
  "aria-selected": true,
  "aria-setsize": true,
  "aria-sort": true,
  "aria-valuemax": true,
  "aria-valuemin": true,
  "aria-valuenow": true,
  "aria-valuetext": true,
  // @deprecated
  accessibilityActiveDescendant: true,
  accessibilityAtomic: true,
  accessibilityAutoComplete: true,
  accessibilityBusy: true,
  accessibilityChecked: true,
  accessibilityColumnCount: true,
  accessibilityColumnIndex: true,
  accessibilityColumnSpan: true,
  accessibilityControls: true,
  accessibilityCurrent: true,
  accessibilityDescribedBy: true,
  accessibilityDetails: true,
  accessibilityDisabled: true,
  accessibilityErrorMessage: true,
  accessibilityExpanded: true,
  accessibilityFlowTo: true,
  accessibilityHasPopup: true,
  accessibilityHidden: true,
  accessibilityInvalid: true,
  accessibilityKeyShortcuts: true,
  accessibilityLabel: true,
  accessibilityLabelledBy: true,
  accessibilityLevel: true,
  accessibilityLiveRegion: true,
  accessibilityModal: true,
  accessibilityMultiline: true,
  accessibilityMultiSelectable: true,
  accessibilityOrientation: true,
  accessibilityOwns: true,
  accessibilityPlaceholder: true,
  accessibilityPosInSet: true,
  accessibilityPressed: true,
  accessibilityReadOnly: true,
  accessibilityRequired: true,
  accessibilityRole: true,
  accessibilityRoleDescription: true,
  accessibilityRowCount: true,
  accessibilityRowIndex: true,
  accessibilityRowSpan: true,
  accessibilitySelected: true,
  accessibilitySetSize: true,
  accessibilitySort: true,
  accessibilityValueMax: true,
  accessibilityValueMin: true,
  accessibilityValueNow: true,
  accessibilityValueText: true
};
var clickProps = {
  onClick: true,
  onAuxClick: true,
  onContextMenu: true,
  onGotPointerCapture: true,
  onLostPointerCapture: true,
  onPointerCancel: true,
  onPointerDown: true,
  onPointerEnter: true,
  onPointerMove: true,
  onPointerLeave: true,
  onPointerOut: true,
  onPointerOver: true,
  onPointerUp: true
};
var focusProps = {
  onBlur: true,
  onFocus: true
};
var keyboardProps = {
  onKeyDown: true,
  onKeyDownCapture: true,
  onKeyUp: true,
  onKeyUpCapture: true
};
var mouseProps = {
  onMouseDown: true,
  onMouseEnter: true,
  onMouseLeave: true,
  onMouseMove: true,
  onMouseOver: true,
  onMouseOut: true,
  onMouseUp: true
};
var touchProps = {
  onTouchCancel: true,
  onTouchCancelCapture: true,
  onTouchEnd: true,
  onTouchEndCapture: true,
  onTouchMove: true,
  onTouchMoveCapture: true,
  onTouchStart: true,
  onTouchStartCapture: true
};
var styleProps = {
  style: true
};

// node_modules/react-native-web/dist/modules/pick/index.js
function pick(obj, list) {
  var nextObj = {};
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (list[key] === true) {
        nextObj[key] = obj[key];
      }
    }
  }
  return nextObj;
}

// node_modules/react-native-web/dist/modules/useLayoutEffect/index.js
import { useEffect, useLayoutEffect } from "react";
var useLayoutEffectImpl = canUseDom_default ? useLayoutEffect : useEffect;
var useLayoutEffect_default = useLayoutEffectImpl;

// node_modules/react-native-web/dist/modules/useElementLayout/index.js
var DOM_LAYOUT_HANDLER_NAME = "__reactLayoutHandler";
var didWarn = !canUseDom_default;
var resizeObserver = null;
function getResizeObserver() {
  if (canUseDom_default && typeof window.ResizeObserver !== "undefined") {
    if (resizeObserver == null) {
      resizeObserver = new window.ResizeObserver(function(entries) {
        entries.forEach((entry) => {
          var node = entry.target;
          var onLayout = node[DOM_LAYOUT_HANDLER_NAME];
          if (typeof onLayout === "function") {
            UIManager_default.measure(node, (x, y, width, height, left2, top) => {
              var event = {
                // $FlowFixMe
                nativeEvent: {
                  layout: {
                    x,
                    y,
                    width,
                    height,
                    left: left2,
                    top
                  }
                },
                timeStamp: Date.now()
              };
              Object.defineProperty(event.nativeEvent, "target", {
                enumerable: true,
                get: () => entry.target
              });
              onLayout(event);
            });
          }
        });
      });
    }
  } else if (!didWarn) {
    if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
      console.warn("onLayout relies on ResizeObserver which is not supported by your browser. Please include a polyfill, e.g., https://github.com/que-etc/resize-observer-polyfill.");
      didWarn = true;
    }
  }
  return resizeObserver;
}
function useElementLayout(ref, onLayout) {
  var observer = getResizeObserver();
  useLayoutEffect_default(() => {
    var node = ref.current;
    if (node != null) {
      node[DOM_LAYOUT_HANDLER_NAME] = onLayout;
    }
  }, [ref, onLayout]);
  useLayoutEffect_default(() => {
    var node = ref.current;
    if (node != null && observer != null) {
      if (typeof node[DOM_LAYOUT_HANDLER_NAME] === "function") {
        observer.observe(node);
      } else {
        observer.unobserve(node);
      }
    }
    return () => {
      if (node != null && observer != null) {
        observer.unobserve(node);
      }
    };
  }, [ref, observer]);
}

// node_modules/react-native-web/dist/modules/useMergeRefs/index.js
import * as React4 from "react";

// node_modules/react-native-web/dist/modules/mergeRefs/index.js
import * as React3 from "react";
function mergeRefs() {
  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }
  return function forwardRef8(node) {
    args.forEach((ref) => {
      if (ref == null) {
        return;
      }
      if (typeof ref === "function") {
        ref(node);
        return;
      }
      if (typeof ref === "object") {
        ref.current = node;
        return;
      }
      console.error("mergeRefs cannot handle Refs of type boolean, number or string, received ref " + String(ref));
    });
  };
}

// node_modules/react-native-web/dist/modules/useMergeRefs/index.js
function useMergeRefs() {
  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }
  return React4.useMemo(
    () => mergeRefs(...args),
    // eslint-disable-next-line
    [...args]
  );
}

// node_modules/react-native-web/dist/modules/useStable/index.js
import * as React5 from "react";
var UNINITIALIZED = typeof Symbol === "function" && typeof /* @__PURE__ */ Symbol() === "symbol" ? /* @__PURE__ */ Symbol() : Object.freeze({});
function useStable(getInitialValue) {
  var ref = React5.useRef(UNINITIALIZED);
  if (ref.current === UNINITIALIZED) {
    ref.current = getInitialValue();
  }
  return ref.current;
}

// node_modules/react-native-web/dist/modules/usePlatformMethods/index.js
function usePlatformMethods(_ref) {
  var pointerEvents = _ref.pointerEvents, style = _ref.style;
  var ref = useStable(() => (hostNode) => {
    if (hostNode != null) {
      hostNode.measure = (callback) => UIManager_default.measure(hostNode, callback);
      hostNode.measureLayout = (relativeToNode, success, failure) => UIManager_default.measureLayout(hostNode, relativeToNode, failure, success);
      hostNode.measureInWindow = (callback) => UIManager_default.measureInWindow(hostNode, callback);
    }
  });
  return ref;
}

// node_modules/react-native-web/dist/modules/useResponderEvents/index.js
import * as React6 from "react";

// node_modules/react-native-web/dist/modules/useResponderEvents/createResponderEvent.js
var emptyFunction = () => {
};
var emptyObject6 = {};
var emptyArray = [];
function normalizeIdentifier(identifier) {
  return identifier > 20 ? identifier % 20 : identifier;
}
function createResponderEvent(domEvent, responderTouchHistoryStore2) {
  var rect;
  var propagationWasStopped = false;
  var changedTouches;
  var touches;
  var domEventChangedTouches = domEvent.changedTouches;
  var domEventType = domEvent.type;
  var metaKey = domEvent.metaKey === true;
  var shiftKey = domEvent.shiftKey === true;
  var force = domEventChangedTouches && domEventChangedTouches[0].force || 0;
  var identifier = normalizeIdentifier(domEventChangedTouches && domEventChangedTouches[0].identifier || 0);
  var clientX = domEventChangedTouches && domEventChangedTouches[0].clientX || domEvent.clientX;
  var clientY = domEventChangedTouches && domEventChangedTouches[0].clientY || domEvent.clientY;
  var pageX = domEventChangedTouches && domEventChangedTouches[0].pageX || domEvent.pageX;
  var pageY = domEventChangedTouches && domEventChangedTouches[0].pageY || domEvent.pageY;
  var preventDefault = typeof domEvent.preventDefault === "function" ? domEvent.preventDefault.bind(domEvent) : emptyFunction;
  var timestamp = domEvent.timeStamp;
  function normalizeTouches(touches2) {
    return Array.prototype.slice.call(touches2).map((touch) => {
      return {
        force: touch.force,
        identifier: normalizeIdentifier(touch.identifier),
        get locationX() {
          return locationX(touch.clientX);
        },
        get locationY() {
          return locationY(touch.clientY);
        },
        pageX: touch.pageX,
        pageY: touch.pageY,
        target: touch.target,
        timestamp
      };
    });
  }
  if (domEventChangedTouches != null) {
    changedTouches = normalizeTouches(domEventChangedTouches);
    touches = normalizeTouches(domEvent.touches);
  } else {
    var emulatedTouches = [{
      force,
      identifier,
      get locationX() {
        return locationX(clientX);
      },
      get locationY() {
        return locationY(clientY);
      },
      pageX,
      pageY,
      target: domEvent.target,
      timestamp
    }];
    changedTouches = emulatedTouches;
    touches = domEventType === "mouseup" || domEventType === "dragstart" ? emptyArray : emulatedTouches;
  }
  var responderEvent = {
    bubbles: true,
    cancelable: true,
    // `currentTarget` is set before dispatch
    currentTarget: null,
    defaultPrevented: domEvent.defaultPrevented,
    dispatchConfig: emptyObject6,
    eventPhase: domEvent.eventPhase,
    isDefaultPrevented() {
      return domEvent.defaultPrevented;
    },
    isPropagationStopped() {
      return propagationWasStopped;
    },
    isTrusted: domEvent.isTrusted,
    nativeEvent: {
      altKey: false,
      ctrlKey: false,
      metaKey,
      shiftKey,
      changedTouches,
      force,
      identifier,
      get locationX() {
        return locationX(clientX);
      },
      get locationY() {
        return locationY(clientY);
      },
      pageX,
      pageY,
      target: domEvent.target,
      timestamp,
      touches,
      type: domEventType
    },
    persist: emptyFunction,
    preventDefault,
    stopPropagation() {
      propagationWasStopped = true;
    },
    target: domEvent.target,
    timeStamp: timestamp,
    touchHistory: responderTouchHistoryStore2.touchHistory
  };
  function locationX(x) {
    rect = rect || getBoundingClientRect_default(responderEvent.currentTarget);
    if (rect) {
      return x - rect.left;
    }
  }
  function locationY(y) {
    rect = rect || getBoundingClientRect_default(responderEvent.currentTarget);
    if (rect) {
      return y - rect.top;
    }
  }
  return responderEvent;
}

// node_modules/react-native-web/dist/modules/useResponderEvents/ResponderEventTypes.js
var MOUSE_DOWN = "mousedown";
var MOUSE_MOVE = "mousemove";
var MOUSE_UP = "mouseup";
var MOUSE_CANCEL = "dragstart";
var TOUCH_START = "touchstart";
var TOUCH_MOVE = "touchmove";
var TOUCH_END = "touchend";
var TOUCH_CANCEL = "touchcancel";
var SCROLL = "scroll";
var SELECT = "select";
var SELECTION_CHANGE = "selectionchange";
function isStartish(eventType) {
  return eventType === TOUCH_START || eventType === MOUSE_DOWN;
}
function isMoveish(eventType) {
  return eventType === TOUCH_MOVE || eventType === MOUSE_MOVE;
}
function isEndish(eventType) {
  return eventType === TOUCH_END || eventType === MOUSE_UP || isCancelish(eventType);
}
function isCancelish(eventType) {
  return eventType === TOUCH_CANCEL || eventType === MOUSE_CANCEL;
}
function isScroll(eventType) {
  return eventType === SCROLL;
}
function isSelectionChange(eventType) {
  return eventType === SELECT || eventType === SELECTION_CHANGE;
}

// node_modules/react-native-web/dist/modules/isSelectionValid/index.js
function isSelectionValid() {
  var selection = window.getSelection();
  var string = selection.toString();
  var anchorNode = selection.anchorNode;
  var focusNode = selection.focusNode;
  var isTextNode = anchorNode && anchorNode.nodeType === window.Node.TEXT_NODE || focusNode && focusNode.nodeType === window.Node.TEXT_NODE;
  return string.length >= 1 && string !== "\n" && isTextNode;
}

// node_modules/react-native-web/dist/modules/useResponderEvents/utils.js
var keyName = "__reactResponderId";
function getEventPath(domEvent) {
  if (domEvent.type === "selectionchange") {
    var target = window.getSelection().anchorNode;
    return composedPathFallback(target);
  } else {
    var path = domEvent.composedPath != null ? domEvent.composedPath() : composedPathFallback(domEvent.target);
    return path;
  }
}
function composedPathFallback(target) {
  var path = [];
  while (target != null && target !== document.body) {
    path.push(target);
    target = target.parentNode;
  }
  return path;
}
function getResponderId(node) {
  if (node != null) {
    return node[keyName];
  }
  return null;
}
function setResponderId(node, id) {
  if (node != null) {
    node[keyName] = id;
  }
}
function getResponderPaths(domEvent) {
  var idPath = [];
  var nodePath = [];
  var eventPath = getEventPath(domEvent);
  for (var i = 0; i < eventPath.length; i++) {
    var node = eventPath[i];
    var id = getResponderId(node);
    if (id != null) {
      idPath.push(id);
      nodePath.push(node);
    }
  }
  return {
    idPath,
    nodePath
  };
}
function getLowestCommonAncestor(pathA, pathB) {
  var pathALength = pathA.length;
  var pathBLength = pathB.length;
  if (
    // If either path is empty
    pathALength === 0 || pathBLength === 0 || // If the last elements aren't the same there can't be a common ancestor
    // that is connected to the responder system
    pathA[pathALength - 1] !== pathB[pathBLength - 1]
  ) {
    return null;
  }
  var itemA = pathA[0];
  var indexA = 0;
  var itemB = pathB[0];
  var indexB = 0;
  if (pathALength - pathBLength > 0) {
    indexA = pathALength - pathBLength;
    itemA = pathA[indexA];
    pathALength = pathBLength;
  }
  if (pathBLength - pathALength > 0) {
    indexB = pathBLength - pathALength;
    itemB = pathB[indexB];
    pathBLength = pathALength;
  }
  var depth = pathALength;
  while (depth--) {
    if (itemA === itemB) {
      return itemA;
    }
    itemA = pathA[indexA++];
    itemB = pathB[indexB++];
  }
  return null;
}
function hasTargetTouches(target, touches) {
  if (!touches || touches.length === 0) {
    return false;
  }
  for (var i = 0; i < touches.length; i++) {
    var node = touches[i].target;
    if (node != null) {
      if (target.contains(node)) {
        return true;
      }
    }
  }
  return false;
}
function hasValidSelection(domEvent) {
  if (domEvent.type === "selectionchange") {
    return isSelectionValid();
  }
  return domEvent.type === "select";
}
function isPrimaryPointerDown(domEvent) {
  var altKey = domEvent.altKey, button = domEvent.button, buttons = domEvent.buttons, ctrlKey = domEvent.ctrlKey, type2 = domEvent.type;
  var isTouch = type2 === "touchstart" || type2 === "touchmove";
  var isPrimaryMouseDown = type2 === "mousedown" && (button === 0 || buttons === 1);
  var isPrimaryMouseMove = type2 === "mousemove" && buttons === 1;
  var noModifiers = altKey === false && ctrlKey === false;
  if (isTouch || isPrimaryMouseDown && noModifiers || isPrimaryMouseMove && noModifiers) {
    return true;
  }
  return false;
}

// node_modules/react-native-web/dist/modules/useResponderEvents/ResponderTouchHistoryStore.js
var __DEV__ = process.env.NODE_ENV !== "production";
var MAX_TOUCH_BANK = 20;
function timestampForTouch(touch) {
  return touch.timeStamp || touch.timestamp;
}
function createTouchRecord(touch) {
  return {
    touchActive: true,
    startPageX: touch.pageX,
    startPageY: touch.pageY,
    startTimeStamp: timestampForTouch(touch),
    currentPageX: touch.pageX,
    currentPageY: touch.pageY,
    currentTimeStamp: timestampForTouch(touch),
    previousPageX: touch.pageX,
    previousPageY: touch.pageY,
    previousTimeStamp: timestampForTouch(touch)
  };
}
function resetTouchRecord(touchRecord, touch) {
  touchRecord.touchActive = true;
  touchRecord.startPageX = touch.pageX;
  touchRecord.startPageY = touch.pageY;
  touchRecord.startTimeStamp = timestampForTouch(touch);
  touchRecord.currentPageX = touch.pageX;
  touchRecord.currentPageY = touch.pageY;
  touchRecord.currentTimeStamp = timestampForTouch(touch);
  touchRecord.previousPageX = touch.pageX;
  touchRecord.previousPageY = touch.pageY;
  touchRecord.previousTimeStamp = timestampForTouch(touch);
}
function getTouchIdentifier(_ref) {
  var identifier = _ref.identifier;
  if (identifier == null) {
    console.error("Touch object is missing identifier.");
  }
  if (__DEV__) {
    if (identifier > MAX_TOUCH_BANK) {
      console.error("Touch identifier %s is greater than maximum supported %s which causes performance issues backfilling array locations for all of the indices.", identifier, MAX_TOUCH_BANK);
    }
  }
  return identifier;
}
function recordTouchStart(touch, touchHistory) {
  var identifier = getTouchIdentifier(touch);
  var touchRecord = touchHistory.touchBank[identifier];
  if (touchRecord) {
    resetTouchRecord(touchRecord, touch);
  } else {
    touchHistory.touchBank[identifier] = createTouchRecord(touch);
  }
  touchHistory.mostRecentTimeStamp = timestampForTouch(touch);
}
function recordTouchMove(touch, touchHistory) {
  var touchRecord = touchHistory.touchBank[getTouchIdentifier(touch)];
  if (touchRecord) {
    touchRecord.touchActive = true;
    touchRecord.previousPageX = touchRecord.currentPageX;
    touchRecord.previousPageY = touchRecord.currentPageY;
    touchRecord.previousTimeStamp = touchRecord.currentTimeStamp;
    touchRecord.currentPageX = touch.pageX;
    touchRecord.currentPageY = touch.pageY;
    touchRecord.currentTimeStamp = timestampForTouch(touch);
    touchHistory.mostRecentTimeStamp = timestampForTouch(touch);
  } else {
    console.warn("Cannot record touch move without a touch start.\n", "Touch Move: " + printTouch(touch) + "\n", "Touch Bank: " + printTouchBank(touchHistory));
  }
}
function recordTouchEnd(touch, touchHistory) {
  var touchRecord = touchHistory.touchBank[getTouchIdentifier(touch)];
  if (touchRecord) {
    touchRecord.touchActive = false;
    touchRecord.previousPageX = touchRecord.currentPageX;
    touchRecord.previousPageY = touchRecord.currentPageY;
    touchRecord.previousTimeStamp = touchRecord.currentTimeStamp;
    touchRecord.currentPageX = touch.pageX;
    touchRecord.currentPageY = touch.pageY;
    touchRecord.currentTimeStamp = timestampForTouch(touch);
    touchHistory.mostRecentTimeStamp = timestampForTouch(touch);
  } else {
    console.warn("Cannot record touch end without a touch start.\n", "Touch End: " + printTouch(touch) + "\n", "Touch Bank: " + printTouchBank(touchHistory));
  }
}
function printTouch(touch) {
  return JSON.stringify({
    identifier: touch.identifier,
    pageX: touch.pageX,
    pageY: touch.pageY,
    timestamp: timestampForTouch(touch)
  });
}
function printTouchBank(touchHistory) {
  var touchBank = touchHistory.touchBank;
  var printed = JSON.stringify(touchBank.slice(0, MAX_TOUCH_BANK));
  if (touchBank.length > MAX_TOUCH_BANK) {
    printed += " (original size: " + touchBank.length + ")";
  }
  return printed;
}
var ResponderTouchHistoryStore = class {
  constructor() {
    this._touchHistory = {
      touchBank: [],
      //Array<TouchRecord>
      numberActiveTouches: 0,
      // If there is only one active touch, we remember its location. This prevents
      // us having to loop through all of the touches all the time in the most
      // common case.
      indexOfSingleActiveTouch: -1,
      mostRecentTimeStamp: 0
    };
  }
  recordTouchTrack(topLevelType, nativeEvent) {
    var touchHistory = this._touchHistory;
    if (isMoveish(topLevelType)) {
      nativeEvent.changedTouches.forEach((touch) => recordTouchMove(touch, touchHistory));
    } else if (isStartish(topLevelType)) {
      nativeEvent.changedTouches.forEach((touch) => recordTouchStart(touch, touchHistory));
      touchHistory.numberActiveTouches = nativeEvent.touches.length;
      if (touchHistory.numberActiveTouches === 1) {
        touchHistory.indexOfSingleActiveTouch = nativeEvent.touches[0].identifier;
      }
    } else if (isEndish(topLevelType)) {
      nativeEvent.changedTouches.forEach((touch) => recordTouchEnd(touch, touchHistory));
      touchHistory.numberActiveTouches = nativeEvent.touches.length;
      if (touchHistory.numberActiveTouches === 1) {
        var touchBank = touchHistory.touchBank;
        for (var i = 0; i < touchBank.length; i++) {
          var touchTrackToCheck = touchBank[i];
          if (touchTrackToCheck != null && touchTrackToCheck.touchActive) {
            touchHistory.indexOfSingleActiveTouch = i;
            break;
          }
        }
        if (__DEV__) {
          var activeRecord = touchBank[touchHistory.indexOfSingleActiveTouch];
          if (!(activeRecord != null && activeRecord.touchActive)) {
            console.error("Cannot find single active touch.");
          }
        }
      }
    }
  }
  get touchHistory() {
    return this._touchHistory;
  }
};

// node_modules/react-native-web/dist/modules/useResponderEvents/ResponderSystem.js
var emptyObject7 = {};
var startRegistration = ["onStartShouldSetResponderCapture", "onStartShouldSetResponder", {
  bubbles: true
}];
var moveRegistration = ["onMoveShouldSetResponderCapture", "onMoveShouldSetResponder", {
  bubbles: true
}];
var scrollRegistration = ["onScrollShouldSetResponderCapture", "onScrollShouldSetResponder", {
  bubbles: false
}];
var shouldSetResponderEvents = {
  touchstart: startRegistration,
  mousedown: startRegistration,
  touchmove: moveRegistration,
  mousemove: moveRegistration,
  scroll: scrollRegistration
};
var emptyResponder = {
  id: null,
  idPath: null,
  node: null
};
var responderListenersMap = /* @__PURE__ */ new Map();
var isEmulatingMouseEvents = false;
var trackedTouchCount = 0;
var currentResponder = {
  id: null,
  node: null,
  idPath: null
};
var responderTouchHistoryStore = new ResponderTouchHistoryStore();
function changeCurrentResponder(responder) {
  currentResponder = responder;
}
function getResponderConfig(id) {
  var config = responderListenersMap.get(id);
  return config != null ? config : emptyObject7;
}
function eventListener(domEvent) {
  var eventType = domEvent.type;
  var eventTarget = domEvent.target;
  if (eventType === "touchstart") {
    isEmulatingMouseEvents = true;
  }
  if (eventType === "touchmove" || trackedTouchCount > 1) {
    isEmulatingMouseEvents = false;
  }
  if (
    // Ignore browser emulated mouse events
    eventType === "mousedown" && isEmulatingMouseEvents || eventType === "mousemove" && isEmulatingMouseEvents || // Ignore mousemove if a mousedown didn't occur first
    eventType === "mousemove" && trackedTouchCount < 1
  ) {
    return;
  }
  if (isEmulatingMouseEvents && eventType === "mouseup") {
    if (trackedTouchCount === 0) {
      isEmulatingMouseEvents = false;
    }
    return;
  }
  var isStartEvent = isStartish(eventType) && isPrimaryPointerDown(domEvent);
  var isMoveEvent = isMoveish(eventType);
  var isEndEvent = isEndish(eventType);
  var isScrollEvent = isScroll(eventType);
  var isSelectionChangeEvent = isSelectionChange(eventType);
  var responderEvent = createResponderEvent(domEvent, responderTouchHistoryStore);
  if (isStartEvent || isMoveEvent || isEndEvent) {
    if (domEvent.touches) {
      trackedTouchCount = domEvent.touches.length;
    } else {
      if (isStartEvent) {
        trackedTouchCount = 1;
      } else if (isEndEvent) {
        trackedTouchCount = 0;
      }
    }
    responderTouchHistoryStore.recordTouchTrack(eventType, responderEvent.nativeEvent);
  }
  var eventPaths = getResponderPaths(domEvent);
  var wasNegotiated = false;
  var wantsResponder;
  if (isStartEvent || isMoveEvent || isScrollEvent && trackedTouchCount > 0) {
    var currentResponderIdPath = currentResponder.idPath;
    var eventIdPath = eventPaths.idPath;
    if (currentResponderIdPath != null && eventIdPath != null) {
      var lowestCommonAncestor = getLowestCommonAncestor(currentResponderIdPath, eventIdPath);
      if (lowestCommonAncestor != null) {
        var indexOfLowestCommonAncestor = eventIdPath.indexOf(lowestCommonAncestor);
        var index = indexOfLowestCommonAncestor + (lowestCommonAncestor === currentResponder.id ? 1 : 0);
        eventPaths = {
          idPath: eventIdPath.slice(index),
          nodePath: eventPaths.nodePath.slice(index)
        };
      } else {
        eventPaths = null;
      }
    }
    if (eventPaths != null) {
      wantsResponder = findWantsResponder(eventPaths, domEvent, responderEvent);
      if (wantsResponder != null) {
        attemptTransfer(responderEvent, wantsResponder);
        wasNegotiated = true;
      }
    }
  }
  if (currentResponder.id != null && currentResponder.node != null) {
    var _currentResponder = currentResponder, id = _currentResponder.id, node = _currentResponder.node;
    var _getResponderConfig = getResponderConfig(id), onResponderStart = _getResponderConfig.onResponderStart, onResponderMove = _getResponderConfig.onResponderMove, onResponderEnd = _getResponderConfig.onResponderEnd, onResponderRelease = _getResponderConfig.onResponderRelease, onResponderTerminate = _getResponderConfig.onResponderTerminate, onResponderTerminationRequest = _getResponderConfig.onResponderTerminationRequest;
    responderEvent.bubbles = false;
    responderEvent.cancelable = false;
    responderEvent.currentTarget = node;
    if (isStartEvent) {
      if (onResponderStart != null) {
        responderEvent.dispatchConfig.registrationName = "onResponderStart";
        onResponderStart(responderEvent);
      }
    } else if (isMoveEvent) {
      if (onResponderMove != null) {
        responderEvent.dispatchConfig.registrationName = "onResponderMove";
        onResponderMove(responderEvent);
      }
    } else {
      var isTerminateEvent = isCancelish(eventType) || // native context menu
      eventType === "contextmenu" || // window blur
      eventType === "blur" && eventTarget === window || // responder (or ancestors) blur
      eventType === "blur" && eventTarget.contains(node) && domEvent.relatedTarget !== node || // native scroll without using a pointer
      isScrollEvent && trackedTouchCount === 0 || // native scroll on node that is parent of the responder (allow siblings to scroll)
      isScrollEvent && eventTarget.contains(node) && eventTarget !== node || // native select/selectionchange on node
      isSelectionChangeEvent && hasValidSelection(domEvent);
      var isReleaseEvent = isEndEvent && !isTerminateEvent && !hasTargetTouches(node, domEvent.touches);
      if (isEndEvent) {
        if (onResponderEnd != null) {
          responderEvent.dispatchConfig.registrationName = "onResponderEnd";
          onResponderEnd(responderEvent);
        }
      }
      if (isReleaseEvent) {
        if (onResponderRelease != null) {
          responderEvent.dispatchConfig.registrationName = "onResponderRelease";
          onResponderRelease(responderEvent);
        }
        changeCurrentResponder(emptyResponder);
      }
      if (isTerminateEvent) {
        var shouldTerminate = true;
        if (eventType === "contextmenu" || eventType === "scroll" || eventType === "selectionchange") {
          if (wasNegotiated) {
            shouldTerminate = false;
          } else if (onResponderTerminationRequest != null) {
            responderEvent.dispatchConfig.registrationName = "onResponderTerminationRequest";
            if (onResponderTerminationRequest(responderEvent) === false) {
              shouldTerminate = false;
            }
          }
        }
        if (shouldTerminate) {
          if (onResponderTerminate != null) {
            responderEvent.dispatchConfig.registrationName = "onResponderTerminate";
            onResponderTerminate(responderEvent);
          }
          changeCurrentResponder(emptyResponder);
          isEmulatingMouseEvents = false;
          trackedTouchCount = 0;
        }
      }
    }
  }
}
function findWantsResponder(eventPaths, domEvent, responderEvent) {
  var shouldSetCallbacks = shouldSetResponderEvents[domEvent.type];
  if (shouldSetCallbacks != null) {
    var idPath = eventPaths.idPath, nodePath = eventPaths.nodePath;
    var shouldSetCallbackCaptureName = shouldSetCallbacks[0];
    var shouldSetCallbackBubbleName = shouldSetCallbacks[1];
    var bubbles = shouldSetCallbacks[2].bubbles;
    var check = function check2(id2, node2, callbackName) {
      var config = getResponderConfig(id2);
      var shouldSetCallback = config[callbackName];
      if (shouldSetCallback != null) {
        responderEvent.currentTarget = node2;
        if (shouldSetCallback(responderEvent) === true) {
          var prunedIdPath = idPath.slice(idPath.indexOf(id2));
          return {
            id: id2,
            node: node2,
            idPath: prunedIdPath
          };
        }
      }
    };
    for (var i = idPath.length - 1; i >= 0; i--) {
      var id = idPath[i];
      var node = nodePath[i];
      var result = check(id, node, shouldSetCallbackCaptureName);
      if (result != null) {
        return result;
      }
      if (responderEvent.isPropagationStopped() === true) {
        return;
      }
    }
    if (bubbles) {
      for (var _i = 0; _i < idPath.length; _i++) {
        var _id = idPath[_i];
        var _node = nodePath[_i];
        var _result = check(_id, _node, shouldSetCallbackBubbleName);
        if (_result != null) {
          return _result;
        }
        if (responderEvent.isPropagationStopped() === true) {
          return;
        }
      }
    } else {
      var _id2 = idPath[0];
      var _node2 = nodePath[0];
      var target = domEvent.target;
      if (target === _node2) {
        return check(_id2, _node2, shouldSetCallbackBubbleName);
      }
    }
  }
}
function attemptTransfer(responderEvent, wantsResponder) {
  var _currentResponder2 = currentResponder, currentId = _currentResponder2.id, currentNode = _currentResponder2.node;
  var id = wantsResponder.id, node = wantsResponder.node;
  var _getResponderConfig2 = getResponderConfig(id), onResponderGrant = _getResponderConfig2.onResponderGrant, onResponderReject = _getResponderConfig2.onResponderReject;
  responderEvent.bubbles = false;
  responderEvent.cancelable = false;
  responderEvent.currentTarget = node;
  if (currentId == null) {
    if (onResponderGrant != null) {
      responderEvent.currentTarget = node;
      responderEvent.dispatchConfig.registrationName = "onResponderGrant";
      onResponderGrant(responderEvent);
    }
    changeCurrentResponder(wantsResponder);
  } else {
    var _getResponderConfig3 = getResponderConfig(currentId), onResponderTerminate = _getResponderConfig3.onResponderTerminate, onResponderTerminationRequest = _getResponderConfig3.onResponderTerminationRequest;
    var allowTransfer = true;
    if (onResponderTerminationRequest != null) {
      responderEvent.currentTarget = currentNode;
      responderEvent.dispatchConfig.registrationName = "onResponderTerminationRequest";
      if (onResponderTerminationRequest(responderEvent) === false) {
        allowTransfer = false;
      }
    }
    if (allowTransfer) {
      if (onResponderTerminate != null) {
        responderEvent.currentTarget = currentNode;
        responderEvent.dispatchConfig.registrationName = "onResponderTerminate";
        onResponderTerminate(responderEvent);
      }
      if (onResponderGrant != null) {
        responderEvent.currentTarget = node;
        responderEvent.dispatchConfig.registrationName = "onResponderGrant";
        onResponderGrant(responderEvent);
      }
      changeCurrentResponder(wantsResponder);
    } else {
      if (onResponderReject != null) {
        responderEvent.currentTarget = node;
        responderEvent.dispatchConfig.registrationName = "onResponderReject";
        onResponderReject(responderEvent);
      }
    }
  }
}
var documentEventsCapturePhase = ["blur", "scroll"];
var documentEventsBubblePhase = [
  // mouse
  "mousedown",
  "mousemove",
  "mouseup",
  "dragstart",
  // touch
  "touchstart",
  "touchmove",
  "touchend",
  "touchcancel",
  // other
  "contextmenu",
  "select",
  "selectionchange"
];
function attachListeners() {
  if (canUseDom_default && window.__reactResponderSystemActive == null) {
    window.addEventListener("blur", eventListener);
    documentEventsBubblePhase.forEach((eventType) => {
      document.addEventListener(eventType, eventListener);
    });
    documentEventsCapturePhase.forEach((eventType) => {
      document.addEventListener(eventType, eventListener, true);
    });
    window.__reactResponderSystemActive = true;
  }
}
function addNode(id, node, config) {
  setResponderId(node, id);
  responderListenersMap.set(id, config);
}
function removeNode(id) {
  if (currentResponder.id === id) {
    terminateResponder();
  }
  if (responderListenersMap.has(id)) {
    responderListenersMap.delete(id);
  }
}
function terminateResponder() {
  var _currentResponder3 = currentResponder, id = _currentResponder3.id, node = _currentResponder3.node;
  if (id != null && node != null) {
    var _getResponderConfig4 = getResponderConfig(id), onResponderTerminate = _getResponderConfig4.onResponderTerminate;
    if (onResponderTerminate != null) {
      var event = createResponderEvent({}, responderTouchHistoryStore);
      event.currentTarget = node;
      onResponderTerminate(event);
    }
    changeCurrentResponder(emptyResponder);
  }
  isEmulatingMouseEvents = false;
  trackedTouchCount = 0;
}
function getResponderNode() {
  return currentResponder.node;
}

// node_modules/react-native-web/dist/modules/useResponderEvents/index.js
var emptyObject8 = {};
var idCounter = 0;
function useStable2(getInitialValue) {
  var ref = React6.useRef(null);
  if (ref.current == null) {
    ref.current = getInitialValue();
  }
  return ref.current;
}
function useResponderEvents(hostRef, config) {
  if (config === void 0) {
    config = emptyObject8;
  }
  var id = useStable2(() => idCounter++);
  var isAttachedRef = React6.useRef(false);
  React6.useEffect(() => {
    attachListeners();
    return () => {
      removeNode(id);
    };
  }, [id]);
  React6.useEffect(() => {
    var _config = config, onMoveShouldSetResponder = _config.onMoveShouldSetResponder, onMoveShouldSetResponderCapture = _config.onMoveShouldSetResponderCapture, onScrollShouldSetResponder = _config.onScrollShouldSetResponder, onScrollShouldSetResponderCapture = _config.onScrollShouldSetResponderCapture, onSelectionChangeShouldSetResponder = _config.onSelectionChangeShouldSetResponder, onSelectionChangeShouldSetResponderCapture = _config.onSelectionChangeShouldSetResponderCapture, onStartShouldSetResponder = _config.onStartShouldSetResponder, onStartShouldSetResponderCapture = _config.onStartShouldSetResponderCapture;
    var requiresResponderSystem = onMoveShouldSetResponder != null || onMoveShouldSetResponderCapture != null || onScrollShouldSetResponder != null || onScrollShouldSetResponderCapture != null || onSelectionChangeShouldSetResponder != null || onSelectionChangeShouldSetResponderCapture != null || onStartShouldSetResponder != null || onStartShouldSetResponderCapture != null;
    var node = hostRef.current;
    if (requiresResponderSystem) {
      addNode(id, node, config);
      isAttachedRef.current = true;
    } else if (isAttachedRef.current) {
      removeNode(id);
      isAttachedRef.current = false;
    }
  }, [config, hostRef, id]);
  React6.useDebugValue({
    isResponder: hostRef.current === getResponderNode()
  });
  React6.useDebugValue(config);
}

// node_modules/react-native-web/dist/exports/Text/TextAncestorContext.js
import { createContext as createContext2 } from "react";
var TextAncestorContext = /* @__PURE__ */ createContext2(false);
var TextAncestorContext_default = TextAncestorContext;

// node_modules/react-native-web/dist/exports/View/index.js
var _excluded4 = ["hrefAttrs", "onLayout", "onMoveShouldSetResponder", "onMoveShouldSetResponderCapture", "onResponderEnd", "onResponderGrant", "onResponderMove", "onResponderReject", "onResponderRelease", "onResponderStart", "onResponderTerminate", "onResponderTerminationRequest", "onScrollShouldSetResponder", "onScrollShouldSetResponderCapture", "onSelectionChangeShouldSetResponder", "onSelectionChangeShouldSetResponderCapture", "onStartShouldSetResponder", "onStartShouldSetResponderCapture"];
var forwardPropsList = Object.assign({}, defaultProps, accessibilityProps, clickProps, focusProps, keyboardProps, mouseProps, touchProps, styleProps, {
  href: true,
  lang: true,
  onScroll: true,
  onWheel: true,
  pointerEvents: true
});
var pickProps = (props) => pick(props, forwardPropsList);
var View = /* @__PURE__ */ React7.forwardRef((props, forwardedRef) => {
  var hrefAttrs = props.hrefAttrs, onLayout = props.onLayout, onMoveShouldSetResponder = props.onMoveShouldSetResponder, onMoveShouldSetResponderCapture = props.onMoveShouldSetResponderCapture, onResponderEnd = props.onResponderEnd, onResponderGrant = props.onResponderGrant, onResponderMove = props.onResponderMove, onResponderReject = props.onResponderReject, onResponderRelease = props.onResponderRelease, onResponderStart = props.onResponderStart, onResponderTerminate = props.onResponderTerminate, onResponderTerminationRequest = props.onResponderTerminationRequest, onScrollShouldSetResponder = props.onScrollShouldSetResponder, onScrollShouldSetResponderCapture = props.onScrollShouldSetResponderCapture, onSelectionChangeShouldSetResponder = props.onSelectionChangeShouldSetResponder, onSelectionChangeShouldSetResponderCapture = props.onSelectionChangeShouldSetResponderCapture, onStartShouldSetResponder = props.onStartShouldSetResponder, onStartShouldSetResponderCapture = props.onStartShouldSetResponderCapture, rest = (0, import_objectWithoutPropertiesLoose4.default)(props, _excluded4);
  if (process.env.NODE_ENV !== "production") {
    React7.Children.toArray(props.children).forEach((item) => {
      if (typeof item === "string") {
        console.error("Unexpected text node: " + item + ". A text node cannot be a child of a <View>.");
      }
    });
  }
  var hasTextAncestor = React7.useContext(TextAncestorContext_default);
  var hostRef = React7.useRef(null);
  var _useLocaleContext = useLocaleContext(), contextDirection = _useLocaleContext.direction;
  useElementLayout(hostRef, onLayout);
  useResponderEvents(hostRef, {
    onMoveShouldSetResponder,
    onMoveShouldSetResponderCapture,
    onResponderEnd,
    onResponderGrant,
    onResponderMove,
    onResponderReject,
    onResponderRelease,
    onResponderStart,
    onResponderTerminate,
    onResponderTerminationRequest,
    onScrollShouldSetResponder,
    onScrollShouldSetResponderCapture,
    onSelectionChangeShouldSetResponder,
    onSelectionChangeShouldSetResponderCapture,
    onStartShouldSetResponder,
    onStartShouldSetResponderCapture
  });
  var component = "div";
  var langDirection = props.lang != null ? getLocaleDirection(props.lang) : null;
  var componentDirection = props.dir || langDirection;
  var writingDirection = componentDirection || contextDirection;
  var supportedProps = pickProps(rest);
  supportedProps.dir = componentDirection;
  supportedProps.style = [styles.view$raw, hasTextAncestor && styles.inline, props.style];
  if (props.href != null) {
    component = "a";
    if (hrefAttrs != null) {
      var download = hrefAttrs.download, rel = hrefAttrs.rel, target = hrefAttrs.target;
      if (download != null) {
        supportedProps.download = download;
      }
      if (rel != null) {
        supportedProps.rel = rel;
      }
      if (typeof target === "string") {
        supportedProps.target = target.charAt(0) !== "_" ? "_" + target : target;
      }
    }
  }
  var platformMethodsRef = usePlatformMethods(supportedProps);
  var setRef = useMergeRefs(hostRef, platformMethodsRef, forwardedRef);
  supportedProps.ref = setRef;
  return createElement_default(component, supportedProps, {
    writingDirection
  });
});
View.displayName = "View";
var styles = StyleSheet_default.create({
  view$raw: {
    alignContent: "flex-start",
    alignItems: "stretch",
    backgroundColor: "transparent",
    border: "0 solid black",
    boxSizing: "border-box",
    display: "flex",
    flexBasis: "auto",
    flexDirection: "column",
    flexShrink: 0,
    listStyle: "none",
    margin: 0,
    minHeight: 0,
    minWidth: 0,
    padding: 0,
    position: "relative",
    textDecoration: "none",
    zIndex: 0
  },
  inline: {
    display: "inline-flex"
  }
});
var View_default = View;

// node_modules/react-native-web/dist/exports/ScrollView/index.js
var import_objectSpread24 = __toESM(require_objectSpread2());
var import_extends2 = __toESM(require_extends());
var import_objectWithoutPropertiesLoose6 = __toESM(require_objectWithoutPropertiesLoose());

// node_modules/react-native-web/dist/exports/Dimensions/index.js
var import_invariant = __toESM(require_invariant());
var dimensions = {
  window: {
    fontScale: 1,
    height: 0,
    scale: 1,
    width: 0
  },
  screen: {
    fontScale: 1,
    height: 0,
    scale: 1,
    width: 0
  }
};
var listeners = {};
var shouldInit = canUseDom_default;
function update() {
  if (!canUseDom_default) {
    return;
  }
  var win = window;
  var height;
  var width;
  if (win.visualViewport) {
    var visualViewport = win.visualViewport;
    height = Math.round(visualViewport.height * visualViewport.scale);
    width = Math.round(visualViewport.width * visualViewport.scale);
  } else {
    var docEl = win.document.documentElement;
    height = docEl.clientHeight;
    width = docEl.clientWidth;
  }
  dimensions.window = {
    fontScale: 1,
    height,
    scale: win.devicePixelRatio || 1,
    width
  };
  dimensions.screen = {
    fontScale: 1,
    height: win.screen.height,
    scale: win.devicePixelRatio || 1,
    width: win.screen.width
  };
}
function handleResize() {
  update();
  if (Array.isArray(listeners["change"])) {
    listeners["change"].forEach((handler) => handler(dimensions));
  }
}
var Dimensions = class {
  static get(dimension) {
    if (shouldInit) {
      shouldInit = false;
      update();
    }
    (0, import_invariant.default)(dimensions[dimension], "No dimension set for key " + dimension);
    return dimensions[dimension];
  }
  static set(initialDimensions) {
    if (initialDimensions) {
      if (canUseDom_default) {
        (0, import_invariant.default)(false, "Dimensions cannot be set in the browser");
      } else {
        if (initialDimensions.screen != null) {
          dimensions.screen = initialDimensions.screen;
        }
        if (initialDimensions.window != null) {
          dimensions.window = initialDimensions.window;
        }
      }
    }
  }
  static addEventListener(type2, handler) {
    listeners[type2] = listeners[type2] || [];
    listeners[type2].push(handler);
    return {
      remove: () => {
        this.removeEventListener(type2, handler);
      }
    };
  }
  static removeEventListener(type2, handler) {
    if (Array.isArray(listeners[type2])) {
      listeners[type2] = listeners[type2].filter((_handler) => _handler !== handler);
    }
  }
};
if (canUseDom_default) {
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", handleResize, false);
  } else {
    window.addEventListener("resize", handleResize, false);
  }
}

// node_modules/react-native-web/dist/modules/TextInputState/index.js
var TextInputState = {
  /**
   * Internal state
   */
  _currentlyFocusedNode: null,
  /**
   * Returns the ID of the currently focused text field, if one exists
   * If no text field is focused it returns null
   */
  currentlyFocusedField() {
    if (document.activeElement !== this._currentlyFocusedNode) {
      this._currentlyFocusedNode = null;
    }
    return this._currentlyFocusedNode;
  },
  /**
   * @param {Object} TextInputID id of the text field to focus
   * Focuses the specified text field
   * noop if the text field was already focused
   */
  focusTextInput(textFieldNode) {
    if (textFieldNode !== null) {
      this._currentlyFocusedNode = textFieldNode;
      if (document.activeElement !== textFieldNode) {
        UIManager_default.focus(textFieldNode);
      }
    }
  },
  /**
   * @param {Object} textFieldNode id of the text field to focus
   * Unfocuses the specified text field
   * noop if it wasn't focused
   */
  blurTextInput(textFieldNode) {
    if (textFieldNode !== null) {
      this._currentlyFocusedNode = null;
      if (document.activeElement === textFieldNode) {
        UIManager_default.blur(textFieldNode);
      }
    }
  }
};
var TextInputState_default = TextInputState;

// node_modules/react-native-web/dist/modules/dismissKeyboard/index.js
var dismissKeyboard = () => {
  TextInputState_default.blurTextInput(TextInputState_default.currentlyFocusedField());
};
var dismissKeyboard_default = dismissKeyboard;

// node_modules/react-native-web/dist/exports/ScrollView/index.js
var import_invariant2 = __toESM(require_invariant());

// node_modules/react-native-web/dist/exports/ScrollView/ScrollViewBase.js
var import_extends = __toESM(require_extends());
var import_objectWithoutPropertiesLoose5 = __toESM(require_objectWithoutPropertiesLoose());
import * as React8 from "react";
var _excluded5 = ["onScroll", "onTouchMove", "onWheel", "scrollEnabled", "scrollEventThrottle", "showsHorizontalScrollIndicator", "showsVerticalScrollIndicator", "style"];
function normalizeScrollEvent(e3) {
  return {
    nativeEvent: {
      contentOffset: {
        get x() {
          return e3.target.scrollLeft;
        },
        get y() {
          return e3.target.scrollTop;
        }
      },
      contentSize: {
        get height() {
          return e3.target.scrollHeight;
        },
        get width() {
          return e3.target.scrollWidth;
        }
      },
      layoutMeasurement: {
        get height() {
          return e3.target.offsetHeight;
        },
        get width() {
          return e3.target.offsetWidth;
        }
      }
    },
    timeStamp: Date.now()
  };
}
function shouldEmitScrollEvent(lastTick, eventThrottle) {
  var timeSinceLastTick = Date.now() - lastTick;
  return eventThrottle > 0 && timeSinceLastTick >= eventThrottle;
}
var ScrollViewBase = /* @__PURE__ */ React8.forwardRef((props, forwardedRef) => {
  var onScroll = props.onScroll, onTouchMove = props.onTouchMove, onWheel = props.onWheel, _props$scrollEnabled = props.scrollEnabled, scrollEnabled = _props$scrollEnabled === void 0 ? true : _props$scrollEnabled, _props$scrollEventThr = props.scrollEventThrottle, scrollEventThrottle = _props$scrollEventThr === void 0 ? 0 : _props$scrollEventThr, showsHorizontalScrollIndicator = props.showsHorizontalScrollIndicator, showsVerticalScrollIndicator = props.showsVerticalScrollIndicator, style = props.style, rest = (0, import_objectWithoutPropertiesLoose5.default)(props, _excluded5);
  var scrollState = React8.useRef({
    isScrolling: false,
    scrollLastTick: 0
  });
  var scrollTimeout = React8.useRef(null);
  var scrollRef = React8.useRef(null);
  function createPreventableScrollHandler(handler) {
    return (e3) => {
      if (scrollEnabled) {
        if (handler) {
          handler(e3);
        }
      }
    };
  }
  function handleScroll(e3) {
    e3.stopPropagation();
    if (e3.target === scrollRef.current) {
      e3.persist();
      if (scrollTimeout.current != null) {
        clearTimeout(scrollTimeout.current);
      }
      scrollTimeout.current = setTimeout(() => {
        handleScrollEnd(e3);
      }, 100);
      if (scrollState.current.isScrolling) {
        if (shouldEmitScrollEvent(scrollState.current.scrollLastTick, scrollEventThrottle)) {
          handleScrollTick(e3);
        }
      } else {
        handleScrollStart(e3);
      }
    }
  }
  function handleScrollStart(e3) {
    scrollState.current.isScrolling = true;
    handleScrollTick(e3);
  }
  function handleScrollTick(e3) {
    scrollState.current.scrollLastTick = Date.now();
    if (onScroll) {
      onScroll(normalizeScrollEvent(e3));
    }
  }
  function handleScrollEnd(e3) {
    scrollState.current.isScrolling = false;
    if (onScroll) {
      onScroll(normalizeScrollEvent(e3));
    }
  }
  var hideScrollbar = showsHorizontalScrollIndicator === false || showsVerticalScrollIndicator === false;
  return /* @__PURE__ */ React8.createElement(View_default, (0, import_extends.default)({}, rest, {
    onScroll: handleScroll,
    onTouchMove: createPreventableScrollHandler(onTouchMove),
    onWheel: createPreventableScrollHandler(onWheel),
    ref: useMergeRefs(scrollRef, forwardedRef),
    style: [style, !scrollEnabled && styles2.scrollDisabled, hideScrollbar && styles2.hideScrollbar]
  }));
});
var styles2 = StyleSheet_default.create({
  scrollDisabled: {
    overflowX: "hidden",
    overflowY: "hidden",
    touchAction: "none"
  },
  hideScrollbar: {
    scrollbarWidth: "none"
  }
});
var ScrollViewBase_default = ScrollViewBase;

// node_modules/react-native-web/dist/exports/ScrollView/index.js
var import_warning = __toESM(require_warning());
import React9 from "react";
var _excluded6 = ["contentContainerStyle", "horizontal", "onContentSizeChange", "refreshControl", "stickyHeaderIndices", "pagingEnabled", "forwardedRef", "keyboardDismissMode", "onScroll", "centerContent"];
var emptyObject9 = {};
var IS_ANIMATING_TOUCH_START_THRESHOLD_MS = 16;
var ScrollView = class extends React9.Component {
  constructor() {
    super(...arguments);
    this._scrollNodeRef = null;
    this._innerViewRef = null;
    this.isTouching = false;
    this.lastMomentumScrollBeginTime = 0;
    this.lastMomentumScrollEndTime = 0;
    this.observedScrollSinceBecomingResponder = false;
    this.becameResponderWhileAnimating = false;
    this.scrollResponderHandleScrollShouldSetResponder = () => {
      return this.isTouching;
    };
    this.scrollResponderHandleStartShouldSetResponderCapture = (e3) => {
      return this.scrollResponderIsAnimating();
    };
    this.scrollResponderHandleTerminationRequest = () => {
      return !this.observedScrollSinceBecomingResponder;
    };
    this.scrollResponderHandleTouchEnd = (e3) => {
      var nativeEvent = e3.nativeEvent;
      this.isTouching = nativeEvent.touches.length !== 0;
      this.props.onTouchEnd && this.props.onTouchEnd(e3);
    };
    this.scrollResponderHandleResponderRelease = (e3) => {
      this.props.onResponderRelease && this.props.onResponderRelease(e3);
      var currentlyFocusedTextInput = TextInputState_default.currentlyFocusedField();
      if (!this.props.keyboardShouldPersistTaps && currentlyFocusedTextInput != null && e3.target !== currentlyFocusedTextInput && !this.observedScrollSinceBecomingResponder && !this.becameResponderWhileAnimating) {
        this.props.onScrollResponderKeyboardDismissed && this.props.onScrollResponderKeyboardDismissed(e3);
        TextInputState_default.blurTextInput(currentlyFocusedTextInput);
      }
    };
    this.scrollResponderHandleScroll = (e3) => {
      this.observedScrollSinceBecomingResponder = true;
      this.props.onScroll && this.props.onScroll(e3);
    };
    this.scrollResponderHandleResponderGrant = (e3) => {
      this.observedScrollSinceBecomingResponder = false;
      this.props.onResponderGrant && this.props.onResponderGrant(e3);
      this.becameResponderWhileAnimating = this.scrollResponderIsAnimating();
    };
    this.scrollResponderHandleScrollBeginDrag = (e3) => {
      this.props.onScrollBeginDrag && this.props.onScrollBeginDrag(e3);
    };
    this.scrollResponderHandleScrollEndDrag = (e3) => {
      this.props.onScrollEndDrag && this.props.onScrollEndDrag(e3);
    };
    this.scrollResponderHandleMomentumScrollBegin = (e3) => {
      this.lastMomentumScrollBeginTime = Date.now();
      this.props.onMomentumScrollBegin && this.props.onMomentumScrollBegin(e3);
    };
    this.scrollResponderHandleMomentumScrollEnd = (e3) => {
      this.lastMomentumScrollEndTime = Date.now();
      this.props.onMomentumScrollEnd && this.props.onMomentumScrollEnd(e3);
    };
    this.scrollResponderHandleTouchStart = (e3) => {
      this.isTouching = true;
      this.props.onTouchStart && this.props.onTouchStart(e3);
    };
    this.scrollResponderHandleTouchMove = (e3) => {
      this.props.onTouchMove && this.props.onTouchMove(e3);
    };
    this.scrollResponderIsAnimating = () => {
      var now = Date.now();
      var timeSinceLastMomentumScrollEnd = now - this.lastMomentumScrollEndTime;
      var isAnimating = timeSinceLastMomentumScrollEnd < IS_ANIMATING_TOUCH_START_THRESHOLD_MS || this.lastMomentumScrollEndTime < this.lastMomentumScrollBeginTime;
      return isAnimating;
    };
    this.scrollResponderScrollTo = (x, y, animated) => {
      if (typeof x === "number") {
        console.warn("`scrollResponderScrollTo(x, y, animated)` is deprecated. Use `scrollResponderScrollTo({x: 5, y: 5, animated: true})` instead.");
      } else {
        var _ref = x || emptyObject9;
        x = _ref.x;
        y = _ref.y;
        animated = _ref.animated;
      }
      var node = this.getScrollableNode();
      var left2 = x || 0;
      var top = y || 0;
      if (node != null) {
        if (typeof node.scroll === "function") {
          node.scroll({
            top,
            left: left2,
            behavior: !animated ? "auto" : "smooth"
          });
        } else {
          node.scrollLeft = left2;
          node.scrollTop = top;
        }
      }
    };
    this.scrollResponderZoomTo = (rect, animated) => {
      if (Platform_default.OS !== "ios") {
        (0, import_invariant2.default)("zoomToRect is not implemented");
      }
    };
    this.scrollResponderScrollNativeHandleToKeyboard = (nodeHandle, additionalOffset, preventNegativeScrollOffset) => {
      this.additionalScrollOffset = additionalOffset || 0;
      this.preventNegativeScrollOffset = !!preventNegativeScrollOffset;
      UIManager_default.measureLayout(nodeHandle, this.getInnerViewNode(), this.scrollResponderTextInputFocusError, this.scrollResponderInputMeasureAndScrollToKeyboard);
    };
    this.scrollResponderInputMeasureAndScrollToKeyboard = (left2, top, width, height) => {
      var keyboardScreenY = Dimensions.get("window").height;
      if (this.keyboardWillOpenTo) {
        keyboardScreenY = this.keyboardWillOpenTo.endCoordinates.screenY;
      }
      var scrollOffsetY = top - keyboardScreenY + height + this.additionalScrollOffset;
      if (this.preventNegativeScrollOffset) {
        scrollOffsetY = Math.max(0, scrollOffsetY);
      }
      this.scrollResponderScrollTo({
        x: 0,
        y: scrollOffsetY,
        animated: true
      });
      this.additionalOffset = 0;
      this.preventNegativeScrollOffset = false;
    };
    this.scrollResponderKeyboardWillShow = (e3) => {
      this.keyboardWillOpenTo = e3;
      this.props.onKeyboardWillShow && this.props.onKeyboardWillShow(e3);
    };
    this.scrollResponderKeyboardWillHide = (e3) => {
      this.keyboardWillOpenTo = null;
      this.props.onKeyboardWillHide && this.props.onKeyboardWillHide(e3);
    };
    this.scrollResponderKeyboardDidShow = (e3) => {
      if (e3) {
        this.keyboardWillOpenTo = e3;
      }
      this.props.onKeyboardDidShow && this.props.onKeyboardDidShow(e3);
    };
    this.scrollResponderKeyboardDidHide = (e3) => {
      this.keyboardWillOpenTo = null;
      this.props.onKeyboardDidHide && this.props.onKeyboardDidHide(e3);
    };
    this.flashScrollIndicators = () => {
      this.scrollResponderFlashScrollIndicators();
    };
    this.getScrollResponder = () => {
      return this;
    };
    this.getScrollableNode = () => {
      return this._scrollNodeRef;
    };
    this.getInnerViewRef = () => {
      return this._innerViewRef;
    };
    this.getInnerViewNode = () => {
      return this._innerViewRef;
    };
    this.getNativeScrollRef = () => {
      return this._scrollNodeRef;
    };
    this.scrollTo = (y, x, animated) => {
      if (typeof y === "number") {
        console.warn("`scrollTo(y, x, animated)` is deprecated. Use `scrollTo({x: 5, y: 5, animated: true})` instead.");
      } else {
        var _ref2 = y || emptyObject9;
        x = _ref2.x;
        y = _ref2.y;
        animated = _ref2.animated;
      }
      this.scrollResponderScrollTo({
        x: x || 0,
        y: y || 0,
        animated: animated !== false
      });
    };
    this.scrollToEnd = (options) => {
      var animated = (options && options.animated) !== false;
      var horizontal = this.props.horizontal;
      var scrollResponderNode = this.getScrollableNode();
      var x = horizontal ? scrollResponderNode.scrollWidth : 0;
      var y = horizontal ? 0 : scrollResponderNode.scrollHeight;
      this.scrollResponderScrollTo({
        x,
        y,
        animated
      });
    };
    this._handleContentOnLayout = (e3) => {
      var _e$nativeEvent$layout = e3.nativeEvent.layout, width = _e$nativeEvent$layout.width, height = _e$nativeEvent$layout.height;
      this.props.onContentSizeChange(width, height);
    };
    this._handleScroll = (e3) => {
      if (process.env.NODE_ENV !== "production") {
        if (this.props.onScroll && this.props.scrollEventThrottle == null) {
          console.log("You specified `onScroll` on a <ScrollView> but not `scrollEventThrottle`. You will only receive one event. Using `16` you get all the events but be aware that it may cause frame drops, use a bigger number if you don't need as much precision.");
        }
      }
      if (this.props.keyboardDismissMode === "on-drag") {
        dismissKeyboard_default();
      }
      this.scrollResponderHandleScroll(e3);
    };
    this._setInnerViewRef = (node) => {
      this._innerViewRef = node;
    };
    this._setScrollNodeRef = (node) => {
      this._scrollNodeRef = node;
      if (node != null) {
        node.getScrollResponder = this.getScrollResponder;
        node.getInnerViewNode = this.getInnerViewNode;
        node.getInnerViewRef = this.getInnerViewRef;
        node.getNativeScrollRef = this.getNativeScrollRef;
        node.getScrollableNode = this.getScrollableNode;
        node.scrollTo = this.scrollTo;
        node.scrollToEnd = this.scrollToEnd;
        node.flashScrollIndicators = this.flashScrollIndicators;
        node.scrollResponderZoomTo = this.scrollResponderZoomTo;
        node.scrollResponderScrollNativeHandleToKeyboard = this.scrollResponderScrollNativeHandleToKeyboard;
      }
      var ref = mergeRefs(this.props.forwardedRef);
      ref(node);
    };
  }
  /**
   * ------------------------------------------------------
   * START SCROLLRESPONDER
   * ------------------------------------------------------
   */
  // Reset to false every time becomes responder. This is used to:
  // - Determine if the scroll view has been scrolled and therefore should
  // refuse to give up its responder lock.
  // - Determine if releasing should dismiss the keyboard when we are in
  // tap-to-dismiss mode (!this.props.keyboardShouldPersistTaps).
  /**
   * Invoke this from an `onScroll` event.
   */
  /**
   * Merely touch starting is not sufficient for a scroll view to become the
   * responder. Being the "responder" means that the very next touch move/end
   * event will result in an action/movement.
   *
   * Invoke this from an `onStartShouldSetResponder` event.
   *
   * `onStartShouldSetResponder` is used when the next move/end will trigger
   * some UI movement/action, but when you want to yield priority to views
   * nested inside of the view.
   *
   * There may be some cases where scroll views actually should return `true`
   * from `onStartShouldSetResponder`: Any time we are detecting a standard tap
   * that gives priority to nested views.
   *
   * - If a single tap on the scroll view triggers an action such as
   *   recentering a map style view yet wants to give priority to interaction
   *   views inside (such as dropped pins or labels), then we would return true
   *   from this method when there is a single touch.
   *
   * - Similar to the previous case, if a two finger "tap" should trigger a
   *   zoom, we would check the `touches` count, and if `>= 2`, we would return
   *   true.
   *
   */
  scrollResponderHandleStartShouldSetResponder() {
    return false;
  }
  /**
   * There are times when the scroll view wants to become the responder
   * (meaning respond to the next immediate `touchStart/touchEnd`), in a way
   * that *doesn't* give priority to nested views (hence the capture phase):
   *
   * - Currently animating.
   * - Tapping anywhere that is not the focused input, while the keyboard is
   *   up (which should dismiss the keyboard).
   *
   * Invoke this from an `onStartShouldSetResponderCapture` event.
   */
  /**
   * Invoke this from an `onResponderReject` event.
   *
   * Some other element is not yielding its role as responder. Normally, we'd
   * just disable the `UIScrollView`, but a touch has already began on it, the
   * `UIScrollView` will not accept being disabled after that. The easiest
   * solution for now is to accept the limitation of disallowing this
   * altogether. To improve this, find a way to disable the `UIScrollView` after
   * a touch has already started.
   */
  scrollResponderHandleResponderReject() {
    (0, import_warning.default)(false, "ScrollView doesn't take rejection well - scrolls anyway");
  }
  /**
   * We will allow the scroll view to give up its lock iff it acquired the lock
   * during an animation. This is a very useful default that happens to satisfy
   * many common user experiences.
   *
   * - Stop a scroll on the left edge, then turn that into an outer view's
   *   backswipe.
   * - Stop a scroll mid-bounce at the top, continue pulling to have the outer
   *   view dismiss.
   * - However, without catching the scroll view mid-bounce (while it is
   *   motionless), if you drag far enough for the scroll view to become
   *   responder (and therefore drag the scroll view a bit), any backswipe
   *   navigation of a swipe gesture higher in the view hierarchy, should be
   *   rejected.
   */
  /**
   * Invoke this from an `onTouchEnd` event.
   *
   * @param {SyntheticEvent} e Event.
   */
  /**
   * Invoke this from an `onResponderRelease` event.
   */
  /**
   * Invoke this from an `onResponderGrant` event.
   */
  /**
   * Unfortunately, `onScrollBeginDrag` also fires when *stopping* the scroll
   * animation, and there's not an easy way to distinguish a drag vs. stopping
   * momentum.
   *
   * Invoke this from an `onScrollBeginDrag` event.
   */
  /**
   * Invoke this from an `onScrollEndDrag` event.
   */
  /**
   * Invoke this from an `onMomentumScrollBegin` event.
   */
  /**
   * Invoke this from an `onMomentumScrollEnd` event.
   */
  /**
   * Invoke this from an `onTouchStart` event.
   *
   * Since we know that the `SimpleEventPlugin` occurs later in the plugin
   * order, after `ResponderEventPlugin`, we can detect that we were *not*
   * permitted to be the responder (presumably because a contained view became
   * responder). The `onResponderReject` won't fire in that case - it only
   * fires when a *current* responder rejects our request.
   *
   * @param {SyntheticEvent} e Touch Start event.
   */
  /**
   * Invoke this from an `onTouchMove` event.
   *
   * Since we know that the `SimpleEventPlugin` occurs later in the plugin
   * order, after `ResponderEventPlugin`, we can detect that we were *not*
   * permitted to be the responder (presumably because a contained view became
   * responder). The `onResponderReject` won't fire in that case - it only
   * fires when a *current* responder rejects our request.
   *
   * @param {SyntheticEvent} e Touch Start event.
   */
  /**
   * A helper function for this class that lets us quickly determine if the
   * view is currently animating. This is particularly useful to know when
   * a touch has just started or ended.
   */
  /**
   * A helper function to scroll to a specific point in the scrollview.
   * This is currently used to help focus on child textviews, but can also
   * be used to quickly scroll to any element we want to focus. Syntax:
   *
   * scrollResponderScrollTo(options: {x: number = 0; y: number = 0; animated: boolean = true})
   *
   * Note: The weird argument signature is due to the fact that, for historical reasons,
   * the function also accepts separate arguments as as alternative to the options object.
   * This is deprecated due to ambiguity (y before x), and SHOULD NOT BE USED.
   */
  /**
   * A helper function to zoom to a specific rect in the scrollview. The argument has the shape
   * {x: number; y: number; width: number; height: number; animated: boolean = true}
   *
   * @platform ios
   */
  /**
   * Displays the scroll indicators momentarily.
   */
  scrollResponderFlashScrollIndicators() {
  }
  /**
   * This method should be used as the callback to onFocus in a TextInputs'
   * parent view. Note that any module using this mixin needs to return
   * the parent view's ref in getScrollViewRef() in order to use this method.
   * @param {any} nodeHandle The TextInput node handle
   * @param {number} additionalOffset The scroll view's top "contentInset".
   *        Default is 0.
   * @param {bool} preventNegativeScrolling Whether to allow pulling the content
   *        down to make it meet the keyboard's top. Default is false.
   */
  /**
   * The calculations performed here assume the scroll view takes up the entire
   * screen - even if has some content inset. We then measure the offsets of the
   * keyboard, and compensate both for the scroll view's "contentInset".
   *
   * @param {number} left Position of input w.r.t. table view.
   * @param {number} top Position of input w.r.t. table view.
   * @param {number} width Width of the text input.
   * @param {number} height Height of the text input.
   */
  scrollResponderTextInputFocusError(e3) {
    console.error("Error measuring text field: ", e3);
  }
  /**
   * Warning, this may be called several times for a single keyboard opening.
   * It's best to store the information in this method and then take any action
   * at a later point (either in `keyboardDidShow` or other).
   *
   * Here's the order that events occur in:
   * - focus
   * - willShow {startCoordinates, endCoordinates} several times
   * - didShow several times
   * - blur
   * - willHide {startCoordinates, endCoordinates} several times
   * - didHide several times
   *
   * The `ScrollResponder` providesModule callbacks for each of these events.
   * Even though any user could have easily listened to keyboard events
   * themselves, using these `props` callbacks ensures that ordering of events
   * is consistent - and not dependent on the order that the keyboard events are
   * subscribed to. This matters when telling the scroll view to scroll to where
   * the keyboard is headed - the scroll responder better have been notified of
   * the keyboard destination before being instructed to scroll to where the
   * keyboard will be. Stick to the `ScrollResponder` callbacks, and everything
   * will work.
   *
   * WARNING: These callbacks will fire even if a keyboard is displayed in a
   * different navigation pane. Filter out the events to determine if they are
   * relevant to you. (For example, only if you receive these callbacks after
   * you had explicitly focused a node etc).
   */
  /**
   * ------------------------------------------------------
   * END SCROLLRESPONDER
   * ------------------------------------------------------
   */
  /**
   * Returns a reference to the underlying scroll responder, which supports
   * operations like `scrollTo`. All ScrollView-like components should
   * implement this method so that they can be composed while providing access
   * to the underlying scroll responder's methods.
   */
  /**
   * Scrolls to a given x, y offset, either immediately or with a smooth animation.
   * Syntax:
   *
   * scrollTo(options: {x: number = 0; y: number = 0; animated: boolean = true})
   *
   * Note: The weird argument signature is due to the fact that, for historical reasons,
   * the function also accepts separate arguments as as alternative to the options object.
   * This is deprecated due to ambiguity (y before x), and SHOULD NOT BE USED.
   */
  /**
   * If this is a vertical ScrollView scrolls to the bottom.
   * If this is a horizontal ScrollView scrolls to the right.
   *
   * Use `scrollToEnd({ animated: true })` for smooth animated scrolling,
   * `scrollToEnd({ animated: false })` for immediate scrolling.
   * If no options are passed, `animated` defaults to true.
   */
  render() {
    var _this$props = this.props, contentContainerStyle = _this$props.contentContainerStyle, horizontal = _this$props.horizontal, onContentSizeChange = _this$props.onContentSizeChange, refreshControl = _this$props.refreshControl, stickyHeaderIndices = _this$props.stickyHeaderIndices, pagingEnabled = _this$props.pagingEnabled, forwardedRef = _this$props.forwardedRef, keyboardDismissMode = _this$props.keyboardDismissMode, onScroll = _this$props.onScroll, centerContent = _this$props.centerContent, other = (0, import_objectWithoutPropertiesLoose6.default)(_this$props, _excluded6);
    if (process.env.NODE_ENV !== "production" && this.props.style) {
      var style = StyleSheet_default.flatten(this.props.style);
      var childLayoutProps = ["alignItems", "justifyContent"].filter((prop) => style && style[prop] !== void 0);
      (0, import_invariant2.default)(childLayoutProps.length === 0, "ScrollView child layout (" + JSON.stringify(childLayoutProps) + ") must be applied through the contentContainerStyle prop.");
    }
    var contentSizeChangeProps = {};
    if (onContentSizeChange) {
      contentSizeChangeProps = {
        onLayout: this._handleContentOnLayout
      };
    }
    var hasStickyHeaderIndices = !horizontal && Array.isArray(stickyHeaderIndices);
    var children = hasStickyHeaderIndices || pagingEnabled ? React9.Children.map(this.props.children, (child, i) => {
      var isSticky = hasStickyHeaderIndices && stickyHeaderIndices.indexOf(i) > -1;
      if (child != null && (isSticky || pagingEnabled)) {
        return /* @__PURE__ */ React9.createElement(View_default, {
          style: [isSticky && styles3.stickyHeader, pagingEnabled && styles3.pagingEnabledChild]
        }, child);
      } else {
        return child;
      }
    }) : this.props.children;
    var contentContainer = /* @__PURE__ */ React9.createElement(View_default, (0, import_extends2.default)({}, contentSizeChangeProps, {
      children,
      collapsable: false,
      ref: this._setInnerViewRef,
      style: [horizontal && styles3.contentContainerHorizontal, centerContent && styles3.contentContainerCenterContent, contentContainerStyle]
    }));
    var baseStyle = horizontal ? styles3.baseHorizontal : styles3.baseVertical;
    var pagingEnabledStyle = horizontal ? styles3.pagingEnabledHorizontal : styles3.pagingEnabledVertical;
    var props = (0, import_objectSpread24.default)((0, import_objectSpread24.default)({}, other), {}, {
      style: [baseStyle, pagingEnabled && pagingEnabledStyle, this.props.style],
      onTouchStart: this.scrollResponderHandleTouchStart,
      onTouchMove: this.scrollResponderHandleTouchMove,
      onTouchEnd: this.scrollResponderHandleTouchEnd,
      onScrollBeginDrag: this.scrollResponderHandleScrollBeginDrag,
      onScrollEndDrag: this.scrollResponderHandleScrollEndDrag,
      onMomentumScrollBegin: this.scrollResponderHandleMomentumScrollBegin,
      onMomentumScrollEnd: this.scrollResponderHandleMomentumScrollEnd,
      onStartShouldSetResponder: this.scrollResponderHandleStartShouldSetResponder,
      onStartShouldSetResponderCapture: this.scrollResponderHandleStartShouldSetResponderCapture,
      onScrollShouldSetResponder: this.scrollResponderHandleScrollShouldSetResponder,
      onScroll: this._handleScroll,
      onResponderGrant: this.scrollResponderHandleResponderGrant,
      onResponderTerminationRequest: this.scrollResponderHandleTerminationRequest,
      onResponderTerminate: this.scrollResponderHandleTerminate,
      onResponderRelease: this.scrollResponderHandleResponderRelease,
      onResponderReject: this.scrollResponderHandleResponderReject
    });
    var ScrollViewClass = ScrollViewBase_default;
    (0, import_invariant2.default)(ScrollViewClass !== void 0, "ScrollViewClass must not be undefined");
    var scrollView = /* @__PURE__ */ React9.createElement(ScrollViewClass, (0, import_extends2.default)({}, props, {
      ref: this._setScrollNodeRef
    }), contentContainer);
    if (refreshControl) {
      return /* @__PURE__ */ React9.cloneElement(refreshControl, {
        style: props.style
      }, scrollView);
    }
    return scrollView;
  }
};
var commonStyle = {
  flexGrow: 1,
  flexShrink: 1,
  // Enable hardware compositing in modern browsers.
  // Creates a new layer with its own backing surface that can significantly
  // improve scroll performance.
  transform: "translateZ(0)",
  // iOS native scrolling
  WebkitOverflowScrolling: "touch"
};
var styles3 = StyleSheet_default.create({
  baseVertical: (0, import_objectSpread24.default)((0, import_objectSpread24.default)({}, commonStyle), {}, {
    flexDirection: "column",
    overflowX: "hidden",
    overflowY: "auto"
  }),
  baseHorizontal: (0, import_objectSpread24.default)((0, import_objectSpread24.default)({}, commonStyle), {}, {
    flexDirection: "row",
    overflowX: "auto",
    overflowY: "hidden"
  }),
  contentContainerHorizontal: {
    flexDirection: "row"
  },
  contentContainerCenterContent: {
    justifyContent: "center",
    flexGrow: 1
  },
  stickyHeader: {
    position: "sticky",
    top: 0,
    zIndex: 10
  },
  pagingEnabledHorizontal: {
    scrollSnapType: "x mandatory"
  },
  pagingEnabledVertical: {
    scrollSnapType: "y mandatory"
  },
  pagingEnabledChild: {
    scrollSnapAlign: "start"
  }
});
var ForwardedScrollView = /* @__PURE__ */ React9.forwardRef((props, forwardedRef) => {
  return /* @__PURE__ */ React9.createElement(ScrollView, (0, import_extends2.default)({}, props, {
    forwardedRef
  }));
});
ForwardedScrollView.displayName = "ScrollView";
var ScrollView_default = ForwardedScrollView;

// node_modules/react-native-web/dist/exports/Text/index.js
var import_objectSpread25 = __toESM(require_objectSpread2());
var import_objectWithoutPropertiesLoose7 = __toESM(require_objectWithoutPropertiesLoose());
import * as React10 from "react";
var _excluded7 = ["hrefAttrs", "numberOfLines", "onClick", "onLayout", "onPress", "onMoveShouldSetResponder", "onMoveShouldSetResponderCapture", "onResponderEnd", "onResponderGrant", "onResponderMove", "onResponderReject", "onResponderRelease", "onResponderStart", "onResponderTerminate", "onResponderTerminationRequest", "onScrollShouldSetResponder", "onScrollShouldSetResponderCapture", "onSelectionChangeShouldSetResponder", "onSelectionChangeShouldSetResponderCapture", "onStartShouldSetResponder", "onStartShouldSetResponderCapture", "selectable"];
var forwardPropsList2 = Object.assign({}, defaultProps, accessibilityProps, clickProps, focusProps, keyboardProps, mouseProps, touchProps, styleProps, {
  href: true,
  lang: true,
  pointerEvents: true
});
var pickProps2 = (props) => pick(props, forwardPropsList2);
var Text = /* @__PURE__ */ React10.forwardRef((props, forwardedRef) => {
  var hrefAttrs = props.hrefAttrs, numberOfLines = props.numberOfLines, onClick = props.onClick, onLayout = props.onLayout, onPress = props.onPress, onMoveShouldSetResponder = props.onMoveShouldSetResponder, onMoveShouldSetResponderCapture = props.onMoveShouldSetResponderCapture, onResponderEnd = props.onResponderEnd, onResponderGrant = props.onResponderGrant, onResponderMove = props.onResponderMove, onResponderReject = props.onResponderReject, onResponderRelease = props.onResponderRelease, onResponderStart = props.onResponderStart, onResponderTerminate = props.onResponderTerminate, onResponderTerminationRequest = props.onResponderTerminationRequest, onScrollShouldSetResponder = props.onScrollShouldSetResponder, onScrollShouldSetResponderCapture = props.onScrollShouldSetResponderCapture, onSelectionChangeShouldSetResponder = props.onSelectionChangeShouldSetResponder, onSelectionChangeShouldSetResponderCapture = props.onSelectionChangeShouldSetResponderCapture, onStartShouldSetResponder = props.onStartShouldSetResponder, onStartShouldSetResponderCapture = props.onStartShouldSetResponderCapture, selectable = props.selectable, rest = (0, import_objectWithoutPropertiesLoose7.default)(props, _excluded7);
  var hasTextAncestor = React10.useContext(TextAncestorContext_default);
  var hostRef = React10.useRef(null);
  var _useLocaleContext = useLocaleContext(), contextDirection = _useLocaleContext.direction;
  useElementLayout(hostRef, onLayout);
  useResponderEvents(hostRef, {
    onMoveShouldSetResponder,
    onMoveShouldSetResponderCapture,
    onResponderEnd,
    onResponderGrant,
    onResponderMove,
    onResponderReject,
    onResponderRelease,
    onResponderStart,
    onResponderTerminate,
    onResponderTerminationRequest,
    onScrollShouldSetResponder,
    onScrollShouldSetResponderCapture,
    onSelectionChangeShouldSetResponder,
    onSelectionChangeShouldSetResponderCapture,
    onStartShouldSetResponder,
    onStartShouldSetResponderCapture
  });
  var handleClick = React10.useCallback((e3) => {
    if (onClick != null) {
      onClick(e3);
    } else if (onPress != null) {
      e3.stopPropagation();
      onPress(e3);
    }
  }, [onClick, onPress]);
  var component = hasTextAncestor ? "span" : "div";
  var langDirection = props.lang != null ? getLocaleDirection(props.lang) : null;
  var componentDirection = props.dir || langDirection;
  var writingDirection = componentDirection || contextDirection;
  var supportedProps = pickProps2(rest);
  supportedProps.dir = componentDirection;
  if (!hasTextAncestor) {
    supportedProps.dir = componentDirection != null ? componentDirection : "auto";
  }
  if (onClick || onPress) {
    supportedProps.onClick = handleClick;
  }
  supportedProps.style = [numberOfLines != null && numberOfLines > 1 && {
    WebkitLineClamp: numberOfLines
  }, hasTextAncestor === true ? styles4.textHasAncestor$raw : styles4.text$raw, numberOfLines === 1 && styles4.textOneLine, numberOfLines != null && numberOfLines > 1 && styles4.textMultiLine, props.style, selectable === true && styles4.selectable, selectable === false && styles4.notSelectable, onPress && styles4.pressable];
  if (props.href != null) {
    component = "a";
    if (hrefAttrs != null) {
      var download = hrefAttrs.download, rel = hrefAttrs.rel, target = hrefAttrs.target;
      if (download != null) {
        supportedProps.download = download;
      }
      if (rel != null) {
        supportedProps.rel = rel;
      }
      if (typeof target === "string") {
        supportedProps.target = target.charAt(0) !== "_" ? "_" + target : target;
      }
    }
  }
  var platformMethodsRef = usePlatformMethods(supportedProps);
  var setRef = useMergeRefs(hostRef, platformMethodsRef, forwardedRef);
  supportedProps.ref = setRef;
  var element = createElement_default(component, supportedProps, {
    writingDirection
  });
  return hasTextAncestor ? element : /* @__PURE__ */ React10.createElement(TextAncestorContext_default.Provider, {
    value: true
  }, element);
});
Text.displayName = "Text";
var textStyle = {
  backgroundColor: "transparent",
  border: "0 solid black",
  boxSizing: "border-box",
  color: "black",
  display: "inline",
  font: "14px System",
  listStyle: "none",
  margin: 0,
  padding: 0,
  position: "relative",
  textAlign: "start",
  textDecoration: "none",
  whiteSpace: "pre-wrap",
  wordWrap: "break-word"
};
var styles4 = StyleSheet_default.create({
  text$raw: textStyle,
  textHasAncestor$raw: (0, import_objectSpread25.default)((0, import_objectSpread25.default)({}, textStyle), {}, {
    color: "inherit",
    font: "inherit",
    textAlign: "inherit",
    whiteSpace: "inherit"
  }),
  textOneLine: {
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    wordWrap: "normal"
  },
  // See #13
  textMultiLine: {
    display: "-webkit-box",
    maxWidth: "100%",
    overflow: "clip",
    textOverflow: "ellipsis",
    WebkitBoxOrient: "vertical"
  },
  notSelectable: {
    userSelect: "none"
  },
  selectable: {
    userSelect: "text"
  },
  pressable: {
    cursor: "pointer"
  }
});
var Text_default = Text;

// node_modules/react-native-web/dist/exports/AppRegistry/index.js
var import_objectSpread26 = __toESM(require_objectSpread2());
var import_invariant4 = __toESM(require_invariant());

// node_modules/react-native-web/dist/exports/AppRegistry/renderApplication.js
var import_extends3 = __toESM(require_extends());

// node_modules/react-native-web/dist/exports/AppRegistry/AppContainer.js
import * as React11 from "react";
var RootTagContext = /* @__PURE__ */ React11.createContext(null);
var AppContainer = /* @__PURE__ */ React11.forwardRef((props, forwardedRef) => {
  var children = props.children, WrapperComponent = props.WrapperComponent;
  var innerView = /* @__PURE__ */ React11.createElement(View_default, {
    children,
    key: 1,
    style: styles5.appContainer
  });
  if (WrapperComponent) {
    innerView = /* @__PURE__ */ React11.createElement(WrapperComponent, null, innerView);
  }
  return /* @__PURE__ */ React11.createElement(RootTagContext.Provider, {
    value: props.rootTag
  }, /* @__PURE__ */ React11.createElement(View_default, {
    ref: forwardedRef,
    style: styles5.appContainer
  }, innerView));
});
AppContainer.displayName = "AppContainer";
var AppContainer_default = AppContainer;
var styles5 = StyleSheet_default.create({
  appContainer: {
    flex: 1,
    pointerEvents: "box-none"
  }
});

// node_modules/react-native-web/dist/exports/AppRegistry/renderApplication.js
var import_invariant3 = __toESM(require_invariant());
import React12 from "react";
function renderApplication(RootComponent, WrapperComponent, callback, options) {
  var shouldHydrate = options.hydrate, initialProps = options.initialProps, rootTag = options.rootTag;
  var renderFn = shouldHydrate ? hydrate : render;
  (0, import_invariant3.default)(rootTag, "Expect to have a valid rootTag, instead got ", rootTag);
  return renderFn(/* @__PURE__ */ React12.createElement(AppContainer_default, {
    WrapperComponent,
    ref: callback,
    rootTag
  }, /* @__PURE__ */ React12.createElement(RootComponent, initialProps)), rootTag);
}
function getApplication(RootComponent, initialProps, WrapperComponent) {
  var element = /* @__PURE__ */ React12.createElement(AppContainer_default, {
    WrapperComponent,
    rootTag: {}
  }, /* @__PURE__ */ React12.createElement(RootComponent, initialProps));
  var getStyleElement = (props) => {
    var sheet2 = StyleSheet_default.getSheet();
    return /* @__PURE__ */ React12.createElement("style", (0, import_extends3.default)({}, props, {
      dangerouslySetInnerHTML: {
        __html: sheet2.textContent
      },
      id: sheet2.id
    }));
  };
  return {
    element,
    getStyleElement
  };
}

// node_modules/react-native-web/dist/exports/AppRegistry/index.js
var emptyObject10 = {};
var runnables = {};
var componentProviderInstrumentationHook = (component) => component();
var wrapperComponentProvider;
var AppRegistry = class _AppRegistry {
  static getAppKeys() {
    return Object.keys(runnables);
  }
  static getApplication(appKey, appParameters) {
    (0, import_invariant4.default)(runnables[appKey] && runnables[appKey].getApplication, "Application " + appKey + " has not been registered. This is either due to an import error during initialization or failure to call AppRegistry.registerComponent.");
    return runnables[appKey].getApplication(appParameters);
  }
  static registerComponent(appKey, componentProvider) {
    runnables[appKey] = {
      getApplication: (appParameters) => getApplication(componentProviderInstrumentationHook(componentProvider), appParameters ? appParameters.initialProps : emptyObject10, wrapperComponentProvider && wrapperComponentProvider(appParameters)),
      run: (appParameters) => renderApplication(componentProviderInstrumentationHook(componentProvider), wrapperComponentProvider && wrapperComponentProvider(appParameters), appParameters.callback, {
        hydrate: appParameters.hydrate || false,
        initialProps: appParameters.initialProps || emptyObject10,
        mode: appParameters.mode || "concurrent",
        rootTag: appParameters.rootTag
      })
    };
    return appKey;
  }
  static registerConfig(config) {
    config.forEach((_ref) => {
      var appKey = _ref.appKey, component = _ref.component, run = _ref.run;
      if (run) {
        _AppRegistry.registerRunnable(appKey, run);
      } else {
        (0, import_invariant4.default)(component, "No component provider passed in");
        _AppRegistry.registerComponent(appKey, component);
      }
    });
  }
  // TODO: fix style sheet creation when using this method
  static registerRunnable(appKey, run) {
    runnables[appKey] = {
      run
    };
    return appKey;
  }
  static runApplication(appKey, appParameters) {
    var isDevelopment = process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test";
    if (isDevelopment) {
      var params = (0, import_objectSpread26.default)({}, appParameters);
      params.rootTag = "#" + params.rootTag.id;
      console.log('Running application "' + appKey + '" with appParams:\n', params, "\nDevelopment-level warnings: " + (isDevelopment ? "ON" : "OFF") + "." + ("\nPerformance optimizations: " + (isDevelopment ? "OFF" : "ON") + "."));
    }
    (0, import_invariant4.default)(runnables[appKey] && runnables[appKey].run, 'Application "' + appKey + '" has not been registered. This is either due to an import error during initialization or failure to call AppRegistry.registerComponent.');
    return runnables[appKey].run(appParameters);
  }
  static setComponentProviderInstrumentationHook(hook) {
    componentProviderInstrumentationHook = hook;
  }
  static setWrapperComponentProvider(provider) {
    wrapperComponentProvider = provider;
  }
  static unmountApplicationComponentAtRootTag(rootTag) {
    unmountComponentAtNode(rootTag);
  }
};

// node_modules/react-native-web/dist/exports/ActivityIndicator/index.js
var import_extends4 = __toESM(require_extends());
var import_objectWithoutPropertiesLoose8 = __toESM(require_objectWithoutPropertiesLoose());
import * as React13 from "react";
var _excluded8 = ["animating", "color", "hidesWhenStopped", "size", "style"];
var createSvgCircle = (style) => /* @__PURE__ */ React13.createElement("circle", {
  cx: "16",
  cy: "16",
  fill: "none",
  r: "14",
  strokeWidth: "4",
  style
});
var ActivityIndicator = /* @__PURE__ */ React13.forwardRef((props, forwardedRef) => {
  var _props$animating = props.animating, animating = _props$animating === void 0 ? true : _props$animating, _props$color = props.color, color = _props$color === void 0 ? "#1976D2" : _props$color, _props$hidesWhenStopp = props.hidesWhenStopped, hidesWhenStopped = _props$hidesWhenStopp === void 0 ? true : _props$hidesWhenStopp, _props$size = props.size, size = _props$size === void 0 ? "small" : _props$size, style = props.style, other = (0, import_objectWithoutPropertiesLoose8.default)(props, _excluded8);
  var svg = /* @__PURE__ */ React13.createElement("svg", {
    height: "100%",
    viewBox: "0 0 32 32",
    width: "100%"
  }, createSvgCircle({
    stroke: color,
    opacity: 0.2
  }), createSvgCircle({
    stroke: color,
    strokeDasharray: 80,
    strokeDashoffset: 60
  }));
  return /* @__PURE__ */ React13.createElement(View_default, (0, import_extends4.default)({}, other, {
    "aria-valuemax": 1,
    "aria-valuemin": 0,
    ref: forwardedRef,
    role: "progressbar",
    style: [styles6.container, style]
  }), /* @__PURE__ */ React13.createElement(View_default, {
    children: svg,
    style: [typeof size === "number" ? {
      height: size,
      width: size
    } : indicatorSizes[size], styles6.animation, !animating && styles6.animationPause, !animating && hidesWhenStopped && styles6.hidesWhenStopped]
  }));
});
ActivityIndicator.displayName = "ActivityIndicator";
var styles6 = StyleSheet_default.create({
  container: {
    alignItems: "center",
    justifyContent: "center"
  },
  hidesWhenStopped: {
    visibility: "hidden"
  },
  animation: {
    animationDuration: "0.75s",
    animationKeyframes: [{
      "0%": {
        transform: "rotate(0deg)"
      },
      "100%": {
        transform: "rotate(360deg)"
      }
    }],
    animationTimingFunction: "linear",
    animationIterationCount: "infinite"
  },
  animationPause: {
    animationPlayState: "paused"
  }
});
var indicatorSizes = StyleSheet_default.create({
  small: {
    width: 20,
    height: 20
  },
  large: {
    width: 36,
    height: 36
  }
});
var ActivityIndicator_default = ActivityIndicator;

// node_modules/react-native-web/dist/modules/usePressEvents/PressResponder.js
var DELAY = "DELAY";
var ERROR = "ERROR";
var LONG_PRESS_DETECTED = "LONG_PRESS_DETECTED";
var NOT_RESPONDER = "NOT_RESPONDER";
var RESPONDER_ACTIVE_LONG_PRESS_START = "RESPONDER_ACTIVE_LONG_PRESS_START";
var RESPONDER_ACTIVE_PRESS_START = "RESPONDER_ACTIVE_PRESS_START";
var RESPONDER_INACTIVE_PRESS_START = "RESPONDER_INACTIVE_PRESS_START";
var RESPONDER_GRANT = "RESPONDER_GRANT";
var RESPONDER_RELEASE = "RESPONDER_RELEASE";
var RESPONDER_TERMINATED = "RESPONDER_TERMINATED";
var Transitions = Object.freeze({
  NOT_RESPONDER: {
    DELAY: ERROR,
    RESPONDER_GRANT: RESPONDER_INACTIVE_PRESS_START,
    RESPONDER_RELEASE: ERROR,
    RESPONDER_TERMINATED: ERROR,
    LONG_PRESS_DETECTED: ERROR
  },
  RESPONDER_INACTIVE_PRESS_START: {
    DELAY: RESPONDER_ACTIVE_PRESS_START,
    RESPONDER_GRANT: ERROR,
    RESPONDER_RELEASE: NOT_RESPONDER,
    RESPONDER_TERMINATED: NOT_RESPONDER,
    LONG_PRESS_DETECTED: ERROR
  },
  RESPONDER_ACTIVE_PRESS_START: {
    DELAY: ERROR,
    RESPONDER_GRANT: ERROR,
    RESPONDER_RELEASE: NOT_RESPONDER,
    RESPONDER_TERMINATED: NOT_RESPONDER,
    LONG_PRESS_DETECTED: RESPONDER_ACTIVE_LONG_PRESS_START
  },
  RESPONDER_ACTIVE_LONG_PRESS_START: {
    DELAY: ERROR,
    RESPONDER_GRANT: ERROR,
    RESPONDER_RELEASE: NOT_RESPONDER,
    RESPONDER_TERMINATED: NOT_RESPONDER,
    LONG_PRESS_DETECTED: RESPONDER_ACTIVE_LONG_PRESS_START
  },
  ERROR: {
    DELAY: NOT_RESPONDER,
    RESPONDER_GRANT: RESPONDER_INACTIVE_PRESS_START,
    RESPONDER_RELEASE: NOT_RESPONDER,
    RESPONDER_TERMINATED: NOT_RESPONDER,
    LONG_PRESS_DETECTED: NOT_RESPONDER
  }
});
var getElementRole = (element) => element.getAttribute("role");
var getElementType = (element) => element.tagName.toLowerCase();
var isActiveSignal = (signal) => signal === RESPONDER_ACTIVE_PRESS_START || signal === RESPONDER_ACTIVE_LONG_PRESS_START;
var isButtonRole = (element) => getElementRole(element) === "button";
var isPressStartSignal = (signal) => signal === RESPONDER_INACTIVE_PRESS_START || signal === RESPONDER_ACTIVE_PRESS_START || signal === RESPONDER_ACTIVE_LONG_PRESS_START;
var isTerminalSignal = (signal) => signal === RESPONDER_TERMINATED || signal === RESPONDER_RELEASE;
var isValidKeyPress = (event) => {
  var key = event.key, target = event.target;
  var isSpacebar = key === " " || key === "Spacebar";
  var isButtonish = getElementType(target) === "button" || isButtonRole(target);
  return key === "Enter" || isSpacebar && isButtonish;
};
var DEFAULT_LONG_PRESS_DELAY_MS = 450;
var DEFAULT_PRESS_DELAY_MS = 50;
var PressResponder = class {
  constructor(config) {
    this._eventHandlers = null;
    this._isPointerTouch = false;
    this._longPressDelayTimeout = null;
    this._longPressDispatched = false;
    this._pressDelayTimeout = null;
    this._pressOutDelayTimeout = null;
    this._touchState = NOT_RESPONDER;
    this._responderElement = null;
    this.configure(config);
  }
  configure(config) {
    this._config = config;
  }
  /**
   * Resets any pending timers. This should be called on unmount.
   */
  reset() {
    this._cancelLongPressDelayTimeout();
    this._cancelPressDelayTimeout();
    this._cancelPressOutDelayTimeout();
  }
  /**
   * Returns a set of props to spread into the interactive element.
   */
  getEventHandlers() {
    if (this._eventHandlers == null) {
      this._eventHandlers = this._createEventHandlers();
    }
    return this._eventHandlers;
  }
  _createEventHandlers() {
    var start = (event, shouldDelay) => {
      event.persist();
      this._cancelPressOutDelayTimeout();
      this._longPressDispatched = false;
      this._selectionTerminated = false;
      this._touchState = NOT_RESPONDER;
      this._isPointerTouch = event.nativeEvent.type === "touchstart";
      this._receiveSignal(RESPONDER_GRANT, event);
      var delayPressStart = normalizeDelay(this._config.delayPressStart, 0, DEFAULT_PRESS_DELAY_MS);
      if (shouldDelay !== false && delayPressStart > 0) {
        this._pressDelayTimeout = setTimeout(() => {
          this._receiveSignal(DELAY, event);
        }, delayPressStart);
      } else {
        this._receiveSignal(DELAY, event);
      }
      var delayLongPress = normalizeDelay(this._config.delayLongPress, 10, DEFAULT_LONG_PRESS_DELAY_MS);
      this._longPressDelayTimeout = setTimeout(() => {
        this._handleLongPress(event);
      }, delayLongPress + delayPressStart);
    };
    var end = (event) => {
      this._receiveSignal(RESPONDER_RELEASE, event);
    };
    var keyupHandler = (event) => {
      var onPress = this._config.onPress;
      var target = event.target;
      if (this._touchState !== NOT_RESPONDER && isValidKeyPress(event)) {
        end(event);
        document.removeEventListener("keyup", keyupHandler);
        var role = target.getAttribute("role");
        var elementType = getElementType(target);
        var isNativeInteractiveElement = role === "link" || elementType === "a" || elementType === "button" || elementType === "input" || elementType === "select" || elementType === "textarea";
        var isActiveElement = this._responderElement === target;
        if (onPress != null && !isNativeInteractiveElement && isActiveElement) {
          onPress(event);
        }
        this._responderElement = null;
      }
    };
    return {
      onStartShouldSetResponder: (event) => {
        var disabled = this._config.disabled;
        if (disabled && isButtonRole(event.currentTarget)) {
          event.stopPropagation();
        }
        if (disabled == null) {
          return true;
        }
        return !disabled;
      },
      onKeyDown: (event) => {
        var disabled = this._config.disabled;
        var key = event.key, target = event.target;
        if (!disabled && isValidKeyPress(event)) {
          if (this._touchState === NOT_RESPONDER) {
            start(event, false);
            this._responderElement = target;
            document.addEventListener("keyup", keyupHandler);
          }
          var isSpacebarKey = key === " " || key === "Spacebar";
          var role = getElementRole(target);
          var isButtonLikeRole = role === "button" || role === "menuitem";
          if (isSpacebarKey && isButtonLikeRole && getElementType(target) !== "button") {
            event.preventDefault();
          }
          event.stopPropagation();
        }
      },
      onResponderGrant: (event) => start(event),
      onResponderMove: (event) => {
        if (this._config.onPressMove != null) {
          this._config.onPressMove(event);
        }
        var touch = getTouchFromResponderEvent(event);
        if (this._touchActivatePosition != null) {
          var deltaX = this._touchActivatePosition.pageX - touch.pageX;
          var deltaY = this._touchActivatePosition.pageY - touch.pageY;
          if (Math.hypot(deltaX, deltaY) > 10) {
            this._cancelLongPressDelayTimeout();
          }
        }
      },
      onResponderRelease: (event) => end(event),
      onResponderTerminate: (event) => {
        if (event.nativeEvent.type === "selectionchange") {
          this._selectionTerminated = true;
        }
        this._receiveSignal(RESPONDER_TERMINATED, event);
      },
      onResponderTerminationRequest: (event) => {
        var _this$_config = this._config, cancelable = _this$_config.cancelable, disabled = _this$_config.disabled, onLongPress = _this$_config.onLongPress;
        if (!disabled && onLongPress != null && this._isPointerTouch && event.nativeEvent.type === "contextmenu") {
          return false;
        }
        if (cancelable == null) {
          return true;
        }
        return cancelable;
      },
      // NOTE: this diverges from react-native in 3 significant ways:
      // * The `onPress` callback is not connected to the responder system (the native
      //  `click` event must be used but is dispatched in many scenarios where no pointers
      //   are on the screen.) Therefore, it's possible for `onPress` to be called without
      //   `onPress{Start,End}` being called first.
      // * The `onPress` callback is only be called on the first ancestor of the native
      //   `click` target that is using the PressResponder.
      // * The event's `nativeEvent` is a `MouseEvent` not a `TouchEvent`.
      onClick: (event) => {
        var _this$_config2 = this._config, disabled = _this$_config2.disabled, onPress = _this$_config2.onPress;
        if (!disabled) {
          event.stopPropagation();
          if (this._longPressDispatched || this._selectionTerminated) {
            event.preventDefault();
          } else if (onPress != null && event.altKey === false) {
            onPress(event);
          }
        } else {
          if (isButtonRole(event.currentTarget)) {
            event.stopPropagation();
          }
        }
      },
      // If `onLongPress` is provided and a touch pointer is being used, prevent the
      // default context menu from opening.
      onContextMenu: (event) => {
        var _this$_config3 = this._config, disabled = _this$_config3.disabled, onLongPress = _this$_config3.onLongPress;
        if (!disabled) {
          if (onLongPress != null && this._isPointerTouch && !event.defaultPrevented) {
            event.preventDefault();
            event.stopPropagation();
          }
        } else {
          if (isButtonRole(event.currentTarget)) {
            event.stopPropagation();
          }
        }
      }
    };
  }
  /**
   * Receives a state machine signal, performs side effects of the transition
   * and stores the new state. Validates the transition as well.
   */
  _receiveSignal(signal, event) {
    var prevState = this._touchState;
    var nextState = null;
    if (Transitions[prevState] != null) {
      nextState = Transitions[prevState][signal];
    }
    if (this._touchState === NOT_RESPONDER && signal === RESPONDER_RELEASE) {
      return;
    }
    if (nextState == null || nextState === ERROR) {
      console.error("PressResponder: Invalid signal " + signal + " for state " + prevState + " on responder");
    } else if (prevState !== nextState) {
      this._performTransitionSideEffects(prevState, nextState, signal, event);
      this._touchState = nextState;
    }
  }
  /**
   * Performs a transition between touchable states and identify any activations
   * or deactivations (and callback invocations).
   */
  _performTransitionSideEffects(prevState, nextState, signal, event) {
    if (isTerminalSignal(signal)) {
      setTimeout(() => {
        this._isPointerTouch = false;
      }, 0);
      this._touchActivatePosition = null;
      this._cancelLongPressDelayTimeout();
    }
    if (isPressStartSignal(prevState) && signal === LONG_PRESS_DETECTED) {
      var onLongPress = this._config.onLongPress;
      if (onLongPress != null && event.nativeEvent.key == null) {
        onLongPress(event);
        this._longPressDispatched = true;
      }
    }
    var isPrevActive = isActiveSignal(prevState);
    var isNextActive = isActiveSignal(nextState);
    if (!isPrevActive && isNextActive) {
      this._activate(event);
    } else if (isPrevActive && !isNextActive) {
      this._deactivate(event);
    }
    if (isPressStartSignal(prevState) && signal === RESPONDER_RELEASE) {
      var _this$_config4 = this._config, _onLongPress = _this$_config4.onLongPress, onPress = _this$_config4.onPress;
      if (onPress != null) {
        var isPressCanceledByLongPress = _onLongPress != null && prevState === RESPONDER_ACTIVE_LONG_PRESS_START;
        if (!isPressCanceledByLongPress) {
          if (!isNextActive && !isPrevActive) {
            this._activate(event);
            this._deactivate(event);
          }
        }
      }
    }
    this._cancelPressDelayTimeout();
  }
  _activate(event) {
    var _this$_config5 = this._config, onPressChange = _this$_config5.onPressChange, onPressStart = _this$_config5.onPressStart;
    var touch = getTouchFromResponderEvent(event);
    this._touchActivatePosition = {
      pageX: touch.pageX,
      pageY: touch.pageY
    };
    if (onPressStart != null) {
      onPressStart(event);
    }
    if (onPressChange != null) {
      onPressChange(true);
    }
  }
  _deactivate(event) {
    var _this$_config6 = this._config, onPressChange = _this$_config6.onPressChange, onPressEnd = _this$_config6.onPressEnd;
    function end() {
      if (onPressEnd != null) {
        onPressEnd(event);
      }
      if (onPressChange != null) {
        onPressChange(false);
      }
    }
    var delayPressEnd = normalizeDelay(this._config.delayPressEnd);
    if (delayPressEnd > 0) {
      this._pressOutDelayTimeout = setTimeout(() => {
        end();
      }, delayPressEnd);
    } else {
      end();
    }
  }
  _handleLongPress(event) {
    if (this._touchState === RESPONDER_ACTIVE_PRESS_START || this._touchState === RESPONDER_ACTIVE_LONG_PRESS_START) {
      this._receiveSignal(LONG_PRESS_DETECTED, event);
    }
  }
  _cancelLongPressDelayTimeout() {
    if (this._longPressDelayTimeout != null) {
      clearTimeout(this._longPressDelayTimeout);
      this._longPressDelayTimeout = null;
    }
  }
  _cancelPressDelayTimeout() {
    if (this._pressDelayTimeout != null) {
      clearTimeout(this._pressDelayTimeout);
      this._pressDelayTimeout = null;
    }
  }
  _cancelPressOutDelayTimeout() {
    if (this._pressOutDelayTimeout != null) {
      clearTimeout(this._pressOutDelayTimeout);
      this._pressOutDelayTimeout = null;
    }
  }
};
function normalizeDelay(delay, min, fallback) {
  if (min === void 0) {
    min = 0;
  }
  if (fallback === void 0) {
    fallback = 0;
  }
  return Math.max(min, delay !== null && delay !== void 0 ? delay : fallback);
}
function getTouchFromResponderEvent(event) {
  var _event$nativeEvent = event.nativeEvent, changedTouches = _event$nativeEvent.changedTouches, touches = _event$nativeEvent.touches;
  if (touches != null && touches.length > 0) {
    return touches[0];
  }
  if (changedTouches != null && changedTouches.length > 0) {
    return changedTouches[0];
  }
  return event.nativeEvent;
}

// node_modules/react-native-web/dist/modules/usePressEvents/index.js
import { useDebugValue as useDebugValue2, useEffect as useEffect3, useRef as useRef6 } from "react";
function usePressEvents(hostRef, config) {
  var pressResponderRef = useRef6(null);
  if (pressResponderRef.current == null) {
    pressResponderRef.current = new PressResponder(config);
  }
  var pressResponder = pressResponderRef.current;
  useEffect3(() => {
    pressResponder.configure(config);
  }, [config, pressResponder]);
  useEffect3(() => {
    return () => {
      pressResponder.reset();
    };
  }, [pressResponder]);
  useDebugValue2(config);
  return pressResponder.getEventHandlers();
}

// node_modules/react-native-web/dist/exports/Pressable/index.js
var import_extends5 = __toESM(require_extends());
var import_objectWithoutPropertiesLoose9 = __toESM(require_objectWithoutPropertiesLoose());
import * as React14 from "react";
import { forwardRef as forwardRef6, memo, useMemo as useMemo2, useState, useRef as useRef7 } from "react";

// node_modules/react-native-web/dist/modules/addEventListener/index.js
var emptyFunction2 = () => {
};
function supportsPassiveEvents() {
  var supported = false;
  if (canUseDom_default) {
    try {
      var options = {};
      Object.defineProperty(options, "passive", {
        get() {
          supported = true;
          return false;
        }
      });
      window.addEventListener("test", null, options);
      window.removeEventListener("test", null, options);
    } catch (e3) {
    }
  }
  return supported;
}
var canUsePassiveEvents = supportsPassiveEvents();
function getOptions(options) {
  if (options == null) {
    return false;
  }
  return canUsePassiveEvents ? options : Boolean(options.capture);
}
function isPropagationStopped() {
  return this.cancelBubble;
}
function isDefaultPrevented() {
  return this.defaultPrevented;
}
function normalizeEvent(event) {
  event.nativeEvent = event;
  event.persist = emptyFunction2;
  event.isDefaultPrevented = isDefaultPrevented;
  event.isPropagationStopped = isPropagationStopped;
  return event;
}
function addEventListener(target, type2, listener, options) {
  var opts2 = getOptions(options);
  var compatListener = (e3) => listener(normalizeEvent(e3));
  target.addEventListener(type2, compatListener, opts2);
  return function removeEventListener() {
    if (target != null) {
      target.removeEventListener(type2, compatListener, opts2);
    }
  };
}

// node_modules/react-native-web/dist/modules/modality/index.js
var supportsPointerEvent = () => !!(typeof window !== "undefined" && window.PointerEvent != null);
var activeModality = "keyboard";
var modality = "keyboard";
var previousModality;
var previousActiveModality;
var isEmulatingMouseEvents2 = false;
var listeners2 = /* @__PURE__ */ new Set();
var KEYBOARD = "keyboard";
var MOUSE = "mouse";
var TOUCH = "touch";
var BLUR = "blur";
var CONTEXTMENU = "contextmenu";
var FOCUS = "focus";
var KEYDOWN = "keydown";
var MOUSEDOWN = "mousedown";
var MOUSEMOVE = "mousemove";
var MOUSEUP = "mouseup";
var POINTERDOWN = "pointerdown";
var POINTERMOVE = "pointermove";
var SCROLL2 = "scroll";
var SELECTIONCHANGE = "selectionchange";
var TOUCHCANCEL = "touchcancel";
var TOUCHMOVE = "touchmove";
var TOUCHSTART = "touchstart";
var VISIBILITYCHANGE = "visibilitychange";
var bubbleOptions = {
  passive: true
};
var captureOptions = {
  capture: true,
  passive: true
};
function restoreModality() {
  if (previousModality != null || previousActiveModality != null) {
    if (previousModality != null) {
      modality = previousModality;
      previousModality = null;
    }
    if (previousActiveModality != null) {
      activeModality = previousActiveModality;
      previousActiveModality = null;
    }
    callListeners();
  }
}
function onBlurWindow() {
  previousModality = modality;
  previousActiveModality = activeModality;
  activeModality = KEYBOARD;
  modality = KEYBOARD;
  callListeners();
  isEmulatingMouseEvents2 = false;
}
function onFocusWindow() {
  restoreModality();
}
function onKeyDown(event) {
  if (event.metaKey || event.altKey || event.ctrlKey) {
    return;
  }
  if (modality !== KEYBOARD) {
    modality = KEYBOARD;
    activeModality = KEYBOARD;
    callListeners();
  }
}
function onVisibilityChange() {
  if (document.visibilityState !== "hidden") {
    restoreModality();
  }
}
function onPointerish(event) {
  var eventType = event.type;
  if (supportsPointerEvent()) {
    if (eventType === POINTERDOWN) {
      if (activeModality !== event.pointerType) {
        modality = event.pointerType;
        activeModality = event.pointerType;
        callListeners();
      }
      return;
    }
    if (eventType === POINTERMOVE) {
      if (modality !== event.pointerType) {
        modality = event.pointerType;
        callListeners();
      }
      return;
    }
  } else {
    if (!isEmulatingMouseEvents2) {
      if (eventType === MOUSEDOWN) {
        if (activeModality !== MOUSE) {
          modality = MOUSE;
          activeModality = MOUSE;
          callListeners();
        }
      }
      if (eventType === MOUSEMOVE) {
        if (modality !== MOUSE) {
          modality = MOUSE;
          callListeners();
        }
      }
    }
    if (eventType === TOUCHSTART) {
      isEmulatingMouseEvents2 = true;
      if (event.touches && event.touches.length > 1) {
        isEmulatingMouseEvents2 = false;
      }
      if (activeModality !== TOUCH) {
        modality = TOUCH;
        activeModality = TOUCH;
        callListeners();
      }
      return;
    }
    if (eventType === CONTEXTMENU || eventType === MOUSEUP || eventType === SELECTIONCHANGE || eventType === SCROLL2 || eventType === TOUCHCANCEL || eventType === TOUCHMOVE) {
      isEmulatingMouseEvents2 = false;
    }
  }
}
if (canUseDom_default) {
  addEventListener(window, BLUR, onBlurWindow, bubbleOptions);
  addEventListener(window, FOCUS, onFocusWindow, bubbleOptions);
  addEventListener(document, KEYDOWN, onKeyDown, captureOptions);
  addEventListener(document, VISIBILITYCHANGE, onVisibilityChange, captureOptions);
  addEventListener(document, POINTERDOWN, onPointerish, captureOptions);
  addEventListener(document, POINTERMOVE, onPointerish, captureOptions);
  addEventListener(document, CONTEXTMENU, onPointerish, captureOptions);
  addEventListener(document, MOUSEDOWN, onPointerish, captureOptions);
  addEventListener(document, MOUSEMOVE, onPointerish, captureOptions);
  addEventListener(document, MOUSEUP, onPointerish, captureOptions);
  addEventListener(document, TOUCHCANCEL, onPointerish, captureOptions);
  addEventListener(document, TOUCHMOVE, onPointerish, captureOptions);
  addEventListener(document, TOUCHSTART, onPointerish, captureOptions);
  addEventListener(document, SELECTIONCHANGE, onPointerish, captureOptions);
  addEventListener(document, SCROLL2, onPointerish, captureOptions);
}
function callListeners() {
  var value = {
    activeModality,
    modality
  };
  listeners2.forEach((listener) => {
    listener(value);
  });
}
function getModality() {
  return modality;
}

// node_modules/react-native-web/dist/modules/useEvent/index.js
function useEvent(eventType, options) {
  var targetListeners = useStable(() => /* @__PURE__ */ new Map());
  var addListener = useStable(() => {
    return (target, callback) => {
      var removeTargetListener = targetListeners.get(target);
      if (removeTargetListener != null) {
        removeTargetListener();
      }
      if (callback == null) {
        targetListeners.delete(target);
        callback = () => {
        };
      }
      var removeEventListener = addEventListener(target, eventType, callback, options);
      targetListeners.set(target, removeEventListener);
      return removeEventListener;
    };
  });
  useLayoutEffect_default(() => {
    return () => {
      targetListeners.forEach((removeListener) => {
        removeListener();
      });
      targetListeners.clear();
    };
  }, [targetListeners]);
  return addListener;
}

// node_modules/react-native-web/dist/modules/useHover/index.js
var emptyObject11 = {};
var opts = {
  passive: true
};
var lockEventType = "react-gui:hover:lock";
var unlockEventType = "react-gui:hover:unlock";
var supportsPointerEvent2 = () => !!(typeof window !== "undefined" && window.PointerEvent != null);
function dispatchCustomEvent(target, type2, payload) {
  var event = document.createEvent("CustomEvent");
  var _ref = payload || emptyObject11, _ref$bubbles = _ref.bubbles, bubbles = _ref$bubbles === void 0 ? true : _ref$bubbles, _ref$cancelable = _ref.cancelable, cancelable = _ref$cancelable === void 0 ? true : _ref$cancelable, detail = _ref.detail;
  event.initCustomEvent(type2, bubbles, cancelable, detail);
  target.dispatchEvent(event);
}
function getPointerType(event) {
  var pointerType = event.pointerType;
  return pointerType != null ? pointerType : getModality();
}
function useHover(targetRef, config) {
  var contain = config.contain, disabled = config.disabled, onHoverStart = config.onHoverStart, onHoverChange = config.onHoverChange, onHoverUpdate = config.onHoverUpdate, onHoverEnd = config.onHoverEnd;
  var canUsePE = supportsPointerEvent2();
  var addMoveListener = useEvent(canUsePE ? "pointermove" : "mousemove", opts);
  var addEnterListener = useEvent(canUsePE ? "pointerenter" : "mouseenter", opts);
  var addLeaveListener = useEvent(canUsePE ? "pointerleave" : "mouseleave", opts);
  var addLockListener = useEvent(lockEventType, opts);
  var addUnlockListener = useEvent(unlockEventType, opts);
  useLayoutEffect_default(() => {
    var target = targetRef.current;
    if (target !== null) {
      var hoverEnd = function hoverEnd2(e3) {
        if (onHoverEnd != null) {
          onHoverEnd(e3);
        }
        if (onHoverChange != null) {
          onHoverChange(false);
        }
        addMoveListener(target, null);
        addLeaveListener(target, null);
      };
      var leaveListener = function leaveListener2(e3) {
        var target2 = targetRef.current;
        if (target2 != null && getPointerType(e3) !== "touch") {
          if (contain) {
            dispatchCustomEvent(target2, unlockEventType);
          }
          hoverEnd(e3);
        }
      };
      var moveListener = function moveListener2(e3) {
        if (getPointerType(e3) !== "touch") {
          if (onHoverUpdate != null) {
            if (e3.x == null) {
              e3.x = e3.clientX;
            }
            if (e3.y == null) {
              e3.y = e3.clientY;
            }
            onHoverUpdate(e3);
          }
        }
      };
      var hoverStart = function hoverStart2(e3) {
        if (onHoverStart != null) {
          onHoverStart(e3);
        }
        if (onHoverChange != null) {
          onHoverChange(true);
        }
        if (onHoverUpdate != null) {
          addMoveListener(target, !disabled ? moveListener : null);
        }
        addLeaveListener(target, !disabled ? leaveListener : null);
      };
      var enterListener = function enterListener2(e3) {
        var target2 = targetRef.current;
        if (target2 != null && getPointerType(e3) !== "touch") {
          if (contain) {
            dispatchCustomEvent(target2, lockEventType);
          }
          hoverStart(e3);
          var lockListener = function lockListener2(lockEvent) {
            if (lockEvent.target !== target2) {
              hoverEnd(e3);
            }
          };
          var unlockListener = function unlockListener2(lockEvent) {
            if (lockEvent.target !== target2) {
              hoverStart(e3);
            }
          };
          addLockListener(target2, !disabled ? lockListener : null);
          addUnlockListener(target2, !disabled ? unlockListener : null);
        }
      };
      addEnterListener(target, !disabled ? enterListener : null);
    }
  }, [addEnterListener, addMoveListener, addLeaveListener, addLockListener, addUnlockListener, contain, disabled, onHoverStart, onHoverChange, onHoverUpdate, onHoverEnd, targetRef]);
}

// node_modules/react-native-web/dist/exports/Pressable/index.js
var _excluded9 = ["children", "delayLongPress", "delayPressIn", "delayPressOut", "disabled", "onBlur", "onContextMenu", "onFocus", "onHoverIn", "onHoverOut", "onKeyDown", "onLongPress", "onPress", "onPressMove", "onPressIn", "onPressOut", "style", "tabIndex", "testOnly_hovered", "testOnly_pressed"];
function Pressable(props, forwardedRef) {
  var children = props.children, delayLongPress = props.delayLongPress, delayPressIn = props.delayPressIn, delayPressOut = props.delayPressOut, disabled = props.disabled, onBlur = props.onBlur, onContextMenu = props.onContextMenu, onFocus = props.onFocus, onHoverIn = props.onHoverIn, onHoverOut = props.onHoverOut, onKeyDown2 = props.onKeyDown, onLongPress = props.onLongPress, onPress = props.onPress, onPressMove = props.onPressMove, onPressIn = props.onPressIn, onPressOut = props.onPressOut, style = props.style, tabIndex = props.tabIndex, testOnly_hovered = props.testOnly_hovered, testOnly_pressed = props.testOnly_pressed, rest = (0, import_objectWithoutPropertiesLoose9.default)(props, _excluded9);
  var _useForceableState = useForceableState(testOnly_hovered === true), hovered = _useForceableState[0], setHovered = _useForceableState[1];
  var _useForceableState2 = useForceableState(false), focused = _useForceableState2[0], setFocused = _useForceableState2[1];
  var _useForceableState3 = useForceableState(testOnly_pressed === true), pressed = _useForceableState3[0], setPressed = _useForceableState3[1];
  var hostRef = useRef7(null);
  var setRef = useMergeRefs(forwardedRef, hostRef);
  var pressConfig = useMemo2(() => ({
    delayLongPress,
    delayPressStart: delayPressIn,
    delayPressEnd: delayPressOut,
    disabled,
    onLongPress,
    onPress,
    onPressChange: setPressed,
    onPressStart: onPressIn,
    onPressMove,
    onPressEnd: onPressOut
  }), [delayLongPress, delayPressIn, delayPressOut, disabled, onLongPress, onPress, onPressIn, onPressMove, onPressOut, setPressed]);
  var pressEventHandlers = usePressEvents(hostRef, pressConfig);
  var onContextMenuPress = pressEventHandlers.onContextMenu, onKeyDownPress = pressEventHandlers.onKeyDown;
  useHover(hostRef, {
    contain: true,
    disabled,
    onHoverChange: setHovered,
    onHoverStart: onHoverIn,
    onHoverEnd: onHoverOut
  });
  var interactionState = {
    hovered,
    focused,
    pressed
  };
  var blurHandler = React14.useCallback((e3) => {
    if (e3.nativeEvent.target === hostRef.current) {
      setFocused(false);
      if (onBlur != null) {
        onBlur(e3);
      }
    }
  }, [hostRef, setFocused, onBlur]);
  var focusHandler = React14.useCallback((e3) => {
    if (e3.nativeEvent.target === hostRef.current) {
      setFocused(true);
      if (onFocus != null) {
        onFocus(e3);
      }
    }
  }, [hostRef, setFocused, onFocus]);
  var contextMenuHandler = React14.useCallback((e3) => {
    if (onContextMenuPress != null) {
      onContextMenuPress(e3);
    }
    if (onContextMenu != null) {
      onContextMenu(e3);
    }
  }, [onContextMenu, onContextMenuPress]);
  var keyDownHandler = React14.useCallback((e3) => {
    if (onKeyDownPress != null) {
      onKeyDownPress(e3);
    }
    if (onKeyDown2 != null) {
      onKeyDown2(e3);
    }
  }, [onKeyDown2, onKeyDownPress]);
  var _tabIndex;
  if (tabIndex !== void 0) {
    _tabIndex = tabIndex;
  } else {
    _tabIndex = disabled ? -1 : 0;
  }
  return /* @__PURE__ */ React14.createElement(View_default, (0, import_extends5.default)({}, rest, pressEventHandlers, {
    "aria-disabled": disabled,
    onBlur: blurHandler,
    onContextMenu: contextMenuHandler,
    onFocus: focusHandler,
    onKeyDown: keyDownHandler,
    ref: setRef,
    style: [disabled ? styles7.disabled : styles7.active, typeof style === "function" ? style(interactionState) : style],
    tabIndex: _tabIndex
  }), typeof children === "function" ? children(interactionState) : children);
}
function useForceableState(forced) {
  var _useState = useState(false), bool = _useState[0], setBool = _useState[1];
  return [bool || forced, setBool];
}
var styles7 = StyleSheet_default.create({
  active: {
    cursor: "pointer",
    touchAction: "manipulation"
  },
  disabled: {
    pointerEvents: "box-none"
  }
});
var MemoedPressable = /* @__PURE__ */ memo(/* @__PURE__ */ forwardRef6(Pressable));
MemoedPressable.displayName = "Pressable";
var Pressable_default = MemoedPressable;

// node_modules/react-native-web/dist/exports/TextInput/index.js
import * as React15 from "react";
var isSelectionStale = (node, selection) => {
  var selectionEnd = node.selectionEnd, selectionStart = node.selectionStart;
  var start = selection.start, end = selection.end;
  return start !== selectionStart || end !== selectionEnd;
};
var setSelection = (node, selection) => {
  if (isSelectionStale(node, selection)) {
    var start = selection.start, end = selection.end;
    try {
      node.setSelectionRange(start, end || start);
    } catch (e3) {
    }
  }
};
var forwardPropsList3 = Object.assign({}, defaultProps, accessibilityProps, clickProps, focusProps, keyboardProps, mouseProps, touchProps, styleProps, {
  autoCapitalize: true,
  autoComplete: true,
  autoCorrect: true,
  autoFocus: true,
  defaultValue: true,
  disabled: true,
  lang: true,
  maxLength: true,
  onChange: true,
  onScroll: true,
  placeholder: true,
  pointerEvents: true,
  readOnly: true,
  rows: true,
  spellCheck: true,
  value: true,
  type: true
});
var pickProps3 = (props) => pick(props, forwardPropsList3);
function isEventComposing(nativeEvent) {
  return nativeEvent.isComposing || nativeEvent.keyCode === 229;
}
var focusTimeout = null;
var TextInput = /* @__PURE__ */ React15.forwardRef((props, forwardedRef) => {
  var _props$autoCapitalize = props.autoCapitalize, autoCapitalize = _props$autoCapitalize === void 0 ? "sentences" : _props$autoCapitalize, autoComplete = props.autoComplete, autoCompleteType = props.autoCompleteType, _props$autoCorrect = props.autoCorrect, autoCorrect = _props$autoCorrect === void 0 ? true : _props$autoCorrect, blurOnSubmit = props.blurOnSubmit, caretHidden = props.caretHidden, clearTextOnFocus = props.clearTextOnFocus, dir = props.dir, editable = props.editable, enterKeyHint = props.enterKeyHint, inputMode = props.inputMode, keyboardType = props.keyboardType, _props$multiline = props.multiline, multiline = _props$multiline === void 0 ? false : _props$multiline, numberOfLines = props.numberOfLines, onBlur = props.onBlur, onChange = props.onChange, onChangeText = props.onChangeText, onContentSizeChange = props.onContentSizeChange, onFocus = props.onFocus, onKeyPress = props.onKeyPress, onLayout = props.onLayout, onMoveShouldSetResponder = props.onMoveShouldSetResponder, onMoveShouldSetResponderCapture = props.onMoveShouldSetResponderCapture, onResponderEnd = props.onResponderEnd, onResponderGrant = props.onResponderGrant, onResponderMove = props.onResponderMove, onResponderReject = props.onResponderReject, onResponderRelease = props.onResponderRelease, onResponderStart = props.onResponderStart, onResponderTerminate = props.onResponderTerminate, onResponderTerminationRequest = props.onResponderTerminationRequest, onScrollShouldSetResponder = props.onScrollShouldSetResponder, onScrollShouldSetResponderCapture = props.onScrollShouldSetResponderCapture, onSelectionChange = props.onSelectionChange, onSelectionChangeShouldSetResponder = props.onSelectionChangeShouldSetResponder, onSelectionChangeShouldSetResponderCapture = props.onSelectionChangeShouldSetResponderCapture, onStartShouldSetResponder = props.onStartShouldSetResponder, onStartShouldSetResponderCapture = props.onStartShouldSetResponderCapture, onSubmitEditing = props.onSubmitEditing, placeholderTextColor = props.placeholderTextColor, _props$readOnly = props.readOnly, readOnly = _props$readOnly === void 0 ? false : _props$readOnly, returnKeyType = props.returnKeyType, rows = props.rows, _props$secureTextEntr = props.secureTextEntry, secureTextEntry = _props$secureTextEntr === void 0 ? false : _props$secureTextEntr, selection = props.selection, selectTextOnFocus = props.selectTextOnFocus, showSoftInputOnFocus = props.showSoftInputOnFocus, spellCheck = props.spellCheck;
  var type2;
  var _inputMode;
  if (inputMode != null) {
    _inputMode = inputMode;
    if (inputMode === "email") {
      type2 = "email";
    } else if (inputMode === "tel") {
      type2 = "tel";
    } else if (inputMode === "search") {
      type2 = "search";
    } else if (inputMode === "url") {
      type2 = "url";
    } else {
      type2 = "text";
    }
  } else if (keyboardType != null) {
    switch (keyboardType) {
      case "email-address":
        type2 = "email";
        break;
      case "number-pad":
      case "numeric":
        _inputMode = "numeric";
        break;
      case "decimal-pad":
        _inputMode = "decimal";
        break;
      case "phone-pad":
        type2 = "tel";
        break;
      case "search":
      case "web-search":
        type2 = "search";
        break;
      case "url":
        type2 = "url";
        break;
      default:
        type2 = "text";
    }
  }
  if (secureTextEntry) {
    type2 = "password";
  }
  var dimensions2 = React15.useRef({
    height: null,
    width: null
  });
  var hostRef = React15.useRef(null);
  var prevSelection = React15.useRef(null);
  var prevSecureTextEntry = React15.useRef(false);
  React15.useEffect(() => {
    if (hostRef.current && prevSelection.current) {
      setSelection(hostRef.current, prevSelection.current);
    }
    prevSecureTextEntry.current = secureTextEntry;
  }, [secureTextEntry]);
  var handleContentSizeChange = React15.useCallback((hostNode) => {
    if (multiline && onContentSizeChange && hostNode != null) {
      var newHeight = hostNode.scrollHeight;
      var newWidth = hostNode.scrollWidth;
      if (newHeight !== dimensions2.current.height || newWidth !== dimensions2.current.width) {
        dimensions2.current.height = newHeight;
        dimensions2.current.width = newWidth;
        onContentSizeChange({
          nativeEvent: {
            contentSize: {
              height: dimensions2.current.height,
              width: dimensions2.current.width
            }
          }
        });
      }
    }
  }, [multiline, onContentSizeChange]);
  var imperativeRef = React15.useMemo(() => (hostNode) => {
    if (hostNode != null) {
      hostNode.clear = function() {
        if (hostNode != null) {
          hostNode.value = "";
        }
      };
      hostNode.isFocused = function() {
        return hostNode != null && TextInputState_default.currentlyFocusedField() === hostNode;
      };
      handleContentSizeChange(hostNode);
    }
  }, [handleContentSizeChange]);
  function handleBlur(e3) {
    TextInputState_default._currentlyFocusedNode = null;
    if (onBlur) {
      e3.nativeEvent.text = e3.target.value;
      onBlur(e3);
    }
  }
  function handleChange(e3) {
    var hostNode = e3.target;
    var text = hostNode.value;
    e3.nativeEvent.text = text;
    handleContentSizeChange(hostNode);
    if (onChange) {
      onChange(e3);
    }
    if (onChangeText) {
      onChangeText(text);
    }
  }
  function handleFocus(e3) {
    var hostNode = e3.target;
    if (onFocus) {
      e3.nativeEvent.text = hostNode.value;
      onFocus(e3);
    }
    if (hostNode != null) {
      TextInputState_default._currentlyFocusedNode = hostNode;
      if (clearTextOnFocus) {
        hostNode.value = "";
      }
      if (selectTextOnFocus) {
        if (focusTimeout != null) {
          clearTimeout(focusTimeout);
        }
        focusTimeout = setTimeout(() => {
          if (hostNode != null && document.activeElement === hostNode) {
            hostNode.select();
          }
        }, 0);
      }
    }
  }
  function handleKeyDown(e3) {
    var hostNode = e3.target;
    e3.stopPropagation();
    var blurOnSubmitDefault = !multiline;
    var shouldBlurOnSubmit = blurOnSubmit == null ? blurOnSubmitDefault : blurOnSubmit;
    var nativeEvent = e3.nativeEvent;
    var isComposing = isEventComposing(nativeEvent);
    if (onKeyPress) {
      onKeyPress(e3);
    }
    if (e3.key === "Enter" && !e3.shiftKey && // Do not call submit if composition is occuring.
    !isComposing && !e3.isDefaultPrevented()) {
      if ((blurOnSubmit || !multiline) && onSubmitEditing) {
        e3.preventDefault();
        nativeEvent.text = e3.target.value;
        onSubmitEditing(e3);
      }
      if (shouldBlurOnSubmit && hostNode != null) {
        setTimeout(() => hostNode.blur(), 0);
      }
    }
  }
  function handleSelectionChange(e3) {
    try {
      var _e$target = e3.target, selectionStart = _e$target.selectionStart, selectionEnd = _e$target.selectionEnd;
      var _selection = {
        start: selectionStart,
        end: selectionEnd
      };
      if (onSelectionChange) {
        e3.nativeEvent.selection = _selection;
        e3.nativeEvent.text = e3.target.value;
        onSelectionChange(e3);
      }
      if (prevSecureTextEntry.current === secureTextEntry) {
        prevSelection.current = _selection;
      }
    } catch (e4) {
    }
  }
  useLayoutEffect_default(() => {
    var node = hostRef.current;
    if (node != null && selection != null) {
      setSelection(node, selection);
    }
    if (document.activeElement === node) {
      TextInputState_default._currentlyFocusedNode = node;
    }
  }, [hostRef, selection]);
  var component = multiline ? "textarea" : "input";
  useElementLayout(hostRef, onLayout);
  useResponderEvents(hostRef, {
    onMoveShouldSetResponder,
    onMoveShouldSetResponderCapture,
    onResponderEnd,
    onResponderGrant,
    onResponderMove,
    onResponderReject,
    onResponderRelease,
    onResponderStart,
    onResponderTerminate,
    onResponderTerminationRequest,
    onScrollShouldSetResponder,
    onScrollShouldSetResponderCapture,
    onSelectionChangeShouldSetResponder,
    onSelectionChangeShouldSetResponderCapture,
    onStartShouldSetResponder,
    onStartShouldSetResponderCapture
  });
  var _useLocaleContext = useLocaleContext(), contextDirection = _useLocaleContext.direction;
  var supportedProps = pickProps3(props);
  supportedProps.autoCapitalize = autoCapitalize;
  supportedProps.autoComplete = autoComplete || autoCompleteType || "on";
  supportedProps.autoCorrect = autoCorrect ? "on" : "off";
  supportedProps.dir = dir !== void 0 ? dir : "auto";
  supportedProps.enterKeyHint = enterKeyHint || returnKeyType;
  supportedProps.inputMode = _inputMode;
  supportedProps.onBlur = handleBlur;
  supportedProps.onChange = handleChange;
  supportedProps.onFocus = handleFocus;
  supportedProps.onKeyDown = handleKeyDown;
  supportedProps.onSelect = handleSelectionChange;
  supportedProps.readOnly = readOnly === true || editable === false;
  supportedProps.rows = multiline ? rows != null ? rows : numberOfLines : 1;
  supportedProps.spellCheck = spellCheck != null ? spellCheck : autoCorrect;
  supportedProps.style = [{
    "--placeholderTextColor": placeholderTextColor
  }, styles8.textinput$raw, styles8.placeholder, props.style, caretHidden && styles8.caretHidden];
  supportedProps.type = multiline ? void 0 : type2;
  supportedProps.virtualkeyboardpolicy = showSoftInputOnFocus === false ? "manual" : "auto";
  var platformMethodsRef = usePlatformMethods(supportedProps);
  var setRef = useMergeRefs(hostRef, platformMethodsRef, imperativeRef, forwardedRef);
  supportedProps.ref = setRef;
  var langDirection = props.lang != null ? getLocaleDirection(props.lang) : null;
  var componentDirection = props.dir || langDirection;
  var writingDirection = componentDirection || contextDirection;
  var element = createElement_default(component, supportedProps, {
    writingDirection
  });
  return element;
});
TextInput.displayName = "TextInput";
TextInput.State = TextInputState_default;
var styles8 = StyleSheet_default.create({
  textinput$raw: {
    MozAppearance: "textfield",
    WebkitAppearance: "none",
    backgroundColor: "transparent",
    border: "0 solid black",
    borderRadius: 0,
    boxSizing: "border-box",
    font: "14px System",
    margin: 0,
    padding: 0,
    resize: "none"
  },
  placeholder: {
    placeholderTextColor: "var(--placeholderTextColor)"
  },
  caretHidden: {
    caretColor: "transparent"
  }
});
var TextInput_default = TextInput;

// tools/contact-sheet-entry.tsx
import { renderToStaticMarkup } from "react-dom/server";

// packages/formula-engine/src/money.ts
function MoneyError(message) {
  const err = new Error(message);
  err.name = "MoneyError";
  return err;
}
function assertPaise(value, what = "amount") {
  if (typeof value !== "number" || !Number.isInteger(value) || !Number.isSafeInteger(value)) {
    throw MoneyError(
      `${what} must be a safe integer number of paise, got ${String(value)} (${typeof value}). Money is integer paise everywhere - see ADR-003.`
    );
  }
  return value;
}
function add(...values) {
  let acc = 0;
  for (const v of values) acc += assertPaise(v);
  return assertPaise(acc, "sum");
}
function subtract(from, ...values) {
  let acc = assertPaise(from);
  for (const v of values) acc -= assertPaise(v);
  return assertPaise(acc, "difference");
}
function sum(values) {
  let acc = 0;
  for (const v of values) acc += assertPaise(v);
  return assertPaise(acc, "sum");
}
function formatPaise(amount, opts2 = {}) {
  assertPaise(amount);
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const rupees = Math.floor(abs / 100);
  const fraction = abs % 100;
  const digits = String(rupees);
  let grouped;
  if (digits.length <= 3) {
    grouped = digits;
  } else {
    const last3 = digits.slice(-3);
    let rest = digits.slice(0, -3);
    const parts = [];
    while (rest.length > 2) {
      parts.unshift(rest.slice(-2));
      rest = rest.slice(0, -2);
    }
    parts.unshift(rest);
    grouped = `${parts.join(",")},${last3}`;
  }
  const body = `${grouped}.${fraction < 10 ? "0" : ""}${fraction}`;
  const sign = negative ? "-" : opts2.withSign ? "+" : "";
  const symbol = opts2.withSymbol === false ? "" : "\u20B9";
  return `${sign}${symbol}${body}`;
}

// packages/formula-engine/src/primary.ts
var bySection = (entries, section) => entries.filter((e3) => e3.section === section);
var totalOf = (entries) => sum(entries.map((e3) => e3.amount));
var sectionModeTotal = (entries, section, mode) => totalOf(bySection(entries, section).filter((e3) => e3.mode === mode));
function figure(lines) {
  let total = 0;
  for (const l of lines) {
    total = l.sign === "+" ? add(total, l.amount) : subtract(total, l.amount);
  }
  const working = { lines, total };
  return { value: total, working };
}
function totalCashReceived(input) {
  const { entries } = input;
  return figure([
    { key: "working.cash_sales", sign: "+", amount: totalOf(bySection(entries, "cash_sales")) },
    {
      key: "working.udhar_collected_cash",
      sign: "+",
      amount: sectionModeTotal(entries, "udhar_collection", "cash")
    }
  ]);
}
function totalCashPaid(input) {
  const { entries } = input;
  return figure([
    {
      key: "working.cash_purchase",
      sign: "+",
      amount: sectionModeTotal(entries, "purchase", "cash")
    },
    {
      key: "working.cash_expenses",
      sign: "+",
      amount: sectionModeTotal(entries, "expense", "cash")
    },
    {
      key: "working.cash_party_payment",
      sign: "+",
      amount: sectionModeTotal(entries, "party_payment", "cash")
    },
    {
      key: "working.withdrawal_cash",
      sign: "+",
      amount: sectionModeTotal(entries, "withdrawal", "cash")
    }
  ]);
}
function expectedCashBalance(input) {
  const { entries, day } = input;
  const opening = day.openingCash ?? 0;
  return figure([
    { key: "working.opening_cash", sign: "+", amount: opening },
    { key: "working.cash_sales", sign: "+", amount: totalOf(bySection(entries, "cash_sales")) },
    {
      key: "working.udhar_collected_cash",
      sign: "+",
      amount: sectionModeTotal(entries, "udhar_collection", "cash")
    },
    {
      key: "working.cash_purchase",
      sign: "-",
      amount: sectionModeTotal(entries, "purchase", "cash")
    },
    {
      key: "working.cash_expenses",
      sign: "-",
      amount: sectionModeTotal(entries, "expense", "cash")
    },
    {
      key: "working.cash_party_payment",
      sign: "-",
      amount: sectionModeTotal(entries, "party_payment", "cash")
    },
    {
      key: "working.withdrawal_cash",
      sign: "-",
      amount: sectionModeTotal(entries, "withdrawal", "cash")
    }
  ]);
}
function netSales(input) {
  const { entries } = input;
  return figure([
    { key: "working.cash_sales", sign: "+", amount: totalOf(bySection(entries, "cash_sales")) },
    { key: "working.upi_sales", sign: "+", amount: totalOf(bySection(entries, "upi_sales")) },
    { key: "working.udhar_sales", sign: "+", amount: totalOf(bySection(entries, "udhar_sales")) }
  ]);
}
function netPurchase(input) {
  return figure([
    {
      key: "working.purchase_all_modes",
      sign: "+",
      amount: totalOf(bySection(input.entries, "purchase"))
    }
  ]);
}
function totalExpenses(input) {
  const { entries } = input;
  return figure([
    { key: "working.expense_cash", sign: "+", amount: sectionModeTotal(entries, "expense", "cash") },
    { key: "working.expense_upi", sign: "+", amount: sectionModeTotal(entries, "expense", "upi") },
    {
      key: "working.expense_other",
      sign: "+",
      amount: sectionModeTotal(entries, "expense", "other")
    },
    {
      key: "working.expense_udhar",
      sign: "+",
      amount: sectionModeTotal(entries, "expense", "udhar")
    },
    {
      key: "working.expense_shop_stock",
      sign: "+",
      amount: sectionModeTotal(entries, "expense", "shop_stock")
    }
  ]);
}
function creditOutstanding(input) {
  const { entries, priorCreditOutstanding } = input;
  return figure([
    { key: "working.prior_credit_outstanding", sign: "+", amount: priorCreditOutstanding },
    { key: "working.udhar_sales", sign: "+", amount: totalOf(bySection(entries, "udhar_sales")) },
    {
      key: "working.udhar_collection_all_modes",
      sign: "-",
      amount: totalOf(bySection(entries, "udhar_collection"))
    }
  ]);
}
function supplierOutstanding(input) {
  const { entries, priorSupplierOutstanding } = input;
  return figure([
    { key: "working.prior_supplier_outstanding", sign: "+", amount: priorSupplierOutstanding },
    {
      key: "working.purchase_udhar",
      sign: "+",
      amount: sectionModeTotal(entries, "purchase", "udhar")
    },
    {
      key: "working.party_payment_all_modes",
      sign: "-",
      amount: totalOf(bySection(entries, "party_payment"))
    }
  ]);
}
function estimatedProfit(input) {
  return figure([
    { key: "working.net_sales", sign: "+", amount: netSales(input).value },
    { key: "working.purchase_all_modes", sign: "-", amount: netPurchase(input).value },
    { key: "working.expenses_all_modes", sign: "-", amount: totalExpenses(input).value }
  ]);
}
function computePrimary(input) {
  return {
    p1TotalCashReceived: totalCashReceived(input),
    p2TotalCashPaid: totalCashPaid(input),
    p3ExpectedCashBalance: expectedCashBalance(input),
    p4NetSales: netSales(input),
    p5NetPurchase: netPurchase(input),
    p6TotalExpenses: totalExpenses(input),
    p7CreditOutstanding: creditOutstanding(input),
    p8SupplierOutstanding: supplierOutstanding(input),
    estimatedProfit: estimatedProfit(input)
  };
}

// packages/values/src/index.ts
var external = (v) => v;
var TOUCH_TARGET_MIN_DP = 56;
var BODY_TEXT_MIN_SP = 17;
var CHROME_FONT_SCALE_CAP = 1.5;
var CONTRAST_MIN_RATIO = external({
  value: 4.5,
  source: "WCAG 2.2 AA, SC 1.4.3 Contrast (Minimum) - normal text",
  established: "G3, restated iteration 23",
  ifStale: "WCAG revises slowly and 4.5:1 has been stable across 2.0, 2.1 and 2.2. If it moves it moves UP, so this is a floor that is safe to be wrong about in only one direction."
});
var DLT_VARIABLE_MAX_CHARS = external({
  value: 30,
  source: "TRAI DLT content-template rules, as applied by the Indian operators",
  established: "iteration 8, from the DLT research pass",
  ifStale: "Operators apply DLT rules with local variation and revise them. If a template is rejected at registration, THIS is the first number to re-check - and H10 puts a human in front of the submission regardless."
});
var DLT_MAX_VARIABLE_SHARE_PCT = external({
  value: 40,
  source: "TRAI DLT content-template rules",
  established: "iteration 8",
  ifStale: "As for the variable cap: a registration rejection points here first."
});
var GSM_SEGMENT_CHARS = external({
  value: 160,
  source: "GSM 03.38 - the 7-bit default alphabet packed into a 140-byte payload",
  established: "iteration 8, DC-001",
  ifStale: "A frozen encoding standard. This will not change."
});
var UCS2_SEGMENT_CHARS = external({
  value: 70,
  source: "GSM 03.38 - 140 bytes at 2 bytes per character",
  established: "iteration 8, DC-001",
  ifStale: "A frozen encoding standard. This will not change."
});
var GSM_BASIC_CONTENT_CHARS = external({
  value: 127,
  source: "GSM 03.38 basic alphabet: 128 positions less ESC at 0x1B",
  established: "iteration 13, adversary pass F-05",
  ifStale: "Frozen - but it was RECONSTRUCTED FROM MEMORY rather than read from the standard, which is why it carries an A9 flag. One wrong character silently halves or doubles the segment budget for an entire language."
});

// apps/mobile/src/theme/tokens.ts
var palette = {
  comfort: {
    bg: "#FFFFFF",
    surface: "#F7F5F2",
    ink: "#1A1A1A",
    inkMuted: "#5C5C5C",
    accent: "#E8A33D",
    onAccent: "#1A1A1A",
    positive: "#1B6E3C",
    negative: "#A3231B",
    border: "#D9D4CE"
  },
  focus: {
    bg: "#FFFFFF",
    surface: "#FFFFFF",
    ink: "#000000",
    inkMuted: "#3A3A3A",
    accent: "#B87214",
    onAccent: "#000000",
    positive: "#0E4F28",
    negative: "#7A140E",
    border: "#000000"
  }
};
var space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
var type = {
  comfort: {
    body: BODY_TEXT_MIN_SP,
    label: BODY_TEXT_MIN_SP,
    figure: BODY_TEXT_MIN_SP + 7,
    heading: BODY_TEXT_MIN_SP + 4,
    hero: BODY_TEXT_MIN_SP + 15
  },
  focus: {
    body: BODY_TEXT_MIN_SP + 3,
    label: BODY_TEXT_MIN_SP + 2,
    figure: BODY_TEXT_MIN_SP + 12,
    heading: BODY_TEXT_MIN_SP + 8,
    hero: BODY_TEXT_MIN_SP + 21
  }
};
var tokens = (mode = "comfort") => ({
  mode,
  color: palette[mode],
  space,
  type: type[mode],
  /** Every interactive element is at least this. The value is the registry's. */
  touchTarget: TOUCH_TARGET_MIN_DP,
  /**
   * LINE HEIGHT, SIZED FOR INDIC INK RATHER THAN LATIN.
   *
   * Measured on the shipped AnekOdia-Medium at 24px: the font declares an ascent
   * of 24 and a descent of 17, but Odia ink reaches 26 ABOVE the baseline -
   * above-base matras exceed the font's own declared ascent. Latin ink in the
   * same face reaches 16 and never comes close. So a line box derived from the
   * font metrics is correct for English and clips Odia, which is DC-005 again in
   * a different costume: the default is fine until the language changes, and the
   * language it breaks on is the one nobody here can proofread.
   *
   * 1.8 rather than a tighter figure because the measurement is of the strings
   * this product happens to use today. A conjunct nobody has typed yet can stack
   * higher, and the cost of the headroom is a few dp while the cost of being
   * wrong is a clipped vowel that changes what a word says.
   */
  leading: (sizeSp) => Math.round(sizeSp * 1.8),
  /** Chrome stops growing here, so navigation cannot eat the content. */
  maxFontScale: CHROME_FONT_SCALE_CAP,
  radius: { sm: 4, md: 8, lg: 12 },
  /**
   * The one rule weight in the product. A separator is a hairline or it is not a
   * separator, and giving it a scale invites a screen to draw a heavier line to
   * mean "more important" - which is a job for space and weight, not for a border.
   */
  hairline: 1,
  /**
   * The bundled family. The app ships Anek because a budget Android handset may
   * carry no Odia font at all (DC-004), and a missing glyph is not a degraded
   * experience - it is a row of empty boxes where the money was.
   */
  font: {
    regular: "AnekOdia-Regular",
    medium: "AnekOdia-Medium",
    bold: "AnekOdia-Bold"
  }
});

// apps/mobile/src/components/Money.tsx
import { jsx } from "react/jsx-runtime";
function Money({
  amount,
  mode = "comfort",
  size = "body",
  withSign = false,
  tone = "neutral",
  testID
}) {
  const t = tokens(mode);
  const negative = amount < 0;
  const color = tone === "directional" ? negative ? t.color.negative : t.color.positive : t.color.ink;
  return /* @__PURE__ */ jsx(
    Text_default,
    {
      testID,
      allowFontScaling: true,
      style: {
        fontFamily: t.font.medium,
        fontSize: t.type[size],
        lineHeight: t.leading(t.type[size]),
        color,
        // DC-005. Without this the column does not line up, in any language.
        fontVariant: ["tabular-nums"]
      },
      children: formatPaise(amount, { withSign })
    }
  );
}

// apps/mobile/src/components/Keypad.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
var ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["clear", "0", "back"]
];
function Keypad({ onKey, s, mode = "comfort", testID = "keypad" }) {
  const t = tokens(mode);
  return /* @__PURE__ */ jsx2(
    View_default,
    {
      testID,
      accessibilityRole: "keyboardkey",
      style: { backgroundColor: t.color.surface, padding: t.space.xs },
      children: ROWS.map((row) => /* @__PURE__ */ jsx2(View_default, { style: { flexDirection: "row" }, children: row.map((k) => {
        const label = k === "back" ? s("keypad.back") : k === "clear" ? s("keypad.clear") : k;
        return /* @__PURE__ */ jsx2(
          Pressable_default,
          {
            testID: `keypad-${k}`,
            accessibilityRole: "button",
            accessibilityLabel: label,
            onPress: () => onKey(k),
            style: {
              flex: 1,
              // The registry minimum, on both axes, for every key without exception.
              minHeight: t.touchTarget,
              minWidth: t.touchTarget,
              margin: t.space.xs,
              paddingVertical: t.space.xs,
              borderRadius: t.radius.md,
              backgroundColor: t.color.bg,
              borderWidth: t.hairline,
              borderColor: t.color.border,
              alignItems: "center",
              justifyContent: "center"
            },
            children: /* @__PURE__ */ jsx2(
              Text_default,
              {
                maxFontSizeMultiplier: t.maxFontScale,
                style: {
                  fontFamily: t.font.medium,
                  fontSize: t.type.body,
                  lineHeight: t.leading(t.type.body),
                  color: t.color.ink,
                  fontVariant: ["tabular-nums"],
                  // Wrapped Odia labels fill the key, so the Text owns the centring.
                  textAlign: "center"
                },
                children: label
              }
            )
          },
          k
        );
      }) }, row.join("")))
    }
  );
}

// apps/mobile/src/components/Shell.tsx
import { Fragment, jsx as jsx3, jsxs } from "react/jsx-runtime";
function Shell({
  id,
  s,
  display = "comfort",
  status = "ready",
  titleKey,
  headline,
  empty = false,
  emptyKey,
  onRetry = () => {
  },
  children,
  footer
}) {
  const t = tokens(display);
  if (status === "loading") {
    return /* @__PURE__ */ jsxs(
      View_default,
      {
        testID: id + "-loading",
        style: {
          flex: 1,
          backgroundColor: t.color.bg,
          alignItems: "center",
          justifyContent: "center"
        },
        children: [
          /* @__PURE__ */ jsx3(ActivityIndicator_default, { accessibilityLabel: s("common.loading"), color: t.color.accent }),
          /* @__PURE__ */ jsx3(
            Text_default,
            {
              maxFontSizeMultiplier: t.maxFontScale,
              style: {
                fontFamily: t.font.regular,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                color: t.color.inkMuted,
                marginTop: t.space.md
              },
              children: s("common.loading")
            }
          )
        ]
      }
    );
  }
  if (status === "error") {
    return /* @__PURE__ */ jsxs(
      View_default,
      {
        testID: id + "-error",
        style: { flex: 1, backgroundColor: t.color.bg, padding: t.space.md },
        children: [
          /* @__PURE__ */ jsx3(
            Text_default,
            {
              maxFontSizeMultiplier: t.maxFontScale,
              style: {
                fontFamily: t.font.regular,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                color: t.color.negative
              },
              children: s("common.error")
            }
          ),
          /* @__PURE__ */ jsx3(
            Pressable_default,
            {
              testID: id + "-retry",
              accessibilityRole: "button",
              accessibilityLabel: s("common.retry"),
              onPress: onRetry,
              style: {
                minHeight: t.touchTarget,
                minWidth: t.touchTarget,
                marginTop: t.space.md,
                paddingHorizontal: t.space.md,
                borderRadius: t.radius.md,
                backgroundColor: t.color.accent,
                alignItems: "center",
                justifyContent: "center"
              },
              children: /* @__PURE__ */ jsx3(
                Text_default,
                {
                  maxFontSizeMultiplier: t.maxFontScale,
                  style: {
                    fontFamily: t.font.medium,
                    fontSize: t.type.body,
                    lineHeight: t.leading(t.type.body),
                    color: t.color.onAccent
                  },
                  children: s("common.retry")
                }
              )
            }
          )
        ]
      }
    );
  }
  return /* @__PURE__ */ jsxs(View_default, { testID: id, style: { flex: 1, backgroundColor: t.color.bg }, children: [
    /* @__PURE__ */ jsxs(
      View_default,
      {
        style: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          // Money is uncapped by design, so the title and the figure wrap rather
          // than running off the side at a large system font scale.
          flexWrap: "wrap",
          // sm, not md. At the chrome cap in Focus mode a wrapped title plus a
          // wrapped headline label is already three lines tall, and the sixteen
          // pixels this saves is what keeps the keypad on screen on T8.
          padding: t.space.sm,
          borderBottomWidth: t.hairline,
          borderBottomColor: t.color.border
        },
        children: [
          /* @__PURE__ */ jsx3(
            Text_default,
            {
              testID: id + "-title",
              maxFontSizeMultiplier: t.maxFontScale,
              style: {
                fontFamily: t.font.bold,
                fontSize: t.type.heading,
                lineHeight: t.leading(t.type.heading),
                color: t.color.ink
              },
              children: s(titleKey)
            }
          ),
          headline ? /* @__PURE__ */ jsxs(View_default, { style: { alignItems: "flex-end" }, children: [
            /* @__PURE__ */ jsx3(
              Text_default,
              {
                maxFontSizeMultiplier: t.maxFontScale,
                style: {
                  fontFamily: t.font.regular,
                  fontSize: t.type.label,
                  lineHeight: t.leading(t.type.label),
                  color: t.color.inkMuted
                },
                children: s(headline.labelKey)
              }
            ),
            /* @__PURE__ */ jsx3(Money, { testID: id + "-headline", amount: headline.amount, mode: display, size: "figure" })
          ] }) : null
        ]
      }
    ),
    /* @__PURE__ */ jsx3(ScrollView_default, { testID: id + "-body", style: { flex: 1, minHeight: 0 }, children: empty ? /* @__PURE__ */ jsx3(View_default, { testID: id + "-empty", style: { padding: t.space.lg, alignItems: "center" }, children: /* @__PURE__ */ jsx3(
      Text_default,
      {
        maxFontSizeMultiplier: t.maxFontScale,
        style: {
          fontFamily: t.font.regular,
          fontSize: t.type.body,
          lineHeight: t.leading(t.type.body),
          color: t.color.inkMuted,
          textAlign: "center"
        },
        children: s(emptyKey ?? "common.empty")
      }
    ) }) : children }),
    footer
  ] });
}
function Row({
  testID,
  label,
  amount,
  display = "comfort",
  directional = false,
  onPress
}) {
  const t = tokens(display);
  const body = /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx3(
      Text_default,
      {
        maxFontSizeMultiplier: t.maxFontScale,
        style: {
          flex: 1,
          flexWrap: "wrap",
          marginRight: t.space.sm,
          fontFamily: t.font.regular,
          fontSize: t.type.body,
          lineHeight: t.leading(t.type.body),
          color: t.color.ink
        },
        children: label
      }
    ),
    /* @__PURE__ */ jsx3(
      Money,
      {
        amount,
        mode: display,
        size: "body",
        withSign: directional,
        tone: directional ? "directional" : "neutral"
      }
    )
  ] });
  const style = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    minHeight: t.touchTarget,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.sm,
    borderBottomWidth: t.hairline,
    borderBottomColor: t.color.border
  };
  return onPress ? /* @__PURE__ */ jsx3(
    Pressable_default,
    {
      testID,
      accessibilityRole: "button",
      accessibilityLabel: label,
      onPress,
      style: { ...style, minWidth: t.touchTarget },
      children: body
    }
  ) : /* @__PURE__ */ jsx3(View_default, { testID, style, children: body });
}
function PrimaryButton({
  testID,
  label,
  onPress,
  display = "comfort",
  disabled = false
}) {
  const t = tokens(display);
  return /* @__PURE__ */ jsx3(
    Pressable_default,
    {
      testID,
      accessibilityRole: "button",
      accessibilityLabel: label,
      accessibilityState: { disabled },
      disabled,
      onPress,
      style: {
        minHeight: t.touchTarget,
        minWidth: t.touchTarget,
        margin: t.space.sm,
        paddingHorizontal: t.space.md,
        borderRadius: t.radius.md,
        backgroundColor: disabled ? t.color.surface : t.color.accent,
        borderWidth: t.hairline,
        borderColor: t.color.border,
        alignItems: "center",
        justifyContent: "center"
      },
      children: /* @__PURE__ */ jsx3(
        Text_default,
        {
          maxFontSizeMultiplier: t.maxFontScale,
          style: {
            fontFamily: t.font.medium,
            fontSize: t.type.body,
            lineHeight: t.leading(t.type.body),
            // Ink on surface when disabled: onAccent is only checked against accent.
            color: disabled ? t.color.inkMuted : t.color.onAccent,
            textAlign: "center"
          },
          children: label
        }
      )
    }
  );
}

// apps/mobile/src/i18n/strings.ts
var STRINGS = {
  "formA.title": {
    en: "Sales",
    hi: "\u092C\u093F\u0915\u094D\u0930\u0940",
    or: "\u0B2C\u0B3F\u0B15\u0B4D\u0B30\u0B3F"
  },
  "formA.amount": {
    en: "Amount",
    hi: "\u0930\u0915\u092E",
    or: "\u0B2A\u0B30\u0B3F\u0B2E\u0B3E\u0B23"
  },
  "formA.mode.cash": {
    en: "Cash",
    hi: "\u0928\u0915\u0926",
    or: "\u0B28\u0B17\u0B26"
  },
  "formA.mode.upi": {
    en: "UPI",
    hi: "UPI",
    or: "UPI"
  },
  "formA.mode.udhar": {
    en: "Udhar",
    hi: "\u0909\u0927\u093E\u0930",
    or: "\u0B09\u0B27\u0B3E\u0B30"
  },
  "formA.customer": {
    en: "Customer",
    hi: "\u0917\u094D\u0930\u093E\u0939\u0915",
    or: "\u0B17\u0B4D\u0B30\u0B3E\u0B39\u0B15"
  },
  "formA.runningTotal": {
    en: "Total so far",
    hi: "\u0905\u092C \u0924\u0915 \u0915\u0941\u0932",
    or: "\u0B0F\u0B2A\u0B30\u0B4D\u0B2F\u0B4D\u0B5F\u0B28\u0B4D\u0B24 \u0B2E\u0B4B\u0B1F"
  },
  "formA.add": {
    en: "Add line",
    hi: "\u0932\u093E\u0907\u0928 \u091C\u094B\u0921\u093C\u0947\u0902",
    or: "\u0B27\u0B3E\u0B21\u0B3C\u0B3F \u0B2F\u0B4B\u0B21\u0B3C\u0B28\u0B4D\u0B24\u0B41"
  },
  "formA.empty": {
    en: "No sales entered yet today",
    hi: "\u0906\u091C \u0905\u092D\u0940 \u0924\u0915 \u0915\u094B\u0908 \u092C\u093F\u0915\u094D\u0930\u0940 \u0926\u0930\u094D\u091C \u0928\u0939\u0940\u0902",
    or: "\u0B06\u0B1C\u0B3F \u0B0F\u0B2A\u0B30\u0B4D\u0B2F\u0B4D\u0B5F\u0B28\u0B4D\u0B24 \u0B15\u0B4C\u0B23\u0B38\u0B3F \u0B2C\u0B3F\u0B15\u0B4D\u0B30\u0B3F \u0B32\u0B47\u0B16\u0B3E \u0B39\u0B4B\u0B07\u0B28\u0B3E\u0B39\u0B3F\u0B01"
  },
  "formA.loading": {
    en: "Opening the day",
    hi: "\u0926\u093F\u0928 \u0916\u094B\u0932\u093E \u091C\u093E \u0930\u0939\u093E \u0939\u0948",
    or: "\u0B26\u0B3F\u0B28 \u0B16\u0B4B\u0B32\u0B3E\u0B2F\u0B3E\u0B09\u0B1B\u0B3F"
  },
  "formA.error": {
    en: "Could not open the day. Nothing you entered is lost.",
    hi: "\u0926\u093F\u0928 \u0928\u0939\u0940\u0902 \u0916\u0941\u0932 \u0938\u0915\u093E\u0964 \u0906\u092A\u0915\u093E \u0926\u0930\u094D\u091C \u0915\u093F\u092F\u093E \u0915\u0941\u091B \u092D\u0940 \u0928\u0939\u0940\u0902 \u0917\u092F\u093E\u0964",
    or: "\u0B26\u0B3F\u0B28 \u0B16\u0B4B\u0B32\u0B3F\u0B2A\u0B3E\u0B30\u0B3F\u0B32\u0B3E \u0B28\u0B3E\u0B39\u0B3F\u0B01\u0964 \u0B06\u0B2A\u0B23 \u0B32\u0B47\u0B16\u0B3F\u0B25\u0B3F\u0B2C\u0B3E \u0B15\u0B3F\u0B1B\u0B3F \u0B39\u0B1C\u0B3F\u0B28\u0B3E\u0B39\u0B3F\u0B01\u0964"
  },
  "formA.retry": {
    en: "Try again",
    hi: "\u092B\u093F\u0930 \u0915\u094B\u0936\u093F\u0936 \u0915\u0930\u0947\u0902",
    or: "\u0B2A\u0B41\u0B23\u0B3F \u0B1A\u0B47\u0B37\u0B4D\u0B1F\u0B3E \u0B15\u0B30\u0B28\u0B4D\u0B24\u0B41"
  },
  "keypad.clear": {
    en: "Clear",
    hi: "\u092E\u093F\u091F\u093E\u090F\u0901",
    or: "\u0B16\u0B3E\u0B32\u0B3F \u0B15\u0B30\u0B28\u0B4D\u0B24\u0B41"
  },
  "keypad.back": {
    en: "Back",
    hi: "\u092A\u0940\u091B\u0947",
    or: "\u0B2A\u0B1B\u0B15\u0B41"
  },
  /* ---- shared by every screen frame -------------------------------- */
  "common.loading": { en: "Opening", hi: "\u0916\u0941\u0932 \u0930\u0939\u093E \u0939\u0948", or: "\u0B16\u0B4B\u0B32\u0B41\u0B1B\u0B3F" },
  "common.error": {
    en: "Could not open this. Nothing you entered is lost.",
    hi: "\u092F\u0939 \u0928\u0939\u0940\u0902 \u0916\u0941\u0932 \u0938\u0915\u093E\u0964 \u0906\u092A\u0915\u093E \u0926\u0930\u094D\u091C \u0915\u093F\u092F\u093E \u0915\u0941\u091B \u092D\u0940 \u0928\u0939\u0940\u0902 \u0917\u092F\u093E\u0964",
    or: "\u0B0F\u0B39\u0B3E \u0B16\u0B4B\u0B32\u0B3F\u0B2A\u0B3E\u0B30\u0B3F\u0B32\u0B3E \u0B28\u0B3E\u0B39\u0B3F\u0B01\u0964 \u0B06\u0B2A\u0B23 \u0B32\u0B47\u0B16\u0B3F\u0B25\u0B3F\u0B2C\u0B3E \u0B15\u0B3F\u0B1B\u0B3F \u0B39\u0B1C\u0B3F\u0B28\u0B3E\u0B39\u0B3F\u0B01\u0964"
  },
  "common.retry": { en: "Try again", hi: "\u092B\u093F\u0930 \u0915\u094B\u0936\u093F\u0936 \u0915\u0930\u0947\u0902", or: "\u0B2A\u0B41\u0B23\u0B3F \u0B1A\u0B47\u0B37\u0B4D\u0B1F\u0B3E \u0B15\u0B30\u0B28\u0B4D\u0B24\u0B41" },
  "common.empty": { en: "Nothing here yet", hi: "\u0905\u092D\u0940 \u092F\u0939\u093E\u0901 \u0915\u0941\u091B \u0928\u0939\u0940\u0902", or: "\u0B0F\u0B20\u0B3E\u0B30\u0B47 \u0B0F\u0B2A\u0B30\u0B4D\u0B2F\u0B4D\u0B5F\u0B28\u0B4D\u0B24 \u0B15\u0B3F\u0B1B\u0B3F \u0B28\u0B3E\u0B39\u0B3F\u0B01" },
  "common.save": { en: "Save", hi: "\u0938\u0939\u0947\u091C\u0947\u0902", or: "\u0B38\u0B1E\u0B4D\u0B1A\u0B5F \u0B15\u0B30\u0B28\u0B4D\u0B24\u0B41" },
  /* ---- the nine sections of the paper sheet -------------------------- */
  "section.cash_sales": { en: "Cash sales", hi: "\u0928\u0915\u0926 \u092C\u093F\u0915\u094D\u0930\u0940", or: "\u0B28\u0B17\u0B26 \u0B2C\u0B3F\u0B15\u0B4D\u0B30\u0B3F" },
  "section.upi_sales": { en: "UPI sales", hi: "UPI \u092C\u093F\u0915\u094D\u0930\u0940", or: "UPI \u0B2C\u0B3F\u0B15\u0B4D\u0B30\u0B3F" },
  "section.udhar_sales": { en: "Credit sales", hi: "\u0909\u0927\u093E\u0930 \u092C\u093F\u0915\u094D\u0930\u0940", or: "\u0B09\u0B27\u0B3E\u0B30 \u0B2C\u0B3F\u0B15\u0B4D\u0B30\u0B3F" },
  "section.purchase": { en: "Purchases", hi: "\u0916\u0930\u0940\u0926", or: "\u0B15\u0B3F\u0B23\u0B3E" },
  "section.expense": { en: "Expenses", hi: "\u0916\u0930\u094D\u091A", or: "\u0B16\u0B30\u0B4D\u0B1A\u0B4D\u0B1A" },
  "section.udhar_collection": { en: "Udhar collected", hi: "\u0909\u0927\u093E\u0930 \u0935\u0938\u0942\u0932\u0940", or: "\u0B09\u0B27\u0B3E\u0B30 \u0B06\u0B26\u0B3E\u0B5F" },
  "section.party_payment": { en: "Paid to suppliers", hi: "\u0906\u092A\u0942\u0930\u094D\u0924\u093F\u0915\u0930\u094D\u0924\u093E \u0915\u094B \u092D\u0941\u0917\u0924\u093E\u0928", or: "\u0B2F\u0B4B\u0B17\u0B3E\u0B23\u0B15\u0B3E\u0B30\u0B40\u0B19\u0B4D\u0B15\u0B41 \u0B26\u0B3F\u0B06\u0B17\u0B32\u0B3E" },
  "section.withdrawal": { en: "Taken by owner", hi: "\u092E\u093E\u0932\u093F\u0915 \u0928\u0947 \u0932\u093F\u092F\u093E", or: "\u0B2E\u0B3E\u0B32\u0B3F\u0B15 \u0B28\u0B47\u0B07\u0B1B\u0B28\u0B4D\u0B24\u0B3F" },
  /* ---- T1 · Today, the front door ------------------------------------ */
  "t1.title": { en: "Today", hi: "\u0906\u091C", or: "\u0B06\u0B1C\u0B3F" },
  "t1.cashInHand": { en: "Cash should be", hi: "\u0928\u0915\u0926 \u0939\u094B\u0928\u093E \u091A\u093E\u0939\u093F\u090F", or: "\u0B28\u0B17\u0B26 \u0B30\u0B39\u0B3F\u0B2C\u0B3E \u0B09\u0B1A\u0B3F\u0B24" },
  "t1.empty": {
    en: "Nothing entered yet today. Start with a sale.",
    hi: "\u0906\u091C \u0905\u092D\u0940 \u0915\u0941\u091B \u0926\u0930\u094D\u091C \u0928\u0939\u0940\u0902\u0964 \u092C\u093F\u0915\u094D\u0930\u0940 \u0938\u0947 \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902\u0964",
    or: "\u0B06\u0B1C\u0B3F \u0B0F\u0B2A\u0B30\u0B4D\u0B2F\u0B4D\u0B5F\u0B28\u0B4D\u0B24 \u0B15\u0B3F\u0B1B\u0B3F \u0B32\u0B47\u0B16\u0B3E \u0B39\u0B4B\u0B07\u0B28\u0B3E\u0B39\u0B3F\u0B01\u0964 \u0B2C\u0B3F\u0B15\u0B4D\u0B30\u0B3F\u0B30\u0B41 \u0B06\u0B30\u0B2E\u0B4D\u0B2D \u0B15\u0B30\u0B28\u0B4D\u0B24\u0B41\u0964"
  },
  "t1.closeDay": { en: "Close the day", hi: "\u0926\u093F\u0928 \u092C\u0902\u0926 \u0915\u0930\u0947\u0902", or: "\u0B26\u0B3F\u0B28 \u0B2C\u0B28\u0B4D\u0B26 \u0B15\u0B30\u0B28\u0B4D\u0B24\u0B41" },
  "t1.profit": { en: "Estimated profit", hi: "\u0905\u0928\u0941\u092E\u093E\u0928\u093F\u0924 \u0932\u093E\u092D", or: "\u0B06\u0B28\u0B41\u0B2E\u0B3E\u0B28\u0B3F\u0B15 \u0B32\u0B3E\u0B2D" },
  /* ---- T5 · the nine-section day close list -------------------------- */
  "t5.title": { en: "Day close", hi: "\u0926\u093F\u0928 \u092C\u0902\u0926", or: "\u0B26\u0B3F\u0B28 \u0B2C\u0B28\u0B4D\u0B26" },
  "t5.total": { en: "Day total", hi: "\u0926\u093F\u0928 \u0915\u093E \u0915\u0941\u0932", or: "\u0B26\u0B3F\u0B28\u0B30 \u0B2E\u0B4B\u0B1F" },
  /* ---- T6 · opening cash --------------------------------------------- */
  "t6.title": { en: "Opening cash", hi: "\u0936\u0941\u0930\u0941\u0906\u0924\u0940 \u0928\u0915\u0926", or: "\u0B06\u0B30\u0B2E\u0B4D\u0B2D \u0B28\u0B17\u0B26" },
  "t6.prompt": {
    en: "How much cash is in the box before you start?",
    hi: "\u0936\u0941\u0930\u0942 \u0915\u0930\u0928\u0947 \u0938\u0947 \u092A\u0939\u0932\u0947 \u092C\u0949\u0915\u094D\u0938 \u092E\u0947\u0902 \u0915\u093F\u0924\u0928\u093E \u0928\u0915\u0926 \u0939\u0948?",
    or: "\u0B06\u0B30\u0B2E\u0B4D\u0B2D \u0B15\u0B30\u0B3F\u0B2C\u0B3E \u0B2A\u0B42\u0B30\u0B4D\u0B2C\u0B30\u0B41 \u0B2C\u0B3E\u0B15\u0B4D\u0B38\u0B30\u0B47 \u0B15\u0B47\u0B24\u0B47 \u0B28\u0B17\u0B26 \u0B05\u0B1B\u0B3F?"
  },
  /* ---- T8 · Form B, a party and an amount ---------------------------- */
  /* Short, because it is a TITLE at up to 1.5x on a 360dp screen. The long form
     wrapped to four lines in Focus mode and pushed the keypad off the bottom. */
  "t8.title": { en: "Udhar book", hi: "\u0909\u0927\u093E\u0930 \u0916\u093E\u0924\u093E", or: "\u0B09\u0B27\u0B3E\u0B30 \u0B16\u0B3E\u0B24\u0B3E" },
  /* Button labels are SHORT. A three-across row is about 100dp wide, and an Odia
     word longer than that cannot break - it overflows the button rather than
     wrapping inside it, which check:layout caught on this exact row. The full
     phrasing lives on the line the entry produces, where there is room for it. */
  "t8.collect": { en: "Collected", hi: "\u0935\u0938\u0942\u0932\u0940", or: "\u0B06\u0B26\u0B3E\u0B5F" },
  "t8.pay": { en: "Paid out", hi: "\u092D\u0941\u0917\u0924\u093E\u0928", or: "\u0B26\u0B47\u0B32\u0B3F" },
  "t8.credit": { en: "On credit", hi: "\u0909\u0927\u093E\u0930", or: "\u0B09\u0B27\u0B3E\u0B30" },
  /* The headline on T8 is P7 - what customers OWE - not what was sold on credit
     today. It was labelled 'Credit sales', which named a different figure
     entirely. Caught while trimming the header to fit; wrong for longer. */
  "t8.outstanding": { en: "Owed to you", hi: "\u0906\u092A\u0915\u094B \u092E\u093F\u0932\u0928\u093E \u0939\u0948", or: "\u0B06\u0B2A\u0B23\u0B19\u0B4D\u0B15\u0B41 \u0B2E\u0B3F\u0B33\u0B3F\u0B2C\u0B3E\u0B30" },
  /* ---- T9 · Form C, a label and a mode ------------------------------- */
  "t9.title": { en: "Expense", hi: "\u0916\u0930\u094D\u091A", or: "\u0B16\u0B30\u0B4D\u0B1A\u0B4D\u0B1A" },
  "t9.label": { en: "What for?", hi: "\u0915\u093F\u0938\u0932\u093F\u090F?", or: "\u0B15\u0B3E\u0B39\u0B3F\u0B01\u0B15\u0B3F?" },
  "t9.mode.other": { en: "Other", hi: "\u0905\u0928\u094D\u092F", or: "\u0B05\u0B28\u0B4D\u0B5F" },
  "t9.mode.shop_stock": { en: "Shop stock", hi: "\u0926\u0941\u0915\u093E\u0928 \u092E\u093E\u0932", or: "\u0B26\u0B4B\u0B15\u0B3E\u0B28 \u0B2E\u0B3E\u0B32" },
  /* ---- T10 · Form D, the owner taking money -------------------------- */
  "t10.title": { en: "Money you took", hi: "\u0906\u092A\u0928\u0947 \u091C\u094B \u0932\u093F\u092F\u093E", or: "\u0B06\u0B2A\u0B23 \u0B28\u0B47\u0B07\u0B25\u0B3F\u0B2C\u0B3E \u0B1F\u0B19\u0B4D\u0B15\u0B3E" },
  "t10.note": {
    en: "This leaves the cash box but is not a shop cost, so it does not change profit.",
    hi: "\u092F\u0939 \u0928\u0915\u0926 \u0938\u0947 \u091C\u093E\u0924\u093E \u0939\u0948 \u092A\u0930 \u0926\u0941\u0915\u093E\u0928 \u0915\u093E \u0916\u0930\u094D\u091A \u0928\u0939\u0940\u0902, \u0907\u0938\u0932\u093F\u090F \u0932\u093E\u092D \u0928\u0939\u0940\u0902 \u092C\u0926\u0932\u0924\u093E\u0964",
    or: "\u0B0F\u0B39\u0B3E \u0B28\u0B17\u0B26\u0B30\u0B41 \u0B2F\u0B3E\u0B0F \u0B15\u0B3F\u0B28\u0B4D\u0B24\u0B41 \u0B26\u0B4B\u0B15\u0B3E\u0B28\u0B30 \u0B16\u0B30\u0B4D\u0B1A\u0B4D\u0B1A \u0B28\u0B41\u0B39\u0B47\u0B01, \u0B24\u0B47\u0B23\u0B41 \u0B32\u0B3E\u0B2D \u0B2C\u0B26\u0B33\u0B47 \u0B28\u0B3E\u0B39\u0B3F\u0B01\u0964"
  },
  /* ---- T11 · cash check, counting ------------------------------------ */
  "t11.title": { en: "Count the cash", hi: "\u0928\u0915\u0926 \u0917\u093F\u0928\u0947\u0902", or: "\u0B28\u0B17\u0B26 \u0B17\u0B23\u0B28\u0B4D\u0B24\u0B41" },
  "t11.expected": { en: "Should be", hi: "\u0939\u094B\u0928\u093E \u091A\u093E\u0939\u093F\u090F", or: "\u0B30\u0B39\u0B3F\u0B2C\u0B3E \u0B09\u0B1A\u0B3F\u0B24" },
  "t11.counted": { en: "You counted", hi: "\u0906\u092A\u0928\u0947 \u0917\u093F\u0928\u093E", or: "\u0B06\u0B2A\u0B23 \u0B17\u0B23\u0B3F\u0B32\u0B47" },
  /* ---- T12 · cash check, the difference ------------------------------ */
  "t12.title": { en: "The difference", hi: "\u0905\u0902\u0924\u0930", or: "\u0B2A\u0B3E\u0B30\u0B4D\u0B25\u0B15\u0B4D\u0B5F" },
  "t12.difference": { en: "Difference", hi: "\u0905\u0902\u0924\u0930", or: "\u0B2A\u0B3E\u0B30\u0B4D\u0B25\u0B15\u0B4D\u0B5F" },
  "t12.reasonPrompt": {
    en: "What do you think happened?",
    hi: "\u0906\u092A\u0915\u094B \u0915\u094D\u092F\u093E \u0932\u0917\u0924\u093E \u0939\u0948 \u0939\u0941\u0906?",
    or: "\u0B06\u0B2A\u0B23 \u0B2D\u0B3E\u0B2C\u0B41\u0B1B\u0B28\u0B4D\u0B24\u0B3F \u0B15\u0B23 \u0B39\u0B4B\u0B07\u0B1B\u0B3F?"
  },
  "t12.reason.change": { en: "Gave change from my pocket", hi: "\u0905\u092A\u0928\u0940 \u091C\u0947\u092C \u0938\u0947 \u091B\u0941\u091F\u094D\u091F\u093E \u0926\u093F\u092F\u093E", or: "\u0B28\u0B3F\u0B1C \u0B2A\u0B15\u0B47\u0B1F\u0B30\u0B41 \u0B16\u0B41\u0B1A\u0B41\u0B30\u0B3E \u0B26\u0B47\u0B32\u0B3F" },
  "t12.reason.missed": { en: "Forgot to write something", hi: "\u0915\u0941\u091B \u0932\u093F\u0916\u0928\u093E \u092D\u0942\u0932 \u0917\u092F\u093E", or: "\u0B15\u0B3F\u0B1B\u0B3F \u0B32\u0B47\u0B16\u0B3F\u0B2C\u0B3E\u0B15\u0B41 \u0B2D\u0B41\u0B32\u0B3F\u0B17\u0B32\u0B3F" },
  /* ---- T14 · the day, closed ----------------------------------------- */
  "t14.title": { en: "Day closed", hi: "\u0926\u093F\u0928 \u092C\u0902\u0926 \u0939\u0941\u0906", or: "\u0B26\u0B3F\u0B28 \u0B2C\u0B28\u0B4D\u0B26 \u0B39\u0B47\u0B32\u0B3E" },
  "t14.profit": { en: "Estimated profit", hi: "\u0905\u0928\u0941\u092E\u093E\u0928\u093F\u0924 \u0932\u093E\u092D", or: "\u0B06\u0B28\u0B41\u0B2E\u0B3E\u0B28\u0B3F\u0B15 \u0B32\u0B3E\u0B2D" },
  "t14.withdrawalNote": {
    en: "Money you took is shown separately and is not counted against profit.",
    hi: "\u0906\u092A\u0928\u0947 \u091C\u094B \u0932\u093F\u092F\u093E \u0935\u0939 \u0905\u0932\u0917 \u0926\u093F\u0916\u093E\u092F\u093E \u0939\u0948 \u0914\u0930 \u0932\u093E\u092D \u092E\u0947\u0902 \u0938\u0947 \u0928\u0939\u0940\u0902 \u0918\u091F\u093E\u092F\u093E\u0964",
    or: "\u0B06\u0B2A\u0B23 \u0B28\u0B47\u0B07\u0B25\u0B3F\u0B2C\u0B3E \u0B1F\u0B19\u0B4D\u0B15\u0B3E \u0B05\u0B32\u0B17\u0B3E \u0B26\u0B47\u0B16\u0B3E\u0B2F\u0B3E\u0B07\u0B1B\u0B3F \u0B0F\u0B2C\u0B02 \u0B32\u0B3E\u0B2D\u0B30\u0B41 \u0B39\u0B1F\u0B3E\u0B2F\u0B3E\u0B07\u0B28\u0B3E\u0B39\u0B3F\u0B01\u0964"
  },
  /* ---- the cash-check working, line by line -------------------------- */
  "working.opening_cash": { en: "Cash you started with", hi: "\u0936\u0941\u0930\u0942 \u0915\u093E \u0928\u0915\u0926", or: "\u0B06\u0B30\u0B2E\u0B4D\u0B2D\u0B30 \u0B28\u0B17\u0B26" },
  "working.cash_sales": { en: "Cash sales", hi: "\u0928\u0915\u0926 \u092C\u093F\u0915\u094D\u0930\u0940", or: "\u0B28\u0B17\u0B26 \u0B2C\u0B3F\u0B15\u0B4D\u0B30\u0B3F" },
  "working.udhar_collected_cash": { en: "Udhar collected in cash", hi: "\u0928\u0915\u0926 \u092E\u0947\u0902 \u0909\u0927\u093E\u0930 \u0935\u0938\u0942\u0932\u0940", or: "\u0B28\u0B17\u0B26\u0B30\u0B47 \u0B09\u0B27\u0B3E\u0B30 \u0B06\u0B26\u0B3E\u0B5F" },
  "working.cash_purchase": { en: "Purchases paid in cash", hi: "\u0928\u0915\u0926 \u092E\u0947\u0902 \u0916\u0930\u0940\u0926", or: "\u0B28\u0B17\u0B26\u0B30\u0B47 \u0B15\u0B3F\u0B23\u0B3E" },
  "working.cash_expenses": { en: "Expenses paid in cash", hi: "\u0928\u0915\u0926 \u092E\u0947\u0902 \u0916\u0930\u094D\u091A", or: "\u0B28\u0B17\u0B26\u0B30\u0B47 \u0B16\u0B30\u0B4D\u0B1A\u0B4D\u0B1A" },
  "working.cash_party_payment": { en: "Paid to suppliers in cash", hi: "\u0928\u0915\u0926 \u092E\u0947\u0902 \u0906\u092A\u0942\u0930\u094D\u0924\u093F\u0915\u0930\u094D\u0924\u093E \u0915\u094B", or: "\u0B28\u0B17\u0B26\u0B30\u0B47 \u0B2F\u0B4B\u0B17\u0B3E\u0B23\u0B15\u0B3E\u0B30\u0B40\u0B19\u0B4D\u0B15\u0B41" },
  "working.withdrawal_cash": { en: "Cash you took", hi: "\u0906\u092A\u0928\u0947 \u0932\u093F\u092F\u093E \u0928\u0915\u0926", or: "\u0B06\u0B2A\u0B23 \u0B28\u0B47\u0B07\u0B25\u0B3F\u0B2C\u0B3E \u0B28\u0B17\u0B26" },
  /* ---- the three states a section can be in (D8) ---------------------- */
  "state.entered": { en: "entered", hi: "\u0926\u0930\u094D\u091C", or: "\u0B32\u0B47\u0B16\u0B3E\u0B2F\u0B3E\u0B07\u0B1B\u0B3F" },
  "state.skipped": { en: "nothing today", hi: "\u0906\u091C \u0915\u0941\u091B \u0928\u0939\u0940\u0902", or: "\u0B06\u0B1C\u0B3F \u0B15\u0B3F\u0B1B\u0B3F \u0B28\u0B3E\u0B39\u0B3F\u0B01" },
  "state.untouched": { en: "not yet", hi: "\u0905\u092D\u0940 \u0928\u0939\u0940\u0902", or: "\u0B0F\u0B2A\u0B30\u0B4D\u0B2F\u0B4D\u0B5F\u0B28\u0B4D\u0B24 \u0B28\u0B41\u0B39\u0B47\u0B01" }
};
function phrase(key, language) {
  const p = STRINGS[key];
  if (language !== "longest") return p[language];
  const candidates = [p.en, p.hi, p.or];
  let best = candidates[0];
  for (const c of candidates) {
    if ([...c].length > [...best].length) best = c;
  }
  return best;
}
var strings = (language) => (key) => phrase(key, language);

// apps/mobile/src/components/EntryForm.tsx
import { Fragment as Fragment2, jsx as jsx4, jsxs as jsxs2 } from "react/jsx-runtime";
function EntryForm({
  id,
  store,
  titleKey,
  sections,
  runningTotal,
  runningTotalKey,
  commits,
  emptyKey,
  noteKey,
  status = "ready",
  language = "en",
  display = "comfort",
  draftPaise = null,
  onKey = () => {
  },
  onCommit = () => {
  },
  onRetry = () => {
  }
}) {
  const t = tokens(display);
  const s = strings(language);
  const parties = new Map(store.state.parties.map((p) => [p.id, p.name]));
  const lines = store.state.entries.filter((e3) => sections.includes(e3.section));
  return /* @__PURE__ */ jsxs2(
    Shell,
    {
      id,
      s,
      display,
      status,
      titleKey,
      headline: { labelKey: runningTotalKey, amount: runningTotal },
      empty: lines.length === 0,
      emptyKey,
      onRetry,
      footer: /* @__PURE__ */ jsxs2(Fragment2, { children: [
        /* @__PURE__ */ jsxs2(
          View_default,
          {
            testID: id + "-draft",
            style: {
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              // sm rather than md: the footer is the tightest vertical budget on
              // the screen, and at the chrome cap in Focus mode those eight
              // pixels were the difference between the keypad fitting and not.
              padding: t.space.sm,
              borderTopWidth: t.hairline,
              borderTopColor: t.color.border
            },
            children: [
              /* @__PURE__ */ jsx4(
                Text_default,
                {
                  maxFontSizeMultiplier: t.maxFontScale,
                  style: {
                    fontFamily: t.font.regular,
                    fontSize: t.type.label,
                    lineHeight: t.leading(t.type.label),
                    color: t.color.inkMuted
                  },
                  children: s("formA.amount")
                }
              ),
              /* @__PURE__ */ jsx4(
                Money,
                {
                  testID: id + "-draft-amount",
                  amount: draftPaise ?? 0,
                  mode: display,
                  size: "figure"
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsx4(View_default, { style: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: t.space.sm }, children: commits.map((option) => /* @__PURE__ */ jsx4(
          Pressable_default,
          {
            testID: id + "-commit-" + option.mode + "-" + option.section,
            accessibilityRole: "button",
            accessibilityLabel: s(option.labelKey),
            onPress: () => onCommit(option),
            style: {
              /*
               * TWO PER ROW, NOT ALL OF THEM. Three or five buttons across a
               * 360dp screen leaves about 100dp each, and an Odia or English
               * word wider than that cannot break - it overflows the button.
               * check:layout caught exactly that on T8 and T9.
               */
              flexBasis: "45%",
              flexGrow: 1,
              minHeight: t.touchTarget,
              minWidth: t.touchTarget,
              margin: t.space.xs,
              borderRadius: t.radius.md,
              backgroundColor: t.color.accent,
              alignItems: "center",
              justifyContent: "center"
            },
            children: /* @__PURE__ */ jsx4(
              Text_default,
              {
                maxFontSizeMultiplier: t.maxFontScale,
                style: {
                  fontFamily: t.font.medium,
                  fontSize: t.type.body,
                  lineHeight: t.leading(t.type.body),
                  color: t.color.onAccent,
                  textAlign: "center"
                },
                children: s(option.labelKey)
              }
            )
          },
          option.section + ":" + option.mode
        )) }),
        /* @__PURE__ */ jsx4(Keypad, { onKey, s, mode: display })
      ] }),
      children: [
        lines.map((e3) => /* @__PURE__ */ jsx4(
          Row,
          {
            testID: id + "-line-" + e3.id,
            label: s("section." + e3.section) + (e3.partyId ? " - " + (parties.get(e3.partyId) ?? e3.partyId) : "") + (e3.label ? " - " + e3.label : ""),
            amount: e3.amount,
            display
          },
          e3.id
        )),
        noteKey ? /* @__PURE__ */ jsx4(
          Text_default,
          {
            testID: id + "-note",
            maxFontSizeMultiplier: t.maxFontScale,
            style: {
              padding: t.space.md,
              fontFamily: t.font.regular,
              fontSize: t.type.body,
              lineHeight: t.leading(t.type.body),
              color: t.color.inkMuted
            },
            children: s(noteKey)
          }
        ) : null
      ]
    }
  );
}

// apps/mobile/src/screens/T7.tsx
import { jsx as jsx5 } from "react/jsx-runtime";
var COMMITS = [
  { labelKey: "formA.mode.cash", section: "cash_sales", mode: "cash" },
  { labelKey: "formA.mode.upi", section: "upi_sales", mode: "upi" },
  { labelKey: "formA.mode.udhar", section: "udhar_sales", mode: "udhar" }
];
function FormA({
  store,
  status = "ready",
  language = "en",
  display = "comfort",
  draftPaise = null,
  onKey = () => {
  },
  onCommit = () => {
  },
  onRetry = () => {
  }
}) {
  return /* @__PURE__ */ jsx5(
    EntryForm,
    {
      id: "t7",
      store,
      titleKey: "formA.title",
      sections: ["cash_sales", "upi_sales", "udhar_sales"],
      runningTotal: store.primary().p4NetSales.value,
      runningTotalKey: "formA.runningTotal",
      commits: COMMITS,
      emptyKey: "formA.empty",
      status,
      language,
      display,
      draftPaise,
      onKey,
      onCommit: (option) => onCommit(option.mode),
      onRetry
    }
  );
}

// apps/mobile/src/screens/T1.tsx
import { jsx as jsx6, jsxs as jsxs3 } from "react/jsx-runtime";
var SUMMARY_SECTIONS = [
  "cash_sales",
  "upi_sales",
  "udhar_sales",
  "purchase",
  "expense",
  "udhar_collection",
  "party_payment",
  "withdrawal"
];
function Today({
  store,
  status = "ready",
  language = "en",
  display = "comfort",
  onCloseDay = () => {
  },
  onOpenSection = () => {
  },
  onRetry = () => {
  }
}) {
  const t = tokens(display);
  const s = strings(language);
  const entries = store.state.entries;
  const primary = store.primary();
  const totals = SUMMARY_SECTIONS.map((section) => ({
    section,
    amount: store.sectionTotal(section),
    count: entries.filter((e3) => e3.section === section).length
  }));
  return /* @__PURE__ */ jsxs3(
    Shell,
    {
      id: "t1",
      s,
      display,
      status,
      titleKey: "t1.title",
      headline: { labelKey: "t1.cashInHand", amount: store.expectedCash().value },
      empty: entries.length === 0,
      emptyKey: "t1.empty",
      onRetry,
      footer: /* @__PURE__ */ jsx6(View_default, { style: { padding: t.space.sm }, children: /* @__PURE__ */ jsx6(
        Pressable_default,
        {
          testID: "t1-close-day",
          accessibilityRole: "button",
          accessibilityLabel: s("t1.closeDay"),
          onPress: onCloseDay,
          style: {
            minHeight: t.touchTarget,
            minWidth: t.touchTarget,
            borderRadius: t.radius.md,
            backgroundColor: t.color.accent,
            alignItems: "center",
            justifyContent: "center"
          },
          children: /* @__PURE__ */ jsx6(
            Text_default,
            {
              maxFontSizeMultiplier: t.maxFontScale,
              style: {
                fontFamily: t.font.medium,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                color: t.color.onAccent
              },
              children: s("t1.closeDay")
            }
          )
        }
      ) }),
      children: [
        totals.filter((row) => row.count > 0).map((row) => /* @__PURE__ */ jsx6(
          Row,
          {
            testID: "t1-section-" + row.section,
            label: s("section." + row.section),
            amount: row.amount,
            display,
            onPress: () => onOpenSection(row.section)
          },
          row.section
        )),
        /* @__PURE__ */ jsx6(
          Row,
          {
            testID: "t1-profit",
            label: s("t1.profit"),
            amount: primary.estimatedProfit.value,
            display,
            directional: true
          }
        )
      ]
    }
  );
}

// apps/mobile/src/screens/T5.tsx
import { jsx as jsx7, jsxs as jsxs4 } from "react/jsx-runtime";
var SECTIONS2 = [
  "cash_sales",
  "upi_sales",
  "udhar_sales",
  "purchase",
  "expense",
  "udhar_collection",
  "party_payment",
  "withdrawal"
];
function DayCloseList({
  store,
  status = "ready",
  language = "en",
  display = "comfort",
  onOpenSection = () => {
  },
  onSkipSection = () => {
  },
  onRetry = () => {
  }
}) {
  const t = tokens(display);
  const s = strings(language);
  return /* @__PURE__ */ jsx7(
    Shell,
    {
      id: "t5",
      s,
      display,
      status,
      titleKey: "t5.title",
      headline: { labelKey: "t5.total", amount: store.expectedCash().value },
      onRetry,
      children: SECTIONS2.map((section) => {
        const state = store.sectionState(section);
        return /* @__PURE__ */ jsxs4(View_default, { testID: "t5-row-" + section, children: [
          /* @__PURE__ */ jsx7(
            Row,
            {
              testID: "t5-figure-" + section,
              label: s("section." + section),
              amount: store.sectionTotal(section),
              display,
              onPress: () => onOpenSection(section)
            }
          ),
          /* @__PURE__ */ jsxs4(
            View_default,
            {
              style: {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                paddingHorizontal: t.space.md,
                paddingBottom: t.space.sm
              },
              children: [
                /* @__PURE__ */ jsx7(
                  Text_default,
                  {
                    testID: "t5-state-" + section,
                    maxFontSizeMultiplier: t.maxFontScale,
                    style: {
                      fontFamily: t.font.regular,
                      fontSize: t.type.label,
                      lineHeight: t.leading(t.type.label),
                      color: t.color.inkMuted
                    },
                    children: s("state." + state)
                  }
                ),
                state === "untouched" ? /* @__PURE__ */ jsx7(
                  Pressable_default,
                  {
                    testID: "t5-skip-" + section,
                    accessibilityRole: "button",
                    accessibilityLabel: s("state.skipped"),
                    onPress: () => onSkipSection(section),
                    style: {
                      minHeight: t.touchTarget,
                      minWidth: t.touchTarget,
                      paddingHorizontal: t.space.md,
                      borderRadius: t.radius.md,
                      borderWidth: t.hairline,
                      borderColor: t.color.border,
                      alignItems: "center",
                      justifyContent: "center"
                    },
                    children: /* @__PURE__ */ jsx7(
                      Text_default,
                      {
                        maxFontSizeMultiplier: t.maxFontScale,
                        style: {
                          fontFamily: t.font.medium,
                          fontSize: t.type.body,
                          lineHeight: t.leading(t.type.body),
                          color: t.color.ink
                        },
                        children: s("state.skipped")
                      }
                    )
                  }
                ) : null
              ]
            }
          )
        ] }, section);
      })
    }
  );
}

// apps/mobile/src/screens/T6.tsx
import { Fragment as Fragment3, jsx as jsx8, jsxs as jsxs5 } from "react/jsx-runtime";
function OpeningCash({
  status = "ready",
  language = "en",
  display = "comfort",
  draftPaise = null,
  onKey = () => {
  },
  onConfirm = () => {
  },
  onRetry = () => {
  }
}) {
  const t = tokens(display);
  const s = strings(language);
  return /* @__PURE__ */ jsx8(
    Shell,
    {
      id: "t6",
      s,
      display,
      status,
      titleKey: "t6.title",
      onRetry,
      footer: /* @__PURE__ */ jsxs5(Fragment3, { children: [
        /* @__PURE__ */ jsxs5(
          View_default,
          {
            testID: "t6-draft",
            style: {
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              padding: t.space.md,
              borderTopWidth: t.hairline,
              borderTopColor: t.color.border
            },
            children: [
              /* @__PURE__ */ jsx8(
                Text_default,
                {
                  maxFontSizeMultiplier: t.maxFontScale,
                  style: {
                    fontFamily: t.font.regular,
                    fontSize: t.type.label,
                    lineHeight: t.leading(t.type.label),
                    color: t.color.inkMuted
                  },
                  children: s("formA.amount")
                }
              ),
              /* @__PURE__ */ jsx8(
                Money,
                {
                  testID: "t6-draft-amount",
                  amount: draftPaise ?? 0,
                  mode: display,
                  size: "figure"
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsx8(
          PrimaryButton,
          {
            testID: "t6-confirm",
            label: s("common.save"),
            onPress: onConfirm,
            display,
            disabled: draftPaise === null
          }
        ),
        /* @__PURE__ */ jsx8(Keypad, { onKey, s, mode: display })
      ] }),
      children: /* @__PURE__ */ jsx8(
        Text_default,
        {
          testID: "t6-prompt",
          maxFontSizeMultiplier: t.maxFontScale,
          style: {
            padding: t.space.md,
            fontFamily: t.font.regular,
            fontSize: t.type.body,
            lineHeight: t.leading(t.type.body),
            color: t.color.ink
          },
          children: s("t6.prompt")
        }
      )
    }
  );
}

// apps/mobile/src/screens/T8.tsx
import { jsx as jsx9 } from "react/jsx-runtime";
var COMMITS2 = [
  { labelKey: "t8.collect", section: "udhar_collection", mode: "cash" },
  { labelKey: "t8.pay", section: "party_payment", mode: "cash" },
  { labelKey: "t8.credit", section: "udhar_sales", mode: "udhar" }
];
function FormB({
  store,
  status = "ready",
  language = "en",
  display = "comfort",
  draftPaise = null,
  onKey = () => {
  },
  onCommit = () => {
  },
  onRetry = () => {
  }
}) {
  return /* @__PURE__ */ jsx9(
    EntryForm,
    {
      id: "t8",
      store,
      titleKey: "t8.title",
      sections: ["udhar_collection", "party_payment", "udhar_sales"],
      runningTotal: store.primary().p7CreditOutstanding.value,
      runningTotalKey: "t8.outstanding",
      commits: COMMITS2,
      emptyKey: "common.empty",
      status,
      language,
      display,
      draftPaise,
      onKey,
      onCommit,
      onRetry
    }
  );
}

// apps/mobile/src/screens/T9.tsx
import { jsx as jsx10 } from "react/jsx-runtime";
var COMMITS3 = [
  { labelKey: "formA.mode.cash", section: "expense", mode: "cash" },
  { labelKey: "formA.mode.upi", section: "expense", mode: "upi" },
  { labelKey: "t9.mode.other", section: "expense", mode: "other" },
  { labelKey: "formA.mode.udhar", section: "expense", mode: "udhar" },
  { labelKey: "t9.mode.shop_stock", section: "expense", mode: "shop_stock" }
];
function FormC({
  store,
  status = "ready",
  language = "en",
  display = "comfort",
  draftPaise = null,
  onKey = () => {
  },
  onCommit = () => {
  },
  onRetry = () => {
  }
}) {
  return /* @__PURE__ */ jsx10(
    EntryForm,
    {
      id: "t9",
      store,
      titleKey: "t9.title",
      sections: ["expense"],
      runningTotal: store.primary().p6TotalExpenses.value,
      runningTotalKey: "section.expense",
      commits: COMMITS3,
      emptyKey: "common.empty",
      status,
      language,
      display,
      draftPaise,
      onKey,
      onCommit,
      onRetry
    }
  );
}

// apps/mobile/src/screens/T10.tsx
import { jsx as jsx11 } from "react/jsx-runtime";
var COMMITS4 = [
  { labelKey: "formA.mode.cash", section: "withdrawal", mode: "cash" },
  { labelKey: "formA.mode.upi", section: "withdrawal", mode: "upi" }
];
function FormD({
  store,
  status = "ready",
  language = "en",
  display = "comfort",
  draftPaise = null,
  onKey = () => {
  },
  onCommit = () => {
  },
  onRetry = () => {
  }
}) {
  return /* @__PURE__ */ jsx11(
    EntryForm,
    {
      id: "t10",
      store,
      titleKey: "t10.title",
      sections: ["withdrawal"],
      runningTotal: store.sectionTotal("withdrawal"),
      runningTotalKey: "section.withdrawal",
      commits: COMMITS4,
      emptyKey: "common.empty",
      noteKey: "t10.note",
      status,
      language,
      display,
      draftPaise,
      onKey,
      onCommit,
      onRetry
    }
  );
}

// apps/mobile/src/screens/T11.tsx
import { Fragment as Fragment4, jsx as jsx12, jsxs as jsxs6 } from "react/jsx-runtime";
function CashCheck({
  store,
  status = "ready",
  language = "en",
  display = "comfort",
  countedPaise = null,
  onKey = () => {
  },
  onConfirm = () => {
  },
  onRetry = () => {
  }
}) {
  const t = tokens(display);
  const s = strings(language);
  const cash = store.expectedCash();
  return /* @__PURE__ */ jsx12(
    Shell,
    {
      id: "t11",
      s,
      display,
      status,
      titleKey: "t11.title",
      headline: { labelKey: "t11.expected", amount: cash.value },
      onRetry,
      footer: /* @__PURE__ */ jsxs6(Fragment4, { children: [
        /* @__PURE__ */ jsxs6(
          View_default,
          {
            testID: "t11-counted",
            style: {
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              padding: t.space.md,
              borderTopWidth: t.hairline,
              borderTopColor: t.color.border
            },
            children: [
              /* @__PURE__ */ jsx12(
                Text_default,
                {
                  maxFontSizeMultiplier: t.maxFontScale,
                  style: {
                    fontFamily: t.font.regular,
                    fontSize: t.type.label,
                    lineHeight: t.leading(t.type.label),
                    color: t.color.inkMuted
                  },
                  children: s("t11.counted")
                }
              ),
              /* @__PURE__ */ jsx12(
                Money,
                {
                  testID: "t11-counted-amount",
                  amount: countedPaise ?? 0,
                  mode: display,
                  size: "figure"
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsx12(
          PrimaryButton,
          {
            testID: "t11-confirm",
            label: s("common.save"),
            onPress: onConfirm,
            display,
            disabled: countedPaise === null
          }
        ),
        /* @__PURE__ */ jsx12(Keypad, { onKey, s, mode: display })
      ] }),
      children: cash.working.lines.map((line) => /* @__PURE__ */ jsx12(
        Row,
        {
          testID: "t11-working-" + line.key,
          label: s(line.key),
          amount: line.sign === "-" ? subtract(0, line.amount) : line.amount,
          display,
          directional: true
        },
        line.key
      ))
    }
  );
}

// apps/mobile/src/screens/T12.tsx
import { jsx as jsx13, jsxs as jsxs7 } from "react/jsx-runtime";
var REASONS = ["t12.reason.change", "t12.reason.missed"];
function CashDifference({
  store,
  countedPaise,
  status = "ready",
  language = "en",
  display = "comfort",
  reason = null,
  onChooseReason = () => {
  },
  onReasonText = () => {
  },
  onClose = () => {
  },
  onRetry = () => {
  }
}) {
  const t = tokens(display);
  const s = strings(language);
  const expected = store.expectedCash().value;
  const difference = subtract(countedPaise, expected);
  const canClose = difference === 0 || Boolean(reason && reason.trim());
  return /* @__PURE__ */ jsxs7(
    Shell,
    {
      id: "t12",
      s,
      display,
      status,
      titleKey: "t12.title",
      headline: { labelKey: "t12.difference", amount: difference },
      onRetry,
      footer: /* @__PURE__ */ jsx13(View_default, { style: { padding: t.space.sm }, children: /* @__PURE__ */ jsx13(
        Pressable_default,
        {
          testID: "t12-close",
          accessibilityRole: "button",
          accessibilityLabel: s("t1.closeDay"),
          accessibilityState: { disabled: !canClose },
          disabled: !canClose,
          onPress: onClose,
          style: {
            minHeight: t.touchTarget,
            minWidth: t.touchTarget,
            borderRadius: t.radius.md,
            backgroundColor: canClose ? t.color.accent : t.color.surface,
            borderWidth: t.hairline,
            borderColor: t.color.border,
            alignItems: "center",
            justifyContent: "center"
          },
          children: /* @__PURE__ */ jsx13(
            Text_default,
            {
              maxFontSizeMultiplier: t.maxFontScale,
              style: {
                fontFamily: t.font.medium,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                // Ink on the surface when disabled: the accent pair is the only
                // one checked for contrast, so a disabled button uses ink on bg.
                color: canClose ? t.color.onAccent : t.color.inkMuted
              },
              children: s("t1.closeDay")
            }
          )
        }
      ) }),
      children: [
        /* @__PURE__ */ jsx13(
          Row,
          {
            testID: "t12-expected",
            label: s("t11.expected"),
            amount: expected,
            display
          }
        ),
        /* @__PURE__ */ jsx13(
          Row,
          {
            testID: "t12-counted",
            label: s("t11.counted"),
            amount: countedPaise,
            display
          }
        ),
        /* @__PURE__ */ jsx13(
          Text_default,
          {
            testID: "t12-prompt",
            maxFontSizeMultiplier: t.maxFontScale,
            style: {
              padding: t.space.md,
              fontFamily: t.font.medium,
              fontSize: t.type.body,
              lineHeight: t.leading(t.type.body),
              color: t.color.ink
            },
            children: s("t12.reasonPrompt")
          }
        ),
        REASONS.map((key) => /* @__PURE__ */ jsx13(
          Pressable_default,
          {
            testID: "t12-reason-" + key,
            accessibilityRole: "button",
            accessibilityLabel: s(key),
            accessibilityState: { selected: reason === s(key) },
            onPress: () => onChooseReason(key),
            style: {
              minHeight: t.touchTarget,
              minWidth: t.touchTarget,
              margin: t.space.xs,
              paddingHorizontal: t.space.md,
              borderRadius: t.radius.md,
              borderWidth: t.hairline,
              borderColor: reason === s(key) ? t.color.accent : t.color.border,
              backgroundColor: t.color.bg,
              justifyContent: "center"
            },
            children: /* @__PURE__ */ jsx13(
              Text_default,
              {
                maxFontSizeMultiplier: t.maxFontScale,
                style: {
                  fontFamily: t.font.regular,
                  fontSize: t.type.body,
                  lineHeight: t.leading(t.type.body),
                  color: t.color.ink
                },
                children: s(key)
              }
            )
          },
          key
        )),
        /* @__PURE__ */ jsx13(
          TextInput_default,
          {
            testID: "t12-reason-text",
            accessibilityLabel: s("t12.reasonPrompt"),
            value: reason ?? "",
            onChangeText: onReasonText,
            maxFontSizeMultiplier: t.maxFontScale,
            style: {
              minHeight: t.touchTarget,
              margin: t.space.md,
              paddingHorizontal: t.space.md,
              borderRadius: t.radius.md,
              borderWidth: t.hairline,
              borderColor: t.color.border,
              fontFamily: t.font.regular,
              fontSize: t.type.body,
              lineHeight: t.leading(t.type.body),
              color: t.color.ink,
              backgroundColor: t.color.bg
            }
          }
        )
      ]
    }
  );
}

// apps/mobile/src/screens/T14.tsx
import { jsx as jsx14, jsxs as jsxs8 } from "react/jsx-runtime";
function DayClosed({
  store,
  status = "ready",
  language = "en",
  display = "comfort",
  onRetry = () => {
  }
}) {
  const t = tokens(display);
  const s = strings(language);
  const primary = store.primary();
  return /* @__PURE__ */ jsxs8(
    Shell,
    {
      id: "t14",
      s,
      display,
      status,
      titleKey: "t14.title",
      headline: { labelKey: "t14.profit", amount: primary.estimatedProfit.value },
      onRetry,
      children: [
        /* @__PURE__ */ jsx14(
          Row,
          {
            testID: "t14-net-sales",
            label: s("section.cash_sales"),
            amount: primary.p4NetSales.value,
            display
          }
        ),
        /* @__PURE__ */ jsx14(
          Row,
          {
            testID: "t14-purchases",
            label: s("section.purchase"),
            amount: primary.p5NetPurchase.value,
            display
          }
        ),
        /* @__PURE__ */ jsx14(
          Row,
          {
            testID: "t14-expenses",
            label: s("section.expense"),
            amount: primary.p6TotalExpenses.value,
            display
          }
        ),
        /* @__PURE__ */ jsx14(
          Row,
          {
            testID: "t14-credit-outstanding",
            label: s("section.udhar_sales"),
            amount: primary.p7CreditOutstanding.value,
            display
          }
        ),
        /* @__PURE__ */ jsx14(
          Row,
          {
            testID: "t14-withdrawal",
            label: s("section.withdrawal"),
            amount: store.sectionTotal("withdrawal"),
            display
          }
        ),
        /* @__PURE__ */ jsx14(
          Text_default,
          {
            testID: "t14-withdrawal-note",
            maxFontSizeMultiplier: t.maxFontScale,
            style: {
              padding: t.space.md,
              fontFamily: t.font.regular,
              fontSize: t.type.body,
              lineHeight: t.leading(t.type.body),
              color: t.color.inkMuted
            },
            children: s("t14.withdrawalNote")
          }
        )
      ]
    }
  );
}

// apps/mobile/src/store/index.ts
function memoryPort(initial) {
  let state = initial;
  const outbox = [];
  return {
    appendAtomically(entry, row) {
      state = { ...state, entries: [...state.entries, entry] };
      outbox.push(row);
    },
    putDay(day) {
      state = { ...state, day };
    },
    load: () => state,
    pendingOutbox: () => outbox
  };
}
var AppendOnlyViolation = class extends Error {
  constructor(what) {
    super(
      `${what} - entries are append-only (D1). Correct a mistake by appending a correction that references the original, never by changing what was typed. What he entered is what the ledger says he entered, permanently.`
    );
    this.name = "AppendOnlyViolation";
  }
};
var DayClosedViolation = class extends Error {
  constructor(date) {
    super(
      `${date} is closed. A closed day is frozen: post the correction against today and reference that day, so its own figures never move.`
    );
    this.name = "DayClosedViolation";
  }
};
var Store = class {
  #state;
  #port;
  /** Bumped on every write, so a test can prove a screen re-derived rather than cached. */
  #revision = 0;
  constructor(port) {
    const loaded = port.load();
    if (!loaded) throw new Error("the persistence port returned no state");
    this.#port = port;
    this.#state = loaded;
  }
  get revision() {
    return this.#revision;
  }
  get state() {
    return this.#state;
  }
  get pendingOutbox() {
    return this.#port.pendingOutbox();
  }
  /** Exactly what the engine needs, assembled on demand. Never stored. */
  get input() {
    return {
      day: this.#state.day,
      entries: this.#state.entries,
      priorCreditOutstanding: this.#state.priorCreditOutstanding,
      priorSupplierOutstanding: this.#state.priorSupplierOutstanding
    };
  }
  /**
   * Every primary figure, computed NOW. Deliberately not memoised: a cache here is
   * the stored total this product refuses to have, one layer up.
   */
  primary() {
    return computePrimary(this.input);
  }
  /** P3 with its working - the cash check shows the derivation, not a verdict. */
  expectedCash() {
    return expectedCashBalance(this.input);
  }
  /**
   * What one section of the paper sheet comes to, right now.
   *
   * IT LIVES HERE RATHER THAN ON THE SCREEN, and it goes through `sum`. A screen
   * that adds its own rows up with `+` is a second implementation of a total the
   * day-close sheet also computes - two answers to one question, and the first
   * time they disagree the shopkeeper has no way to tell which is his. ADR-003
   * also means a bare `+` on money would not survive check:money.
   */
  sectionTotal(section) {
    return sum(this.#state.entries.filter((e3) => e3.section === section).map((e3) => e3.amount));
  }
  /**
   * SECTIONS HE HAS SAID ARE EMPTY, as opposed to sections he has not reached.
   *
   * D8: skipped and untouched produce the SAME total and a different day state.
   * That distinction is the one a screen can get wrong while every number on it
   * stays right - a day showing eight zeroes cannot tell you whether the shop
   * sold nothing or whether nobody has finished entering. Only the shopkeeper
   * knows, so only the shopkeeper can say, and saying it is a write.
   */
  skip(section) {
    if (this.#state.day.state === "closed") {
      throw new DayClosedViolation(this.#state.day.date);
    }
    if (this.#state.skippedSections.includes(section)) return;
    this.#state = {
      ...this.#state,
      skippedSections: [...this.#state.skippedSections, section]
    };
    this.#revision += 1;
  }
  isSkipped(section) {
    return this.#state.skippedSections.includes(section);
  }
  /**
   * The three states D8 asks for, derived rather than stored.
   *
   * `entered` wins over `skipped`: if there are entries in a section, it was not
   * empty, whatever was said earlier.
   */
  sectionState(section) {
    if (this.#state.entries.some((e3) => e3.section === section)) return "entered";
    return this.isSkipped(section) ? "skipped" : "untouched";
  }
  /**
   * The opening figure, typed once on the first morning or after a gap.
   *
   * REFUSED ON A CLOSED DAY, and refused if one is already set. The opening cash
   * is the first term of the cash check: changing it after entries exist moves
   * the expected figure under a shopkeeper who has already started counting
   * against it. If it is genuinely wrong, the correction is an entry, like every
   * other correction in this product.
   */
  setOpeningCash(amount) {
    if (this.#state.day.state === "closed") {
      throw new DayClosedViolation(this.#state.day.date);
    }
    if (this.#state.day.openingCash !== null && this.#state.day.openingCash !== void 0) {
      throw new AppendOnlyViolation(
        "the opening cash for " + this.#state.day.date + " is already set"
      );
    }
    const day = { ...this.#state.day, openingCash: assertPaise(amount, "openingCash") };
    this.#port.putDay(day);
    this.#state = { ...this.#state, day };
    this.#revision += 1;
  }
  /**
   * Append an entry and its outbox row, together.
   *
   * Refuses a duplicate id, and refuses any entry dated into a closed day.
   */
  append(entry) {
    if (this.#state.entries.some((e3) => e3.id === entry.id)) {
      throw new AppendOnlyViolation(`entry ${entry.id} already exists`);
    }
    if (this.#state.day.state === "closed" && entry.dayId === this.#state.day.date) {
      throw new DayClosedViolation(entry.dayId);
    }
    const row = {
      id: `ob-${entry.id}`,
      kind: "entry",
      payload: entry,
      queuedAt: entry.createdAt
    };
    this.#port.appendAtomically(entry, row);
    this.#state = { ...this.#state, entries: [...this.#state.entries, entry] };
    this.#revision += 1;
  }
  /**
   * Record the counted cash and close the day.
   *
   * A difference REQUIRES a reason. That is the product's position rather than a
   * validation detail: an unexplained gap let through is a gap nobody will ever
   * explain, and the figures stop meaning anything the first time one passes.
   *
   * The reason list itself is a product question rather than this file's: PRODUCT-REVIEW
   * recommendation 1 argues it needs an honest "I am not sure", because forcing a
   * false reason puts a wrong fact into a ledger that cannot be edited. That decision
   * is tracked there rather than taken here.
   */
  close(countedCash, differenceReason) {
    if (this.#state.day.state === "closed") {
      throw new DayClosedViolation(this.#state.day.date);
    }
    const expected = this.expectedCash().value;
    if (countedCash !== expected && !differenceReason) {
      throw new Error(
        "the count does not match the expected figure, and closing without a reason would record a difference nobody can account for later."
      );
    }
    const day = {
      ...this.#state.day,
      state: "closed",
      countedCash,
      ...differenceReason ? { differenceReason } : {}
    };
    this.#port.putDay(day);
    this.#state = { ...this.#state, day };
    this.#revision += 1;
  }
};

// packages/fixtures/src/canonical.ts
var rs = (rupees) => rupees * 100;
var CANONICAL_PARTIES = [
  { id: "p-ramesh", kind: "customer", name: "Ramesh", defaultDueDays: 30 },
  { id: "p-sunita", kind: "customer", name: "Sunita Devi", defaultDueDays: 15 },
  { id: "p-wholesale", kind: "supplier", name: "Gupta Wholesale", defaultDueDays: 21 },
  { id: "p-dairy", kind: "supplier", name: "Anand Dairy", defaultDueDays: 7 }
];
var CANONICAL_DATE = "2026-07-15";
var e = (id, section, amount, mode, extra = {}) => ({
  id,
  dayId: CANONICAL_DATE,
  section,
  amount,
  mode,
  source: "manual",
  createdAt: `${CANONICAL_DATE}T18:40:00.000Z`,
  ...extra
});
var CANONICAL_ENTRIES = [
  e("c-01", "cash_sales", rs(4820), "cash"),
  e("c-02", "cash_sales", rs(1310), "cash"),
  e("c-03", "upi_sales", rs(2640), "upi"),
  e("c-04", "udhar_sales", rs(900), "udhar", { partyId: "p-ramesh" }),
  e("c-05", "udhar_sales", rs(450), "udhar", { partyId: "p-sunita" }),
  e("c-06", "udhar_collection", rs(1200), "cash", { partyId: "p-ramesh" }),
  e("c-07", "purchase", rs(3400), "cash"),
  e("c-08", "purchase", rs(2100), "udhar", { partyId: "p-wholesale", dueDate: "2026-08-05" }),
  e("c-09", "party_payment", rs(1500), "cash", { partyId: "p-dairy" }),
  e("c-10", "expense", rs(120), "cash", { label: "Tea" }),
  e("c-11", "expense", rs(380), "cash", { label: "Auto to market" }),
  e("c-12", "withdrawal", rs(500), "cash")
];
var CANONICAL_DAY = {
  date: CANONICAL_DATE,
  state: "open",
  openingCash: rs(2e3),
  countedCash: null,
  skippedSections: []
};
var canonicalInput = () => ({
  day: CANONICAL_DAY,
  entries: CANONICAL_ENTRIES,
  priorCreditOutstanding: rs(3750),
  priorSupplierOutstanding: rs(6200)
});

// packages/fixtures/src/adversarial.ts
var rs2 = (rupees) => rupees * 100;
var ADVERSARIAL_PARTIES = [
  {
    id: "p-long",
    kind: "customer",
    name: "\u0B2C\u0B3F\u0B36\u0B4D\u0B71\u0B28\u0B3E\u0B25 \u0B2E\u0B39\u0B3E\u0B2A\u0B3E\u0B24\u0B4D\u0B30 \u0B0F\u0B2C\u0B02 \u0B2A\u0B41\u0B24\u0B4D\u0B30\u0B17\u0B23 \u0B39\u0B4B\u0B32\u0B38\u0B47\u0B32",
    defaultDueDays: 45
  },
  { id: "p-one", kind: "customer", name: "\u0B15", defaultDueDays: 0 },
  {
    id: "p-supplier-long",
    kind: "supplier",
    name: "Shree Venkateshwara Agencies & Co.",
    defaultDueDays: 60
  }
];
var ADVERSARIAL_DATE = "2026-03-02";
var ADVERSARIAL_CLOSED_DATE = "2026-02-28";
var e2 = (id, section, amount, mode, extra = {}) => ({
  id,
  dayId: ADVERSARIAL_DATE,
  section,
  amount,
  mode,
  source: "manual",
  createdAt: `${ADVERSARIAL_DATE}T21:55:00.000Z`,
  ...extra
});
var ADVERSARIAL_ENTRIES = [
  // Above one lakh: the only range where Indian grouping differs from Western.
  e2("a-01", "cash_sales", rs2(247500), "cash"),
  e2("a-02", "upi_sales", rs2(118060), "upi"),
  // One paisa.
  e2("a-03", "cash_sales", 1, "cash"),
  e2("a-04", "udhar_sales", rs2(96400), "udhar", { partyId: "p-long" }),
  e2("a-05", "udhar_collection", rs2(12), "cash", { partyId: "p-one" }),
  e2("a-06", "purchase", rs2(203900), "udhar", {
    partyId: "p-supplier-long",
    // Already overdue on the fixture's date, so the aging vocabulary must render.
    dueDate: "2026-02-10"
  }),
  e2("a-07", "expense", rs2(75), "cash", {
    label: "\u0B2C\u0B3F\u0B26\u0B4D\u0B5F\u0B41\u0B24\u0B4D \u0B2C\u0B3F\u0B32\u0B4D \u0B0F\u0B2C\u0B02 \u0B1C\u0B47\u0B28\u0B47\u0B30\u0B47\u0B1F\u0B30\u0B4D \u0B21\u0B3F\u0B1C\u0B47\u0B32\u0B4D \u0B16\u0B30\u0B4D\u0B1A\u0B4D\u0B1A"
  }),
  // The reversibility path F-04 found unexercised.
  e2("a-08", "expense", rs2(1250), "upi", { label: "Imported", source: "imported" }),
  e2("a-09", "withdrawal", rs2(5e4), "cash"),
  /*
   * D7 - a correction posted TODAY against a day that is already closed. Today's
   * figures move; the closed day does not. Both must be visible at once, and this is
   * the entry that makes a screen prove it.
   */
  e2("a-10", "cash_sales", rs2(1800), "cash", { correctsDayId: ADVERSARIAL_CLOSED_DATE })
];
var ADVERSARIAL_DAY = {
  date: ADVERSARIAL_DATE,
  state: "open",
  /*
   * NULL, and that is the point. The previous day was never closed, so there is no
   * counted figure to carry and the app refuses to invent one. Every screen showing
   * an opening balance has to render the ABSENCE rather than a zero.
   */
  openingCash: null,
  countedCash: null,
  // D8: deliberately marked as having nothing, which is not the same as untouched.
  skippedSections: ["party_payment"]
};
var adversarialInput = () => ({
  day: ADVERSARIAL_DAY,
  entries: ADVERSARIAL_ENTRIES,
  priorCreditOutstanding: rs2(864210),
  priorSupplierOutstanding: rs2(1207340)
});

// apps/mobile/src/screens/registry.tsx
import { jsx as jsx15 } from "react/jsx-runtime";
var storeOf = (input, parties, shopId) => {
  const state = {
    shopId,
    day: input.day,
    entries: input.entries,
    parties,
    priorCreditOutstanding: input.priorCreditOutstanding,
    priorSupplierOutstanding: input.priorSupplierOutstanding,
    skippedSections: []
  };
  return new Store(memoryPort(state));
};
var canonicalStore = () => storeOf(canonicalInput(), CANONICAL_PARTIES, "shop-canonical");
var adversarialStore = () => storeOf(adversarialInput(), ADVERSARIAL_PARTIES, "shop-adversarial");
var emptyStore = () => {
  const base = canonicalInput();
  return storeOf({ ...base, entries: [] }, CANONICAL_PARTIES, "shop-canonical");
};
var standardCases = (screen, title, render2, options = {}) => {
  const onSheet = options.sheet ?? true;
  return [
    {
      id: screen + "-canonical",
      screen,
      caption: title + " - canonical shop, English, Comfort",
      language: "en",
      display: "comfort",
      sheet: onSheet,
      element: () => render2(canonicalStore(), "en", "comfort")
    },
    {
      id: screen + "-adversarial",
      screen,
      caption: title + " - adversarial shop, Odia, Comfort",
      language: "or",
      display: "comfort",
      sheet: onSheet,
      element: () => render2(adversarialStore(), "or", "comfort")
    },
    {
      id: screen + "-adversarial-focus",
      screen,
      caption: title + " - adversarial shop, Odia, Focus mode",
      language: "or",
      display: "focus",
      sheet: false,
      element: () => render2(adversarialStore(), "or", "focus")
    },
    {
      id: screen + "-longest",
      screen,
      caption: title + " - longest strings at the largest type, the worst case",
      language: "longest",
      display: "focus",
      sheet: false,
      element: () => render2(adversarialStore(), "longest", "focus")
    }
  ];
};
var SCREEN_CASES = [
  ...standardCases("T5", "T5 Day close list", (store, language, display) => /* @__PURE__ */ jsx15(DayCloseList, { store, language, display })),
  ...standardCases("T6", "T6 Opening cash", (_store, language, display) => /* @__PURE__ */ jsx15(OpeningCash, { language, display, draftPaise: 25e4 })),
  ...standardCases("T8", "T8 Form B - party and amount", (store, language, display) => /* @__PURE__ */ jsx15(FormB, { store, language, display, draftPaise: 45e3 })),
  ...standardCases("T9", "T9 Form C - expense", (store, language, display) => /* @__PURE__ */ jsx15(FormC, { store, language, display, draftPaise: 12500 })),
  ...standardCases("T10", "T10 Form D - money you took", (store, language, display) => /* @__PURE__ */ jsx15(FormD, { store, language, display, draftPaise: 5e5 })),
  ...standardCases("T11", "T11 Cash check - counting", (store, language, display) => /* @__PURE__ */ jsx15(CashCheck, { store, language, display, countedPaise: 199237 })),
  ...standardCases("T12", "T12 Cash check - the difference", (store, language, display) => /* @__PURE__ */ jsx15(
    CashDifference,
    {
      store,
      language,
      display,
      countedPaise: 15e4
    }
  )),
  ...standardCases("T14", "T14 Day closed", (store, language, display) => /* @__PURE__ */ jsx15(DayClosed, { store, language, display })),
  {
    id: "T1-canonical",
    screen: "T1",
    caption: "T1 Today - canonical shop, English, Comfort. The front door.",
    language: "en",
    display: "comfort",
    sheet: true,
    element: () => /* @__PURE__ */ jsx15(Today, { store: canonicalStore(), language: "en", display: "comfort" })
  },
  {
    id: "T1-adversarial",
    screen: "T1",
    caption: "T1 Today - adversarial shop, Odia, Comfort",
    language: "or",
    display: "comfort",
    sheet: true,
    element: () => /* @__PURE__ */ jsx15(Today, { store: adversarialStore(), language: "or", display: "comfort" })
  },
  {
    id: "T1-adversarial-focus",
    screen: "T1",
    caption: "T1 Today - adversarial shop, Odia, Focus mode",
    language: "or",
    display: "focus",
    sheet: false,
    element: () => /* @__PURE__ */ jsx15(Today, { store: adversarialStore(), language: "or", display: "focus" })
  },
  {
    id: "T1-empty",
    screen: "T1",
    caption: "T1 Today - the first morning, before anything is entered",
    language: "or",
    display: "comfort",
    sheet: true,
    element: () => /* @__PURE__ */ jsx15(Today, { store: emptyStore(), language: "or", display: "comfort" })
  },
  {
    id: "T1-longest",
    screen: "T1",
    caption: "T1 Today - longest strings at the largest type",
    language: "longest",
    display: "focus",
    sheet: false,
    element: () => /* @__PURE__ */ jsx15(Today, { store: adversarialStore(), language: "longest", display: "focus" })
  },
  {
    id: "T1-error",
    screen: "T1",
    caption: "T1 Today - could not be opened",
    language: "hi",
    display: "comfort",
    sheet: false,
    element: () => /* @__PURE__ */ jsx15(Today, { store: canonicalStore(), status: "error", language: "hi", display: "comfort" })
  },
  {
    id: "T7-canonical",
    screen: "T7",
    caption: "T7 Form A - canonical shop, English, Comfort",
    language: "en",
    display: "comfort",
    sheet: true,
    element: () => /* @__PURE__ */ jsx15(FormA, { store: canonicalStore(), language: "en", display: "comfort", draftPaise: 4500 })
  },
  {
    id: "T7-adversarial",
    screen: "T7",
    caption: "T7 Form A - adversarial shop, Odia, Comfort. The panel the Odia question is answered by.",
    language: "or",
    display: "comfort",
    sheet: true,
    element: () => /* @__PURE__ */ jsx15(FormA, { store: adversarialStore(), language: "or", display: "comfort", draftPaise: 12345678 })
  },
  {
    id: "T7-adversarial-focus",
    screen: "T7",
    caption: "T7 Form A - adversarial shop, Odia, Focus mode",
    language: "or",
    display: "focus",
    sheet: true,
    element: () => /* @__PURE__ */ jsx15(FormA, { store: adversarialStore(), language: "or", display: "focus", draftPaise: 12345678 })
  },
  {
    id: "T7-longest",
    screen: "T7",
    caption: "T7 Form A - longest-string pseudo-locale, the layout upper bound",
    language: "longest",
    display: "comfort",
    sheet: true,
    element: () => /* @__PURE__ */ jsx15(FormA, { store: adversarialStore(), language: "longest", display: "comfort" })
  },
  {
    id: "T7-empty",
    screen: "T7",
    caption: "T7 Form A - a shop first morning, nothing entered yet",
    language: "or",
    display: "comfort",
    sheet: true,
    element: () => /* @__PURE__ */ jsx15(FormA, { store: emptyStore(), language: "or", display: "comfort" })
  },
  {
    id: "T7-error",
    screen: "T7",
    caption: "T7 Form A - the day could not be opened",
    language: "or",
    display: "comfort",
    sheet: true,
    element: () => /* @__PURE__ */ jsx15(FormA, { store: canonicalStore(), status: "error", language: "or", display: "comfort" })
  },
  {
    id: "T7-loading",
    screen: "T7",
    caption: "T7 Form A - opening the day",
    language: "or",
    display: "comfort",
    // Measured but not on the sheet: a spinner and a line of text is not worth a panel.
    sheet: false,
    element: () => /* @__PURE__ */ jsx15(FormA, { store: canonicalStore(), status: "loading", language: "or", display: "comfort" })
  },
  {
    id: "T7-hindi",
    screen: "T7",
    caption: "T7 Form A - Hindi, Focus mode",
    language: "hi",
    display: "focus",
    sheet: false,
    element: () => /* @__PURE__ */ jsx15(FormA, { store: canonicalStore(), language: "hi", display: "focus" })
  },
  {
    id: "T7-longest-focus",
    screen: "T7",
    caption: "T7 Form A - longest strings at the largest type, the worst case in the set",
    language: "longest",
    display: "focus",
    sheet: false,
    element: () => /* @__PURE__ */ jsx15(FormA, { store: adversarialStore(), language: "longest", display: "focus" })
  }
];
var COVERED_SCREENS = [...new Set(SCREEN_CASES.map((c) => c.screen))];

// tools/contact-sheet-entry.tsx
var renderOne = (panel) => {
  const element = panel.element();
  AppRegistry.registerComponent(panel.id, () => () => element);
  const app = AppRegistry.getApplication(panel.id, {});
  return {
    id: panel.id,
    caption: panel.caption,
    html: renderToStaticMarkup(app.element),
    css: renderToStaticMarkup(app.getStyleElement())
  };
};
function renderAll() {
  return SCREEN_CASES.filter((c) => c.sheet).map(renderOne);
}
function renderEvery() {
  return SCREEN_CASES.map(renderOne);
}
export {
  renderAll,
  renderEvery
};
