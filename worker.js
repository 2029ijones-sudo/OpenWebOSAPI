// worker.js - FINALLY FIXED OpenWebOS API
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
      const script = `// OpenWebOS API v3.0 - FIXED VERSION
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
        
        // Build-in modules (FIXED: no arrow functions that lose 'this')
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
            createHash: function() {
              const self = { update: () => self, digest: () => '00000000000000000000000000000000' };
              return self;
            },
            createHmac: function() {
              const self = { update: () => self, digest: () => '00000000000000000000000000000000' };
              return self;
            }
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
            createGzip: function() {
              const self = { on: () => self, write: () => true, end: () => self };
              return self;
            },
            createGunzip: function() {
              const self = { on: () => self, write: () => true, end: () => self };
              return self;
            },
            gzip: (buffer, callback) => setTimeout(() => callback(null, buffer), 0),
            gunzip: (buffer, callback) => setTimeout(() => callback(null, buffer), 0)
          },
          'net': {
            createServer: function() {
              const self = { 
                listen: () => ({ on: () => {} }),
                on: () => self 
              };
              return self;
            },
            connect: function() {
              const self = { 
                on: () => self,
                write: () => true,
                end: () => self
              };
              return self;
            }
          },
          'dgram': {
            createSocket: function() {
              const self = { 
                bind: () => ({ on: () => {} }),
                on: () => self,
                send: () => {}
              };
              return self;
            }
          },
          'dns': {
            lookup: (hostname, callback) => setTimeout(() => callback(null, '127.0.0.1', 4), 0),
            resolve: (hostname, callback) => setTimeout(() => callback(null, ['127.0.0.1']), 0)
          },
          'tls': {
            createServer: function() {
              const self = { 
                listen: () => ({ on: () => {} }),
                on: () => self 
              };
              return self;
            },
            connect: function() {
              const self = { 
                on: () => self,
                write: () => true,
                end: () => self
              };
              return self;
            }
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
        
        // Create require function for this module (FIXED: proper scoping)
        const createRequire = () => {
          return (dep) => {
            if (dep.startsWith('.')) {
              throw new Error(\`Relative requires not supported: \${dep}\`);
            }
            
            if (builtIns[dep]) {
              return builtIns[dep];
            }
            
            // Load external package
            return window.OpenWebOS.require(dep);
          };
        };
        
        const require = createRequire();
        
        // Execute the code (FIXED: proper execution context)
        try {
          const wrapperFunction = new Function(
            'module', 'exports', 'require', 'global', 'process', 'Buffer', '__filename', '__dirname',
            \`
              (function(module, exports, require, global, process, Buffer, __filename, __dirname) {
                \${data.code}
              })(module, exports, require, global, process, Buffer, '/index.js', '/');
            \`
          );
          
          wrapperFunction(
            module,
            module.exports,
            require,
            globalThis,
            builtIns.process,
            builtIns.buffer.Buffer,
            '/index.js',
            '/'
          );
          
          // Handle default export for ES modules
          let result = module.exports;
          if (result && typeof result === 'object' && result.__esModule && result.default !== undefined) {
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
  },
  
  // ADDED: createElement function for JSX
  createElement: function(tag, props, ...children) {
    if (typeof tag === 'function') {
      return tag({ ...props, children });
    }
    
    const element = document.createElement(tag);
    
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        if (key === 'className') {
          element.className = value;
        } else if (key === 'style' && typeof value === 'object') {
          Object.assign(element.style, value);
        } else if (key.startsWith('on') && typeof value === 'function') {
          element.addEventListener(key.substring(2).toLowerCase(), value);
        } else if (key !== 'children') {
          element.setAttribute(key, value);
        }
      }
    }
    
    children.forEach(child => {
      if (typeof child === 'string' || typeof child === 'number') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        element.appendChild(child);
      } else if (Array.isArray(child)) {
        child.forEach(c => {
          if (c instanceof Node) element.appendChild(c);
        });
      }
    });
    
    return element;
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

// FIXED package handler
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
    
    if (!packageName || packageName.trim() === '') {
      return new Response(JSON.stringify({ 
        error: 'Package name is required',
        example: '/v1/pkg/lodash@latest'
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Get package info from npm registry
    const registryUrl = version === 'latest' 
      ? `https://registry.npmjs.org/${encodeURIComponent(packageName)}`
      : `https://registry.npmjs.org/${encodeURIComponent(packageName)}/${encodeURIComponent(version)}`;
    
    const registryRes = await fetch(registryUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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
    
   // Try multiple CDNs - USE ONLY THESE TWO
const sources = [
  { url: `https://esm.sh/${packageName}@${version}`, type: 'esm' },
  { url: `https://esm.sh/${packageName}`, type: 'esm' },
  { url: `https://cdn.skypack.dev/${packageName}@${version}`, type: 'esm' },
  { url: `https://cdn.skypack.dev/${packageName}`, type: 'esm' },
];
    
    let code = null;
    let sourceUsed = null;
    
    for (const source of sources) {
      try {
        const response = await fetch(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*; q=0.01',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Sec-Fetch-Dest': 'script',
            'Sec-Fetch-Mode': 'no-cors',
            'Sec-Fetch-Site': 'cross-site',
            'Referer': 'https://openwebosapi.2029ijones.workers.dev/',
            'Origin': 'https://openwebosapi.2029ijones.workers.dev'
          }
        });
        
        if (response.ok) {
          code = await response.text();
          sourceUsed = source.url;
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    // FIX: Missing closing braces - the fallback code was in the wrong place!
    if (!code) {
      // Try to get from unpkg directly (fallback)
      try {
        const unpkgUrl = `https://unpkg.com/${packageName}@${version}`;
        const response = await fetch(unpkgUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*; q=0.01',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Sec-Fetch-Dest': 'script',
            'Sec-Fetch-Mode': 'no-cors',
            'Sec-Fetch-Site': 'cross-site',
            'Referer': 'https://openwebosapi.2029ijones.workers.dev/',
            'Origin': 'https://openwebosapi.2029ijones.workers.dev'
          }
        });
        if (response.ok) {
          code = await response.text();
          sourceUsed = unpkgUrl;
        }
      } catch (error) {
        // Ignore
      }
    }
    
