"use strict";

module.exports = "#version 300 es\n__HEADER__;\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\n\nconst float LOOP_MAX = __LOOP_MAX__;\n#define EPSILON 0.0000001;\n\n__CONSTANTS__;\n\nin highp vec2 vTexCoord;\n\nvec2 integerMod(vec2 x, float y) {\n  vec2 res = floor(mod(x, y));\n  return res * step(1.0 - floor(y), -res);\n}\n\nvec3 integerMod(vec3 x, float y) {\n  vec3 res = floor(mod(x, y));\n  return res * step(1.0 - floor(y), -res);\n}\n\nvec4 integerMod(vec4 x, vec4 y) {\n  vec4 res = floor(mod(x, y));\n  return res * step(1.0 - floor(y), -res);\n}\n\nhighp float integerMod(highp float x, highp float y) {\n  highp float res = floor(mod(x, y));\n  return res * (res > floor(y) - 1.0 ? 0.0 : 1.0);\n}\n\nhighp int integerMod(highp int x, highp int y) {\n  return int(integerMod(float(x), float(y)));\n}\n\n// Here be dragons!\n// DO NOT OPTIMIZE THIS CODE\n// YOU WILL BREAK SOMETHING ON SOMEBODY'S MACHINE\n// LEAVE IT AS IT IS, LEST YOU WASTE YOUR OWN TIME\nconst vec2 MAGIC_VEC = vec2(1.0, -256.0);\nconst vec4 SCALE_FACTOR = vec4(1.0, 256.0, 65536.0, 0.0);\nconst vec4 SCALE_FACTOR_INV = vec4(1.0, 0.00390625, 0.0000152587890625, 0.0); // 1, 1/256, 1/65536\nhighp float decode32(highp vec4 rgba) {\n  __DECODE32_ENDIANNESS__;\n  rgba *= 255.0;\n  vec2 gte128;\n  gte128.x = rgba.b >= 128.0 ? 1.0 : 0.0;\n  gte128.y = rgba.a >= 128.0 ? 1.0 : 0.0;\n  float exponent = 2.0 * rgba.a - 127.0 + dot(gte128, MAGIC_VEC);\n  float res = exp2(round(exponent));\n  rgba.b = rgba.b - 128.0 * gte128.x;\n  res = dot(rgba, SCALE_FACTOR) * exp2(round(exponent-23.0)) + res;\n  res *= gte128.y * -2.0 + 1.0;\n  return res;\n}\n\nhighp vec4 encode32(highp float f) {\n  highp float F = abs(f);\n  highp float sign = f < 0.0 ? 1.0 : 0.0;\n  highp float exponent = floor(log2(F));\n  highp float mantissa = (exp2(-exponent) * F);\n  // exponent += floor(log2(mantissa));\n  vec4 rgba = vec4(F * exp2(23.0-exponent)) * SCALE_FACTOR_INV;\n  rgba.rg = integerMod(rgba.rg, 256.0);\n  rgba.b = integerMod(rgba.b, 128.0);\n  rgba.a = exponent*0.5 + 63.5;\n  rgba.ba += vec2(integerMod(exponent+127.0, 2.0), sign) * 128.0;\n  rgba = floor(rgba);\n  rgba *= 0.003921569; // 1/255\n  __ENCODE32_ENDIANNESS__;\n  return rgba;\n}\n// Dragons end here\n\nhighp float index;\nhighp vec3 threadId;\n\nhighp vec3 indexTo3D(highp float idx, highp vec3 texDim) {\n  highp float z = floor(idx / (texDim.x * texDim.y));\n  idx -= z * texDim.x * texDim.y;\n  highp float y = floor(idx / texDim.x);\n  highp float x = integerMod(idx, texDim.x);\n  return vec3(x, y, z);\n}\n\nhighp float get(highp sampler2D tex, highp vec2 texSize, highp vec3 texDim, highp float z, highp float y, highp float x) {\n  highp vec3 xyz = vec3(x, y, z);\n  xyz = floor(xyz + 0.5);\n  __GET_WRAPAROUND__;\n  highp float index = round(xyz.x + texDim.x * (xyz.y + texDim.y * xyz.z));\n  __GET_TEXTURE_CHANNEL__;\n  highp float w = round(texSize.x);\n  vec2 st = vec2(integerMod(index, w), float(int(index) / int(w))) + 0.5;\n  __GET_TEXTURE_INDEX__;\n  highp vec4 texel = texture(tex, st / texSize);\n  __GET_RESULT__;\n}\n\nhighp vec4 getImage2D(highp sampler2D tex, highp vec2 texSize, highp vec3 texDim, highp float z, highp float y, highp float x) {\n  highp vec3 xyz = vec3(x, y, z);\n  xyz = floor(xyz + 0.5);\n  __GET_WRAPAROUND__;\n  highp float index = round(xyz.x + texDim.x * (xyz.y + texDim.y * xyz.z));\n  __GET_TEXTURE_CHANNEL__;\n  highp float w = round(texSize.x);\n  vec2 st = vec2(integerMod(index, w), float(int(index) / int(w))) + 0.5;\n  __GET_TEXTURE_INDEX__;\n  return texture(tex, st / texSize);\n}\n\nhighp vec4 getImage3D(highp sampler2DArray tex, highp vec2 texSize, highp vec3 texDim, highp float z, highp float y, highp float x) {\n  highp vec3 xyz = vec3(x, y, z);\n  xyz = floor(xyz + 0.5);\n  __GET_WRAPAROUND__;\n  highp float index = round(xyz.x + texDim.x * (xyz.y + texDim.y * xyz.z));\n  __GET_TEXTURE_CHANNEL__;\n  highp float w = round(texSize.x);\n  vec2 st = vec2(integerMod(index, w), float(int(index) / int(w))) + 0.5;\n  __GET_TEXTURE_INDEX__;\n  return texture(tex, vec3(st / texSize, z));\n}\n\nhighp float get(highp sampler2D tex, highp vec2 texSize, highp vec3 texDim, highp float y, highp float x) {\n  return get(tex, texSize, texDim, 0.0, y, x);\n}\n\nhighp vec4 getImage2D(highp sampler2D tex, highp vec2 texSize, highp vec3 texDim, highp float y, highp float x) {\n  return getImage2D(tex, texSize, texDim, 0.0, y, x);\n}\n\nhighp float get(highp sampler2D tex, highp vec2 texSize, highp vec3 texDim, highp float x) {\n  return get(tex, texSize, texDim, 0.0, 0.0, x);\n}\n\nhighp vec4 getImage2D(highp sampler2D tex, highp vec2 texSize, highp vec3 texDim, highp float x) {\n  return getImage2D(tex, texSize, texDim, 0.0, 0.0, x);\n}\n\nhighp vec4 actualColor;\nvoid color(float r, float g, float b, float a) {\n  actualColor = vec4(r,g,b,a);\n}\n\nvoid color(float r, float g, float b) {\n  color(r,g,b,1.0);\n}\n\n__MAIN_PARAMS__;\n__MAIN_CONSTANTS__;\n__KERNEL__;\n\nvoid main(void) {\n  index = floor(vTexCoord.s * float(uTexSize.x)) + floor(vTexCoord.t * float(uTexSize.y)) * uTexSize.x;\n  __MAIN_RESULT__;\n}";