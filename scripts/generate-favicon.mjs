#!/usr/bin/env node
/**
 * Favicon生成脚本
 * 基于logo.png生成多尺寸favicon文件
 */

import sharp from 'sharp';
import { writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = join(__dirname, '..');
const SOURCE_LOGO = join(PROJECT_ROOT, 'public', 'images', 'logo.png');
const OUTPUT_DIR = join(PROJECT_ROOT, 'public');

// 确保输出目录存在
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * 生成PNG图标
 */
async function generatePngIcon(size, filename, options = {}) {
  try {
    const { padding = 0.15, background = null } = options;
    
    // 创建白色背景画布
    const canvasSize = size;
    const imageSize = Math.round(size * (1 - padding * 2));
    
    // 使用sharp调整logo大小
    const resizedLogo = await sharp(SOURCE_LOGO)
      .resize(imageSize, imageSize, { 
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();

    // 创建最终图像
    let finalImage;
    
    if (background) {
      // 如果有背景色，创建背景并叠加logo
      const backgroundBuffer = await sharp({
        create: {
          width: canvasSize,
          height: canvasSize,
          channels: 4,
          background: background
        }
      })
        .composite([{
          input: resizedLogo,
          gravity: 'center'
        }])
        .png()
        .toBuffer();
      finalImage = backgroundBuffer;
    } else {
      // 透明背景，直接调整大小
      finalImage = await sharp(resizedLogo)
        .extend({
          top: Math.round((canvasSize - imageSize) / 2),
          bottom: Math.round((canvasSize - imageSize) / 2),
          left: Math.round((canvasSize - imageSize) / 2),
          right: Math.round((canvasSize - imageSize) / 2),
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toBuffer();
    }

    writeFileSync(join(OUTPUT_DIR, filename), finalImage);
    console.log(`✅ 生成: ${filename} (${size}x${size})`);
  } catch (error) {
    console.error(`❌ 生成 ${filename} 失败:`, error.message);
  }
}

/**
 * 生成ICO文件（使用PNG作为替代，现代浏览器支持）
 */
async function generateIco() {
  try {
    // 生成各种尺寸的PNG图标
    await generatePngIcon(16, 'favicon-16x16.png');
    await generatePngIcon(32, 'favicon-32x32.png');
    await generatePngIcon(48, 'favicon-48x48.png');
    
    // 复制32x32作为默认favicon.png
    const favicon32 = await sharp(SOURCE_LOGO)
      .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .extend({
        top: 4, bottom: 4, left: 4, right: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toBuffer();
    
    writeFileSync(join(OUTPUT_DIR, 'favicon.png'), favicon32);
    console.log('✅ 生成: favicon.png (32x32)');
    
  } catch (error) {
    console.error('❌ 生成ICO失败:', error.message);
  }
}

/**
 * 生成Apple Touch Icon
 */
async function generateAppleTouchIcon() {
  try {
    const size = 180;
    
    // 创建圆角矩形背景
    const backgroundColor = { r: 198, g: 47, b: 47, alpha: 1 }; // #C62F2F 品牌红
    
    // 调整logo大小
    const logoSize = 120;
    const resizedLogo = await sharp(SOURCE_LOGO)
      .resize(logoSize, logoSize, { 
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();

    // 创建带圆角的背景
    const appleIcon = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: backgroundColor
      }
    })
      .composite([{
        input: resizedLogo,
        gravity: 'center'
      }])
      .png()
      .toBuffer();

    writeFileSync(join(OUTPUT_DIR, 'apple-touch-icon.png'), appleIcon);
    console.log('✅ 生成: apple-touch-icon.png (180x180)');
  } catch (error) {
    console.error('❌ 生成 Apple Touch Icon 失败:', error.message);
  }
}

/**
 * 生成Android Chrome图标
 */
async function generateAndroidIcons() {
  try {
    const sizes = [192, 512];
    
    for (const size of sizes) {
      const logoSize = Math.round(size * 0.7);
      const resizedLogo = await sharp(SOURCE_LOGO)
        .resize(logoSize, logoSize, { 
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .toBuffer();

      const icon = await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      })
        .composite([{
          input: resizedLogo,
          gravity: 'center'
        }])
        .png()
        .toBuffer();

      writeFileSync(join(OUTPUT_DIR, `android-chrome-${size}x${size}.png`), icon);
      console.log(`✅ 生成: android-chrome-${size}x${size}.png`);
    }
  } catch (error) {
    console.error('❌ 生成 Android 图标失败:', error.message);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始生成 Favicon 文件...\n');
  
  // 检查源文件是否存在
  if (!existsSync(SOURCE_LOGO)) {
    console.error(`❌ 源文件不存在: ${SOURCE_LOGO}`);
    process.exit(1);
  }
  
  console.log(`📄 源文件: ${SOURCE_LOGO}\n`);
  
  // 生成各种图标
  await generateIco();
  await generateAppleTouchIcon();
  await generateAndroidIcons();
  
  console.log('\n✨ Favicon 生成完成!');
  console.log('\n生成的文件:');
  console.log('  - favicon.png (32x32)');
  console.log('  - favicon-16x16.png');
  console.log('  - favicon-32x32.png');
  console.log('  - favicon-48x48.png');
  console.log('  - apple-touch-icon.png (180x180)');
  console.log('  - android-chrome-192x192.png');
  console.log('  - android-chrome-512x512.png');
  console.log('\n下一步: 更新 layout.tsx 中的 metadata 配置');
}

main().catch(console.error);
