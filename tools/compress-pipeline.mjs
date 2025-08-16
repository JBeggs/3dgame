#!/usr/bin/env node
// Advanced Asset Compression Pipeline
// Combines GLB compression, texture optimization, and size validation

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import zlib from 'node:zlib';

const CONFIG = {
  input: path.resolve('client/public/assets'),
  output: path.resolve('dist-assets'),
  compressed: path.resolve('dist-assets-compressed'), 
  
  // Compression settings
  meshopt: true,           // Meshopt compression for geometry
  draco: true,             // Draco compression for meshes  
  ktx2: true,              // KTX2 texture compression
  maxTextureSize: 1024,    // Maximum texture resolution
  compressionLevel: 5,     // KTX2 compression level (0-5)
  qualityLevel: 128,       // KTX2 quality level (1-255)
  
  // Size budgets (in KB)
  budgets: {
    total: 10 * 1024,      // 10MB total budget
    perFile: 2 * 1024,     // 2MB per file budget
    textures: 4 * 1024,    // 4MB texture budget
    models: 4 * 1024       // 4MB model budget
  }
};

class CompressionPipeline {
  constructor() {
    this.stats = {
      processed: 0,
      errors: 0,
      originalSize: 0,
      compressedSize: 0,
      files: []
    };
  }
  
  async run() {
    console.log('🚀 Starting Advanced Asset Compression Pipeline');
    console.log(`📁 Input: ${CONFIG.input}`);
    console.log(`📁 Output: ${CONFIG.compressed}`);
    
    // Create output directories
    fs.mkdirSync(CONFIG.output, { recursive: true });
    fs.mkdirSync(CONFIG.compressed, { recursive: true });
    
    try {
      // Step 1: Process GLB files with advanced compression
      await this.compressModels();
      
      // Step 2: Process textures with KTX2 compression
      await this.compressTextures();
      
      // Step 3: Validate compression and generate report
      await this.generateReport();
      
      console.log('✅ Compression pipeline completed successfully!');
      
    } catch (error) {
      console.error('❌ Pipeline failed:', error.message);
      process.exit(1);
    }
  }
  
  async compressModels() {
    console.log('\n📦 Compressing 3D models with Draco + Meshopt...');
    
    const glbFiles = this.findFiles(CONFIG.input, /\.(glb|gltf)$/i);
    console.log(`Found ${glbFiles.length} model files to compress`);
    
    for (const file of glbFiles) {
      await this.compressGLB(file);
    }
  }
  
  async compressGLB(inputFile) {
    const relativePath = path.relative(CONFIG.input, inputFile);
    const outputPath = path.join(CONFIG.compressed, relativePath.replace(/\.gltf$/i, '.glb'));
    
    // Ensure output directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    
    console.log(`  🔄 Processing: ${relativePath}`);
    
    // Build gltf-transform arguments for maximum compression
    const args = [
      '--yes', '@gltf-transform/cli', 'optimize', 
      inputFile, outputPath
    ];
    
    // Add compression options
    if (CONFIG.draco) {
      args.push('--draco');
      args.push('--draco-method', 'edgebreaker'); // Better compression for most meshes
      args.push('--draco-position', '14'); // High precision for positions
      args.push('--draco-normal', '12');   // Good precision for normals
      args.push('--draco-color', '10');    // Lower precision OK for colors
      args.push('--draco-uv', '12');       // Good precision for UVs
    }
    
    if (CONFIG.meshopt) {
      args.push('--meshopt');
      args.push('--meshopt-compression', 'max'); // Maximum compression
    }
    
    // Texture settings (will be processed separately)
    args.push('--texture-compress', 'none'); // Don't compress here, use KTX2 pipeline
    args.push('--texture-resize', `${CONFIG.maxTextureSize}`);
    
    // Additional optimizations
    args.push('--simplify', '0.01'); // Very light simplification (1% error)
    args.push('--weld', '0.0001');   // Weld nearby vertices
    args.push('--prune');            // Remove unused data
    args.push('--dedup');            // Deduplicate data
    
    const result = spawnSync('npx', args, { stdio: 'pipe' });
    
    if (result.status !== 0) {
      console.error(`  ❌ Failed to compress: ${relativePath}`);
      console.error(`  Error: ${result.stderr?.toString()}`);
      this.stats.errors++;
      return;
    }
    
    // Calculate compression stats
    const originalStats = fs.statSync(inputFile);
    const compressedStats = fs.statSync(outputPath);
    const compressionRatio = ((1 - compressedStats.size / originalStats.size) * 100).toFixed(1);
    
    console.log(`  ✅ ${relativePath}: ${this.formatSize(originalStats.size)} → ${this.formatSize(compressedStats.size)} (${compressionRatio}% smaller)`);
    
    this.stats.processed++;
    this.stats.originalSize += originalStats.size;
    this.stats.compressedSize += compressedStats.size;
    
    this.stats.files.push({
      path: relativePath,
      type: 'model',
      originalSize: originalStats.size,
      compressedSize: compressedStats.size,
      compressionRatio: parseFloat(compressionRatio)
    });
  }
  
  async compressTextures() {
    console.log('\n🖼️ Compressing textures with KTX2...');
    
    const imageFiles = this.findFiles(CONFIG.input, /\.(png|jpg|jpeg|webp)$/i);
    console.log(`Found ${imageFiles.length} texture files to compress`);
    
    for (const file of imageFiles) {
      await this.compressTexture(file);
    }
  }
  
