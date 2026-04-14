#!/usr/bin/env node
/**
 * DHF RPA Skills 列表查看脚本
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
    command: 'dhf-rpa-test-workflow'
  },
  {
    id: 'dhf-rpa-163mail-task',
    name: '163 邮件发送',
    description: '自动化发送 163 邮件',
    category: '邮件',
    version: '1.0.0',
    command: 'dhf-163mail-task'
  },
  {
    id: 'dhf-rpa-outlook-mail-task',
    name: 'Outlook 邮件发送',
    description: '自动化发送 Outlook 邮件',
    category: '邮件',
    version: '1.0.0',
    command: 'dhf-outlook-mail-task'
  },
  {
    id: 'dhf-rpa-qq-mail-task',
    name: 'QQ 邮件发送',
    description: '自动化发送 QQ 邮件',
    category: '邮件',
    version: '1.0.0',
    command: 'dhf-qq-mail-task'
  }
];

class SkillLister {
  constructor() {
    this.repoRoot = path.join(__dirname, '..');
    this.skillsDir = path.join(this.repoRoot, 'skills');
    this.pluginDir = path.join(this.repoRoot, '.claude-plugin');
    this.marketplaceFile = path.join(this.pluginDir, 'marketplace.json');
  }

  getInstalledSkills() {
    if (!fs.existsSync(this.marketplaceFile)) {
      return [];
    }
    try {
      const marketplace = JSON.parse(fs.readFileSync(this.marketplaceFile, 'utf-8'));
      const plugin = marketplace.plugins?.find(p => p.name === 'dhf-rpa-skills');
      if (!plugin?.skills) return [];
      return plugin.skills.map(s => path.basename(s));
    } catch (error) {
      return [];
    }
  }

  getAvailableSkills() {
    return SKILLS_REGISTRY.filter(skill => {
      const skillPath = path.join(this.skillsDir, skill.id);
      return fs.existsSync(skillPath);
    });
  }

  displayTable() {
    const installed = this.getInstalledSkills();
    const available = this.getAvailableSkills();

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║          DHF RPA Skills - 技能列表                         ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log(`📦 可用技能: ${available.length} | ✅ 已安装: ${installed.length}\n`);

    const categories = {};
    available.forEach(skill => {
      if (!categories[skill.category]) {
        categories[skill.category] = [];
      }
      categories[skill.category].push(skill);
    });

    for (const [category, skills] of Object.entries(categories)) {
      console.log(`\n📂 ${category}`);
      console.log('─'.repeat(70));

      skills.forEach(skill => {
        const isInstalled = installed.includes(skill.id);
        const status = isInstalled ? '✅ 已安装' : '⬜ 未安装';
        const command = skill.command || skill.id;

        console.log(`\n  ${skill.name}`);
        console.log(`    描述: ${skill.description}`);
        console.log(`    命令: /${command}`);
        console.log(`    状态: ${status}`);
        console.log(`    版本: ${skill.version}`);
      });
    }

    console.log('\n' + '─'.repeat(70));
    console.log('\n💡 使用方法:');
    console.log('  npm run install    - 安装新技能');
    console.log('  npm run uninstall  - 卸载技能');
    console.log('  npm run sync       - 同步已安装技能\n');
  }

  list() {
    this.displayTable();
  }
}

const lister = new SkillLister();
lister.list();
