#!/usr/bin/env node
/**
 * DHF RPA Skills 环境检查和设置脚本
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SetupChecker {
  constructor() {
    this.home = process.env.HOME || process.env.USERPROFILE;
    this.claudeSkillsDir = path.join(this.home, '.claude', 'skills');
    this.repoRoot = path.join(__dirname, '..');
  }

  checkNodeVersion() {
    console.log('\n📌 检查 Node.js 版本...');

    try {
      const version = process.version;
      const major = parseInt(version.slice(1).split('.')[0]);

      if (major >= 18) {
        console.log(`  ✅ Node.js 版本: ${version}`);
        return true;
      } else {
        console.log(`  ❌ Node.js 版本过低: ${version}`);
        console.log(`     需要: >= 18.0.0`);
        return false;
      }
    } catch (error) {
      console.log('  ❌ 无法检测 Node.js 版本');
      return false;
    }
  }

  checkClaudeSkillsDir() {
    console.log('\n📌 检查 Claude skills 目录...');

    if (!fs.existsSync(this.claudeSkillsDir)) {
      console.log(`  ⚠️  目录不存在: ${this.claudeSkillsDir}`);
      console.log(`     正在创建...`);

      try {
        fs.mkdirSync(this.claudeSkillsDir, { recursive: true });
        console.log(`  ✅ 目录创建成功`);
        return true;
      } catch (error) {
        console.log(`  ❌ 目录创建失败: ${error.message}`);
        return false;
      }
    } else {
      console.log(`  ✅ 目录存在: ${this.claudeSkillsDir}`);
      return true;
    }
  }

  checkDHFAgent() {
    console.log('\n📌 检查 DHF Agent...');

    try {
      execSync('curl -s http://localhost:6869/health || echo', { stdio: 'pipe', timeout: 2000 });
      console.log('  ✅ DHF Agent 正在运行');
      return true;
    } catch (error) {
      console.log('  ⚠️  无法连接到 DHF Agent');
      console.log('     请确保 DHF Agent 正在运行');
      console.log('     下载地址: https://dhf.pub');
      return false;
    }
  }

  checkPermissions() {
    console.log('\n📌 检查文件权限...');

    const testFile = path.join(this.claudeSkillsDir, '.test-write');

    try {
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log('  ✅ 有写入权限');
      return true;
    } catch (error) {
      console.log('  ❌ 没有写入权限');
      console.log('     Windows: 请以管理员身份运行');
      console.log('     macOS/Linux: 请检查目录权限');
      return false;
    }
  }

  installDependencies() {
    console.log('\n📌 安装依赖...');

    if (fs.existsSync(path.join(this.repoRoot, 'node_modules'))) {
      console.log('  ✅ 依赖已安装');
      return true;
    }

    try {
      console.log('  正在运行 npm install...');
      execSync('npm install', { cwd: this.repoRoot, stdio: 'inherit' });
      console.log('  ✅ 依赖安装成功');
      return true;
    } catch (error) {
      console.log('  ❌ 依赖安装失败');
      return false;
    }
  }

  async run() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║          DHF RPA Skills - 环境检查和设置                   ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

    const results = {
      nodeVersion: this.checkNodeVersion(),
      claudeSkillsDir: this.checkClaudeSkillsDir(),
      permissions: this.checkPermissions(),
      dependencies: this.installDependencies(),
      dhfAgent: this.checkDHFAgent()
    };

    console.log('\n' + '─'.repeat(60));
    console.log('\n📊 检查结果:\n');

    console.log(`  Node.js 版本:      ${results.nodeVersion ? '✅ 通过' : '❌ 失败'}`);
    console.log(`  Claude skills 目录: ${results.claudeSkillsDir ? '✅ 通过' : '❌ 失败'}`);
    console.log(`  文件权限:          ${results.permissions ? '✅ 通过' : '❌ 失败'}`);
    console.log(`  依赖安装:          ${results.dependencies ? '✅ 通过' : '❌ 失败'}`);
    console.log(`  DHF Agent:         ${results.dhfAgent ? '✅ 通过' : '⚠️  警告'}`);

    const allPassed = results.nodeVersion && results.claudeSkillsDir && results.permissions && results.dependencies;

    if (allPassed) {
      console.log('\n✅ 环境检查通过！');
      console.log('\n📝 下一步:');
      console.log('  1. 确保 DHF Agent 正在运行');
      console.log('  2. 运行 "npm run install" 安装技能');
      console.log('  3. 重启 Claude Code\n');
    } else {
      console.log('\n❌ 环境检查失败！');
      console.log('   请解决上述问题后重试。\n');
      process.exit(1);
    }
  }
}

const checker = new SetupChecker();
checker.run();
