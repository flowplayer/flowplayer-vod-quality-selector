/*!

   VOD quality selector plugin for Flowplayer HTML5

   Copyright (c) 2016-2017, Flowplayer Drive Oy

   Released under the MIT License:
   http://www.opensource.org/licenses/mit-license.php

   Requires Flowplayer HTML5 version 7.x or greater
   $GIT_DESC$

*/
(function() {
  var extension = function(api) {
    var support = flowplayer.support;
    if (!support.inlineVideo) {
        return;
    }
    var hlsjs = false;
    if (api.conf.hlsjs !== false) {
      flowplayer.engines.forEach(function (engine) {
        if (engine.engineName === 'hlsjs' && engine.canPlay('application/x-mpegurl', api.conf)) {
          hlsjs = true;
        }
      });
    }
    api.on('load', function(_ev, api, video) {
      if (api.live) return;
      var c = api.conf
        , vodQualities = video.vodQualities || c.vodQualities || {}
        , isDrive = (!!video.qualities || !!c.qualities) && (!!video.defaultQuality || !!c.defaultQuality);
      if (isDrive) {
        var originalQualities = video.originalQualities = video.originalQualities || video.qualities || c.qualities
          , defaultQuality = video.defaultQuality || c.defaultQuality
          , template = video.src.replace(/(-[0-9]+p)?\.(mp4|webm|m3u8|flv)$/, '-{q}.{ext}');
        if (typeof originalQualities === 'string') originalQualities = originalQualities.split(',');
        var qlities = ((typeof vodQualities.qualities === 'string' ? vodQualities.qualities.split(',') : vodQualities.qualities) || originalQualities || []).map(function(q) {
          if (q !== defaultQuality) return q;
          return {
            label: q,
            src: template.replace(/-{q}/, '')
          };
        });
        vodQualities = {
          template: template,
          qualities: qlities
        };
      }
      if (!vodQualities || !vodQualities.qualities || !vodQualities.qualities.length) return;
      video.hlsQualities = false;
      var vodQualitySources = {}
        , vodSource = video.sources.filter(function(s) { return !/mpegurl/i.test(s.type); })[0]
        , vodExt = vodSource && last(vodSource.src.split('.'))
        , hasHLSSource = video.sources.some(function(s) {
          if (!/mpegurl/i.test(s.type)) return false;
          vodQualitySources[-1] = {
            type: s.type,
            src: s.src
          };
          return true;
        })
        , flashSource;
        video.sources.forEach(function(s) {
          if (s.type.toLowerCase() === 'video/flash') flashSource = s.src;
        });
      if (!support.video && !flashSource ||
        flashSource && (!c.rtmp && !video.rtmp || /^(https?:)?\/\//.test(flashSource))) return;
      var qualities = hasHLSSource ? [{ value: -1, label: 'Auto' }] : []
        , fPrefix = flashSource && /^(mp4|flv):/.test(flashSource) && flashSource.slice(0, 4) || ''
        , fSuffix = flashSource && /\.(mp4|flv|f4v)$/i.test(flashSource) && flashSource.slice(flashSource.length - 3) || '';
      qualities = qualities.concat(vodQualities.qualities.map(function(q, i) {
        if (typeof q === 'string') {
          vodQualitySources[i] = {
            type: vodSource && vodSource.type,
            src: vodSource && vodSource.type && vodSource.type.toLowerCase() !== 'video/flash'
              ? vodQualities.template.replace('{q}', q).replace('{ext}', vodExt)
              : vodQualities.template.replace(/^(https?:)?\/\/[^/]+\//, fPrefix).replace('{q}', q).replace('{ext}', fSuffix)
          };
          return {
            value: i, label: q
          };
        }
        vodQualitySources[i] = {
          type: q.type || vodSource && vodSource.type,
          src: q.type || vodSource && vodSource.type && vodSource.type.toLowerCase() !== 'video/flash'
            ? q.src.replace('{ext}', vodExt)
            : q.src.replace(/^(https?:)?\/\/[^/]+\//, fPrefix).replace('{ext}', fSuffix)
        };
        return {
          value: i, label: q.label
        };
      }));
      video.qualities = qualities;
      if (/mpegurl/i.test(video.type)) video.quality = -1;
      else video.quality = Object.keys(vodQualitySources).filter(function(k) { return video.src.indexOf(vodQualitySources[k].src) > -1; })[0];
      video.vodQualitySources = vodQualitySources;
    });

    api.on('quality', function(_ev, api, q) {
      var selectedQuality = api.video.vodQualitySources && api.video.vodQualitySources[q];
      if (!selectedQuality) return;
      var originalSources = api.video.originalSources || api.video.sources
        , extend = flowplayer.extend
        , video = extend({}, api.video, {
          originalSources: originalSources,
          sources: [{ type: selectedQuality.type, src: selectedQuality.src }].concat(originalSources),
          src: null,
          type: null
        });
      var time = video.time;
      if (hlsjs && video.hlsjs !== false && time && q < 0) {
        video.hlsjs = extend(video.hlsjs || {}, {startPosition: time});
      }
      api.load(video, function(e, api) {
        api.finished = false;
        if (time && !(video.hlsjs && video.hlsjs.startPosition)) {
          api.seek(time, function () {
            api.resume();
          });
        } else if (video.hlsjs) {
          video.hlsjs.startPosition = 0;
        }
      });
    });
  };

  if (typeof module === 'object' && module.exports) module.exports = extension;
  else if (typeof window.flowplayer === 'function') window.flowplayer(extension);

  function last(parts) { return parts[parts.length - 1]; }
})();