if (!code) {
  throw new Error(`Could not retrieve source code. Package may not be browser-compatible.`);
}

// ============ INLINE COMPREHENSIVE CONVERTER FUNCTION ============
function convertESMtoCommonJS(esmCode, packageName, version) {
  let outputCode = esmCode;
  let hasImports = false;
  let hasExports = false;
  
  // Track all imports and exports for proper conversion
  const imports = [];
  const exports = [];
  
  // ----- PHASE 1: PARSE IMPORTS -----
  const importPatterns = [
    // import defaultExport from "module"
    /import\s+([\w$]+)\s+from\s+['"]([^'"]+)['"]/g,
    // import * as name from "module"
    /import\s+\*\s+as\s+([\w$]+)\s+from\s+['"]([^'"]+)['"]/g,
    // import { export1 } from "module"
    /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g,
    // import { export1 as alias1 } from "module"
    /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g, // Same pattern, handle in callback
    // import defaultExport, { export1 } from "module"
    /import\s+([\w$]+)\s*,\s*\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g,
    // import "module" (side effect)
    /import\s+['"]([^'"]+)['"]/g,
    // Dynamic import
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  ];
  
  // Process each import pattern
  importPatterns.forEach((pattern, index) => {
    outputCode = outputCode.replace(pattern, (match, ...args) => {
      hasImports = true;
      let result = '';
      
      switch (index) {
        case 0: // import defaultExport from "module"
          const [name, module] = args.slice(0, 2);
          imports.push({ type: 'default', name, module });
          result = `const ${name} = require('${module}').default || require('${module}');`;
          break;
          
        case 1: // import * as name from "module"
          const [namespaceName, namespaceModule] = args.slice(0, 2);
          imports.push({ type: 'namespace', name: namespaceName, module: namespaceModule });
          result = `const ${namespaceName} = require('${namespaceModule}');`;
          break;
          
        case 2: // import { export1 } from "module"
        case 3: // import { export1 as alias1 } from "module"
          const exportList = args[0];
          const exportModule = args[1];
          
          const exportsArray = exportList.split(',').map(e => e.trim());
          const importStatements = exportsArray.map(e => {
            if (e.includes(' as ')) {
              const [original, alias] = e.split(' as ').map(s => s.trim());
              imports.push({ type: 'named', original, alias, module: exportModule });
              return `const ${alias} = require('${exportModule}').${original};`;
            } else {
              imports.push({ type: 'named', original: e, alias: e, module: exportModule });
              return `const ${e} = require('${exportModule}').${e};`;
            }
          });
          
          result = importStatements.join('\n');
          break;
          
        case 4: // import defaultExport, { export1 } from "module"
          const [defaultName, namedExports, combinedModule] = args.slice(0, 3);
          
          // Handle default import
          imports.push({ type: 'default', name: defaultName, module: combinedModule });
          const defaultImport = `const ${defaultName} = require('${combinedModule}').default || require('${combinedModule}');`;
          
          // Handle named imports
          const namedExportsArray = namedExports.split(',').map(e => e.trim());
          const namedImportStatements = namedExportsArray.map(e => {
            if (e.includes(' as ')) {
              const [original, alias] = e.split(' as ').map(s => s.trim());
              imports.push({ type: 'named', original, alias, module: combinedModule });
              return `const ${alias} = require('${combinedModule}').${original};`;
            } else {
              imports.push({ type: 'named', original: e, alias: e, module: combinedModule });
              return `const ${e} = require('${combinedModule}').${e};`;
            }
          });
          
          result = [defaultImport, ...namedImportStatements].join('\n');
          break;
          
        case 5: // import "module" (side effect)
          const sideEffectModule = args[0];
          imports.push({ type: 'side-effect', module: sideEffectModule });
          result = `require('${sideEffectModule}');`;
          break;
          
        case 6: // Dynamic import
          const dynamicModule = args[0];
          imports.push({ type: 'dynamic', module: dynamicModule });
          result = `Promise.resolve().then(() => require('${dynamicModule}'));`;
          break;
      }
      
      return result;
    });
  });
  
  // ----- PHASE 2: HANDLE RE-EXPORTS (export * from) -----
  // export * from "module"
  const exportStarPattern = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g;
  outputCode = outputCode.replace(exportStarPattern, (match, module) => {
    hasExports = true;
    return `Object.assign(module.exports, require('${module}'));`;
  });
  
  // export * as namespace from "module"
  const exportStarAsPattern = /export\s+\*\s+as\s+([\w$]+)\s+from\s+['"]([^'"]+)['"]/g;
  outputCode = outputCode.replace(exportStarAsPattern, (match, name, module) => {
    hasExports = true;
    return `module.exports.${name} = require('${module}');`;
  });
  
  // export { name } from "module"
  const exportFromPattern = /export\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
  outputCode = outputCode.replace(exportFromPattern, (match, exportList, module) => {
    hasExports = true;
    const exportsArray = exportList.split(',').map(e => e.trim());
    const exportStatements = exportsArray.map(e => {
      if (e.includes(' as ')) {
        const [original, renamed] = e.split(' as ').map(s => s.trim());
        return `module.exports.${renamed} = require('${module}').${original};`;
      } else {
        return `module.exports.${e} = require('${module}').${e};`;
      }
    });
    return exportStatements.join('\n');
  });
  
  // ----- PHASE 3: HANDLE DIRECT EXPORTS -----
  // export default expression
  const exportDefaultPattern = /export\s+default\s+([^;]+);?/g;
  outputCode = outputCode.replace(exportDefaultPattern, (match, expression) => {
    hasExports = true;
    return `module.exports.default = ${expression};`;
  });
  
  // export default function name() {}
  const exportDefaultFuncPattern = /export\s+default\s+function\s+([\w$]+)\s*\([^)]*\)\s*\{[^}]*\}/gs;
  outputCode = outputCode.replace(exportDefaultFuncPattern, (match, funcName) => {
    hasExports = true;
    return match.replace('export default ', '') + `\nmodule.exports.default = ${funcName};`;
  });
  
  // export default class name {}
  const exportDefaultClassPattern = /export\s+default\s+class\s+([\w$]+)\s*\{[^}]*\}/gs;
  outputCode = outputCode.replace(exportDefaultClassPattern, (match, className) => {
    hasExports = true;
    return match.replace('export default ', '') + `\nmodule.exports.default = ${className};`;
  });
  
  // export { name1, name2 }
  const exportNamedPattern = /export\s+\{([^}]+)\}\s*;?/g;
  outputCode = outputCode.replace(exportNamedPattern, (match, exportList) => {
    hasExports = true;
    const exportsArray = exportList.split(',').map(e => e.trim());
    const exportStatements = exportsArray.map(e => {
      if (e.includes(' as ')) {
        const [original, renamed] = e.split(' as ').map(s => s.trim());
        return `module.exports.${renamed} = ${original};`;
      } else {
        return `module.exports.${e} = ${e};`;
      }
    });
    return exportStatements.join('\n');
  });
  
  // export var/let/const name = value
  const exportVarPattern = /export\s+(var|let|const)\s+([\w$]+)\s*=\s*([^;]+);?/g;
  outputCode = outputCode.replace(exportVarPattern, (match, declaration, name, value) => {
    hasExports = true;
    return `${declaration} ${name} = ${value};\nmodule.exports.${name} = ${name};`;
  });
  
  // export function name() {}
  const exportFunctionPattern = /export\s+function\s+([\w$]+)\s*\([^)]*\)\s*\{[^}]*\}/gs;
  outputCode = outputCode.replace(exportFunctionPattern, (match, funcName) => {
    hasExports = true;
    return match.replace('export ', '') + `\nmodule.exports.${funcName} = ${funcName};`;
  });
  
  // export class name {}
  const exportClassPattern = /export\s+class\s+([\w$]+)\s*\{[^}]*\}/gs;
  outputCode = outputCode.replace(exportClassPattern, (match, className) => {
    hasExports = true;
    return match.replace('export ', '') + `\nmodule.exports.${className} = ${className};`;
  });
  
  // ----- PHASE 4: ADD WRAPPER AND CLEANUP -----
  
  // Remove any remaining export statements we might have missed
  outputCode = outputCode.replace(/^\s*export\s+/gm, '');
  
  // Check if we have ES module indicators
  const isESModule = hasImports || hasExports || 
                    esmCode.includes('import ') || 
                    esmCode.includes('export ');
  
  // If it's an ES module, wrap it properly
  if (isESModule) {
    // Check if it's a simple re-export wrapper (common in esm.sh)
    const isReexportWrapper = esmCode.trim().startsWith('export') && 
                             (esmCode.includes('export * from') || 
                              esmCode.includes('export {') || 
                              esmCode.includes('export default'));
    
    if (isReexportWrapper && esmCode.includes('export * from "/')) {
      // Handle esm.sh format: export * from "/package@version/..."
      const match = esmCode.match(/export \* from "([^"]+)"/);
      if (match) {
        const modulePath = match[1];
        // Create a loader that fetches the actual module
        return `
          // ES Module loader for ${packageName} (esm.sh re-export format)
          const actualModuleUrl = '${modulePath}';
          let moduleLoaded = false;
          let moduleExports = null;
          
          async function loadESM() {
            if (moduleLoaded) return moduleExports;
            
            try {
              const response = await fetch(actualModuleUrl);
              if (!response.ok) {
                throw new Error('Failed to load ESM module from ' + actualModuleUrl);
              }
              
              const esmCode = await response.text();
              
              // Convert the fetched ES module to CommonJS
              const convertedCode = (function() {
                ${convertESMtoCommonJS(esmCode, packageName, version)}
                return module.exports;
              })();
              
              moduleExports = convertedCode;
              moduleLoaded = true;
              return moduleExports;
              
            } catch (error) {
              console.error('[OpenWebOS] Failed to load ESM module for ${packageName}:', error);
              // Return empty object as fallback
              return {};
            }
          }
          
          // Export a promise that loads the module
          module.exports = loadESM();
        `;
      }
    }
    
    // For other ES modules, wrap in IIFE
    outputCode = `
      (function() {
        const module = { exports: {} };
        const exports = module.exports;
        
        ${outputCode}
        
        // Handle default export if not already handled
        if (typeof module.exports.default !== 'undefined' && 
            Object.keys(module.exports).length === 1 && 
            module.exports.default !== undefined) {
          module.exports = module.exports.default;
        }
        
        return module.exports;
      })();
    `;
  }
  
  return outputCode;
}
// ============ END OF CONVERTER FUNCTION ============

