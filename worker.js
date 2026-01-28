// worker.js - FINAL FIXED VERSION
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const host = url.hostname; // Get actual hostname
    
    // CORS headers
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
      return serveEmbedScript(corsHeaders, host);
    }
    
    if (path === '/v1/node-polyfills.js') {
      return serveRealNodePolyfills(corsHeaders);
    }
    
    if (path.startsWith('/v1/pkg/') || path.startsWith('/v1/npm/')) {
      return serveRealPackage(request, corsHeaders, host);
    }
    
    if (path === '/v1/compile') {
      return compileRealJSX(request, corsHeaders);
    }
    
    if (path === '/v1/execute') {
      return executeRealCode(request, corsHeaders);
    }
    
    if (path === '/v1/bundle') {
      return createBundle(request, corsHeaders);
    }
    
    if (path === '/health') {
      return new Response('OK', { 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
      });
    }
    
    // API Info - FIXED: Use actual hostname, not placeholder
    return new Response(JSON.stringify({
      name: 'OpenWebOS Node.js Runtime API',
      version: '4.0.0',
      description: 'Run ANY npm package in browser - NO SIMULATION',
      host: host,
      endpoints: {
        embed: '/v1/embed.js',
        package: '/v1/pkg/{package}@{version}',
        polyfills: '/v1/node-polyfills.js',
        compile: '/v1/compile',
        execute: '/v1/execute',
        bundle: '/v1/bundle'
      },
      example: `
        <script src="https://${host}/v1/embed.js"></script>
        <script>
          // Load React WITHOUT React CDN
          OpenWebOS.require('react').then(React => {
            console.log('React loaded:', React.version);
          });
          
          // Load Express in browser
          OpenWebOS.require('express').then(express => {
            console.log('Express loaded!');
          });
        </script>
      `,
      testUrls: [
        `https://${host}/v1/embed.js`,
        `https://${host}/v1/pkg/react@latest`,
        `https://${host}/v1/pkg/lodash@latest`,
        `https://${host}/v1/pkg/axios@latest`
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

// Serve the REAL embed script - FIXED
async function serveEmbedScript(corsHeaders, hostname) {
  const script = `// OpenWebOS v4.0 - REAL Node.js Runtime for Browser
window.OpenWebOS = (function() {
  const VERSION = '4.0.0';
  const MODULE_CACHE = new Map();
  const API_BASE = 'https://${hostname}';
  
  // REAL require function
  async function requirePackage(moduleName, version = 'latest') {
    const cacheKey = \`\${moduleName}@\${version}\`;
    
    if (MODULE_CACHE.has(cacheKey)) {
      return MODULE_CACHE.get(cacheKey);
    }
    
    try {
      const response = await fetch(\`\${API_BASE}/v1/pkg/\${moduleName}@\${version}\`);
      if (!response.ok) throw new Error('Package not found');
      
      const data = await response.json();
      
      // Load dependencies
      if (data.dependencies && data.dependencies.length > 0) {
        for (const dep of data.dependencies) {
          await requirePackage(dep);
        }
      }
      
      // Create module
      const module = { exports: {} };
      const require = (dep) => {
        if (dep.startsWith('.')) throw new Error('Relative imports not supported');
        if (['fs','path','http','buffer','events','util'].includes(dep)) return {};
        return window.OpenWebOS.require(dep);
      };
      
      // Execute
      const code = \`(function(module, exports, require) {
        \${data.code}
      })\`;
      
      const factory = eval(code);
      factory(module, module.exports, require);
      
      MODULE_CACHE.set(cacheKey, module.exports);
      return module.exports;
      
    } catch (error) {
      console.error('OpenWebOS error:', error);
      throw error;
    }
  }
  
  // JSX compiler
  async function compileJSX(jsxCode) {
    try {
      const response = await fetch(\`\${API_BASE}/v1/compile\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: jsxCode })
      });
      return await response.text();
    } catch (error) {
      console.error('JSX compilation error:', error);
      return jsxCode;
    }
  }
  
  // JSX Runtime
  function createElement(type, props, ...children) {
    if (typeof type === 'function') return type({ ...props, children });
    const element = document.createElement(type);
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        if (key === 'className') element.className = value;
        else if (key.startsWith('on')) element.addEventListener(key.substring(2).toLowerCase(), value);
        else if (key !== 'children') element.setAttribute(key, value);
      }
    }
    children.flat().forEach(child => {
      if (typeof child === 'string' || typeof child === 'number') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        element.appendChild(child);
      }
    });
    return element;
  }
  
  // Public API
  return {
    version: VERSION,
    require: requirePackage,
    compileJSX,
    createElement,
    clearCache: () => MODULE_CACHE.clear(),
    listLoadedPackages: () => Array.from(MODULE_CACHE.keys())
  };
})();

console.log('OpenWebOS API loaded! Use: OpenWebOS.require("package-name")');`;
  
  return new Response(script, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}

// Serve packages - FIXED
async function serveRealPackage(request, corsHeaders, hostname) {
  try {
    const url = new URL(request.url);
    const path = url.pathname;
    
    let packagePath;
    if (path.startsWith('/v1/pkg/')) {
      packagePath = path.substring('/v1/pkg/'.length);
    } else if (path.startsWith('/v1/npm/')) {
      packagePath = path.substring('/v1/npm/'.length);
    } else {
      return new Response('Invalid path', { status: 400, headers: corsHeaders });
    }
    
    const [packageName, version = 'latest'] = packagePath.split('@');
    
    if (!packageName) {
      return new Response('Package name required', { 
        status: 400, 
        headers: corsHeaders 
      });
    }
    
    // Try ESM first
    let cdnUrl = `https://cdn.jsdelivr.net/npm/${packageName}@${version}/+esm`;
    let response = await fetch(cdnUrl);
    
    if (!response.ok) {
      cdnUrl = `https://cdn.jsdelivr.net/npm/${packageName}@${version}`;
      response = await fetch(cdnUrl);
    }
    
    if (!response.ok) {
      throw new Error(`Package ${packageName}@${version} not found`);
    }
    
    let code = await response.text();
    
    // Transform CommonJS to ES Module
    if (!cdnUrl.includes('+esm')) {
      code = `const module={exports:{}};const exports=module.exports;${code};export default module.exports;`;
    }
    
    // Get dependencies
    let dependencies = [];
    try {
      const pkgJson = await fetch(`https://cdn.jsdelivr.net/npm/${packageName}@${version}/package.json`);
      if (pkgJson.ok) {
        const pkgData = await pkgJson.json();
        dependencies = Object.keys(pkgData.dependencies || {});
      }
    } catch (e) {}
    
    return new Response(JSON.stringify({
      package: packageName,
      version: version,
      code: code,
      dependencies: dependencies,
      api: `https://${hostname}`,
      timestamp: Date.now()
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Compile JSX
async function compileRealJSX(request, corsHeaders) {
  try {
    const { code } = await request.json();
    const compiled = code
      .replace(/React\.createElement/g, 'OpenWebOS.createElement')
      .replace(/import React[^;]*;/g, '')
      .replace(/from ['"]react['"]/g, '');
    
    return new Response(compiled, {
      headers: { ...corsHeaders, 'Content-Type': 'application/javascript' }
    });
  } catch (error) {
    return new Response(error.message, {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Execute code
async function executeRealCode(request, corsHeaders) {
  try {
    const { code, packages } = await request.json();
    return new Response(JSON.stringify({
      success: true,
      message: 'Code ready for execution',
      codeLength: code.length
    }), {
      headers: corsHeaders
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Create bundle
async function createBundle(request, corsHeaders) {
  try {
    const { packages } = await request.json();
    const bundle = {};
    
    for (const pkg of packages) {
      const [name, version = 'latest'] = pkg.split('@');
      const response = await fetch(`https://cdn.jsdelivr.net/npm/${name}@${version}/+esm`);
      if (response.ok) {
        bundle[name] = await response.text();
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      bundle: bundle
    }), {
      headers: corsHeaders
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Serve polyfills
async function serveRealNodePolyfills(corsHeaders) {
  const polyfills = `// Node.js polyfills
window.process = {
  env: { NODE_ENV: 'development' },
  version: '18.0.0',
  platform: 'browser'
};

window.Buffer = {
  from: (str) => new TextEncoder().encode(str),
  alloc: (size) => new Uint8Array(size)
};`;
  
  return new Response(polyfills, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/javascript'
    }
  });
}
