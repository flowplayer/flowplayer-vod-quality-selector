(function() {
  var extension = function(api) {
    api.on('load', function(_ev, _api, video) {
      var vodQualities = video.vodQualities || api.conf.vodQualities || {}
        , c = api.conf
        , isDrive = typeof vodQualities.drive !== 'undefined' ? vodQualities.drive : !!(c.vodQualities && c.vodQualities.drive);
      if (isDrive) {
        var originalQualities = video.originalQualities = video.originalQualities || video.qualities || c.qualities
          , defaultQuality = video.defaultQuality || c.defaultQuality
          , template = video.src.replace(/(-[0-9]+p)?\.(mp4|webm|m3u8)$/, '-{q}.{ext}');
        var qlities = (vodQualities.qualities || originalQualities || []).map(function(q) {
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
        , vodSource = video.sources.find(function(s) { return !/mpegurl/i.test(s.type); })
        , vodExt = vodSource && last(vodSource.src.split('.'))
        , hasHLSSource = video.sources.some(function(s) {
          if (!/mpegurl/i.test(s.type)) return false;
          vodQualitySources[-1] = {
            type: s.type,
            src: s.src
          };
          return true;
        });
      var qualities = hasHLSSource ? [{ value: -1, label: 'Auto' }] : [];
      qualities = qualities.concat(vodQualities.qualities.map(function(q, i) {
        if (typeof q === 'string') {
          vodQualitySources[i] = {
            type: vodSource && vodSource.type,
            src: vodQualities.template.replace('{q}', q).replace('{ext}', vodExt)
          };
          return {
            value: i, label: q
          };
        }
        vodQualitySources[i] = {
          type: q.type || vodSource && vodSource.type,
          src: q.src.replace('{ext}', vodExt)
        };
        return {
          value: i, label: q.label
        };
      }));
      video.qualities = qualities;
      if (/mpegurl/i.test(video.type)) video.quality = -1;
      else video.quality = Object.keys(vodQualitySources).find(function(k) { return video.src.indexOf(vodQualitySources[k].src) > -1; });
      video.vodQualitySources = vodQualitySources;
    });

    api.on('quality', function(_ev, _api, q) {
      var selectedQuality = api.video.vodQualitySources[q];
      if (!selectedQuality) return;
      var originalSources = api.video.originalSources || api.video.sources
        , video = extend({}, api.video, {
          originalSources: originalSources,
          sources: [{ type: selectedQuality.type, src: selectedQuality.src }].concat(originalSources),
          src: null,
          type: null
        });
      var time = video.time;
      api.load(video, function() {
        api.seek(time);
      });
    });
  };

  if (typeof module === 'object' && module.exports) module.exports = extension;
  else if (typeof window.flowplayer === 'function') window.flowplayer(extension);

  function last(parts) { return parts[parts.length - 1]; }

  function extend() {
    var toExtend = arguments[0];
    [].slice.call(arguments, 1).forEach(function(obj) {
      Object.keys(obj).forEach(function(k) {
        toExtend[k] = obj[k];
      });
    });
    return toExtend;
  }
})();