  async compressTexture(inputFile) {
    const relativePath = path.relative(CONFIG.input, inputFile);
    const outputPath = path.join(CONFIG.compressed, relativePath.replace(/\.(png|jpg|jpeg|webp)$/i, '.ktx2'));
    
    // Ensure output directory exists  
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    
    console.log(`  🔄 Processing: ${relativePath}`);
    
    // Use toktx for KTX2 compression with high-quality settings
    const args = [
      '--genmipmap',                    // Generate mipmaps
      '--bcmp',                         // Use Basis Universal compression
      '--clevel', CONFIG.compressionLevel.toString(),  // Compression level
      '--qlevel', CONFIG.qualityLevel.toString(),      // Quality level
      '--format', 'R8G8B8A8_UNORM',    // Input format
      '--assign_primaries', 'none',     // Don't assign color primaries
      '--assign_oetf', 'linear',        // Linear transfer function
      outputPath,
      inputFile
    ];
    
    const result = spawnSync('toktx', args, { stdio: 'pipe' });
    
    if (result.status !== 0) {
      console.error(`  ❌ Failed to compress texture: ${relativePath}`);
      console.error(`  Error: ${result.stderr?.toString()}`);
      
      // Fallback: copy original file
      fs.copyFileSync(inputFile, outputPath.replace('.ktx2', path.extname(inputFile)));
      this.stats.errors++;
      return;
    }
    
    // Calculate compression stats
    const originalStats = fs.statSync(inputFile);
    const compressedStats = fs.statSync(outputPath);
    const compressionRatio = ((1 - compressedStats.size / originalStats.size) * 100).toFixed(1);
    
    console.log(`  ✅ ${relativePath}: ${this.formatSize(originalStats.size)} → ${this.formatSize(compressedStats.size)} (${compressionRatio}% smaller)`);
    
    this.stats.processed++;
    this.stats.originalSize += originalStats.size;
    this.stats.compressedSize += compressedStats.size;
    
    this.stats.files.push({
      path: relativePath,
      type: 'texture',
      originalSize: originalStats.size,
      compressedSize: compressedStats.size,
      compressionRatio: parseFloat(compressionRatio)
    });
  }
  
  async generateReport() {
    console.log('\n📊 Generating compression report...');
    
    const totalCompressionRatio = ((1 - this.stats.compressedSize / this.stats.originalSize) * 100).toFixed(1);
    const totalCompressedKB = this.stats.compressedSize / 1024;
    
    console.log('\n' + '='.repeat(80));
    console.log('📈 COMPRESSION REPORT');
    console.log('='.repeat(80));
    console.log(`Files processed: ${this.stats.processed}`);
    console.log(`Errors: ${this.stats.errors}`);
    console.log(`Original size: ${this.formatSize(this.stats.originalSize)}`);
    console.log(`Compressed size: ${this.formatSize(this.stats.compressedSize)}`);
    console.log(`Total savings: ${totalCompressionRatio}%`);
    console.log('');
    
    // Budget validation
    const budgetStatus = totalCompressedKB <= CONFIG.budgets.total ? '✅' : '❌';
    console.log(`${budgetStatus} Size budget: ${this.formatSize(this.stats.compressedSize)} / ${this.formatSize(CONFIG.budgets.total * 1024)}`);
    
    // Show top files by size
    console.log('\n📋 Largest compressed files:');
    const sortedFiles = this.stats.files.sort((a, b) => b.compressedSize - a.compressedSize).slice(0, 10);
    
    for (const file of sortedFiles) {
      const budgetWarning = (file.compressedSize / 1024) > CONFIG.budgets.perFile ? '⚠️' : '  ';
      console.log(`  ${budgetWarning} ${file.path.padEnd(40)} ${this.formatSize(file.compressedSize).padStart(8)} (${file.compressionRatio.toFixed(1)}% smaller)`);
    }
    
    // Write detailed JSON report
    const reportPath = path.join(CONFIG.compressed, 'compression-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      config: CONFIG,
      stats: this.stats,
      budgetStatus: {
        total: {
          used: this.stats.compressedSize,
          budget: CONFIG.budgets.total * 1024,
          withinBudget: totalCompressedKB <= CONFIG.budgets.total
        }
      }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    // Exit with error if over budget
    if (totalCompressedKB > CONFIG.budgets.total) {
      console.error(`\n❌ Size budget exceeded! ${this.formatSize(this.stats.compressedSize)} > ${this.formatSize(CONFIG.budgets.total * 1024)}`);
      process.exit(1);
    }
  }
  
  findFiles(dir, pattern) {
    const files = [];
    
    function walk(currentDir) {
      for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (pattern.test(entry.name)) {
          files.push(fullPath);
        }
      }
    }
    
    if (fs.existsSync(dir)) {
      walk(dir);
    }
    
    return files;
  }
  
  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

// Check if required tools are available
function checkRequiredTools() {
  const tools = [
    { name: 'gltf-transform', cmd: 'npx @gltf-transform/cli --version' },
    { name: 'toktx', cmd: 'toktx --version' }
  ];
  
  for (const tool of tools) {
    const result = spawnSync('bash', ['-c', tool.cmd], { stdio: 'pipe' });
    if (result.status !== 0) {
      console.error(`❌ Required tool "${tool.name}" not found or not working.`);
      console.error(`Please install it before running the compression pipeline.`);
      
      if (tool.name === 'gltf-transform') {
        console.error(`Install with: npm install -g @gltf-transform/cli`);
      }
      if (tool.name === 'toktx') {
        console.error(`Install KTX-Software tools from: https://github.com/KhronosGroup/KTX-Software`);
      }
      
      process.exit(1);
    }
  }
  
  console.log('✅ All required compression tools are available');
}

// Main execution
if (process.argv[1] === new URL(import.meta.url).pathname) {
  checkRequiredTools();
  const pipeline = new CompressionPipeline();
  pipeline.run().catch(console.error);
}
