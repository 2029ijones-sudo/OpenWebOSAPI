// worker.js - COMPLETE OpenWebOS API
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
  const script = `// OpenWebOS API v3.0
window.OpenWebOS = {
  version: '3.0.0',
  cache: new Map(),
  
  require: async (packageName, version = 'latest') => {
    const cacheKey = \`\${packageName}@\${version}\`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      const res = await fetch('/v1/pkg/' + packageName + '@' + version);
      if (!res.ok) {
        throw new Error(\`Package \${packageName} not found\`);
      }
      
      const data = await res.json();
      
      // Create module
      const module = { exports: {} };
      const require = (dep) => {
        if (dep.startsWith('.')) {
          throw new Error(\`Relative import "\${dep}" not supported\`);
        }
        
        // Node.js built-in stubs
        const builtIns = {
          'fs': { readFileSync: () => '', writeFileSync: () => {}, existsSync: () => false },
          'path': { join: (...parts) => parts.join('/'), dirname: (p) => p.split('/').slice(0, -1).join('/') },
          'http': { createServer: () => ({ listen: () => {} }) },
          'https': { createServer: () => ({ listen: () => {} }) },
          'stream': { Readable: class {}, Writable: class {} },
          'buffer': { Buffer: { from: (str) => new TextEncoder().encode(str) } },
          'events': { EventEmitter: class { on() { return this; } emit() {} } },
          'util': { promisify: (fn) => fn, inherits: () => {} },
          'crypto': { randomBytes: (size) => new Uint8Array(size) },
          'os': { platform: () => 'browser', homedir: () => '/' },
          'child_process': { spawn: () => ({ on: () => {} }) },
          'process': { env: { NODE_ENV: 'development' }, version: '18.0.0' }
        };
        
        if (builtIns[dep]) {
          return builtIns[dep];
        }
        
        // External dependency - load it
        return window.OpenWebOS.require(dep);
      };
      
      // Execute package code
      const executionWrapper = \`(function(module, exports, require, global, process, Buffer) {
        \${data.code}
      })\`;
      
      const factory = eval(executionWrapper);
      const globalObj = typeof window !== 'undefined' ? window : globalThis;
      
      factory(
        module,
        module.exports,
        require,
        globalObj,
        { env: { NODE_ENV: 'development' }, version: '18.0.0' },
        { from: (str) => new TextEncoder().encode(str) }
      );
      
      this.cache.set(cacheKey, module.exports);
      return module.exports;
      
    } catch (error) {
      console.error(\`OpenWebOS: Failed to load \${packageName}:\`, error);
      throw error;
    }
  },
  
  compileJSX: async (code) => {
    const res = await fetch('/v1/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    return await res.text();
  },
  
  clearCache: function() {
    this.cache.clear();
  }
};

// Auto-initialize
(function() {
  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function() {
      console.log('OpenWebOS API v3.0.0 loaded. Use OpenWebOS.require("package-name")');
    });
  }
})();`;
  
  return new Response(script, {
    headers: { ...corsHeaders, 'Content-Type': 'application/javascript' }
  });
}
    
    // Handle package requests - COMPLEX PROPER WAY
    if (path.startsWith('/v1/pkg/')) {
      return handlePackageRequest(path, corsHeaders);
    }
    
    if (path === '/v1/compile') {
      return handleCompileRequest(request, corsHeaders);
    }
    
    if (path === '/v1/bundle') {
      return handleBundleRequest(request, corsHeaders);
    }
    
    if (path === '/v1/search') {
      return handleSearchRequest(request, corsHeaders);
    }
    
    // API Documentation
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
    }), {
      headers: corsHeaders
    });
  }
};