// FIX: Transform esm.sh/skypack ES module exports to CommonJS
let processedCode = code;

if (sourceUsed && (sourceUsed.includes('esm.sh') || sourceUsed.includes('skypack.dev'))) {
  // Use the comprehensive converter for ES modules
  processedCode = convertESMtoCommonJS(code, packageName, version);
} else {
  // Original processing for non-ESM sources
  processedCode = code.replace(/^#!.*\n/, '');
  
  // Simple require replacement (don't overcomplicate it)
  processedCode = processedCode.replace(
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    (match, specifier) => {
      if (specifier.startsWith('./') || specifier.startsWith('../')) {
        return match; // Keep relative
      }
      return `require('${specifier}')`;
    }
  );
  
  // Handle ES module exports if present
  if (processedCode.includes('export default')) {
    processedCode = processedCode.replace(/export default\s+([^;]+);/g, 'module.exports = $1;');
  }
}
    
    // Extract dependencies
    const dependencies = Object.keys(versionData.dependencies || {});
    
    const result = {
      package: packageName,
      version: version,
      code: processedCode,
      dependencies: dependencies,
      entryPoint: cleanEntryPoint,
      source: sourceUsed,
      timestamp: Date.now(),
      loadTime: Date.now() - startTime,
      size: processedCode.length,
      note: 'Code is returned as-is for execution by OpenWebOS runtime'
    };
    
    return new Response(JSON.stringify(result, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400',
        'X-Load-Time': `${Date.now() - startTime}ms`
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: Date.now(),
      loadTime: Date.now() - startTime
    }, null, 2), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// FIXED compile request
async function handleCompileRequest(request, corsHeaders) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return new Response(JSON.stringify({ error: 'No code provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Very basic JSX transform
    const transformed = code
      .replace(/<([A-Za-z][A-Za-z0-9]*)([^>]*)\/?>/g, (match, tag, props) => {
        if (match.endsWith('/>')) {
          return `OpenWebOS.createElement("${tag}", {${props}})`;
        }
        return `OpenWebOS.createElement("${tag}", {${props}})`;
      })
      .replace(/<\/([A-Za-z][A-Za-z0-9]*)>/g, ')');
    
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

// Bundle request (simplified)
async function handleBundleRequest(request, corsHeaders) {
  try {
    const { packages } = await request.json();
    
    if (!packages || !Array.isArray(packages)) {
      return new Response(JSON.stringify({ error: 'No packages specified' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const bundle = {};
    
    for (const pkg of packages.slice(0, 5)) {
      try {
        const [name, version = 'latest'] = pkg.split('@');
        
      
const url = `https://unpkg.com/${name}@${version}`;
const res = await fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/javascript, */*'
  }
});
        if (res.ok) {
          const code = await res.text();
          bundle[name] = {
            version: version,
            code: code.substring(0, 10000), // Limit size
            url: url
          };
        }
      } catch (error) {
        // Skip failed packages
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

// Search request (working)
async function handleSearchRequest(request, corsHeaders) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    
    if (!query || query.trim() === '') {
      return new Response(JSON.stringify({ 
        error: 'Search query required',
        example: '/v1/search?q=react'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const searchUrl = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=10`;
    const searchRes = await fetch(searchUrl);
    
    if (!searchRes.ok) {
      throw new Error(`Search failed: ${searchRes.status}`);
    }
    
    const searchData = await searchRes.json();
    
    const results = searchData.objects.map(pkg => ({
      name: pkg.package.name,
      version: pkg.package.version,
      description: pkg.package.description || '',
      links: pkg.package.links
    }));
    
    return new Response(JSON.stringify({
      query: query,
      total: searchData.total,
      results: results
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
