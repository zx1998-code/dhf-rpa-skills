#!/usr/bin/env node
/**
 * DHF RPA Skills 交互式安装器
 */

import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 技能注册表
const SKILLS_REGISTRY = [
  {
    id: 'dhf-rpa-test-workflow',
    name: 'RPA 测试工作流',
    description: '测试 DHF Agent 基础连接和 RPA 操作',
    category: '测试',
    version: '1.0.0',
    dependencies: [],
    size: '2MB',
    tags: ['test', 'workflow', '基础'],
    command: 'dhf-rpa-test-workflow'
  },
  {
    id: 'dhf-rpa-163mail-task',
    name: '163 邮件发送',
    description: '自动化发送 163 邮件',
    category: '邮件',
    version: '1.0.0',
    dependencies: [],
    size: '1.5MB',
    tags: ['mail', '163', 'email'],
    command: 'dhf-163mail-task'
  },
  {
    id: 'dhf-rpa-outlook-mail-task',
    name: 'Outlook 邮件发送',
    description: '自动化发送 Outlook 邮件',
    category: '邮件',
    version: '1.0.0',
    dependencies: [],
    size: '1.5MB',
    tags: ['mail', 'outlook', 'email'],
    command: 'dhf-outlook-mail-task'
  },
  {
    id: 'dhf-rpa-qq-mail-task',
    name: 'QQ 邮件发送',
    description: '自动化发送 QQ 邮件',
    category: '邮件',
    version: '1.0.0',
    dependencies: [],
    size: '1.5MB',
    tags: ['mail', 'qq', 'email'],
    command: 'dhf-qq-mail-task'
  }
];

class SkillInstaller {
  constructor() {
    this.repoRoot = path.join(__dirname, '..');
    this.skillsDir = path.join(this.repoRoot, 'skills');
    this.claudeSkillsDir = this.getClaudeSkillsDir();
    this.pluginDir = path.join(this.repoRoot, '.claude-plugin');
    this.marketplaceFile = path.join(this.pluginDir, 'marketplace.json');
  }

  // 获取 Claude skills 目录
  getClaudeSkillsDir() {
    const home = process.env.HOME || process.env.USERPROFILE;
    return path.join(home, '.claude', 'skills');
  }

  // 获取已安装的技能
  getInstalledSkills() {
    if (!fs.existsSync(this.marketplaceFile)) {
      return [];
    }
    try {
      const marketplace = JSON.parse(fs.readFileSync(this.marketplaceFile, 'utf-8'));
      const plugin = marketplace.plugins?.find(p => p.name === 'dhf-rpa-skills');
      if (!plugin?.skills) return [];
      return plugin.skills.map(s => {
        const name = path.basename(s);
        return name;
      });
    } catch (error) {
      return [];
    }
  }

  // 检查技能是否存在
  skillExists(skillId) {
    const skillPath = path.join(this.skillsDir, skillId);
    return fs.existsSync(skillPath);
  }

  // 显示欢迎信息
  showWelcome() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║          DHF RPA Skills - 交互式安装器                      ║');
    console.log('║          按需选择你需要的技能                               ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
  }

  // 按分类显示技能
  categorizeSkills() {
    const categories = {};
    SKILLS_REGISTRY.forEach(skill => {
      if (!categories[skill.category]) {
        categories[skill.category] = [];
      }
      categories[skill.category].push(skill);
    });
    return categories;
  }

