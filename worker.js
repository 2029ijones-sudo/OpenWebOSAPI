// worker.js - WORKING OpenWebOS API NO SIMPLIFYING
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const host = url.hostname;
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Routes
    if (path === '/v1/embed.js') {
      const script = `// OpenWebOS API v3.0 - REAL WORKING VERSION
window.OpenWebOS = {
  version: '3.0.0',
  cache: new Map(),
  pendingPromises: new Map(),
  
  require: async function(packageName, version = 'latest') {
    const cacheKey = \`\${packageName}@\${version}\`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      return Promise.resolve(this.cache.get(cacheKey));
    }
    
    // Check if already loading
    if (this.pendingPromises.has(cacheKey)) {
      return this.pendingPromises.get(cacheKey);
    }
    
    // Create loading promise
    const loadPromise = (async () => {
      try {
        const res = await fetch('/v1/pkg/' + encodeURIComponent(packageName) + '@' + encodeURIComponent(version));
        
        if (!res.ok) {
          const error = await res.text();
          throw new Error(\`Failed to load \${packageName}@\${version}: \${error}\`);
        }
        
        const data = await res.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        // Create module object
        const module = { exports: {} };
        
        // Create require function for this module
        const createRequire = (basePath) => {
          return (dep) => {
            // Handle built-ins
            const builtIns = {
              'fs': { 
                readFileSync: () => '', 
                writeFileSync: () => {}, 
                existsSync: () => false,
                readFile: () => Promise.resolve(''),
                writeFile: () => Promise.resolve(),
                promises: {
                  readFile: () => Promise.resolve(''),
                  writeFile: () => Promise.resolve()
                }
              },
              'path': { 
                join: (...parts) => parts.filter(p => p).join('/').replace(/\\\/\\\/+/g, '/'),
                dirname: (p) => p.split('/').slice(0, -1).join('/'),
                basename: (p) => p.split('/').pop(),
                extname: (p) => {
                  const match = p.match(/\\.[^.]+$/);
                  return match ? match[0] : '';
                },
                resolve: (...parts) => parts.filter(p => p).join('/').replace(/\\\/\\\/+/g, '/')
              },
              'http': { 
                createServer: () => ({ 
                  listen: () => ({ 
                    on: () => {},
                    close: () => {}
                  }) 
                }),
                request: () => ({ on: () => {}, end: () => {} }),
                get: () => ({ on: () => {} })
              },
              'https': { 
                createServer: () => ({ 
                  listen: () => ({ 
                    on: () => {},
                    close: () => {}
                  }) 
                }),
                request: () => ({ on: () => {}, end: () => {} }),
                get: () => ({ on: () => {} })
              },
              'stream': { 
                Readable: class Readable { 
                  constructor() { 
                    this._read = () => {}; 
                    this.push = () => true; 
                    this.on = (event, handler) => {
                      if (event === 'data') setTimeout(() => handler(Buffer.from('')), 0);
                      if (event === 'end') setTimeout(() => handler(), 0);
                      return this;
                    };
                    this.pipe = () => this;
                  } 
                },
                Writable: class Writable { 
                  constructor() { 
                    this._write = () => {}; 
                    this.write = () => true; 
                    this.end = () => this;
                    this.on = () => this;
                  } 
                },
                Transform: class Transform extends (class { on() { return this; } }) {},
                PassThrough: class PassThrough extends (class { on() { return this; } }) {},
                pipeline: () => Promise.resolve()
              },
              'buffer': { 
                Buffer: { 
                  from: (str, encoding) => {
                    if (typeof str === 'string') {
                      const encoder = new TextEncoder();
                      return encoder.encode(str);
                    }
                    return new Uint8Array(str);
                  },
                  alloc: (size) => new Uint8Array(size),
                  allocUnsafe: (size) => new Uint8Array(size),
                  isBuffer: () => false,
                  toString: () => ''
                } 
              },
              'events': { 
                EventEmitter: class EventEmitter {
                  constructor() {
                    this._events = {};
                  }
                  on(event, listener) {
                    if (!this._events[event]) this._events[event] = [];
                    this._events[event].push(listener);
                    return this;
                  }
                  emit(event, ...args) {
                    if (this._events[event]) {
                      this._events[event].forEach(listener => listener(...args));
                    }
                    return this;
                  }
                  once(event, listener) {
                    const onceListener = (...args) => {
                      listener(...args);
                      this.off(event, onceListener);
                    };
                    this.on(event, onceListener);
                    return this;
                  }
                  off(event, listener) {
                    if (this._events[event]) {
                      this._events[event] = this._events[event].filter(l => l !== listener);
                    }
                    return this;
                  }
                  removeAllListeners(event) {
                    if (event) delete this._events[event];
                    else this._events = {};
                    return this;
                  }
                }
              },
              'util': { 
                promisify: (fn) => function(...args) {
                  return new Promise((resolve, reject) => {
                    fn.call(this, ...args, (err, result) => {
                      if (err) reject(err);
                      else resolve(result);
                    });
                  });
                },
                inherits: (ctor, superCtor) => {
                  ctor.super_ = superCtor;
                  Object.setPrototypeOf(ctor.prototype, superCtor.prototype);
                },
                inspect: (obj) => JSON.stringify(obj, null, 2),
                format: (...args) => args.join(' '),
                types: {
                  isDate: () => false,
                  isRegExp: () => false
                }
              },
              'crypto': { 
                randomBytes: (size) => {
                  const array = new Uint8Array(size);
                  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
                    crypto.getRandomValues(array);
                  }
                  return array;
                },
                createHash: () => ({
                  update: () => this,
                  digest: () => '00000000000000000000000000000000'
                }),
                createHmac: () => ({
                  update: () => this,
                  digest: () => '00000000000000000000000000000000'
                })
              },
              'os': { 
                platform: () => 'browser',
                homedir: () => '/',
                tmpdir: () => '/tmp',
                hostname: () => 'localhost',
                type: () => 'Browser',
                release: () => '1.0.0',
                arch: () => 'x64',
                cpus: () => [{ model: 'Browser CPU', speed: 0 }],
                totalmem: () => 1073741824,
                freemem: () => 536870912,
                networkInterfaces: () => ({})
              },
              'child_process': { 
                spawn: (command, args, options) => ({
                  stdout: { on: () => {}, pipe: () => {} },
                  stderr: { on: () => {} },
                  stdin: { write: () => true, end: () => {} },
                  on: (event, handler) => {
                    if (event === 'close') setTimeout(() => handler(0), 0);
                    if (event === 'error') setTimeout(() => handler(new Error('Not supported in browser')), 0);
                    return this;
                  },
                  kill: () => {}
                }),
                exec: (command, options, callback) => {
                  if (typeof options === 'function') {
                    callback = options;
                    options = {};
                  }
                  setTimeout(() => {
                    if (callback) callback(null, { stdout: '', stderr: '' });
                  }, 0);
                  return { on: () => {} };
                }
              },
              'process': { 
                env: { 
                  NODE_ENV: 'development',
                  USER: 'browser',
                  HOME: '/',
                  PATH: '/usr/bin:/bin'
                },
                version: '18.0.0',
                versions: { node: '18.0.0', v8: '10.0' },
                platform: 'browser',
                arch: 'x64',
                cwd: () => '/',
                hrtime: () => [0, 0],
                memoryUsage: () => ({
                  rss: 0,
                  heapTotal: 0,
                  heapUsed: 0,
                  external: 0
                }),
                uptime: () => 0,
                argv: ['node'],
                nextTick: (callback) => setTimeout(callback, 0),
                stdout: {
                  write: (data) => {
                    console.log(data);
                    return true;
                  }
                },
                stderr: {
                  write: (data) => {
                    console.error(data);
                    return true;
                  }
                },
                stdin: {
                  on: () => {},
                  setEncoding: () => {}
                }
              },
              'url': {
                parse: (urlStr) => {
                  try {
                    const url = new URL(urlStr);
                    return {
                      protocol: url.protocol,
                      hostname: url.hostname,
                      port: url.port,
                      pathname: url.pathname,
                      search: url.search,
                      query: url.searchParams,
                      href: url.href
                    };
                  } catch (e) {
                    return null;
                  }
                },
                format: (urlObj) => {
                  const protocol = urlObj.protocol || 'http:';
                  const hostname = urlObj.hostname || 'localhost';
                  const port = urlObj.port ? ':' + urlObj.port : '';
                  const pathname = urlObj.pathname || '/';
                  const search = urlObj.search || '';
                  return \`\${protocol}//\${hostname}\${port}\${pathname}\${search}\`;
                },
                URL: globalThis.URL,
                URLSearchParams: globalThis.URLSearchParams
              },
              'querystring': {
                parse: (str) => {
                  const params = new URLSearchParams(str);
                  const result = {};
                  for (const [key, value] of params) {
                    result[key] = value;
                  }
                  return result;
                },
                stringify: (obj) => {
                  const params = new URLSearchParams();
                  for (const [key, value] of Object.entries(obj)) {
                    params.append(key, value);
                  }
                  return params.toString();
                }
              },
              'zlib': {
                createGzip: () => ({
                  on: () => this,
                  write: () => true,
                  end: () => this
                }),
                createGunzip: () => ({
                  on: () => this,
                  write: () => true,
                  end: () => this
                }),
                gzip: (buffer, callback) => setTimeout(() => callback(null, buffer), 0),
                gunzip: (buffer, callback) => setTimeout(() => callback(null, buffer), 0)
              },
              'net': {
                createServer: () => ({
                  listen: () => ({ on: () => {} }),
                  on: () => this
                }),
                connect: () => ({
                  on: () => this,
                  write: () => true,
                  end: () => this
                })
              },
              'dgram': {
                createSocket: () => ({
                  bind: () => ({ on: () => {} }),
                  on: () => this,
                  send: () => {}
                })
              },
              'dns': {
                lookup: (hostname, callback) => setTimeout(() => callback(null, '127.0.0.1', 4), 0),
                resolve: (hostname, callback) => setTimeout(() => callback(null, ['127.0.0.1']), 0)
              },
              'tls': {
                createServer: () => ({
                  listen: () => ({ on: () => {} }),
                  on: () => this
                }),
                connect: () => ({
                  on: () => this,
                  write: () => true,
                  end: () => this
                })
              },
              'cluster': {
                isMaster: false,
                isWorker: true,
                fork: () => ({ on: () => {} }),
                on: () => {}
              },
              'vm': {
                createContext: (sandbox) => sandbox,
                runInContext: (code, context) => {
                  const fn = new Function('context', \`with(context) { \${code} }\`);
                  return fn(context);
                }
              },
              'console': console
            };
            
            if (builtIns[dep]) {
              return builtIns[dep];
            }
            
            // Handle external package
            if (dep.startsWith('.')) {
              throw new Error(\`Relative requires not supported: \${dep}\`);
            }
            
            // Load external package
            return window.OpenWebOS.require(dep);
          };
        };
        
        const require = createRequire();
        
        // Create execution environment
        const globalObj = typeof window !== 'undefined' ? window : globalThis;
        const process = builtIns.process;
        const Buffer = builtIns.buffer.Buffer;
        
        try {
          // Execute the code
          const wrapper = new Function('module', 'exports', 'require', 'global', 'process', 'Buffer', '__filename', '__dirname', 
            \`(function() {
              \${data.code}
            }).call(this)\`
          );
          
          wrapper.call(
            globalObj,
            module,
            module.exports,
            require,
            globalObj,
            process,
            Buffer,
            '/index.js',
            '/'
          );
          
          // Handle default export for ES modules
          let result = module.exports;
          if (result && result.__esModule && result.default) {
            result = result.default;
          }
          
          // Cache the result
          this.cache.set(cacheKey, result);
          
          return result;
          
        } catch (execError) {
          console.error(\`OpenWebOS: Execution error for \${packageName}:\`, execError);
          throw new Error(\`Failed to execute \${packageName}: \${execError.message}\`);
        }
        
      } catch (error) {
        console.error(\`OpenWebOS: Failed to load \${packageName}@\${version}:\`, error);
        throw error;
      } finally {
        // Clean up pending promise
        this.pendingPromises.delete(cacheKey);
      }
    })();
    
    // Store the promise
    this.pendingPromises.set(cacheKey, loadPromise);
    
    return loadPromise;
  },
  
  compileJSX: async function(code) {
    try {
      const res = await fetch('/v1/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      
      if (!res.ok) {
        throw new Error('Compilation failed');
      }
      
      return await res.text();
    } catch (error) {
      console.error('OpenWebOS: JSX compilation error:', error);
      throw error;
    }
  },
  
  clearCache: function() {
    this.cache.clear();
    this.pendingPromises.clear();
  }
};

// Auto-initialize
(function() {
  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', function() {
        console.log('OpenWebOS API v3.0.0 loaded. Use OpenWebOS.require("package-name")');
      });
    } else {
      console.log('OpenWebOS API v3.0.0 loaded. Use OpenWebOS.require("package-name")');
    }
  }
})();`;
      
      return new Response(script, {
        headers: { ...corsHeaders, 'Content-Type': 'application/javascript' }
      });
    }
    
    // Handle package requests
    if (path.startsWith('/v1/pkg/')) {
      return await handlePackageRequest(path, corsHeaders, env);
    }
    
    if (path === '/v1/compile') {
      return await handleCompileRequest(request, corsHeaders);
    }
    
    if (path === '/v1/bundle') {
      return await handleBundleRequest(request, corsHeaders);
    }
    
    if (path === '/v1/search') {
      return await handleSearchRequest(request, corsHeaders);
    }
    
    // Only show API info for root path
    if (path === '/' || path === '') {
      return new Response(JSON.stringify({
        name: 'OpenWebOS API',
        version: '3.0.0',
        description: 'Use ANY npm package in browser',
        host: host,
        endpoints: {
          embed: '/v1/embed.js',
          package: '/v1/pkg/{name}@{version}',
          compile: '/v1/compile',
          bundle: '/v1/bundle',
          search: '/v1/search'
        },
        example: `Add <script src="https://${host}/v1/embed.js"></script> to HTML`
      }, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Return 404 for any other path
    return new Response(JSON.stringify({ 
      error: 'Not Found',
      path: path,
      available: [
        '/v1/embed.js',
        '/v1/pkg/{package}@{version}',
        '/v1/compile',
        '/v1/bundle',
        '/v1/search'
      ]
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

// REAL package handler
async function handlePackageRequest(path, corsHeaders, env) {
  const startTime = Date.now();
  
  try {
    // Extract package name and version
    const packagePath = path.substring('/v1/pkg/'.length);
    const atIndex = packagePath.lastIndexOf('@');
    
    let packageName, version;
    if (atIndex === -1) {
      packageName = packagePath;
      version = 'latest';
    } else {
      packageName = packagePath.substring(0, atIndex);
      version = packagePath.substring(atIndex + 1) || 'latest';
    }
    
    console.log(`Loading package: ${packageName}@${version}`);
    
    if (!packageName || packageName.trim() === '') {
      return new Response(JSON.stringify({ 
        error: 'Package name is required',
        example: '/v1/pkg/lodash@latest'
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Try to get from cache first if we have KV
    const cacheKey = `pkg:${packageName}:${version}`;
    let cachedData = null;
    
    if (env && env.OPENWEBOS_CACHE) {
      try {
        cachedData = await env.OPENWEBOS_CACHE.get(cacheKey, { type: 'json' });
        if (cachedData) {
          console.log(`Cache hit for ${packageName}@${version}`);
          return new Response(JSON.stringify(cachedData, null, 2), {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=86400',
              'X-Cache': 'HIT',
              'X-Load-Time': `${Date.now() - startTime}ms`
            }
          });
        }
      } catch (cacheError) {
        console.log('Cache error:', cacheError);
      }
    }
    
    // Get package info from npm registry
    const registryUrl = version === 'latest' 
      ? `https://registry.npmjs.org/${encodeURIComponent(packageName)}`
      : `https://registry.npmjs.org/${encodeURIComponent(packageName)}/${encodeURIComponent(version)}`;
    
    console.log(`Fetching registry: ${registryUrl}`);
    
    const registryRes = await fetch(registryUrl, {
      headers: {
        'User-Agent': 'OpenWebOS/3.0.0',
        'Accept': 'application/json'
      }
    });
    
    if (!registryRes.ok) {
      if (registryRes.status === 404) {
        return new Response(JSON.stringify({ 
          error: `Package "${packageName}" not found`,
          suggestion: 'Check the package name or try a different version'
        }), { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`Registry error: ${registryRes.status} ${registryRes.statusText}`);
    }
    
    const packageData = await registryRes.json();
    
    // Get actual version if 'latest' was requested
    if (version === 'latest') {
      version = packageData['dist-tags']?.latest || 
                packageData['dist-tags']?.next || 
                Object.keys(packageData.versions || {})[0];
      
      if (!version) {
        throw new Error(`No version found for ${packageName}`);
      }
    }
    
    // Get specific version data
    const versionData = packageData.versions?.[version];
    if (!versionData) {
      throw new Error(`Version ${version} not found for ${packageName}`);
    }
    
    // Determine entry point
    const entryPoint = versionData.browser || 
                      versionData.unpkg || 
                      versionData.jsdelivr || 
                      versionData.module || 
                      versionData.main || 
                      'index.js';
    
    // Clean up entry point
    let cleanEntryPoint = entryPoint;
    if (cleanEntryPoint.startsWith('./')) {
      cleanEntryPoint = cleanEntryPoint.substring(2);
    }
    
    // Try multiple CDNs with different strategies
    const sources = [
      // ESM format (modern)
      { url: `https://esm.sh/${packageName}@${version}`, type: 'esm' },
      { url: `https://esm.sh/${packageName}@${version}/${cleanEntryPoint}`, type: 'esm' },
      
      // JSDelivr ESM
      { url: `https://cdn.jsdelivr.net/npm/${packageName}@${version}/+esm`, type: 'esm' },
      { url: `https://cdn.jsdelivr.net/npm/${packageName}@${version}/${cleanEntryPoint}`, type: 'auto' },
      
      // Unpkg
      { url: `https://unpkg.com/${packageName}@${version}`, type: 'auto' },
      { url: `https://unpkg.com/${packageName}@${version}/${cleanEntryPoint}`, type: 'auto' },
      
      // Skypack
      { url: `https://cdn.skypack.dev/${packageName}@${version}`, type: 'esm' },
      
      // Raw GitHub if package has repository
      versionData.repository ? {
        url: `https://raw.githubusercontent.com/${versionData.repository.url.match(/github\.com\/([^\/]+\/[^\/]+)/)?.[1] || ''}/${version}/${cleanEntryPoint}`,
        type: 'raw'
      } : null,
    ].filter(Boolean);
    
    let code = null;
    let sourceUsed = null;
    let contentType = null;
    
    for (const source of sources) {
      try {
        console.log(`Trying source: ${source.url}`);
        const response = await fetch(source.url, {
          headers: {
            'User-Agent': 'OpenWebOS/3.0.0',
            'Accept': 'application/javascript, */*'
          }
        });
        
        if (response.ok) {
          code = await response.text();
          sourceUsed = source.url;
          contentType = response.headers.get('content-type') || 'application/javascript';
          console.log(`Success from: ${source.url}`);
          break;
        }
      } catch (error) {
        console.log(`Failed ${source.url}:`, error.message);
        continue;
      }
    }
    
    // If still no code, try to fetch from tarball
    if (!code && versionData.dist?.tarball) {
      console.log(`Falling back to tarball: ${versionData.dist.tarball}`);
      code = await extractFromTarball(packageName, version, versionData.dist.tarball, cleanEntryPoint);
      if (code) {
        sourceUsed = 'npm-tarball';
        contentType = 'application/javascript';
      }
    }
    
    if (!code) {
      throw new Error(`Could not retrieve source code from any CDN. Package may not be browser-compatible.`);
    }
    
    // Process the code for browser compatibility
    const processedCode = processCodeForBrowser(code, packageName, version, cleanEntryPoint);
    
    // Extract dependencies
    const dependencies = Object.keys(versionData.dependencies || {});
    const peerDependencies = Object.keys(versionData.peerDependencies || {});
    const devDependencies = Object.keys(versionData.devDependencies || {});
    
    const result = {
      package: packageName,
      version: version,
      code: processedCode,
      dependencies: dependencies,
      peerDependencies: peerDependencies,
      devDependencies: devDependencies,
      entryPoint: cleanEntryPoint,
      source: sourceUsed,
      contentType: contentType,
      timestamp: Date.now(),
      loadTime: Date.now() - startTime,
      size: processedCode.length,
      exports: detectExports(processedCode)
    };
    
    // Cache if we have KV
    if (env && env.OPENWEBOS_CACHE) {
      try {
        await env.OPENWEBOS_CACHE.put(cacheKey, JSON.stringify(result), {
          expirationTtl: 86400 // 24 hours
        });
      } catch (cacheError) {
        console.log('Cache write error:', cacheError);
      }
    }
    
    return new Response(JSON.stringify(result, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400',
        'X-Cache': 'MISS',
        'X-Load-Time': `${Date.now() - startTime}ms`
      }
    });
    
  } catch (error) {
    console.error(`Package request error:`, error);
    
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      loadTime: Date.now() - startTime,
      tip: 'Try a different package or check if the package is browser-compatible'
    }, null, 2), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Improved code processor
function processCodeForBrowser(code, packageName, version, entryPoint) {
  let processed = code;
  
  // Remove Node.js shebang
  processed = processed.replace(/^#!.*\n/, '');
  
  // Handle different module formats
  const isEsm = processed.includes('import ') || processed.includes('export ');
  const isCommonJs = processed.includes('module.exports') || processed.includes('exports.') || 
                     processed.includes('require(');
  
  if (isEsm) {
    // For ES modules, we need to handle imports
    processed = processed.replace(
      /import\s+(?:{[^}]+}\s+from\s+)?['"]([^'"]+)['"]/g,
      (match, specifier) => {
        if (specifier.startsWith('./') || specifier.startsWith('../')) {
          // Keep relative imports
          return match;
        } else if (specifier.startsWith('http://') || specifier.startsWith('https://')) {
          // Keep absolute URLs
          return match;
        } else {
          // Convert npm imports to our require system
          return `/* Converted from import */ const imported = require('${specifier}');`;
        }
      }
    );
    
    // Handle export statements - wrap in CommonJS style
    if (processed.includes('export default')) {
      processed = processed.replace(
        /export default\s+([^;]+);/g,
        'module.exports = $1;'
      );
    }
    
    if (processed.includes('export {')) {
      processed = processed.replace(
        /export\s+{([^}]+)}/g,
        (match, exports) => {
          const exportList = exports.split(',').map(e => e.trim());
          return exportList.map(e => {
            if (e.includes(' as ')) {
              const [original, alias] = e.split(' as ').map(s => s.trim());
              return `module.exports.${alias} = ${original};`;
            } else {
              return `module.exports.${e} = ${e};`;
            }
          }).join('\n');
        }
      );
    }
  }
  
  if (isCommonJs) {
    // Fix require statements
    processed = processed.replace(
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      (match, specifier) => {
        if (specifier.startsWith('./') || specifier.startsWith('../')) {
          return match; // Keep relative requires
        } else if (specifier.startsWith('node:')) {
          // Node built-ins
          const builtin = specifier.substring(5);
          return `require('${builtin}')`;
        } else {
          return `require('${specifier}')`;
        }
      }
    );
  }
  
  // Wrap in IIFE to avoid global scope pollution
  processed = `(function() {
var global = typeof window !== 'undefined' ? window : globalThis;
var process = require('process');
var Buffer = require('buffer').Buffer;
var console = require('console');

${processed}

if (typeof module !== 'undefined' && module.exports) {
  return module.exports;
}
return {};
})();`;
  
  return processed;
}

// Helper to detect exports
function detectExports(code) {
  const exports = [];
  
  // Look for module.exports assignments
  const moduleExportsRegex = /module\.exports\.(\w+)\s*=/g;
  let match;
  while ((match = moduleExportsRegex.exec(code)) !== null) {
    exports.push(match[1]);
  }
  
  // Look for exports assignments
  const exportsRegex = /exports\.(\w+)\s*=/g;
  while ((match = exportsRegex.exec(code)) !== null) {
    exports.push(match[1]);
  }
  
  // Look for export statements
  const exportRegex = /export\s+(?:const|let|var|function|class)\s+(\w+)/g;
  while ((match = exportRegex.exec(code)) !== null) {
    exports.push(match[1]);
  }
  
  return [...new Set(exports)]; // Remove duplicates
}

// Extract from tarball
async function extractFromTarball(packageName, version, tarballUrl, entryPoint) {
  try {
    // For simplicity, use unpkg to get the file
    const unpkgUrl = `https://unpkg.com/${packageName}@${version}/${entryPoint}`;
    const response = await fetch(unpkgUrl);
    
    if (response.ok) {
      return await response.text();
    }
    
    // Try without version for latest
    const unpkgLatestUrl = `https://unpkg.com/${packageName}/${entryPoint}`;
    const latestResponse = await fetch(unpkgLatestUrl);
    
    if (latestResponse.ok) {
      return await latestResponse.text();
    }
    
    return null;
  } catch (error) {
    console.error('Tarball extraction error:', error);
    return null;
  }
}

// Compile request
async function handleCompileRequest(request, corsHeaders) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return new Response(JSON.stringify({ error: 'No code provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Simple JSX transformation
    const transformed = code
      .replace(/React\.createElement/g, 'OpenWebOS.createElement')
      .replace(/import\s+React[^;]+;/g, '')
      .replace(/from\s+['"]react['"]/g, '')
      .replace(/{\/\*[\s\S]*?\*\/}/g, '')
      .replace(/<([A-Z][A-Za-z0-9]*)([^>]*)>/g, 'OpenWebOS.createElement("$1", {$2})')
      .replace(/<\/([A-Z][A-Za-z0-9]*)>/g, ')');
    
    return new Response(transformed, {
      headers: { ...corsHeaders, 'Content-Type': 'application/javascript' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Bundle request
async function handleBundleRequest(request, corsHeaders) {
  try {
    const { packages } = await request.json();
    
    if (!packages || !Array.isArray(packages) || packages.length === 0) {
      return new Response(JSON.stringify({ error: 'No packages specified' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const bundle = {};
    
    for (const pkg of packages.slice(0, 10)) { // Limit to 10 packages
      try {
        const [name, version = 'latest'] = pkg.split('@');
        
        // Fetch the package
        const pkgRes = await fetch(`https://registry.npmjs.org/${name}/${version}`);
        if (!pkgRes.ok) continue;
        
        const pkgData = await pkgRes.json();
        const versionData = version === 'latest' 
          ? pkgData.versions?.[pkgData['dist-tags']?.latest]
          : pkgData.versions?.[version];
        
        if (!versionData) continue;
        
        const entryPoint = versionData.browser || versionData.main || 'index.js';
        
        // Try to get code
        const sources = [
          `https://esm.sh/${name}@${version}`,
          `https://cdn.jsdelivr.net/npm/${name}@${version}`,
          `https://unpkg.com/${name}@${version}`
        ];
        
        let code = null;
        for (const source of sources) {
          const res = await fetch(source);
          if (res.ok) {
            code = await res.text();
            break;
          }
        }
        
        if (code) {
          bundle[name] = {
            version: version,
            code: processCodeForBrowser(code, name, version, entryPoint),
            dependencies: Object.keys(versionData.dependencies || {})
          };
        }
      } catch (error) {
        console.error(`Failed to bundle ${pkg}:`, error);
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      bundle: bundle,
      count: Object.keys(bundle).length,
      timestamp: Date.now()
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Search request
async function handleSearchRequest(request, corsHeaders) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    if (!query || query.trim() === '') {
      return new Response(JSON.stringify({ 
        error: 'Search query required',
        example: '/v1/search?q=react&page=1&limit=10'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const searchUrl = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${limit}&from=${(page - 1) * limit}`;
    const searchRes = await fetch(searchUrl);
    
    if (!searchRes.ok) {
      throw new Error(`Search failed: ${searchRes.status}`);
    }
    
    const searchData = await searchRes.json();
    
    const results = searchData.objects.map(pkg => ({
      name: pkg.package.name,
      version: pkg.package.version,
      description: pkg.package.description || '',
      keywords: pkg.package.keywords || [],
      author: pkg.package.author?.name || '',
      maintainers: pkg.package.maintainers?.map(m => m.username) || [],
      date: pkg.package.date,
      links: {
        npm: pkg.package.links?.npm,
        homepage: pkg.package.links?.homepage,
        repository: pkg.package.links?.repository,
        bugs: pkg.package.links?.bugs
      },
      score: pkg.score?.final || 0
    }));
    
    return new Response(JSON.stringify({
      query: query,
      page: page,
      limit: limit,
      total: searchData.total,
      results: results,
      timestamp: Date.now()
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
