import zlib from 'node:zlib';

const COMPRESSIBLE = /^(?:text\/|application\/(?:json|javascript|xml|rss|x-javascript|manifest\+json)|image\/svg\+xml)/;

export default function compress() {
  return function (req, res, next) {
    const accept = String(req.headers['accept-encoding'] || '');
    if (req.method === 'HEAD' || !/\bgzip\b/.test(accept)) return next();

    const originalEnd = res.end.bind(res);
    const originalWrite = res.write.bind(res);
    const originalWriteHead = res.writeHead.bind(res);
    const originalOn = res.on.bind(res);

    let stream = null;
    let decided = false;

    const isCompressible = (headers) => {
      const h = headers || {};
      const type = String(h['Content-Type'] || h['content-type'] || res.getHeader('Content-Type') || '');
      const status = res.statusCode;
      const range = h['Content-Range'] || h['content-range'] || res.getHeader('Content-Range');
      return status >= 200 && status !== 204 && status !== 205 && status !== 206 && status !== 304 &&
        !range && !res.getHeader('Content-Encoding') && COMPRESSIBLE.test(type);
    };

    const init = (headers) => {
      if (decided) return;
      decided = true;
      if (!isCompressible(headers)) return;
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      res.removeHeader('Content-Length');
      if (headers) {
        delete headers['Content-Length'];
        delete headers['content-length'];
      }
      stream = zlib.createGzip({ level: 6 });
      stream.on('data', (chunk) => {
        if (originalWrite(chunk) === false) {
          stream.pause();
          res.once('drain', () => stream.resume());
        }
      });
      stream.on('end', () => originalEnd());
      stream.on('error', () => {});
    };

    // Forward listeners registered for backpressure to the gzip stream so that a
    // Readable piped into the response resumes when gzip's writable side drains.
    res.on = function (type, listener) {
      if (stream && type === 'drain') stream.on('drain', listener);
      return originalOn(req.method ? type : type, listener);
    };

    res.writeHead = function (status, reason, headers) {
      if (typeof reason === 'object' && reason !== null) {
        headers = reason;
        reason = undefined;
      }
      init(headers);
      return originalWriteHead(status, reason, headers);
    };

    res.write = function (chunk, encoding, callback) {
      init();
      if (stream) return stream.write(chunk, encoding, callback);
      return originalWrite(chunk, encoding, callback);
    };

    res.end = function (chunk, encoding, callback) {
      init();
      if (stream) {
        if (typeof chunk === 'function') { callback = chunk; chunk = undefined; }
        stream.end(chunk, encoding, callback);
        return res;
      }
      return originalEnd(chunk, encoding, callback);
    };

    next();
  };
}