  // 用户选择技能
  async selectSkills() {
    const categories = this.categorizeSkills();
    const installed = this.getInstalledSkills();

    const choices = [];
    for (const [category, skills] of Object.entries(categories)) {
      choices.push(new inquirer.Separator(`\n📦 ${category}`));
      skills.forEach(skill => {
        const isInstalled = installed.includes(skill.id);
        const exists = this.skillExists(skill.id);
        if (!exists) return; // 跳过不存在的技能

        const status = isInstalled ? '✓' : ' ';
        choices.push({
          name: `${status} ${skill.name.padEnd(20)} - ${skill.description} [${skill.size}]`,
          value: skill.id,
          checked: isInstalled,
          short: skill.name
        });
      });
    }

    const answers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selected',
        message: '选择要安装的技能 (空格选择/取消，回车确认):',
        choices: choices,
        pageSize: 20
      }
    ]);

    return answers.selected;
  }

  // 确认安装
  async confirmInstallation(selectedSkills) {
    const skills = SKILLS_REGISTRY.filter(s => selectedSkills.includes(s.id));
    const totalSize = skills.reduce((sum, s) => {
      const size = parseFloat(s.size) || 0;
      return sum + size;
    }, 0);

    console.log('\n📋 即将安装以下技能:\n');
    skills.forEach(skill => {
      console.log(`  • ${skill.name} (${skill.size})`);
    });
    console.log(`\n  总计: ${skills.length} 个技能，约 ${totalSize.toFixed(1)}MB\n`);

    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: '确认安装这些技能？',
        default: true
      }
    ]);

    return answers.confirm;
  }

  // 安装单个技能
  async installSkill(skillId) {
    const skillPath = path.join(this.skillsDir, skillId);
    const targetPath = path.join(this.claudeSkillsDir, skillId);

    // 检查技能目录是否存在
    if (!fs.existsSync(skillPath)) {
      throw new Error(`技能目录不存在: ${skillPath}`);
    }

    // 删除旧的链接或目录
    if (fs.existsSync(targetPath)) {
      try {
        const stats = fs.lstatSync(targetPath);
        if (stats.isSymbolicLink()) {
          fs.unlinkSync(targetPath);
        } else {
          fs.rmSync(targetPath, { recursive: true, force: true });
        }
      } catch (error) {
        // 忽略错误
      }
    }

    // 创建符号链接
    try {
      fs.symlinkSync(skillPath, targetPath, 'junction');
    } catch (error) {
      // Windows 上可能需要管理员权限，尝试复制
      if (process.platform === 'win32') {
        console.warn(`  ⚠️  无法创建符号链接，正在复制文件...`);
        this.copyDirectory(skillPath, targetPath);
      } else {
        throw error;
      }
    }

    // 安装依赖
    const packageJsonPath = path.join(skillPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        process.chdir(skillPath);
        execSync('npm install', { stdio: 'pipe' });
      } catch (error) {
        console.warn(`  ⚠️  依赖安装失败: ${error.message}`);
      }
    }

    console.log(`  ✓ ${skillId}`);
  }

  // 递归复制目录
  copyDirectory(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  // 更新 marketplace.json
  updateMarketplace(installedSkills) {
    const marketplace = {
      name: 'dhf-rpa-skills',
      owner: {
        name: 'DHF RPA Community',
        email: 'community@dhf.pub'
      },
      metadata: {
        description: 'DHF Agent RPA 自动化技能包',
        version: '1.0.0'
      },
      plugins: [
        {
          name: 'dhf-rpa-skills',
          description: 'DHF RPA 自动化技能',
          source: './',
          strict: true,
          skills: installedSkills.map(id => `./skills/${id}`)
        }
      ]
    };

    // 确保目录存在
    if (!fs.existsSync(this.pluginDir)) {
      fs.mkdirSync(this.pluginDir, { recursive: true });
    }

    fs.writeFileSync(this.marketplaceFile, JSON.stringify(marketplace, null, 2));
  }

  // 执行安装
  async install() {
    try {
      this.showWelcome();

      // 选择技能
      const selectedSkills = await this.selectSkills();
      if (selectedSkills.length === 0) {
        console.log('\n❌ 未选择任何技能，安装取消。');
        return;
      }

      // 确认安装
      const confirmed = await this.confirmInstallation(selectedSkills);
      if (!confirmed) {
        console.log('\n❌ 安装已取消。');
        return;
      }

      // 确保目标目录存在
      if (!fs.existsSync(this.claudeSkillsDir)) {
        fs.mkdirSync(this.claudeSkillsDir, { recursive: true });
      }

      // 保存当前目录
      const originalDir = process.cwd();

      // 安装技能
      console.log('\n🔧 开始安装...\n');
      for (const skillId of selectedSkills) {
        await this.installSkill(skillId);
      }

      // 恢复当前目录
      process.chdir(originalDir);

      // 更新 marketplace.json
      this.updateMarketplace(selectedSkills);

      console.log('\n✅ 安装完成！');
      console.log('\n📝 提示:');
      console.log('  1. 请重新启动 Claude Code');
      console.log('  2. 使用 /xxx 命令调用技能');
      console.log('  3. 运行 "npm run list" 查看已安装技能\n');

    } catch (error) {
      console.error('\n❌ 安装失败:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }
}

// 运行安装器
const installer = new SkillInstaller();
installer.install();
