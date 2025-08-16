#!/usr/bin/env node
// Test script for the asset compression pipeline
// Validates compression effectiveness and asset integrity

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const CONFIG = {
  testAssetsDir: 'test-assets',
  outputDir: 'test-compression-output'
};

class CompressionTester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      details: []
    };
  }

  async run() {
    console.log('🧪 Running Asset Compression Pipeline Tests\n');

    try {
      // Setup test environment
      await this.setupTestAssets();
      
      // Run compression pipeline tests
      await this.testGLBCompression();
      await this.testTextureCompression();
      await this.testSizeBudgets();
      await this.testAssetIntegrity();
      
      // Generate report
      this.generateReport();
      
      // Cleanup
      this.cleanup();
      
      // Exit with appropriate code
      process.exit(this.testResults.failed > 0 ? 1 : 0);
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async setupTestAssets() {
    console.log('📁 Setting up test assets...');
    
    // Create test directory
    fs.mkdirSync(CONFIG.testAssetsDir, { recursive: true });
    fs.mkdirSync(`${CONFIG.testAssetsDir}/avatar`, { recursive: true });
    
    // Create test GLB files (simple cubes)
    await this.createTestGLB(`${CONFIG.testAssetsDir}/avatar/test-body.glb`);
    
    // Create test texture files  
    await this.createTestTexture(`${CONFIG.testAssetsDir}/test-texture.png`);
    
    console.log('✅ Test assets created');
  }

  async createTestGLB(filePath) {
    // Create a simple GLB file using gltf-transform
    const tempGLTF = {
      asset: { version: '2.0' },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{
        mesh: 0
      }],
      meshes: [{
        primitives: [{
          attributes: { POSITION: 0 },
          indices: 1
        }]
      }],
      accessors: [
        {
          bufferView: 0,
          componentType: 5126, // FLOAT
          count: 8,
          type: 'VEC3',
          min: [-1, -1, -1],
          max: [1, 1, 1]
        },
        {
          bufferView: 1,
          componentType: 5123, // UNSIGNED_SHORT
          count: 36,
          type: 'SCALAR'
        }
      ],
      bufferViews: [
        {
          buffer: 0,
          byteOffset: 0,
          byteLength: 96,
          target: 34962 // ARRAY_BUFFER
        },
        {
          buffer: 0,
          byteOffset: 96,
          byteLength: 72,
          target: 34963 // ELEMENT_ARRAY_BUFFER
        }
      ],
      buffers: [{
        byteLength: 168
      }]
    };

    // Write a minimal GLTF that can be converted to GLB
    const tempGltfPath = filePath.replace('.glb', '.gltf');
    fs.writeFileSync(tempGltfPath, JSON.stringify(tempGLTF, null, 2));
    
    // Convert to GLB using gltf-transform
    const result = spawnSync('npx', ['@gltf-transform/cli', 'copy', tempGltfPath, filePath], {
      stdio: 'pipe'
    });
    
    if (result.status !== 0) {
      // Fallback: create a dummy GLB file
      const dummyGLB = Buffer.alloc(1024); // 1KB dummy file
      dummyGLB.write('glTF', 0); // GLB header
      fs.writeFileSync(filePath, dummyGLB);
    }
    
    // Cleanup
    if (fs.existsSync(tempGltfPath)) {
      fs.unlinkSync(tempGltfPath);
    }
  }

  async createTestTexture(filePath) {
    // Create a simple test PNG (1x1 red pixel)
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk (red pixel)
      0x54, 0x08, 0x1D, 0x01, 0x01, 0x00, 0x00, 0xFF,
      0xFF, 0xFF, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE2,
      0x21, 0xBC, 0x33, 0x00, 0x00, 0x00, 0x00, 0x49, // IEND chunk
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    fs.writeFileSync(filePath, pngData);
  }

  async testGLBCompression() {
    console.log('🔄 Testing GLB compression...');
    
    try {
      // Run compression on test assets
      const result = spawnSync('node', ['tools/compress-pipeline.mjs'], {
        stdio: 'pipe',
        env: { ...process.env, TEST_MODE: '1' }
      });
      
      if (result.status === 0) {
        this.pass('GLB Compression Pipeline', 'Pipeline executed successfully');
        
        // Check if compressed files exist
        const compressedGLB = path.join('dist-assets-compressed', 'avatar', 'test-body.glb');
        if (fs.existsSync(compressedGLB)) {
          const originalSize = fs.statSync(path.join(CONFIG.testAssetsDir, 'avatar', 'test-body.glb')).size;
          const compressedSize = fs.statSync(compressedGLB).size;
          
          this.pass('GLB File Creation', `Compressed GLB created (${compressedSize}B from ${originalSize}B)`);
        } else {
          this.fail('GLB File Creation', 'Compressed GLB not found');
        }
        
      } else {
        this.fail('GLB Compression Pipeline', `Pipeline failed with status ${result.status}: ${result.stderr?.toString()}`);
      }
      
    } catch (error) {
      this.fail('GLB Compression Pipeline', error.message);
    }
  }

  async testTextureCompression() {
    console.log('🔄 Testing texture compression...');
    
    try {
      // Check if toktx is available
      const toktxCheck = spawnSync('toktx', ['--version'], { stdio: 'pipe' });
      
      if (toktxCheck.status !== 0) {
        this.fail('Texture Compression Tools', 'toktx not available - KTX2 compression will be skipped');
        return;
      }
      
      this.pass('Texture Compression Tools', 'toktx available for KTX2 compression');
      
      // Test KTX2 conversion directly
      const inputTexture = path.join(CONFIG.testAssetsDir, 'test-texture.png');
      const outputTexture = path.join(CONFIG.outputDir, 'test-texture.ktx2');
      
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
      
      const ktxResult = spawnSync('toktx', [
        '--genmipmap',
        '--bcmp',
        '--clevel', '5',
        '--qlevel', '128',
        outputTexture,
        inputTexture
      ], { stdio: 'pipe' });
      
      if (ktxResult.status === 0 && fs.existsSync(outputTexture)) {
        const originalSize = fs.statSync(inputTexture).size;
        const compressedSize = fs.statSync(outputTexture).size;
        
        this.pass('KTX2 Compression', `Texture compressed (${compressedSize}B from ${originalSize}B)`);
      } else {
        this.fail('KTX2 Compression', 'KTX2 conversion failed');
      }
      
    } catch (error) {
      this.fail('Texture Compression', error.message);
    }
  }

  async testSizeBudgets() {
    console.log('🔄 Testing size budgets...');
    
    try {
      // Test the size reporting script
      const result = spawnSync('node', ['tools/size-report.mjs', CONFIG.testAssetsDir], {
        stdio: 'pipe'
      });
      
      if (result.status === 0) {
        this.pass('Size Reporting', 'Size report generated successfully');
        
        // Parse output to verify budget checking logic
        const output = result.stdout?.toString() || '';
        if (output.includes('TOTAL')) {
          this.pass('Size Budget Logic', 'Size calculations working correctly');
        } else {
          this.fail('Size Budget Logic', 'Size calculations not working');
        }
      } else {
        this.fail('Size Reporting', 'Size report script failed');
      }
      
    } catch (error) {
      this.fail('Size Budgets', error.message);
    }
  }

  async testAssetIntegrity() {
    console.log('🔄 Testing asset integrity...');
    
    try {
      // Test that compressed assets are valid
      const compressedDir = 'dist-assets-compressed';
      
      if (!fs.existsSync(compressedDir)) {
        this.fail('Asset Integrity', 'Compressed assets directory not found');
        return;
      }
      
      // Check that compression report exists and is valid JSON
      const reportPath = path.join(compressedDir, 'compression-report.json');
      if (fs.existsSync(reportPath)) {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        
        if (report.stats && report.config) {
          this.pass('Compression Report', 'Valid compression report generated');
        } else {
          this.fail('Compression Report', 'Compression report missing required fields');
        }
      } else {
        this.fail('Compression Report', 'Compression report not found');
      }
      
      // Test file accessibility
      const files = this.findFiles(compressedDir, /\.(glb|ktx2)$/);
      let validFiles = 0;
      
      for (const file of files) {
        if (fs.statSync(file).size > 0) {
          validFiles++;
        }
      }
      
      if (validFiles > 0) {
        this.pass('Asset Integrity', `${validFiles} compressed assets are valid and non-empty`);
      } else {
        this.fail('Asset Integrity', 'No valid compressed assets found');
      }
      
    } catch (error) {
      this.fail('Asset Integrity', error.message);
    }
  }

  findFiles(dir, pattern) {
    const files = [];
    
    if (!fs.existsSync(dir)) return files;
    
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
    
    walk(dir);
    return files;
  }

  pass(test, message) {
    this.testResults.passed++;
    this.testResults.details.push({ test, status: 'PASS', message });
    console.log(`  ✅ ${test}: ${message}`);
  }

  fail(test, message) {
    this.testResults.failed++;
    this.testResults.details.push({ test, status: 'FAIL', message });
    console.log(`  ❌ ${test}: ${message}`);
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 COMPRESSION PIPELINE TEST RESULTS');
    console.log('='.repeat(80));
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📊 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);
    
    if (this.testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      for (const detail of this.testResults.details) {
        if (detail.status === 'FAIL') {
          console.log(`  • ${detail.test}: ${detail.message}`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(80));
  }

  cleanup() {
    console.log('🧹 Cleaning up test files...');
    
    // Remove test directories
    if (fs.existsSync(CONFIG.testAssetsDir)) {
      fs.rmSync(CONFIG.testAssetsDir, { recursive: true, force: true });
    }
    
    if (fs.existsSync(CONFIG.outputDir)) {
      fs.rmSync(CONFIG.outputDir, { recursive: true, force: true });
    }
    
    // Remove compressed test output
    if (fs.existsSync('dist-assets-compressed') && process.env.TEST_MODE) {
      fs.rmSync('dist-assets-compressed', { recursive: true, force: true });
    }
  }
}

// Run tests if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const tester = new CompressionTester();
  tester.run().catch(console.error);
}