// COMPLEX: Handle package requests properly
async function handlePackageRequest(path, corsHeaders) {
  try {
    const packagePath = path.substring('/v1/pkg/'.length);
    const [packageName, version = 'latest'] = packagePath.split('@');
    
    if (!packageName) {
      return new Response('Package name required', { 
        status: 400, 
        headers: corsHeaders 
      });
    }
    
    // Step 1: Get package metadata from npm registry
    const registryUrl = `https://registry.npmjs.org/${packageName}/${version}`;
    const registryRes = await fetch(registryUrl);
    
    if (!registryRes.ok) {
      throw new Error(`Package ${packageName}@${version} not found in npm registry`);
    }
    
    const packageData = await registryRes.json();
    
    // Step 2: Determine the best entry point for browser
    const entryPoint = getBrowserEntryPoint(packageData);
    
    // Step 3: Try multiple sources in order
    const sources = [
      // Try esm.sh first (best for browser)
      `https://esm.sh/${packageName}@${version}`,
      // Try jsDelivr with +esm
      `https://cdn.jsdelivr.net/npm/${packageName}@${version}/+esm`,
      // Try unpkg with ?module
      `https://unpkg.com/${packageName}@${version}?module`,
      // Try skypack
      `https://cdn.skypack.dev/${packageName}@${version}`,
      // Try specific file from jsDelivr
      `https://cdn.jsdelivr.net/npm/${packageName}@${version}/${entryPoint}`
    ];
    
    let code = null;
    let sourceUsed = null;
    
    for (const sourceUrl of sources) {
      try {
        const response = await fetch(sourceUrl);
        if (response.ok) {
          code = await response.text();
          sourceUsed = sourceUrl;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Step 4: If all CDNs fail, try to construct from tarball
    if (!code && packageData.dist?.tarball) {
      code = await extractFromTarball(packageData.dist.tarball, entryPoint);
      sourceUsed = 'npm tarball';
    }
    
    if (!code) {
      throw new Error(`Could not retrieve source code for ${packageName}@${version}`);
    }
    
    // Step 5: Process the code for browser compatibility
    const processedCode = processCodeForBrowser(code, packageName, entryPoint);
    
    // Step 6: Extract dependencies
    const dependencies = Object.keys(packageData.dependencies || {});
    
    return new Response(JSON.stringify({
      package: packageName,
      version: version,
      code: processedCode,
      dependencies: dependencies,
      entryPoint: entryPoint,
      source: sourceUsed,
      timestamp: Date.now()
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Determine best entry point for browser
function getBrowserEntryPoint(packageData) {
  return (
    packageData.browser ||
    packageData.unpkg ||
    packageData.jsdelivr ||
    packageData.module ||
    packageData.main ||
    'index.js'
  );
}

// Process code for browser compatibility
function processCodeForBrowser(code, packageName, entryPoint) {
  // Remove Node.js specific code patterns
  let processed = code;
  
  // Replace require calls with our wrapper
  processed = processed.replace(
    /require\(['"]([^'"]+)['"]\)/g,
    (match, dep) => {
      if (dep.startsWith('./') || dep.startsWith('../')) {
        // Relative require - convert to dependency
        return `require('${dep}')`;
      }
      return `require('${dep}')`;
    }
  );
  
  // Convert CommonJS exports to ES module
  if (!entryPoint.includes('esm') && !entryPoint.includes('module')) {
    processed = convertCommonJsToEsModule(processed);
  }
  
  // Remove Node.js specific APIs that won't work
  const nodeApis = [
    'process.exit',
    'process.kill',
    'process.abort',
    'process.chdir',
    'process.setuid',
    'process.setgid',
    'process.setgroups',
    'process.initgroups',
    'process.umask',
    'process.dlopen',
    'process._rawDebug',
    'process.binding',
    'process._linkedBinding',
    'process.reallyExit',
    'process._fatalException',
    'fs.createReadStream',
    'fs.createWriteStream',
    'fs.watch',
    'fs.watchFile',
    'fs.unwatchFile',
    'fs.realpath.native',
    'fs.realpathSync.native',
    'child_process.fork',
    'child_process.spawnSync',
    'child_process.execSync',
    'child_process.execFileSync',
    'os.cpus',
    'os.networkInterfaces',
    'os.userInfo',
    'os.homedir',
    'os.tmpdir',
    'crypto.pbkdf2Sync',
    'crypto.randomFillSync',
    'crypto.scryptSync'
  ];
  
  nodeApis.forEach(api => {
    processed = processed.replace(new RegExp(api, 'g'), `/* ${api} not available in browser */ null`);
  });
  
  return processed;
}

// Convert CommonJS to ES Module
function convertCommonJsToEsModule(code) {
  // Wrap in module context
  return `
const module = { exports: {} };
const exports = module.exports;
let __webpack_require__;

${code}

// Convert to ES Module
if (module.exports && typeof module.exports === 'object') {
  if (module.exports.__esModule) {
    // Already ES module
    const __exports = module.exports;
    export default __exports.default || __exports;
    for (const key in __exports) {
      if (key !== 'default' && __exports.hasOwnProperty(key)) {
        Object.defineProperty(exports, key, {
          enumerable: true,
          get: () => __exports[key]
        });
      }
    }
  } else {
    // CommonJS module
    const __exports = module.exports;
    export default __exports;
    if (__exports && typeof __exports === 'object') {
      for (const key in __exports) {
        if (__exports.hasOwnProperty(key)) {
          Object.defineProperty(exports, key, {
            enumerable: true,
            get: () => __exports[key]
          });
        }
      }
    }
  }
} else {
  export default module.exports;
}
`;
}

// Extract file from tarball (simplified version)
async function extractFromTarball(tarballUrl, entryPoint) {
  // This is a simplified version - in production you'd need proper .tgz extraction
  try {
    // For now, try to get the file directly from npm
    const packageName = tarballUrl.split('/').slice(-2)[0];
    const version = tarballUrl.split('/').slice(-1)[0].replace(/\.tgz$/, '');
    
    // Try to get from unpkg as raw file
    const unpkgUrl = `https://unpkg.com/${packageName}@${version}/${entryPoint}`;
    const response = await fetch(unpkgUrl);
    
    if (response.ok) {
      return await response.text();
    }
    
    // Fallback to GitHub if package has repository
    const githubUrl = `https://raw.githubusercontent.com/${packageName}/master/${entryPoint}`;
    const githubRes = await fetch(githubUrl);
    
    if (githubRes.ok) {
      return await githubRes.text();
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Handle JSX compilation
async function handleCompileRequest(request, corsHeaders) {
  try {
    const { code } = await request.json();
    
    // Use Babel standalone via CDN
    const babelUrl = 'https://unpkg.com/@babel/standalone@7.23.2/babel.min.js';
    
    // Simple transformation for now
    const transformed = code
      .replace(/React\.createElement/g, 'OpenWebOS.createElement')
      .replace(/import\s+React[^;]+;/g, '')
      .replace(/from\s+['"]react['"]/g, '')
      .replace(/{\/\*[\s\S]*?\*\/}/g, '');
    
    return new Response(transformed, {
      headers: { ...corsHeaders, 'Content-Type': 'application/javascript' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handle bundle creation
async function handleBundleRequest(request, corsHeaders) {
  try {
    const { packages } = await request.json();
    const bundle = {};
    
    for (const pkg of packages) {
      const [name, version = 'latest'] = pkg.split('@');
      const pkgRes = await fetch(`https://registry.npmjs.org/${name}/${version}`);
      
      if (pkgRes.ok) {
        const pkgData = await pkgRes.json();
        const entryPoint = getBrowserEntryPoint(pkgData);
        
        // Try to get the package
        const sources = [
          `https://esm.sh/${name}@${version}`,
          `https://cdn.jsdelivr.net/npm/${name}@${version}/+esm`
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
            code: processCodeForBrowser(code, name, entryPoint),
            version: version,
            dependencies: Object.keys(pkgData.dependencies || {})
          };
        }
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      bundle: bundle,
      count: Object.keys(bundle).length
    }), {
      headers: corsHeaders
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handle package search
async function handleSearchRequest(request, corsHeaders) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    
    if (!query) {
      return new Response(JSON.stringify({ error: 'Search query required' }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    const searchUrl = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=20`;
    const searchRes = await fetch(searchUrl);
    
    if (!searchRes.ok) {
      throw new Error('Search failed');
    }
    
    const searchData = await searchRes.json();
    
    const results = searchData.objects.map(pkg => ({
      name: pkg.package.name,
      version: pkg.package.version,
      description: pkg.package.description,
      maintainers: pkg.package.maintainers?.map(m => m.username) || [],
      keywords: pkg.package.keywords || [],
      date: pkg.package.date,
      links: pkg.package.links
    }));
    
    return new Response(JSON.stringify({
      query: query,
      total: searchData.total,
      results: results
    }), {
      headers: corsHeaders
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
